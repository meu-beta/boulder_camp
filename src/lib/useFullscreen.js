import { useCallback, useEffect, useState } from 'react';

// Tela cheia para as telas do evento (cronômetro e ranking).
//
// Duas coisas acontecem juntas aqui:
//
// 1. Fullscreen — tira a barra do navegador, que num telão só rouba espaço.
//    Só funciona a partir de um clique: navegador nenhum deixa uma página
//    entrar em tela cheia sozinha. Por isso é sempre um botão.
//
// 2. Wake Lock — impede a tela de apagar sozinha. Num telão que fica horas
//    ligado mostrando o ranking isso é o que evita a tela dormir no meio da
//    competição. A API não existe em todos os navegadores e o sistema pode
//    revogar a trava a qualquer momento (ao trocar de aba, por exemplo),
//    então ela é re-adquirida quando a página volta a ficar visível.

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(fullscreenElement()));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // Mantém a tela acesa enquanto estiver em tela cheia.
  useEffect(() => {
    if (!isFullscreen || !navigator.wakeLock) return undefined;

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // Sem permissão ou sem suporte: seguimos sem a trava.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [isFullscreen]);

  const toggle = useCallback(async () => {
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const el = document.documentElement;
        const enter = el.requestFullscreen || el.webkitRequestFullscreen;
        if (enter) await enter.call(el);
      }
    } catch {
      // O navegador pode recusar (iPhone, por exemplo). O botão volta ao
      // normal sozinho porque o estado vem do evento fullscreenchange.
    }
  }, []);

  const supported =
    typeof document !== 'undefined' &&
    Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

  return { isFullscreen, toggle, supported };
}
