-- Runtime regression test for monetization phase 5.1.
-- It proves server-only attribution, idempotency, refund reversal, legacy
-- founder preservation, zero competitive/economic effect and private ledgers.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_legacy_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_legacy_suffix text := replace(v_legacy_user::text, '-', '');
  v_initial jsonb;
  v_grant jsonb;
  v_repeat jsonb;
  v_refund jsonb;
  v_report jsonb;
  v_volts_before integer;
  v_client_event jsonb;
  v_rejected boolean := false;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values
    (
      v_user,
      'authenticated',
      'authenticated',
      'founder-pack-' || v_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'founder-' || left(v_suffix, 15)),
      pg_catalog.now(),
      pg_catalog.now()
    ),
    (
      v_legacy_user,
      'authenticated',
      'authenticated',
      'founder-legacy-' || v_legacy_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'legacy-' || left(v_legacy_suffix, 16)),
      pg_catalog.now(),
      pg_catalog.now()
    );

  update public.profils set est_fondateur = true where id = v_legacy_user;
  insert into private.fondateurs_heritage (user_id) values (v_legacy_user);

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_statut_founder_pack_v1() into v_initial;
  select coalesce(sum(m.montant), 0)::integer
  into v_volts_before
  from public.volts_mouvements m
  where m.user_id = v_user;

  if v_initial ->> 'statut' <> 'available'
     or coalesce((v_initial ->> 'pack_actif')::boolean, true)
     or coalesce((v_initial ->> 'est_fondateur')::boolean, true)
     or jsonb_array_length(v_initial -> 'objets') <> 4
     or (v_initial ->> 'volts_inclus')::integer <> 0
  then
    raise exception 'Initial Founder Pack state is inconsistent: %', v_initial;
  end if;

  select public.clutch_enregistrer_evenement_analytics_v1(
    'founder_pack_affiche',
    null,
    null,
    'founder-pack:test-view'
  ) into v_client_event;

  begin
    perform public.clutch_enregistrer_evenement_analytics_v1(
      'founder_pack_attribue',
      null,
      null,
      'founder-pack:forged-grant'
    );
  exception when sqlstate '22023' then
    v_rejected := true;
  end;

  if not (v_client_event ->> 'nouveau')::boolean or not v_rejected then
    raise exception 'Founder Pack client analytics allowlist is unsafe';
  end if;

  perform public.clutch_appliquer_statut_founder_pack_v1(
    v_user,
    'sync:founder-empty-' || v_suffix,
    'SYNC_STATUS',
    false,
    null,
    null,
    'app_store',
    'sandbox',
    null,
    'sync'
  );

  if exists (
    select 1
    from private.analytics_evenements a
    where a.user_id = v_user
      and a.type_evenement = 'founder_pack_revoque'
  ) then
    raise exception 'An empty initial store sync was counted as a Founder Pack revocation';
  end if;

  select public.clutch_appliquer_statut_founder_pack_v1(
    v_user,
    'webhook:founder-grant-' || v_suffix,
    'INITIAL_PURCHASE',
    true,
    'tx-' || v_suffix,
    'tx-' || v_suffix,
    'app_store',
    'sandbox',
    pg_catalog.now(),
    'webhook'
  ) into v_grant;

  select public.clutch_appliquer_statut_founder_pack_v1(
    v_user,
    'webhook:founder-grant-' || v_suffix,
    'INITIAL_PURCHASE',
    true,
    'tx-' || v_suffix,
    'tx-' || v_suffix,
    'app_store',
    'sandbox',
    pg_catalog.now(),
    'webhook'
  ) into v_repeat;

  if not (v_grant ->> 'pack_actif')::boolean
     or not (v_grant ->> 'est_fondateur')::boolean
     or v_repeat ->> 'statut' <> 'active'
     or (
       select count(*)
       from public.inventaire i
       join public.objets_catalogue o on o.id = i.objet_id
       where i.user_id = v_user
         and o.source = 'founder_pack'
     ) <> 4
     or (
       select count(*)
       from private.achats_founder_pack a
       where a.user_id = v_user
         and a.statut = 'active'
     ) <> 1
     or (
       select count(*)
       from private.evenements_founder_pack e
       where e.user_id = v_user
         and e.type_evenement = 'INITIAL_PURCHASE'
     ) <> 1
     or (
       select coalesce(sum(m.montant), 0)::integer
       from public.volts_mouvements m
       where m.user_id = v_user
     ) <> v_volts_before
  then
    raise exception 'Founder Pack grant is not idempotent or cosmetic-only: %, %', v_grant, v_repeat;
  end if;

  perform public.clutch_equiper_cosmetique_v1('founder-frame-v1');

  select public.clutch_appliquer_statut_founder_pack_v1(
    v_user,
    'webhook:founder-refund-' || v_suffix,
    'CANCELLATION',
    false,
    'tx-' || v_suffix,
    'tx-' || v_suffix,
    'app_store',
    'sandbox',
    pg_catalog.now(),
    'webhook'
  ) into v_refund;

  if v_refund ->> 'statut' <> 'refunded'
     or (v_refund ->> 'pack_actif')::boolean
     or (v_refund ->> 'est_fondateur')::boolean
     or exists (
       select 1
       from public.inventaire i
       join public.objets_catalogue o on o.id = i.objet_id
       where i.user_id = v_user
         and o.source = 'founder_pack'
     )
     or exists (
       select 1
       from public.equipement e
       join public.objets_catalogue o on o.id = e.objet_id
       where e.user_id = v_user
         and o.source = 'founder_pack'
     )
     or (
       select count(*)
       from private.analytics_evenements a
       where a.user_id = v_user
         and a.type_evenement = 'founder_pack_attribue'
     ) <> 1
     or (
       select count(*)
       from private.analytics_evenements a
       where a.user_id = v_user
         and a.type_evenement = 'founder_pack_revoque'
     ) <> 1
  then
    raise exception 'Founder Pack refund did not reverse the paid entitlement: %', v_refund;
  end if;

  -- The following reconciliation targets another account and therefore must
  -- simulate the service-role context used by the Edge Function.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'service_role')::text,
    true
  );

  perform public.clutch_appliquer_statut_founder_pack_v1(
    v_legacy_user,
    'webhook:legacy-grant-' || v_legacy_suffix,
    'INITIAL_PURCHASE',
    true,
    'tx-' || v_legacy_suffix,
    'tx-' || v_legacy_suffix,
    'play_store',
    'sandbox',
    pg_catalog.now(),
    'webhook'
  );
  perform public.clutch_appliquer_statut_founder_pack_v1(
    v_legacy_user,
    'webhook:legacy-refund-' || v_legacy_suffix,
    'CANCELLATION',
    false,
    'tx-' || v_legacy_suffix,
    'tx-' || v_legacy_suffix,
    'play_store',
    'sandbox',
    pg_catalog.now(),
    'webhook'
  );

  if not (select p.est_fondateur from public.profils p where p.id = v_legacy_user) then
    raise exception 'A paid refund removed a historical founder status';
  end if;

  select public.clutch_rapport_founder_pack_v1(pg_catalog.now() - interval '1 day')
  into v_report;
  if (v_report ->> 'vues_uniques')::integer < 1
     or coalesce((v_report ->> 'donnees_individuelles_exposees')::boolean, true)
  then
    raise exception 'Founder Pack aggregate report is inconsistent: %', v_report;
  end if;

  if has_table_privilege('authenticated', 'private.achats_founder_pack', 'SELECT')
     or has_table_privilege('service_role', 'private.achats_founder_pack', 'INSERT')
     or has_function_privilege(
       'authenticated',
       'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.clutch_rapport_founder_pack_v1(timestamp with time zone)',
       'EXECUTE'
     )
  then
    raise exception 'Founder Pack privileges are inconsistent';
  end if;

  raise notice 'founder_pack_iap_ok';
end;
$$;

rollback;
