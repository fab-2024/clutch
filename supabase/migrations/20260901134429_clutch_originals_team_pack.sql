-- Six fictional Clutch team identities published exclusively as an original
-- Boutique cosmetic pack. Competition teams, matches and rankings are untouched.

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
    'clutch-originals-nebula-rift-badge', 'apparence_core', 4,
    'Emblème Nebula Rift', 0, true,
    'L''étoile orbitale violette et cyan de Nebula Rift, conçue exclusivement pour Clutch.',
    'epique', 'clutch-originals-nebula-rift-badge', '#8257FF', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'clutch-originals-iron-comet-badge', 'apparence_core', 4,
    'Emblème Iron Comet', 0, true,
    'La comète d''acier et de braise d''Iron Comet, créée pour la ligue Clutch Originals.',
    'epique', 'clutch-originals-iron-comet-badge', '#FF641E', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'clutch-originals-polar-vector-badge', 'apparence_core', 4,
    'Emblème Polar Vector', 0, true,
    'Le vecteur polaire bleu glacier de Polar Vector, taillé comme un éclat de vitesse.',
    'epique', 'clutch-originals-polar-vector-badge', '#39C9FF', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'clutch-originals-vanta-six-badge', 'apparence_core', 4,
    'Emblème Vanta Six', 0, true,
    'Les facettes noir profond et vert acide de Vanta Six, assemblées en marque de précision.',
    'epique', 'clutch-originals-vanta-six-badge', '#C7F321', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'clutch-originals-solar-reign-badge', 'apparence_core', 4,
    'Emblème Solar Reign', 0, true,
    'L''éclipse ivoire, or et rouge profond de Solar Reign, pensée pour dominer la Vitrine.',
    'epique', 'clutch-originals-solar-reign-badge', '#F2B63F', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
    '{"type":"originale","titulaire":"Clutch"}'::jsonb, false
  ),
  (
    'clutch-originals-ghost-circuit-badge', 'apparence_core', 4,
    'Emblème Ghost Circuit', 0, true,
    'Le circuit spectral graphite, magenta et violet de Ghost Circuit, suspendu dans un halo numérique.',
    'epique', 'clutch-originals-ghost-circuit-badge', '#E835A9', 'core_clutch',
    'clutch-originals', 'clutch-originals-teams', 'team_pack', 'publie',
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
  'clutch-originals-teams',
  'Pack Clutch Originals',
  'Les six emblèmes des équipes fictives Clutch réunis dans une collection originale.',
  900,
  6,
  true,
  'publie',
  'clutch-originals',
  'clutch-originals-teams',
  '#35D7FF',
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
  ('clutch-originals-teams', 'clutch-originals-nebula-rift-badge', 'apparence_core', 1, true),
  ('clutch-originals-teams', 'clutch-originals-iron-comet-badge', 'apparence_core', 2, false),
  ('clutch-originals-teams', 'clutch-originals-polar-vector-badge', 'apparence_core', 3, false),
  ('clutch-originals-teams', 'clutch-originals-vanta-six-badge', 'apparence_core', 4, false),
  ('clutch-originals-teams', 'clutch-originals-solar-reign-badge', 'apparence_core', 5, false),
  ('clutch-originals-teams', 'clutch-originals-ghost-circuit-badge', 'apparence_core', 6, false)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

-- Preserve the established least-privilege Data API and RPC contract.
alter table public.packs_cosmetiques enable row level security;
alter table public.pack_cosmetique_membres enable row level security;
alter table public.inventaire_packs_cosmetiques enable row level security;

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
  perform private.clutch_assert_pack_cosmetique_acquerable_v1('clutch-originals-teams');

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'clutch-originals-teams'
      and p.prix_volts = 900
      and p.nombre_objets = 6
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'clutch-originals'
      and p.collection_key = 'clutch-originals-teams'
      and p.licence ->> 'type' = 'originale'
      and p.licence ->> 'titulaire' = 'Clutch'
  ) then
    raise exception 'pack Clutch Originals publie incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'clutch-originals-teams'
      and o.marque_key = 'clutch-originals'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'type' = 'originale'
      and o.licence ->> 'titulaire' = 'Clutch'
  ) <> 6 then
    raise exception 'catalogue Clutch Originals incomplet';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'clutch-originals-teams'
  ) <> 6
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'clutch-originals-teams'
      and m.equip_by_default
  ) <> 1
  then
    raise exception 'membres ou équipement par défaut du pack Clutch Originals incohérents';
  end if;

  if exists (
    select 1
    from public.packs_cosmetiques p
    where p.id in (
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
      'league-of-legends-collection',
      'valorant-collection',
      'rocket-league-collection'
    )
      and p.actif
      and p.statut_publication = 'publie'
  ) then
    raise exception 'un pack sous licence archivé a été republié';
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
  ) <> 3
     or has_table_privilege('anon', 'public.packs_cosmetiques', 'SELECT')
     or has_table_privilege('authenticated', 'public.packs_cosmetiques', 'INSERT')
     or not has_table_privilege('authenticated', 'public.packs_cosmetiques', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
  then
    raise exception 'contrat RLS, Data API ou RPC des packs cosmétiques incohérent';
  end if;
end;
$$;

commit;
