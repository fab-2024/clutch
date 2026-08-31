-- Valorant five-object game collection.
--
-- This seed reuses the generic cosmetic-pack purchase and equip RPCs. The
-- source remains team_pack because it is the existing deterministic bundle
-- source contract; the client presents this pack in a separate game
-- collection shelf.

begin;

insert into public.objets_catalogue (
  id,
  emplacement,
  niveau,
  nom,
  prix,
  actif,
  description,
  rarete,
  style_key,
  accent,
  famille,
  marque_key,
  collection_key,
  source,
  statut_publication,
  licence,
  est_inclus
) values
  (
    'valorant-vandal', 'apparence_core', 4,
    'Vandal', 0, true,
    'Une réplique blanche et graphite sertie d''un noyau corail lumineux.',
    'epique', 'valorant-vandal', '#FF4655', 'core_clutch',
    'valorant', 'valorant-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'valorant-spike', 'apparence_core', 5,
    'Spike', 0, true,
    'Le dispositif de radianite suspendu au-dessus d''un socle parcouru d''étincelles rouges.',
    'legendaire', 'valorant-spike', '#FF4655', 'core_clutch',
    'valorant', 'valorant-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'valorant-jett-gallery', 'vitrine_supports', 5,
    'Jett', 0, true,
    'La pièce centrale et le présentoir de la collection Valorant.',
    'legendaire', 'valorant-jett-gallery', '#9FE8FF', 'vitrine_supports',
    'valorant', 'valorant-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'valorant-omen', 'apparence_core', 5,
    'Omen', 0, true,
    'Un buste d''Omen émergeant d''une nappe d''ombre violette.',
    'legendaire', 'valorant-omen', '#8A5CFF', 'core_clutch',
    'valorant', 'valorant-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'valorant-wingman', 'apparence_core', 4,
    'Wingman', 0, true,
    'Le compagnon jaune de Gekko protégé sous une cloche de verre de collection.',
    'epique', 'valorant-wingman', '#D8F34A', 'core_clutch',
    'valorant', 'valorant-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  )
on conflict (id) do update
set emplacement = excluded.emplacement,
    niveau = excluded.niveau,
    nom = excluded.nom,
    prix = excluded.prix,
    actif = excluded.actif,
    description = excluded.description,
    rarete = excluded.rarete,
    style_key = excluded.style_key,
    accent = excluded.accent,
    famille = excluded.famille,
    marque_key = excluded.marque_key,
    collection_key = excluded.collection_key,
    source = excluded.source,
    statut_publication = excluded.statut_publication,
    licence = excluded.licence,
    est_inclus = excluded.est_inclus;

insert into public.packs_cosmetiques (
  id,
  nom,
  description,
  prix_volts,
  nombre_objets,
  actif,
  statut_publication,
  marque_key,
  collection_key,
  accent,
  licence
) values (
  'valorant-collection',
  'Pack Valorant · Protocole Radiant',
  'Cinq pièces de collection connues à l''avance dans une galerie dédiée.',
  900,
  5,
  true,
  'publie',
  'valorant',
  'valorant-collection',
  '#FF4655',
  '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb
)
on conflict (id) do update
set nom = excluded.nom,
    description = excluded.description,
    prix_volts = excluded.prix_volts,
    nombre_objets = excluded.nombre_objets,
    actif = excluded.actif,
    statut_publication = excluded.statut_publication,
    marque_key = excluded.marque_key,
    collection_key = excluded.collection_key,
    accent = excluded.accent,
    licence = excluded.licence,
    maj_le = pg_catalog.now();

insert into public.pack_cosmetique_membres (
  pack_id,
  objet_id,
  emplacement,
  ordre,
  equip_by_default
) values
  ('valorant-collection', 'valorant-vandal', 'apparence_core', 1, false),
  ('valorant-collection', 'valorant-spike', 'apparence_core', 2, false),
  ('valorant-collection', 'valorant-jett-gallery', 'vitrine_supports', 3, true),
  ('valorant-collection', 'valorant-omen', 'apparence_core', 4, false),
  ('valorant-collection', 'valorant-wingman', 'apparence_core', 5, false)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1(
    'valorant-collection'
  );

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'valorant-collection'
      and p.prix_volts = 900
      and p.nombre_objets = 5
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'valorant'
      and p.collection_key = 'valorant-collection'
      and p.accent = '#FF4655'
      and p.licence ->> 'titulaire' = 'Riot Games'
  ) then
    raise exception 'pack Valorant publié incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'valorant-collection'
      and o.marque_key = 'valorant'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Riot Games'
  ) <> 5 then
    raise exception 'catalogue Valorant incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'valorant-collection'
      and o.rarete = 'legendaire'
  ) <> 3
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'valorant-collection'
      and o.rarete = 'epique'
  ) <> 2
  then
    raise exception 'raretés du pack Valorant incohérentes';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'valorant-collection'
  ) <> 5
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'valorant-collection'
      and m.equip_by_default
  ) <> 1
  then
    raise exception 'membres ou défaut du pack Valorant incohérents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'valorant-collection'
      and m.objet_id = 'valorant-jett-gallery'
      and m.emplacement = 'vitrine_supports'
      and m.equip_by_default
  ) or exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'valorant-collection'
      and m.objet_id <> 'valorant-jett-gallery'
      and m.equip_by_default
  ) then
    raise exception 'présentoir Valorant incohérent';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'packs_cosmetiques',
        'pack_cosmetique_membres',
        'inventaire_packs_cosmetiques'
      )
      and c.relrowsecurity
  ) <> 3 then
    raise exception 'RLS des packs cosmétiques absente ou désactivée';
  end if;

  if has_table_privilege('anon', 'public.packs_cosmetiques', 'SELECT')
     or has_table_privilege('authenticated', 'public.packs_cosmetiques', 'INSERT')
     or has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'UPDATE')
     or has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'INSERT')
     or not has_table_privilege('authenticated', 'public.packs_cosmetiques', 'SELECT')
     or not has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
  then
    raise exception 'privilèges des packs cosmétiques incohérents';
  end if;
end
$$;

commit;
