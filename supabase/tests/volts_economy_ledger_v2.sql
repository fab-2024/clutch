-- Runtime regression test for monetization phase 3.1 / 3.2.
-- It proves one-time onboarding credit, normalized and immutable ledger rows,
-- safe cosmetic spending, idempotency, owner-only journal access and the hard
-- separation between Volts and competitive state. All writes are rolled back.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_team_id text;
  v_game text;
  v_first jsonb;
  v_repeat jsonb;
  v_purchase jsonb;
  v_journal jsonb;
  v_simulation jsonb := public.clutch_simuler_economie_volts_v1();
  v_rejected boolean := false;
begin
  select e.id, e.jeu
  into v_team_id, v_game
  from public.equipes e
  where e.jeu = any(array['lol', 'cs2', 'valorant']::text[])
  order by e.id
  limit 1;

  if v_team_id is null then
    raise exception 'Volt economy test requires one seeded team';
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
    'volts-ledger-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'volts-' || left(v_suffix, 15)),
    now(),
    now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Volt economy test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_terminer_onboarding_v1(array[v_game], v_team_id)
  into v_first;
  select public.clutch_terminer_onboarding_v1(array[v_game], v_team_id)
  into v_repeat;

  if (v_first ->> 'recompense_volts')::integer <> 300
     or (v_first ->> 'deja_reclamee')::boolean
     or (v_first ->> 'solde')::integer <> 300
     or (v_repeat ->> 'recompense_volts')::integer <> 0
     or not (v_repeat ->> 'deja_reclamee')::boolean
     or (
       select count(*)
       from public.volts_mouvements m
       where m.user_id = v_user
         and m.origine = 'onboarding'
     ) <> 1
  then
    raise exception 'Onboarding Volt reward is not idempotent: first=%, repeat=%', v_first, v_repeat;
  end if;

  if not public.clutch_crediter_volts(v_user, 100, 'mission', 'ledger-test-mission')
     or public.clutch_crediter_volts(v_user, 100, 'mission', 'ledger-test-mission')
  then
    raise exception 'Mission Volt reward is not idempotent';
  end if;

  select public.clutch_acheter_cosmetique_v1('titre-profil-2')
  into v_purchase;

  if not (v_purchase ->> 'achete')::boolean
     or (v_purchase ->> 'prix')::integer <> 250
     or (v_purchase ->> 'solde')::integer <> 150
  then
    raise exception 'Cosmetic debit is inconsistent: %', v_purchase;
  end if;

  if not exists (
    select 1
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'onboarding'
      and m.source_economique = 'onboarding'
      and m.cle_idempotence = 'onboarding:completion-v1'
      and m.solde_apres = 300
      and m.objet_id is null
  ) or not exists (
    select 1
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'mission'
      and m.source_economique = 'mission'
      and m.cle_idempotence = 'mission:ledger-test-mission'
      and m.solde_apres = 400
  ) or not exists (
    select 1
    from public.volts_mouvements m
    where m.user_id = v_user
      and m.origine = 'achat'
      and m.source_economique = 'achat_cosmetique'
      and m.objet_id = 'titre-profil-2'
      and m.cle_idempotence = 'achat:titre-profil-2'
      and m.solde_apres = 150
  ) then
    raise exception 'Volt ledger enrichment is incomplete';
  end if;

  select public.clutch_journal_volts_v1(20, null)
  into v_journal;

  if (v_journal ->> 'solde')::integer <> 150
     or jsonb_array_length(v_journal -> 'mouvements') <> 3
     or (v_journal ->> 'has_more')::boolean
     or coalesce((v_journal #>> '{integrite,conversion_volts_vers_frags}')::boolean, true)
     or coalesce((v_journal #>> '{integrite,impact_classement}')::boolean, true)
     or not exists (
       select 1
       from jsonb_array_elements(v_journal -> 'mouvements') movement(value)
       where movement.value #>> '{objet,id}' = 'titre-profil-2'
         and movement.value ->> 'cle_idempotence' = 'achat:titre-profil-2'
         and (movement.value ->> 'solde_apres')::integer = 150
     )
  then
    raise exception 'Volt journal RPC is incomplete: %', v_journal;
  end if;

  begin
    update public.volts_mouvements
    set montant = montant + 1
    where user_id = v_user
      and origine = 'mission';
  exception when sqlstate '55000' then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Volt ledger accepted an in-place mutation';
  end if;

  v_rejected := false;
  begin
    insert into public.volts_mouvements (user_id, montant, origine, reference)
    values (v_user, -1000, 'ajustement', 'forbidden-overdraft');
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Volt ledger accepted a negative resulting balance';
  end if;

  if exists (
    select 1 from public.pronostics_classes p where p.user_id = v_user
  ) or exists (
    select 1 from public.participations p where p.user_id = v_user
  ) then
    raise exception 'Volt operations crossed into competitive state';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_simulation -> 'profils') profil(value)
    where (profil.value ->> 'jours_premier_objet')::integer > 21
       or (profil.value ->> 'ratio_revenu_sur_depense_cible')::numeric > 0.80
       or not (profil.value ->> 'inflation_sous_controle')::boolean
  ) then
    raise exception 'Volt economy simulation exceeds its guardrails: %', v_simulation;
  end if;

  if has_function_privilege('anon', 'public.clutch_journal_volts_v1(integer,timestamp with time zone)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_journal_volts_v1(integer,timestamp with time zone)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_terminer_onboarding_v1(text[],text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.clutch_crediter_volts(uuid,integer,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.clutch_acheter_objet(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_simuler_economie_volts_v1()', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.volts_mouvements', 'INSERT')
     or has_table_privilege('service_role', 'public.volts_mouvements', 'UPDATE')
     or has_table_privilege('service_role', 'public.volts_mouvements', 'DELETE')
  then
    raise exception 'Volt economy API privileges are inconsistent';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'clutch_journal_volts_v1',
        'clutch_simuler_economie_volts_v1'
      )
      and p.prosecdef
  ) then
    raise exception 'Volt read RPC unexpectedly uses elevated rights';
  end if;

  raise notice 'volts_economy_ledger_v2_ok';
end;
$$;

-- Exercise the read RPCs with the actual Data API role after the richer
-- owner-level assertions above. RLS must still expose only auth.uid().
set local role authenticated;
select public.clutch_journal_volts_v1(20, null);
select public.clutch_simuler_economie_volts_v1();
reset role;

rollback;
