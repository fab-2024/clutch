begin;
-- Exercise real RPCs with an existing profile, then roll back every state change.
do $$
declare v_user uuid; v_balance bigint; v_equipped jsonb; v_shop jsonb;
begin
  if has_function_privilege('anon', 'public.clutch_desequiper_ecrin_v1()', 'execute') then
    raise exception 'Anonymous execution must be denied';
  end if;
  if not has_function_privilege('authenticated', 'public.clutch_desequiper_ecrin_v1()', 'execute') then
    raise exception 'Authenticated execution must be granted';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.clutch_desequiper_ecrin_v1();
    raise exception 'Missing authentication was accepted';
  exception when sqlstate '28000' then null;
  end;
  select id into strict v_user from public.profils order by id limit 1;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  select coalesce(sum(montant), 0) into v_balance from public.volts_mouvements where user_id = v_user;
  perform public.clutch_equiper_cosmetique_v1('rank_carbon_cradle');
  v_equipped := public.clutch_mes_cosmetiques_v1();
  if v_equipped #>> '{vitrine_rang,id}' is distinct from 'rank_carbon_cradle' then
    raise exception 'Carbon must remain a visible, equipped display';
  end if;
  perform public.clutch_desequiper_ecrin_v1();
  v_equipped := public.clutch_mes_cosmetiques_v1();
  if v_equipped -> 'vitrine_rang' is distinct from 'null'::jsonb then
    raise exception 'Unequipped display must be null';
  end if;
  v_shop := public.clutch_boutique_cosmetique_v1();
  if exists (select 1 from jsonb_array_elements(v_shop -> 'objets') item
    where item ->> 'emplacement' = 'vitrine_rang' and (item ->> 'equipe')::boolean) then
    raise exception 'Shop must not show a default equipped display';
  end if;
  perform public.clutch_equiper_cosmetique_v1('rank_carbon_cradle');
  if public.clutch_mes_cosmetiques_v1() #>> '{vitrine_rang,id}' is distinct from 'rank_carbon_cradle' then
    raise exception 'Carbon must be equipable after removal';
  end if;
  if (select coalesce(sum(montant), 0) from public.volts_mouvements where user_id = v_user) <> v_balance then
    raise exception 'Equipment must not change the balance';
  end if;
end;
$$;
rollback;
