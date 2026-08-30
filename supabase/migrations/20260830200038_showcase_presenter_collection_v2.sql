-- Boutique // Vitrine — six presenter layouts.
-- Existing support ids stay stable so previous ownership and equipment rows
-- remain valid while the user-facing collection becomes "Présentoirs".

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
  collection_key,
  source,
  statut_publication,
  licence,
  est_inclus
) values
  ('supports_gallery', 'vitrine_supports', 1, 'Cercle Obsidienne', 0, true,
    'Huit socles circulaires noirs organisés autour du rang central.',
    'commun', 'presenter-circle-obsidian', '#31D7E2', 'vitrine_supports', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('supports_forge', 'vitrine_supports', 2, 'Galerie Bronze', 220, true,
    'Huit vitrines de musée bordées de bronze pour les pièces emblématiques.',
    'rare', 'presenter-bronze-gallery', '#B4774E', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('supports_halo', 'vitrine_supports', 3, 'Carbone Mécanique', 280, true,
    'Dix stations techniques en carbone, serrées autour d’un noyau central.',
    'epique', 'presenter-mechanical-carbon', '#6D8492', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('supports_crystal', 'vitrine_supports', 4, 'Capsules Cristal', 300, true,
    'Huit capsules transparentes, lumineuses et parfaitement isolées.',
    'epique', 'presenter-crystal-capsules', '#B9E8FF', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('supports_vault', 'vitrine_supports', 5, 'Coffre-fort Acier', 320, true,
    'Dix niches blindées pour une collection dense et parfaitement cadrée.',
    'epique', 'presenter-steel-vault', '#AEB9C1', 'vitrine_supports', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('supports_champagne', 'vitrine_supports', 6, 'Podium Champagne', 240, true,
    'Six grandes scènes champagne qui donnent plus d’espace aux pièces fortes.',
    'rare', 'presenter-champagne-podium', '#D7B77A', 'vitrine_supports', 'atelier', 'achat', 'publie',
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
begin
  if (
    select count(*)
    from public.objets_catalogue
    where collection_key = 'atelier'
  ) <> 20 then
    raise exception 'catalogue Atelier v3 incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_supports'
      and collection_key = 'atelier'
      and actif
      and statut_publication = 'publie'
  ) <> 6 then
    raise exception 'collection presentoir v2 incomplete';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_supports'
      and collection_key = 'atelier'
      and est_inclus
      and source = 'gratuit'
      and prix = 0
  ) <> 1 then
    raise exception 'presentoir inclus v2 invalide';
  end if;

  if exists (
    select 1
    from public.objets_catalogue
    where emplacement = 'vitrine_supports'
      and collection_key = 'atelier'
      and famille is distinct from 'vitrine_supports'
  ) then
    raise exception 'mapping presentoir v2 invalide';
  end if;
end;
$$;

commit;
