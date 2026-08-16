-- =====================================================================
--  Clutch — vérification de 11_volts.sql
--
--  À exécuter dans le SQL Editor de Supabase APRÈS 11_volts.sql.
--
--  CE SCRIPT NE MODIFIE RIEN. Aucun insert, aucun update, aucun delete,
--  aucun create. Il lit le catalogue système et rend un tableau de
--  contrôles. Il est rejouable autant de fois que voulu, y compris en
--  production, et à n'importe quel moment.
-- =====================================================================

with controles as (

  -- Les quatre tables sont là
  select 1 as n, 'Les 4 tables existent' as controle,
         (select count(*) from information_schema.tables
          where table_schema = 'public'
            and table_name in ('objets_catalogue','volts_mouvements','inventaire','equipement')) = 4 as ok,
         (select string_agg(table_name, ', ' order by table_name) from information_schema.tables
          where table_schema = 'public'
            and table_name in ('objets_catalogue','volts_mouvements','inventaire','equipement')) as detail

  union all
  -- RLS active sur les quatre
  select 2, 'RLS active sur les 4 tables',
         (select count(*) from pg_tables
          where schemaname = 'public' and rowsecurity
            and tablename in ('objets_catalogue','volts_mouvements','inventaire','equipement')) = 4,
         (select string_agg(tablename || '=' || rowsecurity::text, ', ' order by tablename)
          from pg_tables where schemaname = 'public'
            and tablename in ('objets_catalogue','volts_mouvements','inventaire','equipement'))

  union all
  -- Les cinq policies attendues
  select 3, 'Les 5 policies sont posees',
         (select count(*) from pg_policies
          where schemaname = 'public'
            and tablename in ('objets_catalogue','volts_mouvements','inventaire','equipement')) = 5,
         (select string_agg(policyname, ', ' order by policyname) from pg_policies
          where schemaname = 'public'
            and tablename in ('objets_catalogue','volts_mouvements','inventaire','equipement'))

  union all
  -- Les cinq fonctions
  select 4, 'Les 5 fonctions existent',
         (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in
            ('clutch_solde_volts','clutch_crediter_volts','clutch_acheter_objet',
             'clutch_equiper','clutch_cloturer_saison')) = 5,
         (select string_agg(p.proname, ', ' order by p.proname)
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in
            ('clutch_solde_volts','clutch_crediter_volts','clutch_acheter_objet',
             'clutch_equiper','clutch_cloturer_saison'))

  union all
  -- Toutes en SECURITY DEFINER : sans ça, la RLS reprend la main et le
  -- piege de recursion du 13 aout redevient possible.
  select 5, 'Les 5 fonctions sont SECURITY DEFINER',
         (select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in
            ('clutch_solde_volts','clutch_crediter_volts','clutch_acheter_objet',
             'clutch_equiper','clutch_cloturer_saison')),
         (select string_agg(p.proname || '=' || p.prosecdef::text, ', ' order by p.proname)
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname in
            ('clutch_solde_volts','clutch_crediter_volts','clutch_acheter_objet',
             'clutch_equiper','clutch_cloturer_saison'))

  union all
  -- Le client ne doit pas pouvoir se crediter des Volts
  select 6, 'clutch_crediter_volts hors de portee du client',
         not has_function_privilege('authenticated',
           (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'clutch_crediter_volts' limit 1), 'execute'),
         'authenticated ne doit PAS avoir execute'

  union all
  -- Le catalogue de depart
  select 7, 'Le catalogue contient 25 objets sur 7 emplacements',
         (select count(*) = 25 and count(distinct emplacement) = 7 from objets_catalogue),
         (select count(*)::text || ' objets / ' || count(distinct emplacement)::text || ' emplacements'
          from objets_catalogue)

  union all
  -- Le niveau 1 est gratuit partout, les autres non
  select 8, 'Chaque emplacement a un niveau 1 gratuit',
         (select count(*) from objets_catalogue where niveau = 1 and prix = 0)
       = (select count(distinct emplacement) from objets_catalogue),
         (select string_agg(emplacement || '=' || prix::text, ', ' order by emplacement)
          from objets_catalogue where niveau = 1)

  union all
  -- Les aides de 07 sont bien la
  select 9, 'Les aides de 07_correctif_rls sont presentes',
         to_regprocedure('clutch_est_admin()') is not null
     and to_regprocedure('clutch_est_colistier(uuid)') is not null,
         'clutch_est_admin(), clutch_est_colistier(uuid)'

  union all
  -- Le grand livre doit etre vide ou coherent : aucun solde negatif
  select 10, 'Aucun joueur avec un solde de Volts negatif',
         not exists (select 1 from volts_mouvements
                     group by user_id having sum(montant) < 0),
         coalesce((select count(distinct user_id)::text from volts_mouvements), '0') || ' joueur(s) au grand livre'
)
select
  n                                    as "#",
  case when ok then 'OK' else 'ECHEC' end as "resultat",
  controle,
  detail
from controles
order by n;
