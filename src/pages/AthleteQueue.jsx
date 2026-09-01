import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabaseClient';
import { useEvent } from '../lib/useEvent';
import { participated } from '../lib/scoring';
import { EVENT_TITLE } from '../lib/event';
import PhaseTabs from '../components/PhaseTabs';

const ON_WALL_LIMIT = 2;

/** "há 2min14" a partir do instante em que subiu na parede. */
function elapsedSince(iso, now) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}min${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Boulder em que o atleta começa o rodízio.
 * Por padrão distribui pelo número de peito: peito 1 começa no B1, peito 2
 * no B2, e assim por diante, voltando ao início quando acaba.
 */
function startIndexFor(athlete, total) {
  if (total <= 0) return 0;
  const bib = athlete?.bib_number;
  if (typeof bib === 'number' && bib > 0) return (bib - 1) % total;
  return 0;
}

/**
 * Próximo boulder do rodízio: começa no boulder inicial do atleta e anda em
 * círculo até achar um que ele ainda não encarou. Retorna null se já fez todos.
 */
function nextBoulderId(athlete, boulders, doneIds) {
  const total = boulders.length;
  if (total === 0) return null;
  const start = startIndexFor(athlete, total);
  for (let n = 0; n < total; n += 1) {
    const candidate = boulders[(start + n) % total];
    if (!doneIds.has(candidate.id)) return candidate.id;
  }
  return null;
}

/**
 * Trilha de boulders já encarados pelo atleta nesta fase.
 * Acende sozinha a partir do que o árbitro lançou no painel de pontuação,
 * e também com o "Concluir" marcado aqui na fila.
 */
function BoulderTrack({ boulders, doneIds, nextId }) {
  if (boulders.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-white/30 mr-1">Já fez</span>
      {boulders.map((b) => {
        const done = doneIds.has(b.id);
        const isNext = b.id === nextId;
        return (
          <span
            key={b.id}
            title={
              done
                ? `Boulder ${b.number} — já encarado`
                : isNext
                ? `Boulder ${b.number} — próximo do rodízio`
                : `Boulder ${b.number} — ainda não`
            }
            className={`w-6 h-6 rounded border text-[11px] leading-none flex items-center justify-center ${
              done
                ? 'bg-gold border-gold text-panel font-bold'
                : isNext
                ? 'border-gold/70 text-gold'
                : 'border-white/15 text-white/25'
            }`}
          >
            {b.number}
          </span>
        );
      })}
    </div>
  );
}

function QueueRow({
  entry,
  boulders,
  doneIds,
  nextId,
  onSetStatus,
  onRemove,
  onSetBoulder,
  canGoOnWall,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const statusStyle = {
    waiting: 'text-white/70',
    on_wall: 'text-gold font-bold',
    done: 'text-white/30',
  };

  const statusLabel = { waiting: 'Aguardando', on_wall: 'Na parede', done: 'Concluído' };
  const shown = entry.boulder_id ?? nextId;
  const finishedAll = nextId === null && !entry.boulder_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2.5 rounded-lg border ${
        entry.status === 'on_wall' ? 'bg-gold/10 border-gold/40' : 'bg-panel2 border-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none select-none text-white/25 hover:text-white px-2 py-2 -my-1 text-lg leading-none"
          title="Arrastar para reordenar (no celular, segure e arraste)"
        >
          ⠿
        </button>

        <span className="w-6 text-white/40 text-sm tabular-nums">{entry.position}</span>

        <span className={`flex-1 truncate ${statusStyle[entry.status]}`}>
          {entry.athlete?.bib_number ? (
            <span className="text-white/40 mr-1">#{entry.athlete.bib_number}</span>
          ) : null}
          {entry.athlete?.name ?? '—'}
        </span>

        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-white/5 text-white/50 hidden sm:inline">
          {statusLabel[entry.status]}
        </span>

        {entry.status !== 'on_wall' && (
          <button
            onClick={() => onSetStatus(entry.id, 'on_wall')}
            disabled={!canGoOnWall || finishedAll}
            className="text-xs px-3 py-1 rounded bg-gold text-panel font-bold disabled:opacity-25"
          >
            Chamar
          </button>
        )}
        {entry.status === 'on_wall' && (
          <button
            onClick={() => onSetStatus(entry.id, 'done')}
            className="text-xs px-3 py-1 rounded bg-white/10 text-white font-bold"
          >
            Concluir
          </button>
        )}

        <button
          onClick={() => onRemove(entry.id)}
          className="text-alert/70 hover:text-alert text-xs px-1"
          title="Remover da fila"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2 pl-9 flex-wrap">
        <BoulderTrack boulders={boulders} doneIds={doneIds} nextId={shown} />

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] uppercase tracking-wide text-white/30">Próximo</span>
          {finishedAll ? (
            <span className="text-xs text-gold/70 px-2">completou todos</span>
          ) : (
            <select
              value={entry.boulder_id ?? nextId ?? ''}
              onChange={(e) => onSetBoulder(entry.id, e.target.value ? Number(e.target.value) : null)}
              className="text-xs px-2 py-1 rounded bg-panel border border-white/15 text-white/70 focus:border-gold outline-none"
              title="Calculado pelo rodízio. Pode trocar se precisar."
            >
              {boulders.map((b) => (
                <option key={b.id} value={b.id}>
                  B{b.number}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

/** Painel lateral fixo com quem está escalando agora. */
function OnWallPanel({ entries, boulders, now, onSetStatus }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-gold flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        Na parede agora
      </h2>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
          <p className="text-white/30 text-sm">Nenhum atleta na parede.</p>
          <p className="text-white/20 text-xs mt-1">Use o botão "Chamar" na fila ao lado.</p>
        </div>
      ) : (
        entries.map((entry) => {
          const boulder = boulders.find((b) => b.id === entry.boulder_id);
          return (
            <div key={entry.id} className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-lg font-bold text-white leading-tight">
                {entry.athlete?.bib_number ? (
                  <span className="text-gold/70 mr-1">#{entry.athlete.bib_number}</span>
                ) : null}
                {entry.athlete?.name ?? '—'}
              </p>
              <p className="text-gold text-sm mt-1">
                {boulder ? `Boulder ${boulder.number}` : 'Boulder não definido'}
              </p>
              <p className="text-white/50 text-xs mt-2 tabular-nums">
                na parede há {elapsedSince(entry.on_wall_since, now) ?? '—'}
              </p>
              <button
                onClick={() => onSetStatus(entry.id, 'done')}
                className="mt-3 w-full py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
              >
                Concluir
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

/** Resumo por boulder: quem já encarou cada um. */
function BoulderSummary({ boulders, athletes, doneByAthlete }) {
  if (boulders.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-white/40">Resumo por boulder</h2>
      <div className="space-y-2">
        {boulders.map((b) => {
          const feitos = athletes.filter((a) => doneByAthlete.get(a.id)?.has(b.id));
          const pct = athletes.length ? Math.round((feitos.length / athletes.length) * 100) : 0;

          return (
            <div key={b.id} className="rounded-xl border border-white/10 bg-panel2 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gold">Boulder {b.number}</span>
                <span className="text-white/50 text-xs tabular-nums">
                  {feitos.length}/{athletes.length}
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>

              {feitos.length === 0 ? (
                <p className="text-white/25 text-xs">Ninguém encarou ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {feitos.map((a) => (
                    <span
                      key={a.id}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                      title={a.name}
                    >
                      {a.bib_number ? `#${a.bib_number}` : a.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AthleteQueue() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { rounds, activeRound, getRound, loading, refresh } = useEvent('Boulder');

  const [roundId, setRoundId] = useState(null);
  const [addingId, setAddingId] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { round, boulders, athletes, queue, scores } = useMemo(
    () => getRound(roundId),
    [getRound, roundId]
  );

  /**
   * Boulders já encarados por atleta. Junta duas fontes:
   *  - o que o árbitro lançou no painel de pontuação (fonte principal)
   *  - o "Concluir" marcado aqui na fila, que chega antes do lançamento
   */
  const doneByAthlete = useMemo(() => {
    const map = new Map();
    const add = (athleteId, boulderId) => {
      if (!map.has(athleteId)) map.set(athleteId, new Set());
      map.get(athleteId).add(boulderId);
    };
    scores.forEach((s) => {
      if (participated(s)) add(s.athlete_id, s.boulder_id);
    });
    queue.forEach((q) => {
      (q.done_boulders ?? []).forEach((bid) => add(q.athlete_id, bid));
    });
    return map;
  }, [scores, queue]);

  // No mouse, arrastar 5px ja inicia. No dedo, um sensor de ponteiro competiria
  // com a rolagem da pagina, entao o toque usa press-and-hold: segurar ~220ms
  // para arrastar, e um deslize rapido continua rolando a lista normalmente.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } })
  );

  const queuedIds = new Set(queue.map((q) => q.athlete_id));
  const available = athletes.filter((a) => !queuedIds.has(a.id));
  const onWall = queue.filter((q) => q.status === 'on_wall');
  const waiting = queue.filter((q) => q.status === 'waiting');

  const doneFor = (athleteId) => doneByAthlete.get(athleteId) ?? new Set();
  const suggestFor = (entry) => nextBoulderId(entry.athlete, boulders, doneFor(entry.athlete_id));

  const persistOrder = async (list) => {
    await Promise.all(
      list.map((entry, index) =>
        supabase.from('queue_entries').update({ position: index + 1 }).eq('id', entry.id)
      )
    );
    refresh();
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = queue.findIndex((q) => q.id === active.id);
    const newIndex = queue.findIndex((q) => q.id === over.id);
    persistOrder(arrayMove(queue, oldIndex, newIndex));
  };

  const handleSetStatus = async (id, status) => {
    const entry = queue.find((q) => q.id === id);
    const changes = {
      status,
      updated_at: new Date().toISOString(),
      on_wall_since: status === 'on_wall' ? new Date().toISOString() : null,
    };

    if (status === 'on_wall' && !entry?.boulder_id) {
      changes.boulder_id = suggestFor(entry);
    }

    // Ao concluir, marca o boulder como feito e já engata o próximo do rodízio.
    if (status === 'done' && entry) {
      const boulderDone = entry.boulder_id ?? suggestFor(entry);
      const current = entry.done_boulders ?? [];
      const updated =
        boulderDone && !current.includes(boulderDone) ? [...current, boulderDone] : current;
      changes.done_boulders = updated;

      const doneSet = new Set([...doneFor(entry.athlete_id), ...updated]);
      changes.boulder_id = nextBoulderId(entry.athlete, boulders, doneSet);
    }

    await supabase.from('queue_entries').update(changes).eq('id', id);
    refresh();
  };

  const handleSetBoulder = async (id, boulderId) => {
    await supabase.from('queue_entries').update({ boulder_id: boulderId }).eq('id', id);
    refresh();
  };

  const handleRemove = async (id) => {
    await supabase.from('queue_entries').delete().eq('id', id);
    refresh();
  };

  const handleAdd = async () => {
    if (!addingId || !round) return;
    const athlete = athletes.find((a) => a.id === addingId);
    await supabase.from('queue_entries').insert({
      athlete_id: addingId,
      round_id: round.id,
      boulder_id: nextBoulderId(athlete, boulders, doneFor(addingId)),
      position: queue.length + 1,
      status: 'waiting',
    });
    setAddingId('');
    refresh();
  };

  const handleCallNext = async () => {
    const next = waiting[0];
    if (!next || onWall.length >= ON_WALL_LIMIT) return;
    handleSetStatus(next.id, 'on_wall');
  };

  const handleAddAll = async () => {
    if (available.length === 0 || !round) return;
    const rows = available.map((a, index) => ({
      athlete_id: a.id,
      round_id: round.id,
      boulder_id: nextBoulderId(a, boulders, doneFor(a.id)),
      position: queue.length + index + 1,
      status: 'waiting',
    }));
    await supabase.from('queue_entries').insert(rows);
    refresh();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/athlete-control/login');
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gold tracking-tight">
              {EVENT_TITLE}
            </h1>
            <p className="text-white/60 text-sm mt-0.5">Controle de Atletas — Fila de entrada</p>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/athlete-control/register" className="text-white/70 hover:text-white">
              Cadastro
            </Link>
            <Link to="/comp/athlete-control/rounds" className="text-white/70 hover:text-white">
              Fases
            </Link>
            <Link to="/comp/athlete-control/timer" className="text-white/70 hover:text-white">
              Cronômetro
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
          <div className="flex flex-col-reverse lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-3">
                <select
                  value={addingId}
                  onChange={(e) => setAddingId(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded bg-panel2 border border-white/20 focus:border-gold outline-none"
                >
                  <option value="">Adicionar atleta à fila...</option>
                  {available.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bib_number ? `#${a.bib_number} ` : ''}
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!addingId}
                  className="px-4 py-2 rounded bg-gold text-panel font-bold disabled:opacity-30"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex gap-2 mb-5 flex-wrap">
                <button
                  onClick={handleCallNext}
                  disabled={waiting.length === 0 || onWall.length >= ON_WALL_LIMIT}
                  className="px-4 py-2 rounded-lg bg-gold/20 border border-gold/50 text-gold text-sm font-bold disabled:opacity-25"
                >
                  Chamar próximo
                </button>
                <button
                  onClick={handleAddAll}
                  disabled={available.length === 0}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm font-semibold disabled:opacity-25"
                >
                  Adicionar todos ({available.length})
                </button>
                <span className="px-3 py-2 text-white/40 text-sm">
                  Na parede: {onWall.length}/{ON_WALL_LIMIT}
                </span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={queue.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {queue.map((entry) => (
                      <QueueRow
                        key={entry.id}
                        entry={entry}
                        boulders={boulders}
                        doneIds={doneFor(entry.athlete_id)}
                        nextId={suggestFor(entry)}
                        onSetStatus={handleSetStatus}
                        onSetBoulder={handleSetBoulder}
                        onRemove={handleRemove}
                        canGoOnWall={onWall.length < ON_WALL_LIMIT}
                      />
                    ))}
                    {queue.length === 0 && (
                      <p className="text-center text-white/40 py-10 border border-dashed border-white/10 rounded-xl">
                        Fila vazia. Adicione atletas acima.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <aside className="lg:w-80 shrink-0 space-y-6">
              <div className="lg:sticky lg:top-6 space-y-6">
                <OnWallPanel
                  entries={onWall}
                  boulders={boulders}
                  now={now}
                  onSetStatus={handleSetStatus}
                />
                <BoulderSummary
                  boulders={boulders}
                  athletes={athletes}
                  doneByAthlete={doneByAthlete}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
