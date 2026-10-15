// ============================================================
// Evento — regras puras
// ============================================================
//
// Separado de `evento.js` por um motivo prático: este arquivo não importa React
// nem o router, então a suíte de testes roda direto no node, sem navegador e
// sem montar componente. Tudo que decide COMPORTAMENTO do evento — estado,
// ordem na lista, agrupamento, texto de período, slug — mora aqui.

// ------------------------------------------------------------
// Modalidades
// ------------------------------------------------------------
// Só a parte visual mora aqui. A regra de pontuação mora em disciplines.js.

export const MODALIDADES = {
  boulder: {
    chave: 'boulder',
    label: 'Boulder',
    corFaixa: 'bg-gold',
    corTexto: 'text-panel',
    corTag: 'bg-gold text-panel',
    temFila: true,
  },
  guiada: {
    chave: 'guiada',
    label: 'Guiada',
    corFaixa: 'bg-zone',
    corTexto: 'text-panel',
    corTag: 'bg-zone text-panel',
    temFila: false,
  },
};

export const PADRAO = MODALIDADES.boulder;

/** Aparência de uma modalidade. Valor desconhecido cai no boulder. */
export function visualDaModalidade(modality) {
  return MODALIDADES[modality] ?? PADRAO;
}

// ------------------------------------------------------------
// Estado do evento
// ------------------------------------------------------------
// Calculado a partir das datas, nunca digitado — assim ninguém precisa lembrar
// de "encerrar" um evento na mão para ele sair da lista.

export const ESTADOS = {
  rascunho:   { chave: 'rascunho',   label: 'Rascunho',   cor: 'bg-white/10 text-white/60' },
  'em-breve': { chave: 'em-breve',   label: 'Em breve',   cor: 'bg-white/10 text-white/80' },
  'ao-vivo':  { chave: 'ao-vivo',    label: 'Ao vivo',    cor: 'bg-pass text-panel' },
  encerrado:  { chave: 'encerrado',  label: 'Encerrado',  cor: 'bg-white/10 text-white/50' },
  arquivado:  { chave: 'arquivado',  label: 'Arquivado',  cor: 'bg-white/5 text-white/40' },
};

/** Data de hoje como 'AAAA-MM-DD' no fuso de quem está olhando. */
export function hojeISO(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Estado de um evento. A ordem das perguntas importa:
 * arquivado vence tudo, depois rascunho, e só então as datas.
 *
 * Datas em branco não travam nada: evento sem início é tratado como já
 * começado, evento sem fim como ainda em andamento. É o comportamento menos
 * surpreendente para quem criou o evento com pressa.
 */
export function estadoDoEvento(evento, hoje = hojeISO()) {
  if (!evento) return ESTADOS.rascunho;
  if (evento.archived_at) return ESTADOS.arquivado;
  if (!evento.published) return ESTADOS.rascunho;
  if (evento.starts_on && hoje < evento.starts_on) return ESTADOS['em-breve'];
  if (evento.ends_on && hoje > evento.ends_on) return ESTADOS.encerrado;
  return ESTADOS['ao-vivo'];
}

/** Aparece na lista principal? Encerrado e arquivado vão para "anteriores". */
export function estaEmCartaz(evento, hoje = hojeISO()) {
  const estado = estadoDoEvento(evento, hoje);
  return estado.chave === 'ao-vivo' || estado.chave === 'em-breve';
}

/**
 * Ordem da lista: ao vivo primeiro, depois o que está por vir (mais próximo
 * antes), depois o resto (mais recente antes).
 */
export function ordenarEventos(eventos, hoje = hojeISO()) {
  const peso = { 'ao-vivo': 0, 'em-breve': 1, rascunho: 2, encerrado: 3, arquivado: 4 };
  return [...(eventos ?? [])].sort((a, b) => {
    const pa = peso[estadoDoEvento(a, hoje).chave] ?? 9;
    const pb = peso[estadoDoEvento(b, hoje).chave] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.starts_on ?? '';
    const db = b.starts_on ?? '';
    if (da !== db) return pa <= 1 ? da.localeCompare(db) : db.localeCompare(da);
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

/** Agrupa por `group_name`, preservando a ordem recebida. Sem grupo vira ''. */
export function agruparEventos(eventos) {
  const grupos = new Map();
  (eventos ?? []).forEach((e) => {
    const chave = e.group_name || '';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(e);
  });
  return [...grupos.entries()].map(([titulo, itens]) => ({ titulo, itens }));
}

/** "14 e 15 de março" / "14 de março" / '' — para o cartão da lista. */
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function periodoEmTexto(inicio, fim) {
  if (!inicio && !fim) return '';
  const partes = (iso) => {
    const [a, m, d] = (iso ?? '').split('-');
    return { ano: a ?? '', mes: MESES[Number(m) - 1] ?? '', dia: String(Number(d)) };
  };
  if (!fim || fim === inicio) {
    const a = partes(inicio);
    return a.mes ? `${a.dia} de ${a.mes}` : '';
  }
  if (!inicio) {
    const b = partes(fim);
    return b.mes ? `até ${b.dia} de ${b.mes}` : '';
  }
  const a = partes(inicio);
  const b = partes(fim);
  if (!a.mes || !b.mes) return '';

  // Anos diferentes precisam aparecer. Sem isto, 15/10/2026 a 15/10/2027 vira
  // "15 e 15 de outubro" — que é como um evento de um ano inteiro se disfarça
  // de evento de um dia. Apareceu em produção no primeiro teste.
  if (a.ano !== b.ano) {
    return `${a.dia} de ${a.mes} de ${a.ano} a ${b.dia} de ${b.mes} de ${b.ano}`;
  }
  if (a.mes === b.mes) {
    return a.dia === b.dia ? `${a.dia} de ${a.mes}` : `${a.dia} e ${b.dia} de ${a.mes}`;
  }
  return `${a.dia} de ${a.mes} a ${b.dia} de ${b.mes}`;
}

// ------------------------------------------------------------
// Slug
// ------------------------------------------------------------

/**
 * Nome do evento -> pedaço de endereço. Sem acento, sem maiúscula, sem
 * pontuação, hífen no lugar do espaço. O banco cobra o mesmo formato
 * (events_slug_check), então o que sai daqui entra lá.
 */
export function slugify(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

