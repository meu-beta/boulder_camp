import { useEffect, useMemo, useState } from 'react';
import { useEvent } from '../lib/useEvent';
import { supabase } from '../supabaseClient';
import { disciplineOf } from '../lib/disciplines';
import { useModalidade } from '../lib/modalidade';
import ModalityBar from '../components/ModalityBar';

// Controle das fases: quantas escaladas cada uma tem, quantos atletas
// avançam, qual está em andamento e a promoção dos classificados.
//
// Serve às duas modalidades: `categoryName` escolhe qual campeonato está sendo
// administrado, e os rótulos ("Boulders" x "Vias") saem do disciplines.js.

function RoundCard({
  round,
  nextRound,
  ranking,
  athletesInRound,
  onPatch,
  onPromote,
  busy,
  discipline,
}) {
  const [boulderCount, setBoulderCount] = useState(round.boulder_count);
  const [advanceCount, setAdvanceCount] = useState(round.advance_count ?? '');
  const [confirmandoCorte, setConfirmandoCorte] = useState(false);

  // Quais escaladas seriam removidas, para poder dizer isso por extenso.
  const reduzindo = boulderCount < round.boulder_count;
  const cortadas = reduzindo
    ? Array.from({ length: round.boulder_count - boulderCount }, (_, i) => boulderCount + i + 1)
    : [];

  // Mexer no número de novo desarma a confirmação.
  useEffect(() => {
    setConfirmandoCorte(false);
  }, [boulderCount]);

  const qualified = ranking.filter(
    (r) => r.status === 'ranked' && r.rank && r.rank <= (round.advance_count ?? 0)
  );

  const alreadyIn = nextRound ? athletesInRound(nextRound.id) : new Set();
  const pendingPromotion = qualified.filter((r) => !alreadyIn.has(r.athlete.id));

  return (
    <div
      className={`rounded-xl border p-5 ${
        round.is_active ? 'border-gold/50 bg-panel2' : 'border-white/10 bg-panel2/50'
      }`}
    >
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            {round.is_active && <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />}
            {round.name}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            {athletesInRound(round.id).size} atleta(s) inscrito(s)
            {round.is_finished ? ' · encerrada' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {!round.is_active && (
            <button
              onClick={() => onPatch(round.id, { is_active: true })}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold text-panel disabled:opacity-40"
            >
              Tornar fase atual
            </button>
          )}
          <button
            onClick={() => onPatch(round.id, { is_finished: !round.is_finished })}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20 text-white/70 hover:text-white disabled:opacity-40"
          >
            {round.is_finished ? 'Reabrir fase' : 'Encerrar fase'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">
            {discipline.climb.many} na fase
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={10}
              value={boulderCount}
              onChange={(e) => setBoulderCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
            />
            <button
              onClick={() => {
                // Reduzir o número apaga as escaladas excedentes, e `scores`
                // aponta para elas em CASCADE: some junto tudo o que já foi
                // lançado nelas. Aumentar não tem risco, então só a redução
                // pede confirmação.
                if (reduzindo && !confirmandoCorte) {
                  setConfirmandoCorte(true);
                  return;
                }
                setConfirmandoCorte(false);
                onPatch(round.id, { boulder_count: boulderCount }, true);
              }}
              disabled={busy || boulderCount === round.boulder_count}
              className={`px-3 rounded text-sm font-semibold disabled:opacity-30 ${
                confirmandoCorte ? 'bg-alert text-white' : 'bg-white/10 text-white'
              }`}
            >
              {confirmandoCorte ? 'Apagar' : 'OK'}
            </button>
          </div>

          {reduzindo && (
            <p className={`text-xs mt-1.5 ${confirmandoCorte ? 'text-alert' : 'text-white/40'}`}>
              {confirmandoCorte
                ? `Confirma? Some tudo o que já foi lançado ${
                    cortadas.length === 1 ? 'na' : 'nas'
                  } ${discipline.climb.abbr}${cortadas.join(`, ${discipline.climb.abbr}`)}.`
                : `Reduzir apaga ${discipline.climb.abbr}${cortadas.join(
                    `, ${discipline.climb.abbr}`
                  )} e as pontuações delas.`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Atletas que avançam</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder={nextRound ? '—' : 'fase final'}
              disabled={!nextRound}
              value={advanceCount}
              onChange={(e) => setAdvanceCount(e.target.value)}
              className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none disabled:opacity-30"
            />
            <button
              onClick={() =>
                onPatch(round.id, {
                  advance_count: advanceCount === '' ? null : Number(advanceCount),
                })
              }
              disabled={busy || !nextRound || String(round.advance_count ?? '') === String(advanceCount)}
              className="px-3 rounded bg-white/10 text-white text-sm font-semibold disabled:opacity-30"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {nextRound && round.advance_count ? (
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-white/70 mb-2">
            Classificados para <span className="text-gold font-semibold">{nextRound.name}</span>
          </p>
          {qualified.length === 0 ? (
            <p className="text-white/40 text-xs">
              Ninguém pontuou ainda nesta fase.
            </p>
          ) : (
            <ol className="space-y-1 mb-3">
              {qualified.map((row) => (
                <li key={row.athlete.id} className="text-sm flex justify-between">
                  <span>
                    <span className="text-gold font-bold mr-2">{row.rank}º</span>
                    {row.athlete.bib_number ? (
                      <span className="text-white/40 mr-1">#{row.athlete.bib_number}</span>
                    ) : null}
                    {row.athlete.name}
                  </span>
                  <span className="tabular-nums text-white/60">
                    {row.total == null ? '—' : discipline.formatTotal(row.total)}
                    {alreadyIn.has(row.athlete.id) && (
                      <span className="ml-2 text-gold/70 text-xs">✓ promovido</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <button
            onClick={() => onPromote(round, nextRound, pendingPromotion)}
            disabled={busy || pendingPromotion.length === 0}
            className="w-full py-2 rounded-lg bg-gold text-panel font-bold text-sm disabled:opacity-30"
          >
            {pendingPromotion.length === 0
              ? 'Todos já promovidos'
              : `Promover ${pendingPromotion.length} atleta(s) para ${nextRound.name}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function RoundsAdmin() {
  const mod = useModalidade();
  const { category, rounds, entries, rankingByRound, loading, refresh } = useEvent(mod.categoryName);
  const discipline = disciplineOf(category);
  const [savingStates, setSavingStates] = useState(false);

  const showStates = category?.show_states ?? false;

  // Liga/desliga a exibicao de estados em TODAS as telas de ranking de uma vez,
  // inclusive no telao - por isso fica gravado no banco, e nao no navegador.
  const toggleStates = async () => {
    if (!category) return;
    setSavingStates(true);
    await supabase.from('categories').update({ show_states: !showStates }).eq('id', category.id);
    await refresh();
    setSavingStates(false);
  };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const sorted = useMemo(
    () => [...rounds].sort((a, b) => a.sequence - b.sequence),
    [rounds]
  );

  const athletesInRound = (roundId) =>
    new Set(entries.filter((e) => e.round_id === roundId).map((e) => e.athlete_id));

  const handlePatch = async (roundId, changes, rebuildBoulders = false) => {
    setBusy(true);
    setMessage('');

    // Só uma fase pode estar ativa por vez — DENTRO da mesma categoria.
    // Sem o filtro por category_id, ativar uma fase da Guiada desativaria a
    // fase em andamento do Boulder, e vice-versa: as duas competições podem
    // estar rolando no mesmo dia.
    if (changes.is_active && category) {
      await supabase
        .from('rounds')
        .update({ is_active: false })
        .eq('category_id', category.id)
        .neq('id', roundId);
    }

    await supabase.from('rounds').update(changes).eq('id', roundId);

    if (rebuildBoulders && typeof changes.boulder_count === 'number') {
      const { data: existing } = await supabase
        .from('boulders')
        .select('*')
        .eq('round_id', roundId)
        .order('number');

      const current = existing ?? [];
      const target = changes.boulder_count;

      if (current.length < target) {
        const toAdd = [];
        for (let n = current.length + 1; n <= target; n += 1) {
          toAdd.push({ round_id: roundId, number: n });
        }
        await supabase.from('boulders').insert(toAdd);
      } else if (current.length > target) {
        const toRemove = current.slice(target).map((b) => b.id);
        await supabase.from('boulders').delete().in('id', toRemove);
      }
      setMessage('Boulders da fase atualizados.');
    }

    await refresh();
    setBusy(false);
  };

  const handlePromote = async (round, nextRound, qualifiedRows) => {
    if (qualifiedRows.length === 0) return;
    setBusy(true);
    setMessage('');

    const rows = qualifiedRows.map((row, index) => ({
      round_id: nextRound.id,
      athlete_id: row.athlete.id,
      start_order: index + 1,
    }));

    const { error } = await supabase
      .from('round_entries')
      .upsert(rows, { onConflict: 'round_id,athlete_id' });

    if (error) {
      setMessage(`Não foi possível promover: ${error.message}`);
    } else {
      setMessage(`${rows.length} atleta(s) promovido(s) para ${nextRound.name}.`);
      await refresh();
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <ModalityBar area="controle" atual="fases" subtitulo="Fases do campeonato" />

        {message && (
          <p className="mb-4 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm">
            {message}
          </p>
        )}

        <div className="mb-6 bg-panel2 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Mostrar estados no ranking</p>
            <p className="text-white/40 text-xs mt-0.5">
              Exibe a bandeira e a sigla do estado no lugar da bandeira do país. Vale para o
              telão e para todas as telas de ranking.
            </p>
          </div>
          <button
            onClick={toggleStates}
            disabled={savingStates || !category}
            role="switch"
            aria-checked={showStates}
            aria-label="Mostrar estados no ranking"
            className={`relative w-14 h-8 shrink-0 rounded-full transition disabled:opacity-40 ${
              showStates ? 'bg-gold' : 'bg-white/15'
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                showStates ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {loading ? (
          <p className="text-center text-white/60 py-12">Carregando...</p>
        ) : (
          <div className="space-y-5">
            {sorted.map((round, index) => (
              <RoundCard
                key={round.id}
                round={round}
                nextRound={sorted[index + 1] ?? null}
                ranking={rankingByRound.get(round.id) ?? []}
                athletesInRound={athletesInRound}
                onPatch={handlePatch}
                onPromote={handlePromote}
                busy={busy}
                discipline={discipline}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
