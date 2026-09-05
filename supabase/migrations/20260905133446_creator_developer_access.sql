-- Creator/developer access stays server-owned. It is deliberately separate
-- from est_admin so moderators never inherit internal previews, permanent
-- cosmetic entitlements or the development Volt reserve.

create table if not exists private.comptes_developpeur (
  user_id uuid primary key references public.profils(id) on delete cascade,
  actif boolean not null default true,
  est_createur boolean not null default false,
  volts_illimites boolean not null default true,
  contenu_debloque boolean not null default true,
  cree_le timestamptz not null default pg_catalog.now(),
  modifie_le timestamptz not null default pg_catalog.now()
);

alter table private.comptes_developpeur enable row level security;
revoke all privileges on table private.comptes_developpeur
from public, anon, authenticated, service_role;

comment on table private.comptes_developpeur is
  'Server-owned developer entitlements. Never exposed directly through the Data API.';

create or replace function public.clutch_mon_acces_developpeur_v1()
returns table (
  est_developpeur boolean,
  est_createur boolean,
  volts_illimites boolean,
  contenu_debloque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(pg_catalog.bool_or(c.actif), false) as est_developpeur,
    coalesce(pg_catalog.bool_or(c.actif and c.est_createur), false) as est_createur,
    coalesce(pg_catalog.bool_or(c.actif and c.volts_illimites), false) as volts_illimites,
    coalesce(pg_catalog.bool_or(c.actif and c.contenu_debloque), false) as contenu_debloque
  from private.comptes_developpeur c
  where c.user_id = (select auth.uid());
$$;

revoke all privileges on function public.clutch_mon_acces_developpeur_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_mon_acces_developpeur_v1()
to authenticated, service_role;

comment on function public.clutch_mon_acces_developpeur_v1() is
  'Authenticated self-read of server-owned developer capabilities. The caller cannot select another account.';

create or replace function private.clutch_synchroniser_compte_developpeur_v1(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_compte private.comptes_developpeur%rowtype;
begin
  select c.*
  into v_compte
  from private.comptes_developpeur c
  where c.user_id = p_user_id;

  if not found or not v_compte.actif then
    return;
  end if;

  update public.profils p
  set
    est_admin = true,
    est_fondateur = p.est_fondateur or v_compte.est_createur
  where p.id = p_user_id;

  if v_compte.contenu_debloque then
    insert into public.inventaire (user_id, objet_id)
    select p_user_id, o.id
    from public.objets_catalogue o
    on conflict (user_id, objet_id) do nothing;
  end if;

  if v_compte.volts_illimites then
    insert into public.volts_mouvements (
      user_id,
      montant,
      origine,
      reference,
      metadata
    ) values (
      p_user_id,
      1000000000,
      'ajustement',
      'developer-reserve-v1',
      jsonb_build_object(
        'developer_reserve', true,
        'competitive_impact', false
      )
    )
    on conflict (user_id, origine, reference) do nothing;
  end if;
end;
$$;

revoke all privileges on function private.clutch_synchroniser_compte_developpeur_v1(uuid)
from public, anon, authenticated, service_role;

-- Developer membership is operational data and must be provisioned explicitly
-- per environment. No privileged account identifier belongs in migrations.

notify pgrst, 'reload schema';
