import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabaseClient';
import { useLiveEvent } from '../lib/useLiveEvent';
import Timer from '../components/Timer';

export default function AthleteTimer() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { queue } = useLiveEvent('Boulder');
  const [timers, setTimers] = useState({ 1: null, 2: null });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('timer_state').select('*');
      const map = {};
      (data ?? []).forEach((t) => (map[t.lane] = t));
      setTimers(map);
    };
    load();

    const channel = supabase
      .channel('timer-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state' }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const onWall = queue.filter((q) => q.status === 'on_wall');

  const handleLogout = async () => {
    await signOut();
    navigate('/athlete-control/login');
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Controle de Atletas</p>
            <h1 className="text-2xl font-bold">Cronômetro</h1>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/athlete-control/queue" className="text-white/70 hover:text-white">Fila</Link>
            <Link to="/athlete-control/register" className="text-white/70 hover:text-white">Cadastro</Link>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">Sair</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Timer
            lane={1}
            athleteName={onWall[0]?.athlete?.name}
            state={timers[1]}
            onChange={(s) => setTimers((t) => ({ ...t, 1: s }))}
          />
          <Timer
            lane={2}
            athleteName={onWall[1]?.athlete?.name}
            state={timers[2]}
            onChange={(s) => setTimers((t) => ({ ...t, 2: s }))}
          />
        </div>
      </div>
    </div>
  );
}
