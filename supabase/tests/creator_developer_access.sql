-- Runtime regression for the private creator/developer capability model.
-- All fixture writes are rolled back.

begin;

do $$
declare
  v_user constant uuid := '00000000-0000-4000-8000-0000000000d1'::uuid;
  v_suffix constant text := 'creatoraccess';
  v_catalog_count integer;
  v_balance_before bigint;
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
    'creator-access-' || v_suffix || '@example.invalid',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'creator-' || v_suffix),
    pg_catalog.now(),
    pg_catalog.now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Developer test profile was not created';
  end if;

  select count(*)::integer into v_catalog_count from public.objets_catalogue;

  insert into private.comptes_developpeur (
    user_id,
    est_createur,
    volts_illimites,
    contenu_debloque
  ) values (v_user, true, true, true);

  perform private.clutch_synchroniser_compte_developpeur_v1(v_user);

  if not exists (
    select 1
    from public.profils p
    where p.id = v_user
      and p.est_admin
      and p.est_fondateur
  ) then
    raise exception 'Developer provisioning did not grant creator/admin status';
  end if;

  if (
    select count(*)
    from public.inventaire i
    where i.user_id = v_user
  ) <> v_catalog_count then
    raise exception 'Developer provisioning did not unlock the complete catalog';
  end if;

  select coalesce(sum(m.montant), 0)::bigint
  into v_balance_before
  from public.volts_mouvements m
  where m.user_id = v_user;

  if v_balance_before < 1000000000 then
    raise exception 'Developer Volt reserve is missing: %', v_balance_before;
  end if;

  perform private.clutch_synchroniser_compte_developpeur_v1(v_user);
  if (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'ajustement'
      and m.reference = 'developer-reserve-v1'
  ) <> 1 then
    raise exception 'Developer reserve is not idempotent';
  end if;

  if exists (
    select 1 from public.pronostics_classes p where p.user_id = v_user
  ) or exists (
    select 1 from public.participations p where p.user_id = v_user
  ) then
    raise exception 'Developer provisioning crossed into competitive state';
  end if;
end;
$$;

do $$
begin
  if has_table_privilege('authenticated', 'private.comptes_developpeur', 'SELECT')
     or has_table_privilege('authenticated', 'private.comptes_developpeur', 'INSERT')
     or has_function_privilege(
       'anon',
       'public.clutch_mon_acces_developpeur_v1()',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.clutch_mon_acces_developpeur_v1()',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'private.clutch_synchroniser_compte_developpeur_v1(uuid)',
       'EXECUTE'
     ) then
    raise exception 'Developer capability privileges are not least privilege';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_access record;
begin
  select * into v_access from public.clutch_mon_acces_developpeur_v1();
  if not v_access.est_developpeur
     or not v_access.est_createur
     or not v_access.volts_illimites
     or not v_access.contenu_debloque then
    raise exception 'Authenticated developer self-read is incomplete';
  end if;
end;
$$;

reset role;
rollback;
