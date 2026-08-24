-- Keep trusted backend access aligned with the mobile RPC contract. Several
-- later migrations recreate individual functions after the baseline contract
-- migration, so restore only service_role here without broadening client roles.
grant execute on function public.classement_communautes() to service_role;
grant execute on function public.clutch_chercher_joueurs(text) to service_role;
grant execute on function public.clutch_admin_corriger_resultat_v1(text, integer, integer, text, text, text, text, timestamp with time zone) to service_role;
grant execute on function public.clutch_admin_demarrer_match_v1(text) to service_role;
grant execute on function public.clutch_admin_historique_match_v1(text, integer) to service_role;
grant execute on function public.clutch_admin_regler_match_v1(text, integer, integer, text, text, text, timestamp with time zone) to service_role;
grant execute on function public.clutch_admin_reporter_match_v1(text, timestamp with time zone) to service_role;
grant execute on function public.clutch_assurer_mon_profil_v1() to service_role;
grant execute on function public.clutch_acheter_cosmetique_v1(text) to service_role;
grant execute on function public.clutch_boutique_cosmetique_v1() to service_role;
grant execute on function public.clutch_classement_frags(text) to service_role;
grant execute on function public.clutch_communaute_dashboard_v4() to service_role;
grant execute on function public.clutch_contrat_monetisation_v1() to service_role;
grant execute on function public.clutch_cosmetiques_profil_v1(text) to service_role;
grant execute on function public.clutch_definir_jeux_suivis(text[]) to service_role;
grant execute on function public.clutch_demander_ami(uuid) to service_role;
grant execute on function public.clutch_equiper_cosmetique_v1(text) to service_role;
grant execute on function public.clutch_etat_frags(text) to service_role;
grant execute on function public.clutch_friend_quests_dashboard_v1() to service_role;
grant execute on function public.clutch_call_context_v1(text) to service_role;
grant execute on function public.clutch_mes_calls_v1(text) to service_role;
grant execute on function public.clutch_mes_cosmetiques_v1() to service_role;
grant execute on function public.clutch_mes_amis(text) to service_role;
grant execute on function public.clutch_mes_defis_match(integer) to service_role;
grant execute on function public.clutch_mes_ligues() to service_role;
grant execute on function public.clutch_mes_pronostics_classes(text) to service_role;
grant execute on function public.clutch_marquer_resultat_revele(uuid) to service_role;
grant execute on function public.clutch_profil_public_v1(text) to service_role;
grant execute on function public.clutch_prochain_resultat_a_reveler() to service_role;
grant execute on function public.clutch_projection_match_frags(text) to service_role;
grant execute on function public.clutch_repondre_demande(uuid, boolean) to service_role;
grant execute on function public.clutch_resultat_match_v1(text) to service_role;
grant execute on function public.clutch_retirer_ami(uuid) to service_role;
grant execute on function public.creer_ligue(text) to service_role;
grant execute on function public.placer_pronostic_classe(text, text) to service_role;
grant execute on function public.rejoindre_ligue(text) to service_role;
