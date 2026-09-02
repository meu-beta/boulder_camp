// ============================================================
// Mesclagem dos rascunhos do painel do árbitro
// ============================================================
//
// O painel guarda o que o árbitro está digitando num rascunho local, separado
// do que já está salvo no banco. O problema é decidir o que fazer quando chega
// novidade do banco no meio da digitação.
//
// O evento é assim: um árbitro por boulder, todos com o mesmo login, cada um no
// seu celular, todos lançando ao mesmo tempo. As pontuações chegam por Realtime
// para todo mundo. A versão anterior reconstruía TODOS os rascunhos sempre que
// o número de pontuações da fase mudava — e como esse número é da fase inteira,
// a primeira pontuação lançada em qualquer boulder apagava o que os árbitros
// dos outros boulders estavam digitando.
//
// A regra aqui separa os dois casos:
//
//   linha intocada desde a última vez que veio do banco  ->  aceita a novidade
//   linha que o árbitro está editando                    ->  não se mexe
//
// Assim a tela continua viva (uma correção feita por outra pessoa aparece), mas
// nada que esteja sendo digitado é destruído.

/**
 * Dois rascunhos são o mesmo lançamento?
 *
 * A comparação é literal, e é assim de propósito. Seria tentador dizer que um
 * campo vazio equivale a zero, mas na Guiada agarra vazia ("ainda não anotei")
 * e agarra 0 são coisas diferentes, e confundir as duas faria uma novidade do
 * banco sobrescrever um zero que o árbitro acabou de digitar.
 *
 * Na dúvida, o critério erra para o lado de considerar a linha TOCADA — o que
 * preserva o trabalho de quem está digitando. O preço é pequeno: uma correção
 * remota pode demorar a aparecer naquela linha, e reaparece assim que o árbitro
 * troca de boulder.
 *
 * Rascunho intocado nunca cai nesse limbo: ele nasce como cópia da base, então
 * é idêntico até alguém encostar nele.
 */
export function rascunhosIguais(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const chave of chaves) {
    const x = a[chave];
    const y = b[chave];
    if (typeof x === 'boolean' || typeof y === 'boolean') {
      if (Boolean(x) !== Boolean(y)) return false;
    } else if (String(x ?? '') !== String(y ?? '')) {
      return false;
    }
  }
  return true;
}

/**
 * @param base      rascunhos montados a partir do que está salvo agora
 * @param atuais    rascunhos que estão na tela, possivelmente com edição em curso
 * @param semeados  a `base` da última vez — serve para saber quem foi tocado
 * @param recomecar true quando o árbitro trocou de boulder ou de fase: aí a
 *                  tela é outra e não há edição em curso a preservar
 */
export function mesclarRascunhos({ base, atuais, semeados, recomecar = false }) {
  if (recomecar) return { ...base };

  const saida = {};
  // Percorre a `base`: atleta que saiu da fase some do rascunho junto.
  Object.entries(base).forEach(([id, novo]) => {
    const atual = atuais?.[id];
    const semeado = semeados?.[id];
    const intocado = !atual || rascunhosIguais(atual, semeado);
    saida[id] = intocado ? novo : atual;
  });
  return saida;
}
