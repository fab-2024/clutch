-- =====================================================================
-- Clutch — 19_classements_frags_v2.sql
-- Classements Global/Ligues + rivalité sur le rating Frags V2.
-- =====================================================================

-- Indexes signalés par l'advisor Supabase après 18_economie_v2.sql.
create index if not exists classements_frags_user_idx
  on public.classements_frags (user_id, saison_id);

create index if not exists pronostics_classes_saison_idx
  on public.pronostics_classes (saison_id, user_id);

-- Classement d'une ligue : même métrique que le Global, filtrée aux membres.
create or replace function public.clutch_classement_ligue_frags(
  p_ligue_id uuid,
  p_saison_id text
)
returns table (
  rang bigint,
  id uuid,
  pseudo text,
  frags integer,
  pic_frags integer,
  pronostics_regles integer,
  pronostics_gagnes integer,
  taux_reussite numeric,
  provisoire boolean,
  moi boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from membres_ligue
    where ligue_id = p_ligue_id and user_id = auth.uid()
  ) then
    raise exception 'Tu ne fais pas partie de cette ligue.' using errcode = '42501';
  end if;

  return query
  select
    row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
    pr.id,
    pr.pseudo,
    c.frags,
    c.pic_frags,
    c.pronostics_regles,
    c.pronostics_gagnes,
    case when c.pronostics_regles = 0 then 0::numeric
         else round(c.pronostics_gagnes::numeric / c.pronostics_regles * 100, 1) end,
    c.pronostics_regles < clutch_frags_nb_placements(),
    pr.id = auth.uid()
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  join classements_frags c
    on c.user_id = ml.user_id and c.saison_id = p_saison_id
  where ml.ligue_id = p_ligue_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc;
end;
$$;

-- Rivalité hebdomadaire : un voisin de classement, déterministe pour la semaine.
-- Aucun bénéfice net / mise legacy n'entre dans le calcul.
create or replace function public.clutch_rivalite_frags(
  p_saison_id text,
  p_ligue_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with source as (
    select
      row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
      pr.id,
      pr.pseudo,
      c.frags,
      c.pronostics_regles,
      c.pronostics_gagnes
    from classements_frags c
    join profils pr on pr.id = c.user_id
    where c.saison_id = p_saison_id
      and (
        p_ligue_id is null
        or exists (
          select 1 from membres_ligue ml
          where ml.ligue_id = p_ligue_id and ml.user_id = c.user_id
        )
      )
  ),
  moi as (
    select * from source where id = auth.uid()
  ),
  voisins as (
    select s.*,
      row_number() over (order by abs(s.rang - m.rang), (s.rang > m.rang)) as ordre
    from source s, moi m
    where s.id <> m.id
  ),
  candidats as (
    select * from voisins where ordre <= 3
  ),
  choisi as (
    select * from candidats
    where ordre = mod(
      abs(hashtext(auth.uid()::text || '|' || to_char(now(), 'IYYY-"S"IW'))::bigint),
      greatest((select count(*) from candidats), 1)
    ) + 1
  )
  select jsonb_build_object(
    'semaine', to_char(now(), 'IYYY-"S"IW'),
    'moi', jsonb_build_object(
      'id', m.id,
      'pseudo', m.pseudo,
      'rang', m.rang,
      'frags', m.frags,
      'pronostics_regles', m.pronostics_regles,
      'pronostics_gagnes', m.pronostics_gagnes
    ),
    'rival', jsonb_build_object(
      'id', r.id,
      'pseudo', r.pseudo,
      'rang', r.rang,
      'frags', r.frags,
      'pronostics_regles', r.pronostics_regles,
      'pronostics_gagnes', r.pronostics_gagnes
    ),
    'ecart', m.frags - r.frags
  )
  from moi m, choisi r;
$$;

-- Permissions : uniquement les joueurs connectés.
do $$
declare r text;
begin
  foreach r in array array['public', 'anon'] loop
    if r = 'public' then
      revoke execute on function public.clutch_classement_ligue_frags(uuid, text) from public;
      revoke execute on function public.clutch_rivalite_frags(text, uuid) from public;
    elsif exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function public.clutch_classement_ligue_frags(uuid, text) from %I', r);
      execute format('revoke execute on function public.clutch_rivalite_frags(text, uuid) from %I', r);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.clutch_classement_ligue_frags(uuid, text) to authenticated;
    grant execute on function public.clutch_rivalite_frags(text, uuid) to authenticated;
  end if;
end $$;
