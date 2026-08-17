-- =====================================================================
-- Clutch — 28_economy_table_least_privilege.sql
-- Les clients lisent les données autorisées par RLS, mais toute mutation
-- économique passe par les RPC SECURITY DEFINER contrôlés.
-- =====================================================================

revoke insert,update,delete,truncate,references,trigger
on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
from public,anon,authenticated;

-- Lecture conservée : les policies RLS restent l'autorité de visibilité.
grant select on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
to authenticated;

-- Aucun accès direct anonyme aux données économiques privées.
revoke select on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
from anon;
