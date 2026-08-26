import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { EVENT_TITLE } from '../lib/event';
import RankingTable from '../components/RankingTable';
import PhaseTabs from '../components/PhaseTabs';

export default function StaffRanking() {
  const { rounds, activeRound, getRound, loading } = useEvent('Boulder');
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
          <p className="text-white/60 text-sm mt-0.5">Staff — Arbitragem · Ranking</p>
        </div>
        <Link to="/comp/staff/panel" className="text-white/70 hover:text-white text-sm">
          Voltar ao painel
        </Link>
      </div>

      <div className="max-w-5xl mx-auto mb-6">
        <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} />
      </div>

      {loading ? (
        <p className="text-center text-white/60">Carregando...</p>
      ) : (
        <RankingTable
          ranking={ranking}
          title={round ? round.name.toUpperCase() : 'RANKING'}
          advanceCount={round?.advance_count ?? null}
        />
      )}
    </div>
  );
}
