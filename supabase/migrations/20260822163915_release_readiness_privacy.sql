-- Release readiness: make logout safe on shared devices and give private
-- analytics an explicit, automatic maximum retention period.

create or replace function public.clutch_desactiver_mes_jetons_notification_v1()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  update public.jetons_notification
  set actif = false,
      desactive_le = pg_catalog.now(),
      motif_desactivation = 'deconnexion',
      maj_le = pg_catalog.now()
  where user_id = v_user
    and actif;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all privileges on function public.clutch_desactiver_mes_jetons_notification_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_desactiver_mes_jetons_notification_v1()
to authenticated, service_role;

comment on function public.clutch_desactiver_mes_jetons_notification_v1() is
  'Intentional authenticated logout primitive. It derives the owner from auth.uid() and deactivates every push destination before global sign-out.';

create or replace function public.clutch_desactiver_mon_appareil_notification_v1(
  p_appareil_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_appareil text := nullif(pg_catalog.btrim(coalesce(p_appareil_id, '')), '');
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_appareil is null or pg_catalog.length(v_appareil) not between 8 and 180 then
    raise exception 'identifiant appareil invalide' using errcode = '22023';
  end if;

  update public.jetons_notification
  set actif = false,
      desactive_le = pg_catalog.now(),
      motif_desactivation = 'deconnexion_appareil',
      maj_le = pg_catalog.now()
  where user_id = v_user
    and appareil_id = v_appareil
    and actif;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all privileges on function public.clutch_desactiver_mon_appareil_notification_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_desactiver_mon_appareil_notification_v1(text)
to authenticated, service_role;

comment on function public.clutch_desactiver_mon_appareil_notification_v1(text) is
  'Device-scoped logout primitive. The stable local device identifier is matched only inside the authenticated owner account.';

-- The retention job filters every analytics event by creation time. Existing
-- indexes cover product reads by user/object/campaign, not this global sweep.
create index if not exists analytics_evenements_retention_idx
  on private.analytics_evenements (cree_le);

create or replace function private.clutch_purger_analytics_v1(
  p_avant timestamptz default pg_catalog.now() - interval '13 months'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint := 0;
begin
  if p_avant is null or p_avant > pg_catalog.now() - interval '12 months' then
    raise exception 'borne de retention analytics invalide' using errcode = '22023';
  end if;

  delete from private.analytics_evenements
  where cree_le < p_avant;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all privileges on function private.clutch_purger_analytics_v1(timestamptz)
from public, anon, authenticated, service_role;

comment on function private.clutch_purger_analytics_v1(timestamptz) is
  'Owner/cron-only purge for raw first-party analytics. The default maximum retention is 13 months and the guard prevents accidental short-window deletion.';

do $$
declare
  v_job bigint;
begin
  for v_job in
    select jobid from cron.job where jobname = 'clutch-analytics-retention-v1'
  loop
    perform cron.unschedule(v_job);
  end loop;
end;
$$;

select cron.schedule(
  'clutch-analytics-retention-v1',
  '17 3 * * *',
  $cron$select private.clutch_purger_analytics_v1();$cron$
);

create or replace function public.clutch_contrat_analytics_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
    'stockage_brut', 'private.analytics_evenements',
    'data_api_brute', false,
    'identifiant_publicitaire', false,
    'identifiant_appareil', false,
    'metadata_libre', false,
    'retention_brute', '13 months maximum',
    'purge_automatique', true,
    'partage_partenaire', 'agregats_uniquement',
    'evenements', jsonb_build_array(
      'application_active',
      'collection_affichee',
      'objet_consulte',
      'objet_obtenu',
      'objet_equipe',
      'objet_retire',
      'campagne_rejointe',
      'tache_terminee',
      'recompense_reclamee',
      'founder_pack_affiche',
      'founder_pack_achat_demarre',
      'founder_pack_restauration_demandee',
      'founder_pack_achat_annule',
      'founder_pack_attribue',
      'founder_pack_revoque'
    ),
    'indicateurs_partenaire', jsonb_build_array(
      'utilisateurs_eligibles',
      'impressions_uniques',
      'taux_participation',
      'taux_completion',
      'recompenses_reclamees',
      'objets_equipes',
      'retention_j7',
      'retention_j30'
    ),
    'declaration_store', jsonb_build_object(
      'categorie', 'donnees_utilisation_interaction_produit',
      'finalite', 'analytics',
      'liee_identite_interne', true,
      'tracking_inter_apps', false,
      'vente_donnees', false
    )
  );
$$;

revoke all privileges on function public.clutch_contrat_analytics_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_analytics_v1()
to anon, authenticated, service_role;

do $$
declare
  v_contract jsonb := public.clutch_contrat_analytics_v1();
begin
  if v_contract ->> 'retention_brute' <> '13 months maximum'
     or coalesce((v_contract ->> 'purge_automatique')::boolean, false) is not true
     or not exists (
       select 1 from cron.job where jobname = 'clutch-analytics-retention-v1'
     )
     or to_regclass('private.analytics_evenements_retention_idx') is null
     or has_function_privilege('anon', 'public.clutch_desactiver_mes_jetons_notification_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_desactiver_mes_jetons_notification_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_desactiver_mon_appareil_notification_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_desactiver_mon_appareil_notification_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_purger_analytics_v1(timestamptz)', 'EXECUTE')
  then
    raise exception 'release privacy hardening contract is inconsistent';
  end if;
end;
$$;
;
