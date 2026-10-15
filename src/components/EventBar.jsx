import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { GERAL, rotas, useEventoAtual } from '../lib/evento';

// Faixa de identidade, sempre no topo das telas de trabalho.
//
// Ela existe por um motivo operacional, não estético: num dia com oito eventos
// abertos — Boulder e Guiada, várias categorias — o árbitro precisa saber, num
// olhar, em qual deles está lançando pontuação. Por isso a faixa é colorida
// pela modalidade e carrega o nome do evento por extenso.
//
// Não há atalho para trocar de evento daqui. Para trocar é preciso voltar à
// tela de escolha, de propósito: trocar sem querer é o erro mais caro do dia.

const AREAS = {
  staff: { nome: 'Arbitragem', voltar: GERAL.escolher('staff') },
  controle: { nome: 'Controle de Atletas', voltar: GERAL.escolher('controle') },
};

export default function EventBar({ area, subtitulo, atual }) {
  const ev = useEventoAtual();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const info = AREAS[area] ?? AREAS.staff;
  const r = rotas(ev.slug);

  const abas =
    area === 'staff'
      ? [
          { chave: 'pontuacao', nome: 'Pontuação', to: r.staff },
          { chave: 'ranking', nome: 'Ranking', to: r.staffRanking },
        ]
      : [
          { chave: 'cadastro', nome: 'Cadastro', to: r.cadastro },
          { chave: 'fases', nome: 'Fases', to: r.fases },
          ...(ev.temFila ? [{ chave: 'fila', nome: 'Fila', to: r.fila }] : []),
          { chave: 'cronometro', nome: 'Cronômetro', to: r.cronometro },
        ];

  const sair = async () => {
    await signOut();
    navigate(info.voltar);
  };

  return (
    <header className="sticky top-0 z-20">
      <div className={`${ev.corFaixa} ${ev.corTexto} px-4 py-2`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide opacity-70 leading-none">
              {info.nome} · {ev.label}
            </p>
            <p className="font-bold truncate leading-tight">{ev.name || 'Evento'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={info.voltar}
              className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Trocar de evento
            </Link>
            <button
              type="button"
              onClick={sair}
              className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <nav className="bg-panel2 border-b border-white/10 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-1 overflow-x-auto">
          {abas.map((aba) => (
            <Link
              key={aba.chave}
              to={aba.to}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition ${
                atual === aba.chave
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {aba.nome}
            </Link>
          ))}
          {subtitulo ? (
            <span className="ml-auto text-xs text-white/40 whitespace-nowrap pl-3">
              {subtitulo}
            </span>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
