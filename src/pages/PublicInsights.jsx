import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { EVENT_TITLE } from '../lib/event';
import PhaseTabs from '../components/PhaseTabs';
import { attemptsOf, boulderScore, formatScore, participated } from '../lib/scoring';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-panel2 rounded-lg p-5 border border-white/10">
      <p className="text-white/50 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-gold mt-1 truncate">{value}</p>
      {sub ? <p className="text-white/40 text-xs mt-1">{sub}</p> : null}
    </div>
  );
}

export default function PublicInsights() {
  const { rounds, activeRound, getRound, loading } = useEvent('Boulder');
  const [roundId, setRoundId] = useState(null);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round, boulders, ranking, scores } = getRound(roundId);

  const started = ranking.filter((r) => r.status === 'ranked');
  const withTop = started.filter((r) => r.tops > 0).length;
  const totalAttempts = scores.reduce((sum, s) => sum + attemptsOf(s), 0);
  const leader = started[0] ?? null;

  const boulderStats = boulders.map((boulder) => {
    const rows = scores.filter((s) => s.boulder_id === boulder.id);
    const tops = rows.filter((s) => s.top).length;
    const zones = rows.filter((s) => s.zone && !s.top).length;
    const flashes = rows.filter((s) => s.top && s.top_attempts === 1).length;
    const climbed = rows.filter((s) => participated(s));
    const average =
      climbed.length > 0
        ? climbed.reduce((sum, s) => sum + boulderScore(s), 0) / climbed.length
        : 0;
    return { boulder, tops, zones, flashes, climbed: climbed.length, average };
  });

  return (
    <div className="min-h-screen bg-panel py-8 px-4">
      <div className="max-w-5xl mx-auto flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gold tracking-tight">
            {EVENT_TITLE}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">Insights do evento — Boulder</p>
        </div>
        <nav className="flex gap-4 text-sm text-white/70">
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
        <p className="text-center text-white/60">Carregando...</p>
      ) : (
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Em disputa"
              value={started.length}
              sub={`de ${ranking.length} inscritos`}
            />
            <StatCard label="Com Top" value={withTop} />
            <StatCard label="Tentativas" value={totalAttempts} sub="somadas na fase" />
            <StatCard
              label="Líder"
              value={leader ? leader.athlete.name.split(' ')[0] : '—'}
              sub={leader ? `${formatScore(leader.total)} pts` : undefined}
            />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">
              Desempenho por boulder{round ? ` — ${round.name}` : ''}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {boulderStats.map((stat) => (
                <div
                  key={stat.boulder.id}
                  className="bg-panel2 rounded-lg p-4 border border-white/10"
                >
                  <p className="text-gold font-bold">Boulder {stat.boulder.number}</p>
                  <p className="text-2xl font-extrabold mt-1 tabular-nums">
                    {formatScore(stat.average)}
                  </p>
                  <p className="text-white/40 text-xs">média de quem escalou</p>
                  <div className="mt-3 space-y-0.5 text-xs text-white/60">
                    <p>
                      {stat.tops} top(s), {stat.flashes} flash(es)
                    </p>
                    <p>{stat.zones} só zona</p>
                    <p className="text-white/30">{stat.climbed} escalaram</p>
                  </div>
                </div>
              ))}
              {boulderStats.length === 0 && (
                <p className="text-white/40 col-span-full">Nenhum boulder nesta fase.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
