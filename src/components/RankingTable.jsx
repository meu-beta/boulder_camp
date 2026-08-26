import BoulderSquares from './BoulderSquares';
import { formatScore } from '../lib/scoring';

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
      <span className="text-xs font-bold text-red-400/80 tracking-wide" title="Did Not Start">
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

export default function RankingTable({ ranking, title = 'RANKING', advanceCount = null }) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {title ? (
        <h2 className="text-3xl font-extrabold tracking-widest mb-4 text-white">{title}</h2>
      ) : null}
      <div className="rounded-lg overflow-hidden border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-panel2 text-xs uppercase text-white/60">
              <th className="py-2 px-3 w-12">#</th>
              <th className="py-2 px-3">Atleta</th>
              <th className="py-2 px-3">Boulders</th>
              <th className="py-2 px-3 text-right w-28">Pontos</th>
              <th className="py-2 px-3 text-center w-16">Top</th>
              <th className="py-2 px-3 text-center w-16">Zona</th>
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
                    index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
                  } ${advancing ? 'shadow-[inset_3px_0_0_0_#f2c14e]' : ''} ${
                    row.status !== 'ranked' ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-bold text-gold">
                    {row.rank ?? <StatusBadge status={row.status} />}
                  </td>
                  <td className="py-2 px-3 font-semibold">
                    <span className="mr-2">{FLAGS[row.athlete.country_code] ?? '🏳️'}</span>
                    {row.athlete.bib_number ? (
                      <span className="text-white/40 mr-1">#{row.athlete.bib_number}</span>
                    ) : null}
                    {row.athlete.name}
                  </td>
                  <td className="py-2 px-3">
                    <BoulderSquares boulderIds={row.boulderIds} byBoulder={row.byBoulder} />
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-gold text-lg tabular-nums">
                    {formatScore(row.total)}
                  </td>
                  <td className="py-2 px-3 text-center tabular-nums">{row.tops}</td>
                  <td className="py-2 px-3 text-center tabular-nums">{row.zones}</td>
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
          A faixa dourada marca os {advanceCount} primeiros, que avançam para a próxima fase.
        </p>
      ) : null}
    </div>
  );
}
