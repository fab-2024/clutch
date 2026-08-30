-- Clutch — Phase 4.1 onboarding hotfix
-- Persiste les jeux choisis pendant l'onboarding dans le profil utilisateur.

alter table public.profils
  add column if not exists jeux_suivis text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profils_jeux_suivis_valides'
      and conrelid = 'public.profils'::regclass
  ) then
    alter table public.profils
      add constraint profils_jeux_suivis_valides
      check (jeux_suivis <@ array['lol','rocket_league','valorant']::text[]);
  end if;
end $$;

create or replace function public.clutch_definir_jeux_suivis(p_jeux text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_jeux text[];
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(array_agg(distinct jeu order by jeu), '{}'::text[])
    into v_jeux
  from unnest(coalesce(p_jeux, '{}'::text[])) as jeu
  where jeu = any(array['lol','rocket_league','valorant']::text[]);

  update public.profils
     set jeux_suivis = v_jeux
   where id = v_user;

  if not found then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;

  return v_jeux;
end;
$$;

revoke execute on function public.clutch_definir_jeux_suivis(text[]) from public, anon;
grant execute on function public.clutch_definir_jeux_suivis(text[]) to authenticated;
