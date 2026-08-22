-- Follow-up from Supabase advisors for monetization phase 3.1 / 3.2.
-- Read-only RPCs need no elevated rights because their underlying tables have
-- explicit SELECT grants and RLS. The onboarding write RPC intentionally stays
-- SECURITY DEFINER and derives its target exclusively from auth.uid().

create index if not exists volts_mouvements_objet_idx
  on public.volts_mouvements (objet_id)
  where objet_id is not null;

alter function public.clutch_journal_volts_v1(integer, timestamptz)
  security invoker;
alter function public.clutch_simuler_economie_volts_v1()
  security invoker;

revoke execute on function public.clutch_simuler_economie_volts_v1()
from anon;

comment on function public.clutch_journal_volts_v1(integer, timestamptz) is
  'Authenticated owner-only Volt ledger. SECURITY INVOKER and owner RLS expose source, links, idempotency and resulting balance.';
comment on function public.clutch_simuler_economie_volts_v1() is
  'Authenticated deterministic economy simulation over the readable cosmetic catalogue; no elevated privileges required.';

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'clutch_journal_volts_v1',
        'clutch_simuler_economie_volts_v1'
      )
      and p.prosecdef
  ) then
    raise exception 'Volt read RPC still uses SECURITY DEFINER';
  end if;

  if has_function_privilege('anon', 'public.clutch_simuler_economie_volts_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_simuler_economie_volts_v1()', 'EXECUTE')
  then
    raise exception 'Volt simulation privileges are inconsistent';
  end if;
end;
$$;
