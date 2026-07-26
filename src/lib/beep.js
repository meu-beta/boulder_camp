// Bips gerados na hora pelo navegador (Web Audio API) — sem arquivos de
// áudio, então funciona offline e não depende de nada carregar.
//
// Navegadores só liberam áudio depois de um clique do usuário. Por isso
// o cronômetro chama `unlockAudio()` no primeiro toque em qualquer botão.

let context = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!context) context = new AudioCtx();
  return context;
}

/** Chame uma vez a partir de um clique para destravar o áudio. */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

/** Um bip. `frequency` em Hz, `duration` em segundos. */
export function beep({ frequency = 880, duration = 0.18, volume = 0.5 } = {}) {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  // Envelope curto para não estalar no início nem no fim.
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.setValueAtTime(volume, now + duration - 0.04);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/** Aviso de 1 minuto restante: dois bips médios. */
export function beepOneMinute() {
  beep({ frequency: 660, duration: 0.22 });
  setTimeout(() => beep({ frequency: 660, duration: 0.22 }), 300);
}

/** Contagem final: um bip curto e agudo por segundo. */
export function beepCountdown() {
  beep({ frequency: 880, duration: 0.15 });
}

/** Fim do tempo: bip longo e grave. */
export function beepEnd() {
  beep({ frequency: 440, duration: 1.1, volume: 0.6 });
}
