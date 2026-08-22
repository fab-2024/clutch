-- Fairness backfill for profiles that completed onboarding before the one-time
-- 300 Volt reward existed. The existing ledger uniqueness and explicit
-- idempotency key make this safe to replay.

insert into public.volts_mouvements (
  user_id,
  montant,
  origine,
  reference,
  metadata
)
select
  p.id,
  300,
  'onboarding',
  'completion-v1',
  jsonb_build_object('retroactif', true)
from public.profils p
where cardinality(coalesce(p.jeux_suivis, '{}'::text[])) > 0
  and p.equipe_favorite_id is not null
on conflict (user_id, origine, reference) do nothing;

do $$
begin
  if exists (
    select 1
    from public.profils p
    where cardinality(coalesce(p.jeux_suivis, '{}'::text[])) > 0
      and p.equipe_favorite_id is not null
      and not exists (
        select 1
        from public.volts_mouvements m
        where m.user_id = p.id
          and m.origine = 'onboarding'
          and m.reference = 'completion-v1'
          and m.montant = 300
          and m.source_economique = 'onboarding'
      )
  ) then
    raise exception 'A completed onboarding profile is missing its Volt reward';
  end if;
end;
$$;
