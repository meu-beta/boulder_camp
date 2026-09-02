import { useEffect, useState } from 'react';
import { useEvent } from '../lib/useEvent';
import { useModalidade } from '../lib/modalidade';
import { disciplineOf } from '../lib/disciplines';
import RankingTable from '../components/RankingTable';
import LeadRankingTable from '../components/LeadRankingTable';
import PhaseTabs from '../components/PhaseTabs';
import ModalityBar from '../components/ModalityBar';

// O mesmo ranking do telão, dentro da área do árbitro: serve para conferir o
// que acabou de ser lançado sem sair do celular. Como toda tela desta árvore,
// mostra apenas a competição do endereço.

export default function StaffRanking() {
  const mod = useModalidade();
  const { category, rounds, activeRound, getRound, loading } = useEvent(mod.categoryName);
  const discipline = disciplineOf(category);
  const Tabela = discipline.key === 'lead' ? LeadRankingTable : RankingTable;
  const [roundId, setRoundId] = useState(null);

  useEffect(() => {
    if (!roundId && activeRound) setRoundId(activeRound.id);
  }, [activeRound, roundId]);

  const { round, ranking, boulders } = getRound(roundId);

  return (
    <div className="min-h-screen bg-panel py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <ModalityBar area="staff" atual="ranking" subtitulo="Ranking da competição" />

        <div className="mb-6">
          <PhaseTabs
            rounds={rounds}
            selectedId={roundId}
            onSelect={setRoundId}
            abbr={discipline.climb.abbr}
          />
        </div>

        {loading ? (
          <p className="text-center text-white/60">Carregando...</p>
        ) : (
          <Tabela
            ranking={ranking}
            title={round ? round.name.toUpperCase() : 'RANKING'}
            advanceCount={round?.advance_count ?? null}
            showStates={category?.show_states ?? false}
            routeCount={boulders.length || null}
          />
        )}
      </div>
    </div>
  );
}
