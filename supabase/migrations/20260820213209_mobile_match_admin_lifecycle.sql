-- Mobile match operations: make the lifecycle explicit and expose only the
-- two transitions that were still missing from the authenticated admin API.

create or replace function private.clutch_guard_match_lifecycle_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.statut in ('termine', 'annule') and (
    new.statut is distinct from old.statut
    or new.debut is distinct from old.debut
    or new.score_a is distinct from old.score_a
    or new.score_b is distinct from old.score_b
  ) then
    raise exception 'Un match termine ou annule est verrouille.' using errcode = 'P0001';
  end if;

  if old.statut = 'en_cours' and new.statut = 'a_venir' then
    raise exception 'Un match en cours ne peut pas revenir a venir.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_guard_match_lifecycle_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists clutch_guard_match_lifecycle_v1 on public.matchs;
create trigger clutch_guard_match_lifecycle_v1
before update of statut, debut, score_a, score_b on public.matchs
for each row execute function private.clutch_guard_match_lifecycle_v1();

alter table public.matchs
  drop constraint if exists matchs_resultat_termine_coherent;

alter table public.matchs
  add constraint matchs_resultat_termine_coherent
  check (
    statut <> 'termine'
    or (
      score_a is not null
      and score_b is not null
      and score_a <> score_b
      and greatest(score_a, score_b) = ceil(format / 2.0)
    )
  ) not valid;

alter table public.matchs validate constraint matchs_resultat_termine_coherent;

create or replace function public.clutch_admin_demarrer_match_v1(p_match_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
begin
  if not exists (
    select 1
    from public.profils
    where id = auth.uid() and est_admin
  ) then
    raise exception 'Reserve aux administrateurs.' using errcode = '42501';
  end if;

  select * into v_match
  from public.matchs
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  if v_match.statut = 'en_cours' then
    return (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id);
  end if;

  if v_match.statut <> 'a_venir' then
    raise exception 'Seul un match a venir peut demarrer.' using errcode = 'P0001';
  end if;

  update public.matchs
  set statut = 'en_cours'
  where id = p_match_id;

  return (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id);
end;
$$;

create or replace function public.clutch_admin_reporter_match_v1(
  p_match_id text,
  p_nouveau_debut timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
begin
  if not exists (
    select 1
    from public.profils
    where id = auth.uid() and est_admin
  ) then
    raise exception 'Reserve aux administrateurs.' using errcode = '42501';
  end if;

  if p_nouveau_debut is null or p_nouveau_debut <= now() then
    raise exception 'La nouvelle date doit etre dans le futur.' using errcode = '22023';
  end if;

  select * into v_match
  from public.matchs
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  if v_match.statut <> 'a_venir' then
    raise exception 'Seul un match a venir peut etre reporte.' using errcode = 'P0001';
  end if;

  update public.matchs
  set debut = p_nouveau_debut
  where id = p_match_id;

  return (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id);
end;
$$;

revoke all privileges on function public.clutch_admin_demarrer_match_v1(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_admin_reporter_match_v1(text, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_admin_demarrer_match_v1(text)
  to authenticated, service_role;
grant execute on function public.clutch_admin_reporter_match_v1(text, timestamptz)
  to authenticated, service_role;

comment on function public.clutch_admin_demarrer_match_v1(text) is
  'Passe un match a venir en cours. Reserve aux profils administrateurs.';
comment on function public.clutch_admin_reporter_match_v1(text, timestamptz) is
  'Reporte un match a venir vers une date future. Reserve aux profils administrateurs.';
;
