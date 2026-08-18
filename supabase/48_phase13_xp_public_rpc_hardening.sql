-- Phase 13 hardening: public profile XP now flows through the existing
-- profile recap contract. This standalone RPC is no longer needed by clients.

revoke execute on function public.clutch_xp_quetes_public_v1(text) from public, anon, authenticated;
grant execute on function public.clutch_xp_quetes_public_v1(text) to service_role;
