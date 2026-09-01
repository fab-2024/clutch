-- Original Pack Protocole Néon and editorial retirement of licensed packs.
--
-- Retiring a pack never deletes its immutable definition, members, inventory
-- grants or Volt ledger links. Existing owners keep every object and can still
-- equip the pack; only new acquisition and public catalogue discovery stop.

begin;

update public.packs_cosmetiques
set actif = false,
    statut_publication = 'retire',
    maj_le = pg_catalog.now()
where id in (
  'fnatic-black-orange',
  'kc-blue-wall',
  'm8-gentle-mates',
  'league-of-legends-collection',
  'valorant-collection',
  'rocket-league-collection'
);

update public.objets_catalogue
set actif = false,
    statut_publication = 'retire'
where collection_key in (
  'fnatic-black-orange',
  'kc-blue-wall',
  'm8-gentle-mates',
  'league-of-legends-collection',
  'valorant-collection',
  'rocket-league-collection'
);

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
    'neon-protocol-room', 'vitrine_eclairage', 5,
    'Salle Synapse', 0, true,
    'Une chambre orbitale graphite ouverte sur l''espace et soulignée de cyan néon.',
    'legendaire', 'neon-protocol-room', '#58DFFF', 'vitrine_eclairage',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-armor-vega', 'vitrine_maillot', 4,
    'Armure Vega', 0, true,
    'Une armure céramique ivoire sur exostructure graphite, traversée de lignes cyan.',
    'epique', 'neon-protocol-armor-vega', '#58DFFF', 'vitrine_maillot',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-glyph-node', 'apparence_core', 4,
    'Glyphe Nœud', 0, true,
    'Trois plaques ivoire convergent autour d''un nœud d''énergie magenta.',
    'epique', 'neon-protocol-glyph-node', '#E27AFF', 'core_clutch',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-banner-phase', 'carte_profil', 3,
    'Bannière Phase', 0, true,
    'Une bannière graphite portant le glyphe du Protocole et ses liserés de phase.',
    'rare', 'neon-protocol-banner-phase', '#58DFFF', 'banniere',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-vector-pedestals', 'vitrine_supports', 5,
    'Socle Vectoriel', 0, true,
    'Un réseau de socles en sustentation porté par des anneaux holographiques cyan.',
    'legendaire', 'neon-protocol-vector-pedestals', '#58DFFF', 'vitrine_supports',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-syn-token', 'apparence_core', 3,
    'Jeton Syn', 0, true,
    'Un jeton de circuit radial dont les pistes convergent vers un cristal magenta.',
    'rare', 'neon-protocol-syn-token', '#58DFFF', 'core_clutch',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-null-totem', 'apparence_core', 4,
    'Totem Null', 0, true,
    'Une colonne de modules graphite maintenus en équilibre par un flux cyan.',
    'epique', 'neon-protocol-null-totem', '#58DFFF', 'core_clutch',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-pioneer-badge', 'apparence_core', 4,
    'Badge Pionnier', 0, true,
    'Un badge octogonal cerclé d''une orbite métallique et signé du glyphe Nœud.',
    'epique', 'neon-protocol-pioneer-badge', '#E27AFF', 'core_clutch',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-phase-frame', 'cadre_profil', 4,
    'Cadre Phase', 0, true,
    'Un cadre graphite angulaire aux inserts cyan et à l''éclat magenta.',
    'epique', 'neon-protocol-phase-frame', '#58DFFF', 'cadre_avatar',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-impulse-effect', 'effet_faction', 5,
    'Effet Impulsion', 0, true,
    'Une impulsion cyan et magenta traverse la Vitrine avant de se stabiliser en halo.',
    'legendaire', 'neon-protocol-impulse-effect', '#54CFFF', 'signature_relique',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-share-card', 'carte_profil', 4,
    'Carte de partage', 0, true,
    'Une carte paysage qui met en scène la chambre Synapse et sa collection équipée.',
    'epique', 'neon-protocol-share-card', '#E27AFF', 'banniere',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'neon-protocol-architect-title', 'titre_profil', 4,
    'Architecte', 0, true,
    'Le titre Architecte pour signer les Vitrines conçues sous Protocole Néon.',
    'epique', 'neon-protocol-architect-title', '#58DFFF', 'titre_supporter',
    'clutch-originals', 'neon-protocol', 'team_pack', 'publie',
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
  'neon-protocol',
  'Pack Protocole Néon',
  'Douze cosmétiques originaux connus à l''avance pour construire la chambre Synapse.',
  1200,
  12,
  true,
  'publie',
  'clutch-originals',
  'neon-protocol',
  '#58DFFF',
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
  ('neon-protocol', 'neon-protocol-room', 'vitrine_eclairage', 1, true),
  ('neon-protocol', 'neon-protocol-armor-vega', 'vitrine_maillot', 2, true),
  ('neon-protocol', 'neon-protocol-glyph-node', 'apparence_core', 3, true),
  ('neon-protocol', 'neon-protocol-banner-phase', 'carte_profil', 4, false),
  ('neon-protocol', 'neon-protocol-vector-pedestals', 'vitrine_supports', 5, true),
  ('neon-protocol', 'neon-protocol-syn-token', 'apparence_core', 6, false),
  ('neon-protocol', 'neon-protocol-null-totem', 'apparence_core', 7, false),
  ('neon-protocol', 'neon-protocol-pioneer-badge', 'apparence_core', 8, false),
  ('neon-protocol', 'neon-protocol-phase-frame', 'cadre_profil', 9, true),
  ('neon-protocol', 'neon-protocol-impulse-effect', 'effet_faction', 10, true),
  ('neon-protocol', 'neon-protocol-share-card', 'carte_profil', 11, true),
  ('neon-protocol', 'neon-protocol-architect-title', 'titre_profil', 12, true)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

-- Reassert the Data API and RPC contract. Catalogue rows are readable only by
-- authenticated users; all mutations stay behind the audited pack RPCs.
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

comment on table public.packs_cosmetiques is
  'Deterministic cosmetic bundles. Retired definitions and permanent ownership are preserved; only published active packs are acquirable.';

do $$
begin
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('neon-protocol');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'neon-protocol'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.collection_key = 'neon-protocol'
      and p.accent = '#58DFFF'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) then
    raise exception 'pack Protocole Néon publié incomplet';
  end if;

  if (
    select count(*)
    from public.packs_cosmetiques p
    where p.id in (
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
      'league-of-legends-collection',
      'valorant-collection',
      'rocket-league-collection'
    )
      and not p.actif
      and p.statut_publication = 'retire'
  ) <> 6 then
    raise exception 'archivage editorial des anciens packs incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key in (
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
      'league-of-legends-collection',
      'valorant-collection',
      'rocket-league-collection'
    )
      and not o.actif
      and o.statut_publication = 'retire'
  ) <> 51 then
    raise exception 'archivage editorial des anciens objets incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'neon-protocol'
      and o.marque_key = 'clutch-originals'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'type' = 'originale'
      and o.licence ->> 'titulaire' = 'Clutch'
  ) <> 12 then
    raise exception 'catalogue Protocole Néon incomplet';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'neon-protocol'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'neon-protocol'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'neon-protocol'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou équipement du pack Protocole Néon incohérents';
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
end;
$$;

commit;
