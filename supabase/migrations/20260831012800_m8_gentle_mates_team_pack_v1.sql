-- M8 Gentle Mates Paris team pack.
--
-- This migration intentionally reuses the generic team-pack tables and RPCs
-- introduced by fnatic_team_pack_v1. No M8-specific purchase path is created:
-- the same catalogue advisory lock, per-user cosmetic lock, Volt ledger lock,
-- permanent entitlement, inventory grant and default-equipment transaction
-- apply to every published pack id.

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
    'm8-room-lighting', 'vitrine_eclairage', 4,
    'Salle M8 · Gentle Mates Paris', 0, true,
    'Une galerie bleu nuit et argent parcourue de filigranes lumineux et d’éclats étoilés.',
    'legendaire', 'm8-room-lighting', '#B9DCFF', 'vitrine_eclairage',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-jersey', 'vitrine_maillot', 4,
    'Maillot M8 2026', 0, true,
    'Le maillot blanc et bleu Gentle Mates Paris présenté sur son socle dédié.',
    'epique', 'm8-jersey', '#B9DCFF', 'vitrine_maillot',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-crest-3d', 'apparence_core', 4,
    'Blason M8 3D', 0, true,
    'Le blason M8 sculpté en argent et émail bleu nuit.',
    'epique', 'm8-crest-3d', '#B9DCFF', 'core_clutch',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-banner', 'carte_profil', 4,
    'Bannière Paris', 0, true,
    'Une bannière textile claire aux couleurs de Gentle Mates Paris.',
    'rare', 'm8-banner', '#B9DCFF', 'banniere',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-pedestals', 'vitrine_supports', 4,
    'Socles M8', 0, true,
    'Des socles argentés ornés de filigranes avec une projection M8 au sol.',
    'legendaire', 'm8-pedestals', '#B9DCFF', 'vitrine_supports',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-supporter-token', 'apparence_core', 4,
    'Jeton Supporter M8', 0, true,
    'Un jeton de collection frappé du blason M8.',
    'rare', 'm8-supporter-token', '#B9DCFF', 'core_clutch',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-crest-totem', 'apparence_core', 4,
    'Figurine Blason M8', 0, true,
    'Une figurine argentée inspirée du blason héraldique M8.',
    'epique', 'm8-crest-totem', '#B9DCFF', 'core_clutch',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-supporter-badge', 'apparence_core', 4,
    'Badge Supporter M8', 0, true,
    'Un badge permanent dédié aux supporters de Gentle Mates.',
    'epique', 'm8-supporter-badge', '#B9DCFF', 'core_clutch',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-profile-frame', 'cadre_profil', 4,
    'Cadre de profil M8', 0, true,
    'Un cadre bleu nuit et argent ponctué d’éclats étoilés.',
    'epique', 'm8-profile-frame', '#B9DCFF', 'cadre_avatar',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-sparkle-effect', 'effet_faction', 4,
    'Effet Éclat M8', 0, true,
    'Un filigrane lumineux se déploie à l’entrée avant un éclat M8 et un scintillement discret.',
    'legendaire', 'm8-sparkle-effect', '#B9DCFF', 'signature_relique',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-share-card', 'carte_profil', 4,
    'Carte de partage Gentle Mates Paris', 0, true,
    'Une carte paysage M8 prête à partager la Vitrine équipée.',
    'epique', 'm8-share-card', '#B9DCFF', 'banniere',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
  ),
  (
    'm8-title', 'titre_profil', 4,
    'Gentle Mates Paris', 0, true,
    'Le titre supporter permanent Gentle Mates Paris.',
    'epique', 'm8-title', '#B9DCFF', 'titre_supporter',
    'm8', 'm8-gentle-mates', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb, false
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
  'm8-gentle-mates',
  'Pack M8 · Gentle Mates Paris',
  'Douze cosmétiques M8 connus à l’avance, avec huit éléments équipables en une action.',
  1200,
  12,
  true,
  'publie',
  'm8',
  'm8-gentle-mates',
  '#B9DCFF',
  '{"type":"partenaire","titulaire":"Gentle Mates"}'::jsonb
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
  ('m8-gentle-mates', 'm8-room-lighting', 'vitrine_eclairage', 1, true),
  ('m8-gentle-mates', 'm8-jersey', 'vitrine_maillot', 2, true),
  ('m8-gentle-mates', 'm8-crest-3d', 'apparence_core', 3, true),
  ('m8-gentle-mates', 'm8-banner', 'carte_profil', 4, false),
  ('m8-gentle-mates', 'm8-pedestals', 'vitrine_supports', 5, true),
  ('m8-gentle-mates', 'm8-supporter-token', 'apparence_core', 6, false),
  ('m8-gentle-mates', 'm8-crest-totem', 'apparence_core', 7, false),
  ('m8-gentle-mates', 'm8-supporter-badge', 'apparence_core', 8, false),
  ('m8-gentle-mates', 'm8-profile-frame', 'cadre_profil', 9, true),
  ('m8-gentle-mates', 'm8-sparkle-effect', 'effet_faction', 10, true),
  ('m8-gentle-mates', 'm8-share-card', 'carte_profil', 11, true),
  ('m8-gentle-mates', 'm8-title', 'titre_profil', 12, true)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

comment on function public.clutch_pack_cosmetique_v1(text) is
  'Owner-scoped generic team-pack read model with ordered members, ownership, equipment and Volt affordability.';

-- Fail the migration if the M8 seed does not satisfy the same publication,
-- equipment, RLS, grant and lock contract as the existing Fnatic pack.
do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('m8-gentle-mates');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'm8-gentle-mates'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'm8'
      and p.collection_key = 'm8-gentle-mates'
      and p.accent = '#B9DCFF'
      and p.licence ->> 'titulaire' = 'Gentle Mates'
  ) then
    raise exception 'pack M8 publie incomplet';
  end if;

  if (
    select count(*)
    from public.packs_cosmetiques p
    where p.id in (
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates'
    )
      and p.actif
      and p.statut_publication = 'publie'
  ) <> 3 then
    raise exception 'coexistence des trois packs equipe incoherente';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'm8-gentle-mates'
      and o.marque_key = 'm8'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Gentle Mates'
  ) <> 12 then
    raise exception 'catalogue M8 incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'm8-gentle-mates'
      and o.rarete = 'legendaire'
  ) <> 3
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'm8-gentle-mates'
      and o.rarete = 'epique'
  ) <> 7
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'm8-gentle-mates'
      and o.rarete = 'rare'
  ) <> 2
  then
    raise exception 'raretes du pack M8 incoherentes';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou defaults du pack M8 incoherents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
      and m.objet_id = 'm8-room-lighting'
      and m.emplacement = 'vitrine_eclairage'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
      and m.objet_id = 'm8-sparkle-effect'
      and m.emplacement = 'effet_faction'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'm8-gentle-mates'
      and m.objet_id = 'm8-supporter-badge'
      and m.emplacement = 'apparence_core'
      and not m.equip_by_default
  ) then
    raise exception 'mapping des slots M8 incoherent';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and t.tgname in (
        'packs_cosmetiques_mutation_lock_v1',
        'pack_cosmetique_membres_mutation_lock_v1',
        'packs_cosmetiques_immutabilite_v1',
        'pack_cosmetique_membres_immutabilite_v1'
      )
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) <> 4 then
    raise exception 'verrous editoriaux ou immutabilite des packs incomplets';
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
    raise exception 'RLS des packs cosmetiques absente ou desactivee';
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
     or has_function_privilege(
       'authenticated',
       'private.clutch_verrouiller_catalogue_packs_v1(boolean)',
       'EXECUTE'
     )
  then
    raise exception 'privileges des packs cosmetiques incoherents';
  end if;
end;
$$;

commit;
