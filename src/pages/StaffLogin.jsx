import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function StaffLogin({ role = 'staff', title = 'STAFF — Arbitragem', redirectTo = '/staff/panel' }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setError('Login ou senha inválidos.');
      return;
    }
    navigate(redirectTo);
  };

  return (
    <div className="min-h-screen bg-panel flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-panel2 border border-white/10 rounded-xl p-8 w-full max-w-sm">
        <p className="text-gold uppercase tracking-widest text-xs mb-1">Acesso restrito</p>
        <h1 className="text-2xl font-bold mb-6">{title}</h1>

        <label className="block text-sm text-white/70 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
        />

        <label className="block text-sm text-white/70 mb-1">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-panel border border-white/20 focus:border-gold outline-none"
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-gold text-panel font-bold py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
