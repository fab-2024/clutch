-- =====================================================================
-- Clutch — 26_admin_rpc_privileges.sql
-- Les RPC de règlement vérifient déjà est_admin dans leur corps ; on retire
-- aussi EXECUTE aux rôles publics/anonymes pour réduire la surface exposée.
-- =====================================================================

revoke execute on function public.regler_match(text,integer,integer) from public,anon;
revoke execute on function public.regler_evenement(text,text,text) from public,anon;

grant execute on function public.regler_match(text,integer,integer) to authenticated;
grant execute on function public.regler_evenement(text,text,text) to authenticated;
