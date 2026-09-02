// Mesclagem dos rascunhos do painel do árbitro.
//
// O cenário que estes testes reproduzem é o do evento: um árbitro por boulder,
// todos com o mesmo login, todos lançando ao mesmo tempo. Cada pontuação salva
// por um deles chega nos celulares dos outros pelo Realtime. O que NÃO pode
// acontecer é essa novidade apagar o lançamento que outro árbitro está
// digitando e ainda não salvou.
//
//   node tests/rascunhos.test.mjs

import { mesclarRascunhos, rascunhosIguais } from '../src/lib/rascunhos.js';

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

const vazio = { attempted: false, zone: false, zone_attempts: 0, top: false, top_attempts: 0, locked: false };
const linha = (extra) => ({ ...vazio, ...extra });

console.log('\ncomparação de rascunhos');
ok('idênticos', rascunhosIguais(vazio, { ...vazio }), true);
ok('diferentes', rascunhosIguais(vazio, linha({ zone: true })), false);
ok('nulo de um lado', rascunhosIguais(vazio, null), false);
ok('3 digitado difere de 0 salvo', rascunhosIguais(linha({ zone_attempts: 3 }), linha({ zone_attempts: 0 })), false);
ok('"3" texto e 3 número são o mesmo', rascunhosIguais(linha({ zone_attempts: '3' }), linha({ zone_attempts: 3 })), true);
// Campo esvaziado conta como tocado: na Guiada, agarra vazia e agarra 0 são
// coisas diferentes, e o critério erra para o lado de preservar a edição.
ok('campo esvaziado conta como tocado', rascunhosIguais(linha({ zone_attempts: '' }), linha({ zone_attempts: 0 })), false);

console.log('\ntrocar de boulder recomeça do zero');
{
  const base = { a: linha({ zone: true, zone_attempts: 2 }) };
  const atuais = { a: linha({ top: true, top_attempts: 9 }) };
  ok(
    'a edição da tela anterior não vaza para a nova',
    mesclarRascunhos({ base, atuais, semeados: {}, recomecar: true }),
    base
  );
}

console.log('\no caso do evento: outro árbitro salva enquanto eu digito');
{
  // Estado inicial: dois atletas sem nada lançado no meu boulder.
  const semeados = { ana: linha({}), bruno: linha({}) };
  // Estou no meio do lançamento da Ana: marquei zona na 3ª. Nada salvo ainda.
  const atuais = { ana: linha({ attempted: true, zone: true, zone_attempts: 3 }), bruno: linha({}) };
  // Chega o Realtime porque o árbitro do Boulder 2 salvou alguém. No MEU
  // boulder nada mudou, então a base continua igual à semeada.
  const base = { ana: linha({}), bruno: linha({}) };

  const saida = mesclarRascunhos({ base, atuais, semeados });
  ok('meu lançamento da Ana sobrevive', saida.ana, atuais.ana);
  ok('o do Bruno, que eu não toquei, segue vazio', saida.bruno, vazio);
}

console.log('\ncorreção feita por outra pessoa aparece nas linhas intocadas');
{
  const semeados = { ana: linha({}), bruno: linha({}) };
  const atuais = { ana: linha({ zone: true, zone_attempts: 3 }), bruno: linha({}) };
  // Alguém corrigiu o Bruno no banco.
  const base = { ana: linha({}), bruno: linha({ attempted: true, zone: true, zone_attempts: 1 }) };

  const saida = mesclarRascunhos({ base, atuais, semeados });
  ok('a correção do Bruno entra na tela', saida.bruno, base.bruno);
  ok('e a Ana, que estou editando, continua intacta', saida.ana, atuais.ana);
}

console.log('\nlinha que eu editei e que também mudou no banco: a minha vence');
{
  const semeados = { ana: linha({}) };
  const atuais = { ana: linha({ zone: true, zone_attempts: 3 }) };
  const base = { ana: linha({ top: true, top_attempts: 1 }) };
  const saida = mesclarRascunhos({ base, atuais, semeados });
  ok('não perco o que estou digitando', saida.ana, atuais.ana);
}

console.log('\ndepois que eu mesmo salvo, a tela volta a acompanhar o banco');
{
  // Salvei zona na 3ª. O banco agora tem isso, e o rascunho é igual.
  const semeados = { ana: linha({ zone: true, zone_attempts: 3 }) };
  const atuais = { ana: linha({ zone: true, zone_attempts: 3 }) };
  // Mais tarde alguém corrige para a 1ª.
  const base = { ana: linha({ zone: true, zone_attempts: 1 }) };
  ok('a correção entra', mesclarRascunhos({ base, atuais, semeados }).ana, base.ana);
}

console.log('\nentrada e saída de atletas na fase');
{
  const semeados = { ana: linha({}) };
  const atuais = { ana: linha({ zone: true }) };
  const base = { ana: linha({}), novo: linha({}) };
  const saida = mesclarRascunhos({ base, atuais, semeados });
  ok('atleta recém-inscrito ganha rascunho', saida.novo, vazio);
  ok('e a edição em curso continua', saida.ana, atuais.ana);
}
{
  const semeados = { ana: linha({}), bruno: linha({}) };
  const atuais = { ana: linha({}), bruno: linha({ zone: true }) };
  const base = { ana: linha({}) };
  ok(
    'atleta retirado da fase some do rascunho',
    Object.keys(mesclarRascunhos({ base, atuais, semeados })),
    ['ana']
  );
}

console.log('\nprimeira montagem, sem rascunho nenhum ainda');
ok(
  'tudo vem do banco',
  mesclarRascunhos({ base: { ana: linha({ zone: true }) }, atuais: {}, semeados: {} }),
  { ana: linha({ zone: true }) }
);
ok(
  'atuais indefinido não quebra',
  mesclarRascunhos({ base: { ana: vazio }, atuais: undefined, semeados: undefined }),
  { ana: vazio }
);

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
