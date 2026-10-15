import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  GERAL,
  agruparEventos,
  estaEmCartaz,
  estadoDoEvento,
  ordenarEventos,
  periodoEmTexto,
  rotas,
  visualDaModalidade,
} from '../lib/evento';

// Porta de entrada do Meu Beta Comp.
//
// Antes aqui havia duas portas fixas, Boulder e Guiada. Agora há a lista do que
// está acontecendo — porque uma etapa com duas modalidades e quatro categorias
// são oito eventos no mesmo fim de semana, e o visitante precisa achar o dele.
//
// Os cartões vêm agrupados por `group_name` justamente para isso: em vez de
// oito linhas começando todas com "FEESP", um título de etapa e os cartões
// embaixo.

function Cartao({ evento }) {
  const visual = visualDaModalidade(evento.modality);
  const estado = estadoDoEvento(evento);
  const periodo = periodoEmTexto(evento.starts_on, evento.ends_on);

  return (
    <Link
      to={rotas(evento.slug).ranking}
      className="block bg-panel2 border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition"
    >
      <div className={`${visual.corFaixa} ${visual.corTexto} px-4 py-1.5 text-xs font-bold`}>
        {visual.label}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-white leading-tight">{evento.name}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${estado.cor}`}>
            {estado.label}
          </span>
        </div>
        {periodo ? <p className="text-white/40 text-xs mt-2">{periodo}</p> : null}
        {evento.federation ? (
          <p className="text-white/30 text-xs mt-1 truncate">{evento.federation}</p>
        ) : null}
      </div>
    </Link>
  );
}

export default function EventList({ anteriores = false }) {
  const [estado, setEstado] = useState({ carregando: true, eventos: [] });

  useEffect(() => {
    let vivo = true;
    supabase
      .from('categories')
      .select('*')
      .eq('published', true)
      .then(({ data }) => {
        if (vivo) setEstado({ carregando: false, eventos: data ?? [] });
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filtrados = estado.eventos.filter((e) =>
    anteriores ? !estaEmCartaz(e) : estaEmCartaz(e)
  );
  const grupos = agruparEventos(ordenarEventos(filtrados));

  return (
    <div className="min-h-screen bg-panel text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <p className="text-gold text-xs uppercase tracking-widest font-bold">Meu Beta Comp</p>
        <h1 className="text-3xl sm:text-4xl font-bold mt-1">
          {anteriores ? 'Eventos anteriores' : 'Competições'}
        </h1>
        <p className="text-white/50 text-sm mt-2">
          {anteriores
            ? 'Resultados de eventos já encerrados. Nada é apagado.'
            : 'Escolha a competição que você quer acompanhar.'}
        </p>

        {estado.carregando ? (
          <p className="text-white/40 text-sm mt-10">Carregando…</p>
        ) : grupos.length === 0 ? (
          <div className="mt-10 bg-panel2 border border-white/10 rounded-xl p-6">
            <p className="text-white/70">
              {anteriores
                ? 'Nenhum evento encerrado por aqui ainda.'
                : 'Nenhuma competição no ar neste momento.'}
            </p>
            {!anteriores ? (
              <p className="text-white/40 text-sm mt-2">
                Assim que uma etapa for publicada, ela aparece aqui.
              </p>
            ) : null}
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {grupo.itens.map((e) => (
                    <Cartao key={e.id} evento={e} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
          {anteriores ? (
            <Link to={GERAL.hub} className="hover:text-white">
              Competições no ar
            </Link>
          ) : (
            <Link to={GERAL.anteriores} className="hover:text-white">
              Eventos anteriores
            </Link>
          )}
          <Link to={GERAL.loginStaff} className="hover:text-white">
            Entrar como árbitro
          </Link>
          <Link to={GERAL.loginControle} className="hover:text-white">
            Entrar no Controle
          </Link>
          <Link to={GERAL.admin} className="hover:text-white">
            Administração
          </Link>
          <a href="/" className="hover:text-white ml-auto">
            Conheça o Meu Beta
          </a>
        </div>
      </div>
    </div>
  );
}
