// Leitura e escrita do tempo da tentativa no painel do árbitro da Guiada.
// O tempo é anotado à mão pelo juiz, então o campo precisa aceitar as duas
// formas em que ele pode chegar: "4:32" lido do cronômetro, ou "272" em
// segundos corridos. 15.2a manda arredondar para baixo.
//
//   node tests/leadTime.test.mjs

// As funções vivem no .jsx do painel; aqui repetimos a implementação seria
// duplicação. Em vez disso, extraímos o trecho por leitura do arquivo — se
// alguém mexer nelas sem rodar o teste, o teste quebra junto.
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../src/pages/StaffPanelLead.jsx', import.meta.url), 'utf8');
const inicio = fonte.indexOf('export function parseTime');
const fim = fonte.indexOf('function LockIcon');
const trecho = fonte.slice(inicio, fim).replace(/export /g, '');
// eslint-disable-next-line no-new-func
const { parseTime, formatTime } = new Function(`${trecho}; return { parseTime, formatTime };`)();

let passou = 0;
let falhou = 0;
const ok = (nome, real, esperado) => {
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhou += 1;
    console.log(`  FALHA ${nome}\n        esperado ${JSON.stringify(esperado)}\n        obtido   ${JSON.stringify(real)}`);
  }
};

console.log('\nleitura do tempo digitado');
ok('mm:ss', parseTime('4:32'), 272);
ok('mm:ss com zero à esquerda', parseTime('04:05'), 245);
ok('segundos corridos', parseTime('272'), 272);
ok('espaços em volta', parseTime('  4:32 '), 272);
ok('vazio vira nulo', parseTime(''), null);
ok('só espaço vira nulo', parseTime('   '), null);
ok('nulo continua nulo', parseTime(null), null);
ok('texto ilegível vira nulo', parseTime('abc'), null);
ok('mm:ss ilegível vira nulo', parseTime('a:b'), null);
ok('fração arredonda para baixo (15.2a)', parseTime('4:32.9'), 272);
ok('negativo vira zero', parseTime('-30'), 0);

console.log('\nescrita do tempo salvo');
ok('272 vira 4:32', formatTime(272), '4:32');
ok('segundos abaixo de 10 ganham zero', formatTime(245), '4:05');
ok('zero é 0:00', formatTime(0), '0:00');
ok('nulo vira vazio', formatTime(null), '');
ok('vazio continua vazio', formatTime(''), '');

console.log('\nida e volta');
[0, 5, 59, 60, 61, 272, 599, 3600].forEach((s) => {
  ok(`${s}s sobrevive ao ciclo`, parseTime(formatTime(s)), s);
});

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
