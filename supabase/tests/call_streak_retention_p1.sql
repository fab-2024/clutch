-- Real SQL contracts; every fixture and mutation is rolled back.
begin;
do $$
declare
  u uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
  n uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  l uuid := gen_random_uuid();
  fixture_user uuid;
  op uuid := gen_random_uuid();
  proof uuid := gen_random_uuid();
  event_id uuid;
  token_id uuid;
  delivery_id uuid;
  result jsonb;
  replay jsonb;
  contract jsonb;
  tz text;
  quiet_minute integer;
  today date;
  imminent timestamptz;
  fixture text := 'retention-' || gen_random_uuid()::text;
  v_day record;
begin
  contract := public.clutch_contrat_analytics_v1();
  if (contract ->> 'version')::integer <> 6 or not (contract -> 'evenements') ?&
    array['daily_bonus_awarded','call_created','call_streak_extended','streak_protector_used','notification_sent','notification_opened'] then
    raise exception 'Missing P1 analytics contract';
  end if;
  if public.clutch_contrat_economie_volts_v1() #>> '{consommables,protecteur_serie,prix_volts}' <> '90'
    or public.clutch_contrat_economie_volts_v1() #>> '{garde_fous,impact_classement}' <> 'false' then
    raise exception 'Invalid P1 economy contract';
  end if;
  foreach fixture_user in array array[u,s,n,a,c,b,l] loop
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
    values (fixture_user,'authenticated','authenticated','retention-'||fixture_user::text||'@example.invalid',now(),
      '{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','rt-'||left(replace(fixture_user::text,'-',''),15)),now(),now(),fixture_user=a);
  end loop;
  insert into private.preferences_confidentialite(user_id,analytics_autorise) values(u,true),(s,true),(n,false),(c,true)
    on conflict(user_id) do update set analytics_autorise=excluded.analytics_autorise;
  if has_function_privilege('anon','public.clutch_ma_serie_calls_v1(text)','execute')
    or has_function_privilege('authenticated','private.clutch_enregistrer_jour_call_v1(uuid,uuid,text,timestamptz)','execute')
    or has_function_privilege('authenticated','private.clutch_cycle_retention_p1()','execute')
    or has_function_privilege('authenticated','public.clutch_reclamer_livraisons_notification_v1(integer)','execute')
    or has_table_privilege('authenticated','private.series_calls_etats','select,insert,update,delete')
    or has_table_privilege('authenticated','private.protecteurs_serie_mouvements','select,insert,update,delete')
    or (select prosecdef from pg_proc where oid='public.clutch_acheter_protecteur_serie_v1(uuid)'::regprocedure)
    or not (select relrowsecurity from pg_class where oid='private.series_calls_jours'::regclass) then
    raise exception 'P1 exposes a privileged client write/read';
  end if;

  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result := public.clutch_ma_serie_calls_v1('Europe/Paris');
  replay := public.clutch_ma_serie_calls_v1('Pacific/Kiritimati');
  execute 'reset role';
  if result->>'serie_actuelle'<>'0' or result->>'stock_protecteurs'<>'1'
    or replay->>'fuseau'<>'Europe/Paris' or replay->>'solde_volts'<>'0'
    or (select count(*) from private.protecteurs_serie_mouvements where user_id=u)<>1
    or exists(select 1 from public.volts_mouvements where user_id=u and origine='bonus_quotidien') then
    raise exception 'Enrollment grants duplicated stock, a fake call or a login reward';
  end if;
  -- Neither anonymous Auth accounts nor a missing identity can initialize.
  perform set_config('request.jwt.claim.sub',a::text,true);
  begin perform public.clutch_ma_serie_calls_v1('UTC'); raise exception 'Anonymous account accepted';
    exception when sqlstate '28000' then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.clutch_ma_serie_calls_v1('UTC'); raise exception 'Missing auth accepted';
    exception when sqlstate '28000' then null; end;

  -- Cash and stock are changed together, under the same lock as daily bonus.
  perform public.clutch_crediter_volts(u,300,'onboarding','retention-test');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.clutch_acheter_protecteur_serie_v1(op);
  replay:=public.clutch_acheter_protecteur_serie_v1(op);
  execute 'reset role';
  if result->>'achete'<>'true' or replay->>'achete'<>'false'
    or result#>>'{etat,stock_protecteurs}'<>'2' or replay#>>'{etat,solde_volts}'<>'210'
    or result->>'mouvement_id'<>replay->>'mouvement_id'
    or (select count(*) from public.volts_mouvements where user_id=u and origine='achat_consommable')<>1 then
    raise exception 'Purchase replay debits twice or exceeds stock';
  end if;
  begin perform public.clutch_acheter_protecteur_serie_v1(gen_random_uuid()); raise exception 'Stock cap bypassed';
    exception when sqlstate 'P0001' then if sqlerrm<>'protector_stock_full' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',n::text,true);
  perform private.clutch_initialiser_serie_v1(n,'UTC');
  begin perform public.clutch_acheter_protecteur_serie_v1(gen_random_uuid()); raise exception 'Negative balance accepted';
    exception when sqlstate 'P0001' then if sqlerrm<>'insufficient_volts' then raise; end if; end;
  if exists(select 1 from public.volts_mouvements where user_id=n) then raise exception 'Rejected purchase debited'; end if;

  -- A deterministic call-day timeline crosses the 23-hour DST day in Paris.
  perform private.clutch_initialiser_serie_v1(s,'Europe/Paris');
  perform public.clutch_crediter_volts(s,300,'onboarding','retention-test');
  perform set_config('request.jwt.claim.sub',s::text,true);
  perform public.clutch_acheter_protecteur_serie_v1(gen_random_uuid());
  update private.series_calls_etats set cree_le='2026-03-27 00:00+01',traite_jusqua='2026-03-26',
    prochaine_cloture='2026-03-28 00:00+01' where user_id=s;
  insert into private.series_calls_fenetres(match_id,ouvert_le,ferme_le)
    values(fixture||'-opportunity','2026-03-01 00:00+01','2026-04-20 00:00+02');
  perform private.clutch_enregistrer_jour_call_v1(s,proof,fixture||'-call-1','2026-03-27 23:59:59+01');
  perform private.clutch_enregistrer_jour_call_v1(s,proof,fixture||'-call-1','2026-03-27 23:59:59+01');
  perform private.clutch_enregistrer_jour_call_v1(s,gen_random_uuid(),fixture||'-call-2','2026-03-27 23:59:59+01');
  perform private.clutch_enregistrer_jour_call_v1(s,gen_random_uuid(),fixture||'-call-3','2026-03-28 00:00:00+01');
  perform private.clutch_enregistrer_jour_call_v1(s,gen_random_uuid(),fixture||'-call-4','2026-03-29 12:00:00+02');
  if (select serie_actuelle from private.series_calls_etats where user_id=s)<>3
    or (select nb_calls from private.series_calls_jours where user_id=s and jour='2026-03-27')<>2
    or (select count(*) from private.series_calls_jalons where user_id=s and palier=3)<>1 then
    raise exception 'A second call/retry extended the day streak or milestone missing';
  end if;
  select * into v_day from private.clutch_journee_recompense_v1('2026-03-29 12:00+02','Europe/Paris');
  if v_day.fin-v_day.debut<>interval '23 hours' then raise exception 'DST spring boundary broken'; end if;
  select * into v_day from private.clutch_journee_recompense_v1('2026-10-25 12:00+01','Europe/Paris');
  if v_day.fin-v_day.debut<>interval '25 hours' then raise exception 'DST autumn boundary broken'; end if;

  perform private.clutch_clore_journees_serie_v1(s,'2026-03-31 00:00+02');
  perform private.clutch_clore_journees_serie_v1(s,'2026-03-31 00:00+02');
  if (select serie_actuelle from private.series_calls_etats where user_id=s)<>3
    or (select stock_protecteurs from private.series_calls_etats where user_id=s)<>1
    or (select nb_calls from private.series_calls_jours where user_id=s and jour='2026-03-30')<>0
    or (select etat from private.series_calls_jours where user_id=s and jour='2026-03-30')<>'protege'
    or (select count(*) from private.protecteurs_serie_mouvements where user_id=s and type='utilisation')<>1 then
    raise exception 'Protection duplicated or manufactured a valid day';
  end if;
  perform private.clutch_enregistrer_jour_call_v1(s,gen_random_uuid(),fixture||'-call-5','2026-03-31 12:00+02');
  perform private.clutch_clore_journees_serie_v1(s,'2026-04-02 00:00+02');
  if (select serie_actuelle from private.series_calls_etats where user_id=s)<>0
    or (select meilleure_serie from private.series_calls_etats where user_id=s)<>4
    or (select stock_protecteurs from private.series_calls_etats where user_id=s)<>1
    or (select etat from private.series_calls_jours where user_id=s and jour='2026-04-01')<>'manque' then
    raise exception 'A second protector was used in the same streak';
  end if;
  if (select count(*) from private.analytics_evenements where user_id=s and type_evenement='call_created')<>5
    or (select count(*) from private.analytics_evenements where user_id=s and type_evenement='call_streak_extended')<>4
    or (select count(*) from private.analytics_evenements where user_id=s and type_evenement='streak_protector_used')<>1 then
    raise exception 'P1 analytics not idempotent';
  end if;
  -- A retained proof cannot validate another day after deletion/re-creation.
  perform private.clutch_enregistrer_jour_call_v1(s,gen_random_uuid(),fixture||'-call-5','2026-04-02 12:00+02');
  if (select serie_actuelle from private.series_calls_etats where user_id=s)<>0 then raise exception 'Recreated call extended streak'; end if;
  result:=public.clutch_selectionner_jalon_serie_v1(3);
  if result->>'jalon_selectionne'<>'3' then raise exception 'Earned milestone could not be equipped'; end if;
  begin perform public.clutch_selectionner_jalon_serie_v1(100); raise exception 'Locked milestone equipped';
    exception when sqlstate '22023' then null; end;

  -- Two consecutive missed days cannot consume two protectors. A NEW streak
  -- can use the remaining protector, without adding either protected day.
  perform private.clutch_initialiser_serie_v1(b,'UTC');
  perform public.clutch_crediter_volts(b,90,'onboarding','retention-test');
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.clutch_acheter_protecteur_serie_v1(gen_random_uuid());
  update private.series_calls_etats set cree_le='2026-03-01 00:00Z',traite_jusqua='2026-02-28',
    prochaine_cloture='2026-03-02 00:00Z' where user_id=b;
  perform private.clutch_enregistrer_jour_call_v1(b,gen_random_uuid(),fixture||'-b-1','2026-03-01 12:00Z');
  perform private.clutch_clore_journees_serie_v1(b,'2026-03-04 00:00Z');
  if (select serie_actuelle from private.series_calls_etats where user_id=b)<>0
    or (select stock_protecteurs from private.series_calls_etats where user_id=b)<>1
    or (select etat from private.series_calls_jours where user_id=b and jour='2026-03-03')<>'manque' then
    raise exception 'Two consecutive missed days were protected';
  end if;
  perform private.clutch_enregistrer_jour_call_v1(b,gen_random_uuid(),fixture||'-b-2','2026-03-04 12:00Z');
  perform private.clutch_clore_journees_serie_v1(b,'2026-03-06 00:00Z');
  if (select stock_protecteurs from private.series_calls_etats where user_id=b)<>0
    or (select serie_actuelle from private.series_calls_etats where user_id=b)<>1
    or (select jours_valides from private.series_calls_etats where user_id=b)<>2
    or (select count(*) from private.protecteurs_serie_mouvements where user_id=b and type='utilisation')<>2 then
    raise exception 'A new streak cannot use its remaining protector or inflated valid days';
  end if;

  -- Empty days are neutral, not fictitious calls and not paid protection.
  update private.series_calls_etats set cree_le='2500-03-27 00:00Z',traite_jusqua='2500-03-26',
    prochaine_cloture='2500-03-28 00:00Z' where user_id=n;
  perform private.clutch_enregistrer_jour_call_v1(n,gen_random_uuid(),fixture||'-future','2500-03-27 12:00Z');
  perform private.clutch_clore_journees_serie_v1(n,'2500-03-31 00:00Z');
  if (select serie_actuelle from private.series_calls_etats where user_id=n)<>1
    or (select stock_protecteurs from private.series_calls_etats where user_id=n)<>1
    or exists(select 1 from private.series_calls_jours where user_id=n and jour>'2500-03-27' and etat<>'neutre')
    or exists(select 1 from private.analytics_evenements where user_id=n) then
    raise exception 'No-opportunity days or analytics consent violated';
  end if;

  -- Live availability, after-insert proof and platform cancellation behavior.
  insert into public.saisons(id,nom,debut,fin) values(fixture,'Retention fixture',now()-interval '1 day',now()+interval '10 days');
  insert into public.equipes(id,jeu,nom,tag) values(fixture||'-a','lol','Retention A','RA'),(fixture||'-b','lol','Retention B','RB');
  insert into public.evenements(id,jeu,nom) values(fixture,'lol','Retention fixture');
  insert into public.matchs(id,event_id,saison_id,jeu,equipe_a_id,equipe_b_id,format,debut)
  values(fixture,fixture,fixture,'lol',fixture||'-a',fixture||'-b',3,now()+interval '2 days');
  insert into public.matchs_scoring_frags(match_id,proba_a,proba_b) values(fixture,0.5,0.5) on conflict do nothing;

  -- Reopening in a future season cannot create an opportunity during the pause.
  insert into public.saisons(id,nom,debut,fin) values(fixture||'-shift','Shift fixture',now()-interval '1 day',now()+interval '10 days');
  insert into public.matchs(id,event_id,saison_id,jeu,equipe_a_id,equipe_b_id,format,debut)
  values(fixture||'-shift',fixture,fixture||'-shift','lol',fixture||'-a',fixture||'-b',3,now()+interval '3 days');
  insert into public.matchs_scoring_frags(match_id,proba_a,proba_b) values(fixture||'-shift',0.5,0.5) on conflict do nothing;
  update public.saisons set debut=now()+interval '1 day' where id=fixture||'-shift';
  if exists(select 1 from private.series_calls_fenetres where match_id=fixture||'-shift'
    and ouvert_le<now()+interval '23 hours' and ferme_le>now()+interval '1 hour') then
    raise exception 'Postponed season counted its suspension as call availability';
  end if;
  update public.matchs set statut='annule' where id=fixture||'-shift';
  if exists(select 1 from private.series_calls_fenetres where match_id=fixture||'-shift'
    and ouvert_le<now()+interval '2 days' and ferme_le>greatest(ouvert_le,now()+interval '25 hours')) then
    raise exception 'Cancelled future market still appears available';
  end if;

  -- A purchase after midnight cannot rescue yesterday using stock bought today.
  perform private.clutch_initialiser_serie_v1(l,'UTC');
  today:=(clock_timestamp() at time zone 'UTC')::date;
  update private.series_calls_etats set serie_actuelle=1,meilleure_serie=1,jours_valides=1,
    cree_le=(today-2)::timestamp at time zone 'UTC',traite_jusqua=today-2,
    stock_protecteurs=0,prochaine_cloture=today::timestamp at time zone 'UTC' where user_id=l;
  insert into private.series_calls_fenetres(match_id,ouvert_le,ferme_le)
    values(fixture||'-past-opportunity',(today-1)::timestamp at time zone 'UTC',today::timestamp at time zone 'UTC');
  perform public.clutch_crediter_volts(l,90,'onboarding','retention-test');
  perform set_config('request.jwt.claim.sub',l::text,true);
  result:=public.clutch_acheter_protecteur_serie_v1(gen_random_uuid());
  if result#>>'{etat,serie_actuelle}'<>'0' or result#>>'{etat,stock_protecteurs}'<>'1'
    or (select etat from private.series_calls_jours where user_id=l and jour=today-1)<>'manque' then
    raise exception 'Post-midnight purchase retroactively restored a streak';
  end if;

  perform private.clutch_initialiser_serie_v1(c,'UTC');
  insert into public.pronostics_classes(user_id,match_id,saison_id,choix,proba_figee,proba_scoring,k_frags)
  values(c,fixture,fixture,'a',0.5,0.5,60) returning id into proof;
  if (select serie_actuelle from private.series_calls_etats where user_id=c)<>1 then raise exception 'Ranked insert did not validate day'; end if;
  update public.pronostics_classes set statut='annule' where id=proof;
  if (select serie_actuelle from private.series_calls_etats where user_id=c)<>1 then raise exception 'Platform cancellation removed effort'; end if;
  if private.clutch_opportunite_serie_v1(c,clock_timestamp(),clock_timestamp()+interval '1 second')
    and not exists(select 1 from private.series_calls_fenetres where match_id<>fixture and ouvert_le<clock_timestamp()+interval '1 second' and ferme_le>clock_timestamp()) then
    raise exception 'Already called market still considered available';
  end if;

  -- Notification categories, quiet hours across midnight, and current validity.
  perform set_config('request.jwt.claim.sub',u::text,true);
  execute 'set local role authenticated';
  result:=public.clutch_enregistrer_preferences_notification_v2('Europe/Paris',true,true,true,true,true,true,true,true,true,1320,480);
  execute 'reset role';
  if result->>'silence_actif'<>'true'
    or private.clutch_hors_silence_notification_v1(u,'2026-03-27 23:00+01')
    or private.clutch_hors_silence_notification_v1(u,'2026-03-28 07:59+01')
    or not private.clutch_hors_silence_notification_v1(u,'2026-03-28 08:00+01') then
    raise exception 'Quiet hours do not cover midnight';
  end if;
  -- Pick an IANA zone currently in the last three hours of its civil day.
  select name into tz from pg_catalog.pg_timezone_names
    where name like '%/%' and (clock_timestamp() at time zone name)::time between time '21:00' and time '23:58' limit 1;
  if tz is null then raise exception 'Cannot construct reminder clock fixture'; end if;
  update private.journees_recompense_joueur set fuseau=tz where user_id=u;
  today:=(clock_timestamp() at time zone tz)::date;
  imminent:=(today+1)::timestamp at time zone tz;
  update private.series_calls_etats set serie_actuelle=1,meilleure_serie=1,jours_valides=1,
    dernier_jour_valide=today-1,traite_jusqua=today-1,prochaine_cloture=imminent,cree_le=clock_timestamp()-interval '2 days' where user_id=u;
  update public.preferences_notifications set silence_actif=false,serie_en_danger=true where user_id=u;
  insert into public.jetons_notification(user_id,jeton_expo,plateforme)
    values(u,'ExpoPushToken[retention_'||replace(u::text,'-','')||']','ios') returning id into token_id;
  if not private.clutch_rappel_serie_pertinent_v1(u,today::text,clock_timestamp()) then raise exception 'Actionable reminder rejected'; end if;
  perform private.clutch_cycle_retention_p1();
  select id into event_id from public.evenements_notification where user_id=u and type='serie_en_danger' and cle_evenement=today::text;
  if event_id is null then raise exception 'Worker did not enqueue an actionable reminder'; end if;
  if private.clutch_ajouter_notification_v1(u,'serie_en_danger',today::text,'Un call pour ta série','Un match t’attend.') is not null then
    raise exception 'Duplicated daily reminder';
  end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  -- Preferences and token ownership may change after the worker enqueued a
  -- reminder. Delivery must recheck all three, without consuming a retry.
  update public.preferences_notifications set serie_en_danger=false where user_id=u;
  result:=public.clutch_reclamer_livraisons_notification_v1(100);
  if exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text) then
    raise exception 'Disabled reminder category was still delivered';
  end if;
  quiet_minute:=extract(hour from clock_timestamp() at time zone 'Europe/Paris')::integer*60
    +extract(minute from clock_timestamp() at time zone 'Europe/Paris')::integer;
  update public.preferences_notifications set serie_en_danger=true,silence_actif=true,
    silence_debut=(quiet_minute+1439)%1440,silence_fin=(quiet_minute+5)%1440 where user_id=u;
  result:=public.clutch_reclamer_livraisons_notification_v1(100);
  if exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text) then
    raise exception 'Queued reminder ignored newly enabled quiet hours';
  end if;
  update public.preferences_notifications set silence_actif=false where user_id=u;
  update public.jetons_notification set user_id=c where id=token_id;
  result:=public.clutch_reclamer_livraisons_notification_v1(100);
  if exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text) then
    raise exception 'Reminder leaked to the next account using this device';
  end if;
  if exists(select 1 from public.livraisons_notification where notification_id=event_id and tentatives<>0) then
    raise exception 'Deferred reminder consumed a delivery attempt';
  end if;
  update public.jetons_notification set user_id=u where id=token_id;
  execute 'set local role service_role';
  result:=public.clutch_reclamer_livraisons_notification_v1(100);
  execute 'reset role';
  if not exists(select 1 from jsonb_array_elements(result) x where x#>>'{donnees,notification_id}'=event_id::text) then
    raise exception 'Reminder was not claimed';
  end if;
  select id into delivery_id from public.livraisons_notification where notification_id=event_id;
  update public.livraisons_notification set ticket_id='p1-ticket-'||delivery_id::text,statut='ticket' where id=delivery_id;
  if (select count(*) from private.analytics_evenements where user_id=u and type_evenement='notification_sent')<>1 then
    raise exception 'Confirmed push send not instrumented';
  end if;
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  perform public.clutch_ouvrir_notification_v2(event_id);
  perform public.clutch_ouvrir_notification_v2(event_id);
  execute 'reset role';
  if (select count(*) from private.analytics_evenements where user_id=u and type_evenement='notification_opened')<>1 then
    raise exception 'Notification opening not deduplicated';
  end if;
  perform set_config('request.jwt.claim.sub',c::text,true);
  if public.clutch_ouvrir_notification_v2(event_id) then raise exception 'Another account opened private event'; end if;

  -- A call arriving after queue creation invalidates the reminder before retry.
  perform private.clutch_enregistrer_jour_call_v1(u,gen_random_uuid(),fixture||'-reminder-call',clock_timestamp());
  if private.clutch_rappel_serie_pertinent_v1(u,today::text,clock_timestamp()) then raise exception 'Validated day still in danger'; end if;
  update public.livraisons_notification set statut='echec',prochaine_tentative=now()-interval '1 second' where id=delivery_id;
  perform set_config('request.jwt.claim.role','service_role',true);
  result:=public.clutch_reclamer_livraisons_notification_v1(100);
  if exists(select 1 from jsonb_array_elements(result) x where x->>'livraison_id'=delivery_id::text) then
    raise exception 'Cancelled reminder retried';
  end if;

  -- Match-source cleanup must not erase an already earned day; account cleanup
  -- must still remove both consumable history and its economic ledger safely.
  delete from public.matchs where id=fixture;
  if not exists(select 1 from private.series_calls_preuves where user_id=c and match_id=fixture)
    or (select serie_actuelle from private.series_calls_etats where user_id=c)<>1 then
    raise exception 'Platform match cleanup erased earned effort';
  end if;
  delete from auth.users where id=b;
  if exists(select 1 from private.series_calls_etats where user_id=b)
    or exists(select 1 from private.protecteurs_serie_mouvements where user_id=b)
    or exists(select 1 from public.volts_mouvements where user_id=b) then
    raise exception 'Account deletion retained P1 personal data';
  end if;

  raise notice 'P1 retention SQL contracts passed';
end;
$$;
rollback;
