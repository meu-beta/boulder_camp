import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { GERAL, MODALIDADES, hojeISO, slugify } from '../lib/evento';

// Criar e editar um evento. É a tela que tira o Meu Beta Comp da dependência de
// desenvolvedor: o nome que aparece no telão, as datas e a federação saem daqui,
// não do código.
//
// Lembrete do modelo: cada CATEGORIA é um evento. "FEESP Etapa 1 — Boulder —
// Feminino Adulto" é um evento inteiro, e o Masculino é outro. Por isso o campo
// "Etapa" existe: é ele que junta os irmãos na tela inicial.

const VAZIO = {
  name: '',
  slug: '',
  modality: 'boulder',
  federation: '',
  group_name: '',
  starts_on: '',
  ends_on: '',
  manager_name: '',
  show_states: true,
  published: false,
};

function Campo({ rotulo, dica, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-white/80">{rotulo}</span>
      {dica ? <span className="block text-xs text-white/40 mt-0.5">{dica}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const entrada =
  'w-full bg-panel3 border border-white/15 rounded-lg px-3 h-11 text-white focus:border-gold outline-none';

export default function AdminEventForm() {
  const { evento: slugDaUrl } = useParams();
  const editando = Boolean(slugDaUrl);
  const navigate = useNavigate();

  const [form, setForm] = useState(VAZIO);
  const [slugTocado, setSlugTocado] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return undefined;
    let vivo = true;
    supabase
      .from('categories')
      .select('*')
      .eq('slug', slugDaUrl)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivo) return;
        if (data) {
          setForm({
            name: data.name ?? '',
            slug: data.slug ?? '',
            modality: data.modality ?? 'boulder',
            federation: data.federation ?? '',
            group_name: data.group_name ?? '',
            starts_on: data.starts_on ?? '',
            ends_on: data.ends_on ?? '',
            manager_name: data.manager_name ?? '',
            show_states: data.show_states ?? true,
            published: data.published ?? false,
          });
          setSlugTocado(true);
        }
        setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [editando, slugDaUrl]);

  // O endereço se escreve sozinho enquanto ninguém mexer nele à mão. Quem edita
  // o slug assume o controle — e num evento já publicado trocar o endereço
  // quebra links já distribuídos, então avisamos.
  const mudarNome = (valor) => {
    setForm((f) => ({ ...f, name: valor, slug: slugTocado ? f.slug : slugify(valor) }));
  };

  const mudar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const valido = form.name.trim() && form.slug.trim() && form.modality;

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const linha = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      modality: form.modality,
      federation: form.federation.trim() || null,
      group_name: form.group_name.trim() || null,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
      manager_name: form.manager_name.trim() || null,
      show_states: form.show_states,
      published: form.published,
    };

    const resposta = editando
      ? await supabase.from('categories').update(linha).eq('slug', slugDaUrl)
      : await supabase.from('categories').insert(linha);

    setSalvando(false);

    if (resposta.error) {
      setErro(traduzir(resposta.error.message));
      return;
    }
    navigate(GERAL.admin);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-panel flex items-center justify-center">
        <p className="text-white/40 text-sm">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-panel text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-gold text-xs uppercase tracking-widest font-bold">Administração</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          {editando ? 'Editar evento' : 'Novo evento'}
        </h1>
        <p className="text-white/50 text-sm mt-2">
          Cada categoria é um evento próprio. Para uma etapa com Boulder e Guiada em quatro
          categorias, são oito eventos — crie o primeiro com calma e use “Duplicar” para os outros.
        </p>

        <div className="mt-8 space-y-5">
          <Campo
            rotulo="Nome do evento"
            dica="Como aparece no telão. Ex.: FEESP Etapa 1 — Boulder — Feminino Adulto"
          >
            <input
              className={entrada}
              value={form.name}
              onChange={(e) => mudarNome(e.target.value)}
              placeholder="FEESP Etapa 1 — Boulder — Feminino Adulto"
            />
          </Campo>

          <Campo rotulo="Modalidade" dica="Decide como a pontuação é calculada. Não dá para mudar depois sem bagunçar o que já foi lançado.">
            <div className="flex gap-2">
              {Object.values(MODALIDADES).map((m) => (
                <button
                  key={m.chave}
                  type="button"
                  onClick={() => mudar('modality')(m.chave)}
                  className={`flex-1 h-11 rounded-lg font-bold text-sm transition ${
                    form.modality === m.chave
                      ? `${m.corTag}`
                      : 'bg-panel3 text-white/60 border border-white/15'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </Campo>

          <Campo
            rotulo="Etapa"
            dica="Agrupa os eventos irmãos na tela inicial. Use o mesmo texto nas oito categorias da mesma etapa."
          >
            <input
              className={entrada}
              value={form.group_name}
              onChange={(e) => mudar('group_name')(e.target.value)}
              placeholder="FEESP Etapa 1 · 14 e 15 de março"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início">
              <input
                type="date"
                className={entrada}
                value={form.starts_on}
                onChange={(e) => mudar('starts_on')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Encerramento">
              <input
                type="date"
                className={entrada}
                value={form.ends_on}
                onChange={(e) => mudar('ends_on')(e.target.value)}
              />
            </Campo>
          </div>
          <p className="text-xs text-white/40 -mt-3">
            As datas decidem sozinhas se o evento aparece como “em breve”, “ao vivo” ou
            “encerrado”. Hoje é {hojeISO()}.
          </p>

          <Campo rotulo="Federação responsável">
            <input
              className={entrada}
              value={form.federation}
              onChange={(e) => mudar('federation')(e.target.value)}
              placeholder="FEESP — Federação Paulista de Escalada Esportiva"
            />
          </Campo>

          <Campo rotulo="Responsável pelo evento">
            <input
              className={entrada}
              value={form.manager_name}
              onChange={(e) => mudar('manager_name')(e.target.value)}
              placeholder="Nome de quem responde pelo evento"
            />
          </Campo>

          <Campo
            rotulo="Endereço"
            dica={
              editando
                ? 'Mudar isto quebra links já distribuídos, inclusive o do telão.'
                : 'Preenchido a partir do nome. Só mexa se precisar.'
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-sm shrink-0">/comp/e/</span>
              <input
                className={entrada}
                value={form.slug}
                onChange={(e) => {
                  setSlugTocado(true);
                  mudar('slug')(e.target.value);
                }}
              />
            </div>
          </Campo>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_states}
              onChange={(e) => mudar('show_states')(e.target.checked)}
              className="w-5 h-5 accent-gold"
            />
            <span className="text-sm text-white/80">Mostrar bandeirinhas de estado no ranking</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => mudar('published')(e.target.checked)}
              className="w-5 h-5 accent-gold"
            />
            <span className="text-sm text-white/80">
              Publicado
              <span className="block text-xs text-white/40">
                Enquanto estiver desmarcado, só quem tem login enxerga. Deixe assim enquanto monta.
              </span>
            </span>
          </label>
        </div>

        {erro ? (
          <div className="mt-6 bg-alert/15 border border-alert/40 rounded-lg p-4">
            <p className="font-semibold text-alert">Não salvou.</p>
            <p className="text-white/70 text-sm mt-1">{erro}</p>
          </div>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            disabled={!valido || salvando}
            onClick={salvar}
            className="bg-gold text-panel font-bold px-5 h-11 rounded-lg disabled:opacity-40"
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar evento'}
          </button>
          <Link to={GERAL.admin} className="text-sm text-white/40 hover:text-white">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Erro do Postgres vira frase de gente. */
function traduzir(mensagem) {
  const m = String(mensagem ?? '');
  if (m.includes('events_slug_uidx') || m.includes('duplicate key') && m.includes('slug')) {
    return 'Já existe um evento com esse endereço. Mude o campo “Endereço”.';
  }
  if (m.includes('events_name_key') || m.includes('categories_name_key')) {
    return 'Já existe um evento com esse nome. Os nomes precisam ser diferentes entre si.';
  }
  if (m.includes('events_slug_check')) {
    return 'O endereço só aceita letras minúsculas, números e hífen.';
  }
  if (m.includes('events_datas_check')) {
    return 'A data de encerramento não pode ser antes da data de início.';
  }
  if (m.includes('row-level security') || m.includes('violates row-level')) {
    return 'Sua conta não tem permissão para isso. Entre com a conta de administração.';
  }
  return m || 'Erro desconhecido.';
}
