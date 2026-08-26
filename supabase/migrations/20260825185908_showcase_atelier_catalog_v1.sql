-- Boutique // Vitrine — Atelier.
-- Extends the existing cosmetic catalogue, inventory, equipment and Volt
-- ledger. No parallel ownership model is introduced.

begin;

-- Atelier collections can contain more than the four historical presentation
-- tiers. `niveau` remains an ordering hint, while price/default eligibility is
-- still enforced by the dedicated acquisition constraints below.
alter table public.objets_catalogue
  drop constraint if exists objets_catalogue_niveau_check;

alter table public.objets_catalogue
  add constraint objets_catalogue_niveau_check
  check (niveau between 1 and 99);

alter table public.objets_catalogue
  drop constraint if exists objets_catalogue_famille_check;

alter table public.objets_catalogue
  add constraint objets_catalogue_famille_check
  check (
    famille is null
    or famille in (
      'cadre_avatar',
      'banniere',
      'titre_supporter',
      'signature_relique',
      'core_clutch',
      'vitrine_materiau',
      'vitrine_eclairage',
      'vitrine_supports',
      'vitrine_maillot'
    )
  );

create or replace function public.clutch_contrat_monetisation_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 3,
    'code', 'identity_showcase_founder_v3',
    'promesse', 'L’identité du supporter. Jamais ses performances.',
    'devises', jsonb_build_object(
      'frags', jsonb_build_object(
        'usage', 'classement_competitif',
        'achetables', false,
        'depensables', false,
        'convertibles_depuis_volts', false
      ),
      'volts', jsonb_build_object(
        'usage', 'cosmetiques_uniquement',
        'achat_reel_actif', false,
        'expiration', false,
        'conversion_frags', false
      )
    ),
    'catalogue', jsonb_build_object(
      'schema_version', 3,
      'emplacements', jsonb_build_array(
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil',
        'vitrine_materiau',
        'vitrine_eclairage',
        'vitrine_supports',
        'vitrine_maillot'
      ),
      'familles_initiales', jsonb_build_array(
        'cadre_avatar',
        'banniere',
        'titre_supporter',
        'signature_relique'
      ),
      'extensions', jsonb_build_array(
        'core_clutch',
        'vitrine_materiau',
        'vitrine_eclairage',
        'vitrine_supports',
        'vitrine_maillot'
      ),
      'familles_par_emplacement', jsonb_build_object(
        'cadre_profil', 'cadre_avatar',
        'carte_profil', 'banniere',
        'titre_profil', 'titre_supporter',
        'effet_faction', 'signature_relique',
        'apparence_core', 'core_clutch',
        'vitrine_materiau', 'vitrine_materiau',
        'vitrine_eclairage', 'vitrine_eclairage',
        'vitrine_supports', 'vitrine_supports',
        'vitrine_maillot', 'vitrine_maillot'
      ),
      'sources', jsonb_build_array(
        'gratuit',
        'mission',
        'partenaire',
        'achat',
        'founder_pack'
      ),
      'objets_aleatoires_payants', false,
      'objets_possedes_expirent', false,
      'effets_competitifs', false,
      'achat_idempotent', true
    ),
    'partenaires', jsonb_build_object(
      'recompense', 'participation_uniquement',
      'justesse_pronostic_recompensee', false,
      'donnees_personnelles_exposees', false
    ),
    'paiements', jsonb_build_object(
      'actifs', true,
      'biens_numeriques_via_stores', true,
      'validateur', 'revenuecat',
      'founder_pack', jsonb_build_object(
        'actif', true,
        'type', 'non_consumable',
        'produit_id', 'clutch_founder_pack_v1',
        'droit_id', 'founder_pack',
        'offre_id', 'founder_launch',
        'prix_cible_eur', 4.99,
        'prix_affiche_depuis_store', true,
        'restauration', true,
        'remboursements', true,
        'volts_inclus', 0
      ),
      'packs_volts_actifs', false
    ),
    'regles', jsonb_build_array(
      jsonb_build_object(
        'id', 'competitive-integrity',
        'label', 'FRAGS INACHETABLES',
        'detail', 'Le rating, le rang et les résultats de Calls ne s’achètent jamais.'
      ),
      jsonb_build_object(
        'id', 'cosmetics-only',
        'label', 'IDENTITÉ UNIQUEMENT',
        'detail', 'Les Volts ne débloquent que des objets visuels connus à l’avance.'
      ),
      jsonb_build_object(
        'id', 'no-randomness',
        'label', 'AUCUNE LOOT BOX',
        'detail', 'Chaque objet obtenu est connu avant la dépense.'
      ),
      jsonb_build_object(
        'id', 'permanent-ownership',
        'label', 'OBJETS PERMANENTS',
        'detail', 'Un objet possédé reste disponible et équipable sans expiration.'
      ),
      jsonb_build_object(
        'id', 'partner-participation',
        'label', 'PARTICIPATION, PAS JUSTESSE',
        'detail', 'Une activation partenaire récompense une action, jamais un bon pronostic.'
      )
    )
  );
$$;

comment on function public.clutch_contrat_monetisation_v1() is
  'Monetization contract v3. Adds four visual showcase slots while preserving Founder Pack, permanent ownership and competitive integrity.';

revoke all privileges on function public.clutch_contrat_monetisation_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_monetisation_v1()
to anon, authenticated, service_role;

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
  collection_key,
  source,
  statut_publication,
  licence,
  est_inclus
) values
  ('material_graphite', 'vitrine_materiau', 1, 'Graphite mat', 0, true,
    'Un graphite profond aux reflets froids qui laisse la collection dominer.',
    'commun', 'material_graphite', '#7B8791', 'vitrine_materiau', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('material_steel', 'vitrine_materiau', 2, 'Acier brossé', 120, true,
    'Des panneaux d’acier clair, striés et polis par une lumière d’atelier.',
    'rare', 'material_steel', '#B8C5CE', 'vitrine_materiau', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('material_bronze', 'vitrine_materiau', 3, 'Bronze noir', 180, true,
    'Un bronze patiné presque noir, relevé de chanfreins cuivre discrets.',
    'rare', 'material_bronze', '#B4774E', 'vitrine_materiau', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('material_carbon', 'vitrine_materiau', 4, 'Carbone compétition', 220, true,
    'Une peau carbone sombre et technique inspirée des équipements de compétition.',
    'epique', 'material_carbon', '#68737C', 'vitrine_materiau', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('material_smoked_glass', 'vitrine_materiau', 5, 'Verre fumé', 260, true,
    'Une façade de verre froid et fumé qui ajoute profondeur et reflets bleutés.',
    'epique', 'material_smoked_glass', '#6A9CB5', 'vitrine_materiau', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),

  ('lighting_acid', 'vitrine_eclairage', 1, 'Acide GRIFF', 80, true,
    'Une lumière jaune acide concentrée sur les arêtes et les objets exposés.',
    'rare', 'lighting_acid', '#E8FF3D', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_cyan', 'vitrine_eclairage', 2, 'Cryo cyan', 0, true,
    'Le faisceau cyan froid installé par défaut dans la Vitrine GRIFF.',
    'commun', 'lighting_cyan', '#31D7E2', 'vitrine_eclairage', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('lighting_violet', 'vitrine_eclairage', 3, 'Nova violet', 100, true,
    'Un violet profond qui révèle les volumes sans transformer la pièce en néon.',
    'rare', 'lighting_violet', '#9A6BFF', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_amber', 'vitrine_eclairage', 4, 'Victoire ambre', 100, true,
    'Un éclairage ambre chaud pensé pour les trophées et les finitions bronze.',
    'rare', 'lighting_amber', '#E2B25D', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_white', 'vitrine_eclairage', 5, 'Arène blanche', 80, true,
    'Une lumière blanche franche, équilibrée comme une présentation d’arène.',
    'rare', 'lighting_white', '#F1F4F4', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),

  ('supports_forge', 'vitrine_supports', 1, 'Forge', 220, true,
    'Des socles lourds aux liserés bronze, conçus comme des pièces d’atelier.',
    'epique', 'supports_forge', '#B4774E', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('supports_gallery', 'vitrine_supports', 2, 'Galerie', 0, true,
    'Des supports noirs minimalistes qui concentrent le regard sur la collection.',
    'commun', 'supports_gallery', '#8A959E', 'vitrine_supports', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('supports_halo', 'vitrine_supports', 3, 'Halo', 280, true,
    'Des anneaux cyan sous chaque pièce pour une suspension visuelle maîtrisée.',
    'epique', 'supports_halo', '#31D7E2', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),

  ('jersey_locker', 'vitrine_maillot', 1, 'Vestiaire', 0, true,
    'Le maillot suspendu dans un vestiaire sombre, sobre et immédiatement lisible.',
    'commun', 'jersey_locker', '#7B8791', 'vitrine_maillot', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('jersey_gallery', 'vitrine_maillot', 2, 'Galerie', 200, true,
    'Une présentation encadrée comme une pièce historique de la collection.',
    'rare', 'jersey_gallery', '#B3BAC0', 'vitrine_maillot', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('jersey_podium', 'vitrine_maillot', 3, 'Podium', 240, true,
    'Un buste sur podium noir pour donner au maillot une présence de scène.',
    'epique', 'jersey_podium', '#C28A5A', 'vitrine_maillot', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false)
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
    collection_key = excluded.collection_key,
    source = excluded.source,
    statut_publication = excluded.statut_publication,
    licence = excluded.licence,
    est_inclus = excluded.est_inclus;

do $$
declare
  v_contract jsonb := public.clutch_contrat_monetisation_v1();
begin
  if (v_contract ->> 'version')::integer <> 3
     or jsonb_array_length(v_contract #> '{catalogue,emplacements}') <> 9
     or v_contract #>> '{catalogue,familles_par_emplacement,vitrine_materiau}' <> 'vitrine_materiau'
     or v_contract #>> '{catalogue,familles_par_emplacement,vitrine_eclairage}' <> 'vitrine_eclairage'
     or v_contract #>> '{catalogue,familles_par_emplacement,vitrine_supports}' <> 'vitrine_supports'
     or v_contract #>> '{catalogue,familles_par_emplacement,vitrine_maillot}' <> 'vitrine_maillot'
  then
    raise exception 'contrat Atelier incomplet';
  end if;

  if (select count(*) from public.objets_catalogue where collection_key = 'atelier') <> 16 then
    raise exception 'catalogue Atelier incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where collection_key = 'atelier'
      and est_inclus
      and source = 'gratuit'
      and prix = 0
  ) <> 4 then
    raise exception 'defaults Atelier invalides';
  end if;

  if exists (
    select 1
    from public.objets_catalogue
    where collection_key = 'atelier'
      and (
        famille is distinct from private.clutch_famille_cosmetique_v2(emplacement)
        or not private.clutch_emplacement_cosmetique_v1(emplacement)
      )
  ) then
    raise exception 'mapping Atelier invalide';
  end if;
end;
$$;

commit;
