import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// A single wall-lane countdown timer, synced to the `timer_state`
// table so it stays consistent across every device watching (staff,
// athlete control, and optionally a big screen for the public).
export default function Timer({ lane, athleteName, state, onChange }) {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(intervalRef.current);
  }, []);

  const duration = state?.duration_seconds ?? 240;
  let remaining = duration;
  if (state?.running && state?.started_at) {
    const elapsed = (now - new Date(state.started_at).getTime()) / 1000;
    remaining = duration - elapsed;
  }
  const isOver = remaining <= 0 && state?.running;

  const persist = async (patch) => {
    const updated = { ...state, ...patch, updated_at: new Date().toISOString() };
    await supabase.from('timer_state').update(updated).eq('lane', lane);
    onChange?.(updated);
  };

  const start = () => persist({ running: true, started_at: new Date().toISOString() });
  const pause = () => {
    const elapsed = state?.started_at ? (Date.now() - new Date(state.started_at).getTime()) / 1000 : 0;
    const leftover = Math.max(0, duration - elapsed);
    persist({ running: false, duration_seconds: leftover, started_at: null });
  };
  const reset = () => persist({ running: false, duration_seconds: 240, started_at: null });

  return (
    <div
      className={`rounded-xl border p-6 text-center ${
        isOver ? 'border-red-500 bg-red-950/40' : 'border-white/10 bg-panel2'
      }`}
    >
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Parede {lane}</p>
      <p className="text-white font-semibold mb-3 h-6">{athleteName || 'Sem atleta'}</p>
      <p className={`text-6xl font-mono font-extrabold ${isOver ? 'text-red-400' : 'text-gold'}`}>
        {formatTime(remaining)}
      </p>
      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={start}
          disabled={state?.running}
          className="px-4 py-2 rounded bg-gold text-panel font-bold disabled:opacity-40"
        >
          Iniciar
        </button>
        <button
          onClick={pause}
          disabled={!state?.running}
          className="px-4 py-2 rounded bg-white/10 text-white font-bold disabled:opacity-40"
        >
          Pausar
        </button>
        <button onClick={reset} className="px-4 py-2 rounded bg-white/10 text-white font-bold">
          Resetar (4:00)
        </button>
      </div>
    </div>
  );
}
