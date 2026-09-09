-- Bind the private function at creation time, matching the existing hardened
-- bonus claim wrapper. Do not grant clients USAGE on the private schema.
create or replace function public.clutch_statut_bonus_quotidien_v1(p_fuseau text default 'UTC')
returns jsonb
language sql
security invoker
set search_path = ''
begin atomic;
  select private.clutch_statut_bonus_quotidien_v1(p_fuseau);
end;
revoke all privileges on function public.clutch_statut_bonus_quotidien_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_statut_bonus_quotidien_v1(text) to authenticated;
notify pgrst, 'reload schema';
