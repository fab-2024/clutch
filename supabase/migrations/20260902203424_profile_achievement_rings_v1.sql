-- Achievement rings need durable profile metrics for accepted invitations,
-- distinct winning competitions and the latest officially closed season.

create index if not exists amities_demandeur_acceptee_idx
  on public.amities (demandeur)
  where statut = 'acceptee';

alter function private.clutch_recap_badges_user_v1(uuid)
  rename to clutch_recap_badges_user_base_achievement_rings_v1;

create or replace function private.clutch_recap_badges_user_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with derniere_saison as (
    select s.id
    from public.saisons s
    where s.fin <= now()
    order by s.fin desc, s.id desc
    limit 1
  ), classement_final as (
    select classe.user_id,
           classe.saison_id,
           classe.rang,
           classe.joueurs
    from (
      select c.user_id,
             c.saison_id,
             row_number() over (
               order by c.frags desc,
                        c.pronostics_gagnes::numeric / nullif(c.pronostics_regles, 0) desc,
                        c.maj_le asc,
                        c.user_id
             ) as rang,
             count(*) over () as joueurs
      from public.classements_frags c
      join derniere_saison s on s.id = c.saison_id
      where c.pronostics_regles >= public.clutch_frags_nb_placements()
    ) classe
    where classe.user_id = p_user
  )
  select coalesce(
           private.clutch_recap_badges_user_base_achievement_rings_v1(p_user),
           '{}'::jsonb
         )
    || jsonb_build_object(
      'amis_invites', coalesce((
        select count(*)::integer
        from public.amities a
        where a.demandeur = p_user
          and a.statut = 'acceptee'
      ), 0),
      'competitions_gagnees_distinctes', coalesce((
        select count(distinct m.event_id)::integer
        from public.pronostics_classes p
        join public.matchs m on m.id = p.match_id
        where p.user_id = p_user
          and p.statut = 'gagne'
      ), 0),
      'derniere_saison_cloturee', (
        select jsonb_build_object(
          'id', cf.saison_id,
          'closed', true,
          'percentile', round((cf.rang::numeric * 100) / nullif(cf.joueurs, 0), 2)
        )
        from classement_final cf
      )
    );
$$;

revoke all privileges on function private.clutch_recap_badges_user_base_achievement_rings_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_recap_badges_user_v1(uuid)
  from public, anon, authenticated, service_role;

comment on function private.clutch_recap_badges_user_v1(uuid) is
  'Internal profile recap enriched with the metrics required by achievement rings.';
