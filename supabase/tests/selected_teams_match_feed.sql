begin;

insert into public.saisons (id, nom, debut, fin, solde_initial)
values ('test-selection', 'Selection test', now(), now() + interval '2 days', 1000);
insert into public.evenements (id, jeu, nom)
values ('test-selection', 'lol', 'Selection test');
insert into public.equipes (id, jeu, nom, tag) values
  ('test-selection-a', 'lol', '  t1  ', 'T1'),
  ('test-selection-b', 'lol', 'FURIA Esports', 'FUR'),
  ('test-selection-academy', 'lol', 'T1 Academy', 'T1A'),
  ('test-selection-blue', 'lol', 'Karmine Corp Blue', 'KCB'),
  ('test-selection-unknown', 'lol', 'Unknown Test Team', 'UNK'),
  ('test-selection-wrong-game', 'lol', 'Paper Rex', 'PRX'),
  ('test-selection-removed', 'lol', 'Fnatic', 'FNC'),
  ('test-selection-cross-game', 'lol', 'DRX', 'DRX'),
  ('test-selection-renamed', 'lol', 'Renamed Test Team', 'REN');

-- Simulate a known provider team renamed without an alias update.
update public.match_team_selection set provider_team_ids = array['test-selection-renamed'] where slot = 6;
insert into public.matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut)
select 'test-selection-' || fixture.id, 'test-selection', 'test-selection', 'lol',
  'test-selection-' || fixture.a, 'test-selection-' || fixture.b, 3,
  now() + fixture.hours * interval '1 hour'
from (values
  ('none', 'academy', 'unknown', 1),
  ('blue', 'blue', 'unknown', 2),
  ('wrong-game', 'wrong-game', 'unknown', 3),
  ('removed', 'removed', 'unknown', 3),
  ('cross-game', 'cross-game', 'unknown', 8),
  ('a', 'a', 'unknown', 4),
  ('b', 'unknown', 'b', 5),
  ('both', 'a', 'b', 6),
  ('renamed', 'renamed', 'unknown', 7)
) as fixture(id, a, b, hours);

do $test$
declare v_ids text[];
begin
  if (select count(*) from public.match_team_selection) <> 30 then
    raise exception 'The shared selection must contain exactly 30 organizations';
  end if;
  if (select array_agg(name order by slot) from public.match_team_selection) is distinct from array[
    'Team Vitality','Team Falcons','Aurora Gaming','FURIA','All Gamers','eArena',
    'Tianba','Yangon Galacticos','Team Spirit','ONIC Esports','T1','Twisted Minds',
    'Dplus','Team Liquid','Weibo Gaming','Virtus.pro','ZETA DIVISION','Natus Vincere',
    'Gen.G','S2G Esports','Karmine Corp','G2 Esports','DRX','Team Heretics','NRG',
    '100 Thieves','FaZe Clan','OpTic Gaming','Geekay Esports','Gentle Mates'
  ] then raise exception 'Selection must match the 30 organizations supplied by the user'; end if;
  if exists (
    select alias from public.match_team_selection, unnest(aliases) alias
    group by alias having count(*) > 1
  ) then raise exception 'Ambiguous team aliases'; end if;

  select array_agg(id order by id) into v_ids
  from public.v_matchs_selectionnes where saison_id = 'test-selection';
  if v_ids is distinct from array['test-selection-a', 'test-selection-b',
    'test-selection-both', 'test-selection-cross-game', 'test-selection-renamed'] then
    raise exception 'Incorrect discovery filter or duplicate matches: %', v_ids;
  end if;
  if (select id from public.v_matchs_selectionnes where saison_id = 'test-selection'
      order by debut limit 1) <> 'test-selection-a' then
    raise exception 'Selection must apply before query limits';
  end if;
  if (select count(*) from public.v_matchs where saison_id = 'test-selection') <> 9 then
    raise exception 'Original match access must remain intact';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.match_team_selection'::regclass)
     or not (select reloptions @> array['security_invoker=true'] from pg_class
             where oid = 'public.v_matchs_selectionnes'::regclass) then
    raise exception 'Selection must respect RLS';
  end if;
  if has_table_privilege('anon', 'public.match_team_selection', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.match_team_selection', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.v_matchs_selectionnes', 'INSERT,UPDATE,DELETE') then
    raise exception 'Client roles must not edit the editorial selection';
  end if;
end;
$test$;

-- A schedule passing is not live confirmation; stale explicit live also expires.
insert into public.matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut, statut, score_a, score_b)
select 'test-selection-status-' || f.id, 'test-selection', 'test-selection', 'lol',
  'test-selection-a', 'test-selection-unknown', 3, now() + f.hours * interval '1 hour', f.status,
  case when f.status = 'termine' then 2 end, case when f.status = 'termine' then 0 end
from (values ('stale-live', -480, 'en_cours'), ('elapsed', -1, 'a_venir'),
  ('recent-live', -1, 'en_cours'), ('old-final', -480, 'termine'),
  ('future-live', 1, 'en_cours')) f(id,hours,status);
do $test$ begin
  if (select array_agg(id order by id) from public.v_matchs_selectionnes
      where id like 'test-selection-status-%') is distinct from
     array['test-selection-status-old-final','test-selection-status-recent-live'] then
    raise exception 'Discovery must keep confirmed recent live and final results only';
  end if;
  if (select count(*) from public.v_matchs where id like 'test-selection-status-%') <> 5 then
    raise exception 'Unresolved match details must remain accessible';
  end if;
end; $test$;

-- Every organization is eligible in each supported game, including teams imported later.
insert into public.equipes (id, jeu, nom, tag)
select 'test-selection-matrix-' || s.slot || '-' || g.game, g.game, s.name, 'SEL'
from public.match_team_selection s
cross join (values ('lol'), ('valorant'), ('rocket_league')) g(game);
insert into public.equipes (id, jeu, nom, tag)
select 'test-selection-opponent-' || game, game, 'Unknown Matrix Opponent', 'UNK'
from (values ('lol'), ('valorant'), ('rocket_league')) g(game);
insert into public.evenements (id, jeu, nom)
select 'test-selection-event-' || game, game, 'Selection test'
from (values ('lol'), ('valorant'), ('rocket_league')) g(game);
insert into public.matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut)
select e.id, 'test-selection-event-' || e.jeu, 'test-selection', e.jeu, e.id,
  'test-selection-opponent-' || e.jeu, 3, now() + interval '1 day'
from public.equipes e where e.id like 'test-selection-matrix-%';
do $test$ begin
  if (select count(*) from public.v_matchs_selectionnes where id like 'test-selection-matrix-%') <> 90 then
    raise exception 'All 30 organizations must qualify across the three supported games';
  end if;
end; $test$;

set local role anon;
do $test$ begin
  if (select count(*) from public.match_team_selection) <> 30 then
    raise exception 'Public selection cannot be read';
  end if;
  perform id from public.v_matchs_selectionnes limit 1;
end; $test$;
reset role;
set local role authenticated;
do $test$ begin
  if (select count(*) from public.match_team_selection) <> 30 then
    raise exception 'Authenticated selection cannot be read';
  end if;
  perform id from public.v_matchs_selectionnes limit 1;
end; $test$;
reset role;
rollback;
