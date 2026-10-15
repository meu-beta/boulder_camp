import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { disciplineOf } from './disciplines';

// Carrega um EVENTO inteiro de uma vez (são poucas dezenas de linhas) e mantém
// tudo sincronizado via Supabase Realtime. Calcular o ranking no cliente deixa
// o desempate por "fase anterior" trivial, porque todas as fases já estão em
// memória.
//
// ------------------------------------------------------------------
// Por que a tabela se chama `categories` e o código fala "evento"
// ------------------------------------------------------------------
// Essa tabela sempre guardou a competição, nunca uma categoria: tinha duas
// linhas, "Boulder" e "Lead". Com o modelo de eventos (cada categoria é um
// evento próprio), ela virou o que sempre foi. Renomear a tabela exigiria
// derrubar o sistema no mesmo minuto do deploy, e não compensa o risco por um
// ganho só de nome. Fica para uma janela tranquila; está escrito em
// supabase/migrations/2026-10-16-eventos-B-renomeacao.sql.
//
// Regra para quem mexer aqui: `categories` e `category_id` aparecem APENAS nas
// consultas. Em todo o resto do código, a coisa se chama evento.

const EMPTY = {
  category: null,
  evento: null,
  rounds: [],
  boulders: [],
  athletes: [],
  entries: [],
  scores: [],
  queue: [],
};

export function useEvent(slug) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const { data: evento } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!evento) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const [rounds, athletes] = await Promise.all([
      supabase.from('rounds').select('*').eq('category_id', evento.id).order('sequence'),
      supabase.from('athletes').select('*').eq('category_id', evento.id).order('bib_number'),
    ]);

    const roundIds = (rounds.data ?? []).map((r) => r.id);

    const [boulders, entries, queue] = await Promise.all([
      roundIds.length
        ? supabase.from('boulders').select('*').in('round_id', roundIds).order('number')
        : Promise.resolve({ data: [] }),
      roundIds.length
        ? supabase.from('round_entries').select('*').in('round_id', roundIds)
        : Promise.resolve({ data: [] }),
      roundIds.length
        ? supabase.from('queue_entries').select('*').in('round_id', roundIds).order('position')
        : Promise.resolve({ data: [] }),
    ]);

    const boulderIds = (boulders.data ?? []).map((b) => b.id);
    const scores = boulderIds.length
      ? await supabase.from('scores').select('*').in('boulder_id', boulderIds)
      : { data: [] };

    setData({
      // `category` continua exportado com esse nome para não quebrar as telas
      // que já o consomem. `evento` é o nome certo e o que deve ser usado daqui
      // para a frente.
      category: evento,
      evento,
      rounds: rounds.data ?? [],
      boulders: boulders.data ?? [],
      athletes: athletes.data ?? [],
      entries: entries.data ?? [],
      scores: scores.data ?? [],
      queue: queue.data ?? [],
    });
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();

    // O Realtime avisa UMA VEZ POR LINHA alterada. Um árbitro salvando cinco
    // atletas de uma vez dispara cinco avisos, e com cinco árbitros lançando ao
    // mesmo tempo isso vira uma rajada — cada aviso recarregando o evento
    // inteiro, em todos os celulares. Agrupar a rajada numa recarga só derruba
    // o tráfego sem atrasar nada que dê para perceber.
    let pendente = null;
    const agendar = () => {
      if (pendente) clearTimeout(pendente);
      pendente = setTimeout(() => {
        pendente = null;
        load();
      }, 400);
    };

    const channel = supabase.channel(`meu-beta-comp-${slug ?? 'nenhum'}`);
    ['scores', 'queue_entries', 'athletes', 'round_entries', 'rounds', 'boulders'].forEach(
      (table) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, agendar);
      }
    );
    channel.subscribe();

    return () => {
      if (pendente) clearTimeout(pendente);
      supabase.removeChannel(channel);
    };
  }, [load, slug]);

  // Ranking de todas as fases, em ordem, encadeando o desempate.
  // Qual cálculo roda depende da modalidade do evento — ver disciplines.js.
  const rankingByRound = useMemo(() => {
    const result = new Map();
    const athleteById = new Map(data.athletes.map((a) => [a.id, a]));
    const discipline = disciplineOf(data.evento);

    const ordenadas = [...data.rounds].sort((a, b) => a.sequence - b.sequence);
    const ultima = ordenadas.length ? ordenadas[ordenadas.length - 1].id : null;

    let previousRanks = null;
    let previousTwoGroups = false;

    ordenadas.forEach((round) => {
      const roundClimbs = data.boulders.filter((b) => b.round_id === round.id);
      const roundAthletes = data.entries
        .filter((e) => e.round_id === round.id)
        .map((e) => athleteById.get(e.athlete_id))
        .filter(Boolean);

      const ranking = discipline.computeRanking({
        athletes: roundAthletes,
        climbs: roundClimbs,
        scores: data.scores,
        previousRanks,
        round,
        isFinal: round.id === ultima,
        previousTwoGroups,
      });

      result.set(round.id, ranking);
      previousRanks = discipline.ranksFrom(ranking);
      previousTwoGroups = Boolean(round.two_groups);
    });

    return result;
  }, [data]);

  const activeRound = useMemo(
    () => data.rounds.find((r) => r.is_active) ?? data.rounds[0] ?? null,
    [data.rounds]
  );

  /** Tudo o que uma tela precisa saber sobre uma fase específica. */
  const getRound = useCallback(
    (roundId) => {
      const round = data.rounds.find((r) => r.id === roundId) ?? null;
      if (!round) {
        return { round: null, boulders: [], athletes: [], scores: [], queue: [], ranking: [] };
      }
      const athleteById = new Map(data.athletes.map((a) => [a.id, a]));
      const boulders = data.boulders
        .filter((b) => b.round_id === round.id)
        .sort((a, b) => a.number - b.number);
      const boulderIds = new Set(boulders.map((b) => b.id));

      return {
        round,
        boulders,
        athletes: data.entries
          .filter((e) => e.round_id === round.id)
          .map((e) => athleteById.get(e.athlete_id))
          .filter(Boolean)
          .sort((a, b) => (a.bib_number ?? 9999) - (b.bib_number ?? 9999)),
        scores: data.scores.filter((s) => boulderIds.has(s.boulder_id)),
        queue: data.queue
          .filter((q) => q.round_id === round.id)
          .map((q) => ({ ...q, athlete: athleteById.get(q.athlete_id) ?? null }))
          .sort((a, b) => a.position - b.position),
        ranking: rankingByRound.get(round.id) ?? [],
      };
    },
    [data, rankingByRound]
  );

  return { ...data, loading, activeRound, getRound, rankingByRound, refresh: load };
}
