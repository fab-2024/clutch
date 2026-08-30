-- Runtime regression test for Priority 3 cosmetic spending.
-- The fixture rolls back auth, ledger, inventory and equipment changes.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_shop jsonb;
  v_purchase jsonb;
  v_repeat jsonb;
  v_showcase_purchase jsonb;
  v_showcase_repeat jsonb;
  v_lighting_purchase jsonb;
  v_presenter_purchase jsonb;
  v_rank_display_purchase jsonb;
  v_equipped jsonb;
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
  ) values (
    v_user,
    'authenticated',
    'authenticated',
    'cosmetic-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'cosmetic-' || left(v_suffix, 18)),
    now(),
    now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Cosmetic test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_boutique_cosmetique_v1() into v_shop;

  if (v_shop ->> 'solde')::integer <> 0
     or jsonb_array_length(v_shop -> 'objets') <> 65
     or (
       select count(*)
       from jsonb_array_elements(v_shop -> 'objets') item
       where (item ->> 'possede')::boolean
         and (item ->> 'equipe')::boolean
     ) <> 10
  then
    raise exception 'Initial cosmetic shop payload is inconsistent: %', v_shop;
  end if;

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 1000, 'ajustement', 'cosmetic-test-credit');

  select public.clutch_acheter_cosmetique_v1('titre-profil-2') into v_purchase;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'solde')::integer <> 750
     or not exists (
       select 1 from public.inventaire i
       where i.user_id = v_user and i.objet_id = 'titre-profil-2'
     )
     or not exists (
       select 1 from public.equipement e
       where e.user_id = v_user
         and e.emplacement = 'titre_profil'
         and e.objet_id = 'titre-profil-2'
     )
  then
    raise exception 'Cosmetic purchase was not atomic: %', v_purchase;
  end if;

  select public.clutch_acheter_cosmetique_v1('titre-profil-2') into v_repeat;

  if (v_repeat ->> 'achete')::boolean
     or (v_repeat ->> 'solde')::integer <> 750
     or (
       select count(*) from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'achat'
         and m.reference = 'titre-profil-2'
     ) <> 1
  then
    raise exception 'Repeated purchase was not idempotent: %', v_repeat;
  end if;

  select public.clutch_acheter_cosmetique_v1('material_steel') into v_showcase_purchase;
  select public.clutch_acheter_cosmetique_v1('material_steel') into v_showcase_repeat;

  if not (v_showcase_purchase ->> 'achete')::boolean
     or (v_showcase_purchase ->> 'solde')::integer <> 630
     or (v_showcase_purchase ->> 'emplacement') <> 'vitrine_materiau'
     or (v_showcase_repeat ->> 'achete')::boolean
     or (v_showcase_repeat ->> 'solde')::integer <> 630
     or (
       select count(*) from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'achat'
         and m.reference = 'material_steel'
     ) <> 1
     or (
       select count(*) from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'material_steel'
     ) <> 1
  then
    raise exception 'Showcase purchase was not atomic and idempotent: %, %',
      v_showcase_purchase,
      v_showcase_repeat;
  end if;

  select public.clutch_acheter_cosmetique_v1('lighting_emerald') into v_lighting_purchase;

  if not (v_lighting_purchase ->> 'achete')::boolean
     or (v_lighting_purchase ->> 'solde')::integer <> 510
     or (v_lighting_purchase ->> 'emplacement') <> 'vitrine_eclairage'
     or not exists (
       select 1 from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'lighting_emerald'
     )
  then
    raise exception 'Lighting purchase was not applied: %', v_lighting_purchase;
  end if;

  select public.clutch_acheter_cosmetique_v1('supports_crystal') into v_presenter_purchase;

  if not (v_presenter_purchase ->> 'achete')::boolean
     or (v_presenter_purchase ->> 'solde')::integer <> 210
     or (v_presenter_purchase ->> 'emplacement') <> 'vitrine_supports'
     or not exists (
       select 1 from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'supports_crystal'
     )
  then
    raise exception 'Presenter purchase was not applied: %', v_presenter_purchase;
  end if;

  select public.clutch_acheter_cosmetique_v1('rank_crystal_capsule') into v_rank_display_purchase;

  if not (v_rank_display_purchase ->> 'achete')::boolean
     or (v_rank_display_purchase ->> 'solde')::integer <> 30
     or (v_rank_display_purchase ->> 'emplacement') <> 'vitrine_rang'
     or not exists (
       select 1 from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'rank_crystal_capsule'
     )
  then
    raise exception 'Rank display purchase was not applied: %', v_rank_display_purchase;
  end if;

  begin
    perform public.clutch_acheter_cosmetique_v1('apparence-core-4');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1 from public.inventaire i
       where i.user_id = v_user and i.objet_id = 'apparence-core-4'
     )
  then
    raise exception 'Insufficient balance did not reject the purchase atomically';
  end if;

  select public.clutch_mes_cosmetiques_v1() into v_equipped;
  if v_equipped #>> '{titre_profil,id}' <> 'titre-profil-2'
     or v_equipped #>> '{apparence_core,id}' <> 'apparence-core-1'
     or v_equipped #>> '{vitrine_materiau,id}' <> 'material_steel'
     or v_equipped #>> '{vitrine_eclairage,id}' <> 'lighting_emerald'
     or v_equipped #>> '{vitrine_supports,id}' <> 'supports_crystal'
     or v_equipped #>> '{vitrine_rang,id}' <> 'rank_crystal_capsule'
     or v_equipped #>> '{vitrine_maillot,id}' <> 'jersey_locker'
  then
    raise exception 'Equipped cosmetic projection is inconsistent: %', v_equipped;
  end if;

  if has_function_privilege('anon', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_cosmetiques_equipes_v1(uuid)', 'EXECUTE')
  then
    raise exception 'Cosmetic function grants are too broad or too narrow';
  end if;

  raise notice 'cosmetic_shop_ok';
end;
$$;

rollback;
