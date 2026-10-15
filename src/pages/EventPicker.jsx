import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  GERAL,
  agruparEventos,
  estaEmCartaz,
  eventoLembrado,
  lembrarEvento,
  ordenarEventos,
  periodoEmTexto,
  rotas,
  visualDaModalidade,
} from '../lib/evento';

// Tela de escolha, logo depois do login do árbitro ou do controle.
//
// Ela SEMPRE aparece, mesmo quando só há um evento e mesmo quando a pessoa já
// trabalhou nele antes. O evento lembrado só ganha um selo "Você estava aqui".
//
// O motivo é operacional: num dia com oito eventos abertos, entrar no errado e
// lançar pontuação lá custa muito mais caro do que um toque a mais. Pular a
// escolha seria conveniente 7 vezes e desastroso na oitava.

const AREAS = {
  staff: { nome: 'Arbitragem', destino: (r) => r.staff },
  controle: { nome: 'Controle de Atletas', destino: (r) => r.fases },
};

export default function EventPicker() {
  const { area } = useParams();
  const navigate = useNavigate();
  const info = AREAS[area] ?? AREAS.staff;
  const lembrado = eventoLembrado(area);
  const [estado, setEstado] = useState({ carregando: true, eventos: [] });

  useEffect(() => {
    let vivo = true;
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => {
        if (vivo) setEstado({ carregando: false, eventos: data ?? [] });
      });
    return () => {
      vivo = false;
    };
  }, []);

  const abrir = (evento) => {
    lembrarEvento(area, evento.slug);
    navigate(info.destino(rotas(evento.slug)));
  };

  // Quem trabalha precisa enxergar também o rascunho: é nele que o evento é
  // montado na véspera.
  const disponiveis = estado.eventos.filter((e) => !e.archived_at && (estaEmCartaz(e) || !e.published));
  const grupos = agruparEventos(ordenarEventos(disponiveis));

  return (
    <div className="min-h-screen bg-panel text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold text-xs uppercase tracking-widest font-bold">{info.nome}</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">Em qual evento você vai trabalhar?</h1>
        <p className="text-white/50 text-sm mt-2">
          Confira com atenção: a pontuação vai para o evento que você escolher aqui.
        </p>

        {estado.carregando ? (
          <p className="text-white/40 text-sm mt-10">Carregando…</p>
        ) : grupos.length === 0 ? (
          <div className="mt-10 bg-panel2 border border-white/10 rounded-xl p-6">
            <p className="text-white/70">Nenhum evento disponível.</p>
            <p className="text-white/40 text-sm mt-2">
              Peça para a administração criar e publicar o evento do dia.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {grupos.map((grupo) => (
              <section key={grupo.titulo || 'sem-grupo'}>
                {grupo.titulo ? (
                  <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
                    {grupo.titulo}
                  </h2>
                ) : null}
                <div className="space-y-2">
                  {grupo.itens.map((e) => {
                    const visual = visualDaModalidade(e.modality);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => abrir(e)}
                        className="w-full text-left bg-panel2 border border-white/10 rounded-xl p-4 hover:border-white/30 transition flex items-center gap-3"
                      >
                        <span
                          className={`${visual.corTag} text-[10px] font-bold px-2 py-1 rounded shrink-0`}
                        >
                          {visual.label}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold truncate">{e.name}</span>
                          <span className="block text-white/40 text-xs">
                            {periodoEmTexto(e.starts_on, e.ends_on)}
                            {!e.published ? ' · rascunho' : ''}
                          </span>
                        </span>
                        {lembrado === e.slug ? (
                          <span className="text-[10px] text-gold shrink-0">Você estava aqui</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <Link to={GERAL.hub} className="inline-block mt-10 text-sm text-white/40 hover:text-white">
          Voltar
        </Link>
      </div>
    </div>
  );
}
