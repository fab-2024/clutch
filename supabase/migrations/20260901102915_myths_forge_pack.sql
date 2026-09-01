-- Original Pack Mythes de la Forge.
-- Protocole Neon remains published; licensed packs remain retired and intact.

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
    'mythes-forge-room', 'vitrine_eclairage', 5,
    'Forge des Failles', 0, true,
    'Une galerie de basalte traversée de veines de braise et de cuivre patiné.',
    'legendaire', 'mythes-forge-room', '#F06A3A', 'vitrine_eclairage',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-armor-orea', 'vitrine_maillot', 4,
    'Armure Oréa', 0, true,
    'Une cuirasse ivoire et graphite forgée autour d''un noyau de cuivre incandescent.',
    'epique', 'mythes-forge-armor-orea', '#E7DCCB', 'vitrine_maillot',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-ember-sigil', 'apparence_core', 4,
    'Sigil de Braise', 0, true,
    'Un anneau fendu serti de trois braises qui pulse au rythme de la Forge.',
    'epique', 'mythes-forge-ember-sigil', '#F06A3A', 'core_clutch',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-strata-banner', 'carte_profil', 3,
    'Bannière Strate', 0, true,
    'Une bannière minérale noire marquée d''un tracé cuivre original.',
    'rare', 'mythes-forge-strata-banner', '#C9784B', 'banniere',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-magma-pedestals', 'vitrine_supports', 5,
    'Socle Magmatique', 0, true,
    'Huit stations de basalte cerclées de métal forgé et éclairées par la roche en fusion.',
    'legendaire', 'mythes-forge-magma-pedestals', '#F06A3A', 'vitrine_supports',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-telluric-token', 'apparence_core', 3,
    'Jeton Tellurique', 0, true,
    'Un disque de roche striée dont la faille centrale diffuse une lueur tellurique.',
    'rare', 'mythes-forge-telluric-token', '#C9784B', 'core_clutch',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-basalt-totem', 'apparence_core', 4,
    'Totem Basalte', 0, true,
    'Une colonne de roche noire maintenue par des bagues d''ivoire et de cuivre.',
    'epique', 'mythes-forge-basalt-totem', '#F06A3A', 'core_clutch',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-artisan-badge', 'apparence_core', 4,
    'Badge Artisan', 0, true,
    'Un badge hexagonal taillé dans la pierre et traversé d''un sigil de cuivre incandescent.',
    'epique', 'mythes-forge-artisan-badge', '#43BFC1', 'core_clutch',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-rift-frame', 'cadre_profil', 4,
    'Cadre Fissure', 0, true,
    'Un cadre de basalte éclaté consolidé par des angles de cuivre et d''ivoire.',
    'epique', 'mythes-forge-rift-frame', '#F06A3A', 'cadre_avatar',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-resonance-effect', 'effet_faction', 5,
    'Effet Résonance', 0, true,
    'Des cercles telluriques orange et turquoise propagent une onde dans toute la Vitrine.',
    'legendaire', 'mythes-forge-resonance-effect', '#F06A3A', 'signature_relique',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-share-card', 'carte_profil', 4,
    'Carte de partage', 0, true,
    'Une carte paysage encadrée de basalte qui révèle la Forge et sa lueur tellurique.',
    'epique', 'mythes-forge-share-card', '#43BFC1', 'banniere',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'mythes-forge-master-smith-title', 'titre_profil', 4,
    'Maître-Forge', 0, true,
    'Le titre Maître-Forge pour signer une collection façonnée dans les Failles.',
    'epique', 'mythes-forge-master-smith-title', '#F06A3A', 'titre_supporter',
    'clutch-originals', 'mythes-forge', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
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
  'mythes-forge',
  'Pack Mythes de la Forge',
  'Douze cosmétiques originaux façonnés dans le basalte, le cuivre et la braise.',
  1200,
  12,
  true,
  'publie',
  'clutch-originals',
  'mythes-forge',
  '#F06A3A',
  '{"type":"originale","titulaire":"Clutch"}'::jsonb
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
  ('mythes-forge', 'mythes-forge-room', 'vitrine_eclairage', 1, true),
  ('mythes-forge', 'mythes-forge-armor-orea', 'vitrine_maillot', 2, true),
  ('mythes-forge', 'mythes-forge-ember-sigil', 'apparence_core', 3, true),
  ('mythes-forge', 'mythes-forge-strata-banner', 'carte_profil', 4, false),
  ('mythes-forge', 'mythes-forge-magma-pedestals', 'vitrine_supports', 5, true),
  ('mythes-forge', 'mythes-forge-telluric-token', 'apparence_core', 6, false),
  ('mythes-forge', 'mythes-forge-basalt-totem', 'apparence_core', 7, false),
  ('mythes-forge', 'mythes-forge-artisan-badge', 'apparence_core', 8, false),
  ('mythes-forge', 'mythes-forge-rift-frame', 'cadre_profil', 9, true),
  ('mythes-forge', 'mythes-forge-resonance-effect', 'effet_faction', 10, true),
  ('mythes-forge', 'mythes-forge-share-card', 'carte_profil', 11, true),
  ('mythes-forge', 'mythes-forge-master-smith-title', 'titre_profil', 12, true)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

-- Keep catalogue reads authenticated and all mutations behind the audited RPCs.
revoke all privileges on table public.packs_cosmetiques
from public, anon, authenticated, service_role;
revoke all privileges on table public.pack_cosmetique_membres
from public, anon, authenticated, service_role;
revoke all privileges on table public.inventaire_packs_cosmetiques
from public, anon, authenticated, service_role;

grant select on table public.packs_cosmetiques
to authenticated;
grant select on table public.pack_cosmetique_membres
to authenticated;
grant select on table public.inventaire_packs_cosmetiques
to authenticated;

grant select, insert, update, delete on table public.packs_cosmetiques
to service_role;
grant select, insert, update, delete on table public.pack_cosmetique_membres
to service_role;
grant select, insert, update, delete on table public.inventaire_packs_cosmetiques
to service_role;

revoke all privileges on function public.clutch_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_acheter_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_pack_cosmetique_v1(text)
to authenticated, service_role;

do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('mythes-forge');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'mythes-forge'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.collection_key = 'mythes-forge'
      and p.accent = '#F06A3A'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) then
    raise exception 'pack Mythes de la Forge publie incomplet';
  end if;

  if (
    select count(*)
    from public.packs_cosmetiques p
    where p.id in ('neon-protocol', 'mythes-forge')
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) <> 2 then
    raise exception 'les deux packs originaux ne sont pas publies ensemble';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'mythes-forge'
      and o.marque_key = 'clutch-originals'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'type' = 'originale'
      and o.licence ->> 'titulaire' = 'Clutch'
  ) <> 12 then
    raise exception 'catalogue Mythes de la Forge incomplet';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'mythes-forge'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'mythes-forge'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'mythes-forge'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou equipement du pack Mythes de la Forge incoherents';
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
  then
    raise exception 'privileges des packs cosmetiques incoherents';
  end if;
end;
$$;

commit;
