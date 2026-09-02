import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { EVENT_TITLE } from '../lib/event';
import { GERAL, rotas, useModalidade } from '../lib/modalidade';

// Cabeçalho comum às telas de arbitragem e de controle.
//
// Ele existe por um motivo prático: o árbitro trabalha em pé, com o celular na
// mão, olhando a tela de relance entre uma tentativa e outra. Precisa saber em
// qual competição está sem ler nada — daí a faixa colorida com o nome da
// modalidade, sempre no topo.
//
// E os links de navegação são só os da própria árvore. Não existe atalho para
// a outra modalidade a partir daqui; para trocar é preciso passar pela tela de
// escolha, que é um gesto deliberado.

const AREAS = {
  staff: { nome: 'Arbitragem', voltar: GERAL.escolher('staff') },
  controle: { nome: 'Controle de Atletas', voltar: GERAL.escolher('controle') },
};

export default function ModalityBar({ area, subtitulo, atual }) {
  const mod = useModalidade();
  const r = rotas(mod.slug);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const info = AREAS[area] ?? AREAS.staff;

  const sair = async () => {
    await signOut();
    navigate(area === 'controle' ? GERAL.loginControle : GERAL.loginStaff);
  };

  // Cada área tem os seus links, e a fila só existe no Boulder.
  const links =
    area === 'controle'
      ? [
          { para: r.cadastro, nome: 'Cadastro', chave: 'cadastro' },
          { para: r.fases, nome: 'Fases', chave: 'fases' },
          ...(mod.temFila ? [{ para: r.fila, nome: 'Fila', chave: 'fila' }] : []),
          { para: r.cronometro, nome: 'Cronômetro', chave: 'cronometro' },
          { para: r.ranking, nome: 'Ranking', chave: 'ranking' },
        ]
      : [
          { para: r.staff, nome: 'Pontuação', chave: 'painel' },
          { para: r.staffRanking, nome: 'Ranking', chave: 'ranking' },
        ];

  return (
    <div className="mb-6">
      {/* A faixa: nome da competição em bloco de cor, legível de longe. */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span
          className={`px-3 py-1 rounded-md text-sm font-extrabold tracking-wide uppercase ${mod.corFaixa} ${mod.corTexto}`}
        >
          {mod.label}
        </span>
        <span className="text-white/50 text-sm uppercase tracking-widest">{info.nome}</span>
        <Link
          to={info.voltar}
          className="ml-auto text-white/40 hover:text-white text-xs"
          title="Voltar para a escolha da competição"
        >
          Trocar competição
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-gold tracking-tight">
            {EVENT_TITLE}
          </h1>
          {subtitulo ? <p className="text-white/60 text-sm mt-0.5">{subtitulo}</p> : null}
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm">
          {links.map((l) => (
            <Link
              key={l.chave}
              to={l.para}
              className={
                l.chave === atual ? 'text-white font-semibold' : 'text-white/60 hover:text-white'
              }
            >
              {l.nome}
            </Link>
          ))}
          <button onClick={sair} className="text-white/40 hover:text-white">
            Sair
          </button>
        </nav>
      </div>
    </div>
  );
}
