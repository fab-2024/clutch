-- Karmine Corp Blue Wall team pack.
--
-- This migration intentionally reuses the generic team-pack tables and RPCs
-- introduced by fnatic_team_pack_v1. No KC-specific purchase path is created:
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
    'kc-room-lighting', 'vitrine_eclairage', 4,
    'Salle Karmine Corp · Blue Wall', 0, true,
    'Une salle noire et acier parcourue par la lumière bleue de la Blue Wall.',
    'legendaire', 'kc-room-lighting', '#168DFF', 'vitrine_eclairage',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-jersey', 'vitrine_maillot', 4,
    'Maillot Karmine Corp', 0, true,
    'Le maillot noir et bleu Karmine Corp présenté sur son socle dédié.',
    'epique', 'kc-jersey', '#168DFF', 'vitrine_maillot',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-logo-3d', 'apparence_core', 4,
    'Logo Karmine Corp 3D', 0, true,
    'Le monogramme Karmine Corp sculpté en métal blanc et bleu.',
    'epique', 'kc-logo-3d', '#168DFF', 'core_clutch',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-banner', 'carte_profil', 4,
    'Bannière Blue Wall', 0, true,
    'Une bannière bleu nuit aux couleurs de la Blue Wall.',
    'rare', 'kc-banner', '#168DFF', 'banniere',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-pedestals', 'vitrine_supports', 4,
    'Socles Karmine Corp', 0, true,
    'Des socles acier cerclés de bleu avec une projection Karmine Corp.',
    'legendaire', 'kc-pedestals', '#168DFF', 'vitrine_supports',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-supporter-token', 'apparence_core', 4,
    'Jeton Supporter Karmine Corp', 0, true,
    'Un jeton de collection frappé du monogramme Karmine Corp.',
    'rare', 'kc-supporter-token', '#168DFF', 'core_clutch',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-totem', 'apparence_core', 4,
    'Totem Karmine Corp', 0, true,
    'Une figurine totem métallique inspirée du monogramme Karmine Corp.',
    'epique', 'kc-totem', '#168DFF', 'core_clutch',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-supporter-badge', 'apparence_core', 4,
    'Badge Supporter Karmine Corp', 0, true,
    'Un badge permanent dédié aux supporters de la Blue Wall.',
    'epique', 'kc-supporter-badge', '#168DFF', 'core_clutch',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-profile-frame', 'cadre_profil', 4,
    'Cadre de profil Karmine Corp', 0, true,
    'Un cadre technique sombre illuminé par les accents bleus Karmine Corp.',
    'epique', 'kc-profile-frame', '#168DFF', 'cadre_avatar',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-blue-wall-effect', 'effet_faction', 4,
    'Effet Blue Wall', 0, true,
    'Une vague bleue se propage à l’entrée puis devient un halo discret.',
    'legendaire', 'kc-blue-wall-effect', '#168DFF', 'signature_relique',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-share-card', 'carte_profil', 4,
    'Carte de partage Blue Wall', 0, true,
    'Une carte paysage Karmine Corp prête à partager la Vitrine équipée.',
    'epique', 'kc-share-card', '#168DFF', 'banniere',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
  ),
  (
    'kc-title', 'titre_profil', 4,
    'Blue Wall', 0, true,
    'Le titre supporter permanent Blue Wall.',
    'epique', 'kc-title', '#168DFF', 'titre_supporter',
    'kc', 'kc-blue-wall', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb, false
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
  'kc-blue-wall',
  'Pack Karmine Corp · Blue Wall',
  'Douze cosmétiques Karmine Corp connus à l’avance, avec huit éléments équipables en une action.',
  1200,
  12,
  true,
  'publie',
  'kc',
  'kc-blue-wall',
  '#168DFF',
  '{"type":"partenaire","titulaire":"Karmine Corp"}'::jsonb
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
  ('kc-blue-wall', 'kc-room-lighting', 'vitrine_eclairage', 1, true),
  ('kc-blue-wall', 'kc-jersey', 'vitrine_maillot', 2, true),
  ('kc-blue-wall', 'kc-logo-3d', 'apparence_core', 3, true),
  ('kc-blue-wall', 'kc-banner', 'carte_profil', 4, false),
  ('kc-blue-wall', 'kc-pedestals', 'vitrine_supports', 5, true),
  ('kc-blue-wall', 'kc-supporter-token', 'apparence_core', 6, false),
  ('kc-blue-wall', 'kc-totem', 'apparence_core', 7, false),
  ('kc-blue-wall', 'kc-supporter-badge', 'apparence_core', 8, false),
  ('kc-blue-wall', 'kc-profile-frame', 'cadre_profil', 9, true),
  ('kc-blue-wall', 'kc-blue-wall-effect', 'effet_faction', 10, true),
  ('kc-blue-wall', 'kc-share-card', 'carte_profil', 11, true),
  ('kc-blue-wall', 'kc-title', 'titre_profil', 12, true)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

comment on function public.clutch_pack_cosmetique_v1(text) is
  'Owner-scoped generic team-pack read model with ordered members, ownership, equipment and Volt affordability.';

-- Fail the migration if the KC seed does not satisfy the same publication,
-- equipment, RLS, grant and lock contract as the existing Fnatic pack.
do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('kc-blue-wall');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'kc-blue-wall'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'kc'
      and p.collection_key = 'kc-blue-wall'
      and p.accent = '#168DFF'
      and p.licence ->> 'titulaire' = 'Karmine Corp'
  ) then
    raise exception 'pack Karmine Corp publie incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'kc-blue-wall'
      and o.marque_key = 'kc'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Karmine Corp'
  ) <> 12 then
    raise exception 'catalogue Karmine Corp incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'kc-blue-wall'
      and o.rarete = 'legendaire'
  ) <> 3
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'kc-blue-wall'
      and o.rarete = 'epique'
  ) <> 7
     or (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'kc-blue-wall'
      and o.rarete = 'rare'
  ) <> 2
  then
    raise exception 'raretes du pack Karmine Corp incoherentes';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou defaults du pack Karmine Corp incoherents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.objet_id = 'kc-room-lighting'
      and m.emplacement = 'vitrine_eclairage'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.objet_id = 'kc-blue-wall-effect'
      and m.emplacement = 'effet_faction'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'kc-blue-wall'
      and m.objet_id = 'kc-supporter-badge'
      and m.emplacement = 'apparence_core'
      and not m.equip_by_default
  ) then
    raise exception 'mapping des slots Karmine Corp incoherent';
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
