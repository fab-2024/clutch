-- GRIFF visible-brand regression contract. Historical technical identifiers
-- stay untouched; rendered labels are normalized at rest. Everything rolls
-- back after the assertions.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_suffix text := replace(v_user::text, '-', '');
  v_match_id text;
  v_item_id text;
  v_match_label text;
  v_notification record;
  v_item record;
begin
  if has_function_privilege('authenticated', 'private.griff_normaliser_marque_catalogue_v1()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.griff_normaliser_marque_match_v1()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.griff_normaliser_marque_notification_v1()', 'EXECUTE')
  then
    raise exception 'GRIFF normalization triggers expose private functions';
  end if;

  select m.id into v_match_id
  from public.matchs m
  where m.statut = 'a_venir'
  order by m.id
  limit 1;

  if v_match_id is null then
    raise exception 'GRIFF brand test requires one upcoming match';
  end if;

  update public.matchs
  set resultat_source_label = 'Validation Clutch'
  where id = v_match_id;

  select m.resultat_source_label into v_match_label
  from public.matchs m
  where m.id = v_match_id;

  if v_match_label <> 'Validation GRIFF' then
    raise exception 'Future match labels are not normalized: %', v_match_label;
  end if;

  select o.id into v_item_id
  from public.objets_catalogue o
  order by o.id
  limit 1;

  if v_item_id is null then
    raise exception 'GRIFF brand test requires one catalogue item';
  end if;

  update public.objets_catalogue
  set nom = 'Instinct Clutch',
      description = 'Le noyau CLUTCH dans sa forme origine.',
      licence = '{"type":"interne","titulaire":"Clutch"}'::jsonb
  where id = v_item_id;

  select o.nom, o.description, o.licence into v_item
  from public.objets_catalogue o
  where o.id = v_item_id;

  if v_item.nom <> 'Instinct GRIFF'
     or v_item.description <> 'Le noyau GRIFF dans sa forme origine.'
     or v_item.licence ->> 'titulaire' <> 'GRIFF'
  then
    raise exception 'Future catalogue labels are not normalized: %', to_jsonb(v_item);
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_user,
    'authenticated',
    'authenticated',
    'griff-brand-' || v_suffix || '@example.invalid',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('pseudo', 'griff-brand-' || left(v_suffix, 10)),
    now(),
    now()
  );

  insert into public.evenements_notification (
    user_id, type, cle_evenement, titre, corps
  ) values (
    v_user,
    'promotion',
    'griff-brand-' || v_suffix,
    'Promotion Clutch',
    'Ton rang CLUTCH vient de changer.'
  );

  select n.titre, n.corps into v_notification
  from public.evenements_notification n
  where n.user_id = v_user
    and n.cle_evenement = 'griff-brand-' || v_suffix;

  if v_notification.titre <> 'Promotion GRIFF'
     or v_notification.corps <> 'Ton rang GRIFF vient de changer.'
  then
    raise exception 'Future notification labels are not normalized: %', to_jsonb(v_notification);
  end if;

  if exists (
    select 1
    from public.objets_catalogue
    where nom ilike '%clutch%'
       or description ilike '%clutch%'
       or lower(licence ->> 'titulaire') = 'clutch'
  ) or exists (
    select 1
    from public.matchs
    where resultat_source_label ilike '%clutch%'
  ) or exists (
    select 1
    from public.evenements_notification
    where titre ilike '%clutch%'
       or corps ilike '%clutch%'
  ) then
    raise exception 'A visible Clutch label survived the GRIFF migration';
  end if;

  raise notice 'griff_visible_brand_ok';
end;
$$;

rollback;
