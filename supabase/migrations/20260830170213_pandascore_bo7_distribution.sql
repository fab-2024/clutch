-- Complete BO7 support for Rocket League. The column and result lifecycle
-- already accept BO7; the legacy odds distribution still stopped at BO5.

create or replace function public.clutch_distribution(
  p numeric,
  format integer
)
returns table (score_a integer, score_b integer, proba numeric)
language plpgsql
immutable
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  q numeric := 1 - p;
begin
  if format = 1 then
    return query values
      (1, 0, p),
      (0, 1, q);
  elsif format = 3 then
    return query values
      (2, 0, p * p),
      (2, 1, 2 * p * p * q),
      (1, 2, 2 * q * q * p),
      (0, 2, q * q);
  elsif format = 5 then
    return query values
      (3, 0, power(p, 3)),
      (3, 1, 3 * power(p, 3) * q),
      (3, 2, 6 * power(p, 3) * q * q),
      (2, 3, 6 * power(q, 3) * p * p),
      (1, 3, 3 * power(q, 3) * p),
      (0, 3, power(q, 3));
  elsif format = 7 then
    return query values
      (4, 0, power(p, 4)),
      (4, 1, 4 * power(p, 4) * q),
      (4, 2, 10 * power(p, 4) * power(q, 2)),
      (4, 3, 20 * power(p, 4) * power(q, 3)),
      (3, 4, 20 * power(q, 4) * power(p, 3)),
      (2, 4, 10 * power(q, 4) * power(p, 2)),
      (1, 4, 4 * power(q, 4) * p),
      (0, 4, power(q, 4));
  else
    raise exception 'Format de série non supporté : BO%', format;
  end if;
end;
$$;

create or replace function public.creer_match(
  p_event_id text,
  p_equipe_a text,
  p_equipe_b text,
  p_format integer,
  p_debut timestamptz,
  p_saison_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ev public.evenements%rowtype;
  v_a public.equipes%rowtype;
  v_b public.equipes%rowtype;
  v_id text;
begin
  if not public.clutch_est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into v_ev from public.evenements where id = p_event_id;
  if not found then
    raise exception 'Tournoi inconnu.';
  end if;
  if p_equipe_a = p_equipe_b then
    raise exception 'Une équipe ne joue pas contre elle-même.';
  end if;
  if p_format not in (1, 3, 5, 7) then
    raise exception 'Format attendu : BO1, BO3, BO5 ou BO7.';
  end if;
  if p_debut <= now() then
    raise exception 'La date doit être dans le futur, sinon les mises sont fermées d''emblée.';
  end if;
  if not exists (select 1 from public.saisons where id = p_saison_id) then
    raise exception 'Saison inconnue.';
  end if;

  select * into v_a from public.equipes where id = p_equipe_a;
  if not found then
    raise exception 'Équipe inconnue.';
  end if;
  select * into v_b from public.equipes where id = p_equipe_b;
  if not found then
    raise exception 'Équipe inconnue.';
  end if;
  if v_a.jeu <> v_ev.jeu or v_b.jeu <> v_ev.jeu then
    raise exception 'Les deux équipes doivent jouer au même jeu que le tournoi.';
  end if;

  v_id := extensions.gen_random_uuid()::text;
  insert into public.matchs (
    id,
    event_id,
    saison_id,
    jeu,
    equipe_a_id,
    equipe_b_id,
    format,
    debut,
    statut
  )
  values (
    v_id,
    p_event_id,
    p_saison_id,
    v_ev.jeu,
    p_equipe_a,
    p_equipe_b,
    p_format,
    p_debut,
    'a_venir'
  );

  return (
    select to_jsonb(v)
    from public.v_matchs v
    where v.id = v_id
  );
end;
$$;

comment on function public.clutch_distribution(numeric, integer) is
  'Distribution exacte des scores BO1, BO3, BO5 et BO7 à partir de la probabilité de gagner une map.';
