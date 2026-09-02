import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { EVENT_TITLE } from '../lib/event';
import RankingTable from '../components/RankingTable';
import LeadRankingTable from '../components/LeadRankingTable';
import { disciplineOf } from '../lib/disciplines';
import { GERAL, useModalidade } from '../lib/modalidade';
import PhaseTabs from '../components/PhaseTabs';
import FullscreenButton from '../components/FullscreenButton';
import { useFullscreen } from '../lib/useFullscreen';

// Ritmo do rolamento automático no telão.
const TOP_HOLD_MS = 15000; // parado no topo, evidenciando os primeiros
const BOTTOM_HOLD_MS = 3000; // respiro no último colocado antes do corte
const SCROLL_SPEED = 38; // pixels por segundo — leitura confortável de longe
const BOARD_WIDTH = 1024; // largura de autoria da tabela (max-w-5xl), antes da escala

// A modalidade vem do endereço: /comp/boulder ou /comp/guiada. Cada telão do
// evento fica apontado para a sua, e nunca troca sozinho.
export default function PublicRanking() {
  const mod = useModalidade();
  const { category, rounds, activeRound, getRound, loading } = useEvent(mod.categoryName);
  const discipline = disciplineOf(category);
  const Table = discipline.key === 'lead' ? LeadRankingTable : RankingTable;
  const [roundId, setRoundId] = useState(null);
  const { isFullscreen, toggle, supported } = useFullscreen();

  const viewportRef = useRef(null);
  const boardRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [boardHeight, setBoardHeight] = useState(0);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  // `boulders` são as escaladas da fase — blocos no boulder, vias na guiada.
  const { round, ranking, boulders } = getRound(roundId);

  // ---- Congelamento entre voltas ----
  // O ranking chega ao vivo pelo Realtime: assim que um árbitro salva, as
  // linhas se reordenam. No telão, se isso acontecer no meio da descida, os
  // atletas trocam de lugar debaixo do olho de quem está lendo.
  //
  // Então em tela cheia a tabela mostra uma FOTO do ranking, e a foto só é
  // trocada no corte seco — o instante em que a rolagem volta ao topo e
  // ninguém está acompanhando uma linha específica. A pontuação nova aparece
  // junto com o recomeço da volta.
  //
  // `liveRef` guarda sempre o dado mais recente, sem provocar renderização;
  // é dele que o corte tira a foto nova.
  const liveRef = useRef(ranking);
  liveRef.current = ranking;

  const [frozen, setFrozen] = useState(null);
  const shown = isFullscreen && frozen ? frozen : ranking;

  // Ao entrar em tela cheia congela na hora; ao sair, volta a ser ao vivo.
  useEffect(() => {
    setFrozen(isFullscreen ? liveRef.current : null);
  }, [isFullscreen]);

  // ---- Escala: em tela cheia a tabela é ampliada até preencher a LARGURA ----
  // Antes ela era limitada pela altura e sobrava tela dos dois lados. Agora
  // manda a largura; se ficar mais alta que o monitor, o rolamento resolve.
  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    // offsetWidth/Height são medidas de layout: o transform não as afeta,
    // então continuam corretas mesmo com a escala já aplicada.
    const naturalHeight = board.offsetHeight;
    if (!naturalHeight) return;
    // A largura de autoria é fixa (BOARD_WIDTH), então a escala é previsível:
    // a tabela ampliada ocupa 98% da largura da tela, sobrando 1% de cada lado.
    const k = Math.max(0.5, Math.min(4, (window.innerWidth * 0.98) / BOARD_WIDTH));
    setScale(k);
    setBoardHeight(naturalHeight * k);
  }, []);

  useLayoutEffect(() => {
    if (!isFullscreen) {
      setScale(1);
      setBoardHeight(0);
      return undefined;
    }
    measure();
    const settle = setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', measure);
    };
  }, [isFullscreen, measure, shown.length, roundId, loading]);

  // ---- Rolamento automático, perpétuo ----
  // Ciclo: 15s parado no topo → desce devagar até o último colocado →
  // 3s parado no fim → corte seco de volta ao topo → recomeça, sem parar.
  //
  // É um laço ÚNICO de animação e a fase sai de `elapsed % cicloTotal`.
  // A versão anterior encadeava setTimeout a cada etapa: bastava um elo da
  // corrente se perder para o movimento morrer depois de uma volta. Aqui não
  // há corrente — enquanto o quadro seguinte for pedido, o ciclo se repete.
  //
  // O tempo é acumulado quadro a quadro, com o delta limitado a 100ms. Assim,
  // se o navegador congelar os quadros (aba oculta, protetor de tela, monitor
  // que dormiu), ao voltar o ranking continua de onde parou em vez de dar um
  // salto proporcional ao tempo que ficou fora.
  //
  // Só roda se a tabela for mais alta que a tela; se couber inteira, fica parada.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!isFullscreen || !viewport || !boardHeight) return undefined;

    const distance = boardHeight - viewport.clientHeight;
    if (distance <= 8) {
      viewport.scrollTop = 0;
      return undefined;
    }

    const travelMs = (distance / SCROLL_SPEED) * 1000;
    const cycleMs = TOP_HOLD_MS + travelMs + BOTTOM_HOLD_MS;

    let frame = null;
    let cancelled = false;
    let elapsed = 0;
    let last = performance.now();

    const positionAt = (t) => {
      if (t < TOP_HOLD_MS) return 0;
      if (t < TOP_HOLD_MS + travelMs) return (distance * (t - TOP_HOLD_MS)) / travelMs;
      return distance;
    };

    const loop = (now) => {
      if (cancelled) return;
      const delta = Math.min(now - last, 100);
      last = now;

      const next = elapsed + delta;
      if (next >= cycleMs) {
        // Virou a volta: é aqui, e só aqui, que a pontuação nova entra.
        setFrozen(liveRef.current);
      }
      elapsed = next % cycleMs;

      viewport.scrollTop = positionAt(elapsed);
      frame = requestAnimationFrame(loop);
    };

    viewport.scrollTop = 0;
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      viewport.scrollTop = 0;
    };
  }, [isFullscreen, boardHeight, roundId, shown.length]);

  const board = (
    <div
      ref={boardRef}
      className={isFullscreen ? 'origin-top-left' : ''}
      style={isFullscreen ? { transform: `scale(${scale})`, width: BOARD_WIDTH } : undefined}
    >
      {isFullscreen && (
        <h1 className="text-2xl font-extrabold text-gold tracking-tight mb-3 text-center">
          {EVENT_TITLE}
        </h1>
      )}
      <Table
        ranking={shown}
        title={round ? round.name.toUpperCase() : 'RANKING'}
        advanceCount={round?.advance_count ?? null}
        showStates={category?.show_states ?? false}
        routeCount={boulders.length || null}
      />
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-panel">
        <div className="absolute top-4 right-4 z-20">
          <FullscreenButton isFullscreen onToggle={toggle} />
        </div>
        <div ref={viewportRef} className="h-full w-full overflow-hidden">
          {/* Caixa com a altura JÁ escalada: o transform não ocupa espaço no
              layout, então sem ela o container não teria o que rolar. */}
          <div style={{ height: boardHeight || undefined, paddingLeft: '1vw' }}>{board}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-panel py-8 px-4">
      <div className="max-w-5xl mx-auto flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-extrabold tracking-wide uppercase ${mod.corFaixa} ${mod.corTexto}`}
            >
              {mod.label}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gold tracking-tight">
            {EVENT_TITLE}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">Ranking ao vivo</p>
        </div>

        {/* Nada aqui leva à outra competição: este é o endereço que fica
            projetado no telão o dia inteiro. Para trocar, passa-se pelo hub. */}
        <div className="flex items-center gap-4 ml-auto">
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            <Link to={GERAL.hub} className="hover:text-white">
              Início
            </Link>
            <Link to="/comp/insights" className="hover:text-white">
              Insights
            </Link>
            <Link to="/" className="hover:text-white text-white/40">
              Meu Beta
            </Link>
          </nav>
          {supported && <FullscreenButton isFullscreen={false} onToggle={toggle} />}
        </div>
      </div>

      <div className="max-w-5xl mx-auto mb-6">
        <PhaseTabs
          rounds={rounds}
          selectedId={roundId}
          onSelect={setRoundId}
          abbr={discipline.climb.abbr}
        />
      </div>

      {loading ? <p className="text-center text-white/60">Carregando ranking...</p> : board}

      <p className="text-center text-white/30 text-xs mt-8">
        Atualiza automaticamente em tempo real
      </p>
    </div>
  );
}
