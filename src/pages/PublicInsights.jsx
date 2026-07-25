import { Link } from 'react-router-dom';
import { useLiveEvent } from '../lib/useLiveEvent';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-panel2 rounded-lg p-5 border border-white/10">
      <p className="text-white/50 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-gold mt-1">{value}</p>
      {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function PublicInsights() {
  const { ranking, athletes, boulders, scores, loading } = useLiveEvent('Boulder');

  const athletesWithTop = ranking.filter((r) => r.tops > 0).length;
  const totalAttempts = scores.reduce(
    (sum, s) => sum + Math.max(s.top_attempts || 0, s.zone_attempts || 0),
    0
  );
  const leader = ranking[0];

  const boulderStats = boulders
    .map((b) => {
      const bScores = scores.filter((s) => s.boulder_id === b.id);
      const tops = bScores.filter((s) => s.top).length;
      const flashCount = bScores.filter((s) => s.top && s.top_attempts === 1).length;
      return { boulder: b, tops, flashCount, attempts: bScores.length };
    })
    .sort((a, b) => a.boulder.number - b.boulder.number);

  return (
    <div className="min-h-screen bg-panel py-10 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div>
          <p className="text-gold uppercase tracking-widest text-sm">Boulder</p>
          <h1 className="text-2xl font-bold">Insights do evento</h1>
        </div>
        <nav className="flex gap-4 text-sm text-white/70">
          <Link to="/comp" className="hover:text-white">Ranking</Link>
          <Link to="/comp/insights" className="hover:text-white">Insights</Link>
          <Link to="/comp/staff/login" className="hover:text-white">Staff</Link>
          <Link to="/comp/athlete-control/login" className="hover:text-white">Controle</Link>
          <Link to="/" className="hover:text-white text-white/40">Meu Beta</Link>
        </nav>
      </div>

      {loading ? (
        <p className="text-center text-white/60">Carregando...</p>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Atletas" value={athletes.length} />
            <StatCard label="Com Top" value={athletesWithTop} />
            <StatCard label="Tentativas totais" value={totalAttempts} />
            <StatCard label="Líder" value={leader ? leader.athlete.name : '—'} />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Desempenho por boulder</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {boulderStats.map((bs) => (
                <div key={bs.boulder.id} className="bg-panel2 rounded-lg p-4 border border-white/10">
                  <p className="text-gold font-bold">Boulder {bs.boulder.number}</p>
                  <p className="text-white/70 text-sm mt-1">{bs.tops} tops</p>
                  <p className="text-white/50 text-xs">{bs.flashCount} flashes</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
