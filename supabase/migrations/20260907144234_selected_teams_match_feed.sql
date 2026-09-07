-- Editorial selection, not a measured audience ranking. One slot = one team/game.
-- Separate discovery from storage: Elo history, settlement and old calls stay intact.
create table public.match_team_selection (
  slot smallint primary key check (slot between 1 and 50),
  game text not null check (game in ('lol', 'valorant', 'rocket_league')),
  name text not null,
  provider_team_id text,
  aliases text[] not null check (cardinality(aliases) > 0),
  unique (game, name),
  unique (game, provider_team_id)
);

alter table public.match_team_selection enable row level security;
revoke all on public.match_team_selection from public, anon, authenticated;
grant select on public.match_team_selection to anon, authenticated;
grant all on public.match_team_selection to service_role;
create policy match_team_selection_read on public.match_team_selection
  for select to anon, authenticated using (true);

insert into public.match_team_selection (slot, game, name, provider_team_id, aliases) values
  (1, 'lol', 'T1', 'ps-team-126061', array['t1']),
  (2, 'lol', 'Gen.G', 'ps-team-2882', array['gen.g','gen.g esports']),
  (3, 'lol', 'Hanwha Life Esports', 'ps-team-2883', array['hanwha life esports']),
  (4, 'lol', 'Dplus KIA', 'ps-team-132531', array['dplus kia']),
  (5, 'lol', 'KT Rolster', 'ps-team-63', array['kt rolster']),
  (6, 'lol', 'BNK FEARX', 'ps-team-134115', array['bnk fearx','fearx']),
  (7, 'lol', 'Bilibili Gaming', 'ps-team-1566', array['bilibili gaming']),
  (8, 'lol', 'Anyone''s Legend', 'ps-team-129971', array['anyone''s legend','anyone’s legend']),
  (9, 'lol', 'Top Esports', 'ps-team-126059', array['top esports']),
  (10, 'lol', 'JD Gaming', 'ps-team-318', array['jd gaming','jdg intel esports club']),
  (11, 'lol', 'Weibo Gaming', null, array['weibo gaming']),
  (12, 'lol', 'Invictus Gaming', 'ps-team-411', array['invictus gaming']),
  (13, 'lol', 'G2 Esports', 'ps-team-88', array['g2 esports']),
  (14, 'lol', 'Fnatic', 'ps-team-394', array['fnatic']),
  (15, 'lol', 'Karmine Corp', 'ps-team-134078', array['karmine corp']),
  (16, 'lol', 'Team Vitality', 'ps-team-115', array['team vitality','vitality']),
  (17, 'lol', 'Movistar KOI', 'ps-team-126536', array['movistar koi']),
  (18, 'lol', 'Team Heretics', null, array['team heretics']),
  (19, 'lol', 'Natus Vincere', 'ps-team-137057', array['natus vincere','navi']),
  (20, 'lol', 'Cloud9', 'ps-team-1097', array['cloud9']),
  (21, 'lol', 'Team Liquid', 'ps-team-390', array['team liquid']),
  (22, 'lol', 'FlyQuest', 'ps-team-311', array['flyquest']),
  (23, 'lol', 'LOUD', 'ps-team-128313', array['loud']),
  (24, 'lol', 'paiN Gaming', 'ps-team-94', array['pain gaming']),
  (25, 'valorant', 'Sentinels', null, array['sentinels']),
  (26, 'valorant', 'LOUD', 'ps-team-130338', array['loud']),
  (27, 'valorant', 'Leviatán', 'ps-team-128990', array['leviatán','leviatan','leviatán esports','leviatan esports']),
  (28, 'valorant', 'NRG', 'ps-team-128471', array['nrg','nrg esports']),
  (29, 'valorant', 'G2 Esports', 'ps-team-128538', array['g2 esports']),
  (30, 'valorant', '100 Thieves', 'ps-team-128605', array['100 thieves']),
  (31, 'valorant', 'Fnatic', null, array['fnatic']),
  (32, 'valorant', 'Team Heretics', null, array['team heretics']),
  (33, 'valorant', 'Team Vitality', null, array['team vitality','vitality']),
  (34, 'valorant', 'Karmine Corp', 'ps-team-130922', array['karmine corp']),
  (35, 'valorant', 'Natus Vincere', null, array['natus vincere','navi']),
  (36, 'valorant', 'Team Liquid', 'ps-team-128541', array['team liquid']),
  (37, 'valorant', 'Paper Rex', null, array['paper rex']),
  (38, 'valorant', 'DRX', null, array['drx']),
  (39, 'valorant', 'Gen.G', null, array['gen.g','gen.g esports']),
  (40, 'valorant', 'T1', 'ps-team-128647', array['t1']),
  (41, 'valorant', 'EDward Gaming', 'ps-team-128976', array['edward gaming']),
  (42, 'valorant', 'ZETA DIVISION', null, array['zeta division']),
  (43, 'rocket_league', 'Karmine Corp', 'ps-team-129570', array['karmine corp']),
  (44, 'rocket_league', 'Team Vitality', 'ps-team-129919', array['team vitality','vitality']),
  (45, 'rocket_league', 'Team Falcons', 'ps-team-131231', array['team falcons']),
  (46, 'rocket_league', 'NRG Esports', 'ps-team-126301', array['nrg esports','nrg']),
  (47, 'rocket_league', 'Gentle Mates', 'ps-team-134452', array['gentle mates','gentle mates alpine']),
  (48, 'rocket_league', 'FURIA Esports', 'ps-team-128933', array['furia esports','furia']),
  (49, 'rocket_league', 'Spacestation Gaming', 'ps-team-126303', array['spacestation gaming']),
  (50, 'rocket_league', 'Shopify Rebellion', 'ps-team-128903', array['shopify rebellion']);

comment on table public.match_team_selection is
  'Editorial selection of 50 team/game entries, approved 2026-09-07. Not an audience ranking. Exact aliases only; academy teams are separate.';

create view public.v_matchs_selectionnes with (security_invoker = true) as
select m.*
from public.v_matchs m
where exists (
  select 1 from public.match_team_selection s
  where s.game = m.jeu
    and (s.provider_team_id in (m.equipe_a_id, m.equipe_b_id)
      or lower(btrim(m.equipe_a)) = any(s.aliases)
      or lower(btrim(m.equipe_b)) = any(s.aliases))
);

revoke all on public.v_matchs_selectionnes from public, anon, authenticated;
grant select on public.v_matchs_selectionnes to anon, authenticated, service_role;
comment on view public.v_matchs_selectionnes is
  'Discovery feed: at least one selected team, filtered before pagination. v_matchs remains available for existing calls and administration.';

notify pgrst, 'reload schema';
