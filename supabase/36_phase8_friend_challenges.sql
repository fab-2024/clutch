-- Phase 8 — friend challenges / 1v1 match duels

create table if not exists public.defis_match (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  match_id text not null references public.matchs(id) on delete cascade,
  saison_id text not null,
  createur_id uuid not null references public.profils(id) on delete cascade,
  createur_pronostic_id uuid not null references public.pronostics_classes(id) on delete cascade,
  accepteur_id uuid references public.profils(id) on delete set null,
  accepteur_pronostic_id uuid references public.pronostics_classes(id) on delete set null,
  statut text not null default 'en_attente' check (statut in ('en_attente','accepte','termine','annule')),
  cree_le timestamptz not null default now(),
  accepte_le timestamptz,
  termine_le timestamptz,
  annule_le timestamptz,
  unique (createur_id, match_id),
  check (accepteur_id is null or accepteur_id <> createur_id)
);

create index if not exists defis_match_accepteur_statut_idx on public.defis_match(accepteur_id, statut);
create index if not exists defis_match_match_statut_idx on public.defis_match(match_id, statut);
create index if not exists defis_match_createur_statut_idx on public.defis_match(createur_id, statut);

alter table public.defis_match enable row level security;
revoke all on table public.defis_match from anon, authenticated;

create or replace function public.clutch_creer_defi_match(p_match_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_prono public.pronostics_classes%rowtype;
  v_match public.matchs%rowtype;
  v_defi public.defis_match%rowtype;
  v_attente integer;
begin
  if v_moi is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select * into v_match from public.matchs where id = p_match_id;
  if not found then raise exception 'match introuvable' using errcode = 'P0002'; end if;
  if v_match.statut <> 'a_venir' or v_match.debut <= now() then
    raise exception 'ce match ne peut plus etre defie' using errcode = 'P0001';
  end if;

  select * into v_prono
  from public.pronostics_classes
  where user_id = v_moi and match_id = p_match_id and statut = 'en_cours'
  limit 1;
  if not found then
    raise exception 'verrouille d abord ton pronostic sur ce match' using errcode = 'P0001';
  end if;

  select * into v_defi
  from public.defis_match
  where createur_id = v_moi and match_id = p_match_id
  for update;

  if found then
    if v_defi.statut = 'annule' then
      update public.defis_match
      set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
          createur_pronostic_id = v_prono.id,
          saison_id = v_prono.saison_id,
          accepteur_id = null,
          accepteur_pronostic_id = null,
          statut = 'en_attente',
          cree_le = now(),
          accepte_le = null,
          termine_le = null,
          annule_le = null
      where id = v_defi.id
      returning * into v_defi;
    end if;

    return jsonb_build_object(
      'id', v_defi.id,
      'token', v_defi.token,
      'statut', v_defi.statut,
      'match_id', v_defi.match_id
    );
  end if;

  select count(*) into v_attente
  from public.defis_match
  where createur_id = v_moi and statut = 'en_attente';
  if v_attente >= 10 then
    raise exception 'trop de defis en attente' using errcode = 'P0001';
  end if;

  insert into public.defis_match(match_id, saison_id, createur_id, createur_pronostic_id)
  values (p_match_id, v_prono.saison_id, v_moi, v_prono.id)
  returning * into v_defi;

  return jsonb_build_object(
    'id', v_defi.id,
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id
  );
end;
$$;

create or replace function public.clutch_defi_match_public(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select dm.*,
      case when dm.statut = 'en_attente' and (m.statut <> 'a_venir' or m.debut <= now()) then 'expire' else dm.statut end as statut_effectif,
      m.jeu, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b, m.evenement, m.format, m.debut, m.score_a, m.score_b,
      pc.choix as createur_choix, pc.conviction as createur_conviction, pc.multiplicateur_conviction as createur_mult,
      pa.choix as accepteur_choix, pa.conviction as accepteur_conviction,
      pcrea.pseudo as createur_pseudo,
      pacc.pseudo as accepteur_pseudo
    from public.defis_match dm
    join public.v_matchs m on m.id = dm.match_id
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.profils pcrea on pcrea.id = dm.createur_id
    left join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = dm.accepteur_id
    where dm.token = lower(trim(p_token))
    limit 1
  ), moi as (
    select p.id, p.choix, p.conviction, p.statut
    from d
    join public.pronostics_classes p on p.match_id = d.match_id
    where auth.uid() is not null and p.user_id = auth.uid()
    limit 1
  )
  select case when d.id is null then null else jsonb_build_object(
    'token', d.token,
    'statut', d.statut_effectif,
    'match_id', d.match_id,
    'jeu', d.jeu,
    'evenement', d.evenement,
    'format', d.format,
    'debut', d.debut,
    'score_a', d.score_a,
    'score_b', d.score_b,
    'equipe_a', d.equipe_a,
    'equipe_b', d.equipe_b,
    'tag_a', d.tag_a,
    'tag_b', d.tag_b,
    'createur_pseudo', d.createur_pseudo,
    'createur_choix', d.createur_choix,
    'createur_conviction', d.createur_conviction,
    'createur_multiplicateur', d.createur_mult,
    'choix_oppose', case when d.createur_choix = 'a' then 'b' else 'a' end,
    'equipe_opposee', case when d.createur_choix = 'a' then d.equipe_b else d.equipe_a end,
    'tag_oppose', case when d.createur_choix = 'a' then d.tag_b else d.tag_a end,
    'accepteur_pseudo', d.accepteur_pseudo,
    'accepteur_choix', d.accepteur_choix,
    'accepteur_conviction', d.accepteur_conviction,
    'moi_role', case when auth.uid() = d.createur_id then 'createur' when auth.uid() = d.accepteur_id then 'accepteur' else 'visiteur' end,
    'mon_prono', case when moi.id is null then null else jsonb_build_object('id', moi.id, 'choix', moi.choix, 'conviction', moi.conviction, 'statut', moi.statut) end
  ) end
  from d left join moi on true;
$$;

create or replace function public.clutch_accepter_defi_match(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
  v_createur public.pronostics_classes%rowtype;
  v_mien public.pronostics_classes%rowtype;
  v_match public.matchs%rowtype;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;

  select * into v_defi from public.defis_match where token = lower(trim(p_token)) for update;
  if not found then raise exception 'defi introuvable' using errcode = 'P0002'; end if;
  if v_defi.createur_id = v_moi then raise exception 'tu ne peux pas accepter ton propre defi' using errcode = 'P0001'; end if;
  if v_defi.statut <> 'en_attente' then raise exception 'ce defi n est plus disponible' using errcode = 'P0001'; end if;

  select * into v_match from public.matchs where id = v_defi.match_id;
  if v_match.statut <> 'a_venir' or v_match.debut <= now() then
    raise exception 'ce defi est expire' using errcode = 'P0001';
  end if;

  select * into v_createur from public.pronostics_classes where id = v_defi.createur_pronostic_id;
  select * into v_mien from public.pronostics_classes
  where user_id = v_moi and match_id = v_defi.match_id and statut = 'en_cours'
  limit 1;
  if not found then raise exception 'verrouille ton pronostic avant d accepter' using errcode = 'P0001'; end if;
  if v_mien.choix = v_createur.choix then
    raise exception 'ton pronostic est du meme camp que le challenger' using errcode = 'P0001';
  end if;

  update public.defis_match
  set accepteur_id = v_moi,
      accepteur_pronostic_id = v_mien.id,
      statut = 'accepte',
      accepte_le = now()
  where id = v_defi.id
  returning * into v_defi;

  return jsonb_build_object('token', v_defi.token, 'statut', v_defi.statut, 'match_id', v_defi.match_id);
end;
$$;

create or replace function public.clutch_annuler_defi_match(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  update public.defis_match
  set statut = 'annule', annule_le = now()
  where token = lower(trim(p_token)) and createur_id = v_moi and statut = 'en_attente'
  returning * into v_defi;
  if not found then raise exception 'defi non annulable' using errcode = 'P0001'; end if;
  return jsonb_build_object('token', v_defi.token, 'statut', v_defi.statut);
end;
$$;

create or replace function public.clutch_mes_defis_match(p_limite integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce(jsonb_agg(x order by x.quand desc), '[]'::jsonb) end
  from (
    select
      d.token,
      d.statut,
      d.match_id,
      d.cree_le as quand,
      d.accepte_le,
      d.termine_le,
      m.jeu, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b, m.evenement, m.debut, m.score_a, m.score_b,
      pc.choix as createur_choix, pc.conviction as createur_conviction, pcrea.pseudo as createur_pseudo,
      pa.choix as accepteur_choix, pa.conviction as accepteur_conviction, pacc.pseudo as accepteur_pseudo,
      case when d.createur_id = auth.uid() then 'createur' else 'accepteur' end as moi_role
    from public.defis_match d
    join public.v_matchs m on m.id = d.match_id
    join public.pronostics_classes pc on pc.id = d.createur_pronostic_id
    join public.profils pcrea on pcrea.id = d.createur_id
    left join public.pronostics_classes pa on pa.id = d.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = d.accepteur_id
    where auth.uid() is not null
      and (d.createur_id = auth.uid() or d.accepteur_id = auth.uid())
    order by d.cree_le desc
    limit greatest(1, least(coalesce(p_limite,30), 50))
  ) x;
$$;

create or replace function public.clutch_duel_resultat_match(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
  v_autre uuid;
  v_autre_pseudo text;
  v_moi_prono public.pronostics_classes%rowtype;
  v_autre_prono public.pronostics_classes%rowtype;
  v_score_moi integer := 0;
  v_score_autre integer := 0;
begin
  if v_moi is null then return null; end if;

  select * into v_defi
  from public.defis_match
  where match_id = p_match_id
    and statut in ('accepte','termine')
    and (createur_id = v_moi or accepteur_id = v_moi)
  order by accepte_le desc nulls last
  limit 1;
  if not found then return null; end if;

  if v_defi.createur_id = v_moi then
    v_autre := v_defi.accepteur_id;
    select * into v_moi_prono from public.pronostics_classes where id = v_defi.createur_pronostic_id;
    select * into v_autre_prono from public.pronostics_classes where id = v_defi.accepteur_pronostic_id;
  else
    v_autre := v_defi.createur_id;
    select * into v_moi_prono from public.pronostics_classes where id = v_defi.accepteur_pronostic_id;
    select * into v_autre_prono from public.pronostics_classes where id = v_defi.createur_pronostic_id;
  end if;

  select pseudo into v_autre_pseudo from public.profils where id = v_autre;

  select
    count(*) filter (where (d.createur_id = v_moi and pc.statut = 'gagne') or (d.accepteur_id = v_moi and pa.statut = 'gagne')),
    count(*) filter (where (d.createur_id = v_autre and pc.statut = 'gagne') or (d.accepteur_id = v_autre and pa.statut = 'gagne'))
  into v_score_moi, v_score_autre
  from public.defis_match d
  join public.pronostics_classes pc on pc.id = d.createur_pronostic_id
  join public.pronostics_classes pa on pa.id = d.accepteur_pronostic_id
  where d.statut = 'termine'
    and ((d.createur_id = v_moi and d.accepteur_id = v_autre) or (d.createur_id = v_autre and d.accepteur_id = v_moi));

  return jsonb_build_object(
    'token', v_defi.token,
    'statut', v_defi.statut,
    'adversaire_pseudo', v_autre_pseudo,
    'moi_gagne', v_moi_prono.statut = 'gagne',
    'mon_statut', v_moi_prono.statut,
    'adversaire_statut', v_autre_prono.statut,
    'score_moi', coalesce(v_score_moi,0),
    'score_adversaire', coalesce(v_score_autre,0)
  );
end;
$$;

create or replace function private.clutch_terminer_defis_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut not in ('gagne','perdu') then return new; end if;

  update public.defis_match d
  set statut = 'termine', termine_le = coalesce(d.termine_le, now())
  where d.statut = 'accepte'
    and (d.createur_pronostic_id = new.id or d.accepteur_pronostic_id = new.id)
    and exists (select 1 from public.pronostics_classes p where p.id = d.createur_pronostic_id and p.statut in ('gagne','perdu'))
    and exists (select 1 from public.pronostics_classes p where p.id = d.accepteur_pronostic_id and p.statut in ('gagne','perdu'));
  return new;
end;
$$;

drop trigger if exists trg_phase8_terminer_defis_match on public.pronostics_classes;
create trigger trg_phase8_terminer_defis_match
after update of statut on public.pronostics_classes
for each row
when (old.statut is distinct from new.statut and new.statut in ('gagne','perdu'))
execute function private.clutch_terminer_defis_match();

revoke execute on function public.clutch_creer_defi_match(text) from public, anon;
revoke execute on function public.clutch_accepter_defi_match(text) from public, anon;
revoke execute on function public.clutch_annuler_defi_match(text) from public, anon;
revoke execute on function public.clutch_mes_defis_match(integer) from public, anon;
revoke execute on function public.clutch_duel_resultat_match(text) from public, anon;
revoke execute on function public.clutch_defi_match_public(text) from public;

grant execute on function public.clutch_creer_defi_match(text) to authenticated;
grant execute on function public.clutch_accepter_defi_match(text) to authenticated;
grant execute on function public.clutch_annuler_defi_match(text) to authenticated;
grant execute on function public.clutch_mes_defis_match(integer) to authenticated;
grant execute on function public.clutch_duel_resultat_match(text) to authenticated;
grant execute on function public.clutch_defi_match_public(text) to anon, authenticated;
