// Garante que o seletor de modalidade não mudou o comportamento do boulder,
// e que a Guiada é despachada para o cálculo certo conforme o número de vias.
//
//   node tests/disciplines.test.mjs

import { disciplineOf, DISCIPLINES } from '../src/lib/disciplines.js';
import { computeRanking as boulderDireto } from '../src/lib/scoring.js';

let passou = 0;
let falhou = 0;
const ok = (nome, real, esperado) => {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhou += 1;
    console.log(`  FALHA ${nome}\n        esperado ${b}\n        obtido   ${a}`);
  }
};

const atleta = (id, name, bib) => ({ id, name, bib_number: bib });

console.log('\nseleção da modalidade');
ok('categoria boulder', disciplineOf({ discipline: 'boulder' }).key, 'boulder');
ok('categoria lead', disciplineOf({ discipline: 'lead' }).key, 'lead');
ok('sem categoria cai em boulder', disciplineOf(null).key, 'boulder');
ok('modalidade desconhecida cai em boulder', disciplineOf({ discipline: 'xxx' }).key, 'boulder');
ok('rótulo da escalada no boulder', DISCIPLINES.boulder.climb.one, 'Boulder');
ok('rótulo da escalada na guiada', DISCIPLINES.lead.climb.one, 'Via');

console.log('\nboulder pelo seletor = boulder direto (sem regressão)');
{
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2), atleta('c', 'Caio', 3)];
  const blocos = [
    { id: 'b1', number: 1 },
    { id: 'b2', number: 2 },
  ];
  const scores = [
    { athlete_id: 'a', boulder_id: 'b1', attempted: true, top: true, top_attempts: 1, zone: true, zone_attempts: 1 },
    { athlete_id: 'a', boulder_id: 'b2', attempted: true, zone: true, zone_attempts: 3 },
    { athlete_id: 'b', boulder_id: 'b1', attempted: true, zone: true, zone_attempts: 2 },
    { athlete_id: 'b', boulder_id: 'b2', attempted: true, top: true, top_attempts: 4, zone: true, zone_attempts: 2 },
    // Caio não encarou nada
  ];
  const round = { id: 'r1', is_finished: true };

  const direto = boulderDireto({
    athletes: atletas,
    boulders: blocos,
    scores,
    previousRanks: null,
    roundFinished: true,
  });

  const peloSeletor = disciplineOf({ discipline: 'boulder' }).computeRanking({
    athletes: atletas,
    climbs: blocos,
    scores,
    previousRanks: null,
    round,
    isFinal: false,
    previousTwoGroups: false,
  });

  ok('mesma ordem de atletas', peloSeletor.map((r) => r.athlete.id), direto.map((r) => r.athlete.id));
  ok('mesmas colocações', peloSeletor.map((r) => r.rank), direto.map((r) => r.rank));
  ok('mesmos totais', peloSeletor.map((r) => r.total), direto.map((r) => r.total));
  ok('mesmos status', peloSeletor.map((r) => r.status), direto.map((r) => r.status));
  ok('Caio segue como DNS', peloSeletor.find((r) => r.athlete.id === 'c').status, 'dns');
}

console.log('\nguiada: 2 vias vão para a qualificatória, 1 via para semi/final');
{
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2)];
  const lead = disciplineOf({ discipline: 'lead' });

  const duasVias = lead.computeRanking({
    athletes: atletas,
    climbs: [
      { id: 'v1', number: 1 },
      { id: 'v2', number: 2 },
    ],
    scores: [
      { athlete_id: 'a', boulder_id: 'v1', attempted: true, hold_value: 40 },
      { athlete_id: 'a', boulder_id: 'v2', attempted: true, hold_value: 35 },
      { athlete_id: 'b', boulder_id: 'v1', attempted: true, hold_value: 30 },
      { athlete_id: 'b', boulder_id: 'v2', attempted: true, hold_value: 45 },
    ],
    previousRanks: null,
    round: { id: 'q', is_finished: false },
    isFinal: false,
    previousTwoGroups: false,
  });
  ok('qualificatória devolve duas vias por atleta', duasVias[0].byRoute.length, 2);
  ok('e um TP calculado', duasVias.every((r) => typeof r.total === 'number'), true);
  ok('ambos empatam em √(1·2)', duasVias.map((r) => r.total), [1.414, 1.414]);

  const umaVia = lead.computeRanking({
    athletes: atletas,
    climbs: [{ id: 'f1', number: 1 }],
    scores: [
      { athlete_id: 'a', boulder_id: 'f1', attempted: true, hold_value: 40, time_seconds: 200 },
      { athlete_id: 'b', boulder_id: 'f1', attempted: true, hold_value: 40, time_seconds: 150 },
    ],
    previousRanks: null,
    round: { id: 'f', is_finished: true },
    isFinal: true,
    previousTwoGroups: false,
  });
  ok('final devolve uma via por atleta', umaVia[0].byRoute.length, 1);
  ok('e o tempo desempata no pódio', umaVia.map((r) => r.athlete.id), ['b', 'a']);
}

console.log('\n15.6a: dois grupos na qualificatória desligam o count-back da semi');
{
  const atletas = [atleta('a', 'Ana', 1), atleta('b', 'Bruno', 2)];
  const lead = disciplineOf({ discipline: 'lead' });
  const args = {
    athletes: atletas,
    climbs: [{ id: 's1', number: 1 }],
    scores: [
      { athlete_id: 'a', boulder_id: 's1', attempted: true, hold_value: 40 },
      { athlete_id: 'b', boulder_id: 's1', attempted: true, hold_value: 40 },
    ],
    previousRanks: new Map([['a', 5], ['b', 2]]),
    round: { id: 's', is_finished: false },
    isFinal: false,
  };

  const grupoUnico = lead.computeRanking({ ...args, previousTwoGroups: false });
  ok('com grupo único, o count-back desempata', grupoUnico.map((r) => r.rank), [1, 2]);

  const doisGrupos = lead.computeRanking({ ...args, previousTwoGroups: true });
  ok('com dois grupos, seguem empatados', doisGrupos.map((r) => r.rank), [1, 1]);
}

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
