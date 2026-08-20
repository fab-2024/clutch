-- Regression test for the database contracts used directly by mobile/.
-- Run after `supabase db reset` with:
-- supabase db query --local --file supabase/tests/p0_mobile_contracts.sql

do $$
declare
  v_function text;
  v_table text;
  v_missing text;
  v_authenticated_functions constant text[] := array[
    'public.classement_communautes()',
    'public.clutch_chercher_joueurs(text)',
    'public.clutch_admin_demarrer_match_v1(text)',
    'public.clutch_admin_reporter_match_v1(text,timestamp with time zone)',
    'public.clutch_assurer_mon_profil_v1()',
    'public.clutch_classement_frags(text)',
    'public.clutch_communaute_dashboard_v4()',
    'public.clutch_definir_jeux_suivis(text[])',
    'public.clutch_demander_ami(uuid)',
    'public.clutch_etat_frags(text)',
    'public.clutch_friend_quests_dashboard_v1()',
    'public.clutch_mes_amis(text)',
    'public.clutch_mes_defis_match(integer)',
    'public.clutch_mes_ligues()',
    'public.clutch_mes_pronostics_classes(text)',
    'public.clutch_profil_public_v1(text)',
    'public.clutch_projection_match_frags(text)',
    'public.clutch_repondre_demande(uuid,boolean)',
    'public.clutch_retirer_ami(uuid)',
    'public.creer_ligue(text)',
    'public.placer_pronostic_classe(text,text)',
    'public.rejoindre_ligue(text)'
  ];
  v_anon_functions constant text[] := array[
    'public.classement_communautes()',
    'public.clutch_communaute_dashboard_v4()',
    'public.clutch_profil_public_v1(text)',
    'public.clutch_projection_match_frags(text)'
  ];
  v_authenticated_tables constant text[] := array[
    'public.profils',
    'public.saisons',
    'public.equipes',
    'public.evenements',
    'public.matchs',
    'public.v_saisons',
    'public.v_matchs',
    'public.participations',
    'public.pronostics_classes',
    'public.ligues',
    'public.membres_ligue',
    'public.v_mes_ligues'
  ];
  v_anon_tables constant text[] := array[
    'public.saisons',
    'public.equipes',
    'public.evenements',
    'public.matchs',
    'public.v_saisons',
    'public.v_matchs'
  ];
begin
  select string_agg(column_name, ', ' order by column_name)
  into v_missing
  from (values ('est_fondateur'), ('titre_profil')) expected(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profils'
      and c.column_name = expected.column_name
  );

  if v_missing is not null then
    raise exception 'Missing mobile profile columns: %', v_missing;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profils'
      and column_name = 'est_fondateur'
      and (is_nullable <> 'NO' or column_default is distinct from 'false')
  ) then
    raise exception 'profils.est_fondateur must be NOT NULL DEFAULT false';
  end if;

  foreach v_function in array v_authenticated_functions loop
    if to_regprocedure(v_function) is null then
      raise exception 'Missing mobile RPC: %', v_function;
    end if;
    if not has_function_privilege('authenticated', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'authenticated cannot execute %', v_function;
    end if;
    if not has_function_privilege('service_role', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'service_role cannot execute %', v_function;
    end if;
    if v_function = any(v_anon_functions) then
      if not has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE') then
        raise exception 'anon cannot execute public mobile RPC %', v_function;
      end if;
    elsif has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE') then
      raise exception 'anon can execute private mobile RPC %', v_function;
    end if;
  end loop;

  foreach v_table in array v_authenticated_tables loop
    if to_regclass(v_table) is null then
      raise exception 'Missing mobile table or view: %', v_table;
    end if;
    if not has_table_privilege('authenticated', v_table, 'SELECT') then
      raise exception 'authenticated cannot select %', v_table;
    end if;
  end loop;

  foreach v_table in array v_anon_tables loop
    if not has_table_privilege('anon', v_table, 'SELECT') then
      raise exception 'anon cannot select public reference object %', v_table;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.profils', 'SELECT')
     or has_table_privilege('anon', 'public.participations', 'SELECT')
     or has_table_privilege('anon', 'public.pronostics_classes', 'SELECT')
     or has_table_privilege('anon', 'public.v_mes_ligues', 'SELECT')
  then
    raise exception 'anon can select a private mobile object';
  end if;

  if not has_column_privilege('authenticated', 'public.profils', 'equipe_favorite_id', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.profils', 'titre_profil', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profils', 'est_admin', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profils', 'est_fondateur', 'UPDATE')
  then
    raise exception 'Profile column privileges do not match the mobile contract';
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
  into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'profils', 'saisons', 'equipes', 'evenements', 'matchs',
      'participations', 'pronostics_classes', 'ligues', 'membres_ligue'
    ])
    and not c.relrowsecurity;

  if v_missing is not null then
    raise exception 'RLS is disabled on mobile tables: %', v_missing;
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
  into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array['v_saisons', 'v_matchs', 'v_mes_ligues'])
    and not coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true'];

  if v_missing is not null then
    raise exception 'security_invoker is missing on mobile views: %', v_missing;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'matchs'
      and c.conname = 'matchs_resultat_termine_coherent'
      and c.convalidated
  ) then
    raise exception 'Validated match result constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger tg
    join pg_class t on t.oid = tg.tgrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'matchs'
      and tg.tgname = 'clutch_guard_match_lifecycle_v1'
      and tg.tgenabled <> 'D'
      and not tg.tgisinternal
  ) then
    raise exception 'Match lifecycle trigger is missing or disabled';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = 'public.clutch_assurer_mon_profil_v1()'::regprocedure
      and p.prosecdef
      and coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""']
  ) then
    raise exception 'Auth profile recovery RPC is not hardened';
  end if;

  raise notice 'p0_mobile_contracts_ok';
end;
$$;
