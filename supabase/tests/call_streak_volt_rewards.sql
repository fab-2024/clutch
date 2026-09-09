-- End-to-end authoritative call-day rewards. No fixture survives the transaction.
begin;
do $$
declare
  u uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  proof uuid;
  d integer;
  fixture text := 'streak-reward-' || gen_random_uuid()::text;
  payload jsonb;
  reward_total integer;
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u,'authenticated','authenticated',fixture||'@example.invalid',now(),
    '{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','sr-'||left(u::text,8)),now(),now()),
    (other_user,'authenticated','authenticated',fixture||'-other@example.invalid',now(),
    '{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','sr-'||left(other_user::text,8)),now(),now());
  perform private.clutch_initialiser_serie_v1(u,'UTC');
  perform private.clutch_initialiser_serie_v1(other_user,'UTC');
  update private.series_calls_etats set cree_le='2026-08-01 00:00Z',traite_jusqua='2026-07-31',
    prochaine_cloture='2026-08-02 00:00Z' where user_id=u;
  insert into private.series_calls_fenetres(match_id,ouvert_le,ferme_le)
    values(fixture,'2026-08-01 00:00Z','2026-09-30 00:00Z');
  for d in 0..13 loop
    proof := gen_random_uuid();
    perform private.clutch_enregistrer_jour_call_v1(u,proof,fixture||d, '2026-08-01 12:00Z'::timestamptz + make_interval(days=>d));
    -- Replayed proof and second call on the same day must not pay again.
    perform private.clutch_enregistrer_jour_call_v1(u,proof,fixture||d, '2026-08-01 12:00Z'::timestamptz + make_interval(days=>d));
    perform private.clutch_enregistrer_jour_call_v1(u,gen_random_uuid(),fixture||'-second-'||d, '2026-08-01 12:00Z'::timestamptz + make_interval(days=>d));
    select coalesce(sum(montant),0) into reward_total from public.volts_mouvements
      where user_id=u and origine='progression' and reference in ('serie-calls:7','serie-calls:14');
    if reward_total <> (case when d < 6 then 0 when d < 13 then 50 else 150 end) then
      raise exception 'Unexpected reward at day %: %',d+1,reward_total;
    end if;
  end loop;
  payload := private.clutch_etat_serie_json_v1(u,'2026-08-14 12:01Z');
  if payload->>'serie_actuelle'<>'14' or payload#>>'{recompenses,0,volts}'<>'50'
    or payload#>>'{recompenses,1,volts}'<>'100'
    or payload#>>'{recompenses,0,credite_le}' is null
    or payload#>>'{recompenses,1,credite_le}' is null then
    raise exception 'Rewards are missing from the authoritative state';
  end if;
  -- Restarting a streak does not make a lifetime reward repeatable.
  update private.series_calls_etats set serie_actuelle=6 where user_id=u;
  perform private.clutch_enregistrer_jour_call_v1(u,gen_random_uuid(),fixture||'-restart','2026-08-15 12:00Z');
  if (select count(*) from public.volts_mouvements where user_id=u and reference in ('serie-calls:7','serie-calls:14'))<>2
    or exists(select 1 from public.volts_mouvements where user_id=other_user and reference in ('serie-calls:7','serie-calls:14')) then
    raise exception 'Rewards duplicated or leaked to another account';
  end if;
  -- State reads cannot create a reward, even for an existing active streak.
  update private.series_calls_etats set serie_actuelle=14, meilleure_serie=14, jours_valides=14 where user_id=other_user;
  payload := private.clutch_etat_serie_json_v1(other_user,clock_timestamp());
  if payload#>>'{recompenses,0,credite_le}' is not null
    or exists(select 1 from public.volts_mouvements where user_id=other_user and reference='serie-calls:7') then
    raise exception 'Reading an existing streak awarded currency';
  end if;
  if has_function_privilege('authenticated','private.clutch_enregistrer_jour_call_v1(uuid,uuid,text,timestamptz)','execute')
    or has_function_privilege('anon','private.clutch_etat_serie_json_v1(uuid,timestamptz)','execute')
    or has_function_privilege('authenticated','public.clutch_crediter_volts(uuid,integer,text,text)','execute')
    or has_table_privilege('authenticated','public.volts_mouvements','insert')
    or not (select relrowsecurity from pg_class where oid='public.volts_mouvements'::regclass) then
    raise exception 'Clients can fabricate a streak reward';
  end if;
end;
$$;
rollback;
