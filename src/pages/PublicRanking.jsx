import { Link } from 'react-router-dom';
import { useLiveEvent } from '../lib/useLiveEvent';
import RankingTable from '../components/RankingTable';

export default function PublicRanking() {
  const { ranking, loading } = useLiveEvent('Boulder');

  return (
    <div className="min-h-screen bg-panel py-10 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div>
          <p className="text-gold uppercase tracking-widest text-sm">Boulder</p>
          <h1 className="text-2xl font-bold">Ranking ao vivo</h1>
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
        <p className="text-center text-white/60">Carregando ranking...</p>
      ) : (
        <RankingTable ranking={ranking} title="FINAL" />
      )}
      <p className="text-center text-white/30 text-xs mt-8">
        Atualiza automaticamente em tempo real
      </p>
    </div>
  );
}
