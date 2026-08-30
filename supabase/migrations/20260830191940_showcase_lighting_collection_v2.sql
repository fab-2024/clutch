-- Boutique // Vitrine — six lighting directions.
-- Reuses the existing cosmetic slot and ownership model. Existing object ids
-- stay stable so purchases and equipped items remain valid.

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
  ('lighting_cyan', 'vitrine_eclairage', 1, 'Sobre cyan', 0, true,
    'Un éclairage froid et précis qui souligne les socles sans voler la vedette aux objets.',
    'commun', 'lighting-cyan', '#31D7E2', 'vitrine_eclairage', 'atelier', 'gratuit', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, true),
  ('lighting_amber', 'vitrine_eclairage', 2, 'Prestige ambre', 100, true,
    'Une lumière chaude et cérémonielle qui révèle le bronze et les trophées majeurs.',
    'rare', 'lighting-amber', '#E2A451', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_violet', 'vitrine_eclairage', 3, 'Mystérieux violet', 100, true,
    'Des rais violets profonds pour une salle plus secrète et théâtrale.',
    'rare', 'lighting-violet', '#9A6BFF', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_white', 'vitrine_eclairage', 4, 'Compétition rouge / cyan', 80, true,
    'Une scène coupée en deux camps, rouge à gauche et cyan à droite.',
    'rare', 'lighting-competition', '#FF4B4B', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_emerald', 'vitrine_eclairage', 5, 'Émeraude vert / or', 120, true,
    'Un vert profond bordé d’or pour une vitrine rare et statutaire.',
    'rare', 'lighting-emerald', '#38D996', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
    '{"type":"interne","titulaire":"GRIFF"}'::jsonb, false),
  ('lighting_acid', 'vitrine_eclairage', 6, 'Victoire Clutch', 80, true,
    'Le jaune acide signature converge vers le rang central comme un instant de victoire.',
    'rare', 'lighting-victory', '#E8FF3D', 'vitrine_eclairage', 'atelier', 'achat', 'publie',
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
  ) <> 17 then
    raise exception 'catalogue Atelier v2 incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_eclairage'
      and collection_key = 'atelier'
      and actif
      and statut_publication = 'publie'
  ) <> 6 then
    raise exception 'collection eclairage v2 incomplete';
  end if;

  if (
    select count(*)
    from public.objets_catalogue
    where emplacement = 'vitrine_eclairage'
      and collection_key = 'atelier'
      and est_inclus
      and source = 'gratuit'
      and prix = 0
  ) <> 1 then
    raise exception 'eclairage inclus v2 invalide';
  end if;

  if exists (
    select 1
    from public.objets_catalogue
    where emplacement = 'vitrine_eclairage'
      and collection_key = 'atelier'
      and famille is distinct from 'vitrine_eclairage'
  ) then
    raise exception 'mapping eclairage v2 invalide';
  end if;
end;
$$;

commit;
