import BoulderSquares from './BoulderSquares';
import StateFlag from './StateFlag';
import { formatScore } from '../lib/scoring';
import { STATE_FLAGS } from '../lib/states';

const FLAGS = {
  BRA: '🇧🇷',
  FRA: '🇫🇷',
  BEL: '🇧🇪',
  JPN: '🇯🇵',
  KOR: '🇰🇷',
  USA: '🇺🇸',
  GBR: '🇬🇧',
  GER: '🇩🇪',
  ESP: '🇪🇸',
  ITA: '🇮🇹',
  ARG: '🇦🇷',
  CHI: '🇨🇱',
  POR: '🇵🇹',
};

function StatusBadge({ status }) {
  if (status === 'dns') {
    return (
      <span className="text-xs font-bold text-alert tracking-wide" title="Did Not Start">
        DNS
      </span>
    );
  }
  return (
    <span className="text-xs text-white/25" title="Ainda não escalou nenhum boulder">
      —
    </span>
  );
}

// Identificacao de origem do atleta na linha do ranking.
// Com o switch de estados ligado, um atleta com UF mostra a bandeira do
// estado; sem UF (ou com o switch desligado) cai para a bandeira do pais.
function Origin({ athlete, showStates }) {
  const uf = String(athlete.state_code || '').toUpperCase();
  if (showStates && STATE_FLAGS[uf]) return <StateFlag uf={uf} className="mr-2" />;
  return <span className="mr-2">{FLAGS[athlete.country_code] ?? '\u{1F3F3}\uFE0F'}</span>;
}

export default function RankingTable({
  ranking,
  title = 'RANKING',
  advanceCount = null,
  showStates = false,
}) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {title ? (
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-widest mb-4 text-white">
          {title}
        </h2>
      ) : null}
      {/* No celular a tabela nao cabe inteira: em vez de cortar (overflow-hidden),
          ela rola na horizontal. */}
      <div className="rounded-lg border border-white/10 overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="bg-panel3 text-xs uppercase text-white/60">
              <th className="py-2.5 px-2 sm:px-3 w-12">#</th>
              <th className="py-2.5 px-2 sm:px-3">Atleta</th>
              <th className="py-2.5 px-2 sm:px-3">Boulders</th>
              <th className="py-2.5 px-2 sm:px-3 text-right w-28">Pontos</th>
              <th className="py-2.5 px-2 sm:px-3 text-center w-16 text-gold/80">Top</th>
              <th className="py-2.5 px-2 sm:px-3 text-center w-16 text-zone/80">Zona</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => {
              const advancing =
                advanceCount && row.rank && row.rank <= advanceCount && row.status === 'ranked';

              return (
                <tr
                  key={row.athlete.id}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? 'bg-white/[0.035]' : 'bg-transparent'
                  } ${advancing ? 'shadow-[inset_3px_0_0_0_#48ec57]' : ''} ${
                    row.status !== 'ranked' ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-2.5 px-2 sm:px-3 font-bold text-gold">
                    {row.rank ?? <StatusBadge status={row.status} />}
                  </td>
                  <td className="py-2.5 px-2 sm:px-3 font-semibold">
                    <Origin athlete={row.athlete} showStates={showStates} />
                    {row.athlete.bib_number ? (
                      <span className="text-white/40 mr-1">#{row.athlete.bib_number}</span>
                    ) : null}
                    {row.athlete.name}
                  </td>
                  <td className="py-2.5 px-2 sm:px-3">
                    <BoulderSquares boulderIds={row.boulderIds} byBoulder={row.byBoulder} />
                  </td>
                  <td className="py-2.5 px-2 sm:px-3 text-right font-bold text-gold text-lg tabular-nums">
                    {formatScore(row.total)}
                  </td>
                  <td className="py-2.5 px-2 sm:px-3 text-center tabular-nums text-gold/90">{row.tops}</td>
                  <td className="py-2.5 px-2 sm:px-3 text-center tabular-nums text-zone/90">{row.zones}</td>
                </tr>
              );
            })}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-3 text-center text-white/50">
                  Nenhum atleta inscrito nesta fase ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {advanceCount ? (
        <p className="text-white/40 text-xs mt-3">
          A faixa verde marca os {advanceCount} primeiros, que avançam para a próxima fase.
        </p>
      ) : null}
    </div>
  );
}
