-- Re-anchor only expired demo fixtures that have never received user activity.
-- Fresh environments keep their original relative seed dates, so this is a no-op
-- unless the demo calendar has already expired by the time the migration runs.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

with eligible as (
  select
    m.id,
    m.debut,
    min(m.debut) over () as first_debut
  from public.matchs as m
  where m.id = any (array[
    'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5',
    'm-6', 'm-7', 'm-8', 'm-9', 'm-10', 'm-11',
    'm-12', 'm-13', 'm-14', 'm-15', 'm-16', 'm-17'
  ]::text[])
    and m.statut = 'a_venir'
    and m.debut <= statement_timestamp()
    and exists (
      select 1
      from public.matchs_scoring_frags as scoring
      where scoring.match_id = m.id
    )
    and not exists (
      select 1
      from public.pronostics_classes as prediction
      where prediction.match_id = m.id
    )
    and not exists (
      select 1
      from public.defis_match as duel
      where duel.match_id = m.id
    )
), refreshed_schedule as (
  select
    id,
    statement_timestamp() + interval '2 hours' + (debut - first_debut) as new_debut
  from eligible
)
update public.matchs as target_match
set debut = schedule.new_debut
from refreshed_schedule as schedule
where target_match.id = schedule.id
  and target_match.statut = 'a_venir'
  and target_match.debut <= statement_timestamp()
  and not exists (
    select 1
    from public.pronostics_classes as prediction
    where prediction.match_id = target_match.id
  )
  and not exists (
    select 1
    from public.defis_match as duel
    where duel.match_id = target_match.id
  );
