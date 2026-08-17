-- Clutch — Phase 0 security hardening
-- Audited against the live Supabase project before UI System V4 work.

-- Public views must obey the caller's RLS and table privileges.
alter view public.v_saisons set (security_invoker = true);
alter view public.v_matchs set (security_invoker = true);
alter view public.v_evenements_saison set (security_invoker = true);
alter view public.v_mes_ligues set (security_invoker = true);
alter view public.v_chambre set (security_invoker = true);
alter view public.v_mon_solde_volts set (security_invoker = true);

-- User-private views are not anonymous API surfaces.
revoke select on public.v_mes_ligues from anon;
revoke select on public.v_chambre from anon;
revoke select on public.v_mon_solde_volts from anon;

-- Server-authoritative scoring snapshot: never queried directly by browsers.
revoke all on table public.matchs_scoring_frags from public, anon, authenticated;

-- Admin mutations: authenticated admins only; authorization remains checked in-function.
revoke execute on function public.annuler_match(text, text) from public, anon;
revoke execute on function public.clutch_cloturer_saison(text) from public, anon;
revoke execute on function public.creer_equipe(text, text, text, integer) from public, anon;
revoke execute on function public.creer_evenement(text, text, text) from public, anon;
revoke execute on function public.creer_match(text, text, text, integer, timestamptz, text) from public, anon;
grant execute on function public.annuler_match(text, text) to authenticated;
grant execute on function public.clutch_cloturer_saison(text) to authenticated;
grant execute on function public.creer_equipe(text, text, text, integer) to authenticated;
grant execute on function public.creer_evenement(text, text, text) to authenticated;
grant execute on function public.creer_match(text, text, text, integer, timestamptz, text) to authenticated;

-- Private/player actions: no anonymous execution.
revoke execute on function public.clutch_acheter_objet(text) from public, anon;
revoke execute on function public.clutch_activite_amis(text, integer) from public, anon;
revoke execute on function public.clutch_agreger(text, text) from public, anon;
revoke execute on function public.clutch_bloc_favorite(text, boolean) from public, anon;
revoke execute on function public.clutch_chercher_joueurs(text) from public, anon;
revoke execute on function public.clutch_demander_ami(uuid) from public, anon;
revoke execute on function public.clutch_equiper(text) from public, anon;
revoke execute on function public.clutch_mes_amis(text) from public, anon;
revoke execute on function public.clutch_participation(uuid, text) from public, anon;
revoke execute on function public.clutch_repondre_demande(uuid, boolean) from public, anon;
revoke execute on function public.clutch_retirer_ami(uuid) from public, anon;
revoke execute on function public.clutch_solde_volts(uuid) from public, anon;
revoke execute on function public.clutch_volts_detail(uuid) from public, anon;
revoke execute on function public.creer_ligue(text) from public, anon;
revoke execute on function public.rejoindre_ligue(text) from public, anon;
revoke execute on function public.tirer_defi(uuid) from public, anon;
revoke execute on function public.classement_ligue(uuid, text) from public, anon;
revoke execute on function public.rivalite_semaine(text, uuid) from public, anon;
revoke execute on function public.mes_statistiques_detaillees(text) from public, anon;
