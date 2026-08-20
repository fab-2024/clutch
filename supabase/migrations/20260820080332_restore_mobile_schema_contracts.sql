-- P0 — restore the schema and privilege contracts required by the mobile app.
--
-- This migration is deliberately additive for schema objects and deterministic
-- for privileges. It is safe to apply after the historical production state or
-- after 20260820075558_legacy_public_baseline.sql on a fresh environment.

-- ---------------------------------------------------------------------------
-- Profile columns that existed in production but were missing from the repo.
-- Existing founder assignments and profile titles are preserved.
-- ---------------------------------------------------------------------------

alter table public.profils
  add column if not exists est_fondateur boolean;

update public.profils
set est_fondateur = false
where est_fondateur is null;

alter table public.profils
  alter column est_fondateur set default false,
  alter column est_fondateur set not null;

alter table public.profils
  add column if not exists titre_profil text;

-- ---------------------------------------------------------------------------
-- Explicit Data API contract for the tables and views read by mobile.
-- RLS remains the row-level authority; these grants only expose the objects.
-- ---------------------------------------------------------------------------

revoke all privileges on table public.profils from public, anon, authenticated;
grant select on table public.profils to authenticated;
grant update (
  pseudo,
  equipe_favorite_id,
  pari_auto_mode,
  pari_auto_mise,
  badge_vedette,
  badges_exposes,
  arsenal_exposes,
  titre_profil,
  profil_public,
  jeux_suivis
) on table public.profils to authenticated;
grant all privileges on table public.profils to service_role;

revoke all privileges on table
  public.saisons,
  public.equipes,
  public.evenements,
  public.matchs,
  public.v_saisons,
  public.v_matchs
from public, anon, authenticated;

grant select on table
  public.saisons,
  public.equipes,
  public.evenements,
  public.matchs,
  public.v_saisons,
  public.v_matchs
to anon, authenticated;

grant all privileges on table
  public.saisons,
  public.equipes,
  public.evenements,
  public.matchs,
  public.v_saisons,
  public.v_matchs
to service_role;

revoke all privileges on table
  public.participations,
  public.pronostics_classes,
  public.ligues,
  public.membres_ligue,
  public.v_mes_ligues
from public, anon, authenticated;

grant select on table
  public.participations,
  public.pronostics_classes,
  public.ligues,
  public.membres_ligue,
  public.v_mes_ligues
to authenticated;

grant all privileges on table
  public.participations,
  public.pronostics_classes,
  public.ligues,
  public.membres_ligue,
  public.v_mes_ligues
to service_role;

-- Future objects must opt into the Data API explicitly. This mirrors the new
-- Supabase platform default and prevents accidental exposure before RLS/grants.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mobile RPC allow-list. SECURITY DEFINER is intentional for these APIs;
-- every private operation derives the caller from auth.uid().
-- ---------------------------------------------------------------------------

revoke all privileges on function public.clutch_chercher_joueurs(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_demander_ami(uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_repondre_demande(uuid, boolean) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_retirer_ami(uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_amis(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_classement_frags(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_definir_jeux_suivis(text[]) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_etat_frags(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_friend_quests_dashboard_v1() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_defis_match(integer) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_ligues() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_pronostics_classes(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.creer_ligue(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.placer_pronostic_classe(text, text) from public, anon, authenticated, service_role;
revoke all privileges on function public.rejoindre_ligue(text) from public, anon, authenticated, service_role;

grant execute on function public.clutch_chercher_joueurs(text) to authenticated, service_role;
grant execute on function public.clutch_demander_ami(uuid) to authenticated, service_role;
grant execute on function public.clutch_repondre_demande(uuid, boolean) to authenticated, service_role;
grant execute on function public.clutch_retirer_ami(uuid) to authenticated, service_role;
grant execute on function public.clutch_mes_amis(text) to authenticated, service_role;
grant execute on function public.clutch_classement_frags(text) to authenticated, service_role;
grant execute on function public.clutch_definir_jeux_suivis(text[]) to authenticated, service_role;
grant execute on function public.clutch_etat_frags(text) to authenticated, service_role;
grant execute on function public.clutch_friend_quests_dashboard_v1() to authenticated, service_role;
grant execute on function public.clutch_mes_defis_match(integer) to authenticated, service_role;
grant execute on function public.clutch_mes_ligues() to authenticated, service_role;
grant execute on function public.clutch_mes_pronostics_classes(text) to authenticated, service_role;
grant execute on function public.creer_ligue(text) to authenticated, service_role;
grant execute on function public.placer_pronostic_classe(text, text) to authenticated, service_role;
grant execute on function public.rejoindre_ligue(text) to authenticated, service_role;

revoke all privileges on function public.classement_communautes() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_communaute_dashboard_v4() from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_profil_public_v1(text) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_projection_match_frags(text) from public, anon, authenticated, service_role;

grant execute on function public.classement_communautes() to anon, authenticated, service_role;
grant execute on function public.clutch_communaute_dashboard_v4() to anon, authenticated, service_role;
grant execute on function public.clutch_profil_public_v1(text) to anon, authenticated, service_role;
grant execute on function public.clutch_projection_match_frags(text) to anon, authenticated, service_role;

-- Fail the migration if its two P0 contracts are not actually effective.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profils'
      and column_name = 'est_fondateur'
      and is_nullable = 'NO'
  ) then
    raise exception 'P0 contract failed: profils.est_fondateur is missing or nullable';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profils'
      and column_name = 'titre_profil'
  ) then
    raise exception 'P0 contract failed: profils.titre_profil is missing';
  end if;

  if has_function_privilege('anon', 'public.clutch_chercher_joueurs(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_chercher_joueurs(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_demander_ami(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_demander_ami(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_repondre_demande(uuid,boolean)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_repondre_demande(uuid,boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_retirer_ami(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_retirer_ami(uuid)', 'EXECUTE')
  then
    raise exception 'P0 contract failed: Social friend RPC privileges are invalid';
  end if;
end;
$$;
