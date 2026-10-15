import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { EventoCtx, GERAL } from '../lib/evento';

// Porteiro da árvore de um evento (/comp/e/:evento/...).
//
// Faz três coisas, nesta ordem:
//   1. traduz o slug do endereço no registro do evento;
//   2. manda para a lista se o slug não existir — endereço velho, link torto
//      ou evento que foi apagado não podem virar tela quebrada;
//   3. entrega o evento por contexto, para que nenhuma tela lá dentro precise
//      consultar o banco de novo só para saber o próprio nome.
//
// A consulta é só a linha do evento. Os dados pesados (atletas, fases,
// pontuações) continuam vindo do useEvent, uma vez só, na tela que precisa.

export default function EventoGuard() {
  const { evento: slug } = useParams();
  const [estado, setEstado] = useState({ carregando: true, evento: null });

  useEffect(() => {
    let vivo = true;
    setEstado({ carregando: true, evento: null });

    supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setEstado({ carregando: false, evento: data ?? null });
      });

    return () => {
      vivo = false;
    };
  }, [slug]);

  if (estado.carregando) {
    return (
      <div className="min-h-screen bg-panel flex items-center justify-center">
        <p className="text-white/40 text-sm">Abrindo o evento…</p>
      </div>
    );
  }

  if (!estado.evento) return <Navigate to={GERAL.hub} replace />;

  return (
    <EventoCtx.Provider value={estado.evento}>
      <Outlet />
    </EventoCtx.Provider>
  );
}
