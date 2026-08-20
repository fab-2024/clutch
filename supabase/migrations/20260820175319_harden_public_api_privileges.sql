-- P1 -- reduce inherited privileges without changing Clutch's public API.
--
-- The existing project predates Supabase's least-privilege defaults. Keep the
-- RPCs that are deliberately public, but require explicit grants for every new
-- object and remove direct API access from trigger/internal functions.

-- ---------------------------------------------------------------------------
-- Future objects created by the application migration owner must opt in to the
-- Data API. REVOKE ALL also removes PostgreSQL 17's MAINTAIN table privilege.
-- supabase_admin is a platform-managed role that postgres cannot alter; project
-- migrations are owned by postgres and are covered by these defaults.
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on types from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Direct RPC surface.
-- ---------------------------------------------------------------------------

-- These read-only endpoints are part of the anonymous product experience.
revoke all privileges on function public.classement_communautes() from public, anon, authenticated, service_role;
revoke all privileges on function public.classement_global(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_communaute_dashboard_v4() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_defi_match_public(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_ligue_public(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_profil_public_v1(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_projection_match_frags(text) from public, anon, authenticated, service_role;

grant execute on function public.classement_communautes() to anon, authenticated, service_role;
grant execute on function public.classement_global(text) to anon, authenticated, service_role;
grant execute on function public.clutch_communaute_dashboard_v4() to anon, authenticated, service_role;
grant execute on function public.clutch_defi_match_public(text) to anon, authenticated, service_role;
grant execute on function public.clutch_ligue_public(text) to anon, authenticated, service_role;
grant execute on function public.clutch_profil_public_v1(text) to anon, authenticated, service_role;
grant execute on function public.clutch_projection_match_frags(text) to anon, authenticated, service_role;

-- The admin helper is evaluated by anonymous SELECT policies and must remain
-- executable there; auth.uid() is null for anon, so it deterministically
-- returns false. Remove only the inherited PUBLIC grant.
revoke all privileges on function public.clutch_est_admin() from public, anon, authenticated, service_role;
grant execute on function public.clutch_est_admin() to anon, authenticated, service_role;

-- These helpers/screens require a signed-in user.
revoke all privileges on function public.clutch_boutique() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_est_colistier(uuid) from public, anon, authenticated, service_role;
grant execute on function public.clutch_boutique() to authenticated, service_role;
grant execute on function public.clutch_est_colistier(uuid) to authenticated, service_role;

-- Trigger functions are invoked by PostgreSQL triggers, not through PostgREST.
-- Revoking EXECUTE from API roles does not disable the attached triggers.
revoke all privileges on function public.creer_profil_a_inscription() from public, anon, authenticated, service_role;
revoke all privileges on function public.verrouiller_champs_sensibles() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fix the search path of the remaining advisor-listed SECURITY INVOKER
-- helpers. anon/authenticated have USAGE but not CREATE on public, so keeping
-- public in this fixed path preserves existing unqualified references safely.
-- ---------------------------------------------------------------------------

alter function public.classement_defi(uuid, text) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_bilan_semaine(uuid, text) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_bonus() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_call_mise_max() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_call_mise_min() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_code_ligue() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_cote_max() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_cote_min() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_cote(numeric) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_debut_semaine() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_distribution(numeric, integer) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_elo_k() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_maj_note(integer, numeric, boolean) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_marge() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_mise_max() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_mise_min() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_montant_prime(integer, integer, integer) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_note_initiale() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_note_k() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_paire(uuid, uuid) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_prime_base() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_prime_jour_mise() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_prime_paliers() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_prime_plafond() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_prime_serie_max() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_proba_map(integer, integer) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_proba_sans_marge(numeric) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_serie_apres(integer, timestamptz) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.clutch_seuil_faillite() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.cotes_du_match(text) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.cotes_evenement(text, text) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.defi_ligue(uuid, text) set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.palmares() set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.unaccent_simple(text) set search_path = pg_catalog, public, extensions, pg_temp;

-- Fail atomically if the least-privilege contract did not take effect.
do $$
declare
  v_function text;
  v_search_path text;
  v_public_functions constant text[] := array[
    'public.classement_communautes()',
    'public.classement_global(text)',
    'public.clutch_communaute_dashboard_v4()',
    'public.clutch_defi_match_public(text)',
    'public.clutch_ligue_public(text)',
    'public.clutch_profil_public_v1(text)',
    'public.clutch_projection_match_frags(text)'
  ];
  v_authenticated_only_functions constant text[] := array[
    'public.clutch_boutique()',
    'public.clutch_est_colistier(uuid)'
  ];
  v_trigger_functions constant text[] := array[
    'public.creer_profil_a_inscription()',
    'public.verrouiller_champs_sensibles()'
  ];
  v_fixed_path_functions constant text[] := array[
    'public.classement_defi(uuid,text)',
    'public.clutch_bilan_semaine(uuid,text)',
    'public.clutch_bonus()',
    'public.clutch_call_mise_max()',
    'public.clutch_call_mise_min()',
    'public.clutch_code_ligue()',
    'public.clutch_cote_max()',
    'public.clutch_cote_min()',
    'public.clutch_cote(numeric)',
    'public.clutch_debut_semaine()',
    'public.clutch_distribution(numeric,integer)',
    'public.clutch_elo_k()',
    'public.clutch_maj_note(integer,numeric,boolean)',
    'public.clutch_marge()',
    'public.clutch_mise_max()',
    'public.clutch_mise_min()',
    'public.clutch_montant_prime(integer,integer,integer)',
    'public.clutch_note_initiale()',
    'public.clutch_note_k()',
    'public.clutch_paire(uuid,uuid)',
    'public.clutch_prime_base()',
    'public.clutch_prime_jour_mise()',
    'public.clutch_prime_paliers()',
    'public.clutch_prime_plafond()',
    'public.clutch_prime_serie_max()',
    'public.clutch_proba_map(integer,integer)',
    'public.clutch_proba_sans_marge(numeric)',
    'public.clutch_serie_apres(integer,timestamptz)',
    'public.clutch_seuil_faillite()',
    'public.cotes_du_match(text)',
    'public.cotes_evenement(text,text)',
    'public.defi_ligue(uuid,text)',
    'public.palmares()',
    'public.unaccent_simple(text)'
  ];
begin
  foreach v_function in array v_public_functions loop
    if not has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE')
       or not has_function_privilege('authenticated', to_regprocedure(v_function), 'EXECUTE')
       or not has_function_privilege('service_role', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'Public RPC privilege contract failed for %', v_function;
    end if;
  end loop;

  foreach v_function in array v_authenticated_only_functions loop
    if has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE')
       or not has_function_privilege('authenticated', to_regprocedure(v_function), 'EXECUTE')
       or not has_function_privilege('service_role', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'Authenticated RPC privilege contract failed for %', v_function;
    end if;
  end loop;

  foreach v_function in array v_trigger_functions loop
    if has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE')
       or has_function_privilege('authenticated', to_regprocedure(v_function), 'EXECUTE')
       or has_function_privilege('service_role', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'Trigger function remains executable through the Data API: %', v_function;
    end if;
  end loop;

  if not has_function_privilege('anon', 'public.clutch_est_admin()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_est_admin()', 'EXECUTE') then
    raise exception 'clutch_est_admin() is no longer available to its RLS policies';
  end if;

  foreach v_function in array v_fixed_path_functions loop
    select option_value
    into v_search_path
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, '{}'::text[])) option_value
    where p.oid = to_regprocedure(v_function)
      and option_value like 'search_path=%';

    if v_search_path is distinct from 'search_path=pg_catalog, public, extensions, pg_temp' then
      raise exception 'Fixed search_path contract failed for %: %', v_function, v_search_path;
    end if;
  end loop;

  if exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles grantee on grantee.oid = a.grantee
    where d.defaclrole = 'postgres'::regrole
      and n.nspname = 'public'
      and (a.grantee = 0 or grantee.rolname in ('anon', 'authenticated', 'service_role'))
  ) then
    raise exception 'postgres still grants public Data API privileges by default';
  end if;
end;
$$;
