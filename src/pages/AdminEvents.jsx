import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  GERAL,
  estadoDoEvento,
  ordenarEventos,
  periodoEmTexto,
  rotas,
  slugify,
  visualDaModalidade,
} from '../lib/evento';

// Administração dos eventos. Só o papel `admin` chega aqui.
//
// Diferente da lista pública, esta mostra TUDO: rascunho, encerrado e
// arquivado. É o inventário do Meu Beta, não a vitrine do visitante.

/** Acha um slug livre: "feesp-boulder", depois "-2", "-3"... */
async function slugLivre(base) {
  const raiz = slugify(base) || 'evento';
  const { data } = await supabase.from('categories').select('slug').like('slug', `${raiz}%`);
  const usados = new Set((data ?? []).map((e) => e.slug));
  if (!usados.has(raiz)) return raiz;
  for (let i = 2; i < 200; i += 1) {
    if (!usados.has(`${raiz}-${i}`)) return `${raiz}-${i}`;
  }
  return `${raiz}-${Date.now()}`;
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState(null);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) setErro(error.message);
    setEventos(data ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const publicar = async (evento, valor) => {
    setOcupado(evento.id);
    setErro(null);
    const { error } = await supabase
      .from('categories')
      .update({ published: valor })
      .eq('id', evento.id);
    setOcupado(null);
    if (error) setErro(error.message);
    else carregar();
  };

  const arquivar = async (evento) => {
    if (confirmandoArquivo !== evento.id) {
      setConfirmandoArquivo(evento.id);
      return;
    }
    setConfirmandoArquivo(null);
    setOcupado(evento.id);
    setErro(null);
    const valor = evento.archived_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from('categories')
      .update({ archived_at: valor })
      .eq('id', evento.id);
    setOcupado(null);
    if (error) setErro(error.message);
    else carregar();
  };

  // Duplicar copia o evento e a ESTRUTURA das fases (quantas vias/boulders,
  // quantos avançam). Não copia atletas nem pontuação — isso é do dia.
  //
  // Existe porque uma etapa com duas modalidades e quatro categorias são oito
  // eventos, oito vezes por ano. Preencher 64 formulários à mão é de onde sai
  // data errada e nome torto.
  const duplicar = async (origem) => {
    setOcupado(origem.id);
    setErro(null);
    try {
      const slug = await slugLivre(`${origem.name} copia`);
      const { data: novo, error: e1 } = await supabase
        .from('categories')
        .insert({
          name: `${origem.name} (cópia)`,
          slug,
          modality: origem.modality,
          federation: origem.federation,
          group_name: origem.group_name,
          starts_on: origem.starts_on,
          ends_on: origem.ends_on,
          manager_name: origem.manager_name,
          show_states: origem.show_states,
          published: false,
        })
        .select()
        .single();
      if (e1) throw e1;

      const { data: fases } = await supabase
        .from('rounds')
        .select('*')
        .eq('category_id', origem.id)
        .order('sequence');

      for (const fase of fases ?? []) {
        const { data: novaFase, error: e2 } = await supabase
          .from('rounds')
          .insert({
            category_id: novo.id,
            name: fase.name,
            slug: fase.slug,
            sequence: fase.sequence,
            boulder_count: fase.boulder_count,
            advance_count: fase.advance_count,
            two_groups: fase.two_groups,
            is_active: fase.sequence === 1,
            is_finished: false,
          })
          .select()
          .single();
        if (e2) throw e2;

        const vias = Array.from({ length: fase.boulder_count ?? 0 }, (_, i) => ({
          round_id: novaFase.id,
          number: i + 1,
        }));
        if (vias.length) {
          const { error: e3 } = await supabase.from('boulders').insert(vias);
          if (e3) throw e3;
        }
      }

      navigate(GERAL.adminEvento(slug));
    } catch (e) {
      setErro(e.message || 'Não foi possível duplicar.');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="min-h-screen bg-panel text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gold text-xs uppercase tracking-widest font-bold">Administração</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Eventos</h1>
          </div>
          <Link
            to={GERAL.adminNovo}
            className="bg-gold text-panel font-bold px-4 py-2 rounded-lg text-sm shrink-0"
          >
            Novo evento
          </Link>
        </div>

        {erro ? (
          <div className="mt-6 bg-alert/15 border border-alert/40 rounded-lg p-4">
            <p className="font-semibold text-alert">Não deu certo.</p>
            <p className="text-white/70 text-sm mt-1">{erro}</p>
          </div>
        ) : null}

        {carregando ? (
          <p className="text-white/40 text-sm mt-10">Carregando…</p>
        ) : eventos.length === 0 ? (
          <div className="mt-10 bg-panel2 border border-white/10 rounded-xl p-6">
            <p className="text-white/70">Nenhum evento ainda.</p>
            <p className="text-white/40 text-sm mt-2">
              Crie o primeiro em “Novo evento”. Ele nasce como rascunho — só aparece para o
              público quando você publicar.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {ordenarEventos(eventos).map((e) => {
              const visual = visualDaModalidade(e.modality);
              const estado = estadoDoEvento(e);
              const trabalhando = ocupado === e.id;
              return (
                <div
                  key={e.id}
                  className="bg-panel2 border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-3"
                >
                  <span className={`${visual.corTag} text-[10px] font-bold px-2 py-1 rounded`}>
                    {visual.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.name}</p>
                    <p className="text-white/40 text-xs truncate">
                      {[e.group_name, periodoEmTexto(e.starts_on, e.ends_on), `/${e.slug}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${estado.cor}`}>
                    {estado.label}
                  </span>

                  <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                    <Link
                      to={GERAL.adminEvento(e.slug)}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                    >
                      Editar
                    </Link>
                    <Link
                      to={rotas(e.slug).ranking}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                    >
                      Abrir
                    </Link>
                    <Link
                      to={rotas(e.slug).relatorio}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                    >
                      Relatório
                    </Link>
                    <button
                      type="button"
                      disabled={trabalhando}
                      onClick={() => duplicar(e)}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      disabled={trabalhando}
                      onClick={() => publicar(e, !e.published)}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
                    >
                      {e.published ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button
                      type="button"
                      disabled={trabalhando}
                      onClick={() => arquivar(e)}
                      className={`px-3 py-1.5 rounded disabled:opacity-40 ${
                        confirmandoArquivo === e.id
                          ? 'bg-alert text-white font-semibold'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {e.archived_at
                        ? 'Desarquivar'
                        : confirmandoArquivo === e.id
                          ? 'Confirmar'
                          : 'Arquivar'}
                    </button>
                  </div>

                  {confirmandoArquivo === e.id && !e.archived_at ? (
                    <p className="w-full text-xs text-white/50">
                      Arquivar só esconde da lista. Nenhum atleta e nenhuma pontuação é apagada —
                      o evento continua acessível pelo link e por “eventos anteriores”.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <Link to={GERAL.hub} className="inline-block mt-10 text-sm text-white/40 hover:text-white">
          Voltar para a lista pública
        </Link>
      </div>
    </div>
  );
}
