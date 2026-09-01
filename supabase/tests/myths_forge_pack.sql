-- Runtime regression for the active original Pack Mythes de la Forge.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_before jsonb;
  v_neon jsonb;
  v_purchase jsonb;
  v_repeat jsonb;
  v_shop jsonb;
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
    'forge-pack-' || v_suffix || '@example.invalid',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'forge-' || left(v_suffix, 16)),
    pg_catalog.now(),
    pg_catalog.now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Forge pack test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_pack_cosmetique_v1('mythes-forge')
  into v_before;
  select public.clutch_pack_cosmetique_v1('neon-protocol')
  into v_neon;

  if (v_before ->> 'prix_volts')::integer <> 1200
     or (v_before ->> 'nombre_objets')::integer <> 12
     or v_before ->> 'accent' is distinct from '#F06A3A'
     or v_before ->> 'marque_key' is distinct from 'clutch-originals'
     or jsonb_array_length(v_before -> 'objets') <> 12
     or (v_before ->> 'possede')::boolean
     or not (v_before ->> 'achetable')::boolean
     or exists (
       (values
         (1, 'mythes-forge-room'::text),
         (2, 'mythes-forge-armor-orea'),
         (3, 'mythes-forge-ember-sigil'),
         (4, 'mythes-forge-strata-banner'),
         (5, 'mythes-forge-magma-pedestals'),
         (6, 'mythes-forge-telluric-token'),
         (7, 'mythes-forge-basalt-totem'),
         (8, 'mythes-forge-artisan-badge'),
         (9, 'mythes-forge-rift-frame'),
         (10, 'mythes-forge-resonance-effect'),
         (11, 'mythes-forge-share-card'),
         (12, 'mythes-forge-master-smith-title')
       )
       except
       select
         (item.value ->> 'ordre')::integer,
         item.value ->> 'id'
       from jsonb_array_elements(v_before -> 'objets') item(value)
     )
  then
    raise exception 'Forge initial read model is inconsistent: %', v_before;
  end if;

  if (v_neon ->> 'prix_volts')::integer <> 1200
     or (v_neon ->> 'nombre_objets')::integer <> 12
     or not (v_neon ->> 'achetable')::boolean
  then
    raise exception 'Adding Forge retired or damaged Protocole Neon: %', v_neon;
  end if;

  insert into public.volts_mouvements (
    user_id,
    montant,
    origine,
    reference
  ) values (
    v_user,
    1200,
    'ajustement',
    'forge-pack-test-credit'
  );

  select public.clutch_acheter_pack_cosmetique_v1('mythes-forge')
  into v_purchase;
  select public.clutch_acheter_pack_cosmetique_v1('mythes-forge')
  into v_repeat;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'prix')::integer <> 1200
     or (v_purchase ->> 'solde')::integer <> 0
     or (v_purchase ->> 'objets_attribues')::integer <> 12
     or (v_purchase ->> 'equipables_par_defaut')::integer <> 8
     or (v_purchase ->> 'nombre_equipes')::integer <> 8
     or not (v_purchase ->> 'equipe')::boolean
     or (v_repeat ->> 'achete')::boolean
     or (v_repeat ->> 'prix')::integer <> 0
     or (v_repeat ->> 'solde')::integer <> 0
  then
    raise exception 'Forge purchase is not atomic/idempotent: first=%, repeat=%',
      v_purchase,
      v_repeat;
  end if;

  if (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'mythes-forge'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 12
     or (
    select count(*)
    from public.equipement e
    join public.pack_cosmetique_membres m
      on m.pack_id = 'mythes-forge'
     and m.objet_id = e.objet_id
     and m.equip_by_default
    where e.user_id = v_user
  ) <> 8
     or (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.pack_id = 'mythes-forge'
      and m.montant = -1200
      and m.cle_idempotence = 'achat_pack:mythes-forge'
  ) <> 1
  then
    raise exception 'Forge purchase damaged the ledger, inventory or default equipment';
  end if;

  select public.clutch_boutique_cosmetique_v1()
  into v_shop;

  if (
    select count(*)
    from jsonb_array_elements(v_shop -> 'objets') item(value)
    where item.value ->> 'collection_key' = 'mythes-forge'
  ) <> 12
     or (
    select count(*)
    from jsonb_array_elements(v_shop -> 'objets') item(value)
    where item.value ->> 'collection_key' = 'neon-protocol'
  ) <> 12
     or exists (
    select 1
    from jsonb_array_elements(v_shop -> 'objets') item(value)
    where item.value ->> 'collection_key' in (
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
      'league-of-legends-collection',
      'valorant-collection',
      'rocket-league-collection'
    )
  )
  then
    raise exception 'Active shop publication does not expose both original packs cleanly';
  end if;
end;
$$;

rollback;
