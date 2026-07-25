import BoulderSquares from './BoulderSquares';

const FLAGS = {
  FRA: '🇫🇷',
  BEL: '🇧🇪',
  JPN: '🇯🇵',
  KOR: '🇰🇷',
  BRA: '🇧🇷',
  USA: '🇺🇸',
  GBR: '🇬🇧',
  GER: '🇩🇪',
  ESP: '🇪🇸',
  ITA: '🇮🇹',
};

export default function RankingTable({ ranking, title = 'FINAL' }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-extrabold tracking-widest mb-4 text-white">{title}</h2>
      <div className="rounded-lg overflow-hidden border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-panel2 text-xs uppercase text-white/60">
              <th className="py-2 px-3 w-10">#</th>
              <th className="py-2 px-3">Atleta</th>
              <th className="py-2 px-3">Boulders</th>
              <th className="py-2 px-3 text-center">Top</th>
              <th className="py-2 px-3 text-center">Zona</th>
              <th className="py-2 px-3 text-center">Top Tent.</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, i) => (
              <tr
                key={row.athlete.id}
                className={`${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} border-t border-white/5`}
              >
                <td className="py-2 px-3 font-bold text-gold">{row.rank}</td>
                <td className="py-2 px-3 font-semibold">
                  <span className="mr-2">{FLAGS[row.athlete.country_code] ?? '🏳️'}</span>
                  {row.athlete.name}
                </td>
                <td className="py-2 px-3">
                  <BoulderSquares boulderIds={row.boulderIds} byBoulder={row.byBoulder} />
                </td>
                <td className="py-2 px-3 text-center">{row.tops}</td>
                <td className="py-2 px-3 text-center">{row.zones}</td>
                <td className="py-2 px-3 text-center">{row.topAttempts}</td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-3 text-center text-white/50">
                  Nenhum atleta cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
