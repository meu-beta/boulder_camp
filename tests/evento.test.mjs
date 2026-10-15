import assert from 'node:assert/strict';
import {
  agruparEventos,
  estaEmCartaz,
  estadoDoEvento,
  hojeISO,
  ordenarEventos,
  periodoEmTexto,
  slugify,
  visualDaModalidade,
} from '../src/lib/eventoRegras.js';

let passou = 0;
let falhou = 0;
const t = (nome, fn) => {
  try {
    fn();
    passou += 1;
  } catch (e) {
    falhou += 1;
    console.error(`FALHOU: ${nome}\n  ${e.message}`);
  }
};

const ev = (extra) => ({ published: true, archived_at: null, ...extra });
const HOJE = '2026-03-15';

// ------------------------------------------------------------
// Estado
// ------------------------------------------------------------

t('sem evento, trata como rascunho', () => {
  assert.equal(estadoDoEvento(null).chave, 'rascunho');
});

t('nao publicado e rascunho mesmo com data de hoje', () => {
  assert.equal(
    estadoDoEvento(ev({ published: false, starts_on: HOJE, ends_on: HOJE }), HOJE).chave,
    'rascunho'
  );
});

t('arquivado vence publicado e vence as datas', () => {
  const e = ev({ starts_on: HOJE, ends_on: HOJE, archived_at: '2026-03-20T00:00:00Z' });
  assert.equal(estadoDoEvento(e, HOJE).chave, 'arquivado');
});

t('arquivado vence rascunho', () => {
  const e = ev({ published: false, archived_at: '2026-01-01T00:00:00Z' });
  assert.equal(estadoDoEvento(e, HOJE).chave, 'arquivado');
});

t('antes do inicio e em breve', () => {
  assert.equal(estadoDoEvento(ev({ starts_on: '2026-03-20' }), HOJE).chave, 'em-breve');
});

t('depois do fim e encerrado', () => {
  assert.equal(estadoDoEvento(ev({ ends_on: '2026-03-14' }), HOJE).chave, 'encerrado');
});

t('no primeiro dia ja esta ao vivo', () => {
  assert.equal(
    estadoDoEvento(ev({ starts_on: HOJE, ends_on: '2026-03-16' }), HOJE).chave,
    'ao-vivo'
  );
});

t('no ultimo dia ainda esta ao vivo', () => {
  assert.equal(
    estadoDoEvento(ev({ starts_on: '2026-03-14', ends_on: HOJE }), HOJE).chave,
    'ao-vivo'
  );
});

t('evento de um dia so fica ao vivo nesse dia', () => {
  const e = ev({ starts_on: HOJE, ends_on: HOJE });
  assert.equal(estadoDoEvento(e, HOJE).chave, 'ao-vivo');
  assert.equal(estadoDoEvento(e, '2026-03-16').chave, 'encerrado');
  assert.equal(estadoDoEvento(e, '2026-03-14').chave, 'em-breve');
});

// Datas em branco não podem esconder um evento que alguém criou com pressa.
t('sem data nenhuma, publicado fica ao vivo', () => {
  assert.equal(estadoDoEvento(ev({}), HOJE).chave, 'ao-vivo');
});

t('so com inicio no passado, segue ao vivo', () => {
  assert.equal(estadoDoEvento(ev({ starts_on: '2026-01-01' }), HOJE).chave, 'ao-vivo');
});

t('so com fim no futuro, segue ao vivo', () => {
  assert.equal(estadoDoEvento(ev({ ends_on: '2026-12-01' }), HOJE).chave, 'ao-vivo');
});

t('em cartaz cobre ao vivo e em breve, nao encerrado', () => {
  assert.equal(estaEmCartaz(ev({ starts_on: HOJE, ends_on: HOJE }), HOJE), true);
  assert.equal(estaEmCartaz(ev({ starts_on: '2026-04-01' }), HOJE), true);
  assert.equal(estaEmCartaz(ev({ ends_on: '2026-01-01' }), HOJE), false);
  assert.equal(estaEmCartaz(ev({ published: false }), HOJE), false);
});

t('hojeISO devolve AAAA-MM-DD com zero a esquerda', () => {
  assert.equal(hojeISO(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(hojeISO(new Date(2026, 10, 30)), '2026-11-30');
});

// ------------------------------------------------------------
// Ordem e agrupamento
// ------------------------------------------------------------

t('ao vivo vem antes de em breve, que vem antes de encerrado', () => {
  const lista = [
    ev({ name: 'encerrado', ends_on: '2026-01-01' }),
    ev({ name: 'em breve', starts_on: '2026-04-01' }),
    ev({ name: 'ao vivo', starts_on: HOJE, ends_on: HOJE }),
  ];
  assert.deepEqual(
    ordenarEventos(lista, HOJE).map((e) => e.name),
    ['ao vivo', 'em breve', 'encerrado']
  );
});

t('entre os que estao por vir, o mais proximo primeiro', () => {
  const lista = [
    ev({ name: 'maio', starts_on: '2026-05-01' }),
    ev({ name: 'abril', starts_on: '2026-04-01' }),
  ];
  assert.deepEqual(
    ordenarEventos(lista, HOJE).map((e) => e.name),
    ['abril', 'maio']
  );
});

t('entre os encerrados, o mais recente primeiro', () => {
  const lista = [
    ev({ name: 'janeiro', starts_on: '2026-01-01', ends_on: '2026-01-02' }),
    ev({ name: 'fevereiro', starts_on: '2026-02-01', ends_on: '2026-02-02' }),
  ];
  assert.deepEqual(
    ordenarEventos(lista, HOJE).map((e) => e.name),
    ['fevereiro', 'janeiro']
  );
});

t('ordenar nao altera a lista recebida', () => {
  const lista = [ev({ name: 'b', starts_on: '2026-04-02' }), ev({ name: 'a', starts_on: '2026-04-01' })];
  const copia = [...lista];
  ordenarEventos(lista, HOJE);
  assert.deepEqual(lista, copia);
});

t('agrupar preserva a ordem recebida dentro e entre grupos', () => {
  const lista = [
    { name: '1', group_name: 'Etapa 1' },
    { name: '2', group_name: 'Etapa 2' },
    { name: '3', group_name: 'Etapa 1' },
  ];
  const grupos = agruparEventos(lista);
  assert.deepEqual(grupos.map((g) => g.titulo), ['Etapa 1', 'Etapa 2']);
  assert.deepEqual(grupos[0].itens.map((e) => e.name), ['1', '3']);
});

t('evento sem etapa cai num grupo sem titulo', () => {
  const grupos = agruparEventos([{ name: 'solto' }]);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].titulo, '');
});

t('agrupar lista vazia devolve vazio', () => {
  assert.deepEqual(agruparEventos([]), []);
  assert.deepEqual(agruparEventos(undefined), []);
});

// ------------------------------------------------------------
// Período em texto
// ------------------------------------------------------------

t('dois dias do mesmo mes', () => {
  assert.equal(periodoEmTexto('2026-03-14', '2026-03-15'), '14 e 15 de março');
});

t('meses diferentes', () => {
  assert.equal(periodoEmTexto('2026-03-30', '2026-04-02'), '30 de março a 2 de abril');
});

t('um dia so', () => {
  assert.equal(periodoEmTexto('2026-03-14', '2026-03-14'), '14 de março');
  assert.equal(periodoEmTexto('2026-03-14', null), '14 de março');
});

t('sem datas, texto vazio', () => {
  assert.equal(periodoEmTexto(null, null), '');
});

t('dia sem zero a esquerda', () => {
  assert.equal(periodoEmTexto('2026-03-05', '2026-03-05'), '5 de março');
});

// Pegado em produção: um evento de 15/10/2026 a 15/10/2027 aparecia como
// "15 e 15 de outubro", disfarçado de evento de um dia.
t('anos diferentes aparecem', () => {
  assert.equal(
    periodoEmTexto('2026-10-15', '2027-10-15'),
    '15 de outubro de 2026 a 15 de outubro de 2027'
  );
});

t('mesmo dia e mes em anos diferentes nao colapsa', () => {
  assert.notEqual(periodoEmTexto('2026-10-15', '2027-10-15'), '15 de outubro');
});

t('mesmo dia repetido no mesmo mes nao vira "15 e 15"', () => {
  assert.equal(periodoEmTexto('2026-10-15', '2026-10-15'), '15 de outubro');
});

// ------------------------------------------------------------
// Slug
// ------------------------------------------------------------

t('slug tira acento, maiuscula e pontuacao', () => {
  assert.equal(slugify('FEESP Etapa 1 — Boulder — Feminino Adulto'), 'feesp-etapa-1-boulder-feminino-adulto');
});

t('slug nao comeca nem termina com hifen', () => {
  assert.equal(slugify('  — Guiada —  '), 'guiada');
});

t('slug colapsa separadores repetidos', () => {
  assert.equal(slugify('a // b ___ c'), 'a-b-c');
});

t('slug de texto vazio e vazio', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(null), '');
});

// O banco cobra o mesmo formato (events_slug_check). Se um sair daqui fora do
// padrão, o erro só aparece no save — por isso o teste é contra a regex do banco.
t('todo slug gerado passa na trava do banco', () => {
  const regra = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const casos = [
    'FEESP Etapa 1 — Boulder — Feminino Adulto',
    'Sub-16 / Masculino',
    'Guiada  2026',
    'Ação Çedilha Ñ',
    'a'.repeat(120),
  ];
  casos.forEach((c) => {
    const s = slugify(c);
    assert.ok(regra.test(s), `slug invalido para "${c.slice(0, 20)}": "${s}"`);
  });
});

t('slug longo e cortado sem terminar em hifen', () => {
  const s = slugify('palavra '.repeat(30));
  assert.ok(s.length <= 60);
  assert.ok(!s.endsWith('-'));
});

// ------------------------------------------------------------
// Modalidade
// ------------------------------------------------------------

t('boulder tem fila, guiada nao', () => {
  assert.equal(visualDaModalidade('boulder').temFila, true);
  assert.equal(visualDaModalidade('guiada').temFila, false);
});

t('modalidade desconhecida cai no boulder', () => {
  assert.equal(visualDaModalidade('trad').chave, 'boulder');
  assert.equal(visualDaModalidade(undefined).chave, 'boulder');
  assert.equal(visualDaModalidade('lead').chave, 'boulder');
});

console.log(`evento: ${passou} passaram, ${falhou} falharam`);
if (falhou) process.exit(1);
