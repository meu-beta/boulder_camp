// Botão de tela cheia. Em tela cheia ele fica quase invisível e só reaparece
// quando o mouse passa por cima — assim não polui a projeção, mas continua
// alcançável para sair. Sair também funciona com a tecla Esc.
export default function FullscreenButton({ isFullscreen, onToggle, className = '' }) {
  return (
    <button
      onClick={onToggle}
      title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia — para projetar'}
      aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
        isFullscreen
          ? 'opacity-20 hover:opacity-100 border-white/20 text-white/70'
          : 'border-white/20 text-white/70 hover:text-white hover:border-white/40'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        {isFullscreen ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
      {isFullscreen ? 'Sair' : 'Tela cheia'}
    </button>
  );
}
