-- Historical team strength is isolated from player ratings and settlements.
create table private.elo_history_v2 (
  game text not null check (game in ('lol','valorant','rocket_league')),
  match_id text not null,
  team_a text not null,
  team_b text not null check(team_a <> team_b),
  played_at timestamptz not null,
  format integer not null check(format in (1,3,5,7)),
  score_a integer not null check(score_a >= 0),
  score_b integer not null check(score_b >= 0),
  primary key(game,match_id),
  check(score_a <> score_b and greatest(score_a,score_b) = (format+1)/2)
);
create index elo_history_chronological on private.elo_history_v2(game,played_at,match_id);
create table private.elo_models_v2 (
  game text primary key check (game in ('lol','valorant','rocket_league')),
  ratings jsonb not null default '{}',
  coverage_from timestamptz,
  synced_at timestamptz,
  rebuilt_at timestamptz,
  diagnostics jsonb not null default '{}'
);
create table private.elo_team_ratings_v2 (
  game text not null,
  team text not null,
  elo numeric not null default 1500,
  n integer not null default 0,
  primary key(game,team)
);
alter table private.elo_team_ratings_v2 enable row level security;
revoke all on private.elo_team_ratings_v2 from public,anon,authenticated,service_role;
alter table private.elo_history_v2 enable row level security;
alter table private.elo_models_v2 enable row level security;
revoke all on private.elo_history_v2,private.elo_models_v2 from public,anon,authenticated,service_role;

create function public.clutch_elo_status_v2()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(game,jsonb_build_object('synced_at',synced_at,'coverage_from',coverage_from,'diagnostics',diagnostics)),'{}')
  from private.elo_models_v2
$$;
revoke all on function public.clutch_elo_status_v2() from public,anon,authenticated,service_role;
grant execute on function public.clutch_elo_status_v2() to service_role;

-- Only the trusted importer can supply results. No public matches, calls,
-- wallets or player rankings are created/settled during this replay.
create function public.clutch_import_elo_history_v2(p_matches jsonb,p_coverage jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  x jsonb; g text; r record; v_ratings jsonb; a numeric; b numeric;
  na integer; nb integer; probability numeric; actual numeric; delta numeric;
  observations integer; brier numeric; baseline numeric; count_matches integer;
begin
  if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches)>12000
    or jsonb_typeof(p_coverage)<>'object' then raise exception 'Invalid Elo history payload'; end if;
  perform pg_catalog.pg_advisory_xact_lock(730024002);
  for x in select value from jsonb_array_elements(p_matches) loop
    if x->>'status'='canceled' or coalesce((x->>'forfeit')::boolean,false) then
      delete from private.elo_history_v2 where game=x->>'game' and match_id=x->>'external_match_id';
      continue;
    end if;
    if x->>'status'<>'finished' then continue; end if;
    if (x->>'begin_at')::timestamptz >= now() or (x->>'begin_at')::timestamptz < now()-interval '90 days' then continue; end if;
    if x->>'external_match_id' !~ '^[0-9]{1,30}$'
       or x->>'team_a_external_id' !~ '^[0-9]{1,30}$'
       or x->>'team_b_external_id' !~ '^[0-9]{1,30}$' then raise exception 'Invalid history identifiers'; end if;
    -- Forfeits and incomplete results do not train the model.
    if coalesce((x->>'forfeit')::boolean,false) or x->>'score_a' is null or x->>'score_b' is null
      or (x->>'score_a')::integer=(x->>'score_b')::integer
      or greatest((x->>'score_a')::integer,(x->>'score_b')::integer)<>((x->>'format')::integer+1)/2 then continue; end if;
    insert into private.elo_history_v2(game,match_id,team_a,team_b,played_at,format,score_a,score_b)
    values(x->>'game',x->>'external_match_id','ps-team-'||(x->>'team_a_external_id'),'ps-team-'||(x->>'team_b_external_id'),
      (x->>'begin_at')::timestamptz,(x->>'format')::integer,(x->>'score_a')::integer,(x->>'score_b')::integer)
    on conflict(game,match_id) do update set team_a=excluded.team_a,team_b=excluded.team_b,
      played_at=excluded.played_at,format=excluded.format,score_a=excluded.score_a,score_b=excluded.score_b;
  end loop;
  for g in select distinct value from jsonb_array_elements_text('["lol","valorant","rocket_league"]') loop
    if p_coverage ? g then
      insert into private.elo_models_v2(game,coverage_from,synced_at)
      values(g,(p_coverage->>g)::timestamptz,now())
      on conflict(game) do update set coverage_from=excluded.coverage_from,synced_at=excluded.synced_at;
    end if;
    if not exists(select 1 from private.elo_models_v2 where game=g and synced_at>now()-interval '24 hours') then continue; end if;
    delete from private.elo_team_ratings_v2 where game=g;
    insert into private.elo_team_ratings_v2(game,team)
    select g,team_a from private.elo_history_v2 where game=g and played_at>=now()-interval '90 days'
    union select g,team_b from private.elo_history_v2 where game=g and played_at>=now()-interval '90 days';
    observations:=0; brier:=0; baseline:=0; count_matches:=0;
    for r in select * from private.elo_history_v2 where game=g and played_at>=now()-interval '90 days' and played_at<now() order by played_at,match_id loop
      select elo,n into a,na from private.elo_team_ratings_v2 where game=g and team=r.team_a;
      select elo,n into b,nb from private.elo_team_ratings_v2 where game=g and team=r.team_b;
      probability:=public.clutch_proba_map(round(a)::integer,round(b)::integer);
      if na>=5 and nb>=5 then
        select sum(d.proba) into actual from public.clutch_distribution(probability,r.format) d where score_a>score_b;
        brier:=brier+power(actual-case when r.score_a>r.score_b then 1 else 0 end,2);
        baseline:=baseline+0.25; observations:=observations+1;
      end if;
      actual:=r.score_a::numeric/(r.score_a+r.score_b);
      delta:=24*(actual-probability);
      update private.elo_team_ratings_v2 set elo=a+delta,n=na+1 where game=g and team=r.team_a;
      update private.elo_team_ratings_v2 set elo=b-delta,n=nb+1 where game=g and team=r.team_b;
      count_matches:=count_matches+1;
    end loop;
    select coalesce(jsonb_object_agg(team,jsonb_build_object('elo',elo,'n',n)),'{}') into v_ratings from private.elo_team_ratings_v2 where game=g;
    update private.elo_models_v2 set ratings=v_ratings,rebuilt_at=now(),diagnostics=jsonb_build_object(
      'matches',count_matches,'evaluated',observations,'brier',brier/nullif(observations,0),
      'baseline_brier',baseline/nullif(observations,0),'map_k',24,'scale',400,'minimum_matches',5)
    where game=g;
  end loop;
  return public.clutch_elo_status_v2();
end $$;
revoke all on function public.clutch_import_elo_history_v2(jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.clutch_import_elo_history_v2(jsonb,jsonb) to service_role;

-- First published projection opens calls and freezes a single shared contract.
-- The same match row lock is used by call placement and result settlement.
create function private.clutch_open_scoring_v2(p_match_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare m public.matchs%rowtype; model private.elo_models_v2%rowtype; a numeric; b numeric; p numeric;
begin
  select * into m from public.matchs where id=p_match_id for update;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  if exists(select 1 from public.matchs_scoring_frags where match_id=m.id) then return true; end if;
  if m.statut<>'a_venir' or m.debut<=now() then return false; end if;
  if m.id like 'ps-match-%' then
    select * into model from private.elo_models_v2 where game=m.jeu;
    if not found or model.synced_at<now()-interval '24 hours' or model.rebuilt_at is null
       or coalesce((model.ratings->m.equipe_a_id->>'n')::integer,0)<5
       or coalesce((model.ratings->m.equipe_b_id->>'n')::integer,0)<5 then return false; end if;
    a:=(model.ratings->m.equipe_a_id->>'elo')::numeric;
    b:=(model.ratings->m.equipe_b_id->>'elo')::numeric;
  else
    select elo into a from public.equipes where id=m.equipe_a_id;
    select elo into b from public.equipes where id=m.equipe_b_id;
  end if;
  select sum(d.proba) into p from public.clutch_distribution(public.clutch_proba_map(round(a)::integer,round(b)::integer),m.format) d where score_a>score_b;
  insert into public.matchs_scoring_frags(match_id,proba_a,proba_b,source)
  values(m.id,p,1-p,case when m.id like 'ps-match-%' then 'elo_history_v2' else 'elo_v1' end);
  return true;
end $$;
revoke all on function private.clutch_open_scoring_v2(text) from public,anon,authenticated,service_role;

-- Once published, an opponent/format change requires cancelling the old match,
-- not reusing its contract for another event. Schedule changes remain possible.
create function private.clutch_guard_scoring_identity_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(new.equipe_a_id,new.equipe_b_id,new.format,new.jeu,new.saison_id)
    is distinct from row(old.equipe_a_id,old.equipe_b_id,old.format,old.jeu,old.saison_id)
    and (exists(select 1 from public.matchs_scoring_frags where match_id=old.id and source='elo_history_v2')
      or exists(select 1 from public.pronostics_classes where match_id=old.id)) then
    raise exception 'Les participants et le format d’un call ouvert ne peuvent plus changer.' using errcode='55000';
  end if;
  return new;
end $$;
revoke all on function private.clutch_guard_scoring_identity_v2() from public,anon,authenticated,service_role;
create trigger scoring_identity_v2 before update on public.matchs
for each row execute function private.clutch_guard_scoring_identity_v2();

-- Do not freeze neutral estimates while fixtures are only being imported.
drop trigger if exists frags_snapshot_nouveau_match on public.matchs;
-- Preserve every legacy contract that has already accepted a call, including
-- cancelled calls, and every started/settled match. Never rewrite player deltas.
lock table public.matchs in share row exclusive mode;
lock table public.pronostics_classes in share row exclusive mode;
delete from public.matchs_scoring_frags s using public.matchs m
where m.id=s.match_id and m.id like 'ps-match-%' and m.statut='a_venir' and m.debut>now()
  and s.source='elo_v1' and not exists(select 1 from public.pronostics_classes p where p.match_id=m.id);

create or replace function public.clutch_projection_match_frags(p_match_id text)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer:=0; v_k integer; v_pa numeric; v_pb numeric;
begin
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  if not private.clutch_open_scoring_v2(p_match_id) then return jsonb_build_object('match_id',p_match_id,'status','preparing','choix','[]'::jsonb); end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  if v_user is not null then select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule'; end if;
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_pa:=clutch_borner_proba_frags(v_snap.proba_a); v_pb:=clutch_borner_proba_frags(v_snap.proba_b);
  return jsonb_build_object('match_id',p_match_id,'figee_le',v_snap.figee_le,'source',v_snap.source,'k',v_k,'placements_restants',greatest(0,clutch_frags_nb_placements()-v_nb),'choix',jsonb_build_array(
    jsonb_build_object('cle','a','proba',v_snap.proba_a,'proba_scoring',v_pa,'gain',clutch_delta_frags(v_pa,true,v_k),'perte',clutch_delta_frags(v_pa,false,v_k)),
    jsonb_build_object('cle','b','proba',v_snap.proba_b,'proba_scoring',v_pb,'gain',clutch_delta_frags(v_pb,true,v_k),'perte',clutch_delta_frags(v_pb,false,v_k))));
end;
$$;

create or replace function public.placer_pronostic_classe(p_match_id text,p_choix text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer; v_k integer; v_proba numeric; v_scoring numeric; v_prono pronostics_classes%rowtype;
begin
  if v_user is null then raise exception 'Connecte-toi pour pronostiquer.' using errcode='28000'; end if;
  if p_choix not in('a','b') then raise exception 'Choix classe invalide.' using errcode='22023'; end if;
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id for update;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  if v_match.statut<>'a_venir' or v_match.debut<=now() then raise exception 'Les pronostics sont fermes sur ce match.'; end if;
  if(select statut from v_saisons where id=v_match.saison_id)<>'en_cours' then raise exception 'Cette saison n''est pas ouverte aux pronostics.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||'|'||v_match.saison_id,0));
  if exists(select 1 from pronostics_classes where user_id=v_user and match_id=p_match_id) then raise exception 'Tu as deja un pronostic classe sur ce match.' using errcode='23505'; end if;
  if not private.clutch_open_scoring_v2(p_match_id) then raise exception 'Historique insuffisant : les calls ne sont pas encore ouverts.'; end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule';
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_proba:=case when p_choix='a' then v_snap.proba_a else v_snap.proba_b end;
  v_scoring:=clutch_borner_proba_frags(v_proba);
  insert into classements_frags(saison_id,user_id,frags,pic_frags) values(v_match.saison_id,v_user,clutch_frags_initial(),clutch_frags_initial()) on conflict(saison_id,user_id) do nothing;
  insert into pronostics_classes(user_id,match_id,saison_id,choix,proba_figee,proba_scoring,k_frags)
  values(v_user,p_match_id,v_match.saison_id,p_choix,v_proba,v_scoring,v_k) returning * into v_prono;
  return to_jsonb(v_prono)||jsonb_build_object('gain_si_correct',clutch_delta_frags(v_scoring,true,v_k),'perte_si_faux',clutch_delta_frags(v_scoring,false,v_k),'placement',v_k=clutch_frags_k_placement());
end;
$$;

alter function public.clutch_projection_match_frags_v2(text) volatile;
revoke all on function public.clutch_projection_match_frags(text) from public,anon,authenticated,service_role;
grant execute on function public.clutch_projection_match_frags(text) to anon,authenticated,service_role;
revoke all on function public.placer_pronostic_classe(text,text) from public,anon,authenticated,service_role;
grant execute on function public.placer_pronostic_classe(text,text) to authenticated,service_role;
notify pgrst, 'reload schema';
