-- Rank V2 regression contract. Everything is rolled back.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_friend uuid := gen_random_uuid();
  v_placement uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_season text := 'rank-v2-' || v_suffix;
  v_grade jsonb;
  v_dashboard jsonb;
  v_global text[];
  v_global_count integer;
  v_circle_count integer;
  v_placement_best smallint;
  v_placement_row record;
begin
  v_grade := public.clutch_grade_frags_v1(1000, 0);
  if coalesce((v_grade ->> 'classe')::boolean, true)
     or v_grade ? 'cle'
     or (v_grade ->> 'placements_restants')::integer <> 5
  then
    raise exception 'placement grade must remain hidden: %', v_grade;
  end if;

  if public.clutch_grade_frags_v1(849, 5) ->> 'cle' <> 'bronze'
     or public.clutch_grade_frags_v1(850, 5) ->> 'cle' <> 'argent'
     or public.clutch_grade_frags_v1(1050, 5) ->> 'cle' <> 'or'
     or public.clutch_grade_frags_v1(1250, 5) ->> 'cle' <> 'platine'
     or public.clutch_grade_frags_v1(1450, 5) ->> 'cle' <> 'diamant'
  then
    raise exception 'Rank V2 thresholds are inconsistent';
  end if;

  v_grade := public.clutch_grade_frags_v1(1650, 29);
  if v_grade ->> 'cle' <> 'diamant'
     or (v_grade ->> 'prochains_pronostics_restants')::integer <> 1
  then
    raise exception 'Mythique must stay locked before 30 verdicts: %', v_grade;
  end if;

  if public.clutch_grade_frags_v1(1650, 30) ->> 'cle' <> 'mythique' then
    raise exception 'Mythique must unlock at 1,650 Frags and 30 verdicts';
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_user, 'authenticated', 'authenticated',
      'rank-v2-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV2A-' || left(v_suffix, 8)),
      now(), now()
    ),
    (
      v_friend, 'authenticated', 'authenticated',
      'rank-v2-friend-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV2B-' || left(v_suffix, 8)),
      now(), now()
    ),
    (
      v_placement, 'authenticated', 'authenticated',
      'rank-v2-placement-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV2C-' || left(v_suffix, 8)),
      now(), now()
    );

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (v_season, 'Rank V2 regression', now() - interval '1 hour', now() + interval '1 day', 1000);

  insert into public.classements_frags (
    saison_id, user_id, frags, pic_frags, pronostics_regles, pronostics_gagnes
  ) values
    (v_season, v_user, 1032, 1084, 10, 7),
    (v_season, v_friend, 1032, 1070, 20, 15),
    (v_season, v_placement, 1010, 1020, 4, 3);

  insert into public.amities (a, b, demandeur, statut, repondu_le)
  values
    (least(v_user, v_friend), greatest(v_user, v_friend), v_user, 'acceptee', now()),
    (least(v_user, v_placement), greatest(v_user, v_placement), v_user, 'acceptee', now());

  select c.meilleur_grade_ordre into v_placement_best
  from public.classements_frags c
  where c.saison_id = v_season and c.user_id = v_placement;
  if v_placement_best is not null then
    raise exception 'Best grade leaked before the fifth verdict: %', v_placement_best;
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );

  select array_agg(r.pseudo order by r.rang), count(*)::integer
  into v_global, v_global_count
  from public.clutch_classement_rank_v1(v_season, 'global') r;

  if v_global_count <> 2
     or v_global[1] <> ('RankV2B-' || left(v_suffix, 8))
     or v_global[2] <> ('RankV2A-' || left(v_suffix, 8))
  then
    raise exception 'Global must hide placements and use accuracy only as rating tie-breaker: %', v_global;
  end if;

  select count(*)::integer into v_circle_count
  from public.clutch_classement_rank_v1(v_season, 'cercle');

  select * into v_placement_row
  from public.clutch_classement_rank_v1(v_season, 'cercle') r
  where r.id = v_placement;

  if v_circle_count <> 3
     or not coalesce(v_placement_row.provisoire, false)
     or v_placement_row.rang is not null
     or (v_placement_row.grade ->> 'placements_restants')::integer <> 1
  then
    raise exception 'Circle must retain unranked placement progress';
  end if;

  v_dashboard := public.clutch_rank_dashboard_v1();
  if v_dashboard #>> '{saison,id}' <> v_season
     or v_dashboard #>> '{regles,base}' <> '1000'
     or v_dashboard #>> '{regles,placements}' <> '5'
     or v_dashboard #> '{mouvements_recents}' is null
  then
    raise exception 'Rank dashboard V2 contract is incomplete: %', v_dashboard;
  end if;

  if has_function_privilege('anon', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
  then
    raise exception 'Rank V2 Data API grants are inconsistent';
  end if;

  raise notice 'rank_grade_scale_v2_ok';
end;
$$;

rollback;
