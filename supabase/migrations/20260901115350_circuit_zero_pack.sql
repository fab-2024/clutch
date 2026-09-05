-- Original Pack Circuit Zero.
-- Protocole Neon and Mythes de la Forge remain published;
-- licensed packs remain retired and intact.

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
    'circuit-zero-room', 'vitrine_eclairage', 5,
    'Hangar Vectoriel', 0, true,
    'Un tunnel d''essai graphite et ivoire où chaque station suit la trajectoire du Kairos-6.',
    'legendaire', 'circuit-zero-room', '#C7F000', 'vitrine_eclairage',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-kairos-6', 'vitrine_maillot', 4,
    'Kairos-6', 0, true,
    'Un prototype à six roues conçu pour fendre l''air et laisser un sillage vert acide.',
    'epique', 'circuit-zero-kairos-6', '#EDE5D7', 'vitrine_maillot',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-zero-glyph', 'apparence_core', 4,
    'Glyphe Zéro', 0, true,
    'Un anneau ouvert entre deux ailettes graphite, ponctué d''un nœud magenta.',
    'epique', 'circuit-zero-zero-glyph', '#C7F000', 'core_clutch',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-sector-banner', 'carte_profil', 3,
    'Bannière Secteur', 0, true,
    'Une bannière d''essai graphite traversée de repères ivoire, lime et magenta.',
    'rare', 'circuit-zero-sector-banner', '#C7F000', 'banniere',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-aero-pedestals', 'vitrine_supports', 5,
    'Socle Aéro', 0, true,
    'Sept stations techniques réparties dans le tunnel selon une grille aérodynamique.',
    'legendaire', 'circuit-zero-aero-pedestals', '#C7F000', 'vitrine_supports',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-chrono-token', 'apparence_core', 3,
    'Jeton Chrono', 0, true,
    'Un instrument circulaire qui conserve le meilleur temps d''un secteur parfait.',
    'rare', 'circuit-zero-chrono-token', '#EA4FC9', 'core_clutch',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-delta-totem', 'apparence_core', 4,
    'Totem Delta', 0, true,
    'Des profils d''aile superposés autour d''un axe de mesure magenta.',
    'epique', 'circuit-zero-delta-totem', '#C7F000', 'core_clutch',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-pilot-badge', 'apparence_core', 4,
    'Badge Pilote', 0, true,
    'Un insigne de pilote à boucle ouverte, usiné dans l''ivoire et le graphite.',
    'epique', 'circuit-zero-pilot-badge', '#EA4FC9', 'core_clutch',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-wake-frame', 'cadre_profil', 4,
    'Cadre Sillage', 0, true,
    'Un cadre graphite dont les angles capturent une traînée lime et magenta.',
    'epique', 'circuit-zero-wake-frame', '#C7F000', 'cadre_avatar',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-afterimage-effect', 'effet_faction', 5,
    'Effet Postimage', 0, true,
    'Trois silhouettes du Kairos-6 traversent la Vitrine avant de fusionner sur la ligne de mesure.',
    'legendaire', 'circuit-zero-afterimage-effect', '#C7F000', 'signature_relique',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-share-card', 'carte_profil', 4,
    'Carte de partage', 0, true,
    'Une carte paysage qui capture le Kairos-6 lancé dans le Hangar Vectoriel.',
    'epique', 'circuit-zero-share-card', '#EA4FC9', 'banniere',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'circuit-zero-chrononaut-title', 'titre_profil', 4,
    'Chrononaute', 0, true,
    'Le titre Chrononaute pour celles et ceux qui vivent une fraction de seconde en avance.',
    'epique', 'circuit-zero-chrononaut-title', '#C7F000', 'titre_supporter',
    'clutch-originals', 'circuit-zero', 'team_pack', 'publie',
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
  'circuit-zero',
  'Pack Circuit Zéro',
  'Douze cosmétiques originaux issus d''un programme aérodynamique ivoire, graphite et vert acide.',
  1200,
  12,
  true,
  'publie',
  'clutch-originals',
  'circuit-zero',
  '#C7F000',
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
  ('circuit-zero', 'circuit-zero-room', 'vitrine_eclairage', 1, true),
  ('circuit-zero', 'circuit-zero-kairos-6', 'vitrine_maillot', 2, true),
  ('circuit-zero', 'circuit-zero-zero-glyph', 'apparence_core', 3, true),
  ('circuit-zero', 'circuit-zero-sector-banner', 'carte_profil', 4, false),
  ('circuit-zero', 'circuit-zero-aero-pedestals', 'vitrine_supports', 5, true),
  ('circuit-zero', 'circuit-zero-chrono-token', 'apparence_core', 6, false),
  ('circuit-zero', 'circuit-zero-delta-totem', 'apparence_core', 7, false),
  ('circuit-zero', 'circuit-zero-pilot-badge', 'apparence_core', 8, false),
  ('circuit-zero', 'circuit-zero-wake-frame', 'cadre_profil', 9, true),
  ('circuit-zero', 'circuit-zero-afterimage-effect', 'effet_faction', 10, true),
  ('circuit-zero', 'circuit-zero-share-card', 'carte_profil', 11, true),
  ('circuit-zero', 'circuit-zero-chrononaut-title', 'titre_profil', 12, true)
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
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('circuit-zero');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'circuit-zero'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.collection_key = 'circuit-zero'
      and p.accent = '#C7F000'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) then
    raise exception 'pack Circuit Zero publie incomplet';
  end if;

  if (
    select count(*)
    from public.packs_cosmetiques p
    where p.id in ('neon-protocol', 'mythes-forge', 'circuit-zero')
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) <> 3 then
    raise exception 'les trois packs originaux ne sont pas publies ensemble';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'circuit-zero'
      and o.marque_key = 'clutch-originals'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'type' = 'originale'
      -- The visible-brand trigger normalises catalogue licences to GRIFF.
      and o.licence ->> 'titulaire' = 'GRIFF'
  ) <> 12 then
    raise exception 'catalogue Circuit Zero incomplet';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'circuit-zero'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'circuit-zero'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'circuit-zero'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou equipement du pack Circuit Zero incoherents';
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
