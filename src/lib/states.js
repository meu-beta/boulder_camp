// ============================================================
// Estados brasileiros — sigla, nome e bandeira
// ============================================================
//
// As bandeiras aqui são versões SIMPLIFICADAS, desenhadas para
// aparecer com ~16px de altura na linha do ranking. Elas reproduzem
// a geometria e as cores oficiais de cada bandeira, mas não o brasão
// em detalhe — num selo desse tamanho um brasão vira um borrão.
// A identificação de verdade é a sigla, que vai sempre ao lado.
//
// Todas usam o mesmo viewBox 30x21 (proporção 10:7, a das bandeiras
// estaduais brasileiras), para alinharem certinho entre si.

export const STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'TO', name: 'Tocantins' },
];

export const STATE_NAMES = Object.fromEntries(STATES.map((s) => [s.uf, s.name]));

/** A UF é válida? Usado para não gravar lixo no banco. */
export function isValidUf(uf) {
  return typeof uf === 'string' && Object.prototype.hasOwnProperty.call(STATE_NAMES, uf.toUpperCase());
}

// Blocos de desenho reaproveitados entre várias bandeiras.
const S = {
  // faixas horizontais de cima para baixo
  hbands: (colors) => {
    const h = 21 / colors.length;
    return colors
      .map((c, i) => `<rect width="30" height="${h}" y="${i * h}" fill="${c}"/>`)
      .join('');
  },
  // faixas verticais da esquerda para a direita
  vbands: (colors) => {
    const w = 30 / colors.length;
    return colors
      .map((c, i) => `<rect width="${w}" height="21" x="${i * w}" fill="${c}"/>`)
      .join('');
  },
  bg: (c) => `<rect width="30" height="21" fill="${c}"/>`,
  star: (cx, cy, r, c = '#fff') =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`,
};

// Cada entrada é o miolo do SVG (sem a tag <svg>), no viewBox 30x21.
// Os desenhos priorizam o que se reconhece de longe: campo, faixas e
// o elemento central dominante de cada bandeira.
export const STATE_FLAGS = {
  // Amarela com faixa diagonal verde no canto inferior e estrela vermelha
  AC: S.bg('#f7e017') + '<path d="M0 21 L30 21 L30 8 Z" fill="#187b30"/>' + S.star(7, 6, 2.6, '#e01b24'),

  // Branco com faixas e brasão central — simplificado
  AL: S.hbands(['#e01b24', '#fff', '#1a4fa0']),

  AM: S.hbands(['#e01b24', '#fff', '#e01b24']) +
    '<rect width="30" height="7" y="7" fill="#fff"/>' +
    '<rect width="12" height="7" y="7" fill="#1a4fa0"/>' +
    S.star(6, 10.5, 1.6),

  AP: S.bg('#009c3b') +
    '<rect width="30" height="4" y="4" fill="#f7e017"/>' +
    '<rect width="30" height="4" y="13" fill="#fff"/>' +
    '<rect width="8" height="21" fill="#000"/>',

  BA: S.hbands(['#fff', '#1a4fa0', '#fff']) +
    '<rect width="30" height="7" y="7" fill="#1a4fa0"/>' +
    '<rect width="12" height="9" fill="#e01b24"/>' +
    '<rect width="12" height="3" y="3" fill="#fff"/>',

  CE: S.bg('#1a4fa0') + '<circle cx="15" cy="10.5" r="6" fill="#fff"/>' +
    '<circle cx="15" cy="10.5" r="4" fill="#009c3b"/>' + S.star(15, 10.5, 1.6, '#f7e017'),

  DF: S.bg('#fff') + '<path d="M15 2 L28 10.5 L15 19 L2 10.5 Z" fill="#009c3b"/>' +
    S.star(15, 10.5, 2.4, '#f7e017'),

  ES: S.hbands(['#1a4fa0', '#fff', '#e91e63']),

  GO: S.hbands(['#f7e017', '#009c3b', '#f7e017', '#009c3b', '#f7e017']) +
    '<rect width="12" height="12" fill="#1a4fa0"/>' + S.star(6, 6, 1.6),

  MA: S.hbands(['#fff', '#e01b24', '#fff', '#000', '#fff', '#e01b24', '#fff', '#000', '#fff']) +
    '<rect width="12" height="9" fill="#1a4fa0"/>' + S.star(6, 4.5, 2),

  MG: S.bg('#fff') + '<path d="M15 4 L24 17 L6 17 Z" fill="#e01b24"/>',

  MS: S.bg('#1a4fa0') + '<path d="M0 0 L30 0 L0 21 Z" fill="#fff"/>' +
    '<path d="M30 0 L30 21 L0 21 Z" fill="#009c3b"/>' + S.star(15, 10.5, 2.6, '#f7e017'),

  MT: S.bg('#1a4fa0') + '<path d="M15 2 L28 10.5 L15 19 L2 10.5 Z" fill="#f7e017"/>' +
    '<circle cx="15" cy="10.5" r="3.4" fill="#fff"/>' + S.star(15, 10.5, 2.4, '#009c3b'),

  PA: S.bg('#e01b24') + '<rect width="30" height="7" y="7" fill="#fff"/>' +
    '<path d="M0 7 L30 14" stroke="#1a4fa0" stroke-width="3" fill="none"/>' + S.star(6, 6, 1.8),

  PB: '<path d="M0 0 L30 0 L30 21 Z" fill="#e01b24"/>' +
    '<path d="M0 0 L0 21 L30 21 Z" fill="#000"/>',

  // Azul em cima (arco-íris, sol e estrela) e branco embaixo com a cruz vermelha
  PE: S.bg('#fff') +
    '<rect width="30" height="10.5" fill="#1a4fa0"/>' +
    '<circle cx="15" cy="8.6" r="2.6" fill="#f7e017"/>' +
    S.star(15, 3.4, 1.4) +
    '<rect x="13.4" y="12" width="3.2" height="8" fill="#e01b24"/>' +
    '<rect x="9" y="14.4" width="12" height="3.2" fill="#e01b24"/>',

  PI: S.hbands(['#009c3b', '#f7e017', '#009c3b', '#f7e017', '#009c3b', '#f7e017', '#009c3b', '#f7e017', '#009c3b', '#f7e017', '#009c3b', '#f7e017', '#009c3b']) +
    '<rect width="12" height="9" fill="#1a4fa0"/>' + S.star(6, 4.5, 2),

  PR: S.bg('#009c3b') + '<path d="M0 6 L30 15 L30 21 L0 21 Z" fill="#e01b24" opacity="0"/>' +
    '<circle cx="15" cy="10.5" r="6.5" fill="#1a4fa0"/>' +
    '<path d="M2 12 L28 9" stroke="#fff" stroke-width="2.4" fill="none"/>' + S.star(15, 8, 1.4),

  RJ: S.bg('#1a4fa0') + '<rect width="30" height="7" y="7" fill="#fff"/>' +
    '<circle cx="15" cy="10.5" r="4.4" fill="#1a4fa0"/>' + S.star(15, 10.5, 2, '#f7e017'),

  RN: S.bg('#fff') + '<rect width="30" height="7" fill="#009c3b"/>' +
    '<rect width="30" height="7" y="14" fill="#f7e017"/>' + S.star(15, 10.5, 2.4, '#1a4fa0'),

  RO: S.bg('#009c3b') + '<rect width="30" height="9" y="6" fill="#fff"/>' +
    '<rect width="30" height="3" y="9" fill="#1a4fa0"/>' + S.star(7, 10.5, 2, '#f7e017'),

  RR: S.bg('#009c3b') + '<rect width="30" height="7" fill="#f7e017"/>' +
    '<rect width="30" height="3" y="14" fill="#e01b24"/>' +
    '<path d="M0 0 L11 10.5 L0 21 Z" fill="#1a4fa0"/>' + S.star(4, 10.5, 1.8),

  RS: S.hbands(['#009c3b', '#e01b24', '#f7e017']) +
    '<path d="M0 0 L30 21" stroke="#fff" stroke-width="0" fill="none"/>' +
    '<circle cx="15" cy="10.5" r="4" fill="#fff"/>' + S.star(15, 10.5, 2, '#009c3b'),

  SC: S.hbands(['#e01b24', '#fff', '#e01b24']) +
    '<rect width="30" height="7" y="7" fill="#fff"/>' +
    '<path d="M15 4 L22 10.5 L15 17 L8 10.5 Z" fill="#009c3b"/>' + S.star(15, 10.5, 1.8, '#f7e017'),

  SE: S.hbands(['#009c3b', '#fff', '#f7e017', '#fff', '#009c3b']) +
    '<rect width="11" height="21" fill="#1a4fa0"/>' +
    S.star(3.5, 5, 1.2) + S.star(7.5, 8, 1.2) + S.star(3.5, 13, 1.2) + S.star(7.5, 16, 1.2) + S.star(5.5, 10.5, 1.2),

  // São Paulo: 13 faixas pretas e brancas, cantão vermelho com o mapa
  SP: S.hbands([
    '#000', '#fff', '#000', '#fff', '#000', '#fff', '#000',
    '#fff', '#000', '#fff', '#000', '#fff', '#000',
  ]) +
    '<rect width="12" height="9.7" fill="#e01b24"/>' +
    '<circle cx="6" cy="4.8" r="3" fill="#fff"/>' +
    '<circle cx="6" cy="4.8" r="1.8" fill="#1a4fa0"/>',

  TO: S.bg('#f7e017') + '<rect width="30" height="6" y="7.5" fill="#1a4fa0"/>' +
    '<rect width="30" height="6" y="7.5" fill="#1a4fa0"/>' +
    '<path d="M0 0 L30 0 L30 4 L0 4 Z" fill="#fff"/>' +
    '<path d="M0 17 L30 17 L30 21 L0 21 Z" fill="#fff"/>' + S.star(15, 10.5, 2, '#f7e017'),
};

/** SVG completo da bandeira de uma UF, como string. Null se a UF não existir. */
export function stateFlagSvg(uf) {
  const key = String(uf || '').toUpperCase();
  const body = STATE_FLAGS[key];
  if (!body) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 21">${body}</svg>`;
}
