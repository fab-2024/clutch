-- Individual collection sales: prices, retirement, ownership, debit and idempotency.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_item record;
  v_purchase jsonb;
  v_repeat jsonb;
  v_shop jsonb;
  v_count integer := 0;
begin
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
    'circuit-zero-pack-' || v_suffix || '@example.invalid',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'circuit-' || left(v_suffix, 16)),
    pg_catalog.now(),
    pg_catalog.now()
  );

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'Circuit Zero pack test profile was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );


  if exists (select 1 from public.packs_cosmetiques where id = 'neon-protocol' and (actif or statut_publication <> 'retire')) then
    raise exception 'Collection must no longer be sold as a bundle';
  end if;
  begin
    perform public.clutch_acheter_pack_cosmetique_v1('neon-protocol');
    raise exception 'Retired bundle purchase unexpectedly succeeded';
  exception when sqlstate 'P0002' then null;
  end;
  insert into public.volts_mouvements (user_id, montant, origine, reference)
  values (v_user, 3000, 'ajustement', 'neon-protocol-individual-test-credit');
  select public.clutch_boutique_cosmetique_v1() into v_shop;
  if (select count(*) from jsonb_array_elements(v_shop -> 'objets') o where o ->> 'collection_key' = 'neon-protocol') <> 8 then
    raise exception 'Shop must expose eight retained objects only';
  end if;
  for v_item in select * from public.objets_catalogue where collection_key = 'neon-protocol' and actif loop
    v_count := v_count + 1;
    if v_item.source <> 'achat' or v_item.prix <> case v_item.rarete when 'legendaire' then 300 when 'epique' then 200 else 100 end then
      raise exception 'Invalid unit price/source for %', v_item.id;
    end if;
    select public.clutch_acheter_cosmetique_v1(v_item.id) into v_purchase;
    select public.clutch_acheter_cosmetique_v1(v_item.id) into v_repeat;
    if not (v_purchase ->> 'achete')::boolean or (v_repeat ->> 'achete')::boolean
       or (v_purchase ->> 'solde')::integer <> (v_repeat ->> 'solde')::integer then
      raise exception 'Individual purchase is not idempotent: %', v_item.id;
    end if;
    if (select count(*) from public.volts_mouvements where user_id = v_user and objet_id = v_item.id and montant = -v_item.prix) <> 1 then
      raise exception 'Expected exactly one debit for %', v_item.id;
    end if;
    if not exists (select 1 from public.inventaire where user_id = v_user and objet_id = v_item.id) then
      raise exception 'Purchased object missing from inventory: %', v_item.id;
    end if;
  end loop;
  if v_count <> 8 then raise exception 'Expected eight purchases'; end if;
end;
$$;
rollback;
