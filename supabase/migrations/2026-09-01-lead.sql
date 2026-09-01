-- ============================================================
-- Meu Beta Comp — Etapa 2: Guiada (Lead)
-- Migração 1 de N — colunas e categoria
-- ============================================================
--
-- Fonte das regras: Regulamento 2026 CBEscalada, seção Guiada (15.1–15.7),
-- que reproduz os artigos 7.23–7.24 da IFSC.
--
-- COMO RODAR: cole o bloco inteiro no SQL Editor do Supabase e execute.
--
-- SEGURANÇA: tudo aqui é ADITIVO e IDEMPOTENTE. Não altera nem remove nada
-- que o Boulder use, e pode ser executado mais de uma vez sem efeito colateral.
-- O Boulder vai rodar num evento real; esta migração não pode afetá-lo.
--
-- NOTA: o arquivo supabase/schema.sql do repositório está DESATUALIZADO em
-- relação ao banco real (ele ainda descreve `boulders.category_id` e
-- `timer_state.lane`, que não são mais a forma viva). Por isso esta migração
-- foi escrita de forma puramente aditiva, sem depender do formato atual.

-- ------------------------------------------------------------
-- PARTE 1 — Modalidade
-- ------------------------------------------------------------
-- A modalidade entra como um eixo do sistema. O Boulder existente recebe
-- 'boulder' pelo default, sem precisar de UPDATE.

alter table categories
  add column if not exists discipline text not null default 'boulder';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_discipline_check'
  ) then
    alter table categories
      add constraint categories_discipline_check
      check (discipline in ('boulder', 'lead'));
  end if;
end $$;

insert into categories (name, discipline)
values ('Lead', 'lead')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- PARTE 2 — Colunas de pontuação da Guiada
-- ------------------------------------------------------------
-- Convivem com as colunas do boulder (zone/top/attempts) na mesma tabela.
-- Um score de lead usa hold_value + hold_used; um de boulder ignora as duas.

-- Valor da agarra NO CROQUI (15.1). Não é número sequencial de agarra:
-- o croqui é preparado pelo Head Routesetter e os valores ficam fixos
-- durante a rodada.
alter table scores add column if not exists hold_value int;

-- O "+" do regulamento (15.3.iii): agarra USADA vale mais que agarra apenas
-- CONTROLADA. `false` = controlada, `true` = usada.
alter table scores add column if not exists hold_used boolean not null default false;

-- Tempo total da tentativa, arredondado para baixo (15.2a).
-- É registrado em TODAS as tentativas, mesmo só sendo usado como desempate
-- na final e apenas entre as três primeiras colocações (15.6b).
alter table scores add column if not exists time_seconds int;

-- ------------------------------------------------------------
-- PARTE 3 — Qualificatória em dois grupos (15.6a / 15.7)
-- ------------------------------------------------------------
-- Com dois grupos, o desempate da semifinal por colocação na qualificatória
-- NÃO se aplica, e o Ranking Geral une os rankings dos dois grupos tratando
-- mesma colocação como empate. Fica como chave por fase, controlada na tela
-- de Fases, porque ainda não está decidido para este evento.

alter table rounds add column if not exists two_groups boolean not null default false;

-- ------------------------------------------------------------
-- Conferência
-- ------------------------------------------------------------
-- Deve devolver a categoria Lead e as colunas novas.

select id, name, discipline from categories order by id;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'scores' and column_name in ('hold_value','hold_used','time_seconds'))
    or (table_name = 'categories' and column_name = 'discipline')
    or (table_name = 'rounds' and column_name = 'two_groups'))
order by table_name, column_name;
