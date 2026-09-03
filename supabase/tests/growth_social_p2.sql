-- P2 contracts: isolated fixtures, no data survives this transaction.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid(); guest_id uuid := gen_random_uuid(); outsider_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid(); suspect_id uuid := gen_random_uuid(); actor uuid; child uuid;
  installation uuid := gen_random_uuid(); operation uuid := gen_random_uuid(); proof uuid := gen_random_uuid();
  code text; other_code text; owner_name text; team text; result jsonb; replay jsonb; before_count integer;
  child_ids uuid[] := '{}'; event_id uuid; quiet_minute integer; i integer;
begin
  if public.clutch_contrat_economie_volts_v1() #>> '{parrainage,montant_volts}' <> '30'
    or public.clutch_contrat_economie_volts_v1() #>> '{parrainage,plafond_jour}' <> '5'
    or public.clutch_contrat_economie_volts_v1() #>> '{parrainage,plafond_mois}' <> '20'
    or not (public.clutch_contrat_analytics_v1()->'evenements') ?&
      array['invite_link_created','invite_activated','showcase_viewed','showcase_liked','milestone_share_created'] then
    raise exception 'P2 published contract mismatch';
  end if;
  if has_function_privilege('anon','public.clutch_accepter_invitation_v1(text,uuid)','execute')
    or has_function_privilege('authenticated','private.clutch_cycle_croissance_p2()','execute')
    or has_function_privilege('authenticated','private.clutch_recompenser_parrain_v1(uuid,timestamptz)','execute')
    or has_function_privilege('service_role','private.clutch_recompenser_parrain_v1(uuid,timestamptz)','execute')
    or has_table_privilege('authenticated','private.parrainages','select,insert,update,delete')
    or has_table_privilege('anon','private.vitrines_vues','select')
    or has_table_privilege('authenticated','private.vitrines_likes','select,insert,update,delete')
    or not (select relrowsecurity from pg_class where oid='private.vitrines_vues'::regclass)
    or (select prosecdef from pg_proc where oid='public.clutch_aimer_vitrine_v1(text,boolean)'::regprocedure) then
    raise exception 'P2 exposes internal data or privileged mutations';
  end if;

  foreach actor in array array[owner_id,guest_id,outsider_id,second_id,suspect_id] loop
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
    values(actor,'authenticated','authenticated','growth-'||actor||'@example.invalid',now(),
      '{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','g-'||left(replace(actor::text,'-',''),16)),
      now()-case when actor in (owner_id,outsider_id) then interval '2 days' else interval '1 hour' end,now(),false);
  end loop;
  select pseudo into owner_name from public.profils where id=owner_id;
  select id into team from public.equipes limit 1;
  if team is null then raise exception 'P2 contract needs the normal seeded esports catalogue'; end if;
  update public.profils set profil_public=true,equipe_favorite_id=team,jeux_suivis=array['lol']
    where id in (owner_id,guest_id,outsider_id,second_id,suspect_id);
  insert into private.preferences_confidentialite(user_id,analytics_autorise) values(owner_id,true),(guest_id,true)
    on conflict(user_id) do update set analytics_autorise=excluded.analytics_autorise;

  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.clutch_creer_invitation_v1(installation);
  replay:=public.clutch_creer_invitation_v1(installation);
  code:=result->>'code';
  if code !~ '^[0-9a-f]{32}$' or result<>replay then raise exception 'Invitation link is not stable'; end if;
  result:=public.clutch_accepter_invitation_v1(code,installation);
  if result->>'erreur'<>'invite_self' then raise exception 'Self-referral accepted'; end if;
  perform public.clutch_partager_invitation_v1(operation);
  perform public.clutch_partager_invitation_v1(operation);
  result:=public.clutch_mes_invitations_v1();
  execute 'reset role';
  if result->>'partages'<>'1' or result->>'volts_recus'<>'0' then raise exception 'Sharing rewards an install or double counts'; end if;

  perform set_config('request.jwt.claim.sub',guest_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',guest_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.clutch_accepter_invitation_v1(code,gen_random_uuid());
  replay:=public.clutch_accepter_invitation_v1(code,gen_random_uuid());
  execute 'reset role';
  if result->>'nouvelle'<>'true' or replay->>'nouvelle'<>'false'
    or (select count(*) from private.protecteurs_serie_mouvements where user_id=guest_id)<>1
    or exists(select 1 from public.volts_mouvements where user_id=owner_id) then
    raise exception 'Acceptance was not idempotent or duplicated the P1 welcome';
  end if;
  perform private.clutch_enregistrer_jour_call_v1(guest_id,proof,'growth-proof-'||proof,clock_timestamp());
  perform private.clutch_enregistrer_jour_call_v1(guest_id,proof,'growth-proof-'||proof,clock_timestamp());
  if (select premier_call from private.parrainages where filleul_id=guest_id)<>proof
    or exists(select 1 from public.volts_mouvements where user_id=owner_id) then
    raise exception 'Activation failed or credited inside the invitee transaction';
  end if;
  perform private.clutch_recompenser_parrain_v1(owner_id);
  perform private.clutch_recompenser_parrain_v1(owner_id);
  if (select count(*) from public.volts_mouvements where user_id=owner_id and origine='parrainage')<>1
    or (select sum(montant) from public.volts_mouvements where user_id=owner_id)<>30 then
    raise exception 'First eligible call did not credit exactly once';
  end if;

  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  other_code:=public.clutch_creer_invitation_v1(gen_random_uuid())->>'code';
  perform set_config('request.jwt.claim.sub',guest_id::text,true);
  if public.clutch_accepter_invitation_v1(other_code,gen_random_uuid())->>'erreur'<>'invite_already_attributed' then
    raise exception 'A second referrer replaced the first';
  end if;
  perform set_config('request.jwt.claim.sub',suspect_id::text,true);
  perform public.clutch_accepter_invitation_v1(code,installation);
  proof:=gen_random_uuid();
  perform private.clutch_enregistrer_jour_call_v1(suspect_id,proof,'growth-suspect-'||proof,clock_timestamp());
  perform private.clutch_recompenser_parrain_v1(owner_id);
  if (select recompense from private.parrainages where filleul_id=suspect_id)<>'verification' then raise exception 'Shared installation bypassed review'; end if;

  -- Cap five rewards, even when an already rewarded invitee deletes the account.
  delete from auth.users where id=guest_id;
  for i in 1..6 loop
    child:=gen_random_uuid(); child_ids:=array_append(child_ids,child);
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
    values(child,'authenticated','authenticated','growth-'||child||'@example.invalid',now(),'{"provider":"email"}',
      jsonb_build_object('pseudo','g-'||left(replace(child::text,'-',''),16)),now()-interval '1 hour',now(),false);
    update public.profils set equipe_favorite_id=team,jeux_suivis=array['lol'] where id=child;
    perform set_config('request.jwt.claim.sub',child::text,true);
    perform public.clutch_accepter_invitation_v1(code,gen_random_uuid());
    proof:=gen_random_uuid();
    perform private.clutch_enregistrer_jour_call_v1(child,proof,'growth-cap-'||proof,clock_timestamp());
  end loop;
  perform private.clutch_recompenser_parrain_v1(owner_id);
  if (select count(*) from public.volts_mouvements where user_id=owner_id and origine='parrainage')<>5
    or (select count(*) from private.parrainages where parrain_id=owner_id and recompense='plafonnee')<>2 then
    raise exception 'Daily cap bypassed, including via invitee deletion';
  end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  result:=public.clutch_mes_invitations_v1();
  if result->>'volts_recus'<>'150' or result->>'recompenses_jour'<>'5'
    or result::text like '%filleul_id%' or result::text like '%email%' then raise exception 'Referral dashboard leaks identity or loses its ledger'; end if;

  -- Views are authenticated visitor/day unique. Owners never count themselves.
  perform public.clutch_visiter_vitrine_v1(owner_name);
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.clutch_visiter_vitrine_v1(owner_name);
  replay:=public.clutch_visiter_vitrine_v1(owner_name);
  result:=public.clutch_aimer_vitrine_v1(owner_name,true);
  replay:=public.clutch_aimer_vitrine_v1(owner_name,true);
  execute 'reset role';
  if result->>'likes'<>'1' or replay->>'likes'<>'1' or result->'vues'<>'null'::jsonb
    or (select count(*) from private.vitrines_vues where proprietaire_id=owner_id)<>1 then
    raise exception 'Duplicate view/like or private view counts exposed';
  end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  result:=public.clutch_vitrine_v1(owner_name);
  if result->>'vues'<>'1' or result->>'vues_semaine'<>'1' then raise exception 'Owner view totals wrong'; end if;
  perform private.clutch_cycle_croissance_p2();
  perform private.clutch_cycle_croissance_p2();
  if (select count(*) from public.evenements_notification where user_id=owner_id and type='vitrine_likes')<>1 then
    raise exception 'Likes notifications were not grouped';
  end if;

  -- Private/friends-only scopes and per-field visibility are enforced by SQL.
  perform public.clutch_preferences_vitrine_v1('privee',false,false,false,false);
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  if public.clutch_vitrine_v1(owner_name) is not null or public.clutch_visiter_vitrine_v1(owner_name) is not null then
    raise exception 'Private showcase readable by another account';
  end if;
  perform public.clutch_aimer_vitrine_v1(owner_name,false);
  if exists(select 1 from private.vitrines_likes where proprietaire_id=owner_id)
    or private.clutch_notification_vitrine_pertinente_v1(owner_id,clock_timestamp()) then
    raise exception 'Unlike after privacy change failed or stale notification remains relevant';
  end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.clutch_preferences_vitrine_v1('cercle',false,false,false,false);
  insert into public.amities(a,b,demandeur,statut) values(least(owner_id,outsider_id),greatest(owner_id,outsider_id),owner_id,'acceptee');
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  result:=public.clutch_vitrine_v1(owner_name);
  if result is null or result->'classement'<>'null'::jsonb or result#>>'{serie,meilleure}' is not null then
    raise exception 'Accepted friend access or hidden fields mismatch';
  end if;
  perform set_config('request.jwt.claim.sub',second_id::text,true);
  if public.clutch_vitrine_v1(owner_name) is not null then raise exception 'Non-friend read a circle showcase'; end if;
  insert into private.utilisateurs_bloques(bloqueur_id,bloque_id) values(outsider_id,owner_id);
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  if public.clutch_vitrine_v1(owner_name) is not null then raise exception 'Blocking not enforced both ways'; end if;
  delete from private.utilisateurs_bloques where bloqueur_id=outsider_id;

  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.clutch_preferences_vitrine_v1('publique',true,true,true,true);
  if public.clutch_partage_jalon_v1(100)->>'erreur'<>'milestone_not_public' then raise exception 'Unearned milestone shared'; end if;
  insert into private.series_calls_jalons(user_id,palier,obtenu_le) values(owner_id,3,clock_timestamp());
  if public.clutch_partage_jalon_v1(3)->>'palier'<>'3' then raise exception 'Earned milestone unavailable'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon';
  result:=public.clutch_vitrine_v1(owner_name);
  replay:=public.clutch_jalon_public_v1(owner_name,3);
  if result->>'proprietaire' is distinct from 'false' or result->'vues' is distinct from 'null'::jsonb
    or result->>'peut_aimer' is distinct from 'false' or replay->>'palier' is distinct from '3' then
    raise exception 'Anonymous projection mismatch';
  end if;
  execute 'reset role';
  update public.profils set profil_public=false where id=owner_id;
  if public.clutch_vitrine_v1(owner_name) is not null or public.clutch_jalon_public_v1(owner_name,3) is not null
    or public.clutch_invitation_publique_v1(code)->'parrain'<>'null'::jsonb then
    raise exception 'Private profile leaked showcase, milestone or inviter identity';
  end if;
  -- An unconfirmed, anonymous, deleted or banned account cannot mutate growth.
  perform set_config('request.jwt.claim.sub',second_id::text,true);
  update auth.users set is_anonymous=true where id=second_id;
  begin perform public.clutch_creer_invitation_v1(gen_random_uuid()); raise exception 'Anonymous Auth accepted';
    exception when sqlstate '28000' then null; end;
  update auth.users set is_anonymous=false,email_confirmed_at=null where id=second_id;
  begin perform public.clutch_mes_invitations_v1(); raise exception 'Unconfirmed Auth accepted';
    exception when sqlstate '28000' then null; end;
  update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 day' where id=second_id;
  begin perform public.clutch_mes_invitations_v1(); raise exception 'Banned Auth accepted';
    exception when sqlstate '28000' then null; end;
  update auth.users set banned_until=null,deleted_at=now() where id=second_id;
  begin perform public.clutch_mes_invitations_v1(); raise exception 'Soft-deleted Auth accepted';
    exception when sqlstate '28000' then null; end;
  update public.profils set profil_public=true where id=owner_id;
  update auth.users set deleted_at=now() where id=owner_id;
  perform set_config('request.jwt.claim.sub','',true);
  if public.clutch_vitrine_v1(owner_name) is not null or public.clutch_jalon_public_v1(owner_name,3) is not null
    or public.clutch_invitation_publique_v1(code) is not null then
    raise exception 'Soft-deleted owner remained publicly visible';
  end if;
  perform set_config('request.jwt.claim.sub',second_id::text,true);
  delete from auth.users where id=second_id;
  begin perform public.clutch_mes_invitations_v1(); raise exception 'Deleted Auth accepted';
    exception when sqlstate '28000' then null; end;
end $$;

-- A queued like notification must still respect privacy, quiet hours, token
-- ownership, account blocks and the latest like state when the worker claims it.
do $$
declare
  owner_id uuid := gen_random_uuid(); viewer_id uuid := gen_random_uuid(); actor uuid;
  event_id uuid; token_id uuid; minute_now integer; scenario text; result jsonb;
begin
  foreach actor in array array[owner_id,viewer_id] loop
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
    values(actor,'authenticated','authenticated','growth-push-'||actor||'@example.invalid',now(),'{"provider":"email"}',
      jsonb_build_object('pseudo','gp-'||left(replace(actor::text,'-',''),16)),now(),now(),false);
  end loop;
  update public.profils set profil_public=true where id in (owner_id,viewer_id);
  insert into private.vitrines_sociales(user_id) values(owner_id);
  insert into public.preferences_notifications(user_id,fuseau,silence_actif) values(owner_id,'UTC',false)
    on conflict(user_id) do update set fuseau='UTC',silence_actif=false;
  insert into public.jetons_notification(user_id,jeton_expo,plateforme)
    values(owner_id,'ExpoPushToken[growth_'||replace(owner_id::text,'-','')||']','ios') returning id into token_id;
  insert into private.vitrines_likes(proprietaire_id,visiteur_id) values(owner_id,viewer_id);
  event_id:=private.clutch_ajouter_notification_v1(owner_id,'vitrine_likes','growth-fixture',
    'Activité de ta vitrine','Un nouveau like.',jsonb_build_object('path','/showcase-activity'));
  if event_id is null or not exists(select 1 from public.livraisons_notification where notification_id=event_id) then
    raise exception 'Like notification delivery fixture was not queued';
  end if;
  minute_now:=extract(hour from clock_timestamp() at time zone 'UTC')::integer*60
    +extract(minute from clock_timestamp() at time zone 'UTC')::integer;
  foreach scenario in array array['disabled','quiet','private','profile_private','unlike','expired','blocked','account_switch','owner_deleted','visitor_deleted','owner_banned','enabled'] loop
    update private.vitrines_sociales set visibilite=case when scenario='private' then 'privee' else 'publique' end,
      notifications_likes=scenario<>'disabled' where user_id=owner_id;
    update public.profils set profil_public=scenario<>'profile_private' where id=owner_id;
    update auth.users set deleted_at=case when scenario='owner_deleted' then now() end,
      banned_until=case when scenario='owner_banned' then now()+interval '1 day' end where id=owner_id;
    update auth.users set deleted_at=case when scenario='visitor_deleted' then now() end where id=viewer_id;
    update public.preferences_notifications set silence_actif=scenario='quiet',
      silence_debut=(minute_now+1439)%1440,silence_fin=(minute_now+5)%1440 where user_id=owner_id;
    update public.jetons_notification set user_id=case when scenario='account_switch' then viewer_id else owner_id end where id=token_id;
    delete from private.vitrines_likes where proprietaire_id=owner_id;
    if scenario<>'unlike' then
      insert into private.vitrines_likes(proprietaire_id,visiteur_id,cree_le)
      values(owner_id,viewer_id,clock_timestamp()-case when scenario='expired' then interval '25 hours' else interval '0 seconds' end);
    end if;
    delete from private.utilisateurs_bloques where bloqueur_id=owner_id;
    if scenario='blocked' then insert into private.utilisateurs_bloques(bloqueur_id,bloque_id) values(owner_id,viewer_id); end if;
    perform set_config('request.jwt.claim.role','service_role',true);
    execute 'set local role service_role';
    result:=public.clutch_reclamer_livraisons_notification_v1(100);
    execute 'reset role';
    if scenario='enabled' then
      if not exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text) then
        raise exception 'A relevant enabled like notification could not be claimed';
      end if;
    elsif exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text)
      or exists(select 1 from public.livraisons_notification where notification_id=event_id and tentatives<>0) then
      raise exception 'Deferred like notification ignored % or consumed a delivery attempt',scenario;
    end if;
  end loop;
  perform set_config('request.jwt.claim.role','authenticated',true);
end $$;

-- Exercise the monthly limit independently of the daily limit, on every date
-- the test suite runs (including the first day of a real calendar month).
do $$
declare
  parent uuid := gen_random_uuid(); child uuid; reference_id uuid; i integer;
  processing_time timestamptz := '2030-06-15 12:00:00+00';
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
  values(parent,'authenticated','authenticated','growth-month-'||parent||'@example.invalid',now(),'{"provider":"email"}',
    jsonb_build_object('pseudo','gm-'||left(replace(parent::text,'-',''),16)),now()-interval '2 days',now(),false);
  perform private.clutch_initialiser_serie_v1(parent,'UTC');
  for i in 1..19 loop
    reference_id:=gen_random_uuid();
    insert into public.volts_mouvements(user_id,montant,origine,reference,cree_le)
    values(parent,30,'parrainage','parrainage:'||reference_id,
      timestamptz '2030-06-01 12:00:00+00' + ((i-1)/5)*interval '1 day');
  end loop;
  for i in 1..5 loop
    child:=gen_random_uuid();
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
    values(child,'authenticated','authenticated','growth-month-'||child||'@example.invalid',now(),'{"provider":"email"}',
      jsonb_build_object('pseudo','gm-'||left(replace(child::text,'-',''),16)),now()-interval '1 hour',now(),false);
    if i=3 then processing_time:='2030-06-16 12:00:00+00'; end if;
    if i=4 then processing_time:='2030-07-01 12:00:00+00'; end if;
    insert into private.parrainages(filleul_id,parrain_id,active_le,premier_call)
    values(child,parent,processing_time,gen_random_uuid());
    perform private.clutch_recompenser_parrain_v1(parent,processing_time);
    perform private.clutch_recompenser_parrain_v1(parent,processing_time);
    if i in (2,3) and (select recompense from private.parrainages where filleul_id=child)<>'plafonnee' then
      raise exception 'Monthly cap bypassed while daily count was below five';
    end if;
    if i in (1,4,5) and (select recompense from private.parrainages where filleul_id=child)<>'attribuee' then
      raise exception 'Reward below the monthly cap, or in the new month, was rejected';
    end if;
  end loop;
  if (select count(*) from public.volts_mouvements where user_id=parent and origine='parrainage'
       and cree_le>='2030-06-01+00'::timestamptz and cree_le<'2030-07-01+00'::timestamptz)<>20
    or (select count(*) from public.volts_mouvements where user_id=parent and origine='parrainage'
       and cree_le>='2030-07-01+00'::timestamptz)<>2
    or (select count(*) from private.parrainages where parrain_id=parent and recompense='plafonnee')<>2 then
    raise exception 'Monthly reset replays capped rewards or duplicates ledger credits';
  end if;
end $$;
rollback;
