-- Enrich the Phase 6 reveal payload without moving any settlement authority
-- to the client. The historical call counters let mobile distinguish the
-- fifth placement reveal from an already classified result.

create or replace function public.clutch_prochain_resultat_a_reveler()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cible as (
    select
      p.*,
      m.equipe_a,
      m.equipe_b,
      m.tag_a,
      m.tag_b,
      m.score_a,
      m.score_b,
      m.jeu,
      m.evenement,
      m.format,
      m.debut
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
      and p.revele_le is null
    order by p.regle_le asc nulls last, p.cree_le asc, p.id asc
    limit 1
  ), contexte as (
    select
      c.*,
      (
        select count(*)::integer
        from public.pronostics_classes h
        where h.user_id = c.user_id
          and h.saison_id = c.saison_id
          and h.statut in ('gagne', 'perdu')
          and (h.regle_le, h.cree_le, h.id) < (c.regle_le, c.cree_le, c.id)
      ) as verdicts_avant
    from cible c
  ), compteur as (
    select count(*)::integer as total
    from public.pronostics_classes p
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
      and p.revele_le is null
  )
  select case when c.id is null then null else jsonb_build_object(
    'id', c.id,
    'match_id', c.match_id,
    'saison_id', c.saison_id,
    'statut', c.statut,
    'choix', c.choix,
    'conviction', c.conviction,
    'multiplicateur_conviction', c.multiplicateur_conviction,
    'proba_figee', c.proba_figee,
    'delta_frags', c.delta_frags,
    'frags_avant', c.frags_avant,
    'frags_apres', c.frags_apres,
    'rang_avant', c.rang_avant,
    'rang_apres', c.rang_apres,
    'verdicts_avant', c.verdicts_avant,
    'verdicts_apres', c.verdicts_avant + 1,
    'regle_le', c.regle_le,
    'equipe_a', c.equipe_a,
    'equipe_b', c.equipe_b,
    'tag_a', c.tag_a,
    'tag_b', c.tag_b,
    'score_a', c.score_a,
    'score_b', c.score_b,
    'jeu', c.jeu,
    'evenement', c.evenement,
    'format', c.format,
    'debut', c.debut,
    'source_resultat', 'validation_clutch',
    'source_resultat_label', 'Validation Clutch',
    'restants', compteur.total
  ) end
  from compteur
  left join contexte c on true
$$;

create or replace function public.clutch_resultat_match_v1(p_match_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'match_id', p.match_id,
    'saison_id', p.saison_id,
    'statut', p.statut,
    'choix', p.choix,
    'conviction', p.conviction,
    'multiplicateur_conviction', p.multiplicateur_conviction,
    'proba_figee', p.proba_figee,
    'delta_frags', p.delta_frags,
    'frags_avant', p.frags_avant,
    'frags_apres', p.frags_apres,
    'rang_avant', p.rang_avant,
    'rang_apres', p.rang_apres,
    'verdicts_avant', historique.verdicts_avant,
    'verdicts_apres', historique.verdicts_avant + 1,
    'regle_le', p.regle_le,
    'revele_le', p.revele_le,
    'equipe_a', m.equipe_a,
    'equipe_b', m.equipe_b,
    'tag_a', m.tag_a,
    'tag_b', m.tag_b,
    'score_a', m.score_a,
    'score_b', m.score_b,
    'jeu', m.jeu,
    'evenement', m.evenement,
    'format', m.format,
    'debut', m.debut,
    'source_resultat', 'validation_clutch',
    'source_resultat_label', 'Validation Clutch',
    'restants', 1
  )
  from public.pronostics_classes p
  join public.v_matchs m on m.id = p.match_id
  cross join lateral (
    select count(*)::integer as verdicts_avant
    from public.pronostics_classes h
    where h.user_id = p.user_id
      and h.saison_id = p.saison_id
      and h.statut in ('gagne', 'perdu')
      and (h.regle_le, h.cree_le, h.id) < (p.regle_le, p.cree_le, p.id)
  ) historique
  where p.user_id = (select auth.uid())
    and p.match_id = p_match_id
    and p.statut in ('gagne', 'perdu')
  limit 1
$$;

comment on function public.clutch_prochain_resultat_a_reveler() is
  'Oldest unseen settled call with immutable rating/rank snapshots and placement context.';
comment on function public.clutch_resultat_match_v1(text) is
  'Replayable settled-call reveal for the authenticated owner.';

revoke all privileges on function public.clutch_prochain_resultat_a_reveler()
  from public, anon;
revoke all privileges on function public.clutch_resultat_match_v1(text)
  from public, anon;

grant execute on function public.clutch_prochain_resultat_a_reveler()
  to authenticated;
grant execute on function public.clutch_resultat_match_v1(text)
  to authenticated;
