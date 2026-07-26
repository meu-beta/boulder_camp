// ============================================================
// Pontuação e classificação — formato IFSC
// ============================================================
//
// Pontuação de um boulder:
//   a) Zona controlada .... 10 pontos, -0.1 por tentativa feita ANTES da zona
//   b) Top confirmado ..... 25 pontos, -0.1 por tentativa feita ANTES do top
//
// A nota do boulder é a MAIOR entre (a), (b) e 0. Nunca é negativa.
//
// Exemplos:
//   Top na 1ª tentativa (flash) ....... 25.0
//   Top na 4ª tentativa ............... 24.7   (25 - 0.3)
//   Zona na 1ª, sem top ............... 10.0
//   Zona na 3ª, sem top ...............  9.8   (10 - 0.2)
//   Só tentativas, sem zona ...........  0.0

export const ZONE_POINTS = 10;
export const TOP_POINTS = 25;
export const ATTEMPT_PENALTY = 0.1;

/** Arredonda para 1 casa decimal, evitando lixo de ponto flutuante. */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Nota de um único boulder a partir da linha de `scores`. */
export function boulderScore(score) {
  if (!score) return 0;

  const zoneValue = score.zone
    ? ZONE_POINTS - ATTEMPT_PENALTY * Math.max(0, (score.zone_attempts || 1) - 1)
    : 0;

  const topValue = score.top
    ? TOP_POINTS - ATTEMPT_PENALTY * Math.max(0, (score.top_attempts || 1) - 1)
    : 0;

  return round1(Math.max(zoneValue, topValue, 0));
}

/**
 * Monta o resumo de um atleta em uma fase.
 * `boulders` precisa vir ordenado por número — o primeiro define o DNS.
 *
 * Estados possíveis:
 *   'ranked'  — fez ao menos uma tentativa no primeiro boulder, entra no ranking
 *   'pending' — ainda não escalou o primeiro boulder e a fase não terminou
 *   'dns'     — a fase terminou e ele nunca tentou o primeiro boulder
 */
function summarize(athlete, boulders, scoresByBoulder) {
  let total = 0;
  let tops = 0;
  let zones = 0;
  let topAttempts = 0;
  let zoneAttempts = 0;
  let totalAttempts = 0;

  const byBoulder = {};

  boulders.forEach((boulder) => {
    const score = scoresByBoulder.get(boulder.id) || null;
    const value = boulderScore(score);

    byBoulder[boulder.id] = { score, value };
    total += value;

    if (score) {
      totalAttempts += score.attempts || 0;
      if (score.top) {
        tops += 1;
        topAttempts += score.top_attempts || 0;
      }
      if (score.zone) {
        zones += 1;
        zoneAttempts += score.zone_attempts || 0;
      }
    }
  });

  // O primeiro boulder da fase decide se o atleta iniciou a rodada.
  const firstBoulder = boulders[0];
  const firstScore = firstBoulder ? scoresByBoulder.get(firstBoulder.id) : null;
  const started = Boolean(firstScore && (firstScore.attempts || 0) > 0);

  return {
    athlete,
    boulderIds: boulders.map((b) => b.id),
    byBoulder,
    total: round1(total),
    tops,
    zones,
    topAttempts,
    zoneAttempts,
    totalAttempts,
    started,
  };
}

/**
 * Classificação de uma fase.
 *
 * Desempate, na ordem:
 *   i.   melhor colocação na fase anterior (quando houver)
 *   ii.  menor número total de tentativas para os tops conquistados
 *   iii. menor número total de tentativas para as zonas conquistadas
 *
 * `previousRanks` é um Map athlete_id -> colocação na fase anterior.
 * Passe `null` quando a fase anterior tiver sido dividida em mais de um
 * grupo (nesse caso o critério (i) não se aplica).
 *
 * `roundFinished` controla o rótulo de quem não iniciou: durante a fase
 * eles ficam como 'pending' (ainda vão escalar); com a fase encerrada
 * viram 'dns'.
 */
export function computeRanking({
  athletes,
  boulders,
  scores,
  previousRanks = null,
  roundFinished = false,
}) {
  const orderedBoulders = [...(boulders || [])].sort((a, b) => a.number - b.number);
  const boulderIds = new Set(orderedBoulders.map((b) => b.id));

  // Agrupa as pontuações por atleta, considerando só os boulders desta fase.
  const scoresByAthlete = new Map();
  (scores || []).forEach((s) => {
    if (!boulderIds.has(s.boulder_id)) return;
    if (!scoresByAthlete.has(s.athlete_id)) scoresByAthlete.set(s.athlete_id, new Map());
    scoresByAthlete.get(s.athlete_id).set(s.boulder_id, s);
  });

  const rows = (athletes || []).map((athlete) =>
    summarize(athlete, orderedBoulders, scoresByAthlete.get(athlete.id) || new Map())
  );

  const ranked = rows.filter((r) => r.started);
  const notStarted = rows
    .filter((r) => !r.started)
    .sort((a, b) => {
      const bibA = a.athlete.bib_number ?? Infinity;
      const bibB = b.athlete.bib_number ?? Infinity;
      if (bibA !== bibB) return bibA - bibB;
      return a.athlete.name.localeCompare(b.athlete.name, 'pt-BR');
    });

  const prevRankOf = (row) => {
    if (!previousRanks) return null;
    const rank = previousRanks.get(row.athlete.id);
    return typeof rank === 'number' ? rank : null;
  };

  ranked.sort((a, b) => {
    // 1) mais pontos primeiro
    if (b.total !== a.total) return b.total - a.total;

    // i) colocação na fase anterior (menor é melhor)
    const prevA = prevRankOf(a);
    const prevB = prevRankOf(b);
    if (prevA !== null && prevB !== null && prevA !== prevB) return prevA - prevB;

    // ii) menos tentativas para os tops
    if (a.topAttempts !== b.topAttempts) return a.topAttempts - b.topAttempts;

    // iii) menos tentativas para as zonas
    if (a.zoneAttempts !== b.zoneAttempts) return a.zoneAttempts - b.zoneAttempts;

    return a.athlete.name.localeCompare(b.athlete.name, 'pt-BR');
  });

  // Atletas empatados em todos os critérios dividem a mesma colocação.
  const sameRank = (a, b) =>
    a.total === b.total &&
    a.topAttempts === b.topAttempts &&
    a.zoneAttempts === b.zoneAttempts &&
    prevRankOf(a) === prevRankOf(b);

  let lastRank = 0;
  const withRank = ranked.map((row, index) => {
    if (index > 0 && sameRank(row, ranked[index - 1])) {
      return { ...row, rank: lastRank, status: 'ranked' };
    }
    lastRank = index + 1;
    return { ...row, rank: lastRank, status: 'ranked' };
  });

  const trailing = notStarted.map((row) => ({
    ...row,
    rank: null,
    status: roundFinished ? 'dns' : 'pending',
  }));

  return [...withRank, ...trailing];
}

/** Map athlete_id -> colocação, para alimentar o desempate da fase seguinte. */
export function ranksFrom(ranking) {
  const map = new Map();
  (ranking || []).forEach((row) => {
    if (row.rank) map.set(row.athlete.id, row.rank);
  });
  return map;
}

/** Formata a nota para exibição (uma casa decimal, vírgula). */
export function formatScore(value) {
  return Number(value || 0).toFixed(1).replace('.', ',');
}
