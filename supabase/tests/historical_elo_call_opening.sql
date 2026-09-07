begin;
do $$
declare payload jsonb; coverage jsonb; before_ratings jsonb; frozen jsonb; projected jsonb; n integer; user_id uuid:=gen_random_uuid(); call_before jsonb;
begin
  if has_function_privilege('anon','public.clutch_import_elo_history_v2(jsonb,jsonb)','execute')
    or has_function_privilege('authenticated','public.clutch_elo_status_v2()','execute')
    or has_function_privilege('service_role','private.clutch_open_scoring_v2(text)','execute') then
    raise exception 'Elo privileges are too broad'; end if;
  if not has_function_privilege('service_role','public.clutch_import_elo_history_v2(jsonb,jsonb)','execute') then raise exception 'Service import unavailable'; end if;
  if public.clutch_delta_frags(.8,true,40)<>8 or public.clutch_delta_frags(.8,false,40)<>-32
    or public.clutch_delta_frags(.2,true,40)<>32 or public.clutch_delta_frags(.2,false,40)<>-8
    or public.clutch_delta_frags(.5,true,40)<>20 then raise exception 'Scoring formula changed'; end if;
  insert into public.saisons(id,nom,debut,fin,solde_initial) values('elo-test','Elo',now()-interval '1 day',now()+interval '2 days',0);
  insert into public.equipes(id,jeu,nom,tag) values('ps-team-998001','lol','Alpha','AL'),('ps-team-998002','lol','Beta','BE');
  insert into public.evenements(id,jeu,nom) values('elo-test','lol','Elo');
  insert into public.matchs(id,event_id,saison_id,jeu,equipe_a_id,equipe_b_id,format,debut)
  values('ps-match-998001','elo-test','elo-test','lol','ps-team-998001','ps-team-998002',5,now()+interval '2 hours');
  if exists(select 1 from public.matchs_scoring_frags where match_id='ps-match-998001') then raise exception 'Frozen at import'; end if;
  projected:=public.clutch_projection_match_frags('ps-match-998001');
  if projected->>'status'<>'preparing' or jsonb_array_length(projected->'choix')<>0 then raise exception 'Cold start disguised as 50/50'; end if;
  select count(*) into n from public.classements_frags;
  select jsonb_agg(jsonb_build_object('game','lol','external_match_id',(998100+i)::text,'status','finished','format',3,
    'begin_at',now()-(i||' days')::interval,'team_a_external_id','998001','team_b_external_id','998002','score_a',case when i in (2,6) then 0 else 2 end,'score_b',case when i in (2,6) then 2 else 0 end))
    into payload from generate_series(1,8) i;
  coverage:=jsonb_build_object('lol',now()-interval '90 days');
  perform public.clutch_import_elo_history_v2(payload,coverage);
  if (select count(*) from public.classements_frags)<>n then raise exception 'History changed player ranks'; end if;
  if (select count(*) from public.matchs where saison_id='elo-test')<>1 then raise exception 'History created playable fixtures'; end if;
  select ratings into before_ratings from private.elo_models_v2 where game='lol';
  perform public.clutch_import_elo_history_v2((select jsonb_agg(value order by ord desc) from jsonb_array_elements(payload) with ordinality x(value,ord)),coverage);
  if (select ratings from private.elo_models_v2 where game='lol')<>before_ratings then raise exception 'Replay not chronological/idempotent'; end if;
  if (select ratings->'ps-team-998001'->>'n' from private.elo_models_v2 where game='lol')<>'8' then raise exception 'History duplicated'; end if;
  if private.clutch_open_scoring_v2('ps-match-998001') is not true then raise exception 'Ready history did not open calls'; end if;
  frozen:=public.clutch_projection_match_frags('ps-match-998001');
  if frozen->>'source'<>'elo_history_v2' or (frozen#>>'{choix,0,proba}')::numeric<=.5
    or (frozen#>>'{choix,0,gain}')::integer>=20 or (frozen#>>'{choix,0,perte}')::integer>=-20 then raise exception 'Favorite/outsider not differentiated: %',frozen; end if;
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(user_id,'authenticated','authenticated',user_id::text||'@example.invalid',now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','elo-test-'||left(user_id::text,8)),now(),now());
  perform set_config('request.jwt.claim.sub',user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  call_before:=public.placer_pronostic_classe('ps-match-998001','a');
  if (call_before->>'proba_figee')::numeric<>(frozen#>>'{choix,0,proba}')::numeric
    or (call_before->>'gain_si_correct')::integer<>(frozen#>>'{choix,0,gain}')::integer then raise exception 'Call differs from displayed contract'; end if;
  begin
    update public.matchs set format=3 where id='ps-match-998001';
    raise exception 'Published contract allowed a format change';
  exception when sqlstate '55000' then null; end;
  -- Corrections replay the model but never rewrite a published contract.
  payload:=jsonb_set(jsonb_set(payload,'{0,score_a}','0'),'{0,score_b}','2');
  perform public.clutch_import_elo_history_v2(payload,coverage);
  if (select ratings from private.elo_models_v2 where game='lol')=before_ratings then raise exception 'Correction ignored'; end if;
  if public.clutch_projection_match_frags('ps-match-998001')<>frozen then raise exception 'Published contract changed'; end if;
  if (select proba_figee from public.pronostics_classes where id=(call_before->>'id')::uuid)<>(call_before->>'proba_figee')::numeric then raise exception 'Existing call changed'; end if;
  insert into public.matchs(id,event_id,saison_id,jeu,equipe_a_id,equipe_b_id,format,debut)
  values('ps-match-998002','elo-test','elo-test','lol','ps-team-998001','ps-team-998002',5,now()+interval '3 hours');
  update private.elo_models_v2 set synced_at=now()-interval '25 hours' where game='lol';
  if private.clutch_open_scoring_v2('ps-match-998002') then raise exception 'Stale history opened new calls'; end if;
  if public.clutch_projection_match_frags('ps-match-998001')<>frozen then raise exception 'Staleness invalidated published contract'; end if;
  -- Existing V1 estimates remain usable even without historical coverage.
  insert into public.matchs_scoring_frags(match_id,proba_a,proba_b,source) values('ps-match-998002',.5,.5,'elo_v1');
  if public.clutch_projection_match_frags('ps-match-998002')->>'source'<>'elo_v1' then raise exception 'Legacy contract not preserved'; end if;
end $$;
rollback;
