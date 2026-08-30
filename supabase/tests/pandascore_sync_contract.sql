begin;

do $test$
declare
  v_payload jsonb;
  v_summary jsonb;
  v_match public.matchs%rowtype;
  v_operations integer;
  v_distribution_count integer;
  v_distribution_total numeric;
begin
  if has_function_privilege(
    'anon',
    'public.clutch_pandascore_importer_lot_v1(jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.clutch_pandascore_importer_lot_v1(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'The PandaScore importer is exposed to a client role';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.clutch_pandascore_importer_lot_v1(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'The PandaScore importer is unavailable to service_role';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'service_role')::text,
    true
  );

  select count(*)::integer, sum(d.proba)
  into v_distribution_count, v_distribution_total
  from public.clutch_distribution(0.5, 7) d;
  if v_distribution_count <> 8
     or abs(v_distribution_total - 1) > 0.000000001 then
    raise exception 'Invalid BO7 score distribution: % rows, % total',
      v_distribution_count,
      v_distribution_total;
  end if;

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (
    'test-pandascore-sync',
    'Test PandaScore',
    now() - interval '1 day',
    now() + interval '2 days',
    1000
  );

  v_payload := jsonb_build_array(jsonb_build_object(
    'external_match_id', '990000001',
    'game', 'rocket_league',
    'status', 'not_started',
    'begin_at', now() + interval '1 hour',
    'format', 7,
    'event_external_id', 'tournament:990000010',
    'event_name', 'RLCS · Test Major',
    'team_a_external_id', '990000101',
    'team_a_name', 'Karmine Corp Test',
    'team_a_tag', 'KCT',
    'team_a_logo', 'https://example.test/kc.png',
    'team_b_external_id', '990000202',
    'team_b_name', 'Vitality Test',
    'team_b_tag', 'VIT',
    'team_b_logo', 'https://example.test/vit.png',
    'score_a', null,
    'score_b', null,
    'received_at', now()
  ));

  v_summary := public.clutch_pandascore_importer_lot_v1(v_payload);
  if (v_summary ->> 'crees')::integer <> 1 then
    raise exception 'Upcoming PandaScore fixture was not created: %', v_summary;
  end if;

  select * into v_match
  from public.matchs
  where id = 'ps-match-990000001';
  if v_match.statut <> 'a_venir'
     or v_match.format <> 7
     or v_match.jeu <> 'rocket_league' then
    raise exception 'Unexpected imported fixture: %', to_jsonb(v_match);
  end if;

  v_payload := jsonb_set(v_payload, '{0,status}', '"running"'::jsonb);
  v_summary := public.clutch_pandascore_importer_lot_v1(v_payload);
  if (v_summary ->> 'demarres')::integer <> 1 then
    raise exception 'PandaScore fixture was not started: %', v_summary;
  end if;

  select * into v_match
  from public.matchs
  where id = 'ps-match-990000001';
  if v_match.statut <> 'en_cours' then
    raise exception 'Imported match did not enter running state';
  end if;

  v_payload := jsonb_set(v_payload, '{0,status}', '"finished"'::jsonb);
  v_payload := jsonb_set(v_payload, '{0,score_a}', '4'::jsonb);
  v_payload := jsonb_set(v_payload, '{0,score_b}', '2'::jsonb);
  v_summary := public.clutch_pandascore_importer_lot_v1(v_payload);
  if (v_summary ->> 'regles')::integer <> 1 then
    raise exception 'PandaScore result was not settled: %', v_summary;
  end if;

  select * into v_match
  from public.matchs
  where id = 'ps-match-990000001';
  if v_match.statut <> 'termine'
     or v_match.score_a <> 4
     or v_match.score_b <> 2
     or v_match.resultat_source <> 'pandascore'
     or v_match.resultat_identifiant_externe <> 'match:990000001'
     or v_match.resultat_revision <> 1 then
    raise exception 'Unexpected PandaScore settlement: %', to_jsonb(v_match);
  end if;

  v_summary := public.clutch_pandascore_importer_lot_v1(v_payload);
  if (v_summary ->> 'inchanges')::integer <> 1 then
    raise exception 'PandaScore replay is not idempotent: %', v_summary;
  end if;

  v_payload := jsonb_set(v_payload, '{0,score_a}', '2'::jsonb);
  v_payload := jsonb_set(v_payload, '{0,score_b}', '4'::jsonb);
  v_summary := public.clutch_pandascore_importer_lot_v1(v_payload);
  if (v_summary ->> 'corriges')::integer <> 1 then
    raise exception 'PandaScore correction was not applied: %', v_summary;
  end if;

  select * into v_match
  from public.matchs
  where id = 'ps-match-990000001';
  if v_match.score_a <> 2
     or v_match.score_b <> 4
     or v_match.resultat_revision <> 2 then
    raise exception 'Unexpected corrected PandaScore result: %', to_jsonb(v_match);
  end if;

  select count(*)::integer into v_operations
  from private.clutch_match_operations_audit a
  where a.match_id = 'ps-match-990000001'
    and a.action in ('demarrage', 'resultat_initial', 'correction_resultat');
  if v_operations <> 3 then
    raise exception 'PandaScore lifecycle audit is incomplete: % operations', v_operations;
  end if;
end;
$test$;

rollback;
