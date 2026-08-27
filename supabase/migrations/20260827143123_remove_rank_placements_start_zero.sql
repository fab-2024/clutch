-- Rank entry V3: every player is classified immediately and starts at zero.
-- Existing settled ratings are preserved. Only untouched rows that still
-- carry the former 1,000-Frags seed are migrated to the new starting point.

create or replace function public.clutch_frags_initial()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 0
$$;

create or replace function public.clutch_frags_nb_placements()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 0
$$;

-- Keep the compatibility RPC in place, but remove the special placement K.
create or replace function public.clutch_frags_k_placement()
returns integer
language sql
immutable
set search_path = ''
as $$
  select public.clutch_frags_k()
$$;

-- A new season starts from the same zero baseline instead of converging back
-- toward the former 1,000-Frags seed.
create or replace function public.clutch_soft_reset_frags(p_frags integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 0
$$;

alter table public.classements_frags
  alter column frags set default 0,
  alter column pic_frags set default 0;

update public.classements_frags
set frags = 0,
    pic_frags = 0,
    maj_le = pg_catalog.now()
where pronostics_regles = 0
  and frags = 1000
  and pic_frags = 1000;

-- The previous ranking index excluded players before their fifth verdict.
drop index if exists public.classements_frags_rank_v2_idx;
create index classements_frags_rank_v2_idx
on public.classements_frags (
  saison_id,
  frags desc,
  ((pronostics_gagnes::numeric / nullif(pronostics_regles, 0))) desc,
  maj_le asc,
  user_id asc
);

comment on function public.clutch_frags_initial() is
  'Competitive Frags start at zero for every season.';
comment on function public.clutch_frags_nb_placements() is
  'Placement matches are disabled; players are ranked immediately.';
comment on function public.clutch_frags_k_placement() is
  'Compatibility alias for the standard ranked K; no placement multiplier remains.';
comment on function public.clutch_soft_reset_frags(integer) is
  'Season reset returns every player to the zero-Frags baseline.';
comment on function public.clutch_grade_frags_v1(integer, integer) is
  'Canonical six-grade seasonal scale. Every player is classified immediately; Mythique requires 1,650 Frags and 30 settled calls.';
comment on function public.clutch_classement_rank_v1(text, text) is
  'Rank leaderboard by Frags, including new zero-Frag players from their first season state.';

revoke all privileges on function public.clutch_frags_initial()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_frags_nb_placements()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_frags_k_placement()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_soft_reset_frags(integer)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_frags_initial()
to anon, authenticated, service_role;
grant execute on function public.clutch_frags_nb_placements()
to anon, authenticated, service_role;
grant execute on function public.clutch_frags_k_placement()
to anon, authenticated, service_role;
grant execute on function public.clutch_soft_reset_frags(integer)
to authenticated, service_role;
