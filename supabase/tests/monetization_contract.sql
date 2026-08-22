-- Runtime regression test for monetization contract v1.
-- The fixture proves cosmetic spending cannot reach legacy non-cosmetic items
-- or mutate competitive state. All writes are rolled back.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_contract jsonb := public.clutch_contrat_monetisation_v1();
  v_shop jsonb;
  v_purchase jsonb;
  v_rejected boolean := false;
begin
  if (v_contract ->> 'version')::integer <> 1
     or v_contract ->> 'code' <> 'identity_only_v1'
     or coalesce((v_contract #>> '{devises,frags,achetables}')::boolean, true)
     or coalesce((v_contract #>> '{devises,frags,depensables}')::boolean, true)
     or coalesce((v_contract #>> '{devises,volts,conversion_frags}')::boolean, true)
     or coalesce((v_contract #>> '{catalogue,objets_aleatoires_payants}')::boolean, true)
     or coalesce((v_contract #>> '{catalogue,objets_possedes_expirent}')::boolean, true)
     or coalesce((v_contract #>> '{catalogue,effets_competitifs}')::boolean, true)
     or coalesce((v_contract #>> '{partenaires,justesse_pronostic_recompensee}')::boolean, true)
     or coalesce((v_contract #>> '{paiements,actifs}')::boolean, true)
  then
    raise exception 'Monetization contract exposes a forbidden capability: %', v_contract;
  end if;

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
  ) values (
    v_user,
    'authenticated',
    'authenticated',
    'monetization-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'monetization-' || left(v_suffix, 15)),
    now(),
    now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Monetization test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_boutique_cosmetique_v1() into v_shop;
  if v_shop -> 'contrat' <> v_contract
     or jsonb_array_length(v_shop -> 'objets') <> 20
  then
    raise exception 'Shop does not consume monetization contract v1: %', v_shop;
  end if;

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 500, 'ajustement', 'monetization-contract-credit');

  select public.clutch_acheter_cosmetique_v1('titre-profil-2') into v_purchase;
  if (v_purchase ->> 'contrat_version')::integer <> 1
     or not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'solde')::integer <> 250
     or (
       select count(*)
       from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'achat'
         and m.reference = 'titre-profil-2'
     ) <> 1
  then
    raise exception 'Contracted cosmetic purchase is inconsistent: %', v_purchase;
  end if;

  begin
    perform public.clutch_acheter_cosmetique_v1('boitier-2');
  exception when sqlstate 'P0002' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1
       from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'boitier-2'
     )
     or exists (
       select 1
       from public.participations p
       where p.user_id = v_user
     )
     or exists (
       select 1
       from public.pronostics_classes p
       where p.user_id = v_user
     )
  then
    raise exception 'Cosmetic purchase crossed a competitive boundary';
  end if;

  if not has_function_privilege('anon', 'public.clutch_contrat_monetisation_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_contrat_monetisation_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_emplacement_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege(
       'authenticated',
       'private.clutch_assert_acquisition_cosmetique_v1(text,integer,boolean,timestamp with time zone,boolean)',
       'EXECUTE'
     )
  then
    raise exception 'Monetization RPC privileges are inconsistent';
  end if;

  raise notice 'monetization_contract_ok';
end;
$$;

rollback;
