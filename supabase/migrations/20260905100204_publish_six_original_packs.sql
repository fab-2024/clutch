-- Six new Clutch Originals packs. Every pack exposes twelve fixed cosmetics,
-- is purchased atomically and equips one default per supported cosmetic slot.

begin;

create temporary table clutch_original_pack_seed (
  id text primary key,
  nom text not null,
  description text not null,
  accent text not null,
  items jsonb not null
) on commit drop;

insert into clutch_original_pack_seed (id, nom, description, accent, items) values
  (
    'sang-des-titans',
    'Pack Sang des Titans',
    'Douze cosmétiques originaux forgés pour les gardiens d’un pacte titanesque.',
    '#B98957',
    $items$[
      {"slug":"room","name":"Salle du Dernier Pacte","description":"Un sanctuaire monumental suspendu entre chaînes, pierre claire et métal patiné."},
      {"slug":"oath-armor","name":"Cuirasse des Serments","description":"Une armure cérémonielle d’ivoire et de bronze destinée aux porteurs du pacte."},
      {"slug":"eclipse-axe","name":"Hache de l’Éclipse","description":"Une hache double dont le fil sombre encadre un éclat d’énergie cyan.","accent":"#55D7DF"},
      {"slug":"pact-banner","name":"Bannière du Pacte","description":"Une bannière grenat marquée du sceau fendu des Titans."},
      {"slug":"monolith-pedestal","name":"Socle Monolithe","description":"Un ensemble de socles massifs taillés pour supporter les reliques les plus lourdes."},
      {"slug":"tribute-token","name":"Jeton du Tribut","description":"Un disque antique serti de trois pierres grenat, témoin du tribut rendu."},
      {"slug":"three-voices-totem","name":"Totem des Trois Voix","description":"Trois anneaux minéraux gravitent autour d’un axe rituel de bronze."},
      {"slug":"rift-bearer-badge","name":"Badge Porte-Faille","description":"Un insigne hexagonal traversé par la lame azur du pacte.","accent":"#55D7DF"},
      {"slug":"colossi-frame","name":"Cadre des Colosses","description":"Un cadre de bronze renforcé par quatre angles de pierre et de cuir grenat."},
      {"slug":"titan-wave-effect","name":"Effet Onde Titanide","description":"Une onde tellurique soulève des éclats de roche dans un cercle cyan.","accent":"#55D7DF"},
      {"slug":"last-pact-card","name":"Carte Dernier Pacte","description":"Une carte de partage qui révèle le sanctuaire et ses reliques titanesques."},
      {"slug":"oath-bearer-title","name":"Titre Porte-Serment","description":"Le titre « Porte-Serment » pour celles et ceux qui n’abandonnent jamais le pacte."}
    ]$items$::jsonb
  ),
  (
    'chute-libre',
    'Pack Chute Libre',
    'Douze cosmétiques originaux pour les éclaireurs qui vivent au bord du vide.',
    '#FF6A55',
    $items$[
      {"slug":"room","name":"Belvédère Nomade","description":"Une plateforme mobile ouverte sur les canyons et les routes aériennes."},
      {"slug":"falcon-jetpack","name":"Aéropack Falcon","description":"Un double propulseur d’exploration conçu pour les descentes les plus verticales."},
      {"slug":"loot-capsule","name":"Capsule de Butin","description":"Une capsule blindée qui protège les trouvailles ramenées des sommets."},
      {"slug":"ascent-banner","name":"Bannière Escalade","description":"Une bannière corail frappée du symbole des voyageurs de haute altitude."},
      {"slug":"drop-pedestal","name":"Socle de Largage","description":"Des plateformes techniques inspirées des zones de largage nomades."},
      {"slug":"survivor-token","name":"Jeton Survivant","description":"Une médaille d’acier gravée pour celles et ceux qui reviennent du dernier cercle."},
      {"slug":"summit-beacon","name":"Balise Sommet","description":"Une balise de navigation qui marque le point le plus haut de l’expédition."},
      {"slug":"scout-badge","name":"Badge Éclaireur","description":"L’insigne ailé des premiers arrivés sur la zone de largage."},
      {"slug":"altitude-frame","name":"Cadre Altitude","description":"Un cadre technique ivoire et corail renforcé pour les environnements extrêmes."},
      {"slug":"last-circle-effect","name":"Effet Dernier Cercle","description":"Deux trajectoires lumineuses se resserrent autour d’une ultime zone sûre.","accent":"#FFB34D"},
      {"slug":"share-card","name":"Carte de Partage","description":"Une carte paysage qui capture le Belvédère Nomade au-dessus des canyons."},
      {"slug":"untouchable-title","name":"Titre Insaisissable","description":"Le titre « Insaisissable » pour les explorateurs toujours hors de portée."}
    ]$items$::jsonb
  ),
  (
    'serment-du-givre',
    'Pack Serment du Givre',
    'Douze cosmétiques originaux gardés par le dragon des cimes éternelles.',
    '#9BCFFF',
    $items$[
      {"slug":"room","name":"Bastion des Cimes","description":"Une forteresse de pierre bleue ouverte sur les glaciers et les sommets."},
      {"slug":"veyr-dragon","name":"Dragon Veyr","description":"Le gardien ailé des cimes, façonné dans l’acier sombre et la glace azur."},
      {"slug":"snow-compass","name":"Boussole des Neiges","description":"Une boussole d’expédition dont l’aiguille pointe vers le cristal du Givre."},
      {"slug":"oath-banner","name":"Bannière du Serment","description":"Une bannière bleu nuit portant le cristal ailé des veilleurs."},
      {"slug":"ice-sheet-pedestal","name":"Socle Banquise","description":"Des plateformes minérales recouvertes d’une pellicule de glace vive."},
      {"slug":"cold-breath-token","name":"Jeton Souffle-Froid","description":"Un jeton d’argent gravé du profil de Veyr et serti d’un éclat azur."},
      {"slug":"summit-egg","name":"Œuf des Cimes","description":"Un cristal ancestral protégé par un berceau de roche gelée."},
      {"slug":"watcher-badge","name":"Badge Veilleur","description":"L’insigne d’acier et de glace des gardiens du Bastion."},
      {"slug":"rampart-frame","name":"Cadre Rempart","description":"Un cadre de pierre sombre renforcé de métal givré."},
      {"slug":"first-frost-effect","name":"Effet Premier Givre","description":"Une fracture glacée se propage sous une pluie d’éclats de neige."},
      {"slug":"summit-card","name":"Carte des Cimes","description":"Une carte de partage qui révèle Veyr au cœur du Bastion gelé."},
      {"slug":"frost-guard-title","name":"Titre Garde-Givre","description":"Le titre « Garde-Givre » pour les protecteurs du Serment."}
    ]$items$::jsonb
  ),
  (
    'conclave-arcanique',
    'Pack Conclave Arcanique',
    'Douze cosmétiques originaux où la pierre claire rencontre la magie florale.',
    '#BE8BE8',
    $items$[
      {"slug":"room","name":"Clairière du Conclave","description":"Une clairière suspendue bordée d’arches, de fleurs et de cascades lointaines."},
      {"slug":"brumousse","name":"Brumousse","description":"Un familier végétal au regard curieux, couronné de feuilles et de cristaux violets."},
      {"slug":"conclave-seal","name":"Sceau du Conclave","description":"Un cristal violet protégé par deux rameaux d’or arcanique."},
      {"slug":"bloom-banner","name":"Bannière Floraison","description":"Une bannière vert sauge brodée du sceau floral du Conclave.","accent":"#98AA72"},
      {"slug":"rosette-pedestal","name":"Socle Rosace","description":"Des socles de pierre claire gravés d’une rosace et sertis de gemmes violettes."},
      {"slug":"omen-token","name":"Jeton Présage","description":"Un médaillon vert minéral parcouru de rameaux dorés.","accent":"#98AA72"},
      {"slug":"bud-totem","name":"Totem Bourgeon","description":"Une pousse torsadée protège un cristal prêt à éclore."},
      {"slug":"guardian-badge","name":"Badge Gardien","description":"Un écu végétal serti du cristal du Conclave."},
      {"slug":"trellis-frame","name":"Cadre Treille","description":"Un cadre de pierre claire envahi par une treille dorée et vivante."},
      {"slug":"hatching-effect","name":"Effet Éclosion","description":"Des pétales violets et des filaments d’or dessinent une floraison lumineuse."},
      {"slug":"conclave-card","name":"Carte du Conclave","description":"Une carte de partage où Brumousse veille sur la clairière équipée."},
      {"slug":"spell-weaver-title","name":"Titre Tisse-Sorts","description":"Le titre « Tisse-Sorts » pour les architectes de la magie vivante."}
    ]$items$::jsonb
  ),
  (
    'turbo-arena',
    'Pack Turbo Arena',
    'Douze cosmétiques originaux pour transformer la Vitrine en arène suralimentée.',
    '#FF8A24',
    $items$[
      {"slug":"room","name":"Dôme Turbo","description":"Un garage panoramique ouvert sur une arène éclairée pour les prolongations.","accent":"#4DA8FF"},
      {"slug":"comet-car","name":"Bolide Comète","description":"Un bolide bleu et orange préparé pour les accélérations de dernière seconde."},
      {"slug":"orbital-ball","name":"Ballon Orbital","description":"Un ballon d’arène métallique maintenu en suspension sur son socle.","accent":"#4DA8FF"},
      {"slug":"overtime-banner","name":"Bannière Overtime","description":"Une bannière bleu profond marquée par la trajectoire d’une comète.","accent":"#4DA8FF"},
      {"slug":"kickoff-pedestal","name":"Socle Kickoff","description":"Des plateformes gazonnées tracées comme le rond central d’une arène."},
      {"slug":"vortex-wheel","name":"Roue Vortex","description":"Une roue de compétition au moyeu bleu et aux flancs graphite.","accent":"#4DA8FF"},
      {"slug":"aerial-trophy","name":"Trophée Aérien","description":"Un trophée orbital qui célèbre les actions conclues dans les airs."},
      {"slug":"striker-badge","name":"Badge Striker","description":"L’insigne hexagonal des attaquants qui frappent avant le buzzer.","accent":"#4DA8FF"},
      {"slug":"boost-frame","name":"Cadre Boost","description":"Un cadre bleu renforcé par une capsule de propulsion orange.","accent":"#4DA8FF"},
      {"slug":"surtempo-effect","name":"Effet Surtempo","description":"Deux ballons d’énergie tracent une orbite de feu et de plasma bleu."},
      {"slug":"share-card","name":"Carte de Partage","description":"Une carte paysage qui met le Bolide Comète en scène dans le Dôme Turbo."},
      {"slug":"last-second-title","name":"Titre Dernière Seconde","description":"Le titre « Dernière Seconde » pour les spécialistes des retournements tardifs."}
    ]$items$::jsonb
  ),
  (
    'dernier-round',
    'Pack Dernier Round',
    'Douze cosmétiques originaux pour une escouade qui joue chaque round jusqu’au bout.',
    '#FF5D4D',
    $items$[
      {"slug":"room","name":"Base Avancée","description":"Une armurerie tactique installée au cœur d’un quartier d’entraînement."},
      {"slug":"sentinel-helmet","name":"Casque Sentinelle","description":"Un casque balistique noir et ivoire traversé par une visière rouge."},
      {"slug":"vector-carbine","name":"Carabine Vector","description":"Une carabine compacte rouge et graphite montée sur son présentoir blindé."},
      {"slug":"squad-banner","name":"Bannière Escouade","description":"Une bannière tactique marquée du monogramme du Dernier Round."},
      {"slug":"extraction-pedestal","name":"Socle Extraction","description":"Des plateformes blindées guidées par un signal rouge de sécurisation."},
      {"slug":"match-point-token","name":"Jeton Match Point","description":"Un jeton d’acier marqué du point décisif et de sa ligne rouge."},
      {"slug":"scout-drone","name":"Drone Éclaireur","description":"Un drone quadrupède chargé de lire les angles avant l’escouade.","accent":"#7FE8DB"},
      {"slug":"operator-badge","name":"Badge Opérateur","description":"L’insigne géométrique des opérateurs qui gardent leur sang-froid."},
      {"slug":"ballistic-frame","name":"Cadre Balistique","description":"Un cadre renforcé noir et ivoire verrouillé par une attache rouge."},
      {"slug":"scan-effect","name":"Effet Balayage","description":"Une grille tactique tridimensionnelle révèle un signal triangulaire hostile.","accent":"#7FE8DB"},
      {"slug":"share-card","name":"Carte de Partage","description":"Une carte paysage qui présente l’escouade et son équipement dans la Base Avancée."},
      {"slug":"cold-blood-title","name":"Titre Sang-Froid","description":"Le titre « Sang-Froid » pour les joueurs qui restent lucides au dernier round."}
    ]$items$::jsonb
  );

create temporary table clutch_original_item_blueprint (
  ordre integer primary key,
  emplacement text not null,
  niveau integer not null,
  rarete text not null,
  famille text not null,
  equip_by_default boolean not null
) on commit drop;

insert into clutch_original_item_blueprint values
  (1, 'vitrine_eclairage', 5, 'legendaire', 'vitrine_eclairage', true),
  (2, 'vitrine_maillot', 4, 'epique', 'vitrine_maillot', true),
  (3, 'apparence_core', 4, 'epique', 'core_clutch', true),
  (4, 'carte_profil', 3, 'rare', 'banniere', false),
  (5, 'vitrine_supports', 5, 'legendaire', 'vitrine_supports', true),
  (6, 'apparence_core', 3, 'rare', 'core_clutch', false),
  (7, 'apparence_core', 4, 'epique', 'core_clutch', false),
  (8, 'apparence_core', 4, 'epique', 'core_clutch', false),
  (9, 'cadre_profil', 4, 'epique', 'cadre_avatar', true),
  (10, 'effet_faction', 5, 'legendaire', 'signature_relique', true),
  (11, 'carte_profil', 4, 'epique', 'banniere', true),
  (12, 'titre_profil', 4, 'epique', 'titre_supporter', true);

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
)
select
  p.id || '-' || (item.value ->> 'slug'),
  blueprint.emplacement,
  blueprint.niveau,
  item.value ->> 'name',
  0,
  true,
  item.value ->> 'description',
  blueprint.rarete,
  p.id || '-' || (item.value ->> 'slug'),
  coalesce(nullif(item.value ->> 'accent', ''), p.accent),
  blueprint.famille,
  'clutch-originals',
  p.id,
  'team_pack',
  'publie',
  '{"type":"originale","titulaire":"Clutch"}'::jsonb,
  false
from clutch_original_pack_seed p
cross join lateral jsonb_array_elements(p.items) with ordinality as item(value, ordre)
join clutch_original_item_blueprint blueprint
  on blueprint.ordre = item.ordre::integer
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
)
select
  id,
  nom,
  description,
  1200,
  12,
  true,
  'publie',
  'clutch-originals',
  id,
  accent,
  '{"type":"originale","titulaire":"Clutch"}'::jsonb
from clutch_original_pack_seed
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
)
select
  p.id,
  p.id || '-' || (item.value ->> 'slug'),
  blueprint.emplacement,
  item.ordre::integer,
  blueprint.equip_by_default
from clutch_original_pack_seed p
cross join lateral jsonb_array_elements(p.items) with ordinality as item(value, ordre)
join clutch_original_item_blueprint blueprint
  on blueprint.ordre = item.ordre::integer
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
declare
  v_pack_id text;
begin
  for v_pack_id in select id from clutch_original_pack_seed loop
    perform private.clutch_assert_pack_cosmetique_acquerable_v1(v_pack_id);

    if not exists (
      select 1
      from public.packs_cosmetiques p
      where p.id = v_pack_id
        and p.prix_volts = 1200
        and p.nombre_objets = 12
        and p.actif
        and p.statut_publication = 'publie'
        and p.marque_key = 'clutch-originals'
        and p.collection_key = v_pack_id
        and p.licence ->> 'type' = 'originale'
        and p.licence ->> 'titulaire' = 'Clutch'
    ) then
      raise exception 'pack original % publie incomplet', v_pack_id;
    end if;

    if (
      select count(*)
      from public.objets_catalogue o
      where o.collection_key = v_pack_id
        and o.marque_key = 'clutch-originals'
        and o.source = 'team_pack'
        and o.prix = 0
        and o.actif
        and o.statut_publication = 'publie'
        and o.licence ->> 'type' = 'originale'
        -- The visible-brand trigger normalises catalogue licences to GRIFF.
        and o.licence ->> 'titulaire' = 'GRIFF'
    ) <> 12 then
      raise exception 'catalogue du pack original % incomplet', v_pack_id;
    end if;

    if (
      select count(*)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
    ) <> 12
       or (
      select count(*)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
        and m.equip_by_default
    ) <> 8
       or (
      select count(distinct m.emplacement)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
        and m.equip_by_default
    ) <> 8
    then
      raise exception 'membres ou equipement du pack original % incoherents', v_pack_id;
    end if;
  end loop;

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
