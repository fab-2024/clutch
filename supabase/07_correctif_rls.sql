-- =====================================================================
--  Clutch — correctif de sécurité : récursion infinie dans les policies.
--
--  À exécuter APRÈS 01 à 06. Idempotent.
--
--  LE BUG
--  ------
--  La policy de lecture de membres_ligue interrogeait membres_ligue :
--
--    create policy ... on membres_ligue for select using (
--      exists (select 1 from membres_ligue m2 where ...)   -- <— récursion
--    );
--
--  Postgres refuse et lève « infinite recursion detected in policy for
--  relation membres_ligue ».
--
--  POURQUOI TOUTE LA BASE TOMBAIT AVEC
--  -----------------------------------
--  Les policies « modifiables par les admins » sont déclarées FOR ALL, donc
--  elles s'appliquent aussi en LECTURE. Lire equipes évaluait « admin ? »,
--  qui lisait profils, dont la policy lisait membres_ligue, qui explosait.
--  Résultat : une seule règle fautive rendait illisibles equipes, profils,
--  participations et ligues — d'où le « clé refusée » du diagnostic, qui
--  n'avait rien à voir avec la clé.
--
--  LE PRINCIPE DU CORRECTIF
--  ------------------------
--  Une policy ne doit jamais interroger directement une table protégée par
--  une policy. On passe par des fonctions SECURITY DEFINER : elles
--  s'exécutent avec les droits du propriétaire, donc sans déclencher la RLS,
--  et la chaîne s'arrête net. C'est la parade standard.
-- =====================================================================

-- ------------------------------------------------------------- Fonctions
-- STABLE : le résultat ne change pas dans une même requête, Postgres peut
-- donc n'appeler chacune qu'une fois par ligne évaluée.

/** Les ligues dont je suis membre. Ne déclenche aucune policy. */
create or replace function clutch_mes_ligues()
returns setof uuid language sql stable security definer set search_path = public as $$
  select ligue_id from membres_ligue where user_id = auth.uid();
$$;

/** Cette personne partage-t-elle au moins une ligue avec moi ? */
create or replace function clutch_est_colistier(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from membres_ligue autre
    where autre.user_id = p_user
      and autre.ligue_id in (select ligue_id from membres_ligue where user_id = auth.uid())
  );
$$;

/** Suis-je administrateur ? Lit profils sans passer par ses policies. */
create or replace function clutch_est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select est_admin from profils where id = auth.uid()), false);
$$;

-- --------------------------------------------------------- membres_ligue
-- La règle qui causait tout. Elle ne s'interroge plus elle-même.
drop policy if exists "membres visibles entre colistiers" on membres_ligue;
create policy "membres visibles entre colistiers"
  on membres_ligue for select using (
    user_id = auth.uid() or ligue_id in (select clutch_mes_ligues())
  );

-- ---------------------------------------------------------------- Ligues
drop policy if exists "ligues de mes ligues" on ligues;
create policy "ligues de mes ligues"
  on ligues for select using (id in (select clutch_mes_ligues()));

-- --------------------------------------------------------------- Profils
drop policy if exists "profils des colistiers lisibles" on profils;
create policy "profils des colistiers lisibles"
  on profils for select using (clutch_est_colistier(profils.id));

-- -------------------------------------------------------- Participations
drop policy if exists "participations des colistiers" on participations;
create policy "participations des colistiers"
  on participations for select using (clutch_est_colistier(participations.user_id));

-- ----------------------------------------------------------------- Calls
drop policy if exists "calls des colistiers" on calls;
create policy "calls des colistiers"
  on calls for select using (clutch_est_colistier(calls.user_id));

-- ------------------------------------------------------------ Défis
drop policy if exists "défi visible par les membres de la ligue" on defis_ligue;
create policy "défi visible par les membres de la ligue"
  on defis_ligue for select using (ligue_id in (select clutch_mes_ligues()));

-- ------------------------------------------------- Policies d'administration
-- Elles restent FOR ALL, mais passent désormais par clutch_est_admin(), qui
-- ne déclenche plus la lecture de profils et donc plus la chaîne.

drop policy if exists "saisons modifiables par les admins" on saisons;
create policy "saisons modifiables par les admins"
  on saisons for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "matchs modifiables par les admins" on matchs;
create policy "matchs modifiables par les admins"
  on matchs for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "équipes modifiables par les admins" on equipes;
create policy "équipes modifiables par les admins"
  on equipes for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "évènements modifiables par les admins" on evenements;
create policy "évènements modifiables par les admins"
  on evenements for all using (clutch_est_admin()) with check (clutch_est_admin());

-- --------------------------------------------------------------- Droits
revoke all on function clutch_mes_ligues()          from public;
revoke all on function clutch_est_colistier(uuid)   from public;
revoke all on function clutch_est_admin()           from public;

grant execute on function clutch_mes_ligues()        to authenticated;
grant execute on function clutch_est_colistier(uuid) to authenticated;
grant execute on function clutch_est_admin()         to anon, authenticated;
