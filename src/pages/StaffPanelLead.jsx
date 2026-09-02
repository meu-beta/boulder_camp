import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useEvent } from '../lib/useEvent';
import { supabase } from '../supabaseClient';
import { formatRoute, started } from '../lib/scoringLead';
import PhaseTabs from '../components/PhaseTabs';
import ModalityBar from '../components/ModalityBar';
import AttemptStepper from '../components/AttemptStepper';

// Painel do árbitro da GUIADA, organizado POR VIA: escolhe-se a via e a tela
// lista todos os atletas da fase. Mesmo formato do painel de boulder — um juiz
// fixo por via — mas o que se lança é outra coisa.
//
// O que o árbitro anota, na ordem do regulamento (15.1 a 15.3):
//
//   valor no croqui .. o número da agarra NO CROQUI preparado pelo routesetter.
//                      Não é a contagem de agarras da via.
//   controlada/usada . o "+" da súmula. Agarra apenas CONTROLADA vale o número
//                      cheio; agarra USADA vale meia posição a mais (15.3 iii).
//   TOP .............. finalizou a via.
//   tempo ............ tempo total da tentativa, arredondado para baixo (15.2a).
//                      É registrado em TODAS as tentativas, mesmo só sendo usado
//                      como desempate na final entre as três primeiras (15.6b).
//
// Tudo grava na mesma tabela `scores` do boulder, nas colunas hold_value,
// hold_used e time_seconds. As colunas de zona/tentativa ficam intocadas.

const CHECKBOX = 'w-6 h-6 rounded shrink-0 cursor-pointer';
// O tempo continua sendo campo de texto livre: aceita "4:32" e "272", e não
// faz sentido ter − e + para somar um segundo de cada vez. h-11 mantém o mesmo
// alvo de toque dos botões do seletor de agarra, ao lado.
const TIME_INPUT =
  'w-24 h-11 px-2 rounded-lg bg-panel border border-white/20 focus:border-gold outline-none text-base text-center tabular-nums disabled:opacity-25';

const EMPTY_ROW = {
  attempted: false,
  hold_value: '',
  hold_used: false,
  top: false,
  time: '',
  locked: false,
};

/** "4:32" ou "272" -> 272 segundos. Devolve null quando vazio ou ilegível. */
export function parseTime(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const partes = t.split(':');
  if (partes.length === 1) {
    const s = Number(partes[0]);
    return Number.isFinite(s) ? Math.max(0, Math.floor(s)) : null;
  }
  const m = Number(partes[0]);
  const s = Number(partes[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return Math.max(0, Math.floor(m) * 60 + Math.floor(s));
}

/** 272 -> "4:32". */
export function formatTime(seconds) {
  if (seconds == null || seconds === '') return '';
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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

/** O rascunho na forma que o scoringLead entende, para a prévia do resultado. */
function asScore(draft) {
  return {
    attempted: draft.attempted || draft.top || draft.hold_value !== '',
    top: draft.top,
    hold_value: draft.hold_value === '' ? null : Number(draft.hold_value),
    hold_used: draft.hold_used,
  };
}

function AthleteRow({ athlete, draft, dirty, onChange }) {
  const locked = draft.locked;
  const score = asScore(draft);
  const texto = formatRoute(score);
  const escalou = started(score);

  const update = (changes) => onChange({ ...draft, ...changes });

  const setTop = (checked) => {
    // TOP torna o valor da agarra irrelevante — o regulamento trata TOP como
    // acima de qualquer agarra. Deixamos o número gravado, mas desabilitado.
    update({ top: checked, attempted: checked ? true : draft.attempted });
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
          <span
            className={`text-lg font-extrabold tabular-nums ${
              escalou ? 'text-gold' : 'text-white/25'
            }`}
          >
            {texto}
          </span>
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
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-zone">Agarra</span>
            <AttemptStepper
              value={draft.hold_value}
              disabled={draft.top}
              min={0}
              permitirVazio
              onChange={(v) => update({ hold_value: v, attempted: v !== '' || draft.attempted })}
              ariaLabel="Valor da agarra no croqui"
              title="Valor da agarra NO CROQUI, definido pelo routesetter (15.1)"
            />
          </div>

          {/* O "+" da súmula: controlada x usada (15.3 iii). Dois botões em vez
              de um checkbox porque o árbitro precisa ver os dois estados
              nomeados — "usada" e "controlada" são termos do regulamento. */}
          <div className="flex rounded-lg overflow-hidden border border-white/15 text-xs font-semibold">
            <button
              type="button"
              disabled={draft.top}
              onClick={() => update({ hold_used: false })}
              className={`px-3 py-2 transition disabled:opacity-30 ${
                !draft.hold_used ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Agarra apenas controlada — vale o número cheio"
            >
              controlada
            </button>
            <button
              type="button"
              disabled={draft.top}
              onClick={() => update({ hold_used: true, attempted: true })}
              className={`px-3 py-2 transition disabled:opacity-30 ${
                draft.hold_used ? 'bg-zone text-panel' : 'text-white/40 hover:text-white'
              }`}
              title="Agarra usada — vale meia posição a mais, o + da súmula"
            >
              usada +
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.top}
              onChange={(e) => setTop(e.target.checked)}
              className={CHECKBOX + ' accent-gold'}
            />
            <span className="font-semibold text-gold">TOP</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-white/50">Tempo</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="4:32"
              value={draft.time}
              onChange={(e) => update({ time: e.target.value })}
              className={TIME_INPUT}
              title="Tempo total da tentativa, arredondado para baixo (15.2a). Aceita 4:32 ou 272."
            />
          </label>

          <label
            className="flex items-center gap-2 text-sm sm:ml-auto"
            title="Marque quando o atleta largou mas não passou da primeira agarra. Sem isso ele conta como não largou, e quem não larga nas duas vias fica sem ranking (15.5c)."
          >
            <input
              type="checkbox"
              checked={draft.attempted}
              disabled={draft.top || draft.hold_value !== ''}
              onChange={(e) => update({ attempted: e.target.checked })}
              className={CHECKBOX + ' accent-white'}
            />
            <span className={escalou ? 'text-white/70' : 'text-white/40'}>Largou</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export default function StaffPanelLead() {
  const { profile } = useAuth();
  const { rounds, activeRound, getRound, loading, refresh } = useEvent('Lead');

  const [roundId, setRoundId] = useState(null);
  const [viaId, setViaId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  // `boulders` é o nome da tabela; na Guiada essas linhas são as VIAS.
  const { round, boulders: vias, athletes, scores } = useMemo(
    () => getRound(roundId),
    [getRound, roundId]
  );

  useEffect(() => {
    if (vias.length === 0) {
      setViaId(null);
      return;
    }
    if (!vias.some((v) => v.id === viaId)) setViaId(vias[0].id);
  }, [vias, viaId]);

  useEffect(() => {
    if (!viaId) {
      setDrafts({});
      return;
    }
    const next = {};
    athletes.forEach((a) => {
      const saved = scores.find((s) => s.athlete_id === a.id && s.boulder_id === viaId);
      next[a.id] = saved
        ? {
            attempted: saved.attempted ?? false,
            hold_value: saved.hold_value == null ? '' : saved.hold_value,
            hold_used: saved.hold_used ?? false,
            top: saved.top ?? false,
            time: formatTime(saved.time_seconds),
            locked: saved.locked ?? false,
          }
        : { ...EMPTY_ROW };
    });
    setDrafts(next);
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaId, roundId, athletes.length, scores.length]);

  const savedFor = (athleteId) =>
    scores.find((s) => s.athlete_id === athleteId && s.boulder_id === viaId) ?? null;

  const isDirty = (athleteId) => {
    const draft = drafts[athleteId];
    if (!draft) return false;
    const saved = savedFor(athleteId);
    if (!saved) {
      return draft.attempted || draft.top || draft.hold_value !== '' || draft.time !== '' || draft.locked;
    }
    return (
      draft.attempted !== (saved.attempted ?? false) ||
      String(draft.hold_value) !== String(saved.hold_value ?? '') ||
      draft.hold_used !== (saved.hold_used ?? false) ||
      draft.top !== (saved.top ?? false) ||
      parseTime(draft.time) !== (saved.time_seconds ?? null) ||
      draft.locked !== (saved.locked ?? false)
    );
  };

  const dirtyIds = athletes.filter((a) => isDirty(a.id)).map((a) => a.id);
  const registered = athletes.filter((a) => started(asScore(drafts[a.id] ?? EMPTY_ROW))).length;
  const via = vias.find((v) => v.id === viaId) ?? null;

  const handleSave = async () => {
    if (dirtyIds.length === 0 || !viaId) return;
    setSaving(true);

    const rows = dirtyIds.map((athleteId) => {
      const draft = drafts[athleteId];
      return {
        athlete_id: athleteId,
        boulder_id: viaId,
        attempted: draft.attempted || draft.top || draft.hold_value !== '',
        top: draft.top,
        hold_value: draft.hold_value === '' ? null : Number(draft.hold_value),
        // No TOP o "+" não faz sentido: não há agarra seguinte a controlar.
        hold_used: draft.top ? false : draft.hold_used,
        time_seconds: parseTime(draft.time),
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
          <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} abbr="V" />
        </div>

        {loading ? (
          <p className="text-center text-white/60 py-12">Carregando...</p>
        ) : !round ? (
          <p className="text-center text-white/60 py-12">Nenhuma fase configurada.</p>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-2">
                Via que você está arbitrando
              </p>
              <div className="flex flex-wrap gap-2">
                {vias.map((v) => {
                  const done = athletes.filter((a) =>
                    started(scores.find((s) => s.athlete_id === a.id && s.boulder_id === v.id))
                  ).length;
                  const selected = v.id === viaId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setViaId(v.id)}
                      className={`px-4 py-2.5 rounded-lg border font-bold transition ${
                        selected
                          ? 'bg-gold text-panel border-gold'
                          : 'bg-panel2 text-white/70 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Via {v.number}
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
                  <h2 className="text-lg font-bold">{via ? `Via ${via.number}` : '—'}</h2>
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
