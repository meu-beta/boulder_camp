// Testes do módulo de pontuação da Guiada.
// Os casos vêm do Regulamento 2026 CBEscalada, seção Guiada.
//
//   node tests/scoringLead.test.mjs

import {
  routeValue,
  formatRoute,
  rankRoute,
  qualifyingTotal,
  formatTotal,
  computeLeadQualifying,
  computeLeadSingleRoute,
  computeOverallRanking,
  ranksFrom,
} from '../src/lib/scoringLead.js';

let passou = 0;
let falhou = 0;

function ok(nome, real, esperado) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhou += 1;
    console.log(`  FALHA ${nome}\n        esperado ${b}\n        obtido   ${a}`);
  }
}

const atleta = (id, name, bib) => ({ id, name, bib_number: bib });

// ------------------------------------------------------------------
console.log('\n15.3 — valor da via: TOP > usada (+) > controlada');
// ------------------------------------------------------------------
ok('TOP é o maior', routeValue({ attempted: true, top: true }) === Infinity, true);
ok('35+ vale 35.5', routeValue({ attempted: true, hold_value: 35, hold_used: true }), 35.5);
ok('35 vale 35', routeValue({ attempted: true, hold_value: 35 }), 35);
ok('35+ > 35', routeValue({ attempted: true, hold_value: 35, hold_used: true }) >
  routeValue({ attempted: true, hold_value: 35 }), true);
ok('36 > 35+', routeValue({ attempted: true, hold_value: 36 }) >
  routeValue({ attempted: true, hold_value: 35, hold_used: true }), true);
ok('não largou fica abaixo de tudo', routeValue(null), -1);
ok('texto de 35+', formatRoute({ attempted: true, hold_value: 35, hold_used: true }), '35+');
ok('texto de TOP', formatRoute({ attempted: true, top: true }), 'TOP');
ok('texto de quem não largou', formatRoute(null), '—');

// ------------------------------------------------------------------
console.log('\n15.5a — colocação fracionária: exemplo do regulamento (7/8/9 → 8)');
// ------------------------------------------------------------------
{
  // 6 atletas à frente, depois 3 empatados, ocupando as posições 7, 8 e 9.
  const atletas = [];
  const scores = new Map();
  for (let i = 1; i <= 6; i += 1) {
    atletas.push(atleta(`a${i}`, `A${i}`, i));
    scores.set(`a${i}`, { attempted: true, hold_value: 50 - i }); // 49,48,47,46,45,44
  }
  for (let i = 7; i <= 9; i += 1) {
    atletas.push(atleta(`a${i}`, `A${i}`, i));
    scores.set(`a${i}`, { attempted: true, hold_value: 30 }); // empatados
  }
  const r = rankRoute(atletas, (a) => scores.get(a.id));
  ok('os três empatados recebem 8 pontos', [r.get('a7').points, r.get('a8').points, r.get('a9').points], [8, 8, 8]);
  ok('o 1º recebe 1 ponto', r.get('a1').points, 1);
  ok('o 6º recebe 6 pontos', r.get('a6').points, 6);
}

// ------------------------------------------------------------------
console.log('\n15.4 — ranking da via: TOPs primeiro, não-largadores por último');
// ------------------------------------------------------------------
{
  const atletas = [atleta('t1', 'Top1', 1), atleta('t2', 'Top2', 2), atleta('m', 'Meio', 3), atleta('n', 'NaoLargou', 4)];
  const scores = new Map([
    ['t1', { attempted: true, top: true }],
    ['t2', { attempted: true, top: true }],
    ['m', { attempted: true, hold_value: 40, hold_used: true }],
    ['n', null],
  ]);
  const r = rankRoute(atletas, (a) => scores.get(a.id));
  ok('os dois TOPs empatam em 1º e recebem 1.5', [r.get('t1').points, r.get('t2').points], [1.5, 1.5]);
  ok('quem escalou vem depois dos TOPs', r.get('m').points, 3);
  ok('quem não largou fica por último', r.get('n').points, 4);
}

// ------------------------------------------------------------------
console.log('\n15.5b — TP = √(P1 · P2), 3 casas no cálculo e 2 na exibição');
// ------------------------------------------------------------------
ok('√(1 · 4) = 2', qualifyingTotal(1, 4), 2);
ok('√(2 · 8) = 4', qualifyingTotal(2, 8), 4);
ok('√(3 · 5) ≈ 3.873', qualifyingTotal(3, 5), 3.873);
ok('√(8 · 8) = 8', qualifyingTotal(8, 8), 8);
ok('exibição com 2 casas e vírgula', formatTotal(3.873), '3,87');

// ------------------------------------------------------------------
console.log('\n15.5 — classificação da qualificatória com 2 vias');
// ------------------------------------------------------------------
{
  const via1 = { id: 'v1', number: 1 };
  const via2 = { id: 'v2', number: 2 };
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2), atleta('c', 'Caio', 3)];

  // Ana: 1º na via 1, 2º na via 2  -> √(1·2) = 1.414
  // Bruno: 2º na via 1, 1º na via 2 -> √(2·1) = 1.414  (empate com Ana)
  // Caio: 3º nas duas               -> √(3·3) = 3
  const tabela = {
    a: { v1: { attempted: true, hold_value: 50 }, v2: { attempted: true, hold_value: 40 } },
    b: { v1: { attempted: true, hold_value: 45 }, v2: { attempted: true, hold_value: 42 } },
    c: { v1: { attempted: true, hold_value: 30 }, v2: { attempted: true, hold_value: 30 } },
  };
  const scoreFor = (at, via) => tabela[at.id][via.id];

  const rank = computeLeadQualifying({ athletes: atletas, routes: [via1, via2], scoreFor });
  ok('Ana e Bruno empatam com 1.414', [rank[0].total, rank[1].total], [1.414, 1.414]);
  ok('empate divide a mesma colocação', [rank[0].rank, rank[1].rank], [1, 1]);
  ok('Caio fica em 3º com TP 3', [rank[2].rank, rank[2].total], [3, 3]);
  ok('menor TP fica na frente', rank[0].total < rank[2].total, true);
}

// ------------------------------------------------------------------
console.log('\n15.5c — quem não largou nas DUAS vias não é ranqueado');
// ------------------------------------------------------------------
{
  const via1 = { id: 'v1', number: 1 };
  const via2 = { id: 'v2', number: 2 };
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2)];
  const tabela = {
    a: { v1: { attempted: true, hold_value: 50 }, v2: { attempted: true, hold_value: 40 } },
    b: { v1: { attempted: true, hold_value: 45 }, v2: null }, // largou só na via 1
  };
  const rank = computeLeadQualifying({
    athletes: atletas,
    routes: [via1, via2],
    scoreFor: (at, via) => tabela[at.id][via.id],
    roundFinished: true,
  });
  ok('Ana é ranqueada', [rank[0].athlete.id, rank[0].status], ['a', 'ranked']);
  ok('Bruno sai do ranking como DNS', [rank[1].athlete.id, rank[1].status, rank[1].rank], ['b', 'dns', null]);
  ok('e Bruno não recebe total', rank[1].total, null);
}

// ------------------------------------------------------------------
console.log('\n15.6a — semifinal: empate resolvido pela qualificatória');
// ------------------------------------------------------------------
{
  const via = { id: 's1', number: 1 };
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2)];
  const scores = { a: { attempted: true, hold_value: 40 }, b: { attempted: true, hold_value: 40 } };
  const scoreFor = (at) => scores[at.id];

  const comCountback = computeLeadSingleRoute({
    athletes: atletas,
    route: via,
    scoreFor,
    previousRanks: new Map([['a', 5], ['b', 2]]), // Bruno foi melhor na qualificatória
  });
  ok('Bruno passa à frente pelo count-back', comCountback.map((r) => r.athlete.id), ['b', 'a']);
  ok('e as colocações são 1 e 2', comCountback.map((r) => r.rank), [1, 2]);

  // Com qualificatória em dois grupos o critério não se aplica (previousRanks = null)
  const semCountback = computeLeadSingleRoute({ athletes: atletas, route: via, scoreFor, previousRanks: null });
  ok('com dois grupos, permanecem empatados em 1º', semCountback.map((r) => r.rank), [1, 1]);
}

// ------------------------------------------------------------------
console.log('\n15.6b — final: tempo desempata apenas nas três primeiras');
// ------------------------------------------------------------------
{
  const via = { id: 'f1', number: 1 };
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2)];
  const scores = {
    a: { attempted: true, hold_value: 40, time_seconds: 250 },
    b: { attempted: true, hold_value: 40, time_seconds: 180 }, // mais rápido
  };
  const podio = computeLeadSingleRoute({
    athletes: atletas,
    route: via,
    scoreFor: (at) => scores[at.id],
    previousRanks: null,
    isFinal: true,
  });
  ok('o mais rápido fica à frente no pódio', podio.map((r) => r.athlete.id), ['b', 'a']);
  ok('e o empate é desfeito', podio.map((r) => r.rank), [1, 2]);

  // Mesmo empate, mas fora das três primeiras colocações: o tempo NÃO se aplica.
  const muitos = [];
  const tab = {};
  for (let i = 1; i <= 3; i += 1) {
    muitos.push(atleta(`p${i}`, `P${i}`, i));
    tab[`p${i}`] = { attempted: true, hold_value: 60 - i, time_seconds: 100 };
  }
  muitos.push(atleta('x', 'Xis', 8), atleta('y', 'Ypsilon', 9));
  tab.x = { attempted: true, hold_value: 20, time_seconds: 300 };
  tab.y = { attempted: true, hold_value: 20, time_seconds: 100 }; // mais rápido, mas em 4º
  const fora = computeLeadSingleRoute({
    athletes: muitos,
    route: via,
    scoreFor: (at) => tab[at.id],
    previousRanks: null,
    isFinal: true,
  });
  const empatadosNoFim = fora.filter((r) => r.rank === 4);
  ok('empate fora do pódio permanece empatado', empatadosNoFim.length, 2);
}

// ------------------------------------------------------------------
console.log('\n15.7 — Ranking Geral por fase alcançada');
// ------------------------------------------------------------------
{
  const A = atleta('a', 'Ana', 1);
  const B = atleta('b', 'Bruno', 2);
  const C = atleta('c', 'Caio', 3);
  const D = atleta('d', 'Duda', 4);

  const finalR = [
    { athlete: B, rank: 1, status: 'ranked' },
    { athlete: A, rank: 2, status: 'ranked' },
  ];
  const semiR = [
    { athlete: A, rank: 1, status: 'ranked' },
    { athlete: B, rank: 2, status: 'ranked' },
    { athlete: C, rank: 3, status: 'ranked' },
  ];
  const qualiR = [
    { athlete: C, rank: 1, status: 'ranked' },
    { athlete: D, rank: 2, status: 'ranked' },
    { athlete: A, rank: 3, status: 'ranked' },
  ];

  const geral = computeOverallRanking({ finalRanking: finalR, semiRanking: semiR, qualifyingRanking: qualiR });
  ok('ordem geral: finalistas, depois semi, depois quali', geral.map((r) => r.athlete.id), ['b', 'a', 'c', 'd']);
  ok('cada atleta aparece uma vez só', new Set(geral.map((r) => r.athlete.id)).size, 4);
  ok('a fase de cada um', geral.map((r) => r.phase), ['final', 'final', 'semi', 'qualificatoria']);
  ok('colocações finais 1..4', geral.map((r) => r.rank), [1, 2, 3, 4]);
}

// ------------------------------------------------------------------
console.log('\nranksFrom — alimenta o desempate da fase seguinte');
// ------------------------------------------------------------------
{
  const m = ranksFrom([
    { athlete: { id: 'a' }, rank: 1 },
    { athlete: { id: 'b' }, rank: null },
  ]);
  ok('só entram os ranqueados', [m.get('a'), m.has('b')], [1, false]);
}

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
