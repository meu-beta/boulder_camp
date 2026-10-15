// ============================================================
// Evento — a identidade de uma competição
// ============================================================
//
// Substitui `modalidade.js`. A diferença é de nível: antes o endereço carregava
// a MODALIDADE (/comp/boulder), e só existia uma competição de cada tipo. Agora
// o endereço carrega o EVENTO (/comp/e/feesp-1-boulder-fem), e a modalidade é
// uma propriedade dele.
//
// Cada categoria é um evento separado — ver
// claude/arquitetura-meu-beta-comp-eventos.md. Por isso nenhuma tela ganhou
// seletor de categoria: o árbitro escolhe o evento ao entrar e opera igual.
//
// Este arquivo é o único lugar que sabe montar endereço de evento e traduzir
// modalidade em cor. Quem precisa do evento carregado chama `useEventoAtual()`,
// que lê do contexto montado pelo EventoGuard — sem consulta nova ao banco.

import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { PADRAO, estadoDoEvento, visualDaModalidade } from './eventoRegras';

// Reexportado para quem importa tudo de um lugar só.
export * from './eventoRegras';

// ------------------------------------------------------------
// Endereços
// ------------------------------------------------------------

export function rotas(slug) {
  const base = `/comp/e/${slug}`;
  return {
    base,
    ranking: base,
    relatorio: `${base}/relatorio`,
    insights: `${base}/insights`,
    staff: `${base}/staff`,
    staffRanking: `${base}/staff/ranking`,
    controle: `${base}/controle`,
    cadastro: `${base}/controle/cadastro`,
    fases: `${base}/controle/fases`,
    fila: `${base}/controle/fila`,
    cronometro: `${base}/controle/cronometro`,
  };
}

export const GERAL = {
  hub: '/comp',
  anteriores: '/comp/anteriores',
  insights: '/comp/insights',
  admin: '/comp/admin',
  adminNovo: '/comp/admin/novo',
  adminEvento: (slug) => `/comp/admin/${slug}`,
  loginStaff: '/comp/staff/login',
  loginControle: '/comp/controle/login',
  loginAdmin: '/comp/admin/login',
  escolher: (area) => `/comp/escolher/${area}`,
};

// ------------------------------------------------------------
// Qual evento está aberto
// ------------------------------------------------------------

// Exportado em vez de embrulhado num componente porque este arquivo é .js, e o
// Vite só transforma JSX em .jsx. Quem monta o Provider é o EventoGuard.
export const EventoCtx = createContext(null);

/** Só o slug, direto do endereço. Serve antes de o evento ter carregado. */
export function useSlugDoEvento() {
  const { evento } = useParams();
  return evento ?? null;
}

/**
 * Só o slug do evento aberto. Atalho para as telas que apenas precisam passar
 * isso ao `useEvent` e não usam mais nada do evento.
 */
export function useSlugAtual() {
  return useContext(EventoCtx)?.slug ?? null;
}

/**
 * O evento aberto, já com a aparência da modalidade embutida.
 *
 * Devolve sempre um objeto utilizável: fora de um evento (ou antes de carregar)
 * vem o esqueleto com os valores do boulder, para nenhuma tela quebrar lendo
 * `.corFaixa` de `undefined`.
 */
export function useEventoAtual() {
  const evento = useContext(EventoCtx);
  const visual = visualDaModalidade(evento?.modality);
  return {
    ...visual,
    id: evento?.id ?? null,
    slug: evento?.slug ?? null,
    name: evento?.name ?? '',
    federation: evento?.federation ?? '',
    group_name: evento?.group_name ?? '',
    modality: evento?.modality ?? PADRAO.chave,
    starts_on: evento?.starts_on ?? null,
    ends_on: evento?.ends_on ?? null,
    manager_name: evento?.manager_name ?? '',
    published: evento?.published ?? false,
    archived_at: evento?.archived_at ?? null,
    show_states: evento?.show_states ?? true,
    carregado: Boolean(evento),
    estado: estadoDoEvento(evento),
  };
}

// ------------------------------------------------------------
// Último evento usado, por área
// ------------------------------------------------------------
// Só conveniência: a tela de escolha destaca onde a pessoa estava. Nunca pula
// a escolha sozinha — num dia com oito eventos, entrar no errado é pior do que
// um toque a mais.

const CHAVE = 'meubeta.comp.evento';

export function lembrarEvento(area, slug) {
  try {
    window.localStorage.setItem(`${CHAVE}.${area}`, slug);
  } catch {
    /* navegador sem storage: seguir sem lembrar */
  }
}

export function eventoLembrado(area) {
  try {
    return window.localStorage.getItem(`${CHAVE}.${area}`) || null;
  } catch {
    return null;
  }
}
