// ============================================================
// A modalidade, lida do endereço
// ============================================================
//
// O sistema tem duas competições que correm em paralelo e não se misturam:
// Boulder e Guiada. Cada uma tem a sua árvore de telas, do ranking público ao
// painel do árbitro:
//
//   /comp/boulder            ranking (telão)
//   /comp/boulder/staff      painel de pontuação
//   /comp/boulder/controle   cadastro · fases · fila · cronômetro
//   /comp/guiada             ranking (telão)
//   /comp/guiada/staff       painel de pontuação
//   /comp/guiada/controle    cadastro · fases · cronômetro
//
// Antes cada tela trazia `useEvent('Boulder')` cravado no código, e a Guiada
// foi entrando por propriedades espalhadas. O risco disso num evento não é
// estético: um árbitro clica num link do cabeçalho, cai na outra modalidade
// sem perceber e lança pontuação no campeonato errado.
//
// Agora existe um lugar só que sabe em qual competição a tela está — o
// endereço — e é daqui que todas leem.

import { useParams } from 'react-router-dom';

export const MODALIDADES = {
  boulder: {
    slug: 'boulder',
    label: 'Boulder',
    // Nome da categoria no banco. O slug é português e público; o nome da
    // categoria é o que está gravado em `categories.name`.
    categoryName: 'Boulder',
    // Cor da faixa de identificação. Amarelo é a cor que o Boulder já usa no
    // ranking desde o primeiro evento.
    corFaixa: 'bg-gold',
    corTexto: 'text-panel',
    // A fila é o rodízio entre blocos: o atleta escolhe qual boulder encara
    // em seguida. Na Guiada ele escala uma via por vez, em ordem de largada,
    // e a tela não faz sentido.
    temFila: true,
  },
  guiada: {
    slug: 'guiada',
    label: 'Guiada',
    categoryName: 'Lead',
    corFaixa: 'bg-zone',
    corTexto: 'text-panel',
    temFila: false,
  },
};

export const PADRAO = MODALIDADES.boulder;

/** A modalidade da tela atual, a partir do segmento :modalidade da rota. */
export function useModalidade() {
  const { modalidade } = useParams();
  return MODALIDADES[modalidade] ?? PADRAO;
}

/** Todos os endereços de uma modalidade, montados a partir do slug. */
export function rotas(slug) {
  const base = `/comp/${slug}`;
  return {
    base,
    ranking: base,
    staff: `${base}/staff`,
    staffRanking: `${base}/staff/ranking`,
    controle: `${base}/controle`,
    cadastro: `${base}/controle/cadastro`,
    fases: `${base}/controle/fases`,
    fila: `${base}/controle/fila`,
    cronometro: `${base}/controle/cronometro`,
  };
}

/** Endereços que não pertencem a nenhuma modalidade. */
export const GERAL = {
  hub: '/comp',
  loginStaff: '/comp/staff/login',
  loginControle: '/comp/controle/login',
  escolher: (area) => `/comp/escolher/${area}`,
};

// A última competição escolhida fica gravada no navegador só para adiantar a
// tela de escolha — nunca para pular a escolha. Entrar direto na modalidade de
// ontem é exatamente o erro que essa separação existe para evitar.
const CHAVE = 'meubeta.comp.modalidade';

export function lembrarModalidade(slug) {
  try {
    window.localStorage.setItem(CHAVE, slug);
  } catch {
    // Navegador com armazenamento bloqueado. A escolha só deixa de ser
    // lembrada; nada mais depende disso.
  }
}

export function modalidadeLembrada() {
  try {
    const slug = window.localStorage.getItem(CHAVE);
    return MODALIDADES[slug] ? slug : null;
  } catch {
    return null;
  }
}
