-- League of Legends five-object game collection.
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
    'lol-infinity-edge', 'apparence_core', 4,
    'Lame d''Infini', 0, true,
    'Une réplique de collection aux finitions acier, or et cristal azur.',
    'epique', 'lol-infinity-edge', '#D6B56A', 'core_clutch',
    'league-of-legends', 'league-of-legends-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'lol-nexus-fragment', 'apparence_core', 4,
    'Fragment du Nexus', 0, true,
    'Un fragment azur suspendu, parcouru d''une énergie cristalline.',
    'legendaire', 'lol-nexus-fragment', '#35C8FF', 'core_clutch',
    'league-of-legends', 'league-of-legends-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'lol-jinx-fishbones-gallery', 'vitrine_supports', 5,
    'Jinx & Fishbones', 0, true,
    'La pièce centrale et le présentoir de la collection League of Legends.',
    'legendaire', 'lol-jinx-fishbones-gallery', '#55C9FF', 'vitrine_supports',
    'league-of-legends', 'league-of-legends-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'lol-baron-nashor', 'apparence_core', 5,
    'Baron Nashor', 0, true,
    'Une sculpture violette monumentale surgissant d''un bassin d''énergie du Néant.',
    'legendaire', 'lol-baron-nashor', '#9B5CFF', 'core_clutch',
    'league-of-legends', 'league-of-legends-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Riot Games"}'::jsonb, false
  ),
  (
    'lol-vision-ward', 'apparence_core', 4,
    'Balise de vision', 0, true,
    'Une balise dorée protégée par une cloche de verre et un halo ambré.',
    'epique', 'lol-vision-ward', '#F3B84B', 'core_clutch',
    'league-of-legends', 'league-of-legends-collection', 'team_pack', 'publie',
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
  'league-of-legends-collection',
  'Pack League of Legends · Icônes de Runeterra',
  'Cinq pièces de collection connues à l''avance dans une galerie dédiée.',
  900,
  5,
  true,
  'publie',
  'league-of-legends',
  'league-of-legends-collection',
  '#D6B56A',
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
  ('league-of-legends-collection', 'lol-infinity-edge', 'apparence_core', 1, false),
  ('league-of-legends-collection', 'lol-nexus-fragment', 'apparence_core', 2, false),
  ('league-of-legends-collection', 'lol-jinx-fishbones-gallery', 'vitrine_supports', 3, true),
  ('league-of-legends-collection', 'lol-baron-nashor', 'apparence_core', 4, false),
  ('league-of-legends-collection', 'lol-vision-ward', 'apparence_core', 5, false)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1(
    'league-of-legends-collection'
  );

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'league-of-legends-collection'
      and p.prix_volts = 900
      and p.nombre_objets = 5
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'league-of-legends'
      and p.collection_key = 'league-of-legends-collection'
      and p.accent = '#D6B56A'
      and p.licence ->> 'titulaire' = 'Riot Games'
  ) then
    raise exception 'pack League of Legends publié incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'league-of-legends-collection'
      and o.marque_key = 'league-of-legends'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Riot Games'
  ) <> 5 then
    raise exception 'catalogue League of Legends incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'league-of-legends-collection'
      and o.rarete = 'legendaire'
  ) <> 3
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'league-of-legends-collection'
      and o.rarete = 'epique'
  ) <> 2
  then
    raise exception 'raretés du pack League of Legends incohérentes';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'league-of-legends-collection'
  ) <> 5
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'league-of-legends-collection'
      and m.equip_by_default
  ) <> 1
  then
    raise exception 'membres ou défaut du pack League of Legends incohérents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'league-of-legends-collection'
      and m.objet_id = 'lol-jinx-fishbones-gallery'
      and m.emplacement = 'vitrine_supports'
      and m.equip_by_default
  ) or exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'league-of-legends-collection'
      and m.objet_id <> 'lol-jinx-fishbones-gallery'
      and m.equip_by_default
  ) then
    raise exception 'présentoir League of Legends incohérent';
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
