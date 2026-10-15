-- ============================================================
-- Meu Beta Comp — Eventos, parte B (RENOMEAÇÃO)
-- ============================================================
--
-- ESTADO: ENGAVETADA. Não foi executada e não precisa ser.
--
-- A parte A já entregou tudo que o produto precisa. Esta parte só acerta nomes
-- — `categories` guarda evento desde sempre — e, por ser renomeação, é a única
-- coisa que exigiria derrubar o sistema no mesmo minuto do deploy. Não vale o
-- risco por um ganho de estética. O código fala "evento" em todo lugar e deixa
-- `categories` aparecer apenas nas consultas, com comentário explicando.
--
-- Fica aqui para o dia em que houver uma janela tranquila e vontade.
--
-- ATENÇÃO: esta parte e o deploy do código são UM ÚNICO MOMENTO. Entre rodar
-- isto e o código novo entrar no ar, o sistema fica fora do ar, porque as
-- consultas publicadas procuram os nomes antigos.
--
-- Rodar fora de janela de evento. A parte A já deixou tudo pronto; aqui só
-- acertamos os nomes, para a tabela parar de se chamar "categories" quando o
-- que ela guarda é um evento.
-- ============================================================

alter table categories rename to events;

alter index categories_pkey rename to events_pkey;
alter table events rename constraint categories_name_key to events_name_key;

alter table athletes    rename column category_id to event_id;
alter table rounds      rename column category_id to event_id;
alter table timer_state rename column category_id to event_id;

alter table athletes    rename constraint athletes_category_id_fkey    to athletes_event_id_fkey;
alter table rounds      rename constraint rounds_category_id_fkey      to rounds_event_id_fkey;
alter table rounds      rename constraint rounds_category_id_slug_key  to rounds_event_id_slug_key;
alter table timer_state rename constraint timer_state_category_id_fkey to timer_state_event_id_fkey;

alter index if exists timer_state_category_uidx rename to timer_state_event_uidx;

-- A modalidade mora em `modality` desde a parte A. `discipline` não tem mais
-- consumidor depois que o código novo sobe.
alter table events drop constraint if exists categories_discipline_check;
alter table events drop column if exists discipline;

-- Nome da política, só para não mentir na leitura do painel.
alter policy "athlete_control update categories" on events
  rename to "controle ajusta evento";


-- ------------------------------------------------------------
-- Conferência
-- ------------------------------------------------------------
-- select (select count(*) from events)   eventos,
--        (select count(*) from athletes) atletas,
--        (select count(*) from rounds)   fases,
--        (select count(*) from scores)   pontuacoes,
--        (select count(*) from athletes a left join events e on e.id = a.event_id where e.id is null) atletas_orfaos,
--        (select count(*) from rounds   r left join events e on e.id = r.event_id where e.id is null) fases_orfas;
