import { Link } from 'react-router-dom';
import { useLiveEvent } from '../lib/useLiveEvent';
import RankingTable from '../components/RankingTable';

export default function StaffRanking() {
  const { ranking, loading } = useLiveEvent('Boulder');

  return (
    <div className="min-h-screen bg-panel py-8 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div>
          <p className="text-gold uppercase tracking-widest text-xs">Staff — Arbitragem</p>
          <h1 className="text-2xl font-bold">Ranking</h1>
        </div>
        <Link to="/staff/panel" className="text-white/70 hover:text-white text-sm">
          Voltar ao painel
        </Link>
      </div>
      {loading ? (
        <p className="text-center text-white/60">Carregando...</p>
      ) : (
        <RankingTable ranking={ranking} title="RANKING" />
      )}
    </div>
  );
}
