-- Runtime regression test for Lot 1.4 match-result reliability.
--
-- The whole fixture is transactional and leaves no user, season, match, Elo or
-- audit data behind. Run after migrations and seed data with:
--   supabase db query --local --file supabase/tests/match_result_reliability.sql

begin;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_suffix text := txid_current()::text || '-' || replace(v_admin::text, '-', '');
  v_saison_id text;
  v_match_id text;
  v_invalid_match_id text;
  v_ops_match_id text;
  v_event_id text;
  v_jeu text;
  v_equipes text[];
  v_payload jsonb;
  v_prediction public.pronostics_classes%rowtype;
  v_classement public.classements_frags%rowtype;
  v_delta_gagne integer;
  v_delta_perdu integer;
  v_elo_apres_reglement integer;
  v_report_le timestamptz := date_trunc('second', now() + interval '4 hours');
  v_rejete boolean;
  v_audit_id bigint;
  v_definition text;
begin
  v_saison_id := 'lot14-test-saison-' || v_suffix;
  v_match_id := 'lot14-test-resultat-' || v_suffix;
  v_invalid_match_id := 'lot14-test-invalide-' || v_suffix;
  v_ops_match_id := 'lot14-test-operations-' || v_suffix;

  -- A real auth fixture makes auth.uid() and the admin gate behave exactly as
  -- they do through the Data API. The outer rollback removes it afterwards.
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
    v_admin,
    'authenticated',
    'authenticated',
    'lot14-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'lot14-' || left(v_suffix, 18)),
    now(),
    now()
  );

  update public.profils set est_admin = true where id = v_admin;
  if not found then
    raise exception 'Lot 1.4 test fixture profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );

  if auth.uid() is distinct from v_admin then
    raise exception 'Lot 1.4 test JWT fixture is invalid';
  end if;

  select ev.id, ev.jeu
  into v_event_id, v_jeu
  from public.evenements ev
  where (
    select count(*) from public.equipes e where e.jeu = ev.jeu
  ) >= 2
  order by ev.id
  limit 1;

  select array_agg(x.id order by x.id)
  into v_equipes
  from (
    select e.id
    from public.equipes e
    where e.jeu = v_jeu
    order by e.id
    limit 2
  ) x;

  if v_event_id is null or coalesce(array_length(v_equipes, 1), 0) <> 2 then
    raise exception 'Lot 1.4 test requires one event and two teams for the same game';
  end if;

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (
    v_saison_id,
    'Lot 1.4 — test transactionnel',
    now() - interval '1 day',
    now() + interval '1 day',
    1000
  );

  insert into public.matchs (
    id,
    event_id,
    saison_id,
    jeu,
    equipe_a_id,
    equipe_b_id,
    format,
    debut,
    statut
  ) values
    (
      v_match_id,
      v_event_id,
      v_saison_id,
      v_jeu,
      v_equipes[1],
      v_equipes[2],
      3,
      now() - interval '5 minutes',
      'en_cours'
    ),
    (
      v_invalid_match_id,
      v_event_id,
      v_saison_id,
      v_jeu,
      v_equipes[1],
      v_equipes[2],
      3,
      now() - interval '5 minutes',
      'en_cours'
    ),
    (
      v_ops_match_id,
      v_event_id,
      v_saison_id,
      v_jeu,
      v_equipes[1],
      v_equipes[2],
      3,
      now() + interval '2 hours',
      'a_venir'
    );

  insert into public.pronostics_classes (
    user_id,
    match_id,
    saison_id,
    choix,
    proba_figee,
    proba_scoring,
    k_frags
  ) values (
    v_admin,
    v_match_id,
    v_saison_id,
    'a',
    0.5,
    0.5,
    40
  );

  v_delta_gagne := public.clutch_delta_frags_conviction(0.5, true, 40, 'normal');
  v_delta_perdu := public.clutch_delta_frags_conviction(0.5, false, 40, 'normal');

  -- Initial resolution: provenance is mandatory and one prediction is settled.
  select public.clutch_admin_regler_match_v1(
    v_match_id,
    2,
    1,
    'test_harness',
    'initial:' || v_suffix,
    'Test automatisé',
    now() - interval '1 minute'
  ) into v_payload;

  if coalesce((v_payload ->> 'rejoue')::boolean, true)
     or (v_payload ->> 'revision')::integer <> 1
  then
    raise exception 'Initial result was not applied exactly once: %', v_payload;
  end if;

  select * into strict v_prediction
  from public.pronostics_classes p
  where p.user_id = v_admin and p.match_id = v_match_id;

  if v_prediction.statut <> 'gagne'
     or v_prediction.delta_frags <> v_delta_gagne
     or v_prediction.frags_avant <> public.clutch_frags_initial()
     or v_prediction.frags_apres <> public.clutch_frags_initial() + v_delta_gagne
     or v_prediction.revele_le is not null
  then
    raise exception 'Initial prediction settlement is inconsistent: %', to_jsonb(v_prediction);
  end if;

  select * into strict v_classement
  from public.classements_frags c
  where c.user_id = v_admin and c.saison_id = v_saison_id;

  if v_classement.frags <> public.clutch_frags_initial() + v_delta_gagne
     or v_classement.pronostics_regles <> 1
     or v_classement.pronostics_gagnes <> 1
  then
    raise exception 'Initial Frags settlement is inconsistent: %', to_jsonb(v_classement);
  end if;

  select e.elo into strict v_elo_apres_reglement
  from public.equipes e where e.id = v_equipes[1];

  if (
    select count(*) from private.clutch_match_operations_audit a
    where a.match_id = v_match_id and a.action = 'resultat_initial'
  ) <> 1 then
    raise exception 'Initial result audit is missing or duplicated';
  end if;

  -- Exact replay must not settle, audit or update Elo a second time.
  select public.clutch_admin_regler_match_v1(
    v_match_id,
    2,
    1,
    'test_harness',
    'initial:' || v_suffix,
    'Test automatisé',
    now()
  ) into v_payload;

  if not coalesce((v_payload ->> 'rejoue')::boolean, false) then
    raise exception 'Exact initial-result replay was not idempotent: %', v_payload;
  end if;

  if (select e.elo from public.equipes e where e.id = v_equipes[1]) <> v_elo_apres_reglement
     or (
       select count(*) from private.clutch_match_operations_audit a
       where a.match_id = v_match_id and a.action = 'resultat_initial'
     ) <> 1
     or (
       select c.pronostics_regles from public.classements_frags c
       where c.user_id = v_admin and c.saison_id = v_saison_id
     ) <> 1
  then
    raise exception 'Initial-result replay produced a side effect';
  end if;

  -- A BO result can never end in a tie, and the rejected request is side-effect free.
  v_rejete := false;
  begin
    perform public.clutch_admin_regler_match_v1(
      v_invalid_match_id,
      1,
      1,
      'test_harness',
      'tie:' || v_suffix,
      'Test automatisé',
      now()
    );
  exception when sqlstate '22023' then
    v_rejete := true;
  end;

  if not v_rejete
     or (select m.statut from public.matchs m where m.id = v_invalid_match_id) <> 'en_cours'
     or exists (
       select 1 from private.clutch_match_operations_audit a
       where a.match_id = v_invalid_match_id
     )
  then
    raise exception 'Invalid tie was not rejected atomically';
  end if;

  -- The same canonical external result cannot be attached to another match.
  v_rejete := false;
  begin
    perform public.clutch_admin_regler_match_v1(
      v_invalid_match_id,
      2,
      0,
      'test_harness',
      'initial:' || v_suffix,
      'Test automatisé',
      now()
    );
  exception when unique_violation then
    v_rejete := true;
  end;

  if not v_rejete
     or (select m.statut from public.matchs m where m.id = v_invalid_match_id) <> 'en_cours'
  then
    raise exception 'Duplicate external result reference was not rejected atomically';
  end if;

  -- A correction flips the verdict, rebuilds the isolated season and creates
  -- revision 2 without changing the number of settled predictions.
  select public.clutch_admin_corriger_resultat_v1(
    v_match_id,
    1,
    2,
    'test_harness',
    'correction:' || v_suffix,
    'Correction officielle du test',
    'Test automatisé',
    now()
  ) into v_payload;

  if coalesce((v_payload ->> 'rejoue')::boolean, true)
     or (v_payload ->> 'revision')::integer <> 2
  then
    raise exception 'Corrected result was not applied exactly once: %', v_payload;
  end if;

  select * into strict v_prediction
  from public.pronostics_classes p
  where p.user_id = v_admin and p.match_id = v_match_id;

  select * into strict v_classement
  from public.classements_frags c
  where c.user_id = v_admin and c.saison_id = v_saison_id;

  if v_prediction.statut <> 'perdu'
     or v_prediction.delta_frags <> v_delta_perdu
     or v_prediction.frags_avant <> public.clutch_frags_initial()
     or v_prediction.frags_apres <> public.clutch_frags_initial() + v_delta_perdu
     or v_prediction.revele_le is not null
     or v_classement.frags <> public.clutch_frags_initial() + v_delta_perdu
     or v_classement.pronostics_regles <> 1
     or v_classement.pronostics_gagnes <> 0
  then
    raise exception 'Correction did not rebuild prediction and Frags state';
  end if;

  if not exists (
    select 1
    from public.matchs m
    where m.id = v_match_id
      and m.score_a = 1
      and m.score_b = 2
      and m.resultat_source = 'test_harness'
      and m.resultat_identifiant_externe = 'correction:' || v_suffix
      and m.resultat_revision = 2
      and m.resultat_motif_correction = 'Correction officielle du test'
  ) then
    raise exception 'Corrected canonical result provenance is inconsistent';
  end if;

  if (
    select count(*) from private.clutch_match_operations_audit a
    where a.match_id = v_match_id
      and a.action in ('resultat_initial', 'correction_resultat')
  ) <> 2 then
    raise exception 'Result correction audit is missing or duplicated';
  end if;

  -- Correction replay is idempotent too.
  select public.clutch_admin_corriger_resultat_v1(
    v_match_id,
    1,
    2,
    'test_harness',
    'correction:' || v_suffix,
    'Correction officielle du test',
    'Test automatisé',
    now()
  ) into v_payload;

  if not coalesce((v_payload ->> 'rejoue')::boolean, false)
     or (select m.resultat_revision from public.matchs m where m.id = v_match_id) <> 2
     or (
       select count(*) from private.clutch_match_operations_audit a
       where a.match_id = v_match_id
         and a.action in ('resultat_initial', 'correction_resultat')
     ) <> 2
  then
    raise exception 'Correction replay produced a side effect';
  end if;

  select public.clutch_resultat_match_v1(v_match_id) into v_payload;
  if v_payload ->> 'identifiant_resultat_externe' <> 'correction:' || v_suffix
     or (v_payload ->> 'revision_resultat')::integer <> 2
     or not coalesce((v_payload ->> 'resultat_corrige')::boolean, false)
  then
    raise exception 'Player result receipt does not expose the correction: %', v_payload;
  end if;

  select public.clutch_call_context_v1(v_match_id) into v_payload;
  if v_payload ->> 'identifiant_resultat_externe' <> 'correction:' || v_suffix
     or (v_payload ->> 'revision_resultat')::integer <> 2
     or not coalesce((v_payload ->> 'resultat_corrige')::boolean, false)
  then
    raise exception 'Match Center does not expose the corrected provenance: %', v_payload;
  end if;

  select public.clutch_admin_historique_match_v1(v_match_id, 20) into v_payload;
  if jsonb_array_length(v_payload -> 'operations') <> 2
     or v_payload #>> '{operations,0,action}' <> 'correction_resultat'
  then
    raise exception 'Admin result history is incomplete or incorrectly ordered: %', v_payload;
  end if;

  -- Direct terminal edits cannot bypass the dedicated correction RPC.
  v_rejete := false;
  begin
    update public.matchs set score_a = 2 where id = v_match_id;
  exception when sqlstate 'P0001' then
    v_rejete := true;
  end;
  if not v_rejete then
    raise exception 'Direct final-result update bypassed the lifecycle guard';
  end if;

  -- Report and cancellation have one immutable audit record each and replay
  -- without duplicating side effects.
  select public.clutch_admin_reporter_match_v1(v_ops_match_id, v_report_le)
  into v_payload;
  if coalesce((v_payload ->> 'rejoue')::boolean, true) then
    raise exception 'Initial report was treated as a replay';
  end if;

  select public.clutch_admin_reporter_match_v1(v_ops_match_id, v_report_le)
  into v_payload;
  if not coalesce((v_payload ->> 'rejoue')::boolean, false) then
    raise exception 'Exact report replay was not idempotent';
  end if;

  select public.annuler_match(v_ops_match_id, 'Indisponibilité officielle de test')
  into v_payload;
  if coalesce((v_payload ->> 'rejoue')::boolean, true) then
    raise exception 'Initial cancellation was treated as a replay';
  end if;

  select public.annuler_match(v_ops_match_id, 'Indisponibilité officielle de test')
  into v_payload;
  if not coalesce((v_payload ->> 'rejoue')::boolean, false) then
    raise exception 'Cancellation replay was not idempotent';
  end if;

  if (
    select count(*) from private.clutch_match_operations_audit a
    where a.match_id = v_ops_match_id and a.action in ('report', 'annulation')
  ) <> 2 then
    raise exception 'Report/cancellation audit is missing or duplicated';
  end if;

  v_rejete := false;
  begin
    update public.matchs
    set motif_annulation = 'Altération directe interdite'
    where id = v_ops_match_id;
  exception when sqlstate 'P0001' then
    v_rejete := true;
  end;
  if not v_rejete then
    raise exception 'Direct cancelled-match update bypassed the lifecycle guard';
  end if;

  -- Audit rows themselves are append-only, including for their owner role.
  select a.id into strict v_audit_id
  from private.clutch_match_operations_audit a
  where a.match_id = v_match_id and a.action = 'correction_resultat';

  v_rejete := false;
  begin
    update private.clutch_match_operations_audit
    set motif = 'Altération interdite'
    where id = v_audit_id;
  exception when sqlstate '55000' then
    v_rejete := true;
  end;
  if not v_rejete then
    raise exception 'Audit row was mutable';
  end if;

  -- Concurrency contract: both settlement paths acquire the same
  -- transaction-level season lock, and team locks use canonical ordering.
  select pg_get_functiondef(
    'public.clutch_admin_regler_match_v1(text,integer,integer,text,text,text,timestamp with time zone)'::regprocedure
  ) into v_definition;
  if position('clutch_verrouiller_saison_resultat_v1' in v_definition) = 0
     or position('order by e.id' in lower(v_definition)) = 0
  then
    raise exception 'Initial settlement lost its season/team lock ordering';
  end if;

  select pg_get_functiondef(
    'public.clutch_admin_corriger_resultat_v1(text,integer,integer,text,text,text,text,timestamp with time zone)'::regprocedure
  ) into v_definition;
  if position('clutch_verrouiller_saison_resultat_v1' in v_definition) = 0
     or position('order by e.id' in lower(v_definition)) = 0
  then
    raise exception 'Correction lost its season/team lock ordering';
  end if;

  -- The RPCs are reachable by authenticated clients but remain admin-only.
  update public.profils set est_admin = false where id = v_admin;
  v_rejete := false;
  begin
    perform public.clutch_admin_historique_match_v1(v_match_id, 20);
  exception when sqlstate '42501' then
    v_rejete := true;
  end;
  if not v_rejete then
    raise exception 'A non-admin account read the private match audit';
  end if;

  raise notice 'match_result_reliability_ok';
end;
$$;

rollback;
