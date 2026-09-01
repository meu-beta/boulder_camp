// ============================================================
// Pontuação e classificação — Guiada (Lead)
// ============================================================
//
// Fonte: Regulamento 2026 CBEscalada, seção Guiada, itens 15.1 a 15.7
// (reproduz os artigos 7.23 e 7.24 da IFSC).
//
// Diferenças que importam em relação ao boulder:
//
//   - O score de uma via é o VALOR NO CROQUI da agarra, definido pelo
//     routesetter. Não é um número sequencial de agarra.
//   - `+` significa agarra USADA, e vale mais que agarra apenas CONTROLADA.
//   - A qualificatória soma COLOCAÇÕES, não pontos: cada via vira um ranking
//     próprio e o total é a média geométrica dos dois.
//   - Quem não larga nas duas vias não é ranqueado. No boulder é o oposto:
//     lá basta encarar um bloco para entrar no ranking.

// 15.5c é ambíguo em português ("falhe em iniciar ambas as vias"). O texto
// original da IFSC (7.23A) exige iniciar AS DUAS para ser ranqueado, e é essa a
// leitura implementada. Trocar esta constante para false muda a regra para
// "só fica de fora quem não largou em nenhuma", sem mexer em mais nada.
export const EXIGE_LARGAR_EM_TODAS_AS_VIAS = true;

/** Arredonda para N casas sem lixo de ponto flutuante. */
function round(n, casas) {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** O atleta largou nesta via? */
export function started(score) {
  return Boolean(score && (score.attempted || score.top || score.hold_value != null));
}

/**
 * Valor comparável de uma via (15.3).
 *
 *   TOP .......................... Infinito
 *   agarra 35 usada  ("35+") ..... 35.5
 *   agarra 35 controlada ("35") .. 35
 *   não largou ................... -1  (fica abaixo de qualquer pontuação)
 */
export function routeValue(score) {
  if (!started(score)) return -1;
  if (score.top) return Infinity;
  const base = Number(score.hold_value) || 0;
  return base + (score.hold_used ? 0.5 : 0);
}

/** Texto do score como o árbitro anota: "TOP", "35+", "35" ou "—". */
export function formatRoute(score) {
  if (!started(score)) return '—';
  if (score.top) return 'TOP';
  const base = Number(score.hold_value) || 0;
  return `${base}${score.hold_used ? '+' : ''}`;
}

/**
 * Ranking de uma via (15.4) e os "pontos de ranking" dela (15.5a).
 *
 * Ordem: (i) todos os TOPs, empatados entre si; (ii) os demais em ordem
 * decrescente de pontuação; (iii) quem não iniciou a via, por último.
 *
 * Empatados recebem a MÉDIA das colocações que o grupo ocupa — é a colocação
 * fracionária. Exemplo do regulamento: três atletas na 7ª posição recebem
 * (7 + 8 + 9) / 3 = 8 pontos cada.
 *
 * @returns Map athlete_id -> { points, value, rank }
 */
export function rankRoute(athletes, scoreOf) {
  const linhas = (athletes || []).map((a) => ({
    id: a.id,
    value: routeValue(scoreOf(a)),
  }));

  // Decrescente por valor. Não-largadores (-1) caem naturalmente para o fim.
  linhas.sort((x, y) => y.value - x.value);

  const out = new Map();
  let i = 0;
  while (i < linhas.length) {
    let j = i;
    while (j + 1 < linhas.length && linhas[j + 1].value === linhas[i].value) j += 1;

    // O grupo ocupa as posições (i+1) até (j+1), em base 1.
    const primeira = i + 1;
    const ultima = j + 1;
    const pontos = (primeira + ultima) / 2;

    for (let k = i; k <= j; k += 1) {
      out.set(linhas[k].id, { points: pontos, value: linhas[k].value, rank: primeira });
    }
    i = j + 1;
  }
  return out;
}

/** Total da qualificatória (15.5b): TP = √(P1 · P2), com 3 casas no cálculo. */
export function qualifyingTotal(p1, p2) {
  return round(Math.sqrt(p1 * p2), 3);
}

/** Exibição oficial do TP (15.5d): 2 casas, vírgula decimal. */
export function formatTotal(value) {
  return Number(value ?? 0).toFixed(2).replace('.', ',');
}

/**
 * Classificação da QUALIFICATÓRIA — 2 vias (15.5).
 *
 * `routes` deve ter exatamente as vias da fase, em ordem.
 * `scoreFor(athlete, route)` devolve a linha de pontuação, ou null.
 *
 * Quem não largou nas duas vias sai do ranking (15.5c) e é devolvido no fim
 * com status 'dns' quando a fase terminou, ou 'pending' enquanto ela corre.
 */
export function computeLeadQualifying({ athletes, routes, scoreFor, roundFinished = false }) {
  const vias = [...(routes || [])].sort((a, b) => a.number - b.number);

  // Ranking de cada via, isoladamente.
  const porVia = vias.map((via) => rankRoute(athletes, (a) => scoreFor(a, via)));

  const linhas = (athletes || []).map((athlete) => {
    const porRota = vias.map((via, idx) => ({
      route: via,
      score: scoreFor(athlete, via) ?? null,
      points: porVia[idx].get(athlete.id)?.points ?? null,
    }));

    const largouEm = porRota.filter((r) => started(r.score)).length;
    const elegivel = EXIGE_LARGAR_EM_TODAS_AS_VIAS
      ? largouEm === vias.length
      : largouEm > 0;

    const pontos = porRota.map((r) => r.points ?? 0);
    const total = elegivel ? qualifyingTotal(pontos[0] ?? 0, pontos[1] ?? pontos[0] ?? 0) : null;

    return { athlete, byRoute: porRota, total, eligible: elegivel };
  });

  const ranqueados = linhas.filter((l) => l.eligible).sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total; // ascendente: menor é melhor
    return a.athlete.name.localeCompare(b.athlete.name, 'pt-BR');
  });

  // Mesmo total = mesma colocação.
  let ultima = 0;
  const comRank = ranqueados.map((linha, idx) => {
    if (idx > 0 && linha.total === ranqueados[idx - 1].total) {
      return { ...linha, rank: ultima, status: 'ranked' };
    }
    ultima = idx + 1;
    return { ...linha, rank: ultima, status: 'ranked' };
  });

  const fora = linhas
    .filter((l) => !l.eligible)
    .sort((a, b) => (a.athlete.bib_number ?? 9999) - (b.athlete.bib_number ?? 9999))
    .map((l) => ({ ...l, rank: null, status: roundFinished ? 'dns' : 'pending' }));

  return [...comRank, ...fora];
}

/**
 * Classificação de SEMIFINAL ou FINAL — 1 via (15.6).
 *
 * Desempates, na ordem:
 *   i.  colocação na rodada anterior (`previousRanks`). Na semifinal esse
 *       critério não se aplica se a qualificatória teve dois grupos (15.6a) —
 *       nesse caso passe `previousRanks = null`.
 *   ii. só na FINAL e só entre as três primeiras colocações: menor tempo
 *       total da tentativa (15.6b).
 */
export function computeLeadSingleRoute({
  athletes,
  route,
  scoreFor,
  previousRanks = null,
  isFinal = false,
  roundFinished = false,
}) {
  const linhas = (athletes || []).map((athlete) => {
    const score = scoreFor(athlete, route) ?? null;
    return {
      athlete,
      byRoute: [{ route, score, points: null }],
      score,
      value: routeValue(score),
      time: score?.time_seconds ?? null,
      started: started(score),
    };
  });

  const anterior = (linha) => {
    if (!previousRanks) return null;
    const r = previousRanks.get(linha.athlete.id);
    return typeof r === 'number' ? r : null;
  };

  const ranqueados = linhas.filter((l) => l.started);
  const fora = linhas
    .filter((l) => !l.started)
    .sort((a, b) => (a.athlete.bib_number ?? 9999) - (b.athlete.bib_number ?? 9999));

  ranqueados.sort((a, b) => {
    if (a.value !== b.value) return b.value - a.value; // maior valor primeiro

    const pa = anterior(a);
    const pb = anterior(b);
    if (pa !== null && pb !== null && pa !== pb) return pa - pb;

    return a.athlete.name.localeCompare(b.athlete.name, 'pt-BR');
  });

  // Colocação provisória, com empates compartilhando a posição.
  const mesmoNivel = (a, b) => a.value === b.value && anterior(a) === anterior(b);
  let ultima = 0;
  let comRank = ranqueados.map((linha, idx) => {
    if (idx > 0 && mesmoNivel(linha, ranqueados[idx - 1])) {
      return { ...linha, rank: ultima, status: 'ranked' };
    }
    ultima = idx + 1;
    return { ...linha, rank: ultima, status: 'ranked' };
  });

  // 15.6b(ii): na final, empate nas três primeiras é desfeito pelo tempo.
  if (isFinal) {
    comRank = desempatarPorTempoNoPodio(comRank);
  }

  return [
    ...comRank,
    ...fora.map((l) => ({ ...l, rank: null, status: roundFinished ? 'dns' : 'pending' })),
  ];
}

/**
 * Aplica o tempo como desempate apenas entre atletas empatados cuja colocação
 * esteja nas três primeiras (15.6b ii). Menor tempo fica à frente. Quem não tem
 * tempo registrado permanece atrás de quem tem.
 */
function desempatarPorTempoNoPodio(linhas) {
  const out = [...linhas];
  let i = 0;
  while (i < out.length) {
    let j = i;
    while (j + 1 < out.length && out[j + 1].rank === out[i].rank) j += 1;

    const empatados = j - i + 1;
    const dentroDoPodio = out[i].rank <= 3;

    if (empatados > 1 && dentroDoPodio) {
      const grupo = out.slice(i, j + 1).sort((a, b) => {
        const ta = a.time ?? Infinity;
        const tb = b.time ?? Infinity;
        if (ta !== tb) return ta - tb;
        return a.athlete.name.localeCompare(b.athlete.name, 'pt-BR');
      });
      // Só reordena e reatribui colocação se o tempo realmente separou.
      const separou = grupo.some((l, k) => k > 0 && (l.time ?? Infinity) !== (grupo[k - 1].time ?? Infinity));
      grupo.forEach((linha, k) => {
        out[i + k] = separou ? { ...linha, rank: out[i].rank + k } : linha;
      });
    }
    i = j + 1;
  }
  return out;
}

/** Map athlete_id -> colocação, para alimentar o desempate da fase seguinte. */
export function ranksFrom(ranking) {
  const map = new Map();
  (ranking || []).forEach((row) => {
    if (row.rank) map.set(row.athlete.id, row.rank);
  });
  return map;
}

/**
 * RANKING GERAL do campeonato (15.7).
 *
 * Por fase alcançada: primeiro quem tem colocação na final, na ordem em que
 * terminaram a final; depois quem tem colocação na semifinal; por fim quem tem
 * apenas colocação na qualificatória. Cada atleta aparece uma única vez, na
 * fase mais avançada em que foi ranqueado.
 */
export function computeOverallRanking({ finalRanking, semiRanking, qualifyingRanking }) {
  const vistos = new Set();
  const saida = [];

  const acrescentar = (ranking, fase) => {
    (ranking || [])
      .filter((r) => r.status === 'ranked' && r.rank)
      .sort((a, b) => a.rank - b.rank)
      .forEach((r) => {
        if (vistos.has(r.athlete.id)) return;
        vistos.add(r.athlete.id);
        saida.push({ athlete: r.athlete, phase: fase, phaseRank: r.rank, rank: saida.length + 1 });
      });
  };

  acrescentar(finalRanking, 'final');
  acrescentar(semiRanking, 'semi');
  acrescentar(qualifyingRanking, 'qualificatoria');

  return saida;
}
