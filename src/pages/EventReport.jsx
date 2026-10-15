import { Link } from 'react-router-dom';
import { useEvent } from '../lib/useEvent';
import { disciplineOf } from '../lib/disciplines';
import { GERAL, periodoEmTexto, rotas, useEventoAtual } from '../lib/evento';

// Relatório final do evento.
//
// É o documento que vai para a federação, e é a razão de o evento poder ser
// arquivado sem dó: o resultado fica aqui, em endereço permanente, legível por
// qualquer um e pronto para virar PDF pelo próprio navegador.
//
// Duas decisões de propósito:
//
// 1. FUNDO CLARO. O resto do sistema é escuro porque vive em telão de ginásio;
//    isto é papel. Impressora não imprime fundo preto por padrão, e um
//    relatório que sai com as linhas invisíveis não serve para nada.
//
// 2. A pontuação vem das LINHAS DO BANCO, não do cálculo do ranking. A ordem e
//    o total vêm do ranking, mas cada célula de bloco ou via mostra o que o
//    árbitro efetivamente lançou. Num questionamento, é isso que importa.

/** "TOP 2" / "ZONA 3" / "tentou" / "—" para um bloco. */
function celulaBoulder(score) {
  if (!score) return '—';
  if (score.top) return `TOP ${score.top_attempts || '?'}`;
  if (score.zone) return `ZONA ${score.zone_attempts || '?'}`;
  if (score.attempted || (score.attempts ?? 0) > 0) return 'tentou';
  return '—';
}

/** "TOP" / "35+" / "35" / "—" para uma via, no mesmo formato que o árbitro anota. */
function celulaVia(score) {
  if (!score) return '—';
  if (score.top) return 'TOP';
  if (score.hold_value == null || score.hold_value === '') return score.attempted ? 'tentou' : '—';
  return `${score.hold_value}${score.hold_used ? '+' : ''}`;
}

function Fase({ round, climbs, scores, ranking, guiada, formatTotal }) {
  const porAtleta = new Map();
  scores.forEach((s) => {
    if (!porAtleta.has(s.athlete_id)) porAtleta.set(s.athlete_id, new Map());
    porAtleta.get(s.athlete_id).set(s.boulder_id, s);
  });

  const rotulo = guiada ? 'V' : 'B';

  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="text-lg font-bold uppercase tracking-wide">{round.name}</h2>
      {round.advance_count ? (
        <p className="text-xs text-neutral-500 mt-0.5">
          Avançam para a fase seguinte: {round.advance_count}
        </p>
      ) : null}

      {ranking.length === 0 ? (
        <p className="text-sm text-neutral-500 mt-2">Nenhum atleta inscrito nesta fase.</p>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y border-neutral-300 text-left">
                <th className="py-1.5 pr-2 font-semibold w-10">#</th>
                <th className="py-1.5 pr-2 font-semibold w-12">Nº</th>
                <th className="py-1.5 pr-2 font-semibold">Atleta</th>
                <th className="py-1.5 pr-2 font-semibold w-10">UF</th>
                {climbs.map((c) => (
                  <th key={c.id} className="py-1.5 px-2 font-semibold text-center whitespace-nowrap">
                    {rotulo}
                    {c.number}
                  </th>
                ))}
                <th className="py-1.5 pl-2 font-semibold text-right whitespace-nowrap">
                  {guiada ? 'TP' : 'Pontos'}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => {
                const atleta = row.athlete ?? {};
                const meus = porAtleta.get(atleta.id) ?? new Map();
                const fora = row.status === 'dns';
                return (
                  <tr
                    key={atleta.id}
                    className={`border-b border-neutral-200 ${fora ? 'text-neutral-400' : ''}`}
                  >
                    <td className="py-1.5 pr-2 font-semibold">{fora ? '—' : row.rank}</td>
                    <td className="py-1.5 pr-2">{atleta.bib_number ?? ''}</td>
                    <td className="py-1.5 pr-2">{atleta.name ?? ''}</td>
                    <td className="py-1.5 pr-2">{atleta.state_code ?? ''}</td>
                    {climbs.map((c) => (
                      <td key={c.id} className="py-1.5 px-2 text-center whitespace-nowrap">
                        {guiada ? celulaVia(meus.get(c.id)) : celulaBoulder(meus.get(c.id))}
                      </td>
                    ))}
                    <td className="py-1.5 pl-2 text-right font-semibold whitespace-nowrap">
                      {fora ? 'DNS' : formatTotal(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function EventReport() {
  const ev = useEventoAtual();
  const { rounds, athletes, boulders, loading, getRound, evento } = useEvent(ev.slug);
  const disciplina = disciplineOf(evento);
  const guiada = ev.modality === 'guiada';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-500 text-sm">Montando o relatório…</p>
      </div>
    );
  }

  const ordenadas = [...rounds].sort((a, b) => a.sequence - b.sequence);
  const periodo = periodoEmTexto(ev.starts_on, ev.ends_on);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Barra de ações: some na impressão. */}
      <div className="print:hidden border-b border-neutral-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-sm">
          <Link to={rotas(ev.slug).ranking} className="text-neutral-500 hover:text-neutral-900">
            Voltar ao ranking
          </Link>
          <Link to={GERAL.hub} className="text-neutral-500 hover:text-neutral-900">
            Todos os eventos
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto bg-neutral-900 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Imprimir / salvar em PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="border-b-2 border-neutral-900 pb-4">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Relatório final · {ev.label}
          </p>
          <h1 className="text-2xl font-bold mt-1">{ev.name}</h1>
          <div className="text-sm text-neutral-600 mt-2 space-y-0.5">
            {ev.federation ? <p>{ev.federation}</p> : null}
            {ev.group_name ? <p>{ev.group_name}</p> : null}
            {periodo ? <p>{periodo}</p> : null}
            {ev.manager_name ? <p>Responsável: {ev.manager_name}</p> : null}
          </div>
        </header>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg font-bold uppercase tracking-wide">
            Inscritos ({athletes.length})
          </h2>
          {athletes.length === 0 ? (
            <p className="text-sm text-neutral-500 mt-2">Nenhum atleta cadastrado.</p>
          ) : (
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="border-y border-neutral-300 text-left">
                  <th className="py-1.5 pr-2 font-semibold w-12">Nº</th>
                  <th className="py-1.5 pr-2 font-semibold">Atleta</th>
                  <th className="py-1.5 pr-2 font-semibold w-10">UF</th>
                </tr>
              </thead>
              <tbody>
                {[...athletes]
                  .sort((a, b) => (a.bib_number ?? 9999) - (b.bib_number ?? 9999))
                  .map((a) => (
                    <tr key={a.id} className="border-b border-neutral-200">
                      <td className="py-1.5 pr-2">{a.bib_number ?? ''}</td>
                      <td className="py-1.5 pr-2">{a.name}</td>
                      <td className="py-1.5 pr-2">{a.state_code ?? ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>

        {ordenadas.map((round) => {
          const dados = getRound(round.id);
          return (
            <Fase
              key={round.id}
              round={round}
              climbs={dados.boulders}
              scores={dados.scores}
              ranking={dados.ranking}
              guiada={guiada}
              formatTotal={disciplina.formatTotal}
            />
          );
        })}

        <footer className="mt-10 pt-4 border-t border-neutral-300 text-xs text-neutral-500">
          <p>
            {guiada
              ? 'Guiada: TP = raiz quadrada do produto das duas colocações da qualificatória. Menor é melhor. "+" indica agarra usada.'
              : 'Boulder: a nota de cada bloco é a maior entre zona e top, descontando 0,1 por tentativa anterior. Maior é melhor.'}
          </p>
          <p className="mt-1">
            Gerado pelo Meu Beta Comp · {boulders.length} {guiada ? 'vias' : 'blocos'} no total ·
            meubeta.com
          </p>
        </footer>
      </div>
    </div>
  );
}
