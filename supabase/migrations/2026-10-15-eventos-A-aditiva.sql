-- ============================================================
-- Meu Beta Comp — Eventos, parte A (ADITIVA)
-- ============================================================
--
-- Ver claude/arquitetura-meu-beta-comp-eventos.md (revisão 3).
--
-- Esta parte é SEGURA DE RODAR A QUALQUER MOMENTO, inclusive com o site no ar.
-- Ela só ACRESCENTA: colunas novas, travas novas, políticas novas. Não renomeia
-- nada e não apaga nada. O código que está publicado hoje continua funcionando
-- exatamente igual, porque tudo que ele lê (name, discipline, show_states)
-- continua no lugar.
--
-- A parte B — que renomeia `categories` para `events` — é a única que exige
-- deploy coordenado, e vem depois, junto com o código novo.
--
-- Esquema conferido contra produção em 15/10/2026:
--   categories (id, name, show_states, discipline)  — 2 linhas: Boulder, Lead
--   category_id existe em: athletes, rounds, timer_state   (três tabelas, só)
--   queue_entries aponta para rounds e boulders, NÃO para categories
--   profiles_role_check permitia apenas 'staff' e 'athlete_control'
--   sem unicidade de bib_number em lugar nenhum
--   dados atuais: 9 atletas, 6 fases, 18 pontuações (sobras de teste)
-- ============================================================


-- ------------------------------------------------------------
-- 0. Rede de segurança
-- ------------------------------------------------------------
-- Cópia dentro do próprio banco das tabelas que esta migração encosta. Barata
-- (são poucos kilobytes) e suficiente para desfazer na mão. Apagar depois que
-- o sistema estiver verificado no ar.

create table if not exists backup_20261015_categories  as select * from categories;
create table if not exists backup_20261015_athletes    as select * from athletes;
create table if not exists backup_20261015_rounds      as select * from rounds;
create table if not exists backup_20261015_timer_state as select * from timer_state;
create table if not exists backup_20261015_profiles    as select * from profiles;

-- Tabela nova no esquema `public` é exposta pela API do projeto. Sem RLS, uma
-- cópia dos atletas e dos perfis ficaria legível para quem tem a chave pública
-- do site. Com RLS ligado e nenhuma política, ninguém lê por fora — o SQL
-- Editor continua enxergando, porque roda como dono.
alter table backup_20261015_categories  enable row level security;
alter table backup_20261015_athletes    enable row level security;
alter table backup_20261015_rounds      enable row level security;
alter table backup_20261015_timer_state enable row level security;
alter table backup_20261015_profiles    enable row level security;


-- ------------------------------------------------------------
-- 1. Colunas do evento
-- ------------------------------------------------------------
-- A tabela `categories` nunca guardou categoria: guarda a competição. Estas
-- colunas são o que faltava para ela virar, de fato, um evento.

alter table categories
  add column if not exists slug         text,
  add column if not exists modality     text,
  add column if not exists federation   text,
  add column if not exists group_name   text,
  add column if not exists starts_on    date,
  add column if not exists ends_on      date,
  add column if not exists manager_name text,
  add column if not exists published    boolean not null default false,
  add column if not exists archived_at  timestamptz;

comment on column categories.group_name is
  'Agrupador da etapa. Junta os cards da mesma competição na tela inicial e é a única coisa que liga os eventos de uma etapa entre si — um futuro ranking consolidado depende dele.';

comment on column categories.archived_at is
  'Arquivar ESCONDE da lista. Nunca apaga: o relatório é uma foto e não permite recorrigir, e o ranking do campeonato precisa dos dados.';


-- ------------------------------------------------------------
-- 2. Preencher as linhas existentes
-- ------------------------------------------------------------
-- São dados de teste, não um evento real que rodou. Ficam marcados como teste
-- para não se confundirem com etapa de verdade; o nome é editável pela tela de
-- administração depois.

update categories set
  modality     = case when discipline = 'lead' then 'guiada' else 'boulder' end,
  slug         = case when discipline = 'lead' then 'teste-guiada' else 'teste-boulder' end,
  group_name   = 'Ambiente de testes',
  federation   = 'FEESP — Federação Paulista de Escalada Esportiva',
  manager_name = 'Matheus',
  starts_on    = current_date,
  ends_on      = current_date + 365,
  published    = true
where modality is null;


-- ------------------------------------------------------------
-- 3. Travas
-- ------------------------------------------------------------

alter table categories alter column modality set not null;
alter table categories alter column slug     set not null;

-- `discipline` perde a obrigatoriedade: a partir da parte B quem manda é
-- `modality`, e um evento criado pela tela nova não teria o que pôr aqui.
alter table categories alter column discipline drop not null;

alter table categories drop constraint if exists events_modality_check;
alter table categories add  constraint events_modality_check
  check (modality in ('boulder', 'guiada'));

alter table categories drop constraint if exists events_slug_check;
alter table categories add  constraint events_slug_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table categories drop constraint if exists events_datas_check;
alter table categories add  constraint events_datas_check
  check (ends_on is null or starts_on is null or ends_on >= starts_on);

create unique index if not exists events_slug_uidx on categories (slug);


-- ------------------------------------------------------------
-- 4. Número de peito único dentro do evento
-- ------------------------------------------------------------
-- Dois atletas com o mesmo número no mesmo dia é erro de árbitro garantido.
-- Conferido antes de criar: não há duplicados hoje.

create unique index if not exists athletes_event_bib_uidx
  on athletes (category_id, bib_number)
  where bib_number is not null;


-- ------------------------------------------------------------
-- 5. Papel de administrador
-- ------------------------------------------------------------
-- A CONTA é criada pelo Matheus no painel do Supabase. Aqui só abrimos a
-- possibilidade de o papel existir — sem isto, inserir um perfil 'admin' falha
-- com um erro nada óbvio.

alter table profiles drop constraint profiles_role_check;
alter table profiles add  constraint profiles_role_check
  check (role in ('staff', 'athlete_control', 'admin'));


-- ------------------------------------------------------------
-- 6. Permissões sobre o evento
-- ------------------------------------------------------------

drop policy if exists "public read categories" on categories;

-- Público enxerga evento publicado. Quem está autenticado enxerga todos,
-- inclusive rascunho — é o que permite montar o evento antes de publicar.
create policy "ler eventos" on categories
  for select
  using (published or auth.uid() is not null);

drop policy if exists "admin escreve eventos" on categories;
create policy "admin escreve eventos" on categories
  for all
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- O controle continua podendo ligar/desligar as bandeirinhas de estado.
-- (a política "athlete_control update categories" já existe e permanece)


-- ------------------------------------------------------------
-- 7. Conferência
-- ------------------------------------------------------------
-- select id, slug, name, modality, group_name, published, starts_on, ends_on
--   from categories order by id;
