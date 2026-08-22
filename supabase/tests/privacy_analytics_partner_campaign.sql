-- Runtime regression test for monetization phases 4.1 / 4.2.
-- It proves first-party analytics minimization, Nova Week participation-only
-- rewards, idempotency and aggregate-only partner reporting. All writes roll
-- back, including the temporary campaign window and fixtures.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_email text := 'nova-' || v_suffix || '@example.invalid';
  v_pseudo text := 'nova-' || left(v_suffix, 15);
  v_game text;
  v_teams text[];
  v_event_id text := 'nova-event-' || v_suffix;
  v_season_id text := 'nova-season-' || v_suffix;
  v_matches text[] := array[
    'nova-match-1-' || v_suffix,
    'nova-match-2-' || v_suffix,
    'nova-match-3-' || v_suffix
  ];
  v_contract jsonb := public.clutch_contrat_analytics_v1();
  v_first_event jsonb;
  v_repeat_event jsonb;
  v_join jsonb;
  v_state jsonb;
  v_claim jsonb;
  v_report jsonb;
  v_task jsonb;
  v_volts_before integer := 0;
  v_rankings_before integer := 0;
  v_rejected boolean := false;
begin
  if coalesce((v_contract ->> 'data_api_brute')::boolean, true)
     or coalesce((v_contract ->> 'identifiant_publicitaire')::boolean, true)
     or coalesce((v_contract ->> 'identifiant_appareil')::boolean, true)
     or coalesce((v_contract ->> 'metadata_libre')::boolean, true)
     or v_contract ->> 'partage_partenaire' <> 'agregats_uniquement'
     or coalesce((v_contract #>> '{declaration_store,liee_identite_interne}')::boolean, false) is false
     or coalesce((v_contract #>> '{declaration_store,tracking_inter_apps}')::boolean, true)
  then
    raise exception 'Analytics privacy contract is inconsistent: %', v_contract;
  end if;

  select game.jeu
  into v_game
  from (
    select equipe.jeu
    from public.equipes equipe
    group by equipe.jeu
    having count(*) >= 2
    order by equipe.jeu
    limit 1
  ) game;

  select array_agg(equipe.id order by equipe.id)
  into v_teams
  from (
    select id
    from public.equipes
    where jeu = v_game
    order by id
    limit 2
  ) equipe;

  if v_game is null or cardinality(coalesce(v_teams, '{}'::text[])) <> 2 then
    raise exception 'Nova test requires two teams from the same game';
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
    v_email,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', v_pseudo),
    now(),
    now()
  );

  update public.profils
  set jeux_suivis = array[v_game],
      equipe_favorite_id = v_teams[1]
  where id = v_user;

  update public.campagnes_partenaire
  set debut = now() - interval '1 day',
      fin = now() + interval '7 days',
      statut = 'publie'
  where key = 'nova-week';

  insert into public.evenements (id, jeu, nom, tier)
  values (v_event_id, v_game, 'Nova regression event', 'A');

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (
    v_season_id,
    'Nova regression season',
    now() - interval '1 day',
    now() + interval '10 days',
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
    (v_matches[1], v_event_id, v_season_id, v_game, v_teams[1], v_teams[2], 3, now() + interval '1 day', 'a_venir'),
    (v_matches[2], v_event_id, v_season_id, v_game, v_teams[1], v_teams[2], 3, now() + interval '2 days', 'a_venir'),
    (v_matches[3], v_event_id, v_season_id, v_game, v_teams[1], v_teams[2], 3, now() + interval '3 days', 'a_venir');

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select public.clutch_enregistrer_evenement_analytics_v1(
    'collection_affichee',
    null,
    'nova-week',
    'campaign:nova-week:test-impression'
  ) into v_first_event;
  select public.clutch_enregistrer_evenement_analytics_v1(
    'collection_affichee',
    null,
    'nova-week',
    'campaign:nova-week:test-impression'
  ) into v_repeat_event;

  if not (v_first_event ->> 'nouveau')::boolean
     or (v_repeat_event ->> 'nouveau')::boolean
     or (
       select count(*)
       from private.analytics_evenements evenement
       where evenement.user_id = v_user
         and evenement.type_evenement = 'collection_affichee'
         and evenement.campagne_key = 'nova-week'
     ) <> 1
  then
    raise exception 'Client analytics idempotency failed: first=%, repeat=%', v_first_event, v_repeat_event;
  end if;

  begin
    perform public.clutch_enregistrer_evenement_analytics_v1(
      'objet_obtenu',
      'nova-cadre',
      'nova-week',
      'forbidden-client-acquisition'
    );
  exception when sqlstate '22023' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Client was able to forge an authoritative acquisition event';
  end if;

  select coalesce(sum(mouvement.montant), 0)::integer
  into v_volts_before
  from public.volts_mouvements mouvement
  where mouvement.user_id = v_user;

  select count(*)::integer
  into v_rankings_before
  from public.classements_frags classement
  where classement.user_id = v_user;

  select public.clutch_rejoindre_campagne_partenaire_v1('nova-week')
  into v_join;

  if not (v_join ->> 'nouvelle_participation')::boolean
     or not (v_join ->> 'rejointe')::boolean
     or (v_join ->> 'regle_recompense') <> 'participation_uniquement'
     or coalesce((v_join ->> 'justesse_calls_recompensee')::boolean, true)
  then
    raise exception 'Nova join contract is inconsistent: %', v_join;
  end if;

  perform public.clutch_suivre_match_campagne_v1('nova-week', v_matches[1]);
  perform public.clutch_suivre_match_campagne_v1('nova-week', v_matches[2]);
  perform public.clutch_suivre_match_campagne_v1('nova-week', v_matches[3]);

  insert into public.pronostics_classes (
    user_id,
    match_id,
    saison_id,
    choix,
    proba_figee,
    proba_scoring,
    k_frags
  ) values
    (v_user, v_matches[1], v_season_id, 'a', 0.50, 0.50, 40),
    (v_user, v_matches[2], v_season_id, 'b', 0.50, 0.50, 40),
    (v_user, v_matches[3], v_season_id, 'a', 0.50, 0.50, 40);

  select public.clutch_participer_mission_faction_campagne_v1('nova-week')
  into v_state;

  if not (v_state ->> 'terminee')::boolean
     or (v_state #>> '{progression,actuelle}')::integer <> 7
     or (v_state #>> '{progression,objectif}')::integer <> 7
  then
    raise exception 'Participation-only progression is incomplete: %', v_state;
  end if;

  for v_task in select value from jsonb_array_elements(v_state -> 'taches')
  loop
    if not (v_task ->> 'terminee')::boolean
       or (v_task ->> 'progression')::integer <> (v_task ->> 'objectif')::integer
    then
      raise exception 'Nova task is incomplete: %', v_task;
    end if;
  end loop;

  select public.clutch_reclamer_recompenses_campagne_v1('nova-week')
  into v_claim;
  perform public.clutch_reclamer_recompenses_campagne_v1('nova-week');

  if not (v_claim ->> 'recompense_reclamee')::boolean
     or (
       select count(*)
       from public.inventaire inventaire
       join public.objets_catalogue objet on objet.id = inventaire.objet_id
       where inventaire.user_id = v_user
         and objet.campagne_key = 'nova-week'
     ) <> 3
     or (
       select count(*)
       from private.analytics_evenements evenement
       where evenement.user_id = v_user
         and evenement.campagne_key = 'nova-week'
         and evenement.type_evenement = 'objet_obtenu'
     ) <> 3
     or (
       select count(*)
       from private.analytics_evenements evenement
       where evenement.user_id = v_user
         and evenement.campagne_key = 'nova-week'
         and evenement.type_evenement = 'tache_terminee'
     ) <> 3
     or (
       select count(*)
       from private.analytics_evenements evenement
       where evenement.user_id = v_user
         and evenement.campagne_key = 'nova-week'
         and evenement.type_evenement = 'recompense_reclamee'
     ) <> 1
  then
    raise exception 'Nova reward claim is not atomic or idempotent: %', v_claim;
  end if;

  if (
       select coalesce(sum(mouvement.montant), 0)::integer
       from public.volts_mouvements mouvement
       where mouvement.user_id = v_user
     ) <> v_volts_before
     or (
       select count(*)::integer
       from public.classements_frags classement
       where classement.user_id = v_user
     ) <> v_rankings_before
  then
    raise exception 'Nova crossed the Volts or competitive boundary';
  end if;

  v_rejected := false;
  begin
    perform public.clutch_rapport_campagne_partenaire_v1('nova-week');
  exception when sqlstate '42501' then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'A non-admin account opened the internal partner report';
  end if;

  update public.profils set est_admin = true where id = v_user;
  select public.clutch_rapport_campagne_partenaire_v1('nova-week')
  into v_report;

  if coalesce((v_report #>> '{confidentialite,donnees_personnelles}')::boolean, true)
     or coalesce((v_report #>> '{confidentialite,identifiants_utilisateur}')::boolean, true)
     or not coalesce((v_report #>> '{confidentialite,agregats_uniquement}')::boolean, false)
     or not coalesce((v_report #>> '{confidentialite,cohortes_faibles_masquees}')::boolean, false)
     or v_report #>> '{demonstration,source}' <> 'donnees_synthetiques'
     or (v_report #>> '{export_partenaire,publiable}')::boolean
        is distinct from ((v_report #>> '{live,utilisateurs_eligibles}')::integer >= 5)
     or position(lower(v_user::text) in lower(v_report::text)) > 0
     or position(lower(v_email) in lower(v_report::text)) > 0
     or position(lower(v_pseudo) in lower(v_report::text)) > 0
  then
    raise exception 'Partner report leaks identity or mislabels the demo: %', v_report;
  end if;

  if has_table_privilege('authenticated', 'private.analytics_evenements', 'SELECT')
     or has_table_privilege('authenticated', 'private.campagne_participations', 'SELECT')
     or has_table_privilege('authenticated', 'public.campagnes_partenaire', 'SELECT')
     or has_table_privilege('authenticated', 'public.campagne_taches_partenaire', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_enregistrer_evenement_analytics_v1(text,text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_campagne_partenaire_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_enregistrer_evenement_analytics_v1(text,text,text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_reclamer_recompenses_campagne_v1(text)', 'EXECUTE')
  then
    raise exception 'Analytics or campaign API privileges are inconsistent';
  end if;

  raise notice 'privacy_analytics_partner_campaign_ok';
end;
$$;

rollback;
