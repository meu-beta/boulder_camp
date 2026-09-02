// ============================================================
// Seletor de modalidade
// ============================================================
//
// A modalidade é um eixo do sistema, não um sistema paralelo. Tudo em volta
// da pontuação — fases, fila, cronômetro, projeção, tempo real — é comum às
// duas. O que muda é o miolo do cálculo e os rótulos.
//
// Este arquivo é o ÚNICO lugar que sabe que existe mais de uma modalidade.
// Quem consome pergunta `disciplineOf(category)` e recebe tudo pronto.
//
// Regra de segurança: o caminho do boulder aqui é um adaptador fino sobre o
// `scoring.js` que já roda em produção. `scoring.js` não é tocado.

import {
  computeRanking as computeBoulder,
  ranksFrom as boulderRanks,
  formatScore as formatBoulderTotal,
} from './scoring.js';
import {
  computeLeadQualifying,
  computeLeadSingleRoute,
  ranksFrom as leadRanks,
  formatTotal as formatLeadTotal,
} from './scoringLead.js';

const BOULDER = {
  key: 'boulder',
  label: 'Boulder',
  // Como se chama cada escalada da fase, nesta modalidade.
  climb: { one: 'Boulder', many: 'Boulders', abbr: 'B' },
  ranksFrom: boulderRanks,
  // Como o total de uma fase é escrito na tela. No boulder é pontuação (maior
  // é melhor); na guiada é o TP da qualificatória (menor é melhor).
  formatTotal: formatBoulderTotal,

  computeRanking({ athletes, climbs, scores, previousRanks, round }) {
    return computeBoulder({
      athletes,
      boulders: climbs,
      scores,
      previousRanks,
      roundFinished: round?.is_finished ?? false,
    });
  },
};

const LEAD = {
  key: 'lead',
  label: 'Guiada',
  climb: { one: 'Via', many: 'Vias', abbr: 'V' },
  ranksFrom: leadRanks,
  formatTotal: formatLeadTotal,

  // A Guiada tem dois cálculos distintos, escolhidos pelo número de vias:
  //   2 vias  -> qualificatória, com TP = raiz(P1 * P2)   (15.5)
  //   1 via   -> semifinal ou final, ordenação direta      (15.6)
  computeRanking({ athletes, climbs, scores, previousRanks, round, isFinal, previousTwoGroups }) {
    const vias = [...(climbs || [])].sort((a, b) => a.number - b.number);

    // Índice (atleta, via) -> pontuação, montado uma vez por fase.
    const porChave = new Map();
    (scores || []).forEach((s) => porChave.set(`${s.athlete_id}:${s.boulder_id}`, s));
    const scoreFor = (athlete, via) => porChave.get(`${athlete.id}:${via.id}`) ?? null;

    if (vias.length >= 2) {
      return computeLeadQualifying({
        athletes,
        routes: vias,
        scoreFor,
        roundFinished: round?.is_finished ?? false,
      });
    }

    // 15.6a: com a qualificatória em dois grupos, o desempate pela colocação
    // anterior não se aplica.
    return computeLeadSingleRoute({
      athletes,
      route: vias[0] ?? null,
      scoreFor,
      previousRanks: previousTwoGroups ? null : previousRanks,
      isFinal,
      roundFinished: round?.is_finished ?? false,
    });
  },
};

export const DISCIPLINES = { boulder: BOULDER, lead: LEAD };

/** A modalidade de uma categoria. Sem categoria, assume boulder. */
export function disciplineOf(category) {
  return DISCIPLINES[category?.discipline] ?? BOULDER;
}

/** Nome da categoria a partir da chave da modalidade, para o useEvent. */
export const CATEGORY_NAME = { boulder: 'Boulder', lead: 'Lead' };
