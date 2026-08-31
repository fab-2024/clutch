-- Runtime regression for the five-object League of Legends game collection.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_poor_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_poor_suffix text := replace(v_poor_user::text, '-', '');
  v_before jsonb;
  v_purchase jsonb;
  v_repeat jsonb;
  v_after jsonb;
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
      'lol-pack-' || v_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'lol-' || left(v_suffix, 16)),
      pg_catalog.now(),
      pg_catalog.now()
    ),
    (
      v_poor_user,
      'authenticated',
      'authenticated',
      'lol-poor-' || v_poor_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'lol-p-' || left(v_poor_suffix, 14)),
      pg_catalog.now(),
      pg_catalog.now()
    );

  if not exists (select 1 from public.profils p where p.id = v_user)
     or not exists (select 1 from public.profils p where p.id = v_poor_user)
  then
    raise exception 'League of Legends pack test profiles were not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_pack_cosmetique_v1('league-of-legends-collection')
  into v_before;

  if (v_before ->> 'prix_volts')::integer <> 900
     or (v_before ->> 'nombre_objets')::integer <> 5
     or v_before ->> 'accent' is distinct from '#D6B56A'
     or v_before ->> 'marque_key' is distinct from 'league-of-legends'
     or jsonb_array_length(v_before -> 'objets') <> 5
     or (v_before ->> 'possede')::boolean
     or (v_before ->> 'achetable')::boolean
     or exists (
       (values
         (1, 'lol-infinity-edge'::text),
         (2, 'lol-nexus-fragment'),
         (3, 'lol-jinx-fishbones-gallery'),
         (4, 'lol-baron-nashor'),
         (5, 'lol-vision-ward')
       )
       except
       select
         (item.value ->> 'ordre')::integer,
         item.value ->> 'id'
       from jsonb_array_elements(v_before -> 'objets') item(value)
     )
  then
    raise exception 'League of Legends initial read model is inconsistent: %', v_before;
  end if;

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 900, 'ajustement', 'lol-pack-test-credit');

  select public.clutch_acheter_pack_cosmetique_v1('league-of-legends-collection')
  into v_purchase;
  select public.clutch_acheter_pack_cosmetique_v1('league-of-legends-collection')
  into v_repeat;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'prix')::integer <> 900
     or (v_purchase ->> 'solde')::integer <> 0
     or (v_purchase ->> 'nombre_objets')::integer <> 5
     or (v_purchase ->> 'objets_attribues')::integer <> 5
     or (v_purchase ->> 'equipables_par_defaut')::integer <> 1
     or (v_purchase ->> 'nombre_equipes')::integer <> 1
     or not (v_purchase ->> 'equipe')::boolean
     or (v_repeat ->> 'achete')::boolean
     or (v_repeat ->> 'prix')::integer <> 0
     or (v_repeat ->> 'solde')::integer <> 0
     or (v_repeat ->> 'objets_attribues')::integer <> 5
     or (v_repeat ->> 'nombre_equipes')::integer <> 1
  then
    raise exception 'League of Legends purchase is not atomic/idempotent: first=%, repeat=%',
      v_purchase,
      v_repeat;
  end if;

  if (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.reference = 'league-of-legends-collection'
      and m.source_economique = 'achat_pack_cosmetique'
      and m.pack_id = 'league-of-legends-collection'
      and m.montant = -900
      and m.cle_idempotence = 'achat_pack:league-of-legends-collection'
      and m.solde_apres = 0
  ) <> 1
     or (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'league-of-legends-collection'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 5
     or not exists (
    select 1
    from public.equipement e
    where e.user_id = v_user
      and e.emplacement = 'vitrine_supports'
      and e.objet_id = 'lol-jinx-fishbones-gallery'
  )
     or exists (
    select 1
    from public.equipement e
    where e.user_id = v_user
      and e.objet_id in (
        'lol-infinity-edge',
        'lol-nexus-fragment',
        'lol-baron-nashor',
        'lol-vision-ward'
      )
  )
  then
    raise exception 'League of Legends entitlement, ledger or equipment is inconsistent';
  end if;

  select public.clutch_pack_cosmetique_v1('league-of-legends-collection')
  into v_after;

  if not (v_after ->> 'possede')::boolean
     or (v_after ->> 'achetable')::boolean
     or (
       select count(*)
       from jsonb_array_elements(v_after -> 'objets') item(value)
       where (item.value ->> 'possede')::boolean
     ) <> 5
     or (
       select count(*)
       from jsonb_array_elements(v_after -> 'objets') item(value)
       where (item.value ->> 'equipe')::boolean
     ) <> 1
  then
    raise exception 'League of Legends post-purchase read model is inconsistent: %', v_after;
  end if;

  perform set_config('request.jwt.claim.sub', v_poor_user::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_poor_user, 'role', 'authenticated')::text,
    true
  );

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_poor_user, 899, 'ajustement', 'lol-poor-test-credit');

  v_rejected := false;
  begin
    perform public.clutch_acheter_cosmetique_v1('lol-baron-nashor');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'League of Legends member was individually purchasable';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_acheter_pack_cosmetique_v1('league-of-legends-collection');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1
       from public.inventaire_packs_cosmetiques i
       where i.user_id = v_poor_user
     )
     or exists (
       select 1
       from public.inventaire i
       join public.pack_cosmetique_membres m on m.objet_id = i.objet_id
       where i.user_id = v_poor_user
         and m.pack_id = 'league-of-legends-collection'
     )
     or exists (
       select 1
       from public.volts_mouvements m
       where m.user_id = v_poor_user
         and m.origine = 'achat_pack'
     )
  then
    raise exception 'Insufficient-balance League of Legends purchase was not atomic';
  end if;

  if exists (
    select 1 from public.participations p where p.user_id in (v_user, v_poor_user)
  ) or exists (
    select 1 from public.pronostics_classes p where p.user_id in (v_user, v_poor_user)
  ) then
    raise exception 'League of Legends pack operations crossed into competitive state';
  end if;

  raise notice 'league_of_legends_collection_pack_v1_ok';
end;
$$;

set local role authenticated;
do $$
begin
  if (
    select count(*)
    from public.packs_cosmetiques
    where id = 'league-of-legends-collection'
      and prix_volts = 900
  ) <> 1
     or (
    select count(*)
    from public.pack_cosmetique_membres
    where pack_id = 'league-of-legends-collection'
  ) <> 5
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques
  ) <> 0
     or jsonb_array_length(
       public.clutch_pack_cosmetique_v1('league-of-legends-collection') -> 'objets'
     ) <> 5
  then
    raise exception 'League of Legends RLS did not expose content and hide ownership';
  end if;
end;
$$;
reset role;

rollback;
