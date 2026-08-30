-- Boutique // Vitrine — six cosmetic rank displays.
-- The displayed frame never changes competitive rank, Frags or placement.

begin;

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
      'vitrine_rang',
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
    'version', 4,
    'code', 'identity_showcase_founder_v4',
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
      'schema_version', 4,
      'emplacements', jsonb_build_array(
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil',
        'vitrine_materiau',
        'vitrine_eclairage',
        'vitrine_supports',
        'vitrine_rang',
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
        'vitrine_rang',
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
        'vitrine_rang', 'vitrine_rang',
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
  'Monetization contract v4. Adds one cosmetic rank-display slot without changing competitive rank or progression.';

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
  ('rank_carbon_cradle', 'vitrine_rang', 1, 'Écrin Mécanique Carbone', 0, true,
    'Un anneau mécanique en carbone et cyan cadre le rang au centre de la Vitrine.',
    'commun', 'rank-carbon-cradle', '#31D7E2', 'vitrine_rang', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('rank_crystal_capsule', 'vitrine_rang', 2, 'Capsule Cristal', 180, true,
    'Une capsule transparente monumentale protège le rang sous une lumière froide.',
    'rare', 'rank-crystal-capsule', '#B9E8FF', 'vitrine_rang', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('rank_royal_crown', 'vitrine_rang', 3, 'Couronne Royale', 220, true,
    'Deux arches champagne composent une couronne cérémonielle autour du rang.',
    'rare', 'rank-royal-crown', '#D7B77A', 'vitrine_rang', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('rank_orbital_core', 'vitrine_rang', 4, 'Noyau Orbital', 260, true,
    'Des orbites métalliques encerclent le rang comme le cœur énergétique de la salle.',
    'epique', 'rank-orbital-core', '#7ED9F4', 'vitrine_rang', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('rank_volcanic_forge', 'vitrine_rang', 5, 'Forge Volcanique', 300, true,
    'Une couronne mécanique noire, chauffée à l’orange, transforme le rang en relique forgée.',
    'epique', 'rank-volcanic-forge', '#F5792A', 'vitrine_rang', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('rank_clutch_revelation', 'vitrine_rang', 6, 'Révélation Clutch', 360, true,
    'Un halo jaune signature et des panneaux lumineux révèlent le rang comme une victoire décisive.',
    'legendaire', 'rank-clutch-revelation', '#E8FF3D', 'vitrine_rang', 'atelier', 'achat', 'publie',
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
  if (v_contract ->> 'version')::integer <> 4
     or v_contract ->> 'code' <> 'identity_showcase_founder_v4'
     or (v_contract #>> '{catalogue,schema_version}')::integer <> 4
     or jsonb_array_length(v_contract #> '{catalogue,emplacements}') <> 10
     or v_contract #>> '{catalogue,familles_par_emplacement,vitrine_rang}' <> 'vitrine_rang'
  then
    raise exception 'contrat de customisation du rang incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where collection_key = 'atelier'
  ) <> 26 then
    raise exception 'catalogue Atelier v4 incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_rang'
      and collection_key = 'atelier'
      and actif
      and statut_publication = 'publie'
  ) <> 6 then
    raise exception 'collection ecrin de rang incomplete';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_rang'
      and collection_key = 'atelier'
      and est_inclus
      and source = 'gratuit'
      and prix = 0
  ) <> 1 then
    raise exception 'ecrin de rang inclus invalide';
  end if;

  if exists (
    select 1
    from public.objets_catalogue
    where emplacement = 'vitrine_rang'
      and collection_key = 'atelier'
      and (
        famille is distinct from 'vitrine_rang'
        or not private.clutch_emplacement_cosmetique_v1(emplacement)
        or famille is distinct from private.clutch_famille_cosmetique_v2(emplacement)
      )
  ) then
    raise exception 'mapping ecrin de rang invalide';
  end if;
end;
$$;

commit;
