import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { EVENT_TITLE } from '../lib/event';
import RankingTable from '../components/RankingTable';
import PhaseTabs from '../components/PhaseTabs';

export default function PublicRanking() {
  const { category, rounds, activeRound, getRound, loading } = useEvent('Boulder');
  const [roundId, setRoundId] = useState(null);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round, ranking } = getRound(roundId);

  return (
    <div className="min-h-screen bg-panel py-8 px-4">
      <div className="max-w-5xl mx-auto flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gold tracking-tight">
            {EVENT_TITLE}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">Ranking ao vivo — Boulder</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
          <Link to="/comp" className="hover:text-white">
            Ranking
          </Link>
          <Link to="/comp/insights" className="hover:text-white">
            Insights
          </Link>
          <Link to="/comp/staff/login" className="hover:text-white">
            Staff
          </Link>
          <Link to="/comp/athlete-control/login" className="hover:text-white">
            Controle
          </Link>
          <Link to="/" className="hover:text-white text-white/40">
            Meu Beta
          </Link>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto mb-6">
        <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} />
      </div>

      {loading ? (
        <p className="text-center text-white/60">Carregando ranking...</p>
      ) : (
        <RankingTable
          ranking={ranking}
          title={round ? round.name.toUpperCase() : 'RANKING'}
          advanceCount={round?.advance_count ?? null}
          showStates={category?.show_states ?? false}
        />
      )}

      <p className="text-center text-white/30 text-xs mt-8">
        Atualiza automaticamente em tempo real
      </p>
    </div>
  );
}
