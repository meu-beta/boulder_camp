import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { EVENT_TITLE } from '../lib/event';
import RankingTable from '../components/RankingTable';
import PhaseTabs from '../components/PhaseTabs';
import FullscreenButton from '../components/FullscreenButton';
import { useFullscreen } from '../lib/useFullscreen';

export default function PublicRanking() {
  const { category, rounds, activeRound, getRound, loading } = useEvent('Boulder');
  const [roundId, setRoundId] = useState(null);
  const { isFullscreen, toggle, supported } = useFullscreen();

  const boardRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round, ranking } = getRound(roundId);

  // Em tela cheia a tabela é ampliada até o limite do que couber — assim o
  // ranking inteiro aparece de uma vez, do tamanho máximo possível, sem
  // ninguém precisar rolar a página no telão. Fora da tela cheia, escala 1.
  useLayoutEffect(() => {
    if (!isFullscreen) {
      setScale(1);
      return undefined;
    }

    const fit = () => {
      const el = boardRef.current;
      if (!el) return;
      // scrollWidth/Height ignoram o transform, então a medida é estável
      // mesmo depois de já termos aplicado uma escala.
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      if (!w || !h) return;
      const k = Math.min((window.innerWidth * 0.96) / w, (window.innerHeight * 0.88) / h);
      setScale(Math.max(0.4, Math.min(3, k)));
    };

    fit();
    const settle = setTimeout(fit, 250);
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', fit);
    };
  }, [isFullscreen, ranking.length, roundId, loading]);

  return (
    <div className={`min-h-screen bg-panel px-4 ${isFullscreen ? 'py-4' : 'py-8'}`}>
      <div className="max-w-5xl mx-auto flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className={isFullscreen ? 'hidden' : ''}>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gold tracking-tight">
            {EVENT_TITLE}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">Ranking ao vivo — Boulder</p>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <nav
            className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70 ${
              isFullscreen ? 'hidden' : ''
            }`}
          >
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
          {supported && <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />}
        </div>
      </div>

      <div className={`max-w-5xl mx-auto mb-6 ${isFullscreen ? 'hidden' : ''}`}>
        <PhaseTabs rounds={rounds} selectedId={roundId} onSelect={setRoundId} />
      </div>

      {loading ? (
        <p className="text-center text-white/60">Carregando ranking...</p>
      ) : (
        <div
          ref={boardRef}
          className={isFullscreen ? 'origin-top mx-auto w-fit' : ''}
          style={isFullscreen ? { transform: `scale(${scale})` } : undefined}
        >
          {isFullscreen && (
            <h1 className="text-2xl font-extrabold text-gold tracking-tight mb-3 text-center">
              {EVENT_TITLE}
            </h1>
          )}
          <RankingTable
            ranking={ranking}
            title={round ? round.name.toUpperCase() : 'RANKING'}
            advanceCount={round?.advance_count ?? null}
            showStates={category?.show_states ?? false}
          />
        </div>
      )}

      <p className={`text-center text-white/30 text-xs mt-8 ${isFullscreen ? 'hidden' : ''}`}>
        Atualiza automaticamente em tempo real
      </p>
    </div>
  );
}
