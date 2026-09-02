import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useEvent } from '../lib/useEvent';
import { supabase } from '../supabaseClient';
import { attemptsOf, boulderScore, formatScore, participated } from '../lib/scoring';
import PhaseTabs from '../components/PhaseTabs';
import ModalityBar from '../components/ModalityBar';

// Painel do árbitro, organizado POR BOULDER: escolhe-se o boulder e a tela
// lista todos os atletas da fase para lançamento. É o formato que combina
// com um juiz fixo em cada boulder.
//
// Só se digita Zona e Top (com o número da tentativa em que cada um foi
// conquistado). O total de tentativas é calculado — é a tentativa da
// última conquista — e aparece apenas como leitura.

// Alvos de toque grandes: o arbitro lanca pontuacao em pe, no celular.
// O checkbox padrao (~13px) e pequeno demais; 24px fica confortavel.
// text-base no input evita o zoom automatico do Safari no iPhone.
// Zona em azul e Top em amarelo: as mesmas cores dos quadradinhos do
// ranking, para o arbitro associar na hora o que esta marcando.
const CHECKBOX = 'w-6 h-6 rounded shrink-0 cursor-pointer';
const CHECKBOX_ZONE = CHECKBOX + ' accent-zone';
const CHECKBOX_TOP = CHECKBOX + ' accent-gold';
const CHECKBOX_TRIED = CHECKBOX + ' accent-white';
const NUMBER_INPUT =
  'w-16 px-2 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none text-base sm:text-sm text-center tabular-nums disabled:opacity-25';

const EMPTY_ROW = {
  attempted: false,
  zone: false,
  zone_attempts: 0,
  top: false,
  top_attempts: 0,
  locked: false,
};

function LockIcon({ locked }) {
  return locked ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

function AthleteRow({ athlete, draft, dirty, onChange }) {
  const locked = draft.locked;
  const value = boulderScore(draft);
  const attempts = attemptsOf(draft);
  const touched = participated(draft);

  const update = (changes) => onChange({ ...draft, ...changes });

  const setZone = (checked) => {
    if (checked) {
      update({
        attempted: true,
        zone: true,
        zone_attempts: draft.zone_attempts || 1,
      });
    } else {
      // sem zona não há top
      update({ zone: false, zone_attempts: 0, top: false, top_attempts: 0 });
    }
  };

  const setTop = (checked) => {
    if (checked) {
      const attempt = draft.top_attempts || draft.zone_attempts || 1;
      update({
        attempted: true,
        top: true,
        top_attempts: attempt,
        zone: true,
        zone_attempts: draft.zone_attempts || attempt,
      });
    } else {
      update({ top: false, top_attempts: 0 });
    }
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        locked
          ? 'bg-panel2/40 border-white/5'
          : dirty
          ? 'bg-panel2 border-gold/50'
          : 'bg-panel2 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className={`font-semibold truncate ${locked ? 'text-white/40' : 'text-white'}`}>
          {athlete.bib_number ? (
            <span className="text-white/40 mr-1">#{athlete.bib_number}</span>
          ) : null}
          {athlete.name}
        </span>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span
              className={`text-lg font-extrabold tabular-nums ${
                value > 0 ? 'text-gold' : 'text-white/25'
              }`}
            >
              {formatScore(value)}
            </span>
            <span className="text-white/30 text-[11px] ml-2 tabular-nums">{attempts} tent.</span>
          </div>
          <button
            onClick={() => update({ locked: !locked })}
            title={locked ? 'Destravar para editar' : 'Travar contra edição acidental'}
            className={`p-2.5 rounded-md border transition ${
              locked
                ? 'border-gold/40 text-gold bg-gold/10'
                : 'border-white/15 text-white/40 hover:text-white hover:border-white/30'
            }`}
          >
            <LockIcon locked={locked} />
          </button>
        </div>
      </div>

      <fieldset disabled={locked} className={locked ? 'opacity-50' : ''}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.zone}
              onChange={(e) => setZone(e.target.checked)}
            className={CHECKBOX_ZONE}
            />
            <span className="font-semibold text-zone">Zona</span>
            <span className="text-white/40 text-xs">na tentativa</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              disabled={!draft.zone}
              value={draft.zone_attempts || ''}
              onChange={(e) => update({ zone_attempts: Math.max(1, Number(e.target.value) || 1) })}
              className={NUMBER_INPUT}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.top}
              onChange={(e) => setTop(e.target.checked)}
            className={CHECKBOX_TOP}
            />
            <span className="font-semibold text-gold">Top</span>
            <span className="text-white/40 text-xs">na tentativa</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              disabled={!draft.top}
              value={draft.top_attempts || ''}
              onChange={(e) => update({ top_attempts: Math.max(1, Number(e.target.value) || 1) })}
              className={NUMBER_INPUT}
            />
          </label>

          <label
            className="flex items-center gap-2 text-sm sm:ml-auto"
            title="Marque quando o atleta escalou mas não conseguiu zona nem top. Sem isso ele seria contado como ausente (DNS)."
          >
            <input
              type="checkbox"
              checked={draft.attempted}
              disabled={draft.zone || draft.top}
              onChange={(e) => update({ attempted: e.target.checked })}
            className={CHECKBOX_TRIED}
            />
            <span className={touched ? 'text-white/70' : 'text-white/40'}>Escalou</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export default function StaffPanel() {
  const { profile } = useAuth();
  const { rounds, activeRound, getRound, loading, refresh } = useEvent('Boulder');

  const [roundId, setRoundId] = useState(null);
  const [boulderId, setBoulderId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round, boulders, athletes, scores } = useMemo(
    () => getRound(roundId),
    [getRound, roundId]
  );

  // Ao trocar de fase, cai no primeiro boulder dela.
  useEffect(() => {
    if (boulders.length === 0) {
      setBoulderId(null);
      return;
    }
    if (!boulders.some((b) => b.id === boulderId)) setBoulderId(boulders[0].id);
  }, [boulders, boulderId]);

  // Monta os rascunhos de todos os atletas para o boulder selecionado.
  useEffect(() => {
    if (!boulderId) {
      setDrafts({});
      return;
    }
    const next = {};
    athletes.forEach((a) => {
      const saved = scores.find((s) => s.athlete_id === a.id && s.boulder_id === boulderId);
      next[a.id] = saved
        ? {
            attempted: saved.attempted ?? participated(saved),
            zone: saved.zone,
            zone_attempts: saved.zone_attempts ?? 0,
            top: saved.top,
            top_attempts: saved.top_attempts ?? 0,
            locked: saved.locked ?? false,
          }
        : { ...EMPTY_ROW };
    });
    setDrafts(next);
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boulderId, roundId, athletes.length, scores.length]);

  const savedFor = (athleteId) =>
    scores.find((s) => s.athlete_id === athleteId && s.boulder_id === boulderId) ?? null;

  const isDirty = (athleteId) => {
    const draft = drafts[athleteId];
    if (!draft) return false;
    const saved = savedFor(athleteId);
    if (!saved) return draft.attempted || draft.zone || draft.top || draft.locked;
    return (
      draft.attempted !== (saved.attempted ?? participated(saved)) ||
      draft.zone !== saved.zone ||
      draft.zone_attempts !== (saved.zone_attempts ?? 0) ||
      draft.top !== saved.top ||
      draft.top_attempts !== (saved.top_attempts ?? 0) ||
      draft.locked !== (saved.locked ?? false)
    );
  };

  const dirtyIds = athletes.filter((a) => isDirty(a.id)).map((a) => a.id);
  const registered = athletes.filter((a) => participated(drafts[a.id])).length;
  const boulder = boulders.find((b) => b.id === boulderId) ?? null;

  const handleSave = async () => {
    if (dirtyIds.length === 0 || !boulderId) return;
    setSaving(true);

    const rows = dirtyIds.map((athleteId) => {
      const draft = drafts[athleteId];
      return {
        athlete_id: athleteId,
        boulder_id: boulderId,
        attempted: draft.attempted || draft.zone || draft.top,
        zone: draft.zone,
        zone_attempts: draft.zone_attempts,
        top: draft.top,
        top_attempts: draft.top_attempts,
        // total calculado, nunca digitado
        attempts: attemptsOf(draft),
        locked: draft.locked,
        updated_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('scores')
      .upsert(rows, { onConflict: 'athlete_id,boulder_id' });

    setSaving(false);
    if (!error) {
      setSavedAt(new Date());
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <ModalityBar area="staff" atual="painel" subtitulo="Painel de pontuação" />

        <div className="mb-4">
          <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} />
        </div>

        {loading ? (
          <p className="text-center text-white/60 py-12">Carregando...</p>
        ) : !round ? (
          <p className="text-center text-white/60 py-12">Nenhuma fase configurada.</p>
        ) : (
          <>
            {/* Escolha do boulder */}
            <div className="mb-6">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-2">
                Boulder que você está arbitrando
              </p>
              <div className="flex flex-wrap gap-2">
                {boulders.map((b) => {
                  const done = athletes.filter((a) =>
                    participated(scores.find((s) => s.athlete_id === a.id && s.boulder_id === b.id))
                  ).length;
                  const selected = b.id === boulderId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBoulderId(b.id)}
                      className={`px-4 py-2.5 rounded-lg border font-bold transition ${
                        selected
                          ? 'bg-gold text-panel border-gold'
                          : 'bg-panel2 text-white/70 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      B{b.number}
                      <span
                        className={`ml-2 text-xs font-normal ${
                          selected ? 'text-panel/60' : 'text-white/30'
                        }`}
                      >
                        {done}/{athletes.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {athletes.length === 0 ? (
              <p className="text-center text-white/40 py-12 border border-dashed border-white/10 rounded-xl">
                Nenhum atleta inscrito nesta fase. O Controle de Atletas precisa inscrevê-los
                primeiro.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">
                    {boulder ? `Boulder ${boulder.number}` : '—'}
                  </h2>
                  <p className="text-white/40 text-sm tabular-nums">
                    {registered} de {athletes.length} lançados
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {athletes.map((a) => (
                    <AthleteRow
                      key={a.id}
                      athlete={a}
                      draft={drafts[a.id] ?? EMPTY_ROW}
                      dirty={isDirty(a.id)}
                      onChange={(next) => setDrafts((prev) => ({ ...prev, [a.id]: next }))}
                    />
                  ))}
                </div>

                <div className="sticky bottom-4">
                  <button
                    onClick={handleSave}
                    disabled={dirtyIds.length === 0 || saving}
                    className="w-full bg-gold text-panel font-bold py-3 rounded-xl shadow-lg hover:opacity-90 disabled:opacity-40"
                  >
                    {saving
                      ? 'Salvando...'
                      : dirtyIds.length === 0
                      ? 'Tudo salvo'
                      : `Salvar ${dirtyIds.length} atleta${dirtyIds.length > 1 ? 's' : ''}`}
                  </button>
                  {savedAt && dirtyIds.length === 0 && (
                    <p className="text-center text-white/40 text-xs mt-2">
                      Salvo às {savedAt.toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
