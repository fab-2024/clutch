begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_status jsonb;
  v_receipt jsonb;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
  values (v_user, 'authenticated', 'authenticated', v_user::text || '@example.invalid', now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('pseudo', 'manual-' || left(v_user::text, 12)), now(), now(), false);
  if has_function_privilege('anon', 'public.clutch_statut_bonus_quotidien_v1(text)', 'execute')
    or has_function_privilege('service_role', 'public.clutch_statut_bonus_quotidien_v1(text)', 'execute')
    or not has_function_privilege('authenticated', 'public.clutch_statut_bonus_quotidien_v1(text)', 'execute') then
    raise exception 'invalid status grants';
  end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_status := public.clutch_statut_bonus_quotidien_v1('Europe/Paris');
  if not (v_status ->> 'disponible')::boolean then raise exception 'new player should be eligible'; end if;
  execute 'reset role';
  if exists (select 1 from public.volts_mouvements where user_id = v_user and origine = 'bonus_quotidien')
    or exists (select 1 from private.journees_recompense_joueur where user_id = v_user) then
    raise exception 'status check must not grant reward or pin timezone';
  end if;
  execute 'set local role authenticated';
  v_receipt := public.clutch_reclamer_bonus_quotidien_v1('Europe/Paris');
  v_status := public.clutch_statut_bonus_quotidien_v1('Pacific/Kiritimati');
  if (v_status ->> 'disponible')::boolean or v_status ->> 'jour' <> v_receipt ->> 'jour' then
    raise exception 'claimed reward should be unavailable using the pinned timezone';
  end if;
  v_receipt := public.clutch_reclamer_bonus_quotidien_v1('Europe/Paris');
  if (v_receipt ->> 'attribue')::boolean then raise exception 'replayed claim must not award twice'; end if;
  execute 'reset role';
end;
$$;
rollback;
