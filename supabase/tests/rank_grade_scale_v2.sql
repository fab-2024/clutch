-- Rank V3 regression contract. Everything is rolled back.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_friend uuid := gen_random_uuid();
  v_start uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_season text := 'rank-v3-' || v_suffix;
  v_grade jsonb;
  v_dashboard jsonb;
  v_global text[];
  v_global_count integer;
  v_circle_count integer;
  v_start_best smallint;
  v_start_row record;
begin
  if public.clutch_frags_initial() <> 0
     or public.clutch_frags_nb_placements() <> 0
     or public.clutch_frags_k_placement() <> public.clutch_frags_k()
     or public.clutch_soft_reset_frags(1724) <> 0
  then
    raise exception 'Rank V3 must start and reset at zero without a placement multiplier';
  end if;

  v_grade := public.clutch_grade_frags_v1(0, 0);
  if not coalesce((v_grade ->> 'classe')::boolean, false)
     or v_grade ->> 'cle' is distinct from 'bronze'
     or (v_grade ->> 'placements_restants')::integer is distinct from 0
     or (v_grade ->> 'progression')::numeric is distinct from 0
  then
    raise exception 'A zero-Frag player must be classified Bronze immediately: %', v_grade;
  end if;

  if public.clutch_grade_frags_v1(849, 0) ->> 'cle' is distinct from 'bronze'
     or public.clutch_grade_frags_v1(850, 0) ->> 'cle' is distinct from 'argent'
     or public.clutch_grade_frags_v1(1050, 0) ->> 'cle' is distinct from 'or'
     or public.clutch_grade_frags_v1(1250, 0) ->> 'cle' is distinct from 'platine'
     or public.clutch_grade_frags_v1(1450, 0) ->> 'cle' is distinct from 'diamant'
  then
    raise exception 'Rank V3 thresholds are inconsistent';
  end if;

  v_grade := public.clutch_grade_frags_v1(1650, 29);
  if v_grade ->> 'cle' is distinct from 'diamant'
     or (v_grade ->> 'prochains_pronostics_restants')::integer is distinct from 1
  then
    raise exception 'Mythique must stay locked before 30 verdicts: %', v_grade;
  end if;

  if public.clutch_grade_frags_v1(1650, 30) ->> 'cle' is distinct from 'mythique' then
    raise exception 'Mythique must unlock at 1,650 Frags and 30 verdicts';
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_user, 'authenticated', 'authenticated',
      'rank-v3-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV3A-' || left(v_suffix, 8)),
      now(), now()
    ),
    (
      v_friend, 'authenticated', 'authenticated',
      'rank-v3-friend-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV3B-' || left(v_suffix, 8)),
      now(), now()
    ),
    (
      v_start, 'authenticated', 'authenticated',
      'rank-v3-start-' || v_suffix || '@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('pseudo', 'RankV3C-' || left(v_suffix, 8)),
      now(), now()
    );

  insert into public.saisons (id, nom, debut, fin, solde_initial)
  values (v_season, 'Rank V3 regression', now() - interval '1 hour', now() + interval '1 day', 1000);

  insert into public.classements_frags (
    saison_id, user_id, frags, pic_frags, pronostics_regles, pronostics_gagnes
  ) values
    (v_season, v_user, 1032, 1084, 10, 7),
    (v_season, v_friend, 1032, 1070, 20, 15);

  insert into public.classements_frags (saison_id, user_id)
  values (v_season, v_start);

  insert into public.amities (a, b, demandeur, statut, repondu_le)
  values
    (least(v_user, v_friend), greatest(v_user, v_friend), v_user, 'acceptee', now()),
    (least(v_user, v_start), greatest(v_user, v_start), v_user, 'acceptee', now());

  select c.meilleur_grade_ordre into v_start_best
  from public.classements_frags c
  where c.saison_id = v_season and c.user_id = v_start;
  if v_start_best is distinct from 0 then
    raise exception 'A new player must record Bronze as the initial best grade: %', v_start_best;
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

  if v_global_count <> 3
     or v_global[1] <> ('RankV3B-' || left(v_suffix, 8))
     or v_global[2] <> ('RankV3A-' || left(v_suffix, 8))
     or v_global[3] <> ('RankV3C-' || left(v_suffix, 8))
  then
    raise exception 'Global must include zero-Frag starters and use accuracy only as a rating tie-breaker: %', v_global;
  end if;

  select count(*)::integer into v_circle_count
  from public.clutch_classement_rank_v1(v_season, 'cercle');

  select * into v_start_row
  from public.clutch_classement_rank_v1(v_season, 'cercle') r
  where r.id = v_start;

  if v_circle_count <> 3
     or coalesce(v_start_row.provisoire, true)
     or v_start_row.rang is null
     or v_start_row.frags is distinct from 0
     or v_start_row.pic_frags is distinct from 0
     or v_start_row.grade ->> 'cle' is distinct from 'bronze'
     or (v_start_row.grade ->> 'placements_restants')::integer is distinct from 0
  then
    raise exception 'Circle must rank a new zero-Frag player immediately: %', row_to_json(v_start_row);
  end if;

  v_dashboard := public.clutch_rank_dashboard_v1();
  if v_dashboard #>> '{saison,id}' is distinct from v_season
     or v_dashboard #>> '{regles,base}' is distinct from '0'
     or v_dashboard #>> '{regles,placements}' is distinct from '0'
     or v_dashboard #>> '{regles,k_placement}' is distinct from v_dashboard #>> '{regles,k_classe}'
     or v_dashboard #> '{mouvements_recents}' is null
  then
    raise exception 'Rank dashboard V3 contract is incomplete: %', v_dashboard;
  end if;

  if has_function_privilege('anon', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_rank_dashboard_v1()', 'EXECUTE')
  then
    raise exception 'Rank V3 Data API grants are inconsistent';
  end if;

  raise notice 'rank_grade_scale_v3_ok';
end;
$$;

rollback;
