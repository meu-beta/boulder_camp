import { Link } from 'react-router-dom';
import { EVENT_TITLE } from '../lib/event';
import { GERAL, MODALIDADES, rotas } from '../lib/modalidade';

// A porta de entrada do Meu Beta Comp.
//
// É o único endereço que conhece as duas competições ao mesmo tempo, e é o
// link que se manda no grupo do WhatsApp antes do evento: quem chega aqui
// encontra tudo — o ranking para projetar, a área do árbitro e a do controle.
// Depois de escolher, ninguém volta para cá por acidente.

function Cartao({ mod }) {
  const r = rotas(mod.slug);

  return (
    <div className="bg-panel2 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      <div className={`${mod.corFaixa} ${mod.corTexto} px-6 py-4`}>
        <h2 className="text-2xl font-extrabold tracking-tight">{mod.label}</h2>
      </div>

      <div className="p-6 flex flex-col gap-3 flex-1">
        <Link
          to={r.ranking}
          className="block rounded-xl border border-white/15 px-4 py-3 hover:border-white/40 transition"
        >
          <span className="font-bold block">Ranking ao vivo</span>
          <span className="text-white/40 text-xs">
            A tela para projetar no evento, com rolagem automática
          </span>
        </Link>

        <Link
          to={r.staff}
          className="block rounded-xl border border-white/15 px-4 py-3 hover:border-white/40 transition"
        >
          <span className="font-bold block">Arbitragem</span>
          <span className="text-white/40 text-xs">
            Lançamento de pontuação, uma tela por {mod.temFila ? 'boulder' : 'via'}
          </span>
        </Link>

        <Link
          to={r.fases}
          className="block rounded-xl border border-white/15 px-4 py-3 hover:border-white/40 transition"
        >
          <span className="font-bold block">Controle de Atletas</span>
          <span className="text-white/40 text-xs">
            Cadastro, fases{mod.temFila ? ', fila' : ''} e cronômetro
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function CompHub() {
  return (
    <div className="min-h-screen bg-panel px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold uppercase tracking-widest text-xs">Meu Beta Comp</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">{EVENT_TITLE}</h1>
        <p className="text-white/50 text-sm mb-8">
          Duas competições, cada uma com a sua área. Escolha em qual você vai trabalhar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Object.values(MODALIDADES).map((mod) => (
            <Cartao key={mod.slug} mod={mod} />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-8 text-sm text-white/40">
          <Link to={GERAL.loginStaff} className="hover:text-white">
            Entrar como árbitro
          </Link>
          <Link to={GERAL.loginControle} className="hover:text-white">
            Entrar no Controle
          </Link>
          <Link to="/comp/insights" className="hover:text-white">
            Insights
          </Link>
          <Link to="/" className="hover:text-white ml-auto">
            Conheça o Meu Beta
          </Link>
        </div>
      </div>
    </div>
  );
}
