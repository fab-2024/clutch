-- Runtime regression for the active original Pack Protocole Neon.
-- The licensed pack fixtures remain in the repository, but this release
-- contract verifies that they are retired and cannot be acquired by new users.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_legacy_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_legacy_suffix text := replace(v_legacy_user::text, '-', '');
  v_before jsonb;
  v_purchase jsonb;
  v_repeat jsonb;
  v_shop jsonb;
  v_legacy_read jsonb;
  v_legacy_equip jsonb;
  v_legacy_shop jsonb;
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
      'neon-pack-' || v_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'neon-' || left(v_suffix, 16)),
      pg_catalog.now(),
      pg_catalog.now()
    ),
    (
      v_legacy_user,
      'authenticated',
      'authenticated',
      'legacy-pack-' || v_legacy_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'legacy-' || left(v_legacy_suffix, 14)),
      pg_catalog.now(),
      pg_catalog.now()
    );

  if not exists (select 1 from public.profils p where p.id = v_user)
     or not exists (select 1 from public.profils p where p.id = v_legacy_user)
  then
    raise exception 'Neon pack test profiles were not created';
  end if;

  -- Recreate one pre-retirement purchase inside the rolled-back test, then
  -- prove that editorial retirement preserves its permanent rights.
  update public.objets_catalogue
  set actif = true,
      statut_publication = 'publie'
  where collection_key = 'fnatic-black-orange';

  update public.packs_cosmetiques
  set actif = true,
      statut_publication = 'publie',
      maj_le = pg_catalog.now()
  where id = 'fnatic-black-orange';

  perform set_config('request.jwt.claim.sub', v_legacy_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_legacy_user, 'role', 'authenticated')::text,
    true
  );

  insert into public.volts_mouvements (
    user_id,
    montant,
    origine,
    reference
  ) values (
    v_legacy_user,
    1200,
    'ajustement',
    'legacy-pack-test-credit'
  );

  perform public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange');

  update public.packs_cosmetiques
  set actif = false,
      statut_publication = 'retire',
      maj_le = pg_catalog.now()
  where id = 'fnatic-black-orange';

  update public.objets_catalogue
  set actif = false,
      statut_publication = 'retire'
  where collection_key = 'fnatic-black-orange';

  select public.clutch_pack_cosmetique_v1('fnatic-black-orange')
  into v_legacy_read;
  select public.clutch_equiper_pack_cosmetique_v1('fnatic-black-orange')
  into v_legacy_equip;
  select public.clutch_boutique_cosmetique_v1()
  into v_legacy_shop;

  if not (v_legacy_read ->> 'possede')::boolean
     or v_legacy_read ->> 'statut_publication' is distinct from 'retire'
     or jsonb_array_length(v_legacy_read -> 'objets') <> 12
     or not (v_legacy_equip ->> 'equipe')::boolean
     or (v_legacy_equip ->> 'nombre_equipes')::integer <> 8
     or (
       select count(*)
       from jsonb_array_elements(v_legacy_shop -> 'objets') item(value)
       where item.value ->> 'collection_key' = 'fnatic-black-orange'
         and (item.value ->> 'possede')::boolean
         and not (item.value ->> 'disponible')::boolean
     ) <> 12
  then
    raise exception 'A retired pack no longer preserves an existing owner''s rights';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.clutch_pack_cosmetique_v1('fnatic-black-orange');
  exception
    when sqlstate 'P0002' then v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'A retired pack is still discoverable by a non-owner';
  end if;

  select public.clutch_pack_cosmetique_v1('neon-protocol')
  into v_before;

  if (v_before ->> 'prix_volts')::integer <> 1200
     or (v_before ->> 'nombre_objets')::integer <> 12
     or v_before ->> 'accent' is distinct from '#58DFFF'
     or v_before ->> 'marque_key' is distinct from 'clutch-originals'
     or jsonb_array_length(v_before -> 'objets') <> 12
     or (v_before ->> 'possede')::boolean
     or (v_before ->> 'achetable')::boolean
     or exists (
       (values
         (1, 'neon-protocol-room'::text),
         (2, 'neon-protocol-armor-vega'),
         (3, 'neon-protocol-glyph-node'),
         (4, 'neon-protocol-banner-phase'),
         (5, 'neon-protocol-vector-pedestals'),
         (6, 'neon-protocol-syn-token'),
         (7, 'neon-protocol-null-totem'),
         (8, 'neon-protocol-pioneer-badge'),
         (9, 'neon-protocol-phase-frame'),
         (10, 'neon-protocol-impulse-effect'),
         (11, 'neon-protocol-share-card'),
         (12, 'neon-protocol-architect-title')
       )
       except
       select
         (item.value ->> 'ordre')::integer,
         item.value ->> 'id'
       from jsonb_array_elements(v_before -> 'objets') item(value)
     )
  then
    raise exception 'Neon initial read model is inconsistent: %', v_before;
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
    'neon-pack-test-credit'
  );

  select public.clutch_acheter_pack_cosmetique_v1('neon-protocol')
  into v_purchase;
  select public.clutch_acheter_pack_cosmetique_v1('neon-protocol')
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
    raise exception 'Neon purchase is not atomic/idempotent: first=%, repeat=%',
      v_purchase,
      v_repeat;
  end if;

  if (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'neon-protocol'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 12
     or (
    select count(*)
    from public.equipement e
    join public.pack_cosmetique_membres m
      on m.pack_id = 'neon-protocol'
     and m.objet_id = e.objet_id
     and m.equip_by_default
    where e.user_id = v_user
  ) <> 8
     or (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.pack_id = 'neon-protocol'
      and m.montant = -1200
      and m.cle_idempotence = 'achat_pack:neon-protocol'
  ) <> 1
  then
    raise exception 'Neon purchase damaged the ledger, inventory or default equipment';
  end if;

  select public.clutch_boutique_cosmetique_v1()
  into v_shop;

  if (
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
    raise exception 'Active shop publication does not isolate Protocole Neon';
  end if;
end;
$$;

rollback;
