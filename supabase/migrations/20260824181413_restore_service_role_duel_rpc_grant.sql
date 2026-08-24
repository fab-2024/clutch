-- The duel RPC is part of the mobile contract and must remain callable by
-- trusted backend code after the circle-duels migration recreates it.
grant execute on function public.clutch_mes_defis_match(integer) to service_role;
