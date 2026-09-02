-- ============================================================
-- Meu Beta Comp — Cronômetro por categoria
-- ============================================================
--
-- POR QUE: `timer_state` sempre foi uma linha única (id = 1), compartilhada
-- por todo o sistema. Isso funcionava com uma competição só. Com Boulder e
-- Guiada podendo rodar no mesmo dia, o árbitro que zerasse o cronômetro da
-- Guiada zeraria o do Boulder junto — no meio de uma tentativa.
--
-- Agora existe uma linha por categoria, e cada tela lê a sua.
--
-- SEGURANÇA: aditivo e idempotente. A linha id = 1 continua existindo e passa
-- a pertencer ao Boulder, então o cronômetro que já está em uso não perde o
-- estado nem muda de comportamento.

-- ------------------------------------------------------------
-- PARTE 1 — Tirar a trava de linha única
-- ------------------------------------------------------------
-- A tabela nasceu como singleton, com `check (id = 1)` impedindo qualquer
-- segunda linha. Essa trava era a garantia de que o cronômetro era um só —
-- e é justamente o que precisa deixar de valer. Ela sai, e o índice único
-- por categoria da PARTE 1 assume o papel de guardião: continua impossível
-- ter dois cronômetros para a mesma competição.
alter table timer_state drop constraint if exists timer_state_id_check;

-- ------------------------------------------------------------
-- PARTE 2 — A coluna
-- ------------------------------------------------------------
alter table timer_state
  add column if not exists category_id int references categories(id);

-- A linha que já existe é a do Boulder.
update timer_state
   set category_id = (select id from categories where discipline = 'boulder' order by id limit 1)
 where category_id is null;

-- Uma linha por categoria, garantido pelo banco e não pela boa vontade do código.
create unique index if not exists timer_state_category_uidx
  on timer_state (category_id);

-- ------------------------------------------------------------
-- PARTE 3 — A linha da Guiada
-- ------------------------------------------------------------
-- `id` não tem sequência (o default é 1 fixo), então o próximo id é calculado.
-- 360s = 6 minutos, que é o tempo usual de uma via de Guiada; o árbitro muda
-- na tela quando o regulamento do evento pedir outro.
insert into timer_state (id, category_id, duration_seconds, remaining_seconds, running)
select coalesce((select max(id) from timer_state), 0) + 1, c.id, 360, 360, false
  from categories c
 where c.discipline = 'lead'
   and not exists (select 1 from timer_state t where t.category_id = c.id);

-- ------------------------------------------------------------
-- Conferência — deve devolver uma linha por categoria
-- ------------------------------------------------------------
select t.id, c.name, c.discipline, t.duration_seconds, t.remaining_seconds, t.running
  from timer_state t
  join categories c on c.id = t.category_id
 order by c.id;
