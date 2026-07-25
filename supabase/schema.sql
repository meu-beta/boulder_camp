-- ============================================================
-- Climbing Championship App — Database Schema (Supabase/Postgres)
-- ============================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- after creating a new Supabase project.

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";

-- ---------- PROFILES (roles for authenticated users) ----------
-- Every Supabase Auth user that should have access to the STAFF or
-- ATHLETE-CONTROL areas needs a row here. Create the auth user first
-- (Supabase Dashboard > Authentication > Users > Add user), then insert
-- a matching profile row with the desired role.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('staff', 'athlete_control')),
  created_at timestamptz not null default now()
);

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id serial primary key,
  name text not null unique
);
insert into categories (name) values ('Boulder') on conflict do nothing;

-- ---------- BOULDERS (the 4 problems athletes climb) ----------
create table if not exists boulders (
  id serial primary key,
  category_id int not null references categories (id) on delete cascade,
  number int not null,
  unique (category_id, number)
);
insert into boulders (category_id, number)
select c.id, n
from categories c, generate_series(1, 4) as n
where c.name = 'Boulder'
on conflict do nothing;

-- ---------- ATHLETES ----------
create table if not exists athletes (
  id uuid primary key default uuid_generate_v4(),
  bib_number int,
  name text not null,
  country_code text, -- ISO-3166 alpha-2 or alpha-3, e.g. 'FRA', 'BEL'
  category_id int not null references categories (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ---------- SCORES ----------
-- One row per athlete + boulder. Staff (arbitration) update this in
-- real time as attempts happen on the wall.
create table if not exists scores (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes (id) on delete cascade,
  boulder_id int not null references boulders (id) on delete cascade,
  top boolean not null default false,
  top_attempts int not null default 0,
  zone boolean not null default false,
  zone_attempts int not null default 0,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  unique (athlete_id, boulder_id)
);

-- ---------- QUEUE (athlete call order, up to 2 "on the wall") ----------
create table if not exists queue_entries (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes (id) on delete cascade,
  category_id int not null references categories (id) on delete cascade,
  position int not null,
  status text not null default 'waiting' check (status in ('waiting', 'on_wall', 'done')),
  updated_at timestamptz not null default now(),
  unique (athlete_id, category_id)
);

-- ---------- TIMER STATE (one row per wall lane, synced live) ----------
create table if not exists timer_state (
  lane int primary key check (lane in (1, 2)),
  athlete_id uuid references athletes (id),
  duration_seconds int not null default 240, -- 4 minutes
  started_at timestamptz,
  running boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into timer_state (lane) values (1), (2) on conflict do nothing;

-- ============================================================
-- RANKING VIEW
-- Ordered per standard bouldering rules: most tops, then fewest
-- attempts-to-top, then most zones, then fewest attempts-to-zone.
-- ============================================================
create or replace view ranking as
select
  a.id as athlete_id,
  a.bib_number,
  a.name,
  a.country_code,
  a.category_id,
  coalesce(sum(case when s.top then 1 else 0 end), 0) as tops,
  coalesce(sum(case when s.zone then 1 else 0 end), 0) as zones,
  coalesce(sum(case when s.top then s.top_attempts else 0 end), 0) as top_attempts,
  coalesce(sum(case when s.zone then s.zone_attempts else 0 end), 0) as zone_attempts,
  rank() over (
    partition by a.category_id
    order by
      coalesce(sum(case when s.top then 1 else 0 end), 0) desc,
      case when coalesce(sum(case when s.top then 1 else 0 end), 0) = 0
           then 999999
           else coalesce(sum(case when s.top then s.top_attempts else 0 end), 0) end asc,
      coalesce(sum(case when s.zone then 1 else 0 end), 0) desc,
      case when coalesce(sum(case when s.zone then 1 else 0 end), 0) = 0
           then 999999
           else coalesce(sum(case when s.zone then s.zone_attempts else 0 end), 0) end asc
  ) as rank
from athletes a
left join scores s on s.athlete_id = a.id
group by a.id, a.bib_number, a.name, a.country_code, a.category_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table boulders enable row level security;
alter table athletes enable row level security;
alter table scores enable row level security;
alter table queue_entries enable row level security;
alter table timer_state enable row level security;

-- Public (anon) read access — the PUBLIC ranking/insights screens use
-- the anon key and only ever SELECT.
create policy "public read categories" on categories for select using (true);
create policy "public read boulders" on boulders for select using (true);
create policy "public read athletes" on athletes for select using (true);
create policy "public read scores" on scores for select using (true);
create policy "public read queue" on queue_entries for select using (true);
create policy "public read timer" on timer_state for select using (true);

-- Authenticated users can read their own profile
create policy "read own profile" on profiles for select using (auth.uid() = id);

-- STAFF (arbitration) can write scores
create policy "staff write scores" on scores for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'staff')
);

-- ATHLETE_CONTROL can manage athletes, queue and timer
create policy "athlete_control write athletes" on athletes for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
);

create policy "athlete_control write queue" on queue_entries for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
);

create policy "athlete_control write timer" on timer_state for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'athlete_control')
);

-- Enable Realtime on the tables the app subscribes to
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table queue_entries;
alter publication supabase_realtime add table timer_state;
alter publication supabase_realtime add table athletes;
