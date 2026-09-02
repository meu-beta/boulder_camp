import { Link, useNavigate, useParams } from 'react-router-dom';
import { EVENT_TITLE } from '../lib/event';
import {
  GERAL,
  MODALIDADES,
  lembrarModalidade,
  modalidadeLembrada,
  rotas,
} from '../lib/modalidade';

// "Qual competição você está arbitrando?"
//
// Aparece logo depois do login e é um toque só. Ela sempre aparece, mesmo para
// quem já escolheu antes: entrar direto na modalidade da última vez é
// exatamente o erro que essa separação existe para evitar — o árbitro abriria
// o celular achando que está na Guiada e lançaria pontuação no Boulder.
//
// A escolha anterior fica marcada como "você estava aqui", para adiantar o
// dedo de quem está voltando do intervalo, sem decidir por ele.

export default function ModalityPicker() {
  const { area } = useParams();
  const navigate = useNavigate();
  const lembrada = modalidadeLembrada();
  const destinoArea = area === 'controle' ? 'controle' : 'staff';

  const escolher = (mod) => {
    lembrarModalidade(mod.slug);
    const r = rotas(mod.slug);
    navigate(destinoArea === 'controle' ? r.fases : r.staff);
  };

  return (
    <div className="min-h-screen bg-panel flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <p className="text-gold uppercase tracking-widest text-xs">
          {destinoArea === 'controle' ? 'Controle de Atletas' : 'Arbitragem'}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">
          Qual competição você está {destinoArea === 'controle' ? 'controlando' : 'arbitrando'}?
        </h1>
        <p className="text-white/50 text-sm mb-8">{EVENT_TITLE}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Object.values(MODALIDADES).map((mod) => (
            <button
              key={mod.slug}
              onClick={() => escolher(mod)}
              className="text-left bg-panel2 border border-white/10 rounded-2xl overflow-hidden hover:border-white/40 transition"
            >
              <div className={`${mod.corFaixa} ${mod.corTexto} px-6 py-8`}>
                <span className="text-3xl font-extrabold tracking-tight">{mod.label}</span>
              </div>
              <div className="px-6 py-4">
                <span className="text-white/50 text-sm">
                  {mod.temFila
                    ? 'Cinco boulders na classificatória, quatro nas fases seguintes'
                    : 'Duas vias na classificatória, uma na semi e uma na final'}
                </span>
                {lembrada === mod.slug ? (
                  <span className="block text-gold text-xs mt-2">Você estava aqui</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        <Link to={GERAL.hub} className="inline-block mt-8 text-white/40 hover:text-white text-sm">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
