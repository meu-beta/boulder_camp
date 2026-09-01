import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabaseClient';
import { useEvent } from '../lib/useEvent';
import PhaseTabs from '../components/PhaseTabs';
import StateFlag from '../components/StateFlag';
import { STATES, isValidUf } from '../lib/states';

// Cadastro de atletas e inscrição deles em cada fase.
// Um atleta só aparece no ranking e no painel do árbitro se estiver
// inscrito na fase — normalmente todos entram na Classificatória e as
// fases seguintes são preenchidas pela promoção automática.

export default function AthleteRegister() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { category, rounds, activeRound, entries, athletes, getRound, loading, refresh } =
    useEvent('Boulder');

  const [roundId, setRoundId] = useState(null);
  // O estado costuma se repetir entre atletas do mesmo clube, entao ele
  // permanece preenchido depois de cadastrar.
  const [form, setForm] = useState({
    name: '',
    bib_number: '',
    country_code: 'BRA',
    state_code: 'SP',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round } = useMemo(() => getRound(roundId), [getRound, roundId]);

  const enrolledIds = useMemo(
    () => new Set(entries.filter((e) => e.round_id === roundId).map((e) => e.athlete_id)),
    [entries, roundId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !round) return;
    setSaving(true);

    const { data: created, error } = await supabase
      .from('athletes')
      .insert({
        name: form.name.trim(),
        bib_number: form.bib_number ? Number(form.bib_number) : null,
        country_code: form.country_code.toUpperCase().slice(0, 3) || null,
        state_code: isValidUf(form.state_code) ? form.state_code.toUpperCase() : null,
        category_id: category.id,
      })
      .select()
      .single();

    // Recém-cadastrado já entra na fase que está sendo vista.
    if (created && !error) {
      await supabase
        .from('round_entries')
        .insert({ round_id: round.id, athlete_id: created.id });
    }

    setForm({
      name: '',
      bib_number: '',
      country_code: form.country_code,
      state_code: form.state_code,
    });
    setSaving(false);
    refresh();
  };

  const toggleEnrollment = async (athleteId) => {
    if (!round) return;
    if (enrolledIds.has(athleteId)) {
      await supabase
        .from('round_entries')
        .delete()
        .eq('round_id', round.id)
        .eq('athlete_id', athleteId);
    } else {
      await supabase.from('round_entries').insert({ round_id: round.id, athlete_id: athleteId });
    }
    refresh();
  };

  const handleDelete = async (id) => {
    await supabase.from('athletes').delete().eq('id', id);
    refresh();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/comp/athlete-control/login');
  };

  return (
    <div className="min-h-screen bg-panel px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-gold uppercase tracking-widest text-xs">Controle de Atletas</p>
            <h1 className="text-2xl font-bold">Cadastro de atletas</h1>
          </div>
          <div className="flex gap-4 items-center text-sm">
            <Link to="/comp/athlete-control/queue" className="text-white/70 hover:text-white">
              Fila
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
          <p className="text-white/40 text-xs mt-2">
            A marcação abaixo mostra quem está inscrito na fase selecionada.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel2 border border-white/10 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 mb-8"
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
            type="number"
            value={form.bib_number}
            onChange={(e) => setForm((f) => ({ ...f, bib_number: e.target.value }))}
            className="px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
          />
          <select
            value={form.state_code}
            onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
            title="Estado do atleta"
            className="px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none text-base sm:text-sm"
          >
            <option value="">Estado</option>
            {STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} - {s.name}
              </option>
            ))}
          </select>
          <input
            placeholder="País"
            maxLength={3}
            value={form.country_code}
            onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))}
            className="px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
          />
          <button
            type="submit"
            disabled={saving || !round}
            className="sm:col-span-6 bg-gold text-panel font-bold py-2 rounded hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Salvando...' : `Adicionar atleta${round ? ` e inscrever em ${round.name}` : ''}`}
          </button>
        </form>

        {loading ? (
          <p className="text-center text-white/60 py-12">Carregando...</p>
        ) : (
          <div className="bg-panel2 border border-white/10 rounded-xl divide-y divide-white/10">
            {athletes.map((a) => {
              const enrolled = enrolledIds.has(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleEnrollment(a.id)}
                    disabled={!round}
                    title={enrolled ? 'Remover desta fase' : 'Inscrever nesta fase'}
                    className={`w-6 h-6 shrink-0 rounded border flex items-center justify-center text-xs font-bold transition ${
                      enrolled
                        ? 'bg-gold border-gold text-panel'
                        : 'border-white/25 text-transparent hover:border-white/50'
                    }`}
                  >
                    ✓
                  </button>
                  <span className="flex-1 truncate">
                    {a.bib_number ? <span className="text-white/40 mr-1">#{a.bib_number}</span> : null}
                    {a.name}
                    {a.state_code ? (
                      <StateFlag uf={a.state_code} className="ml-2" />
                    ) : a.country_code ? (
                      <span className="text-white/40 ml-2 text-sm">{a.country_code}</span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-alert/70 hover:text-alert text-sm"
                  >
                    Remover
                  </button>
                </div>
              );
            })}
            {athletes.length === 0 && (
              <p className="px-4 py-8 text-center text-white/40">Nenhum atleta cadastrado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
