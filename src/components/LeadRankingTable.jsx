import StateFlag from './StateFlag';
import { STATE_FLAGS } from '../lib/states';
import { formatRoute, formatTotal } from '../lib/scoringLead';

// Tabela de ranking da Guiada.
//
// É um componente separado do RankingTable do boulder de propósito: as colunas
// não têm nada em comum (lá é Pontos/Top/Zona, aqui é Via/TP/Tempo) e o boulder
// já está rodando em evento real — não vale o risco de deixar os dois no mesmo
// componente cheio de condicionais.
//
// Duas formas, escolhidas pelo número de vias da fase:
//   2 vias -> qualificatória: Via 1, Via 2 e TP (15.5)
//   1 via  -> semifinal/final: Resultado e Tempo (15.6)

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

function Origin({ athlete, showStates }) {
  const uf = String(athlete.state_code || '').toUpperCase();
  if (showStates && STATE_FLAGS[uf]) return <StateFlag uf={uf} className="mr-2" />;
  return <span className="mr-2">{FLAGS[athlete.country_code] ?? '🏳️'}</span>;
}

function StatusBadge({ status }) {
  if (status === 'dns') {
    return (
      <span
        className="text-xs font-bold text-alert tracking-wide"
        title="Não largou nas duas vias — sem ranking na rodada (15.5c)"
      >
        DNS
      </span>
    );
  }
  return (
    <span className="text-xs text-white/25" title="Ainda não escalou">
      —
    </span>
  );
}

/** mm:ss a partir de segundos. */
function formatTime(seconds) {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function LeadRankingTable({
  ranking,
  title = 'RANKING',
  advanceCount = null,
  showStates = false,
}) {
  // A fase é a qualificatória quando os atletas têm duas vias lançadas.
  const vias = ranking?.[0]?.byRoute?.length ?? 1;
  const qualificatoria = vias >= 2;
  const colunas = qualificatoria ? vias + 1 : 2;
  const total = 2 + colunas;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {title ? (
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-widest mb-4 text-white">
          {title}
        </h2>
      ) : null}

      <div className="rounded-lg border border-white/10 overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="bg-panel3 text-xs uppercase text-white/60">
              <th className="py-2.5 px-2 sm:px-3 w-12">#</th>
              <th className="py-2.5 px-2 sm:px-3">Atleta</th>
              {qualificatoria ? (
                <>
                  {Array.from({ length: vias }, (_, i) => (
                    <th key={i} className="py-2.5 px-2 sm:px-3 text-center w-24 text-zone/80">
                      Via {i + 1}
                    </th>
                  ))}
                  <th
                    className="py-2.5 px-2 sm:px-3 text-right w-24 text-gold/80"
                    title="Total de Pontos: raiz quadrada de P1 x P2 (15.5b). Menor é melhor."
                  >
                    TP
                  </th>
                </>
              ) : (
                <>
                  <th className="py-2.5 px-2 sm:px-3 text-center w-28 text-gold/80">Resultado</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right w-24 text-white/50">Tempo</th>
                </>
              )}
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

                  {qualificatoria ? (
                    <>
                      {row.byRoute.map((via, i) => (
                        <td key={i} className="py-2.5 px-2 sm:px-3 text-center tabular-nums">
                          <span className={via.score?.top ? 'text-gold font-bold' : 'text-white'}>
                            {formatRoute(via.score)}
                          </span>
                          {via.points != null && (
                            <span
                              className="text-white/30 text-[11px] ml-1.5"
                              title="Pontos de ranking desta via (15.5a)"
                            >
                              {via.points}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="py-2.5 px-2 sm:px-3 text-right font-bold text-gold text-lg tabular-nums">
                        {row.total == null ? '—' : formatTotal(row.total)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-2 sm:px-3 text-center text-lg font-bold tabular-nums">
                        <span className={row.score?.top ? 'text-gold' : 'text-white'}>
                          {formatRoute(row.score)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums text-white/50">
                        {formatTime(row.time)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {ranking.length === 0 && (
              <tr>
                <td colSpan={total} className="py-6 px-3 text-center text-white/50">
                  Nenhum atleta inscrito nesta fase ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qualificatoria ? (
        <p className="text-white/30 text-xs mt-3">
          TP é a raiz quadrada de P1 × P2, e menor TP fica na frente. O número pequeno ao lado de
          cada via é a colocação naquela via.
        </p>
      ) : null}

      {advanceCount ? (
        <p className="text-white/40 text-xs mt-2">
          A faixa verde marca os {advanceCount} primeiros, que avançam para a próxima fase.
        </p>
      ) : null}
    </div>
  );
}
