import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../supabaseClient';
import { beepCountdown, beepEnd, beepOneMinute, unlockAudio } from '../lib/beep';
import { useFullscreen } from '../lib/useFullscreen';
import { GERAL, rotas, useModalidade } from '../lib/modalidade';
import FullscreenButton from '../components/FullscreenButton';

// Cronômetro da competição, pensado para ser projetado.
//
// O estado fica no Supabase, em `timer_state`, e existe UMA LINHA POR
// CATEGORIA. Isso importa: até esta versão a tabela era um singleton, e com
// Boulder e Guiada no mesmo dia o árbitro que zerasse um zeraria o outro no
// meio de uma tentativa. Cada tela agora lê e escreve só na linha da sua
// competição; todas as telas da mesma competição continuam em sincronia.
//
// Bips: dois em 1 minuto restante, um a cada segundo nos 5 finais,
// e um longo no zero.

const PRESETS = [4, 5, 6];

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AthleteTimer() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const mod = useModalidade();
  const r = rotas(mod.slug);

  const [categoryId, setCategoryId] = useState(null);
  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [customMinutes, setCustomMinutes] = useState('');
  const lastBeepedSecond = useRef(null);
  const { isFullscreen, toggle, supported } = useFullscreen();

  // ---- descobre a categoria desta modalidade ----
  useEffect(() => {
    let vivo = true;
    supabase
      .from('categories')
      .select('id')
      .eq('name', mod.categoryName)
      .single()
      .then(({ data }) => {
        if (vivo && data) setCategoryId(data.id);
      });
    return () => {
      vivo = false;
    };
  }, [mod.categoryName]);

  // ---- carrega e escuta o estado da SUA competição ----
  const load = useCallback(async () => {
    if (!categoryId) return;
    const { data } = await supabase
      .from('timer_state')
      .select('*')
      .eq('category_id', categoryId)
      .single();
    if (data) setState(data);
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return undefined;
    load();

    // O Realtime avisa qualquer mudança na tabela; `load` relê só a linha
    // desta categoria, então mexer no cronômetro da outra competição não
    // altera nada aqui.
    const channel = supabase
      .channel(`timer-${mod.slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, load, mod.slug]);

  // ---- tique local, 10x por segundo para não perder o segundo cheio ----
  useEffect(() => {
    if (!state) return undefined;

    const tick = () => {
      if (state.running && state.ends_at) {
        const diff = (new Date(state.ends_at).getTime() - Date.now()) / 1000;
        setRemaining(Math.max(0, Math.ceil(diff)));
      } else {
        setRemaining(state.remaining_seconds ?? 0);
      }
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state]);

  // ---- bips ----
  useEffect(() => {
    if (!state?.running) {
      lastBeepedSecond.current = null;
      return;
    }
    if (lastBeepedSecond.current === remaining) return;
    lastBeepedSecond.current = remaining;

    if (remaining === 60) beepOneMinute();
    else if (remaining <= 5 && remaining >= 1) beepCountdown();
    else if (remaining === 0) beepEnd();
  }, [remaining, state?.running]);

  // ---- ações ----
  const patch = async (changes) => {
    unlockAudio();
    if (!categoryId) return;
    await supabase
      .from('timer_state')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('category_id', categoryId);
  };

  const handleStart = () => {
    const seconds = remaining > 0 ? remaining : state?.duration_seconds ?? 240;
    patch({
      running: true,
      ends_at: new Date(Date.now() + seconds * 1000).toISOString(),
      remaining_seconds: seconds,
    });
  };

  const handlePause = () => patch({ running: false, remaining_seconds: remaining, ends_at: null });

  const handleReset = () =>
    patch({
      running: false,
      ends_at: null,
      remaining_seconds: state?.duration_seconds ?? 240,
    });

  const handleSetMinutes = (minutes) => {
    const seconds = Math.round(minutes * 60);
    patch({
      running: false,
      ends_at: null,
      duration_seconds: seconds,
      remaining_seconds: seconds,
    });
    setCustomMinutes('');
  };

  const handleLogout = async () => {
    await signOut();
    navigate(GERAL.loginControle);
  };

  const running = Boolean(state?.running);
  const finished = remaining === 0;
  const critical = remaining <= 5 && remaining > 0;
  const warning = remaining <= 60 && remaining > 5;

  const digitColor = finished
    ? 'text-alert'
    : critical
    ? 'text-alert/80'
    : warning
    ? 'text-gold'
    : 'text-white';

  return (
    <div className="min-h-screen bg-panel flex flex-col">
      {/* Cabeçalho discreto — some por completo em tela cheia */}
      <div className="relative z-20 flex items-center justify-between px-6 py-3 text-sm text-white/40">
        {/* Em tela cheia some tudo menos o botão de sair da tela cheia. Fora
            dela, a etiqueta colorida diz de qual competição é este cronômetro —
            projetado numa parede, os dois relógios seriam idênticos sem ela. */}
        <span className={`flex items-center gap-2 ${isFullscreen ? 'invisible' : ''}`}>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide uppercase ${mod.corFaixa} ${mod.corTexto}`}
          >
            {mod.label}
          </span>
          <span className="uppercase tracking-widest text-xs">Cronômetro</span>
        </span>
        <div className="flex gap-4 items-center">
          {supported && <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />}
          {isFullscreen ? null : (
            <>
              {mod.temFila && (
                <Link to={r.fila} className="hover:text-white">
                  Fila
                </Link>
              )}
              <Link to={r.cadastro} className="hover:text-white">
                Cadastro
              </Link>
              <Link to={r.fases} className="hover:text-white">
                Fases
              </Link>
              <button onClick={handleLogout} className="hover:text-white">
                Sair
              </button>
            </>
          )}
        </div>
      </div>

      {/* O relógio, ocupando tudo.
          Com a fonte gigante os dígitos transbordam da própria caixa e passavam
          por cima do cabeçalho, roubando o clique do botão de tela cheia.
          pointer-events-none devolve o clique para quem está embaixo. */}
      <div className="relative z-0 flex-1 flex items-center justify-center px-4 pointer-events-none">
        <div
          className={`timer-digits font-extrabold tabular-nums transition-colors ${digitColor} ${
            critical ? 'animate-pulse' : ''
          }`}
          style={{ fontSize: isFullscreen ? 'min(44vw, 78vh)' : 'min(38vw, 60vh)' }}
        >
          {formatClock(remaining)}
        </div>
      </div>

      {/* Controles */}
      <div
        className={`px-6 pb-10 flex flex-col items-center gap-5 transition-opacity duration-300 ${
          isFullscreen ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : ''
        }`}
      >
        <div className="flex flex-wrap gap-3 justify-center">
          {running ? (
            <button
              onClick={handlePause}
              className="px-10 py-4 rounded-xl bg-white/10 text-white font-bold text-xl hover:bg-white/20"
            >
              Pausar
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={remaining === 0}
              className="px-10 py-4 rounded-xl bg-gold text-panel font-bold text-xl hover:opacity-90 disabled:opacity-30"
            >
              Iniciar
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-10 py-4 rounded-xl border border-white/20 text-white font-bold text-xl hover:bg-white/10"
          >
            Zerar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-white/40 text-sm mr-1">Definir tempo:</span>
          {PRESETS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => handleSetMinutes(minutes)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                state?.duration_seconds === minutes * 60
                  ? 'bg-gold text-panel border-gold'
                  : 'border-white/20 text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              {minutes} min
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={60}
            placeholder="outro"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && Number(customMinutes) > 0) {
                handleSetMinutes(Number(customMinutes));
              }
            }}
            className="w-24 px-3 py-2 rounded-lg bg-panel2 border border-white/20 text-white text-sm focus:border-gold outline-none"
          />
          <button
            onClick={() => Number(customMinutes) > 0 && handleSetMinutes(Number(customMinutes))}
            disabled={!(Number(customMinutes) > 0)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold disabled:opacity-30"
          >
            Aplicar
          </button>
        </div>

        <p className={`text-white/25 text-xs text-center max-w-md ${isFullscreen ? 'hidden' : ''}`}>
          Bip duplo ao faltar 1 minuto, bip a cada um dos 5 segundos finais e bip longo no zero.
          Clique em qualquer botão uma vez para o navegador liberar o som.
        </p>
      </div>
    </div>
  );
}
