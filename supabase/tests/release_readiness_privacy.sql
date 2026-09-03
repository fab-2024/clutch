-- Regression contract for release-readiness privacy controls. Everything is
-- rolled back: no fixture or analytics event survives this test.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_contract jsonb := public.clutch_contrat_analytics_v1();
  v_deactivated integer;
  v_device_deactivated integer;
  v_purged bigint;
  v_guarded boolean := false;
begin
  if (v_contract ->> 'version')::integer <> 7
     or v_contract ->> 'retention_brute' <> '13 months maximum'
     or coalesce((v_contract ->> 'purge_automatique')::boolean, false) is false
     or (select count(*) from cron.job where jobname = 'clutch-analytics-retention-v1') <> 1
     or to_regclass('private.analytics_evenements_retention_idx') is null
  then
    raise exception 'release analytics contract is incomplete: %', v_contract;
  end if;

  if has_function_privilege('anon', 'public.clutch_desactiver_mes_jetons_notification_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_desactiver_mes_jetons_notification_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_desactiver_mon_appareil_notification_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_desactiver_mon_appareil_notification_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_purger_analytics_v1(timestamptz)', 'EXECUTE')
  then
    raise exception 'release privacy RPC grants are inconsistent';
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_user,
    'authenticated',
    'authenticated',
    'privacy-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'privacy-' || left(v_suffix, 12)),
    now(),
    now()
  );

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  perform public.clutch_enregistrer_jeton_notification_v1(
    'ExpoPushToken[privacyA' || v_suffix || ']', 'ios', 'privacy-device-a-' || v_suffix
  );
  perform public.clutch_enregistrer_jeton_notification_v1(
    'ExpoPushToken[privacyB' || v_suffix || ']', 'android', 'privacy-device-b-' || v_suffix
  );

  select public.clutch_desactiver_mon_appareil_notification_v1(
    'privacy-device-a-' || v_suffix
  ) into v_device_deactivated;

  if v_device_deactivated <> 1
     or (
       select count(*)
       from public.jetons_notification
       where user_id = v_user and actif
     ) <> 1
  then
    raise exception 'device logout did not isolate the current push destination';
  end if;

  select public.clutch_desactiver_mes_jetons_notification_v1()
  into v_deactivated;

  if v_deactivated <> 1
     or (
       select count(*)
       from public.jetons_notification
       where user_id = v_user
         and (actif or desactive_le is null)
     ) <> 0
     or (
       select count(*)
       from public.jetons_notification
       where user_id = v_user
         and appareil_id = 'privacy-device-a-' || v_suffix
         and motif_desactivation <> 'deconnexion_appareil'
     ) <> 0
     or (
       select count(*)
       from public.jetons_notification
       where user_id = v_user
         and appareil_id = 'privacy-device-b-' || v_suffix
         and motif_desactivation <> 'deconnexion'
     ) <> 0
  then
    raise exception 'global logout did not deactivate every push destination';
  end if;

  insert into private.analytics_evenements (
    user_id, type_evenement, source_evenement, cree_le
  ) values
    (v_user, 'application_active', 'serveur', now() - interval '14 months'),
    (v_user, 'application_active', 'serveur', now());

  select private.clutch_purger_analytics_v1(now() - interval '13 months')
  into v_purged;

  if v_purged <> 1
     or (select count(*) from private.analytics_evenements where user_id = v_user) <> 1
  then
    raise exception 'analytics retention purge did not preserve the expected boundary';
  end if;

  begin
    perform private.clutch_purger_analytics_v1(now() - interval '1 day');
  exception when sqlstate '22023' then
    v_guarded := true;
  end;

  if not v_guarded then
    raise exception 'analytics purge accepted a dangerously recent boundary';
  end if;

  raise notice 'release_readiness_privacy_ok';
end;
$$;

rollback;
