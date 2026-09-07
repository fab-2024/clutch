-- Replace the editorial 50 team/game entries with the user's exact 30 organizations.
-- A selected organization applies across LoL, Valorant and Rocket League.
alter table public.match_team_selection
  add column provider_team_ids text[] not null default '{}';

-- Only discovery configuration is replaced; no match, call or Elo row is touched.
delete from public.match_team_selection;
alter table public.match_team_selection alter column game drop not null;
alter table public.match_team_selection drop constraint match_team_selection_slot_check;
alter table public.match_team_selection add constraint match_team_selection_slot_check
  check (slot between 1 and 30);

insert into public.match_team_selection (slot, name, aliases) values
  (1, 'Team Vitality', array['team vitality','vitality']),
  (2, 'Team Falcons', array['team falcons','falcons']),
  (3, 'Aurora Gaming', array['aurora gaming','aurora']),
  (4, 'FURIA', array['furia','furia esports']),
  (5, 'All Gamers', array['all gamers']),
  (6, 'eArena', array['earena']),
  (7, 'Tianba', array['tianba','tianba esports']),
  (8, 'Yangon Galacticos', array['yangon galacticos']),
  (9, 'Team Spirit', array['team spirit']),
  (10, 'ONIC Esports', array['onic esports','onic']),
  (11, 'T1', array['t1']),
  (12, 'Twisted Minds', array['twisted minds']),
  (13, 'Dplus', array['dplus','dplus kia']),
  (14, 'Team Liquid', array['team liquid']),
  (15, 'Weibo Gaming', array['weibo gaming']),
  (16, 'Virtus.pro', array['virtus.pro','virtus pro']),
  (17, 'ZETA DIVISION', array['zeta division']),
  (18, 'Natus Vincere', array['natus vincere','navi']),
  (19, 'Gen.G', array['gen.g','gen.g esports','gen.g mobil1 racing']),
  (20, 'S2G Esports', array['s2g esports','s2g']),
  (21, 'Karmine Corp', array['karmine corp']),
  (22, 'G2 Esports', array['g2 esports','g2 stride']),
  (23, 'DRX', array['drx','kiwoom drx']),
  (24, 'Team Heretics', array['team heretics']),
  (25, 'NRG', array['nrg','nrg esports']),
  (26, '100 Thieves', array['100 thieves']),
  (27, 'FaZe Clan', array['faze clan']),
  (28, 'OpTic Gaming', array['optic gaming']),
  (29, 'Geekay Esports', array['geekay esports','geekay']),
  (30, 'Gentle Mates', array['gentle mates','gentle mates alpine']);

-- Resolve known provider IDs from exact aliases, never from organization prefixes.
-- Names also cover selected teams that have not been imported yet.
update public.match_team_selection s
set provider_team_ids = array(
  select e.id from public.equipes e
  where e.jeu in ('lol','valorant','rocket_league')
    and e.id like 'ps-team-%'
    and lower(btrim(e.nom)) = any(s.aliases)
  order by e.id
);

create or replace view public.v_matchs_selectionnes with (security_invoker = true) as
select m.*
from public.v_matchs m
where m.jeu in ('lol','valorant','rocket_league')
  and exists (
    select 1 from public.match_team_selection s
    where m.equipe_a_id = any(s.provider_team_ids)
      or m.equipe_b_id = any(s.provider_team_ids)
      or lower(btrim(m.equipe_a)) = any(s.aliases)
      or lower(btrim(m.equipe_b)) = any(s.aliases)
  );

alter table public.match_team_selection drop column game, drop column provider_team_id;
alter table public.match_team_selection add constraint match_team_selection_name_key unique (name);
comment on table public.match_team_selection is
  'The 30 organizations supplied by the user on 2026-09-07, shared across supported games. Exact main-team aliases, not an audience ranking.';

-- Preserve the existing read-only Data API and RLS policy explicitly.
alter table public.match_team_selection enable row level security;
revoke all on public.match_team_selection from public, anon, authenticated;
grant select on public.match_team_selection to anon, authenticated;
grant all on public.match_team_selection to service_role;
revoke all on public.v_matchs_selectionnes from public, anon, authenticated;
grant select on public.v_matchs_selectionnes to anon, authenticated, service_role;
notify pgrst, 'reload schema';
