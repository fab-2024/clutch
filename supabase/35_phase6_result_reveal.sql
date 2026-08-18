-- =====================================================================
-- Clutch — Phase 6 / Result reveal
--
-- A settled prediction is now a durable product moment, not just a history row.
-- We snapshot the competitive state around settlement so the client can show
-- a truthful Frags/rank transition, and we track whether that result has been
-- revealed to the player.
-- =====================================================================

alter table public.pronostics_classes
  add column if not exists frags_avant integer;

alter table public.pronostics_classes
  add column if not exists frags_apres integer;

alter table public.pronostics_classes
  add column if not exists rang_avant integer;

alter table public.pronostics_classes
  add column if not exists rang_apres integer;

alter table public.pronostics_classes
  add column if not exists revele_le timestamptz;

comment on column public.pronostics_classes.frags_avant is
  'Phase 6 snapshot: rating immediately before this prediction was settled.';
comment on column public.pronostics_classes.frags_apres is
  'Phase 6 snapshot: rating immediately after this prediction was settled.';
comment on column public.pronostics_classes.rang_avant is
  'Phase 6 snapshot: deterministic global season rank before settlement.';
comment on column public.pronostics_classes.rang_apres is
  'Phase 6 snapshot: deterministic global season rank after every prediction on the match has settled.';
comment on column public.pronostics_classes.revele_le is
  'First time the player explicitly dismissed/continued past the cinematic result reveal.';

-- Historical settled rows predate the snapshot contract. Do not surprise users
-- by replaying an unverifiable backlog after deploying Phase 6.
update public.pronostics_classes
set revele_le = coalesce(revele_le, regle_le, now())
where statut in ('gagne','perdu')
  and (frags_avant is null or frags_apres is null);

-- Same ordering as the public Global ranking, with user_id as a final stable
-- tie-breaker so a reveal never displays a nondeterministic rank.
create or replace function private.clutch_rang_frags_v1(
  p_saison_id text,
  p_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select q.rang::integer
  from (
    select
      c.user_id,
      row_number() over (
        order by c.frags desc,
                 c.pronostics_gagnes desc,
                 c.maj_le asc,
                 c.user_id asc
      ) as rang
    from public.classements_frags c
    where c.saison_id = p_saison_id
  ) q
  where q.user_id = p_user_id
$$;

revoke all on function private.clutch_rang_frags_v1(text, uuid) from public, anon, authenticated;

-- Phase 5 conviction-aware settlement + Phase 6 before/after snapshots.
create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    update public.pronostics_classes
    set statut = 'annule',
        delta_frags = 0,
        regle_le = now(),
        revele_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' or old.statut = 'termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a = new.score_b then
    raise exception 'Impossible de regler les Frags : score final invalide pour %', new.id;
  end if;

  -- Ensure every participant has a ranking row BEFORE taking the snapshot.
  insert into public.classements_frags(saison_id,user_id,frags,pic_frags)
  select distinct
    p.saison_id,
    p.user_id,
    public.clutch_frags_initial(),
    public.clutch_frags_initial()
  from public.pronostics_classes p
  where p.match_id = new.id and p.statut = 'en_cours'
  on conflict(saison_id,user_id) do nothing;

  -- Snapshot every player's BEFORE state while standings are still untouched.
  update public.pronostics_classes p
  set frags_avant = c.frags,
      rang_avant = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  from public.classements_frags c
  where p.match_id = new.id
    and p.statut = 'en_cours'
    and c.saison_id = p.saison_id
    and c.user_id = p.user_id;

  for r in
    select *
    from public.pronostics_classes
    where match_id = new.id and statut = 'en_cours'
    order by cree_le,id
    for update
  loop
    v_gagnant := case
      when r.choix = 'a' then new.score_a > new.score_b
      else new.score_b > new.score_a
    end;

    v_delta := public.clutch_delta_frags_conviction(
      r.proba_scoring,
      v_gagnant,
      r.k_frags,
      coalesce(r.conviction,'normal')
    );

    v_frags_apres := coalesce(r.frags_avant, public.clutch_frags_initial()) + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags,v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        frags_apres = v_frags_apres,
        regle_le = now(),
        revele_le = null
    where id = r.id;
  end loop;

  -- Rank AFTER is captured only once the whole match has affected standings.
  update public.pronostics_classes p
  set rang_apres = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  where p.match_id = new.id
    and p.statut in ('gagne','perdu')
    and p.rang_avant is not null
    and p.rang_apres is null;

  return new;
end;
$$;

revoke all on function private.clutch_resoudre_pronostics_classes() from public, anon, authenticated;

drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of statut,score_a,score_b on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

-- The next unseen result. Read-only and SECURITY INVOKER: RLS on
-- pronostics_classes remains the authority for private player data.
create or replace function public.clutch_prochain_resultat_a_reveler()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cible as (
    select
      p.*,
      m.equipe_a,
      m.equipe_b,
      m.tag_a,
      m.tag_b,
      m.score_a,
      m.score_b,
      m.jeu,
      m.evenement,
      m.format,
      m.debut
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = auth.uid()
      and p.statut in ('gagne','perdu')
      and p.revele_le is null
    order by p.regle_le asc nulls last, p.cree_le asc
    limit 1
  ), compteur as (
    select count(*)::integer as total
    from public.pronostics_classes p
    where p.user_id = auth.uid()
      and p.statut in ('gagne','perdu')
      and p.revele_le is null
  )
  select case when c.id is null then null else jsonb_build_object(
    'id', c.id,
    'match_id', c.match_id,
    'saison_id', c.saison_id,
    'statut', c.statut,
    'choix', c.choix,
    'conviction', c.conviction,
    'multiplicateur_conviction', c.multiplicateur_conviction,
    'proba_figee', c.proba_figee,
    'delta_frags', c.delta_frags,
    'frags_avant', c.frags_avant,
    'frags_apres', c.frags_apres,
    'rang_avant', c.rang_avant,
    'rang_apres', c.rang_apres,
    'regle_le', c.regle_le,
    'equipe_a', c.equipe_a,
    'equipe_b', c.equipe_b,
    'tag_a', c.tag_a,
    'tag_b', c.tag_b,
    'score_a', c.score_a,
    'score_b', c.score_b,
    'jeu', c.jeu,
    'evenement', c.evenement,
    'format', c.format,
    'debut', c.debut,
    'restants', compteur.total
  ) end
  from compteur
  left join cible c on true
$$;

-- Same payload for replay from a completed Match Center, even if already seen.
create or replace function public.clutch_resultat_match_v1(p_match_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'match_id', p.match_id,
    'saison_id', p.saison_id,
    'statut', p.statut,
    'choix', p.choix,
    'conviction', p.conviction,
    'multiplicateur_conviction', p.multiplicateur_conviction,
    'proba_figee', p.proba_figee,
    'delta_frags', p.delta_frags,
    'frags_avant', p.frags_avant,
    'frags_apres', p.frags_apres,
    'rang_avant', p.rang_avant,
    'rang_apres', p.rang_apres,
    'regle_le', p.regle_le,
    'revele_le', p.revele_le,
    'equipe_a', m.equipe_a,
    'equipe_b', m.equipe_b,
    'tag_a', m.tag_a,
    'tag_b', m.tag_b,
    'score_a', m.score_a,
    'score_b', m.score_b,
    'jeu', m.jeu,
    'evenement', m.evenement,
    'format', m.format,
    'debut', m.debut,
    'restants', 1
  )
  from public.pronostics_classes p
  join public.v_matchs m on m.id = p.match_id
  where p.user_id = auth.uid()
    and p.match_id = p_match_id
    and p.statut in ('gagne','perdu')
  limit 1
$$;

create or replace function public.clutch_marquer_resultat_revele(p_pronostic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_revele timestamptz;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  update public.pronostics_classes
  set revele_le = coalesce(revele_le, now())
  where id = p_pronostic_id
    and user_id = v_user
    and statut in ('gagne','perdu')
  returning revele_le into v_revele;

  if not found then
    raise exception 'Resultat introuvable.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id',p_pronostic_id,'revele_le',v_revele);
end;
$$;

revoke execute on function public.clutch_prochain_resultat_a_reveler() from public, anon;
revoke execute on function public.clutch_resultat_match_v1(text) from public, anon;
revoke execute on function public.clutch_marquer_resultat_revele(uuid) from public, anon;

grant execute on function public.clutch_prochain_resultat_a_reveler() to authenticated;
grant execute on function public.clutch_resultat_match_v1(text) to authenticated;
grant execute on function public.clutch_marquer_resultat_revele(uuid) to authenticated;
