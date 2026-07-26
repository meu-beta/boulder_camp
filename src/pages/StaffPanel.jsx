import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useEvent } from '../lib/useEvent';
import { supabase } from '../supabaseClient';
import { boulderScore, formatScore } from '../lib/scoring';
import PhaseTabs from '../components/PhaseTabs';

// Painel do árbitro. Escolhe-se o atleta uma vez e todos os boulders da
// fase abrem juntos, para preencher a rodada inteira sem trocar de tela.
// Cada boulder tem um cadeado: depois de confirmado, trava contra
// edição acidental.

const EMPTY_ROW = {
  attempts: 0,
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

function BoulderCard({ boulder, draft, onChange, dirty }) {
  const locked = draft.locked;
  const value = boulderScore(draft);

  const update = (changes) => onChange({ ...draft, ...changes });

  const setTop = (checked) => {
    if (checked) {
      const attempt = draft.top_attempts || draft.attempts || 1;
      update({
        top: true,
        top_attempts: attempt,
        attempts: Math.max(draft.attempts, attempt),
        // não se faz o top sem passar pela zona
        zone: true,
        zone_attempts: draft.zone_attempts || attempt,
      });
    } else {
      update({ top: false, top_attempts: 0 });
    }
  };

  const setZone = (checked) => {
    if (checked) {
      const attempt = draft.zone_attempts || draft.attempts || 1;
      update({
        zone: true,
        zone_attempts: attempt,
        attempts: Math.max(draft.attempts, attempt),
      });
    } else {
      update({ zone: false, zone_attempts: 0, top: false, top_attempts: 0 });
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        locked
          ? 'bg-panel2/40 border-white/5'
          : dirty
          ? 'bg-panel2 border-gold/50'
          : 'bg-panel2 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold ${locked ? 'text-white/40' : 'text-white'}`}>
          Boulder {boulder.number}
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`text-lg font-extrabold tabular-nums ${
              value > 0 ? 'text-gold' : 'text-white/30'
            }`}
          >
            {formatScore(value)}
          </span>
          <button
            onClick={() => update({ locked: !locked })}
            title={locked ? 'Destravar para editar' : 'Travar contra edição acidental'}
            className={`p-1.5 rounded-md border transition ${
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
        <label className="block text-xs text-white/60 mb-1">Total de tentativas</label>
        <input
          type="number"
          min={0}
          value={draft.attempts}
          onChange={(e) => update({ attempts: Math.max(0, Number(e.target.value) || 0) })}
          className="w-full mb-3 px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={draft.zone} onChange={(e) => setZone(e.target.checked)} />
              <span className="font-semibold">Zona</span>
            </label>
            <input
              type="number"
              min={1}
              disabled={!draft.zone}
              placeholder="tent."
              value={draft.zone_attempts || ''}
              onChange={(e) =>
                update({
                  zone_attempts: Math.max(1, Number(e.target.value) || 1),
                  attempts: Math.max(draft.attempts, Number(e.target.value) || 1),
                })
              }
              className="w-full px-2 py-1.5 rounded bg-panel border border-white/20 focus:border-gold outline-none text-sm disabled:opacity-30"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={draft.top} onChange={(e) => setTop(e.target.checked)} />
              <span className="font-semibold">Top</span>
            </label>
            <input
              type="number"
              min={1}
              disabled={!draft.top}
              placeholder="tent."
              value={draft.top_attempts || ''}
              onChange={(e) =>
                update({
                  top_attempts: Math.max(1, Number(e.target.value) || 1),
                  attempts: Math.max(draft.attempts, Number(e.target.value) || 1),
                })
              }
              className="w-full px-2 py-1.5 rounded bg-panel border border-white/20 focus:border-gold outline-none text-sm disabled:opacity-30"
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}

export default function StaffPanel() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { rounds, activeRound, getRound, loading, refresh } = useEvent('Boulder');

  const [roundId, setRoundId] = useState(null);
  const [athleteId, setAthleteId] = useState('');
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

  // Monta o rascunho a partir do que já está salvo, sempre que muda o atleta.
  useEffect(() => {
    if (!athleteId) {
      setDrafts({});
      return;
    }
    const next = {};
    boulders.forEach((boulder) => {
      const saved = scores.find(
        (s) => s.athlete_id === athleteId && s.boulder_id === boulder.id
      );
      next[boulder.id] = saved
        ? {
            attempts: saved.attempts ?? 0,
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
  }, [athleteId, roundId, scores.length, boulders.length]);

  const savedFor = (boulderId) =>
    scores.find((s) => s.athlete_id === athleteId && s.boulder_id === boulderId) ?? null;

  const isDirty = (boulderId) => {
    const draft = drafts[boulderId];
    if (!draft) return false;
    const saved = savedFor(boulderId);
    if (!saved) {
      return (
        draft.attempts > 0 || draft.zone || draft.top || draft.locked
      );
    }
    return (
      draft.attempts !== (saved.attempts ?? 0) ||
      draft.zone !== saved.zone ||
      draft.zone_attempts !== (saved.zone_attempts ?? 0) ||
      draft.top !== saved.top ||
      draft.top_attempts !== (saved.top_attempts ?? 0) ||
      draft.locked !== (saved.locked ?? false)
    );
  };

  const dirtyCount = boulders.filter((b) => isDirty(b.id)).length;
  const roundTotal = boulders.reduce((sum, b) => sum + boulderScore(drafts[b.id]), 0);

  const handleSave = async () => {
    if (!athleteId || dirtyCount === 0) return;
    setSaving(true);

    const rows = boulders
      .filter((b) => isDirty(b.id))
      .map((b) => ({
        athlete_id: athleteId,
        boulder_id: b.id,
        ...drafts[b.id],
        updated_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      }));

    const { error } = await supabase
      .from('scores')
      .upsert(rows, { onConflict: 'athlete_id,boulder_id' });

    setSaving(false);
    if (!error) {
      setSavedAt(new Date());
      refresh();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/staff/login');
  };

  const selectedAthlete = athletes.find((a) => a.id === athleteId) ?? null;

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Staff — Arbitragem</p>
            <h1 className="text-2xl font-bold">Painel de pontuação</h1>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/staff/ranking" className="text-white/70 hover:text-white">
              Ver ranking
            </Link>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">
              Sair
            </button>
          </div>
        </div>

        <div className="mb-6">
          <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} />
        </div>

        {loading ? (
          <p className="text-center text-white/60 py-12">Carregando...</p>
        ) : !round ? (
          <p className="text-center text-white/60 py-12">Nenhuma fase configurada.</p>
        ) : (
          <>
            <div className="bg-panel2 border border-white/10 rounded-xl p-5 mb-6">
              <label className="block text-sm text-white/70 mb-1">Atleta</label>
              <select
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
              >
                <option value="">Selecione o atleta...</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bib_number ? `#${a.bib_number} ` : ''}
                    {a.name}
                  </option>
                ))}
              </select>
              {athletes.length === 0 && (
                <p className="text-white/40 text-xs mt-2">
                  Nenhum atleta inscrito nesta fase. O Controle de Atletas precisa inscrevê-los
                  primeiro.
                </p>
              )}
            </div>

            {selectedAthlete && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">
                    {selectedAthlete.bib_number ? `#${selectedAthlete.bib_number} ` : ''}
                    {selectedAthlete.name}
                  </h2>
                  <div className="text-right">
                    <p className="text-white/50 text-xs uppercase tracking-wide">Total da fase</p>
                    <p className="text-2xl font-extrabold text-gold tabular-nums">
                      {formatScore(roundTotal)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {boulders.map((boulder) => (
                    <BoulderCard
                      key={boulder.id}
                      boulder={boulder}
                      draft={drafts[boulder.id] ?? EMPTY_ROW}
                      dirty={isDirty(boulder.id)}
                      onChange={(next) =>
                        setDrafts((prev) => ({ ...prev, [boulder.id]: next }))
                      }
                    />
                  ))}
                </div>

                <div className="sticky bottom-4">
                  <button
                    onClick={handleSave}
                    disabled={dirtyCount === 0 || saving}
                    className="w-full bg-gold text-panel font-bold py-3 rounded-xl shadow-lg hover:opacity-90 disabled:opacity-40"
                  >
                    {saving
                      ? 'Salvando...'
                      : dirtyCount === 0
                      ? 'Tudo salvo'
                      : `Salvar ${dirtyCount} boulder${dirtyCount > 1 ? 's' : ''}`}
                  </button>
                  {savedAt && dirtyCount === 0 && (
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
