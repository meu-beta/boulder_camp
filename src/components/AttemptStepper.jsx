// Seletor de número para o painel do árbitro.
//
// POR QUE ELE EXISTE: o campo anterior era um <input type="number"> que
// normalizava a cada tecla —
//
//     onChange={(e) => update({ zone_attempts: Math.max(1, Number(e.target.value) || 1) })}
//
// Quando o árbitro apagava o número para digitar outro, o campo ficava vazio
// por um instante e `Number('') || 1` devolvia 1 imediatamente. No computador
// isso passava batido, porque dá para selecionar tudo e substituir num gesto
// só. No celular, tocar no campo apenas posiciona o cursor: ele apagava, o 1
// voltava sozinho, e não havia como chegar no número desejado.
//
// Aqui o valor pode ficar VAZIO enquanto se digita, e só é normalizado quando
// o dedo sai do campo. E, principalmente, existem os botões − e +: num evento,
// o árbitro está de pé, de luva ou com a mão suja de magnésio, e quase sempre
// só precisa somar uma tentativa. Um toque grande resolve sem teclado.

/**
 * Regra de digitação, isolada para poder ser testada.
 *
 * Aceita só dígitos (colar "3 tentativas" vira 3), deixa passar o vazio
 * enquanto o árbitro está no meio da edição e limita o teto. NÃO aplica o
 * piso aqui de propósito: se aplicasse, digitar "10" a partir do zero seria
 * impossível — o "1" viraria o mínimo antes do "0" chegar.
 */
export function normalizarDigitacao(texto, { max = 99 } = {}) {
  const digitos = String(texto ?? '').replace(/\D/g, '').slice(0, 2);
  if (digitos === '') return '';
  return Math.min(max, Number(digitos));
}

/**
 * Ao sair do campo o valor vira número de verdade: abaixo do piso vira o piso.
 *
 * `permitirVazio` existe porque os dois usos são diferentes. No Boulder, "zona
 * na tentativa nenhuma" não quer dizer nada — se está marcado, foi em alguma
 * tentativa, e vazio vira 1. Na Guiada, o campo da agarra vazio significa
 * "ainda não anotei"; se ele virasse 0 sozinho, um toque acidental marcaria o
 * atleta como tendo largado na via.
 */
export function normalizarSaida(valor, { min = 1, permitirVazio = false } = {}) {
  const vazio = valor === '' || valor == null;
  if (vazio && permitirVazio) return '';
  const n = vazio ? NaN : Number(valor);
  return Number.isFinite(n) && n >= min ? n : min;
}

const BOTAO =
  'w-11 h-11 shrink-0 flex items-center justify-center rounded-lg border text-xl font-bold ' +
  'border-white/20 text-white/80 select-none transition ' +
  'active:bg-white/20 hover:border-white/40 disabled:opacity-25 disabled:pointer-events-none';

export default function AttemptStepper({
  value,
  onChange,
  disabled = false,
  min = 1,
  max = 99,
  permitirVazio = false,
  title,
  ariaLabel = 'Número de tentativas',
}) {
  const atual = value === '' || value == null ? null : Number(value);

  const passo = (delta) => {
    const base = atual ?? min;
    onChange(Math.min(max, Math.max(min, base + delta)));
  };

  return (
    <div className="flex items-center gap-1.5" title={title}>
      <button
        type="button"
        disabled={disabled || (atual ?? min) <= min}
        onClick={() => passo(-1)}
        aria-label="Uma tentativa a menos"
        className={BOTAO}
      >
        −
      </button>

      {/* type="text" e não "number": no celular o campo numérico traz setinhas
          e comportamentos próprios de cada navegador. inputMode garante o
          teclado numérico sem nada disso. */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={value === '' || value == null ? '' : value}
        onChange={(e) => onChange(normalizarDigitacao(e.target.value, { max }))}
        onBlur={() => onChange(normalizarSaida(value, { min, permitirVazio }))}
        onFocus={(e) => e.target.select()}
        aria-label={ariaLabel}
        className="w-14 h-11 px-1 rounded-lg bg-panel border border-white/20 focus:border-gold outline-none text-base text-center font-bold tabular-nums disabled:opacity-25"
      />

      <button
        type="button"
        disabled={disabled || (atual ?? min) >= max}
        onClick={() => passo(1)}
        aria-label="Uma tentativa a mais"
        className={BOTAO}
      >
        +
      </button>
    </div>
  );
}
