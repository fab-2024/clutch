-- Clutch Phase 2 — Community reward compatibility after Economy V2.
-- The legacy renderer still reads `recompense_frags` inside history JSON.
-- Keep that JSON key temporarily, but feed it from Volts. Ranking Frags are never credited.

create or replace function public.classement_communautes()
returns table (
  equipe_id text,
  nom text,
  tag text,
  jeu text,
  elo integer,
  logo text,
  membres bigint,
  moi boolean,
  niveau_atteint smallint,
  croissance_24h integer,
  croissance_7j integer,
  membre_depuis timestamptz,
  pronos_depuis bigint,
  mutations_vecues bigint,
  dernier_evenement_id bigint,
  dernier_evenement_niveau smallint,
  dernier_evenement_nom text,
  dernier_evenement_le timestamptz,
  dernier_evenement_recompense integer,
  historique jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with effectifs as (
    select e.id as equipe_id, count(p.id)::bigint as membres
    from public.equipes e
    left join public.profils p on p.equipe_favorite_id = e.id
    group by e.id
  ),
  croissance as (
    select
      m.equipe_id,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '24 hours'), 0)::integer as croissance_24h,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '7 days'), 0)::integer as croissance_7j
    from public.communaute_mouvements m
    group by m.equipe_id
  ),
  mon_profil as (
    select p.id, p.equipe_favorite_id, coalesce(p.equipe_favorite_rejointe_le, p.cree_le) as membre_depuis
    from public.profils p
    where p.id = auth.uid()
  )
  select
    e.id,
    e.nom,
    e.tag,
    e.jeu,
    e.elo,
    e.logo,
    ef.membres,
    (mp.id is not null and mp.equipe_favorite_id = e.id) as moi,
    coalesce(ce.niveau_atteint, 1)::smallint,
    coalesce(c.croissance_24h, 0),
    coalesce(c.croissance_7j, 0),
    case when mp.equipe_favorite_id = e.id then mp.membre_depuis end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.pronostics_classes pc
      where pc.user_id = mp.id and pc.cree_le >= mp.membre_depuis
    ) else 0 end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.communaute_mutations cmv
      where cmv.equipe_id = e.id and cmv.cree_le >= mp.membre_depuis
    ) else 0 end,
    last_mut.id,
    last_mut.niveau,
    last_mut.nom,
    last_mut.cree_le,
    coalesce(last_mut.recompense_volts, 0),
    coalesce(hist.items, '[]'::jsonb)
  from public.equipes e
  join effectifs ef on ef.equipe_id = e.id
  left join public.communaute_etat ce on ce.equipe_id = e.id
  left join croissance c on c.equipe_id = e.id
  left join mon_profil mp on mp.equipe_favorite_id = e.id
  left join lateral (
    select cm.id, cm.niveau, cm.nom, cm.cree_le, cm.recompense_volts
    from public.communaute_mutations cm
    where cm.equipe_id = e.id
    order by cm.cree_le desc
    limit 1
  ) last_mut on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'niveau', x.niveau,
        'nom', x.nom,
        'seuil', x.seuil,
        'recompense_volts', x.recompense_volts,
        'recompense_frags', x.recompense_volts,
        'membres', x.membres_au_moment,
        'cree_le', x.cree_le
      ) order by x.cree_le desc
    ) as items
    from (
      select *
      from public.communaute_mutations cm2
      where cm2.equipe_id = e.id
      order by cm2.cree_le desc
      limit 5
    ) x
  ) hist on true
  where ef.membres > 0
  order by coalesce(c.croissance_24h, 0) desc,
           coalesce(c.croissance_7j, 0) desc,
           ef.membres desc,
           e.nom asc;
$$;

revoke execute on function public.classement_communautes() from public;
grant execute on function public.classement_communautes() to anon, authenticated;
