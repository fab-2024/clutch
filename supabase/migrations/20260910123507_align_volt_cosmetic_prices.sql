-- GRIFF: align the fifteen legacy standalone cosmetics with the existing
-- collection ladder (rare 100 / epic 200 / legendary 300 Volts).
-- Only catalogue prices change. Existing purchases and ledger entries remain
-- immutable; no balance migration or retrospective refund is performed.
-- No new objects or privileges: existing catalogue RLS, Data API grants and
-- owner-only purchase RPC permissions continue to apply.
begin;

update public.objets_catalogue
set prix = case rarete when 'rare' then 100 when 'epique' then 200 when 'legendaire' then 300 end
where id in (
  'cadre-profil-2', 'cadre-profil-3', 'cadre-profil-4',
  'carte-profil-2', 'carte-profil-3', 'carte-profil-4',
  'titre-profil-2', 'titre-profil-3', 'titre-profil-4',
  'apparence-core-2', 'apparence-core-3', 'apparence-core-4',
  'effet-faction-2', 'effet-faction-3', 'effet-faction-4'
) and source = 'achat' and rarete in ('rare','epique','legendaire');

do $$
begin
  if (select count(*) from public.objets_catalogue
      where id ~ '^(cadre-profil|carte-profil|titre-profil|apparence-core|effet-faction)-[234]$'
        and source = 'achat'
        and prix = case rarete when 'rare' then 100 when 'epique' then 200 when 'legendaire' then 300 end) <> 15 then
    raise exception 'Expected 15 standalone cosmetics on the new Volt price ladder';
  end if;
end $$;
commit;
