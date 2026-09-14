-- Persist onboarding completion independently from the current catalogue so a
-- player can enter GRIFF even when their game or team is not listed yet.
alter table public.profils
  add column if not exists onboarding_termine_le timestamptz;

update public.profils
set onboarding_termine_le = coalesce(onboarding_termine_le, cree_le, now())
where cardinality(coalesce(jeux_suivis, '{}'::text[])) > 0
  and equipe_favorite_id is not null;

create table if not exists public.onboarding_demandes_catalogue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type_catalogue text not null check (type_catalogue in ('jeu', 'equipe')),
  libelle text not null check (char_length(btrim(libelle)) between 2 and 80),
  libelle_normalise text generated always as (lower(btrim(libelle))) stored,
  cree_le timestamptz not null default now(),
  unique (user_id, type_catalogue, libelle_normalise)
);

alter table public.onboarding_demandes_catalogue enable row level security;

-- Requests are written only through the scoped SECURITY DEFINER RPC below.
-- Keeping the table outside the Data API prevents arbitrary reads and writes.
revoke all privileges on table public.onboarding_demandes_catalogue
from public, anon, authenticated, service_role;
revoke all privileges on sequence public.onboarding_demandes_catalogue_id_seq
from public, anon, authenticated, service_role;

create or replace function public.clutch_mon_statut_onboarding_v1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.onboarding_termine_le is not null
    from public.profils p
    where p.id = auth.uid()
  ), false);
$$;

create or replace function public.clutch_terminer_onboarding_v2(
  p_jeu text default null,
  p_equipe_id text default null,
  p_jeu_demande text default null,
  p_equipe_demandee text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_jeu text := nullif(btrim(coalesce(p_jeu, '')), '');
  v_equipe_id text := nullif(btrim(coalesce(p_equipe_id, '')), '');
  v_jeu_demande text := nullif(btrim(coalesce(p_jeu_demande, '')), '');
  v_equipe_demandee text := nullif(btrim(coalesce(p_equipe_demandee, '')), '');
  v_jeux text[] := '{}'::text[];
  v_credite boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if v_jeu is not null and v_jeu <> all(array['lol', 'rocket_league', 'valorant']::text[]) then
    raise exception 'jeu non pris en charge' using errcode = '22023';
  end if;

  if v_jeu is null and v_jeu_demande is null then
    raise exception 'selectionne ou renseigne un jeu' using errcode = '22023';
  end if;

  if v_jeu_demande is not null and char_length(v_jeu_demande) not between 2 and 80 then
    raise exception 'nom de jeu invalide' using errcode = '22023';
  end if;

  if v_equipe_demandee is not null and char_length(v_equipe_demandee) not between 2 and 80 then
    raise exception 'nom d equipe invalide' using errcode = '22023';
  end if;

  if v_equipe_id is not null and not exists (
    select 1
    from public.equipes e
    where e.id = v_equipe_id
      and (v_jeu is null or e.jeu = v_jeu)
  ) then
    raise exception 'equipe incompatible avec le jeu choisi' using errcode = '22023';
  end if;

  if v_jeu is not null then
    v_jeux := array[v_jeu];
  end if;

  insert into public.onboarding_demandes_catalogue(user_id, type_catalogue, libelle)
  select v_user, 'jeu', v_jeu_demande
  where v_jeu_demande is not null
  on conflict (user_id, type_catalogue, libelle_normalise) do nothing;

  insert into public.onboarding_demandes_catalogue(user_id, type_catalogue, libelle)
  select v_user, 'equipe', v_equipe_demandee
  where v_equipe_demandee is not null
  on conflict (user_id, type_catalogue, libelle_normalise) do nothing;

  update public.profils p
  set jeux_suivis = v_jeux,
      equipe_favorite_id = v_equipe_id,
      onboarding_termine_le = coalesce(p.onboarding_termine_le, now())
  where p.id = v_user;

  if not found then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;

  v_credite := public.clutch_crediter_volts(
    v_user,
    300,
    'onboarding',
    'completion-v1'
  );

  return jsonb_build_object(
    'jeu', v_jeu,
    'equipe_id', v_equipe_id,
    'jeu_demande', v_jeu_demande,
    'equipe_demandee', v_equipe_demandee,
    'recompense_volts', case when v_credite then 300 else 0 end,
    'recompense_totale', 300,
    'deja_reclamee', not v_credite,
    'solde', public.clutch_solde_volts(v_user)
  );
end;
$$;

revoke all privileges on function public.clutch_mon_statut_onboarding_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_terminer_onboarding_v2(text, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_mon_statut_onboarding_v1()
to authenticated, service_role;
grant execute on function public.clutch_terminer_onboarding_v2(text, text, text, text)
to authenticated, service_role;

comment on table public.onboarding_demandes_catalogue is
  'Private-by-default requests for games and teams missing from onboarding.';
comment on function public.clutch_terminer_onboarding_v2(text, text, text, text) is
  'Completes onboarding with a supported choice or records missing catalogue requests.';
