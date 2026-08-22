-- Runtime regression contract for Block B. The transaction is rolled back so
-- no account, relationship, mission contribution or analytics event survives.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_target uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_target_suffix text := replace(v_target::text, '-', '');
  v_user_pseudo text := 'block-b-' || left(v_suffix, 12);
  v_target_pseudo text := 'block-b-' || left(v_target_suffix, 12);
  v_game text;
  v_teams text[];
  v_event text := 'block-b-event-' || v_suffix;
  v_season text := 'block-b-season-' || v_suffix;
  v_match text := 'block-b-match-' || v_suffix;
  v_preferences jsonb;
  v_event_receipt jsonb;
  v_repeat_receipt jsonb;
  v_rank_before integer;
  v_rank_after integer;
  v_dashboard jsonb;
  v_mission jsonb;
  v_hub jsonb;
  v_report jsonb;
  v_repeat_report jsonb;
  v_block_guarded boolean := false;
begin
  select source.jeu
  into v_game
  from (
    select e.jeu
    from public.equipes e
    group by e.jeu
    having count(*) >= 2
    order by e.jeu
    limit 1
  ) source;

  select array_agg(source.id order by source.id)
  into v_teams
  from (
    select e.id
    from public.equipes e
    where e.jeu = v_game
    order by e.id
    limit 2
  ) source;

  if v_game is null or cardinality(coalesce(v_teams, '{}'::text[])) <> 2 then
    raise exception 'Block B test requires two teams from the same game';
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_user, 'authenticated', 'authenticated',
      'block-b-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', v_user_pseudo, 'age_minimum_confirme', true),
      now(), now()
    ),
    (
      v_target, 'authenticated', 'authenticated',
      'block-b-' || v_target_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', v_target_pseudo, 'age_minimum_confirme', true),
      now(), now()
    );

  update public.profils
  set equipe_favorite_id = v_teams[1], jeux_suivis = array[v_game]
  where id in (v_user, v_target);

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (v_season, 'Block B regression', now() - interval '30 minutes', now() + interval '2 days', 1000);

  insert into public.evenements (id, jeu, nom, tier)
  values (v_event, v_game, 'Block B regression event', 'A');

  insert into public.matchs (
    id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut, statut
  ) values (
    v_match, v_event, v_season, v_game, v_teams[1], v_teams[2], 3,
    now() + interval '1 day', 'a_venir'
  );

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  v_preferences := public.clutch_mes_preferences_confidentialite_v1();
  if coalesce((v_preferences ->> 'age_minimum_confirme')::boolean, false) is false
     or coalesce((v_preferences ->> 'analytics_autorise')::boolean, true)
  then
    raise exception 'privacy defaults or 15+ metadata import are inconsistent: %', v_preferences;
  end if;

  v_event_receipt := public.clutch_enregistrer_evenement_analytics_v1(
    'onboarding_commence', null, null, 'block-b:onboarding-start'
  );
  if coalesce((v_event_receipt ->> 'accepte')::boolean, true)
     or v_event_receipt ->> 'raison' <> 'consentement_requis'
  then
    raise exception 'analytics must be rejected before opt-in: %', v_event_receipt;
  end if;

  perform public.clutch_enregistrer_preferences_confidentialite_v1(true, true);
  v_event_receipt := public.clutch_enregistrer_evenement_analytics_v1(
    'onboarding_commence', null, null, 'block-b:onboarding-start'
  );
  v_repeat_receipt := public.clutch_enregistrer_evenement_analytics_v1(
    'onboarding_commence', null, null, 'block-b:onboarding-start'
  );
  if coalesce((v_event_receipt ->> 'nouveau')::boolean, false) is false
     or coalesce((v_repeat_receipt ->> 'nouveau')::boolean, true)
  then
    raise exception 'consented analytics idempotency failed';
  end if;

  select c.frags into v_rank_before
  from public.classements_frags c
  where c.saison_id = v_season and c.user_id = v_user;
  v_dashboard := public.clutch_rank_dashboard_v1();
  select c.frags into v_rank_after
  from public.classements_frags c
  where c.saison_id = v_season and c.user_id = v_user;

  if v_dashboard #>> '{saison,id}' <> v_season
     or (v_dashboard #> '{classements,global}') is null
     or v_rank_before is distinct from v_rank_after
  then
    raise exception 'Rank dashboard changed the canonical Frags model: %', v_dashboard;
  end if;

  insert into public.amities (a, b, demandeur)
  values (least(v_user, v_target), greatest(v_user, v_target), v_user);

  perform public.clutch_bloquer_utilisateur_v1(v_target_pseudo);
  if exists (
    select 1 from public.amities a
    where a.a = least(v_user, v_target) and a.b = greatest(v_user, v_target)
  ) or not coalesce((public.clutch_etat_securite_profil_v1(v_target_pseudo) ->> 'je_bloque')::boolean, false)
  then
    raise exception 'blocking did not remove the relationship or expose its state';
  end if;
  if public.clutch_profil_public_v1(v_target_pseudo) is not null then
    raise exception 'blocked authenticated profile remained readable';
  end if;

  begin
    insert into public.amities (a, b, demandeur)
    values (least(v_user, v_target), greatest(v_user, v_target), v_user);
  exception when insufficient_privilege then
    v_block_guarded := true;
  end;
  if not v_block_guarded then
    raise exception 'blocked users were able to recreate a friendship';
  end if;

  v_report := public.clutch_signaler_utilisateur_v1(v_target_pseudo, 'spam', null);
  v_repeat_report := public.clutch_signaler_utilisateur_v1(v_target_pseudo, 'spam', null);
  if v_report ->> 'signalement_id' is null
     or v_report ->> 'signalement_id' <> v_repeat_report ->> 'signalement_id'
  then
    raise exception 'moderation intake is not idempotent over 24 hours';
  end if;

  insert into public.pronostics_classes (
    user_id, match_id, saison_id, choix, proba_figee, proba_scoring, k_frags
  ) values (v_user, v_match, v_season, 'a', 0.5, 0.5, 60);

  v_mission := public.clutch_mission_faction_active_v1();
  v_hub := public.clutch_hub_complements_v1();
  if (v_mission ->> 'progression')::integer <> 1
     or (v_mission ->> 'contribution_personnelle')::integer <> 1
     or v_hub #>> '{mission_faction,id}' <> v_mission ->> 'id'
  then
    raise exception 'real faction mission or Hub complement failed: %, %', v_mission, v_hub;
  end if;

  if not exists (
    select 1 from private.analytics_evenements a
    where a.user_id = v_user and a.type_evenement = 'mission_commencee'
  ) then
    raise exception 'faction mission lifecycle was not instrumented';
  end if;

  if has_function_privilege('anon', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_bloquer_utilisateur_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_hub_complements_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
  then
    raise exception 'Block B Data API grants are inconsistent';
  end if;

  raise notice 'block_b_core_beta_ok';
end;
$$;

rollback;
