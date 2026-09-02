// Abas das fases do campeonato. A fase que está acontecendo agora
// ganha um ponto dourado pulsando ao lado do nome.
//
// `abbr` é a letra da escalada na modalidade: B de Boulder, V de Via. O padrão
// é B para que nada mude nas telas de boulder que não passam a propriedade.
export default function PhaseTabs({ rounds, selectedId, onSelect, abbr = 'B' }) {
  if (!rounds || rounds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {rounds.map((round) => {
        const selected = round.id === selectedId;
        return (
          <button
            key={round.id}
            onClick={() => onSelect(round.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${
              selected
                ? 'bg-gold text-panel border-gold'
                : 'bg-panel2 text-white/70 border-white/10 hover:text-white hover:border-white/30'
            }`}
          >
            <span className="flex items-center gap-2">
              {round.is_active && (
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    selected ? 'bg-panel' : 'bg-gold'
                  }`}
                  title="Fase em andamento"
                />
              )}
              {round.name}
              <span className={selected ? 'text-panel/60' : 'text-white/30'}>
                {round.boulder_count}
                {abbr}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
