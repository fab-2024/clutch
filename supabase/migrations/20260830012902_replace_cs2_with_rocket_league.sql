-- Replace the retired Counter-Strike catalog entry with Rocket League while
-- preserving existing profiles, teams, matches and prediction history.

alter table public.equipes
  drop constraint if exists equipes_jeu_check;
alter table public.evenements
  drop constraint if exists evenements_jeu_check;
alter table public.matchs
  drop constraint if exists matchs_jeu_check;
alter table public.profils
  drop constraint if exists profils_jeux_suivis_valides;

update public.profils p
set jeux_suivis = (
  select coalesce(array_agg(game order by game), '{}'::text[]) as jeux
  from (
    select distinct case when selected_game = 'cs2' then 'rocket_league' else selected_game end as game
    from unnest(coalesce(p.jeux_suivis, '{}'::text[])) as selected_game
  ) games
)
where 'cs2' = any(coalesce(p.jeux_suivis, '{}'::text[]));

update public.equipes
set jeu = 'rocket_league',
    nom = case id
      when 'cs-vit' then 'Team Vitality'
      when 'cs-navi' then 'Karmine Corp'
      when 'cs-spirit' then 'Team BDS'
      when 'cs-faze' then 'Gentle Mates'
      when 'cs-mouz' then 'NRG'
      when 'cs-g2' then 'G2 Stride'
      when 'cs-falcons' then 'Team Falcons'
      when 'cs-astralis' then 'Gen.G Mobil1 Racing'
      when 'cs-vp' then 'Spacestation Gaming'
      when 'cs-heroic' then 'FURIA'
      else nom
    end,
    tag = case id
      when 'cs-vit' then 'VIT'
      when 'cs-navi' then 'KC'
      when 'cs-spirit' then 'BDS'
      when 'cs-faze' then 'M8'
      when 'cs-mouz' then 'NRG'
      when 'cs-g2' then 'G2'
      when 'cs-falcons' then 'FLC'
      when 'cs-astralis' then 'GEN'
      when 'cs-vp' then 'SSG'
      when 'cs-heroic' then 'FUR'
      else tag
    end
where jeu = 'cs2';

update public.evenements
set jeu = 'rocket_league',
    nom = case id
      when 'blast-bounty' then 'RLCS Major'
      when 'esl-pro' then 'RLCS Open'
      else nom
    end
where jeu = 'cs2';

update public.matchs
set jeu = 'rocket_league'
where jeu = 'cs2';

alter table public.equipes
  add constraint equipes_jeu_check
  check (jeu in ('lol', 'rocket_league', 'valorant'));
alter table public.evenements
  add constraint evenements_jeu_check
  check (jeu in ('lol', 'rocket_league', 'valorant'));
alter table public.matchs
  add constraint matchs_jeu_check
  check (jeu in ('lol', 'rocket_league', 'valorant'));
alter table public.profils
  add constraint profils_jeux_suivis_valides
  check (jeux_suivis <@ array['lol', 'rocket_league', 'valorant']::text[]);

create or replace function public.creer_evenement(
  p_nom text,
  p_jeu text,
  p_tier text default 'A'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_ev public.evenements%rowtype;
begin
  if not public.clutch_est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Donne un nom au tournoi.';
  end if;
  if p_jeu not in ('lol', 'rocket_league', 'valorant') then
    raise exception 'Jeu inconnu.';
  end if;

  v_id := 'ev-' || left(regexp_replace(lower(public.unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);

  if exists (select 1 from public.evenements where id = v_id) then
    raise exception 'Un tournoi porte déjà ce nom.';
  end if;

  insert into public.evenements (id, jeu, nom, tier)
  values (v_id, p_jeu, left(trim(p_nom), 60), coalesce(p_tier, 'A'))
  returning * into v_ev;

  return to_jsonb(v_ev);
end;
$$;

create or replace function public.creer_equipe(
  p_nom text,
  p_tag text,
  p_jeu text,
  p_elo integer default 1500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_eq public.equipes%rowtype;
begin
  if not public.clutch_est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Donne un nom à l''équipe.';
  end if;
  if trim(p_tag) !~ '^[A-Za-z0-9.]{2,6}$' then
    raise exception 'Le tag fait 2 à 6 caractères, sans espace.';
  end if;
  if p_jeu not in ('lol', 'rocket_league', 'valorant') then
    raise exception 'Jeu inconnu.';
  end if;
  if p_elo < 1000 or p_elo > 2200 then
    raise exception 'L''Elo de départ doit être entre 1000 et 2200.';
  end if;

  v_id := 'eq-' || left(regexp_replace(lower(public.unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);

  if exists (select 1 from public.equipes where id = v_id) then
    raise exception 'Une équipe porte déjà ce nom.';
  end if;

  insert into public.equipes (id, jeu, nom, tag, elo)
  values (v_id, p_jeu, left(trim(p_nom), 40), upper(trim(p_tag)), p_elo)
  returning * into v_eq;

  return to_jsonb(v_eq);
end;
$$;

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
  from (
    select case when selected_game = 'cs2' then 'rocket_league' else selected_game end as jeu
    from unnest(coalesce(p_jeux, '{}'::text[])) as selected_game
  ) normalized
  where jeu = any(array['lol', 'rocket_league', 'valorant']::text[]);

  update public.profils
  set jeux_suivis = v_jeux
  where id = v_user;

  if not found then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;

  return v_jeux;
end;
$$;

create or replace function public.clutch_terminer_onboarding_v1(
  p_jeux text[],
  p_equipe_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_jeux text[];
  v_equipe_id text := btrim(p_equipe_id);
  v_credite boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(array_agg(distinct jeu order by jeu), '{}'::text[])
  into v_jeux
  from (
    select case when selected_game = 'cs2' then 'rocket_league' else selected_game end as jeu
    from unnest(coalesce(p_jeux, '{}'::text[])) as selected_game
  ) normalized
  where jeu = any(array['lol', 'rocket_league', 'valorant']::text[]);

  if cardinality(v_jeux) = 0 then
    raise exception 'selectionne au moins un jeu' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.equipes e
    where e.id = v_equipe_id
      and e.jeu = any(v_jeux)
  ) then
    raise exception 'equipe incompatible avec les jeux suivis' using errcode = '22023';
  end if;

  update public.profils p
  set jeux_suivis = v_jeux,
      equipe_favorite_id = v_equipe_id
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
    'jeux', to_jsonb(v_jeux),
    'equipe_id', v_equipe_id,
    'recompense_volts', case when v_credite then 300 else 0 end,
    'recompense_totale', 300,
    'deja_reclamee', not v_credite,
    'solde', public.clutch_solde_volts(v_user)
  );
end;
$$;

comment on function public.clutch_terminer_onboarding_v1(text[], text) is
  'Atomic onboarding completion with Rocket League support and one idempotent 300 Volt reward.';

revoke all privileges on function public.creer_evenement(text, text, text)
from public, anon;
revoke all privileges on function public.creer_equipe(text, text, text, integer)
from public, anon;
revoke all privileges on function public.clutch_definir_jeux_suivis(text[])
from public, anon;
revoke all privileges on function public.clutch_terminer_onboarding_v1(text[], text)
from public, anon, authenticated, service_role;

grant execute on function public.creer_evenement(text, text, text)
to authenticated;
grant execute on function public.creer_equipe(text, text, text, integer)
to authenticated;
grant execute on function public.clutch_definir_jeux_suivis(text[])
to authenticated;
grant execute on function public.clutch_terminer_onboarding_v1(text[], text)
to authenticated, service_role;
