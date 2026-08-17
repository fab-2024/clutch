-- =====================================================================
-- Clutch — 20_compat_classements_v2.sql
-- Garde les contrats historiques des écrans tout en servant le rating V2.
-- =====================================================================

create or replace function public.classement_global(p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.pseudo,
    c.frags as solde,
    c.pronostics_regles::bigint as paris,
    c.pronostics_gagnes::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    0::bigint as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from classements_frags c
  join profils pr on pr.id = c.user_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where c.saison_id = p_saison_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc
  limit 100;
$$;

create or replace function public.classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.pseudo,
    c.frags as solde,
    c.pronostics_regles::bigint as paris,
    c.pronostics_gagnes::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    0::bigint as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  join classements_frags c on c.user_id = ml.user_id and c.saison_id = p_saison_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where ml.ligue_id = p_ligue_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc;
$$;

-- Le JSON garde les clés historiques pour ne casser aucun composant,
-- mais le score et le bilan viennent exclusivement des pronostics classés V2.
create or replace function public.rivalite_semaine(
  p_saison_id text,
  p_ligue_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with classement as (
    select
      row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
      pr.id,
      pr.pseudo,
      c.frags as solde,
      c.pronostics_regles as paris,
      c.pronostics_gagnes as gagnes
    from classements_frags c
    join profils pr on pr.id = c.user_id
    where c.saison_id = p_saison_id
      and (
        p_ligue_id is null
        or exists (
          select 1 from membres_ligue ml
          where ml.ligue_id = p_ligue_id and ml.user_id = c.user_id
        )
      )
  ),
  moi as (select * from classement where id = auth.uid()),
  voisins as (
    select c.*, row_number() over (order by abs(c.rang - m.rang), (c.rang > m.rang)) as ordre
    from classement c, moi m
    where c.id <> m.id
  ),
  candidats as (select * from voisins where ordre <= 3),
  choisi as (
    select * from candidats
    where ordre = mod(
      abs(hashtext(auth.uid()::text || '|' || to_char(now(), 'IYYY-"S"IW'))::bigint),
      greatest((select count(*) from candidats), 1)
    ) + 1
  ),
  bilan_moi as (
    select
      count(*) filter (where p.statut in ('gagne','perdu'))::integer as paris,
      coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu')), 0)::integer as net
    from pronostics_classes p, moi m
    where p.user_id = m.id and p.saison_id = p_saison_id
      and p.regle_le >= date_trunc('week', now())
  ),
  bilan_rival as (
    select
      count(*) filter (where p.statut in ('gagne','perdu'))::integer as paris,
      coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu')), 0)::integer as net
    from pronostics_classes p, choisi r
    where p.user_id = r.id and p.saison_id = p_saison_id
      and p.regle_le >= date_trunc('week', now())
  )
  select jsonb_build_object(
    'semaine', to_char(now(), 'IYYY-"S"IW'),
    'depuis', date_trunc('week', now()),
    'moi', to_jsonb(m) || jsonb_build_object('bilan', jsonb_build_object('paris', bm.paris, 'net', bm.net)),
    'rival', to_jsonb(r) || jsonb_build_object('bilan', jsonb_build_object('paris', br.paris, 'net', br.net)),
    'ecart', m.solde - r.solde
  )
  from moi m, choisi r, bilan_moi bm, bilan_rival br;
$$;
