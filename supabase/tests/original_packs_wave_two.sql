-- Runtime regression for the six Clutch Originals packs published together.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_pack_id text;
  v_accent text;
  v_pack jsonb;
  v_purchase jsonb;
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
    'original-wave-two-' || v_suffix || '@example.invalid',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'original-' || left(v_suffix, 16)),
    pg_catalog.now(),
    pg_catalog.now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Wave-two original-packs test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 7200, 'ajustement', 'original-wave-two-test-credit');

  for v_pack_id, v_accent in
    select seed.id, seed.accent
    from (values
      ('sang-des-titans'::text, '#B98957'::text),
      ('chute-libre', '#FF6A55'),
      ('serment-du-givre', '#9BCFFF'),
      ('conclave-arcanique', '#BE8BE8'),
      ('turbo-arena', '#FF8A24'),
      ('dernier-round', '#FF5D4D')
    ) seed(id, accent)
  loop
    select public.clutch_pack_cosmetique_v1(v_pack_id)
    into v_pack;

    if (v_pack ->> 'prix_volts')::integer <> 1200
       or (v_pack ->> 'nombre_objets')::integer <> 9
       or v_pack ->> 'accent' is distinct from v_accent
       or v_pack ->> 'marque_key' is distinct from 'clutch-originals'
       or jsonb_array_length(v_pack -> 'objets') <> 9
       or (v_pack ->> 'possede')::boolean
       or not (v_pack ->> 'achetable')::boolean
    then
      raise exception 'Original pack % initial read model is inconsistent: %', v_pack_id, v_pack;
    end if;

    select public.clutch_acheter_pack_cosmetique_v1(v_pack_id)
    into v_purchase;

    if not (v_purchase ->> 'achete')::boolean
       or (v_purchase ->> 'prix')::integer <> 1200
       or (v_purchase ->> 'objets_attribues')::integer <> 9
       or (v_purchase ->> 'equipables_par_defaut')::integer <> 6
       or (v_purchase ->> 'nombre_equipes')::integer <> 6
       or not (v_purchase ->> 'equipe')::boolean
    then
      raise exception 'Original pack % purchase is not atomic: %', v_pack_id, v_purchase;
    end if;
  end loop;

  if (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.objet_id = i.objet_id
    where i.user_id = v_user
      and m.pack_id in (
        'sang-des-titans',
        'chute-libre',
        'serment-du-givre',
        'conclave-arcanique',
        'turbo-arena',
        'dernier-round'
      )
  ) <> 54
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques i
    where i.user_id = v_user
      and i.pack_id in (
        'sang-des-titans',
        'chute-libre',
        'serment-du-givre',
        'conclave-arcanique',
        'turbo-arena',
        'dernier-round'
      )
  ) <> 6
     or (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.reference in (
        'sang-des-titans',
        'chute-libre',
        'serment-du-givre',
        'conclave-arcanique',
        'turbo-arena',
        'dernier-round'
      )
      and m.montant = -1200
  ) <> 6
     or (
    select coalesce(sum(m.montant), 0)
    from public.volts_mouvements m
    where m.user_id = v_user
  ) <> 0
  then
    raise exception 'Wave-two purchases damaged the ledger or inventories';
  end if;

  select public.clutch_boutique_cosmetique_v1()
  into v_shop;

  if (
    select count(*)
    from jsonb_array_elements(v_shop -> 'objets') item(value)
    where item.value ->> 'collection_key' in (
      'sang-des-titans',
      'chute-libre',
      'serment-du-givre',
      'conclave-arcanique',
      'turbo-arena',
      'dernier-round'
    )
  ) <> 54
  then
    raise exception 'Active shop does not expose all six wave-two packs';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_shop -> 'objets') item(value)
    where item.value ->> 'id' in (
      'sang-des-titans-tribute-token',
      'sang-des-titans-last-pact-card',
      'sang-des-titans-oath-bearer-title',
      'chute-libre-survivor-token',
      'chute-libre-share-card',
      'chute-libre-untouchable-title',
      'serment-du-givre-cold-breath-token',
      'serment-du-givre-summit-card',
      'serment-du-givre-frost-guard-title',
      'conclave-arcanique-omen-token',
      'conclave-arcanique-conclave-card',
      'conclave-arcanique-spell-weaver-title',
      'turbo-arena-vortex-wheel',
      'turbo-arena-share-card',
      'turbo-arena-last-second-title',
      'dernier-round-match-point-token',
      'dernier-round-share-card',
      'dernier-round-cold-blood-title'
    )
  ) then
    raise exception 'A retired card, title or token remains visible in the shop';
  end if;
end;
$$;

rollback;
