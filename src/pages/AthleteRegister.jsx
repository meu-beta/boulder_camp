import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabaseClient';
import { useLiveEvent } from '../lib/useLiveEvent';

export default function AthleteRegister() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { athletes, category, refresh } = useLiveEvent('Boulder');
  const [form, setForm] = useState({ name: '', bib_number: '', country_code: '' });
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/athlete-control/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return;
    setSaving(true);
    await supabase.from('athletes').insert({
      name: form.name,
      bib_number: form.bib_number ? Number(form.bib_number) : null,
      country_code: form.country_code.toUpperCase() || null,
      category_id: category.id,
    });
    setForm({ name: '', bib_number: '', country_code: '' });
    setSaving(false);
    refresh(category.id);
  };

  const handleDelete = async (id) => {
    await supabase.from('athletes').delete().eq('id', id);
    if (category) refresh(category.id);
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Controle de Atletas</p>
            <h1 className="text-2xl font-bold">Cadastro de atletas</h1>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/athlete-control/queue" className="text-white/70 hover:text-white">Fila</Link>
            <Link to="/comp/athlete-control/timer" className="text-white/70 hover:text-white">Cronômetro</Link>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">Sair</button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel2 border border-white/10 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8"
        >
          <input
            required
            placeholder="Nome do atleta"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="sm:col-span-2 px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
          />
          <input
            placeholder="Nº peito"
            value={form.bib_number}
            onChange={(e) => setForm((f) => ({ ...f, bib_number: e.target.value }))}
            className="px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
          />
          <input
            placeholder="País (ex: BRA)"
            maxLength={3}
            value={form.country_code}
            onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))}
            className="px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-4 bg-gold text-panel font-bold py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Adicionar atleta'}
          </button>
        </form>

        <div className="bg-panel2 border border-white/10 rounded-xl divide-y divide-white/10">
          {athletes.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <span>
                {a.bib_number ? `#${a.bib_number} ` : ''}
                {a.name} {a.country_code ? `(${a.country_code})` : ''}
              </span>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remover
              </button>
            </div>
          ))}
          {athletes.length === 0 && (
            <p className="px-4 py-6 text-center text-white/40">Nenhum atleta cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
