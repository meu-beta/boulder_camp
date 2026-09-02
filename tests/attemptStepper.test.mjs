// Regra de digitação do seletor de tentativas.
//
// O bug que originou esse componente: o campo antigo normalizava a cada tecla,
// então apagar o número para digitar outro devolvia 1 no mesmo instante e o
// árbitro nunca chegava no valor que queria pelo celular. O teste mais
// importante daqui é justamente esse — o vazio TEM que sobreviver enquanto se
// digita, e só virar número quando o dedo sai do campo.
//
//   node tests/attemptStepper.test.mjs

import { readFileSync } from 'node:fs';

// As funções vivem no .jsx do componente. Extrair o trecho em vez de duplicar
// garante que o teste quebra junto se alguém mexer nelas.
const fonte = readFileSync(new URL('../src/components/AttemptStepper.jsx', import.meta.url), 'utf8');
const inicio = fonte.indexOf('export function normalizarDigitacao');
const fim = fonte.indexOf('const BOTAO');
const trecho = fonte.slice(inicio, fim).replace(/export /g, '');
// eslint-disable-next-line no-new-func
const { normalizarDigitacao, normalizarSaida } = new Function(
  `${trecho}; return { normalizarDigitacao, normalizarSaida };`
)();

let passou = 0;
let falhou = 0;
const ok = (nome, real, esperado) => {
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhou += 1;
    console.log(
      `  FALHA ${nome}\n        esperado ${JSON.stringify(esperado)}\n        obtido   ${JSON.stringify(real)}`
    );
  }
};

console.log('\ndigitando — o vazio precisa sobreviver');
ok('apagar tudo continua vazio (era o bug)', normalizarDigitacao(''), '');
ok('um dígito', normalizarDigitacao('3'), 3);
ok('dois dígitos', normalizarDigitacao('12'), 12);
ok('zero passa enquanto digita, para dar tempo de virar 10', normalizarDigitacao('0'), 0);
ok('e vira 10 na tecla seguinte', normalizarDigitacao('10'), 10);
ok('letra sozinha vira vazio', normalizarDigitacao('a'), '');
ok('texto colado perde o que não é dígito', normalizarDigitacao('3 tentativas'), 3);
ok('sinal de menos é ignorado', normalizarDigitacao('-5'), 5);
ok('decimal perde o ponto', normalizarDigitacao('2.5'), 25);
ok('corta no terceiro dígito', normalizarDigitacao('123'), 12);
ok('respeita um teto menor', normalizarDigitacao('99', { max: 40 }), 40);
ok('nulo vira vazio', normalizarDigitacao(null), '');

console.log('\nsaindo do campo — aí sim vira número');
ok('vazio vira o piso', normalizarSaida(''), 1);
ok('nulo vira o piso', normalizarSaida(null), 1);
ok('zero vira o piso', normalizarSaida(0), 1);
ok('número válido fica', normalizarSaida(7), 7);
ok('texto vira o piso', normalizarSaida('abc'), 1);
ok('piso zero aceita o zero', normalizarSaida(0, { min: 0 }), 0);

console.log('\nagarra da Guiada: vazio quer dizer "ainda não anotei"');
ok('vazio permanece vazio', normalizarSaida('', { min: 0, permitirVazio: true }), '');
ok('nulo permanece vazio', normalizarSaida(null, { min: 0, permitirVazio: true }), '');
ok('mas número anotado fica', normalizarSaida(35, { min: 0, permitirVazio: true }), 35);
ok('e o zero anotado também', normalizarSaida(0, { min: 0, permitirVazio: true }), 0);

console.log('\no ciclo completo do árbitro no celular');
{
  // Ele tem 1 na tela, apaga e digita 4. Cada passo é uma tecla.
  let v = 1;
  v = normalizarDigitacao('');
  ok('depois de apagar, o campo está vazio', v, '');
  v = normalizarDigitacao('4');
  ok('digita 4 e o campo tem 4', v, 4);
  v = normalizarSaida(v);
  ok('sai do campo e continua 4', v, 4);
}
{
  // E se ele apagar e desistir, sem digitar nada.
  let v = normalizarDigitacao('');
  v = normalizarSaida(v);
  ok('apagou e desistiu: volta para 1', v, 1);
}

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
