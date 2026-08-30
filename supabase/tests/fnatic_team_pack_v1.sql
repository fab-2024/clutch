-- Runtime regression for the published Fnatic team pack.
-- Proves one atomic/idempotent debit, all 12 permanent grants, the exact eight
-- default equipment slots, owner-only RLS and competitive isolation.

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
  v_equipped jsonb;
  v_after jsonb;
  v_journal jsonb;
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
      'fnatic-pack-' || v_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'fnatic-' || left(v_suffix, 16)),
      pg_catalog.now(),
      pg_catalog.now()
    ),
    (
      v_poor_user,
      'authenticated',
      'authenticated',
      'fnatic-poor-' || v_poor_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'fnatic-p-' || left(v_poor_suffix, 14)),
      pg_catalog.now(),
      pg_catalog.now()
    );

  if not exists (select 1 from public.profils p where p.id = v_user)
     or not exists (select 1 from public.profils p where p.id = v_poor_user)
  then
    raise exception 'Fnatic pack test profiles were not created';
  end if;

  perform set_config('test.fnatic_pack_user', v_user::text, true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_pack_cosmetique_v1('fnatic-black-orange')
  into v_before;

  if (v_before ->> 'prix_volts')::integer <> 1200
     or (v_before ->> 'nombre_objets')::integer <> 12
     or jsonb_array_length(v_before -> 'objets') <> 12
     or (v_before ->> 'possede')::boolean
     or (v_before ->> 'achetable')::boolean
     or (v_before ->> 'contrat_version')::integer <> 5
  then
    raise exception 'Fnatic pack initial read model is inconsistent: %', v_before;
  end if;

  insert into public.volts_mouvements (
    user_id,
    montant,
    origine,
    reference
  ) values (
    v_user,
    1280,
    'ajustement',
    'fnatic-pack-test-credit'
  );

  select public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange')
  into v_purchase;
  select public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange')
  into v_repeat;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'prix')::integer <> 1200
     or (v_purchase ->> 'prix_pack')::integer <> 1200
     or (v_purchase ->> 'solde')::integer <> 80
     or (v_purchase ->> 'nombre_objets')::integer <> 12
     or (v_purchase ->> 'objets_attribues')::integer <> 12
     or (v_purchase ->> 'equipables_par_defaut')::integer <> 8
     or (v_purchase ->> 'nombre_equipes')::integer <> 8
     or not (v_purchase ->> 'equipe')::boolean
     or (v_repeat ->> 'achete')::boolean
     or (v_repeat ->> 'prix')::integer <> 0
     or (v_repeat ->> 'solde')::integer <> 80
     or (v_repeat ->> 'objets_attribues')::integer <> 12
     or (v_repeat ->> 'nombre_equipes')::integer <> 8
     or not (v_repeat ->> 'equipe')::boolean
  then
    raise exception 'Fnatic pack purchase is not atomic/idempotent: first=%, repeat=%',
      v_purchase,
      v_repeat;
  end if;

  if (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.reference = 'fnatic-black-orange'
      and m.source_economique = 'achat_pack_cosmetique'
      and m.pack_id = 'fnatic-black-orange'
      and m.objet_id is null
      and m.montant = -1200
      and m.cle_idempotence = 'achat_pack:fnatic-black-orange'
      and m.solde_apres = 80
  ) <> 1
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques i
    join public.volts_mouvements m on m.id = i.mouvement_id
    where i.user_id = v_user
      and i.pack_id = 'fnatic-black-orange'
      and i.prix_paye_volts = 1200
      and m.pack_id = i.pack_id
      and m.user_id = i.user_id
  ) <> 1
     or (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'fnatic-black-orange'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 12
  then
    raise exception 'Fnatic entitlement, ledger or inventory is incomplete';
  end if;

  if (
    select count(*)
    from public.equipement e
    join public.pack_cosmetique_membres m
      on m.pack_id = 'fnatic-black-orange'
     and m.objet_id = e.objet_id
     and m.equip_by_default
    where e.user_id = v_user
  ) <> 8
     or exists (
       (values
         ('vitrine_eclairage'::text, 'fnatic-room-lighting'::text),
         ('vitrine_maillot', 'fnatic-jersey'),
         ('apparence_core', 'fnatic-logo-3d'),
         ('vitrine_supports', 'fnatic-pedestals'),
         ('cadre_profil', 'fnatic-profile-frame'),
         ('effet_faction', 'fnatic-embers'),
         ('carte_profil', 'fnatic-share-card'),
         ('titre_profil', 'fnatic-title')
       )
       except
       select e.emplacement, e.objet_id
       from public.equipement e
       where e.user_id = v_user
     )
  then
    raise exception 'Fnatic purchase did not equip its defaults atomically';
  end if;

  insert into public.packs_cosmetiques (
    id,
    nom,
    description,
    prix_volts,
    nombre_objets,
    actif,
    statut_publication,
    collection_key,
    licence
  ) values (
    'fnatic-pack-move-probe',
    'Pack move probe',
    'Fixture de contrôle OLD/NEW pour le verrou d’immuabilité.',
    1,
    1,
    false,
    'brouillon',
    'fnatic-black-orange',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb
  );

  insert into public.pack_cosmetique_membres (
    pack_id,
    objet_id,
    emplacement,
    ordre,
    equip_by_default
  ) values (
    'fnatic-pack-move-probe',
    'fnatic-banner',
    'carte_profil',
    1,
    false
  );

  v_rejected := false;
  begin
    update public.pack_cosmetique_membres
    set pack_id = 'fnatic-pack-move-probe'
    where pack_id = 'fnatic-black-orange'
      and objet_id = 'fnatic-title';
  exception when sqlstate '55000' then
    v_rejected := true;
  end;

  if not v_rejected or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.objet_id = 'fnatic-title'
  ) then
    raise exception 'OLD.pack_id did not protect acquired pack content';
  end if;

  v_rejected := false;
  begin
    update public.pack_cosmetique_membres
    set pack_id = 'fnatic-black-orange'
    where pack_id = 'fnatic-pack-move-probe'
      and objet_id = 'fnatic-banner';
  exception when sqlstate '55000' then
    v_rejected := true;
  end;

  if not v_rejected or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-pack-move-probe'
      and m.objet_id = 'fnatic-banner'
  ) then
    raise exception 'NEW.pack_id did not protect acquired pack content';
  end if;

  select public.clutch_equiper_pack_cosmetique_v1('fnatic-black-orange')
  into v_equipped;

  if not (v_equipped ->> 'equipe')::boolean
     or (v_equipped ->> 'nombre_objets')::integer <> 12
     or (v_equipped ->> 'objets_attribues')::integer <> 12
     or (v_equipped ->> 'nombre_equipes')::integer <> 8
     or jsonb_array_length(v_equipped -> 'objets_equipes') <> 8
     or (v_equipped ->> 'solde')::integer <> 80
     or exists (
       (values
         ('vitrine_eclairage'::text, 'fnatic-room-lighting'::text),
         ('vitrine_maillot', 'fnatic-jersey'),
         ('apparence_core', 'fnatic-logo-3d'),
         ('vitrine_supports', 'fnatic-pedestals'),
         ('cadre_profil', 'fnatic-profile-frame'),
         ('effet_faction', 'fnatic-embers'),
         ('carte_profil', 'fnatic-share-card'),
         ('titre_profil', 'fnatic-title')
       )
       except
       select e.emplacement, e.objet_id
       from public.equipement e
       where e.user_id = v_user
     )
     or exists (
       select 1
       from public.equipement e
       where e.user_id = v_user
         and e.objet_id in (
           'fnatic-banner',
           'fnatic-supporter-token',
           'fnatic-totem',
           'fnatic-supporter-badge'
         )
     )
  then
    raise exception 'Fnatic default equipment mapping is inconsistent: %', v_equipped;
  end if;

  select public.clutch_pack_cosmetique_v1('fnatic-black-orange')
  into v_after;
  select public.clutch_journal_volts_v1(20, null)
  into v_journal;

  if not (v_after ->> 'possede')::boolean
     or (v_after ->> 'achetable')::boolean
     or (
       select count(*)
       from jsonb_array_elements(v_after -> 'objets') item(value)
       where (item.value ->> 'possede')::boolean
         and (item.value ->> 'equipe')::boolean
     ) <> 8
     or (v_journal ->> 'solde')::integer <> 80
     or not exists (
       select 1
       from jsonb_array_elements(v_journal -> 'mouvements') movement(value)
       where movement.value ->> 'source_economique' = 'achat_pack_cosmetique'
         and movement.value #>> '{pack,id}' = 'fnatic-black-orange'
         and movement.value ->> 'cle_idempotence' = 'achat_pack:fnatic-black-orange'
         and (movement.value ->> 'solde_apres')::integer = 80
     )
  then
    raise exception 'Fnatic post-purchase read models are inconsistent: pack=%, journal=%',
      v_after,
      v_journal;
  end if;

  -- A member cannot be bought outside its pack, even when the caller has Volts.
  perform set_config('request.jwt.claim.sub', v_poor_user::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_poor_user, 'role', 'authenticated')::text,
    true
  );

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_poor_user, 1199, 'ajustement', 'fnatic-poor-test-credit');

  begin
    perform public.clutch_acheter_cosmetique_v1('fnatic-banner');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Fnatic member was individually purchasable';
  end if;

  v_rejected := false;
  begin
    insert into public.volts_mouvements (
      user_id,
      montant,
      origine,
      reference,
      pack_id
    ) values (
      v_poor_user,
      -1,
      'achat_pack',
      'fnatic-black-orange',
      'fnatic-black-orange'
    );
  exception when sqlstate '23514' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Fnatic ledger accepted a debit different from the published pack price';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange');
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
         and m.pack_id = 'fnatic-black-orange'
     )
     or exists (
       select 1
       from public.volts_mouvements m
       where m.user_id = v_poor_user
         and m.origine = 'achat_pack'
     )
  then
    raise exception 'Insufficient-balance pack purchase was not rolled back atomically';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_equiper_pack_cosmetique_v1('fnatic-black-orange');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1 from public.equipement e where e.user_id = v_poor_user
     )
  then
    raise exception 'Unowned Fnatic pack was equipable';
  end if;

  if exists (
    select 1 from public.participations p where p.user_id in (v_user, v_poor_user)
  ) or exists (
    select 1 from public.pronostics_classes p where p.user_id in (v_user, v_poor_user)
  ) then
    raise exception 'Fnatic pack operations crossed into competitive state';
  end if;

  if has_function_privilege('anon', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.packs_cosmetiques', 'INSERT')
     or has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'INSERT')
     or has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'INSERT')
     or has_table_privilege('authenticated', 'public.volts_mouvements', 'INSERT')
  then
    raise exception 'Fnatic pack grants are too broad or too narrow';
  end if;

  raise notice 'fnatic_team_pack_v1_ok';
end;
$$;

-- Exercise published catalogue and owner inventory policies with the actual
-- Data API role. The user left in request.jwt.claim.sub owns no pack.
set local role authenticated;
do $$
begin
  if (
    select count(*)
    from public.packs_cosmetiques
    where id = 'fnatic-black-orange'
      and prix_volts = 1200
  ) <> 1
     or (
    select count(*)
    from public.pack_cosmetique_membres
    where pack_id = 'fnatic-black-orange'
  ) <> 12
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques
  ) <> 0
     or jsonb_array_length(
       public.clutch_pack_cosmetique_v1('fnatic-black-orange') -> 'objets'
     ) <> 12
  then
    raise exception 'Fnatic pack RLS did not expose published content and hide another owner';
  end if;
end;
$$;
reset role;

rollback;
