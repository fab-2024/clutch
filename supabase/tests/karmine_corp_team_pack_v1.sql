-- Runtime regression for the published Karmine Corp Blue Wall team pack.
-- Proves that the generic team-pack RPCs provide one atomic/idempotent debit,
-- all 12 permanent grants, the exact eight default slots, immutable acquired
-- membership, owner-only RLS and no competitive side effect.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_poor_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_poor_suffix text := replace(v_poor_user::text, '-', '');
  v_before jsonb;
  v_fnatic_purchase jsonb;
  v_fnatic_equipped jsonb;
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
      'kc-pack-' || v_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'kc-' || left(v_suffix, 16)),
      pg_catalog.now(),
      pg_catalog.now()
    ),
    (
      v_poor_user,
      'authenticated',
      'authenticated',
      'kc-poor-' || v_poor_suffix || '@example.invalid',
      pg_catalog.now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'kc-p-' || left(v_poor_suffix, 14)),
      pg_catalog.now(),
      pg_catalog.now()
    );

  if not exists (select 1 from public.profils p where p.id = v_user)
     or not exists (select 1 from public.profils p where p.id = v_poor_user)
  then
    raise exception 'Karmine Corp pack test profiles were not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_pack_cosmetique_v1('kc-blue-wall')
  into v_before;

  if (v_before ->> 'prix_volts')::integer <> 1200
     or (v_before ->> 'nombre_objets')::integer <> 12
     or v_before ->> 'accent' is distinct from '#168DFF'
     or v_before ->> 'marque_key' is distinct from 'kc'
     or jsonb_array_length(v_before -> 'objets') <> 12
     or (v_before ->> 'possede')::boolean
     or (v_before ->> 'achetable')::boolean
     or (v_before ->> 'contrat_version')::integer <> 5
     or exists (
       (values
         (1, 'kc-room-lighting'::text),
         (2, 'kc-jersey'),
         (3, 'kc-logo-3d'),
         (4, 'kc-banner'),
         (5, 'kc-pedestals'),
         (6, 'kc-supporter-token'),
         (7, 'kc-totem'),
         (8, 'kc-supporter-badge'),
         (9, 'kc-profile-frame'),
         (10, 'kc-blue-wall-effect'),
         (11, 'kc-share-card'),
         (12, 'kc-title')
       )
       except
       select
         (item.value ->> 'ordre')::integer,
         item.value ->> 'id'
       from jsonb_array_elements(v_before -> 'objets') item(value)
     )
  then
    raise exception 'Karmine Corp initial read model is inconsistent: %', v_before;
  end if;

  insert into public.volts_mouvements (
    user_id,
    montant,
    origine,
    reference
  ) values (
    v_user,
    2480,
    'ajustement',
    'kc-pack-test-credit'
  );

  -- Establish ownership/equipment for another pack first. KC uses the same
  -- eight visual slots, so buying it may replace the active slot values but
  -- must never remove the earlier entitlement or inventory.
  select public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange')
  into v_fnatic_purchase;

  if not (v_fnatic_purchase ->> 'achete')::boolean
     or (v_fnatic_purchase ->> 'solde')::integer <> 1280
     or (v_fnatic_purchase ->> 'objets_attribues')::integer <> 12
     or (v_fnatic_purchase ->> 'nombre_equipes')::integer <> 8
  then
    raise exception 'Fnatic isolation fixture could not be established: %',
      v_fnatic_purchase;
  end if;

  select public.clutch_acheter_pack_cosmetique_v1('kc-blue-wall')
  into v_purchase;
  select public.clutch_acheter_pack_cosmetique_v1('kc-blue-wall')
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
    raise exception 'Karmine Corp purchase is not atomic/idempotent: first=%, repeat=%',
      v_purchase,
      v_repeat;
  end if;

  if (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat_pack'
      and m.reference = 'kc-blue-wall'
      and m.source_economique = 'achat_pack_cosmetique'
      and m.pack_id = 'kc-blue-wall'
      and m.objet_id is null
      and m.montant = -1200
      and m.cle_idempotence = 'achat_pack:kc-blue-wall'
      and m.solde_apres = 80
  ) <> 1
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques i
    join public.volts_mouvements m on m.id = i.mouvement_id
    where i.user_id = v_user
      and i.pack_id = 'kc-blue-wall'
      and i.prix_paye_volts = 1200
      and m.pack_id = i.pack_id
      and m.user_id = i.user_id
  ) <> 1
     or (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'kc-blue-wall'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 12
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques i
    where i.user_id = v_user
      and i.pack_id in ('fnatic-black-orange', 'kc-blue-wall')
  ) <> 2
     or (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'fnatic-black-orange'
     and m.objet_id = i.objet_id
    where i.user_id = v_user
  ) <> 12
  then
    raise exception 'Karmine Corp purchase damaged an entitlement, ledger or inventory';
  end if;

  if (
    select count(*)
    from public.equipement e
    join public.pack_cosmetique_membres m
      on m.pack_id = 'kc-blue-wall'
     and m.objet_id = e.objet_id
     and m.equip_by_default
    where e.user_id = v_user
  ) <> 8
     or exists (
       (values
         ('vitrine_eclairage'::text, 'kc-room-lighting'::text),
         ('vitrine_maillot', 'kc-jersey'),
         ('apparence_core', 'kc-logo-3d'),
         ('vitrine_supports', 'kc-pedestals'),
         ('cadre_profil', 'kc-profile-frame'),
         ('effet_faction', 'kc-blue-wall-effect'),
         ('carte_profil', 'kc-share-card'),
         ('titre_profil', 'kc-title')
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
           'kc-banner',
           'kc-supporter-token',
           'kc-totem',
           'kc-supporter-badge'
         )
     )
  then
    raise exception 'Karmine Corp purchase did not equip its defaults atomically';
  end if;

  -- Both the pack identifier and its acquired membership are immutable.
  v_rejected := false;
  begin
    update public.packs_cosmetiques
    set id = 'kc-blue-wall-renamed'
    where id = 'kc-blue-wall';
  exception when sqlstate '55000' then
    v_rejected := true;
  end;

  if not v_rejected or not exists (
    select 1 from public.packs_cosmetiques where id = 'kc-blue-wall'
  ) then
    raise exception 'Acquired Karmine Corp pack identifier remained mutable';
  end if;

  v_rejected := false;
  begin
    update public.pack_cosmetique_membres
    set ordre = 13
    where pack_id = 'kc-blue-wall'
      and objet_id = 'kc-title';
  exception when sqlstate '55000' then
    v_rejected := true;
  end;

  if not v_rejected or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.objet_id = 'kc-title'
      and m.ordre = 12
  ) then
    raise exception 'Acquired Karmine Corp pack membership remained mutable';
  end if;

  -- Switching the overlapping visual slots back to Fnatic is explicit,
  -- reversible and free. KC ownership and all KC members remain untouched.
  select public.clutch_equiper_pack_cosmetique_v1('fnatic-black-orange')
  into v_fnatic_equipped;

  if not (v_fnatic_equipped ->> 'equipe')::boolean
     or (v_fnatic_equipped ->> 'nombre_equipes')::integer <> 8
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
     or (
       select count(*)
       from public.inventaire_packs_cosmetiques i
       where i.user_id = v_user
         and i.pack_id = 'kc-blue-wall'
     ) <> 1
     or (
       select count(*)
       from public.inventaire i
       join public.pack_cosmetique_membres m
         on m.pack_id = 'kc-blue-wall'
        and m.objet_id = i.objet_id
       where i.user_id = v_user
     ) <> 12
  then
    raise exception 'Cross-pack equipment damaged KC ownership: %', v_fnatic_equipped;
  end if;

  select public.clutch_equiper_pack_cosmetique_v1('kc-blue-wall')
  into v_equipped;

  if not (v_equipped ->> 'equipe')::boolean
     or (v_equipped ->> 'nombre_objets')::integer <> 12
     or (v_equipped ->> 'objets_attribues')::integer <> 12
     or (v_equipped ->> 'nombre_equipes')::integer <> 8
     or jsonb_array_length(v_equipped -> 'objets_equipes') <> 8
     or (v_equipped ->> 'solde')::integer <> 80
     or (
       select count(*)
       from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'achat_pack'
         and m.reference in ('fnatic-black-orange', 'kc-blue-wall')
     ) <> 2
  then
    raise exception 'Karmine Corp explicit equipment is inconsistent: %', v_equipped;
  end if;

  select public.clutch_pack_cosmetique_v1('kc-blue-wall')
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
         and movement.value #>> '{pack,id}' = 'kc-blue-wall'
         and movement.value ->> 'cle_idempotence' = 'achat_pack:kc-blue-wall'
         and (movement.value ->> 'solde_apres')::integer = 80
     )
  then
    raise exception 'Karmine Corp post-purchase read models are inconsistent: pack=%, journal=%',
      v_after,
      v_journal;
  end if;

  perform set_config('request.jwt.claim.sub', v_poor_user::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_poor_user, 'role', 'authenticated')::text,
    true
  );

  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_poor_user, 1199, 'ajustement', 'kc-poor-test-credit');

  -- A team-pack member cannot be bought outside the bundle.
  v_rejected := false;
  begin
    perform public.clutch_acheter_cosmetique_v1('kc-banner');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Karmine Corp member was individually purchasable';
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
      'kc-blue-wall',
      'kc-blue-wall'
    );
  exception when sqlstate '23514' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Karmine Corp ledger accepted an invalid pack price';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_acheter_pack_cosmetique_v1('kc-blue-wall');
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
         and m.pack_id = 'kc-blue-wall'
     )
     or exists (
       select 1
       from public.volts_mouvements m
       where m.user_id = v_poor_user
         and m.origine = 'achat_pack'
     )
  then
    raise exception 'Insufficient-balance Karmine Corp purchase was not atomic';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_equiper_pack_cosmetique_v1('kc-blue-wall');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;

  if not v_rejected
     or exists (
       select 1 from public.equipement e where e.user_id = v_poor_user
     )
  then
    raise exception 'Unowned Karmine Corp pack was equipable';
  end if;

  if exists (
    select 1 from public.participations p where p.user_id in (v_user, v_poor_user)
  ) or exists (
    select 1 from public.pronostics_classes p where p.user_id in (v_user, v_poor_user)
  ) then
    raise exception 'Karmine Corp pack operations crossed into competitive state';
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
    raise exception 'Karmine Corp pack grants are too broad or too narrow';
  end if;

  raise notice 'karmine_corp_team_pack_v1_ok';
end;
$$;

-- The authenticated Data API role sees published pack contents but never
-- another user's permanent entitlement.
set local role authenticated;
do $$
begin
  if (
    select count(*)
    from public.packs_cosmetiques
    where id = 'kc-blue-wall'
      and prix_volts = 1200
  ) <> 1
     or (
    select count(*)
    from public.pack_cosmetique_membres
    where pack_id = 'kc-blue-wall'
  ) <> 12
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques
  ) <> 0
     or jsonb_array_length(
       public.clutch_pack_cosmetique_v1('kc-blue-wall') -> 'objets'
     ) <> 12
  then
    raise exception 'Karmine Corp RLS did not expose content and hide ownership';
  end if;
end;
$$;
reset role;

rollback;
