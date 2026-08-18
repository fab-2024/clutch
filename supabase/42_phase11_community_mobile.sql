-- Phase 11 — Community mobile-first dashboard.
-- Progression remains supporter-based. Pronostics are activity context only.

create or replace function public.clutch_communaute_dashboard_v4()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with effectifs as (
  select e.id as equipe_id, count(p.id)::integer as membres
  from public.equipes e left join public.profils p on p.equipe_favorite_id=e.id
  group by e.id
), croissance as (
  select m.equipe_id,
    coalesce(sum(m.delta) filter(where m.cree_le>=now()-interval '24 hours'),0)::integer as croissance_24h,
    coalesce(sum(m.delta) filter(where m.cree_le>=now()-interval '7 days'),0)::integer as croissance_7j
  from public.communaute_mouvements m group by m.equipe_id
), moi as (
  select p.id,p.pseudo,p.equipe_favorite_id,coalesce(p.equipe_favorite_rejointe_le,p.cree_le) as membre_depuis
  from public.profils p where p.id=auth.uid()
), factions as (
  select e.id as equipe_id,e.nom,e.tag,e.jeu,e.logo,ef.membres,
    coalesce(ce.niveau_atteint,1)::integer as niveau_atteint,
    coalesce(c.croissance_24h,0) as croissance_24h,coalesce(c.croissance_7j,0) as croissance_7j,
    (m.equipe_favorite_id=e.id) as moi,
    lm.id as dernier_evenement_id,lm.niveau as dernier_evenement_niveau,lm.nom as dernier_evenement_nom,
    lm.cree_le as dernier_evenement_le,coalesce(lm.recompense_volts,0) as dernier_evenement_recompense_volts
  from public.equipes e
  join effectifs ef on ef.equipe_id=e.id
  left join public.communaute_etat ce on ce.equipe_id=e.id
  left join croissance c on c.equipe_id=e.id
  left join moi m on true
  left join lateral (
    select cm.id,cm.niveau,cm.nom,cm.cree_le,cm.recompense_volts
    from public.communaute_mutations cm where cm.equipe_id=e.id order by cm.cree_le desc limit 1
  ) lm on true
  where ef.membres>0
), activite_membres as (
  select p.id,p.pseudo,p.equipe_favorite_id,
    count(pc.id) filter(where pc.cree_le>=now()-interval '7 days')::integer as pronos_7j,
    count(pc.id) filter(where pc.regle_le>=now()-interval '7 days' and pc.statut='gagne')::integer as gagnes_7j,
    coalesce(sum(pc.delta_frags) filter(where pc.regle_le>=now()-interval '7 days' and pc.statut in('gagne','perdu')),0)::integer as delta_frags_7j
  from public.profils p left join public.pronostics_classes pc on pc.user_id=p.id
  where p.equipe_favorite_id is not null group by p.id,p.pseudo,p.equipe_favorite_id
), activite_classee as (
  select a.*,
    row_number() over(partition by a.equipe_favorite_id order by a.pronos_7j desc,a.gagnes_7j desc,a.delta_frags_7j desc,a.pseudo asc)::integer as rang_activite,
    count(*) over(partition by a.equipe_favorite_id)::integer as total_activite
  from activite_membres a
), detail_moi as (
  select jsonb_build_object(
    'user_id',m.id,'pseudo',m.pseudo,'equipe_id',m.equipe_favorite_id,'membre_depuis',m.membre_depuis,
    'pronos_depuis',(select count(*) from public.pronostics_classes pc where pc.user_id=m.id and pc.cree_le>=m.membre_depuis),
    'mutations_vecues',(select count(*) from public.communaute_mutations cm where cm.equipe_id=m.equipe_favorite_id and cm.cree_le>=m.membre_depuis),
    'pronos_7j',coalesce(a.pronos_7j,0),'gagnes_7j',coalesce(a.gagnes_7j,0),'delta_frags_7j',coalesce(a.delta_frags_7j,0),
    'rang_activite',a.rang_activite,'total_activite',a.total_activite,
    'top_activite',coalesce((select jsonb_agg(jsonb_build_object('user_id',x.id,'pseudo',x.pseudo,'pronos_7j',x.pronos_7j,'gagnes_7j',x.gagnes_7j,'rang',x.rang_activite) order by x.rang_activite) from activite_classee x where x.equipe_favorite_id=m.equipe_favorite_id and x.rang_activite<=5),'[]'::jsonb),
    'archives',coalesce((select jsonb_agg(jsonb_build_object('id',cm.id,'niveau',cm.niveau,'nom',cm.nom,'seuil',cm.seuil,'recompense_volts',cm.recompense_volts,'membres',cm.membres_au_moment,'cree_le',cm.cree_le) order by cm.cree_le asc) from public.communaute_mutations cm where cm.equipe_id=m.equipe_favorite_id),'[]'::jsonb)
  ) as data
  from moi m left join activite_classee a on a.id=m.id
)
select jsonb_build_object(
  'factions',coalesce((select jsonb_agg(to_jsonb(f) order by f.croissance_24h desc,f.croissance_7j desc,f.membres desc,f.nom asc) from factions f),'[]'::jsonb),
  'moi',(select data from detail_moi)
);
$$;

revoke execute on function public.clutch_communaute_dashboard_v4() from public;
grant execute on function public.clutch_communaute_dashboard_v4() to anon, authenticated;
