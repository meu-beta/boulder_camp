import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
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
import { useLiveEvent } from '../lib/useLiveEvent';

const ON_WALL_LIMIT = 2;

function QueueRow({ entry, onSetStatus, onRemove, canGoOnWall }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors = {
    waiting: 'text-white/60',
    on_wall: 'text-gold',
    done: 'text-white/30 line-through',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-panel2 border border-white/10 rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-white/30 hover:text-white px-1"
        title="Arrastar para reordenar"
      >
        ⠿
      </button>
      <span className="w-6 text-white/40 text-sm">{entry.position}</span>
      <span className={`flex-1 font-medium ${statusColors[entry.status]}`}>
        {entry.athlete?.bib_number ? `#${entry.athlete.bib_number} ` : ''}
        {entry.athlete?.name}
      </span>
      <span className="text-xs uppercase tracking-wide px-2 py-1 rounded bg-white/5 text-white/50">
        {entry.status === 'waiting' ? 'Aguardando' : entry.status === 'on_wall' ? 'Na parede' : 'Concluído'}
      </span>
      {entry.status !== 'on_wall' && (
        <button
          onClick={() => onSetStatus(entry.id, 'on_wall')}
          disabled={!canGoOnWall}
          className="text-xs px-3 py-1 rounded bg-gold text-panel font-bold disabled:opacity-30"
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
      <button onClick={() => onRemove(entry.id)} className="text-red-400 hover:text-red-300 text-xs">
        Remover
      </button>
    </div>
  );
}

export default function AthleteQueue() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { athletes, queue, category, refresh } = useLiveEvent('Boulder');
  const [addingId, setAddingId] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const queuedAthleteIds = new Set(queue.map((q) => q.athlete_id));
  const availableAthletes = athletes.filter((a) => !queuedAthleteIds.has(a.id));
  const onWallCount = queue.filter((q) => q.status === 'on_wall').length;

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/athlete-control/login');
  };

  const persistOrder = async (list) => {
    await Promise.all(
      list.map((entry, idx) =>
        supabase.from('queue_entries').update({ position: idx + 1 }).eq('id', entry.id)
      )
    );
    if (category) refresh(category.id);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = queue.findIndex((q) => q.id === active.id);
    const newIndex = queue.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(queue, oldIndex, newIndex);
    persistOrder(reordered);
  };

  const handleSetStatus = async (id, status) => {
    await supabase.from('queue_entries').update({ status }).eq('id', id);
    if (category) refresh(category.id);
  };

  const handleRemove = async (id) => {
    await supabase.from('queue_entries').delete().eq('id', id);
    if (category) refresh(category.id);
  };

  const handleAdd = async () => {
    if (!addingId || !category) return;
    const nextPosition = queue.length + 1;
    await supabase.from('queue_entries').insert({
      athlete_id: addingId,
      category_id: category.id,
      position: nextPosition,
      status: 'waiting',
    });
    setAddingId('');
    refresh(category.id);
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Controle de Atletas</p>
            <h1 className="text-2xl font-bold">Fila de entrada</h1>
            <p className="text-white/40 text-xs mt-1">
              Na parede: {onWallCount}/{ON_WALL_LIMIT}
            </p>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/athlete-control/register" className="text-white/70 hover:text-white">Cadastro</Link>
            <Link to="/comp/athlete-control/timer" className="text-white/70 hover:text-white">Cronômetro</Link>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">Sair</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <select
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-panel2 border border-white/20 focus:border-gold outline-none"
          >
            <option value="">Adicionar atleta à fila...</option>
            {availableAthletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bib_number ? `#${a.bib_number} ` : ''}
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!addingId}
            className="px-4 py-2 rounded bg-gold text-panel font-bold disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={queue.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {queue.map((entry) => (
                <QueueRow
                  key={entry.id}
                  entry={entry}
                  onSetStatus={handleSetStatus}
                  onRemove={handleRemove}
                  canGoOnWall={onWallCount < ON_WALL_LIMIT}
                />
              ))}
              {queue.length === 0 && (
                <p className="text-center text-white/40 py-8">Fila vazia. Adicione atletas acima.</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
