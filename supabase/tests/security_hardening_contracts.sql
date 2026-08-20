-- Regression test for the least-privilege contracts applied after the mobile
-- schema restoration. Run only after all migrations have been applied.

do $$
declare
  v_function text;
  v_bad text;
  v_anon_denied constant text[] := array[
    'public.clutch_admin_demarrer_match_v1(text)',
    'public.clutch_admin_reporter_match_v1(text,timestamp with time zone)',
    'public.clutch_boutique()',
    'public.clutch_est_colistier(uuid)',
    'public.creer_profil_a_inscription()',
    'public.verrouiller_champs_sensibles()'
  ];
begin
  foreach v_function in array v_anon_denied loop
    if has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'anon can still execute hardened function %', v_function;
    end if;
  end loop;

  if not has_function_privilege('authenticated', 'public.clutch_boutique()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_est_colistier(uuid)', 'EXECUTE') then
    raise exception 'authenticated lost a required helper or screen RPC';
  end if;

  if not has_function_privilege('anon', 'public.classement_global(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.clutch_defi_match_public(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.clutch_ligue_public(text)', 'EXECUTE') then
    raise exception 'legacy public read RPC contract was narrowed unexpectedly';
  end if;

  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
  into v_bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = any(array[
      'classement_defi', 'clutch_bilan_semaine', 'clutch_bonus',
      'clutch_call_mise_max', 'clutch_call_mise_min', 'clutch_code_ligue',
      'clutch_cote_max', 'clutch_cote_min', 'clutch_cote',
      'clutch_debut_semaine', 'clutch_distribution', 'clutch_elo_k',
      'clutch_maj_note', 'clutch_marge', 'clutch_mise_max',
      'clutch_mise_min', 'clutch_montant_prime', 'clutch_note_initiale',
      'clutch_note_k', 'clutch_paire', 'clutch_prime_base',
      'clutch_prime_jour_mise', 'clutch_prime_paliers',
      'clutch_prime_plafond', 'clutch_prime_serie_max', 'clutch_proba_map',
      'clutch_proba_sans_marge', 'clutch_serie_apres',
      'clutch_seuil_faillite', 'cotes_du_match', 'cotes_evenement',
      'defi_ligue', 'palmares', 'unaccent_simple'
    ])
    and not coalesce(p.proconfig, '{}'::text[])
      @> array['search_path=pg_catalog, public, extensions, pg_temp'];

  if v_bad is not null then
    raise exception 'Mutable search_path remains on: %', v_bad;
  end if;

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
    raise exception 'postgres default privileges are not least privilege';
  end if;

  raise notice 'security_hardening_contracts_ok';
end;
$$;
