-- Server calendar, permissions, consent and replay contracts. No real account
-- is touched: all fixtures and awards are rolled back. Run after migrations.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_anonymous uuid := gen_random_uuid();
  v_new uuid := gen_random_uuid();
  v_id uuid;
  v_first jsonb;
  v_repeat jsonb;
  v_other_receipt jsonb;
  v_journal jsonb;
  v_day record;
  v_case record;
  v_before bigint;
begin
  if (public.clutch_contrat_economie_volts_v1() #>> '{sources,bonus_quotidien,montant}')::integer <> 10
     or (public.clutch_contrat_analytics_v1() ->> 'version')::integer < 5
     or not (public.clutch_contrat_analytics_v1() -> 'evenements') ?& array['app_opened', 'daily_bonus_awarded']
  then
    raise exception 'Daily bonus is absent from the published contracts';
  end if;

  foreach v_id in array array[v_user, v_other, v_anonymous, v_new] loop
    insert into auth.users (
      id, aud, role, email, email_confirmed_at, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, is_anonymous
    ) values (
      v_id, 'authenticated', 'authenticated', 'daily-' || v_id::text || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'daily-' || left(replace(v_id::text, '-', ''), 15)),
      now(), now(), v_id = v_anonymous
    );
    if not exists (select 1 from public.profils where id = v_id) then
      raise exception 'Missing daily bonus fixture profile';
    end if;
  end loop;

  insert into private.preferences_confidentialite (user_id, analytics_autorise)
  values (v_user, true), (v_other, false)
  on conflict (user_id) do update set analytics_autorise = excluded.analytics_autorise;

  if has_function_privilege('anon', 'public.clutch_reclamer_bonus_quotidien_v1(text)', 'execute')
     or has_function_privilege('service_role', 'public.clutch_reclamer_bonus_quotidien_v1(text)', 'execute')
     or not has_function_privilege('authenticated', 'public.clutch_reclamer_bonus_quotidien_v1(text)', 'execute')
     or has_table_privilege('authenticated', 'private.journees_recompense_joueur', 'select,insert,update,delete')
     or has_table_privilege('anon', 'private.journees_recompense_joueur', 'select,insert,update,delete')
     or has_function_privilege('authenticated', 'private.clutch_journee_recompense_v1(timestamptz,text)', 'execute')
  then
    raise exception 'Daily bonus privilege boundary is too broad';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.clutch_reclamer_bonus_quotidien_v1(text)'::regprocedure)
     or not (select prosecdef from pg_proc where oid = 'private.clutch_reclamer_bonus_quotidien_v1(text)'::regprocedure)
     or not (select relrowsecurity from pg_class where oid = 'private.journees_recompense_joueur'::regclass)
  then
    raise exception 'Daily bonus must keep its definer private and RLS enabled';
  end if;

  perform public.clutch_crediter_volts(v_user, 300, 'onboarding', 'daily-test-baseline');
  select count(*) into v_before from public.pronostics_classes where user_id = v_user;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_first := public.clutch_reclamer_bonus_quotidien_v1('Europe/Paris');
  v_repeat := public.clutch_reclamer_bonus_quotidien_v1('Pacific/Kiritimati');
  v_journal := public.clutch_journal_volts_v1(20, null);
  execute 'reset role';

  if not (v_first ->> 'attribue')::boolean or (v_first ->> 'montant')::integer <> 10
     or (v_first ->> 'montant_quotidien')::integer <> 10 or (v_first ->> 'solde')::integer <> 310
     or (v_first ->> 'user_id')::uuid <> v_user
     or (v_repeat ->> 'attribue')::boolean or (v_repeat ->> 'montant')::integer <> 0
     or (v_repeat ->> 'solde')::integer <> 310
     or v_first ->> 'mouvement_id' <> v_repeat ->> 'mouvement_id'
     or v_repeat ->> 'fuseau' <> 'Europe/Paris'
     or (v_first ->> 'jour')::date <> ((v_first ->> 'heure_serveur')::timestamptz at time zone 'Europe/Paris')::date
     or (v_first ->> 'prochain_bonus_le')::timestamptz <= (v_first ->> 'heure_serveur')::timestamptz
  then
    raise exception 'Daily award or replay inconsistent: first=%, repeat=%', v_first, v_repeat;
  end if;
  if (select count(*) from public.volts_mouvements where user_id = v_user and origine = 'bonus_quotidien') <> 1
     or not exists (
       select 1 from public.volts_mouvements where user_id = v_user and origine = 'bonus_quotidien'
       and montant = 10 and source_economique = 'bonus_quotidien' and solde_apres = 310
       and cle_idempotence = 'bonus_quotidien:' || (v_first ->> 'jour')
       and metadata ->> 'fuseau' = 'Europe/Paris'
     )
     or (select count(*) from private.analytics_evenements where user_id = v_user and type_evenement = 'daily_bonus_awarded') <> 1
     or (select count(*) from public.pronostics_classes where user_id = v_user) <> v_before
  then
    raise exception 'Award must create one normalized economic row and one consented event only';
  end if;
  if (v_journal ->> 'solde')::integer <> 310
     or (v_journal #>> '{integrite,conversion_volts_vers_frags}')::boolean
     or (v_journal #>> '{integrite,impact_classement}')::boolean
     or not exists (
       select 1 from jsonb_array_elements(v_journal -> 'mouvements') m
       where m ->> 'source_economique' = 'bonus_quotidien'
       and (m ->> 'montant')::integer = 10 and (m ->> 'solde_apres')::integer = 310
       and (m ->> 'date')::timestamptz = (v_first ->> 'attribue_le')::timestamptz
     )
  then
    raise exception 'Owner ledger omits the daily bonus or competitive separation';
  end if;

  -- Even the trusted generic reward API cannot manufacture another daily date.
  begin
    perform public.clutch_crediter_volts(v_user, 10, 'bonus_quotidien', '2099-01-01');
    raise exception 'Generic credit accepted the reserved daily origin';
  exception when sqlstate '22023' then null;
  end;
  begin
    insert into public.volts_mouvements (user_id, montant, origine, reference)
    values (v_user, 20, 'bonus_quotidien', '2099-01-01');
    raise exception 'Daily credit accepted an amount other than ten';
  exception when check_violation then null;
  end;
  begin
    execute 'set local role authenticated';
    update private.journees_recompense_joueur set fuseau = 'UTC' where user_id = v_user;
    raise exception 'Client changed its reward calendar';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'set local role authenticated';
    perform public.clutch_enregistrer_evenement_analytics_v1('daily_bonus_awarded');
    raise exception 'Client forged a server-only award event';
  exception when sqlstate '22023' then null;
  end;
  execute 'set local role authenticated';
  v_repeat := public.clutch_enregistrer_evenement_analytics_v1('app_opened');
  execute 'reset role';
  if not (v_repeat ->> 'accepte')::boolean then raise exception 'Consented app opening rejected'; end if;

  -- Separate account, no analytics consent: the economic credit is unaffected.
  -- An old calendar registration does not cause catch-up awards for missed days.
  insert into private.journees_recompense_joueur (user_id, fuseau, cree_le)
  values (v_other, 'UTC', clock_timestamp() - interval '7 days');
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_other_receipt := public.clutch_reclamer_bonus_quotidien_v1('Europe/Paris');
  v_repeat := public.clutch_enregistrer_evenement_analytics_v1('app_opened');
  v_journal := public.clutch_journal_volts_v1(20, null);
  execute 'reset role';
  if (v_other_receipt ->> 'solde')::integer <> 10 or v_other_receipt ->> 'fuseau' <> 'UTC'
     or (select count(*) from public.volts_mouvements where user_id = v_other) <> 1
     or exists (select 1 from private.analytics_evenements where user_id = v_other)
     or (v_repeat ->> 'accepte')::boolean
     or jsonb_array_length(v_journal -> 'mouvements') <> 1
  then
    raise exception 'Consent, account isolation or no-backfill contract violated';
  end if;

  perform set_config('request.jwt.claim.sub', v_new::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_new, 'role', 'authenticated')::text, true);
  begin
    perform public.clutch_reclamer_bonus_quotidien_v1('Not/A_Timezone');
    raise exception 'Invalid initial timezone accepted';
  exception when sqlstate '22023' then null;
  end;
  if exists (select 1 from private.journees_recompense_joueur where user_id = v_new) then
    raise exception 'Rejected first claim left a partial calendar';
  end if;
  v_repeat := public.clutch_reclamer_bonus_quotidien_v1(' ');
  if v_repeat ->> 'fuseau' <> 'UTC' then raise exception 'Missing timezone must default to UTC'; end if;

  perform set_config('request.jwt.claim.sub', v_anonymous::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_anonymous, 'role', 'authenticated')::text, true);
  begin
    execute 'set local role authenticated';
    perform public.clutch_reclamer_bonus_quotidien_v1('UTC');
    raise exception 'Anonymous Auth user received a bonus';
  exception when sqlstate '28000' then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    execute 'set local role authenticated';
    perform public.clutch_reclamer_bonus_quotidien_v1('UTC');
    raise exception 'Unauthenticated call accepted';
  exception when sqlstate '28000' then null;
  end;
  begin
    execute 'set local role anon';
    perform public.clutch_reclamer_bonus_quotidien_v1('UTC');
    raise exception 'Anon has execute privilege';
  exception when insufficient_privilege then null;
  end;

  for v_case in select * from (values
    ('2026-09-03 21:59:59.999+00'::timestamptz, 'Europe/Paris', '2026-09-03'::date, 24),
    ('2026-09-03 22:00:00+00'::timestamptz, 'Europe/Paris', '2026-09-04'::date, 24),
    ('2026-03-29 12:00:00+00'::timestamptz, 'Europe/Paris', '2026-03-29'::date, 23),
    ('2026-10-25 12:00:00+00'::timestamptz, 'Europe/Paris', '2026-10-25'::date, 25),
    ('2028-02-29 12:00:00+00'::timestamptz, 'UTC', '2028-02-29'::date, 24),
    ('2026-12-31 23:00:00+00'::timestamptz, 'Europe/Paris', '2027-01-01'::date, 24),
    ('2026-09-03 12:00:00+00'::timestamptz, 'Pacific/Kiritimati', '2026-09-04'::date, 24)
  ) as cases(instant, fuseau, jour, heures) loop
    select * into v_day from private.clutch_journee_recompense_v1(v_case.instant, v_case.fuseau);
    if v_day.jour <> v_case.jour or extract(epoch from v_day.fin - v_day.debut) <> v_case.heures * 3600
       or v_case.instant < v_day.debut or v_case.instant >= v_day.fin
    then
      raise exception 'Invalid server calendar boundary: case=%, result=%', v_case, v_day;
    end if;
  end loop;
end;
$$;

rollback;
