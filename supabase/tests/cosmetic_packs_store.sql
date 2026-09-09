begin;
do $$
declare
  u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); legacy uuid:=gen_random_uuid();
  proofs jsonb; empty_proofs jsonb; stamp timestamptz:=clock_timestamp();
  tx text:='test-pack-'||gen_random_uuid(); movement uuid; payload jsonb;
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select id,'authenticated','authenticated',id::text||'@example.invalid',now(),
    '{"provider":"email","providers":["email"]}',jsonb_build_object('pseudo','pack-'||left(id::text,8)),now(),now()
  from unnest(array[u,other_user,legacy]) id;
  select jsonb_agg(jsonb_build_object('pack_id',id,'product_id',produit_store_id,'active',false) order by id)
    into empty_proofs from public.packs_cosmetiques where produit_store_id is not null;
  if jsonb_array_length(empty_proofs)<>6 then raise exception 'expected exactly six products'; end if;
  select jsonb_agg(case when x->>'pack_id'='sang-des-titans' then x||jsonb_build_object('active',true,
    'store','app_store','environment','sandbox','transaction_id',tx,'purchased_at',stamp) else x end)
    into proofs from jsonb_array_elements(empty_proofs) x;
  perform public.clutch_synchroniser_packs_store_v1(u,stamp,proofs);
  perform public.clutch_synchroniser_packs_store_v1(u,stamp+interval '1 second',proofs);
  if (select count(*) from private.achats_packs_store where user_id=u)<>1
    or (select count(*) from public.inventaire where user_id=u)<>(select nombre_objets from public.packs_cosmetiques where id='sang-des-titans')
    or exists(select 1 from public.volts_mouvements where user_id=u) then raise exception 'grant duplicated, incomplete or charged Volts'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.clutch_equiper_pack_cosmetique_v1('sang-des-titans');
  begin
    perform public.clutch_acheter_pack_cosmetique_v1('sang-des-titans');
    raise exception 'old Volt purchase allowed';
  exception when feature_not_supported then null; end;
  begin
    perform public.clutch_synchroniser_packs_store_v1(other_user,stamp,proofs);
    raise exception 'receipt duplicated across accounts';
  exception when check_violation then null; end;
  perform public.clutch_synchroniser_packs_store_v1(u,stamp+interval '2 seconds',empty_proofs);
  perform public.clutch_synchroniser_packs_store_v1(u,stamp+interval '1 second',proofs);
  if exists(select 1 from public.inventaire where user_id=u)
    or exists(select 1 from public.equipement where user_id=u)
    or exists(select 1 from public.inventaire_packs_cosmetiques where user_id=u) then raise exception 'refund or stale proof failed'; end if;
  -- Explicit transfer is possible only after the source no longer holds the transaction.
  perform public.clutch_synchroniser_packs_store_v1(other_user,stamp+interval '3 seconds',proofs);
  if not exists(select 1 from public.inventaire_packs_cosmetiques where user_id=other_user) then raise exception 'transfer failed'; end if;
  -- Seed an authentic historical Volt purchase. Store revocation must not touch it.
  perform public.clutch_crediter_volts(legacy,2000,'progression',tx);
  insert into public.volts_mouvements(user_id,montant,origine,reference,pack_id)
    select legacy,-prix_volts,'achat_pack',id,id from public.packs_cosmetiques where id='sang-des-titans' returning id into movement;
  insert into public.inventaire_packs_cosmetiques(user_id,pack_id,mouvement_id,prix_paye_volts)
    select legacy,id,movement,prix_volts from public.packs_cosmetiques where id='sang-des-titans';
  insert into public.inventaire(user_id,objet_id) select legacy,objet_id from public.pack_cosmetique_membres where pack_id='sang-des-titans';
  perform public.clutch_synchroniser_packs_store_v1(legacy,stamp,empty_proofs);
  if not exists(select 1 from public.inventaire_packs_cosmetiques where user_id=legacy and mouvement_id=movement) then raise exception 'legacy right removed'; end if;
  if has_function_privilege('authenticated','public.clutch_synchroniser_packs_store_v1(uuid,timestamptz,jsonb)','execute')
    or has_function_privilege('anon','public.clutch_synchroniser_packs_store_v1(uuid,timestamptz,jsonb)','execute')
    or has_table_privilege('authenticated','private.achats_packs_store','insert') then raise exception 'untrusted grants possible'; end if;
end; $$;
rollback;
