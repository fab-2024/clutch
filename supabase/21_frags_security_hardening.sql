-- =====================================================================
-- Clutch — 21_frags_security_hardening.sql
-- Fige le search_path des helpers purs Economy V2.
-- =====================================================================

alter function public.clutch_frags_initial() set search_path = '';
alter function public.clutch_frags_k() set search_path = '';
alter function public.clutch_frags_k_placement() set search_path = '';
alter function public.clutch_frags_nb_placements() set search_path = '';
alter function public.clutch_frags_proba_min() set search_path = '';
alter function public.clutch_frags_proba_max() set search_path = '';
alter function public.clutch_borner_proba_frags(numeric) set search_path = '';
alter function public.clutch_delta_frags(numeric, boolean, integer) set search_path = '';
alter function public.clutch_soft_reset_frags(integer) set search_path = '';
