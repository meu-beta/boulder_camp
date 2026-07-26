import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { computeRanking, ranksFrom } from './scoring';

// Carrega o evento inteiro de uma vez (são poucas dezenas de linhas) e
// mantém tudo sincronizado via Supabase Realtime. Calcular o ranking no
// cliente deixa o desempate por "fase anterior" trivial, porque todas as
// fases já estão em memória.

const EMPTY = {
  category: null,
  rounds: [],
  boulders: [],
  athletes: [],
  entries: [],
  scores: [],
  queue: [],
};

export function useEvent(categoryName = 'Boulder') {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: category } = await supabase
      .from('categories')
      .select('*')
      .eq('name', categoryName)
      .single();

    if (!category) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const [rounds, athletes] = await Promise.all([
      supabase.from('rounds').select('*').eq('category_id', category.id).order('sequence'),
      supabase.from('athletes').select('*').eq('category_id', category.id).order('bib_number'),
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
      category,
      rounds: rounds.data ?? [],
      boulders: boulders.data ?? [],
      athletes: athletes.data ?? [],
      entries: entries.data ?? [],
      scores: scores.data ?? [],
      queue: queue.data ?? [],
    });
    setLoading(false);
  }, [categoryName]);

  useEffect(() => {
    load();

    const channel = supabase.channel('meu-beta-comp');
    ['scores', 'queue_entries', 'athletes', 'round_entries', 'rounds', 'boulders'].forEach(
      (table) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, load);
      }
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Ranking de todas as fases, em ordem, encadeando o desempate.
  const rankingByRound = useMemo(() => {
    const result = new Map();
    const athleteById = new Map(data.athletes.map((a) => [a.id, a]));
    let previousRanks = null;

    [...data.rounds]
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((round) => {
        const roundBoulders = data.boulders.filter((b) => b.round_id === round.id);
        const roundAthletes = data.entries
          .filter((e) => e.round_id === round.id)
          .map((e) => athleteById.get(e.athlete_id))
          .filter(Boolean);

        const ranking = computeRanking({
          athletes: roundAthletes,
          boulders: roundBoulders,
          scores: data.scores,
          previousRanks,
          roundFinished: round.is_finished,
        });

        result.set(round.id, ranking);
        previousRanks = ranksFrom(ranking);
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
