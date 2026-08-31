-- Rocket League five-object game collection.
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
    'rocket-league-zomba-wheel', 'apparence_core', 5,
    'Roue Zomba', 0, true,
    'Une roue de collection dont le moyeu irradie un motif d''énergie bleu, rose et orange.',
    'legendaire', 'rocket-league-zomba-wheel', '#35A8FF', 'core_clutch',
    'rocket-league', 'rocket-league-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb, false
  ),
  (
    'rocket-league-boost-100', 'apparence_core', 4,
    'Boost 100', 0, true,
    'Un orbe doré suspendu au-dessus d''un flux continu de particules de boost.',
    'epique', 'rocket-league-boost-100', '#FFBE3D', 'core_clutch',
    'rocket-league', 'rocket-league-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb, false
  ),
  (
    'rocket-league-octane-gallery', 'vitrine_supports', 5,
    'Octane', 0, true,
    'La pièce centrale et le présentoir de la collection Rocket League.',
    'legendaire', 'rocket-league-octane-gallery', '#2C9CFF', 'vitrine_supports',
    'rocket-league', 'rocket-league-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb, false
  ),
  (
    'rocket-league-arena-ball', 'apparence_core', 4,
    'Ballon d''arène', 0, true,
    'Le ballon blindé des arènes, marqué par les lumières des deux camps.',
    'epique', 'rocket-league-arena-ball', '#7CCAFF', 'core_clutch',
    'rocket-league', 'rocket-league-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb, false
  ),
  (
    'rocket-league-goal-explosion', 'apparence_core', 5,
    'Explosion de but', 0, true,
    'Un impact bleu et orange figé dans un but miniature de collection.',
    'legendaire', 'rocket-league-goal-explosion', '#FF8A24', 'core_clutch',
    'rocket-league', 'rocket-league-collection', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb, false
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
  'rocket-league-collection',
  'Pack Rocket League · Blue & Orange Arena',
  'Cinq pièces de collection connues à l''avance dans une galerie dédiée.',
  900,
  5,
  true,
  'publie',
  'rocket-league',
  'rocket-league-collection',
  '#FF8A24',
  '{"type":"partenaire","titulaire":"Psyonix"}'::jsonb
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
  ('rocket-league-collection', 'rocket-league-zomba-wheel', 'apparence_core', 1, false),
  ('rocket-league-collection', 'rocket-league-boost-100', 'apparence_core', 2, false),
  ('rocket-league-collection', 'rocket-league-octane-gallery', 'vitrine_supports', 3, true),
  ('rocket-league-collection', 'rocket-league-arena-ball', 'apparence_core', 4, false),
  ('rocket-league-collection', 'rocket-league-goal-explosion', 'apparence_core', 5, false)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1(
    'rocket-league-collection'
  );

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'rocket-league-collection'
      and p.prix_volts = 900
      and p.nombre_objets = 5
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'rocket-league'
      and p.collection_key = 'rocket-league-collection'
      and p.accent = '#FF8A24'
      and p.licence ->> 'titulaire' = 'Psyonix'
  ) then
    raise exception 'pack Rocket League publié incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'rocket-league-collection'
      and o.marque_key = 'rocket-league'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Psyonix'
  ) <> 5 then
    raise exception 'catalogue Rocket League incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'rocket-league-collection'
      and o.rarete = 'legendaire'
  ) <> 3
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'rocket-league-collection'
      and o.rarete = 'epique'
  ) <> 2
  then
    raise exception 'raretés du pack Rocket League incohérentes';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'rocket-league-collection'
  ) <> 5
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'rocket-league-collection'
      and m.equip_by_default
  ) <> 1
  then
    raise exception 'membres ou défaut du pack Rocket League incohérents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'rocket-league-collection'
      and m.objet_id = 'rocket-league-octane-gallery'
      and m.emplacement = 'vitrine_supports'
      and m.equip_by_default
  ) or exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'rocket-league-collection'
      and m.objet_id <> 'rocket-league-octane-gallery'
      and m.equip_by_default
  ) then
    raise exception 'présentoir Rocket League incohérent';
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
