import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useLiveEvent } from '../lib/useLiveEvent';
import { supabase } from '../supabaseClient';

// Score entry panel used by arbitration staff. For the selected
// athlete + boulder, staff mark TOP / ZONE and the attempt count each
// was achieved on. Writes go straight to Supabase and every screen
// subscribed (public ranking, staff ranking) updates instantly.
export default function StaffPanel() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { athletes, boulders, scores, refresh, category } = useLiveEvent('Boulder');
  const [athleteId, setAthleteId] = useState('');
  const [boulderId, setBoulderId] = useState('');
  const [saving, setSaving] = useState(false);

  const current = scores.find(
    (s) => s.athlete_id === athleteId && s.boulder_id === Number(boulderId)
  );

  const [form, setForm] = useState({ top: false, top_attempts: 0, zone: false, zone_attempts: 0 });

  const loadForm = (aId, bId) => {
    const existing = scores.find((s) => s.athlete_id === aId && s.boulder_id === Number(bId));
    setForm(
      existing
        ? {
            top: existing.top,
            top_attempts: existing.top_attempts,
            zone: existing.zone,
            zone_attempts: existing.zone_attempts,
          }
        : { top: false, top_attempts: 0, zone: false, zone_attempts: 0 }
    );
  };

  const handleAthleteChange = (val) => {
    setAthleteId(val);
    if (boulderId) loadForm(val, boulderId);
  };
  const handleBoulderChange = (val) => {
    setBoulderId(val);
    if (athleteId) loadForm(athleteId, val);
  };

  const handleSave = async () => {
    if (!athleteId || !boulderId) return;
    setSaving(true);
    await supabase.from('scores').upsert(
      {
        athlete_id: athleteId,
        boulder_id: Number(boulderId),
        top: form.top,
        top_attempts: Number(form.top_attempts) || 0,
        zone: form.zone,
        zone_attempts: Number(form.zone_attempts) || 0,
        updated_by: profile?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,boulder_id' }
    );
    setSaving(false);
    if (category) refresh(category.id);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/staff/login');
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Staff — Arbitragem</p>
            <h1 className="text-2xl font-bold">Painel de pontuação</h1>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/staff/ranking" className="text-white/70 hover:text-white">Ver ranking</Link>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">Sair</button>
          </div>
        </div>

        <div className="bg-panel2 border border-white/10 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Atleta</label>
              <select
                value={athleteId}
                onChange={(e) => handleAthleteChange(e.target.value)}
                className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
              >
                <option value="">Selecione...</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bib_number ? `#${a.bib_number} ` : ''}
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Boulder</label>
              <select
                value={boulderId}
                onChange={(e) => handleBoulderChange(e.target.value)}
                className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
              >
                <option value="">Selecione...</option>
                {boulders.map((b) => (
                  <option key={b.id} value={b.id}>
                    Boulder {b.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {athleteId && boulderId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={form.top}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        top: e.target.checked,
                        zone: e.target.checked ? true : f.zone,
                        top_attempts: e.target.checked && f.top_attempts === 0 ? 1 : f.top_attempts,
                        zone_attempts:
                          e.target.checked && f.zone_attempts === 0 ? 1 : f.zone_attempts,
                      }))
                    }
                  />
                  TOP
                </label>
                <label className="block text-sm text-white/70">Tentativas até o TOP</label>
                <input
                  type="number"
                  min={0}
                  value={form.top_attempts}
                  onChange={(e) => setForm((f) => ({ ...f, top_attempts: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={form.zone}
                    onChange={(e) => setForm((f) => ({ ...f, zone: e.target.checked }))}
                  />
                  ZONA
                </label>
                <label className="block text-sm text-white/70">Tentativas até a ZONA</label>
                <input
                  type="number"
                  min={0}
                  value={form.zone_attempts}
                  onChange={(e) => setForm((f) => ({ ...f, zone_attempts: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!athleteId || !boulderId || saving}
            className="w-full bg-gold text-panel font-bold py-2 rounded hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar pontuação'}
          </button>
          {current && (
            <p className="text-xs text-white/40">
              Última atualização: {new Date(current.updated_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
