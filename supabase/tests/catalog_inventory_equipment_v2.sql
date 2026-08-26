-- Runtime regression test for monetization phase 1.2.
-- It covers catalogue metadata, acquisition sources, permanent ownership,
-- idempotent spending, slot integrity and least-privilege Data API access.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_other_suffix text := replace(v_other::text, '-', '');
  v_mission_id text := 'test-mission-banner-' || v_suffix;
  v_team_id text;
  v_season_id text;
  v_shop jsonb;
  v_purchase jsonb;
  v_repeat jsonb;
  v_equipped jsonb;
  v_mission jsonb;
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
      'catalog-v2-' || v_suffix || '@example.invalid',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'catalog-v2-' || left(v_suffix, 12)),
      now(),
      now()
    ),
    (
      v_other,
      'authenticated',
      'authenticated',
      'catalog-v2-other-' || v_other_suffix || '@example.invalid',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'catalog-other-' || left(v_other_suffix, 9)),
      now(),
      now()
    );

  if not exists (select 1 from public.profils p where p.id = v_user)
     or not exists (select 1 from public.profils p where p.id = v_other)
  then
    raise exception 'Catalogue v2 test profiles were not created';
  end if;

  select e.id into v_team_id from public.equipes e order by e.id limit 1;
  select s.id into v_season_id from public.saisons s order by s.id limit 1;
  if v_team_id is null or v_season_id is null then
    raise exception 'Catalogue v2 requires team and season reference data';
  end if;

  -- The catalogue campaign foreign key is part of the production contract.
  -- Keep this fixture self-contained instead of depending on seeded campaigns.
  insert into public.campagnes_partenaire (
    key,
    nom,
    partenaire_nom,
    description,
    debut,
    fin,
    collection_key,
    licence
  ) values (
    'launch-test',
    'Launch Test',
    'GRIFF Labs',
    'Temporary campaign used by the catalogue v2 regression test.',
    now() - interval '1 day',
    now() + interval '1 day',
    'test-missions',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb
  )
  on conflict (key) do nothing;

  -- A second level-2 banner proves that collections are no longer limited to
  -- one object per (slot, level). Mission objects are visible but not buyable.
  insert into public.objets_catalogue (
    id,
    emplacement,
    famille,
    niveau,
    nom,
    prix,
    actif,
    description,
    rarete,
    style_key,
    accent,
    collection_key,
    source,
    equipe_id,
    marque_key,
    campagne_key,
    saison_id,
    disponible_du,
    disponible_au,
    statut_publication,
    licence,
    est_inclus
  ) values (
    v_mission_id,
    'carte_profil',
    'banniere',
    2,
    'Bannière Mission Test',
    0,
    true,
    'Attribuée par une mission, jamais achetée en Volts.',
    'rare',
    'test-mission-banner-' || v_suffix,
    '#63B8FF',
    'test-missions',
    'mission',
    v_team_id,
    'clutch-labs',
    'launch-test',
    v_season_id,
    now() - interval '1 day',
    now() + interval '1 day',
    'publie',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb,
    false
  );

  insert into public.inventaire (user_id, objet_id)
  values (v_other, 'titre-profil-2');

  perform set_config('test.catalog_v2_user', v_user::text, true);
  perform set_config('test.catalog_v2_other', v_other::text, true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_boutique_cosmetique_v1() into v_shop;
  select item
  into v_mission
  from jsonb_array_elements(v_shop -> 'objets') item
  where item ->> 'id' = v_mission_id;

  if (v_shop #>> '{contrat,catalogue,schema_version}')::integer <> 3
     or jsonb_array_length(v_shop #> '{contrat,catalogue,familles_initiales}') <> 4
     or jsonb_array_length(v_shop -> 'objets') <> 44
     or v_mission ->> 'famille' <> 'banniere'
     or v_mission ->> 'source' <> 'mission'
     or v_mission ->> 'collection_key' <> 'test-missions'
     or v_mission #>> '{equipe_associee,id}' <> v_team_id
     or v_mission ->> 'marque_key' <> 'clutch-labs'
     or v_mission ->> 'campagne_key' <> 'launch-test'
     or v_mission ->> 'saison_id' <> v_season_id
     or v_mission ->> 'disponible_du' is null
     or v_mission ->> 'disponible_au' is null
     or (v_mission ->> 'statut_publication') <> 'publie'
     or (v_mission ->> 'disponible')::boolean is not true
     or (v_mission ->> 'acquerable')::boolean is not false
     or v_mission #>> '{licence,titulaire}' <> 'GRIFF'
  then
    raise exception 'Catalogue v2 metadata payload is inconsistent: %', v_shop;
  end if;

  begin
    perform public.clutch_acheter_cosmetique_v1(v_mission_id);
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1
       from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = v_mission_id
     )
  then
    raise exception 'A mission cosmetic was buyable with Volts';
  end if;

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 1000, 'ajustement', 'catalog-v2-credit');

  select public.clutch_acheter_cosmetique_v1('cadre-profil-2') into v_purchase;
  select public.clutch_acheter_cosmetique_v1('cadre-profil-2') into v_repeat;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'solde')::integer <> 650
     or (v_repeat ->> 'achete')::boolean
     or (v_repeat ->> 'solde')::integer <> 650
     or (
       select count(*)
       from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'achat'
         and m.reference = 'cadre-profil-2'
     ) <> 1
     or (
       select count(*)
       from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'cadre-profil-2'
     ) <> 1
  then
    raise exception 'Catalogue v2 purchase is not atomic and idempotent: %, %', v_purchase, v_repeat;
  end if;

  v_rejected := false;
  begin
    perform public.clutch_acheter_cosmetique_v1('apparence-core-4');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1
       from public.inventaire i
       where i.user_id = v_user
         and i.objet_id = 'apparence-core-4'
     )
  then
    raise exception 'Catalogue v2 allowed an overspend';
  end if;

  -- Retirement ends new acquisition only. The permanent inventory item can
  -- still be selected and remains visible in the owner's catalogue.
  update public.objets_catalogue
  set actif = false,
      statut_publication = 'retire'
  where id = 'cadre-profil-2';

  perform public.clutch_equiper_cosmetique_v1('cadre-profil-1');
  select public.clutch_equiper_cosmetique_v1('cadre-profil-2') into v_equipped;
  select public.clutch_boutique_cosmetique_v1() into v_shop;

  if not (v_equipped ->> 'equipe')::boolean
     or v_equipped ->> 'objet' <> 'cadre-profil-2'
     or not exists (
       select 1
       from jsonb_array_elements(v_shop -> 'objets') item
       where item ->> 'id' = 'cadre-profil-2'
         and (item ->> 'possede')::boolean
         and not (item ->> 'disponible')::boolean
         and (item ->> 'acquerable')::boolean
     )
  then
    raise exception 'Retired permanent ownership was not preserved: %, %', v_equipped, v_shop;
  end if;
end;
$$;

-- Authenticated clients only receive owner-scoped SELECT privileges. They
-- cannot forge ownership, equipment or Volt movements through the Data API.
set local role authenticated;

do $$
declare
  v_user uuid := current_setting('test.catalog_v2_user')::uuid;
  v_other uuid := current_setting('test.catalog_v2_other')::uuid;
  v_denied boolean := false;
begin
  if exists (
    select 1
    from public.inventaire i
    where i.user_id = v_other
  ) then
    raise exception 'Inventory RLS exposed another user';
  end if;

  begin
    insert into public.inventaire (user_id, objet_id)
    values (v_user, 'titre-profil-3');
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Authenticated client forged an inventory item';
  end if;

  v_denied := false;
  begin
    update public.equipement
    set objet_id = 'cadre-profil-1'
    where user_id = v_other;
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Authenticated client mutated equipment directly';
  end if;

  v_denied := false;
  begin
    insert into public.volts_mouvements (user_id, montant, origine, reference)
    values (v_user, 99999, 'ajustement', 'catalog-v2-forged-credit');
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Authenticated client forged a Volt movement';
  end if;
end;
$$;

reset role;

do $$
declare
  v_other uuid := current_setting('test.catalog_v2_other')::uuid;
  v_rejected boolean := false;
begin
  begin
    insert into public.equipement (user_id, emplacement, objet_id)
    values (v_other, 'titre_profil', 'cadre-profil-2');
  exception when foreign_key_violation then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Equipment accepted an object from another slot';
  end if;

  if has_table_privilege('anon', 'public.objets_catalogue', 'SELECT')
     or has_table_privilege('authenticated', 'public.inventaire', 'INSERT')
     or has_table_privilege('authenticated', 'public.equipement', 'UPDATE')
     or has_table_privilege('authenticated', 'public.volts_mouvements', 'INSERT')
     or not has_table_privilege('authenticated', 'public.objets_catalogue', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_assert_objet_acquerable_v2(text)', 'EXECUTE')
  then
    raise exception 'Catalogue v2 privileges are inconsistent';
  end if;

  raise notice 'catalog_inventory_equipment_v2_ok';
end;
$$;

rollback;
