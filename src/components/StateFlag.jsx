import { STATE_FLAGS, STATE_NAMES } from '../lib/states';

// Selo de estado para o ranking: bandeirinha + sigla.
//
// A sigla é o que identifica de verdade — a bandeira com 16px de altura
// serve como cor/reconhecimento rápido, não como leitura de detalhe.
// Se a UF não existir, não desenha nada (o chamador cai para o país).
export default function StateFlag({ uf, className = '' }) {
  const key = String(uf || '').toUpperCase();
  const body = STATE_FLAGS[key];
  if (!body) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle ${className}`}
      title={STATE_NAMES[key] ?? key}
    >
      <svg
        viewBox="0 0 30 21"
        className="w-[22px] h-[15.4px] shrink-0 rounded-[2px] ring-1 ring-white/25"
        role="img"
        aria-label={`Bandeira de ${STATE_NAMES[key] ?? key}`}
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <span className="text-white/55 text-xs font-semibold tracking-wide tabular-nums">
        {key}
      </span>
    </span>
  );
}
