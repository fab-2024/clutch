-- P3 contracts: English notification delivery, aggregate-only recommendations
-- and visual-only consumables. All fixtures are rolled back.
begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  empty_wallet_id uuid := gen_random_uuid();
  operation_id uuid := gen_random_uuid();
  activation_id uuid := gen_random_uuid();
  notification_id uuid;
  owner_name text;
  team_id text;
  result jsonb;
  replay jsonb;
  recommendation jsonb;
  delivery jsonb;
  effect_until timestamptz;
  i integer;
begin
  if public.clutch_contrat_economie_volts_v1() #>> '{consommables,showcase_spotlight,prix_volts}' <> '60'
    or public.clutch_contrat_economie_volts_v1() #>> '{consommables,showcase_spotlight,stock_max}' <> '3'
    or public.clutch_contrat_economie_volts_v1() #>> '{consommables,showcase_spotlight,duree_heures}' <> '24'
    or public.clutch_contrat_economie_volts_v1() #>> '{consommables,profile_pulse,prix_volts}' <> '45'
    or public.clutch_contrat_economie_volts_v1() #>> '{garde_fous,impact_classement}' <> 'false'
    or public.clutch_contrat_economie_volts_v1() #>> '{garde_fous,conversion_volts_vers_frags}' <> 'false'
    or not (public.clutch_contrat_analytics_v1() -> 'evenements') ?&
      array['consumable_purchased', 'consumable_activated'] then
    raise exception 'P3 published contract mismatch';
  end if;

  if has_table_privilege('authenticated', 'private.consommables_visuels_etats', 'select,insert,update,delete')
    or has_table_privilege('authenticated', 'private.consommables_visuels_operations', 'select,insert,update,delete')
    or not (select relrowsecurity from pg_class where oid = 'private.consommables_visuels_etats'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'private.consommables_visuels_operations'::regclass)
    or has_function_privilege('anon', 'public.clutch_acheter_consommable_visuel_p3(text,uuid)', 'execute')
    or has_function_privilege('anon', 'public.clutch_activer_consommable_visuel_p3(text,uuid)', 'execute')
    or not has_function_privilege('anon', 'public.clutch_effets_vitrine_p3(text)', 'execute')
    or has_function_privilege('authenticated', 'private.clutch_recommandation_notifications_p3(uuid)', 'execute') then
    raise exception 'P3 exposes private state or privileged mutations';
  end if;

  insert into auth.users(
    id, aud, role, email, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, is_anonymous
  ) values
    (owner_id, 'authenticated', 'authenticated', 'p3-owner-' || owner_id || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('pseudo', 'p3-' || left(replace(owner_id::text, '-', ''), 16)), now(), now(), false),
    (empty_wallet_id, 'authenticated', 'authenticated', 'p3-empty-' || empty_wallet_id || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('pseudo', 'p3-' || left(replace(empty_wallet_id::text, '-', ''), 16)), now(), now(), false);

  select pseudo into owner_name from public.profils where id = owner_id;
  select id into team_id from public.equipes limit 1;
  update public.profils set profil_public = true, equipe_favorite_id = team_id,
    jeux_suivis = case when team_id is null then '{}'::text[] else array['lol'] end
    where id in (owner_id, empty_wallet_id);
  insert into private.preferences_confidentialite(user_id, analytics_autorise)
  values (owner_id, true), (empty_wallet_id, true)
  on conflict (user_id) do update set analytics_autorise = excluded.analytics_autorise;

  -- Language is stored with preferences, while recommendations remain a
  -- first-party aggregate suggestion and never alter settings automatically.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  result := public.clutch_enregistrer_preferences_notification_v3(
    'UTC', true, true, true, true, true, true, true, true, false, 1320, 480, 'en-US');
  execute 'reset role';
  if result ->> 'locale' <> 'en-US' or result ->> 'expansion_disponible' <> 'true'
    or result #>> '{recommandation,source}' <> 'defaults'
    or result #>> '{recommandation,silence_debut}' <> '1320'
    or result #>> '{recommandation,silence_fin}' <> '480' then
    raise exception 'P3 notification defaults or locale mismatch';
  end if;

  begin
    perform set_config('request.jwt.claim.sub', owner_id::text, true);
    execute 'set local role authenticated';
    perform public.clutch_enregistrer_preferences_notification_v3(
      'UTC', true, true, true, true, true, true, true, true, false, 1320, 480, 'de-DE');
    execute 'reset role';
    raise exception 'Unsupported notification locale accepted';
  exception when sqlstate '22023' then
    execute 'reset role';
  end;

  for i in 1..8 loop
    insert into private.analytics_evenements(user_id, type_evenement, source_evenement, cree_le)
    values (owner_id, 'application_active', 'client', now() - make_interval(days => i));
  end loop;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  result := public.clutch_mes_preferences_notification_v3();
  execute 'reset role';
  recommendation := result -> 'recommandation';
  if recommendation ->> 'source' <> 'activity' or recommendation ->> 'echantillon' <> '8'
    or jsonb_typeof(recommendation -> 'categories') <> 'array'
    or result::text like '%' || owner_id::text || '%'
    or recommendation ? 'evenements' or recommendation ? 'horodatages' then
    raise exception 'Notification recommendation leaks raw activity or loses its aggregate';
  end if;

  insert into public.jetons_notification(user_id, jeton_expo, plateforme)
  values (owner_id, 'ExpoPushToken[p3_' || replace(owner_id::text, '-', '') || ']', 'ios');
  notification_id := private.clutch_ajouter_notification_v1(owner_id, 'debut_match',
    'p3-language-' || owner_id::text, 'Le match est en direct', 'Une rencontre suivie vient de commencer.',
    jsonb_build_object('path', '/matches'), clock_timestamp());
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'service_role')::text, true);
  execute 'set local role service_role';
  delivery := public.clutch_reclamer_livraisons_notification_v1(100);
  execute 'reset role';
  if notification_id is null or not exists (
    select 1 from jsonb_array_elements(delivery) item
    where item #>> '{donnees,notification_id}' = notification_id::text
      and item ->> 'titre' = 'The match is live'
      and item ->> 'corps' = 'A matchup you follow has just started.'
  ) then
    raise exception 'English notification was not localized at delivery';
  end if;

  -- Give the fixture a server-audited balance. Purchase and activation RPCs
  -- accept only type plus operation UUID; prices, stock and duration are fixed
  -- by the database.
  insert into public.volts_mouvements(user_id, montant, origine, reference, metadata)
  values (owner_id, 300, 'ajustement', 'p3-contract-credit-' || owner_id::text,
    jsonb_build_object('motif', 'transactional contract fixture'));
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  result := public.clutch_acheter_consommable_visuel_p3('showcase_spotlight', operation_id);
  replay := public.clutch_acheter_consommable_visuel_p3('showcase_spotlight', operation_id);
  execute 'reset role';
  if result ->> 'applique' <> 'true' or replay ->> 'applique' <> 'false'
    or result ->> 'mouvement_id' is null or replay ->> 'mouvement_id' <> result ->> 'mouvement_id'
    or (select count(*) from public.volts_mouvements where user_id = owner_id
      and reference = 'visuel:showcase_spotlight:' || operation_id::text) <> 1
    or (select stock from private.consommables_visuels_etats
      where user_id = owner_id and type = 'showcase_spotlight') <> 1 then
    raise exception 'Visual consumable purchase is not exactly-once';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  result := public.clutch_activer_consommable_visuel_p3('showcase_spotlight', activation_id);
  replay := public.clutch_activer_consommable_visuel_p3('showcase_spotlight', activation_id);
  execute 'reset role';
  select actif_jusqua into effect_until from private.consommables_visuels_etats
    where user_id = owner_id and type = 'showcase_spotlight';
  if result ->> 'applique' <> 'true' or replay ->> 'applique' <> 'false'
    or effect_until not between clock_timestamp() + interval '23 hours 59 minutes'
      and clock_timestamp() + interval '24 hours 1 minute'
    or (select stock from private.consommables_visuels_etats
      where user_id = owner_id and type = 'showcase_spotlight') <> 0
    or (select count(*) from private.consommables_visuels_operations
      where user_id = owner_id and operation = activation_id) <> 1 then
    raise exception 'Visual consumable activation is not exactly-once for 24 hours';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  result := public.clutch_effets_vitrine_p3(owner_name);
  execute 'reset role';
  if not exists (select 1 from jsonb_array_elements(result) item
    where item ->> 'type' = 'showcase_spotlight'
      and (item ->> 'actif_jusqua')::timestamptz = effect_until) then
    raise exception 'Active public showcase effect is missing';
  end if;
  update public.profils set profil_public = false where id = owner_id;
  perform set_config('request.jwt.claim.sub', empty_wallet_id::text, true);
  execute 'set local role authenticated';
  if public.clutch_effets_vitrine_p3(owner_name) <> '[]'::jsonb then
    raise exception 'Private showcase exposed an active effect';
  end if;
  execute 'reset role';
  update public.profils set profil_public = true where id = owner_id;

  -- Stock is capped even while an earlier unit is active.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  for i in 1..3 loop
    perform public.clutch_acheter_consommable_visuel_p3('showcase_spotlight', gen_random_uuid());
  end loop;
  begin
    perform public.clutch_acheter_consommable_visuel_p3('showcase_spotlight', gen_random_uuid());
    raise exception 'Visual stock cap bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'consumable_stock_full' then raise; end if;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', empty_wallet_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', empty_wallet_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.clutch_acheter_consommable_visuel_p3('profile_pulse', gen_random_uuid());
    raise exception 'Visual consumable accepted an insufficient balance';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'insufficient_volts' then raise; end if;
  end;
  execute 'reset role';

  if (select count(*) from private.analytics_evenements where user_id = owner_id
    and type_evenement = 'consumable_purchased') <> 4
    or (select count(*) from private.analytics_evenements where user_id = owner_id
      and type_evenement = 'consumable_activated') <> 1
    or exists (select 1 from public.pronostics_classes where user_id = owner_id) then
    raise exception 'Visual consumables affected competitive economy or lost analytics proof';
  end if;
end $$;

rollback;
