-- Lot 1.4 — operational reliability for match results.
--
-- Guarantees introduced here:
--   * every final result has a source and a source-owned identifier;
--   * settlement is serialized per season and idempotent on replay;
--   * score corrections use a dedicated admin RPC and rebuild Frags history;
--   * every operational transition is appended to an immutable private audit;
--   * public functions and Data API privileges remain explicitly allow-listed.

-- ---------------------------------------------------------------------------
-- Canonical result provenance on the match.
-- ---------------------------------------------------------------------------

alter table public.matchs
  add column if not exists resultat_source text,
  add column if not exists resultat_source_label text,
  add column if not exists resultat_identifiant_externe text,
  add column if not exists resultat_recu_le timestamptz,
  add column if not exists resultat_regle_le timestamptz,
  add column if not exists resultat_maj_le timestamptz,
  add column if not exists resultat_revision integer not null default 0,
  add column if not exists resultat_motif_correction text;

-- Historical finals predate provenance. Give them an explicit, unique legacy
-- identity instead of pretending they came from the new validation pipeline.
update public.matchs m
set resultat_source = 'legacy_clutch',
    resultat_source_label = 'Historique Clutch',
    resultat_identifiant_externe = 'legacy:' || m.id,
    resultat_recu_le = coalesce((
      select max(p.regle_le)
      from public.pronostics_classes p
      where p.match_id = m.id
    ), m.debut, now()),
    resultat_regle_le = coalesce((
      select max(p.regle_le)
      from public.pronostics_classes p
      where p.match_id = m.id
    ), m.debut, now()),
    resultat_maj_le = coalesce((
      select max(p.regle_le)
      from public.pronostics_classes p
      where p.match_id = m.id
    ), m.debut, now()),
    resultat_revision = greatest(m.resultat_revision, 1)
where m.statut = 'termine'
  and (
    m.resultat_source is null
    or m.resultat_identifiant_externe is null
    or m.resultat_regle_le is null
  );

alter table public.matchs
  drop constraint if exists matchs_resultat_provenance_coherente,
  drop constraint if exists matchs_resultat_revision_positive,
  drop constraint if exists matchs_resultat_source_format,
  drop constraint if exists matchs_resultat_identifiant_longueur,
  drop constraint if exists matchs_resultat_motif_correction_longueur;

alter table public.matchs
  add constraint matchs_resultat_revision_positive
    check (resultat_revision >= 0),
  add constraint matchs_resultat_source_format
    check (
      resultat_source is null
      or resultat_source ~ '^[a-z0-9][a-z0-9_-]{1,63}$'
    ),
  add constraint matchs_resultat_identifiant_longueur
    check (
      resultat_identifiant_externe is null
      or char_length(resultat_identifiant_externe) between 1 and 180
    ),
  add constraint matchs_resultat_motif_correction_longueur
    check (
      resultat_motif_correction is null
      or char_length(resultat_motif_correction) between 10 and 240
    ),
  add constraint matchs_resultat_provenance_coherente
    check (
      statut <> 'termine'
      or (
        resultat_source is not null
        and resultat_source_label is not null
        and char_length(resultat_source_label) between 1 and 80
        and resultat_identifiant_externe is not null
        and resultat_recu_le is not null
        and resultat_regle_le is not null
        and resultat_maj_le is not null
        and resultat_revision >= 1
      )
    );

create unique index if not exists matchs_resultat_reference_unique_idx
  on public.matchs (resultat_source, resultat_identifiant_externe)
  where resultat_identifiant_externe is not null;

create index if not exists matchs_resultat_source_regle_idx
  on public.matchs (resultat_source, resultat_regle_le desc)
  where statut = 'termine';

-- The view remains security-invoker and exposes provenance as part of the
-- public result contract. External result identifiers are non-secret proofs.
create or replace view public.v_matchs
with (security_invoker = true)
as
select
  m.id,
  m.event_id,
  m.saison_id,
  m.jeu,
  m.format,
  m.debut,
  m.statut,
  m.score_a,
  m.score_b,
  m.equipe_a_id,
  m.equipe_b_id,
  ea.nom as equipe_a,
  eb.nom as equipe_b,
  ea.tag as tag_a,
  eb.tag as tag_b,
  coalesce(m.elo_a_fige, ea.elo) as elo_a,
  coalesce(m.elo_b_fige, eb.elo) as elo_b,
  ev.nom as evenement,
  m.motif_annulation,
  m.resultat_source,
  m.resultat_source_label,
  m.resultat_identifiant_externe,
  m.resultat_recu_le,
  m.resultat_regle_le,
  m.resultat_maj_le,
  m.resultat_revision,
  m.resultat_motif_correction
from public.matchs m
join public.equipes ea on ea.id = m.equipe_a_id
join public.equipes eb on eb.id = m.equipe_b_id
join public.evenements ev on ev.id = m.event_id;

grant select on public.v_matchs to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Append-only audit kept outside the exposed Data API schema.
-- ---------------------------------------------------------------------------

create table if not exists private.clutch_match_operations_audit (
  id bigint generated always as identity primary key,
  match_id text not null references public.matchs(id) on delete restrict,
  action text not null check (action in (
    'import_historique',
    'demarrage',
    'report',
    'annulation',
    'resultat_initial',
    'correction_resultat'
  )),
  acteur_id uuid,
  acteur_pseudo text,
  source_resultat text,
  identifiant_externe text,
  motif text,
  revision integer not null default 0 check (revision >= 0),
  avant jsonb not null default '{}'::jsonb,
  apres jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);

alter table private.clutch_match_operations_audit enable row level security;

create index if not exists clutch_match_operations_audit_match_date_idx
  on private.clutch_match_operations_audit (match_id, cree_le desc, id desc);

create index if not exists clutch_match_operations_audit_actor_date_idx
  on private.clutch_match_operations_audit (acteur_id, cree_le desc)
  where acteur_id is not null;

revoke all privileges on table private.clutch_match_operations_audit
  from public, anon, authenticated, service_role;
revoke all privileges on sequence private.clutch_match_operations_audit_id_seq
  from public, anon, authenticated, service_role;

create or replace function private.clutch_match_audit_immutable_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Le journal des operations matchs est immuable.'
    using errcode = '55000';
end;
$$;

revoke all privileges on function private.clutch_match_audit_immutable_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists clutch_match_audit_immutable_v1
  on private.clutch_match_operations_audit;
create trigger clutch_match_audit_immutable_v1
before update or delete on private.clutch_match_operations_audit
for each row execute function private.clutch_match_audit_immutable_v1();

insert into private.clutch_match_operations_audit (
  match_id,
  action,
  source_resultat,
  identifiant_externe,
  motif,
  revision,
  apres,
  cree_le
)
select
  m.id,
  'import_historique',
  m.resultat_source,
  m.resultat_identifiant_externe,
  'Import de la provenance des resultats anterieurs au lot 1.4.',
  m.resultat_revision,
  jsonb_build_object(
    'statut', m.statut,
    'score_a', m.score_a,
    'score_b', m.score_b,
    'source', m.resultat_source,
    'identifiant_externe', m.resultat_identifiant_externe,
    'revision', m.resultat_revision
  ),
  coalesce(m.resultat_maj_le, now())
from public.matchs m
where m.statut = 'termine'
  and not exists (
    select 1
    from private.clutch_match_operations_audit a
    where a.match_id = m.id
      and a.action = 'import_historique'
  );

create or replace function private.clutch_auditer_match_v1(
  p_match_id text,
  p_action text,
  p_avant jsonb,
  p_apres jsonb,
  p_source text default null,
  p_identifiant_externe text default null,
  p_motif text default null,
  p_revision integer default 0
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
  v_acteur uuid := auth.uid();
begin
  insert into private.clutch_match_operations_audit (
    match_id,
    action,
    acteur_id,
    acteur_pseudo,
    source_resultat,
    identifiant_externe,
    motif,
    revision,
    avant,
    apres
  )
  values (
    p_match_id,
    p_action,
    v_acteur,
    (select p.pseudo from public.profils p where p.id = v_acteur),
    p_source,
    p_identifiant_externe,
    nullif(left(trim(coalesce(p_motif, '')), 240), ''),
    greatest(coalesce(p_revision, 0), 0),
    coalesce(p_avant, '{}'::jsonb),
    coalesce(p_apres, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all privileges on function private.clutch_auditer_match_v1(
  text, text, jsonb, jsonb, text, text, text, integer
) from public, anon, authenticated, service_role;

create or replace function private.clutch_exiger_admin_v1()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1
    from public.profils p
    where p.id = v_user and p.est_admin
  ) then
    raise exception 'Reserve aux administrateurs.' using errcode = '42501';
  end if;
  return v_user;
end;
$$;

revoke all privileges on function private.clutch_exiger_admin_v1()
  from public, anon, authenticated, service_role;

create or replace function private.clutch_verrouiller_saison_resultat_v1(
  p_saison_id text
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch:resultat:saison:' || p_saison_id, 0)
  )
$$;

revoke all privileges on function private.clutch_verrouiller_saison_resultat_v1(text)
  from public, anon, authenticated, service_role;

-- Terminal rows remain immutable except for a revisioned correction performed
-- inside an owner-executed SECURITY DEFINER RPC. Direct service-role updates do
-- not satisfy this guard.
create or replace function private.clutch_guard_match_lifecycle_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_core_changed boolean :=
    new.statut is distinct from old.statut
    or new.debut is distinct from old.debut
    or new.score_a is distinct from old.score_a
    or new.score_b is distinct from old.score_b
    or new.elo_a_fige is distinct from old.elo_a_fige
    or new.elo_b_fige is distinct from old.elo_b_fige
    or new.motif_annulation is distinct from old.motif_annulation
    or new.resultat_source is distinct from old.resultat_source
    or new.resultat_source_label is distinct from old.resultat_source_label
    or new.resultat_identifiant_externe is distinct from old.resultat_identifiant_externe
    or new.resultat_recu_le is distinct from old.resultat_recu_le
    or new.resultat_regle_le is distinct from old.resultat_regle_le
    or new.resultat_maj_le is distinct from old.resultat_maj_le
    or new.resultat_revision is distinct from old.resultat_revision
    or new.resultat_motif_correction is distinct from old.resultat_motif_correction;
begin
  if old.statut = 'annule' and v_core_changed then
    raise exception 'Un match annule est verrouille.' using errcode = 'P0001';
  end if;

  if old.statut = 'termine' and v_core_changed then
    if not (
      new.statut = 'termine'
      and new.resultat_revision = old.resultat_revision + 1
      and new.resultat_motif_correction is not null
      and char_length(new.resultat_motif_correction) >= 10
      and current_user in ('postgres', 'supabase_admin')
    ) then
      raise exception 'Un resultat final se corrige uniquement via la RPC dediee.'
        using errcode = 'P0001';
    end if;
  end if;

  if old.statut = 'en_cours' and new.statut = 'a_venir' then
    raise exception 'Un match en cours ne peut pas revenir a venir.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_guard_match_lifecycle_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists clutch_guard_match_lifecycle_v1 on public.matchs;
create trigger clutch_guard_match_lifecycle_v1
before update of
  statut,
  debut,
  score_a,
  score_b,
  elo_a_fige,
  elo_b_fige,
  motif_annulation,
  resultat_source,
  resultat_source_label,
  resultat_identifiant_externe,
  resultat_recu_le,
  resultat_regle_le,
  resultat_maj_le,
  resultat_revision,
  resultat_motif_correction
on public.matchs
for each row execute function private.clutch_guard_match_lifecycle_v1();

-- ---------------------------------------------------------------------------
-- Deterministic Frags rebuild used after a corrected official result.
-- ---------------------------------------------------------------------------

create or replace function private.clutch_reconstruire_saison_frags_v1(
  p_saison_id text
)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private', 'pg_temp'
as $$
declare
  v_match record;
begin
  perform private.clutch_verrouiller_saison_resultat_v1(p_saison_id);

  drop table if exists pg_temp.clutch_rebuild_frags_state;
  create temporary table clutch_rebuild_frags_state (
    user_id uuid primary key,
    frags integer not null,
    pic_frags integer not null,
    pronostics_regles integer not null,
    pronostics_gagnes integer not null,
    meilleur_grade_ordre integer,
    meilleur_rang integer
  ) on commit drop;

  insert into pg_temp.clutch_rebuild_frags_state (
    user_id,
    frags,
    pic_frags,
    pronostics_regles,
    pronostics_gagnes
  )
  select distinct
    p.user_id,
    public.clutch_frags_initial(),
    public.clutch_frags_initial(),
    0,
    0
  from public.pronostics_classes p
  where p.saison_id = p_saison_id
    and p.statut in ('gagne', 'perdu');

  for v_match in
    select
      p.match_id,
      coalesce(m.resultat_regle_le, max(p.regle_le), m.debut) as ordre_le
    from public.pronostics_classes p
    join public.matchs m on m.id = p.match_id
    where p.saison_id = p_saison_id
      and p.statut in ('gagne', 'perdu')
    group by p.match_id, m.resultat_regle_le, m.debut
    order by ordre_le, p.match_id
  loop
    with rangs as (
      select
        s.user_id,
        row_number() over (
          order by s.frags desc, s.pronostics_gagnes desc, s.user_id asc
        )::integer as rang
      from pg_temp.clutch_rebuild_frags_state s
      where s.pronostics_regles >= public.clutch_frags_nb_placements()
    )
    update public.pronostics_classes p
    set frags_avant = s.frags,
        rang_avant = r.rang
    from pg_temp.clutch_rebuild_frags_state s
    left join rangs r on r.user_id = s.user_id
    where p.match_id = v_match.match_id
      and p.saison_id = p_saison_id
      and p.statut in ('gagne', 'perdu')
      and s.user_id = p.user_id;

    update pg_temp.clutch_rebuild_frags_state s
    set frags = s.frags + p.delta_frags,
        pic_frags = greatest(s.pic_frags, s.frags + p.delta_frags),
        pronostics_regles = s.pronostics_regles + 1,
        pronostics_gagnes = s.pronostics_gagnes
          + case when p.statut = 'gagne' then 1 else 0 end
    from public.pronostics_classes p
    where p.match_id = v_match.match_id
      and p.saison_id = p_saison_id
      and p.statut in ('gagne', 'perdu')
      and p.delta_frags is not null
      and s.user_id = p.user_id;

    with rangs as (
      select
        s.user_id,
        row_number() over (
          order by s.frags desc, s.pronostics_gagnes desc, s.user_id asc
        )::integer as rang
      from pg_temp.clutch_rebuild_frags_state s
      where s.pronostics_regles >= public.clutch_frags_nb_placements()
    )
    update public.pronostics_classes p
    set frags_apres = s.frags,
        rang_apres = r.rang
    from pg_temp.clutch_rebuild_frags_state s
    left join rangs r on r.user_id = s.user_id
    where p.match_id = v_match.match_id
      and p.saison_id = p_saison_id
      and p.statut in ('gagne', 'perdu')
      and s.user_id = p.user_id;

    with rangs as (
      select
        s.user_id,
        row_number() over (
          order by s.frags desc, s.pronostics_gagnes desc, s.user_id asc
        )::integer as rang
      from pg_temp.clutch_rebuild_frags_state s
      where s.pronostics_regles >= public.clutch_frags_nb_placements()
    )
    update pg_temp.clutch_rebuild_frags_state s
    set meilleur_grade_ordre = case
          when s.pronostics_regles >= public.clutch_frags_nb_placements()
            then greatest(
              coalesce(s.meilleur_grade_ordre, 0),
              private.clutch_grade_ordre_v1(s.frags)
            )
          else s.meilleur_grade_ordre
        end,
        meilleur_rang = case
          when r.rang is null then s.meilleur_rang
          when s.meilleur_rang is null then r.rang
          else least(s.meilleur_rang, r.rang)
        end
    from rangs r
    where r.user_id = s.user_id;
  end loop;

  update public.classements_frags c
  set frags = s.frags,
      pic_frags = s.pic_frags,
      pronostics_regles = s.pronostics_regles,
      pronostics_gagnes = s.pronostics_gagnes,
      meilleur_grade_ordre = s.meilleur_grade_ordre,
      meilleur_rang = s.meilleur_rang,
      maj_le = now()
  from pg_temp.clutch_rebuild_frags_state s
  where c.saison_id = p_saison_id
    and c.user_id = s.user_id;
end;
$$;

revoke all privileges on function private.clutch_reconstruire_saison_frags_v1(text)
  from public, anon, authenticated, service_role;

-- Initial settlement and later corrections share one trigger. The season-wide
-- transaction lock prevents lost updates and inconsistent rank snapshots when
-- two distinct matches finish at the same instant.
create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private', 'pg_temp'
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    perform private.clutch_verrouiller_saison_resultat_v1(new.saison_id);

    update public.pronostics_classes
    set statut = 'annule',
        delta_frags = 0,
        regle_le = now(),
        revele_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' then
    return new;
  end if;

  if new.score_a is null
     or new.score_b is null
     or new.score_a < 0
     or new.score_b < 0
     or new.score_a = new.score_b
  then
    raise exception 'Impossible de regler les Frags : score final invalide pour %', new.id
      using errcode = '22023';
  end if;

  if new.resultat_source is null
     or new.resultat_identifiant_externe is null
     or new.resultat_regle_le is null
  then
    raise exception 'Impossible de regler les Frags sans provenance complete pour %', new.id
      using errcode = '23514';
  end if;

  perform private.clutch_verrouiller_saison_resultat_v1(new.saison_id);

  -- A revisioned terminal-to-terminal update is an explicit correction.
  if old.statut = 'termine' then
    if new.resultat_revision <> old.resultat_revision + 1 then
      return new;
    end if;

    for r in
      select *
      from public.pronostics_classes
      where match_id = new.id
        and statut in ('gagne', 'perdu')
      order by user_id, id
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
        coalesce(r.conviction, 'normal')
      );

      update public.pronostics_classes
      set statut = case when v_gagnant then 'gagne' else 'perdu' end,
          delta_frags = v_delta,
          revele_le = null
      where id = r.id
        and (
          statut is distinct from case when v_gagnant then 'gagne' else 'perdu' end
          or delta_frags is distinct from v_delta
        );
    end loop;

    perform private.clutch_reconstruire_saison_frags_v1(new.saison_id);
    return new;
  end if;

  insert into public.classements_frags(saison_id, user_id, frags, pic_frags)
  select distinct
    p.saison_id,
    p.user_id,
    public.clutch_frags_initial(),
    public.clutch_frags_initial()
  from public.pronostics_classes p
  where p.match_id = new.id and p.statut = 'en_cours'
  on conflict (saison_id, user_id) do nothing;

  update public.pronostics_classes p
  set frags_avant = c.frags,
      rang_avant = private.clutch_rang_frags_v1(p.saison_id, p.user_id)
  from public.classements_frags c
  where p.match_id = new.id
    and p.statut = 'en_cours'
    and c.saison_id = p.saison_id
    and c.user_id = p.user_id;

  for r in
    select *
    from public.pronostics_classes
    where match_id = new.id and statut = 'en_cours'
    order by user_id, id
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
      coalesce(r.conviction, 'normal')
    );
    v_frags_apres := coalesce(r.frags_avant, public.clutch_frags_initial()) + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags, v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        meilleur_grade_ordre = case
          when pronostics_regles + 1 >= public.clutch_frags_nb_placements()
            then greatest(
              coalesce(meilleur_grade_ordre, 0),
              private.clutch_grade_ordre_v1(v_frags_apres)
            )
          else meilleur_grade_ordre
        end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        frags_apres = v_frags_apres,
        regle_le = new.resultat_regle_le,
        revele_le = null
    where id = r.id;
  end loop;

  update public.pronostics_classes p
  set rang_apres = private.clutch_rang_frags_v1(p.saison_id, p.user_id)
  where p.match_id = new.id
    and p.statut in ('gagne', 'perdu')
    and p.rang_apres is null;

  update public.classements_frags c
  set meilleur_rang = case
    when c.meilleur_rang is null then p.rang_apres
    else least(c.meilleur_rang, p.rang_apres)
  end
  from public.pronostics_classes p
  where p.match_id = new.id
    and p.saison_id = c.saison_id
    and p.user_id = c.user_id
    and p.rang_apres is not null;

  return new;
end;
$$;

revoke all privileges on function private.clutch_resoudre_pronostics_classes()
  from public, anon, authenticated, service_role;

drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of
  statut,
  score_a,
  score_b,
  resultat_revision,
  resultat_source,
  resultat_identifiant_externe
on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

-- ---------------------------------------------------------------------------
-- Admin operations: explicit, idempotent and audited.
-- ---------------------------------------------------------------------------

create or replace function public.clutch_admin_regler_match_v1(
  p_match_id text,
  p_score_a integer,
  p_score_b integer,
  p_source text,
  p_identifiant_externe text,
  p_source_label text default null,
  p_recu_le timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
  v_apres public.matchs%rowtype;
  v_saison_id text;
  v_attendu integer;
  v_source text := lower(trim(coalesce(p_source, '')));
  v_source_label text;
  v_identifiant text := trim(coalesce(p_identifiant_externe, ''));
  v_equipe record;
  v_equipe_a public.equipes%rowtype;
  v_equipe_b public.equipes%rowtype;
  v_pa numeric;
  v_reel_a numeric;
  v_delta numeric;
  v_regles integer := 0;
  v_audit_id bigint;
begin
  perform private.clutch_exiger_admin_v1();

  if v_source !~ '^[a-z0-9][a-z0-9_-]{1,63}$' then
    raise exception 'Source de resultat invalide.' using errcode = '22023';
  end if;
  if char_length(v_identifiant) not between 1 and 180 then
    raise exception 'Identifiant externe de resultat requis (180 caracteres max).'
      using errcode = '22023';
  end if;
  if p_recu_le is null or p_recu_le > now() + interval '5 minutes' then
    raise exception 'Date de reception du resultat invalide.' using errcode = '22023';
  end if;
  v_source_label := coalesce(
    nullif(left(trim(coalesce(p_source_label, '')), 80), ''),
    initcap(replace(v_source, '_', ' '))
  );

  select m.saison_id into v_saison_id
  from public.matchs m
  where m.id = p_match_id;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  perform private.clutch_verrouiller_saison_resultat_v1(v_saison_id);

  select * into v_match
  from public.matchs m
  where m.id = p_match_id
  for update;

  if v_match.statut = 'termine' then
    if v_match.score_a = p_score_a
       and v_match.score_b = p_score_b
       and v_match.resultat_source = v_source
       and v_match.resultat_identifiant_externe = v_identifiant
    then
      return jsonb_build_object(
        'match_id', v_match.id,
        'statut', v_match.statut,
        'revision', v_match.resultat_revision,
        'rejoue', true,
        'regles', 0
      );
    end if;
    raise exception 'Resultat deja final : utilise la correction administrative.'
      using errcode = 'P0001';
  end if;

  if v_match.statut <> 'en_cours' then
    raise exception 'Seul un match en cours peut etre regle.' using errcode = 'P0001';
  end if;

  v_attendu := ceil(v_match.format / 2.0);
  if p_score_a is null
     or p_score_b is null
     or p_score_a < 0
     or p_score_b < 0
     or p_score_a = p_score_b
     or greatest(p_score_a, p_score_b) <> v_attendu
  then
    raise exception 'Score BO% invalide : le vainqueur doit atteindre % sans egalite.',
      v_match.format, v_attendu using errcode = '22023';
  end if;

  select count(*)::integer into v_regles
  from public.pronostics_classes p
  where p.match_id = p_match_id and p.statut = 'en_cours';

  -- Lock both teams in canonical ID order to prevent cross-match deadlocks.
  for v_equipe in
    select e.id
    from public.equipes e
    where e.id in (v_match.equipe_a_id, v_match.equipe_b_id)
    order by e.id
    for update
  loop
    null;
  end loop;

  select * into v_equipe_a from public.equipes where id = v_match.equipe_a_id;
  select * into v_equipe_b from public.equipes where id = v_match.equipe_b_id;

  update public.matchs
  set score_a = p_score_a,
      score_b = p_score_b,
      statut = 'termine',
      elo_a_fige = v_equipe_a.elo,
      elo_b_fige = v_equipe_b.elo,
      resultat_source = v_source,
      resultat_source_label = v_source_label,
      resultat_identifiant_externe = v_identifiant,
      resultat_recu_le = p_recu_le,
      resultat_regle_le = clock_timestamp(),
      resultat_maj_le = clock_timestamp(),
      resultat_revision = 1,
      resultat_motif_correction = null
  where id = p_match_id;

  v_pa := public.clutch_proba_map(v_equipe_a.elo, v_equipe_b.elo);
  v_reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  v_delta := public.clutch_elo_k() * (v_reel_a - v_pa);

  update public.equipes set elo = round(v_equipe_a.elo + v_delta)
  where id = v_equipe_a.id;
  update public.equipes set elo = round(v_equipe_b.elo - v_delta)
  where id = v_equipe_b.id;

  select * into v_apres from public.matchs where id = p_match_id;
  v_audit_id := private.clutch_auditer_match_v1(
    p_match_id,
    'resultat_initial',
    to_jsonb(v_match),
    to_jsonb(v_apres),
    v_source,
    v_identifiant,
    null,
    v_apres.resultat_revision
  );

  return jsonb_build_object(
    'match_id', p_match_id,
    'statut', 'termine',
    'revision', v_apres.resultat_revision,
    'source_resultat', v_source,
    'identifiant_externe', v_identifiant,
    'rejoue', false,
    'regles', v_regles,
    'audit_id', v_audit_id,
    'elo_a', (select e.elo from public.equipes e where e.id = v_equipe_a.id),
    'elo_b', (select e.elo from public.equipes e where e.id = v_equipe_b.id)
  );
end;
$$;

create or replace function public.clutch_admin_corriger_resultat_v1(
  p_match_id text,
  p_score_a integer,
  p_score_b integer,
  p_source text,
  p_identifiant_externe text,
  p_motif text,
  p_source_label text default null,
  p_recu_le timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
  v_apres public.matchs%rowtype;
  v_saison_id text;
  v_attendu integer;
  v_source text := lower(trim(coalesce(p_source, '')));
  v_source_label text;
  v_identifiant text := trim(coalesce(p_identifiant_externe, ''));
  v_motif text := left(trim(coalesce(p_motif, '')), 240);
  v_equipe record;
  v_equipe_a public.equipes%rowtype;
  v_equipe_b public.equipes%rowtype;
  v_pa numeric;
  v_old_reel_a numeric;
  v_new_reel_a numeric;
  v_old_delta numeric;
  v_new_delta numeric;
  v_old_applique_a integer;
  v_new_applique_a integer;
  v_old_applique_b integer;
  v_new_applique_b integer;
  v_audit_id bigint;
begin
  perform private.clutch_exiger_admin_v1();

  if char_length(v_motif) < 10 then
    raise exception 'Le motif de correction doit contenir au moins 10 caracteres.'
      using errcode = '22023';
  end if;
  if v_source !~ '^[a-z0-9][a-z0-9_-]{1,63}$' then
    raise exception 'Source de resultat invalide.' using errcode = '22023';
  end if;
  if char_length(v_identifiant) not between 1 and 180 then
    raise exception 'Identifiant externe de resultat requis (180 caracteres max).'
      using errcode = '22023';
  end if;
  if p_recu_le is null or p_recu_le > now() + interval '5 minutes' then
    raise exception 'Date de reception du resultat invalide.' using errcode = '22023';
  end if;
  v_source_label := coalesce(
    nullif(left(trim(coalesce(p_source_label, '')), 80), ''),
    initcap(replace(v_source, '_', ' '))
  );

  select m.saison_id into v_saison_id
  from public.matchs m
  where m.id = p_match_id;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  perform private.clutch_verrouiller_saison_resultat_v1(v_saison_id);

  select * into v_match
  from public.matchs m
  where m.id = p_match_id
  for update;

  if v_match.statut <> 'termine' then
    raise exception 'Seul un resultat final peut etre corrige.' using errcode = 'P0001';
  end if;

  if v_match.score_a = p_score_a
     and v_match.score_b = p_score_b
     and v_match.resultat_source = v_source
     and v_match.resultat_identifiant_externe = v_identifiant
  then
    return jsonb_build_object(
      'match_id', v_match.id,
      'statut', v_match.statut,
      'revision', v_match.resultat_revision,
      'rejoue', true
    );
  end if;

  v_attendu := ceil(v_match.format / 2.0);
  if p_score_a is null
     or p_score_b is null
     or p_score_a < 0
     or p_score_b < 0
     or p_score_a = p_score_b
     or greatest(p_score_a, p_score_b) <> v_attendu
  then
    raise exception 'Score BO% invalide : le vainqueur doit atteindre % sans egalite.',
      v_match.format, v_attendu using errcode = '22023';
  end if;

  for v_equipe in
    select e.id
    from public.equipes e
    where e.id in (v_match.equipe_a_id, v_match.equipe_b_id)
    order by e.id
    for update
  loop
    null;
  end loop;

  select * into v_equipe_a from public.equipes where id = v_match.equipe_a_id;
  select * into v_equipe_b from public.equipes where id = v_match.equipe_b_id;

  v_pa := public.clutch_proba_map(
    coalesce(v_match.elo_a_fige, v_equipe_a.elo),
    coalesce(v_match.elo_b_fige, v_equipe_b.elo)
  );
  v_old_reel_a := v_match.score_a::numeric / (v_match.score_a + v_match.score_b);
  v_new_reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  v_old_delta := public.clutch_elo_k() * (v_old_reel_a - v_pa);
  v_new_delta := public.clutch_elo_k() * (v_new_reel_a - v_pa);
  v_old_applique_a := round(coalesce(v_match.elo_a_fige, v_equipe_a.elo) + v_old_delta)
    - coalesce(v_match.elo_a_fige, v_equipe_a.elo);
  v_new_applique_a := round(coalesce(v_match.elo_a_fige, v_equipe_a.elo) + v_new_delta)
    - coalesce(v_match.elo_a_fige, v_equipe_a.elo);
  v_old_applique_b := round(coalesce(v_match.elo_b_fige, v_equipe_b.elo) - v_old_delta)
    - coalesce(v_match.elo_b_fige, v_equipe_b.elo);
  v_new_applique_b := round(coalesce(v_match.elo_b_fige, v_equipe_b.elo) - v_new_delta)
    - coalesce(v_match.elo_b_fige, v_equipe_b.elo);

  update public.matchs
  set score_a = p_score_a,
      score_b = p_score_b,
      resultat_source = v_source,
      resultat_source_label = v_source_label,
      resultat_identifiant_externe = v_identifiant,
      resultat_recu_le = p_recu_le,
      resultat_maj_le = clock_timestamp(),
      resultat_revision = v_match.resultat_revision + 1,
      resultat_motif_correction = v_motif
  where id = p_match_id;

  -- Re-announce every affected verdict, even when the corrected score keeps
  -- the same winner but changes the official series score or provenance.
  update public.pronostics_classes
  set revele_le = null
  where match_id = p_match_id
    and statut in ('gagne', 'perdu');

  update public.equipes
  set elo = elo + (v_new_applique_a - v_old_applique_a)
  where id = v_match.equipe_a_id;
  update public.equipes
  set elo = elo + (v_new_applique_b - v_old_applique_b)
  where id = v_match.equipe_b_id;

  select * into v_apres from public.matchs where id = p_match_id;
  v_audit_id := private.clutch_auditer_match_v1(
    p_match_id,
    'correction_resultat',
    to_jsonb(v_match),
    to_jsonb(v_apres),
    v_source,
    v_identifiant,
    v_motif,
    v_apres.resultat_revision
  );

  return jsonb_build_object(
    'match_id', p_match_id,
    'statut', 'termine',
    'revision', v_apres.resultat_revision,
    'source_resultat', v_source,
    'identifiant_externe', v_identifiant,
    'rejoue', false,
    'audit_id', v_audit_id
  );
end;
$$;

-- Backward-compatible wrapper. New admin clients must call the provenance-aware
-- RPC above, but older clients still receive idempotent settlement semantics.
create or replace function public.regler_match(
  p_match_id text,
  p_score_a integer,
  p_score_b integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.clutch_admin_regler_match_v1(
    p_match_id,
    p_score_a,
    p_score_b,
    'validation_clutch',
    'validation_clutch:' || p_match_id || ':' || p_score_a || '-' || p_score_b,
    'Validation Clutch',
    now()
  );
end;
$$;

create or replace function public.clutch_admin_demarrer_match_v1(p_match_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
  v_apres public.matchs%rowtype;
  v_audit_id bigint;
begin
  perform private.clutch_exiger_admin_v1();

  select * into v_match
  from public.matchs m
  where m.id = p_match_id
  for update;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  if v_match.statut = 'en_cours' then
    return jsonb_build_object('match', (
      select to_jsonb(m) from public.v_matchs m where m.id = p_match_id
    ), 'rejoue', true);
  end if;
  if v_match.statut <> 'a_venir' then
    raise exception 'Seul un match a venir peut demarrer.' using errcode = 'P0001';
  end if;

  update public.matchs set statut = 'en_cours' where id = p_match_id;
  select * into v_apres from public.matchs where id = p_match_id;
  v_audit_id := private.clutch_auditer_match_v1(
    p_match_id, 'demarrage', to_jsonb(v_match), to_jsonb(v_apres)
  );

  return jsonb_build_object(
    'match', (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id),
    'rejoue', false,
    'audit_id', v_audit_id
  );
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
  v_apres public.matchs%rowtype;
  v_audit_id bigint;
begin
  perform private.clutch_exiger_admin_v1();
  if p_nouveau_debut is null or p_nouveau_debut <= now() then
    raise exception 'La nouvelle date doit etre dans le futur.' using errcode = '22023';
  end if;

  select * into v_match
  from public.matchs m
  where m.id = p_match_id
  for update;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;
  if v_match.statut <> 'a_venir' then
    raise exception 'Seul un match a venir peut etre reporte.' using errcode = 'P0001';
  end if;
  if v_match.debut = p_nouveau_debut then
    return jsonb_build_object(
      'match', (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id),
      'rejoue', true
    );
  end if;

  update public.matchs set debut = p_nouveau_debut where id = p_match_id;
  select * into v_apres from public.matchs where id = p_match_id;
  v_audit_id := private.clutch_auditer_match_v1(
    p_match_id,
    'report',
    to_jsonb(v_match),
    to_jsonb(v_apres),
    null,
    null,
    'Report du match vers ' || p_nouveau_debut::text,
    v_match.resultat_revision
  );

  return jsonb_build_object(
    'match', (select to_jsonb(m) from public.v_matchs m where m.id = p_match_id),
    'rejoue', false,
    'audit_id', v_audit_id
  );
end;
$$;

create or replace function public.annuler_match(
  p_match_id text,
  p_motif text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matchs%rowtype;
  v_apres public.matchs%rowtype;
  v_saison_id text;
  v_motif text := left(trim(coalesce(p_motif, '')), 120);
  v_nb integer := 0;
  v_total bigint := 0;
  v_pari record;
  v_audit_id bigint;
begin
  perform private.clutch_exiger_admin_v1();
  if char_length(v_motif) < 5 then
    raise exception 'Le motif d annulation doit contenir au moins 5 caracteres.'
      using errcode = '22023';
  end if;

  select m.saison_id into v_saison_id
  from public.matchs m
  where m.id = p_match_id;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  perform private.clutch_verrouiller_saison_resultat_v1(v_saison_id);

  select * into v_match
  from public.matchs m
  where m.id = p_match_id
  for update;

  if v_match.statut = 'annule' then
    return jsonb_build_object(
      'match_id', p_match_id,
      'statut', 'annule',
      'rejoue', true,
      'rembourses', 0,
      'total', 0
    );
  end if;
  if v_match.statut = 'termine' then
    raise exception 'Un resultat final ne peut pas etre annule : utilise la correction.'
      using errcode = 'P0001';
  end if;

  for v_pari in
    select *
    from public.paris p
    where p.match_id = p_match_id and p.statut = 'en_cours'
    order by p.id
    for update
  loop
    update public.paris
    set statut = 'rembourse', gain = v_pari.mise
    where id = v_pari.id;
    update public.participations
    set solde = solde + v_pari.mise
    where user_id = v_pari.user_id and saison_id = v_pari.saison_id;
    v_nb := v_nb + 1;
    v_total := v_total + v_pari.mise;
  end loop;

  update public.matchs
  set statut = 'annule', motif_annulation = v_motif
  where id = p_match_id;

  select * into v_apres from public.matchs where id = p_match_id;
  v_audit_id := private.clutch_auditer_match_v1(
    p_match_id,
    'annulation',
    to_jsonb(v_match),
    to_jsonb(v_apres),
    null,
    null,
    v_motif,
    v_match.resultat_revision
  );

  return jsonb_build_object(
    'match_id', p_match_id,
    'statut', 'annule',
    'rejoue', false,
    'rembourses', v_nb,
    'total', v_total,
    'audit_id', v_audit_id
  );
end;
$$;

create or replace function public.clutch_admin_historique_match_v1(
  p_match_id text,
  p_limite integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  perform private.clutch_exiger_admin_v1();
  if not exists (select 1 from public.matchs m where m.id = p_match_id) then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'match_id', p_match_id,
    'operations', coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc, x.id desc), '[]'::jsonb)
  ) into v_payload
  from (
    select
      a.id,
      a.action,
      a.acteur_id,
      a.acteur_pseudo,
      a.source_resultat,
      a.identifiant_externe,
      a.motif,
      a.revision,
      a.avant,
      a.apres,
      a.cree_le
    from private.clutch_match_operations_audit a
    where a.match_id = p_match_id
    order by a.cree_le desc, a.id desc
    limit greatest(1, least(coalesce(p_limite, 20), 100))
  ) x;

  return v_payload;
end;
$$;

revoke all privileges on function public.clutch_admin_regler_match_v1(
  text, integer, integer, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_admin_corriger_resultat_v1(
  text, integer, integer, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all privileges on function public.regler_match(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_admin_demarrer_match_v1(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_admin_reporter_match_v1(text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.annuler_match(text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_admin_historique_match_v1(text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_admin_regler_match_v1(
  text, integer, integer, text, text, text, timestamptz
) to authenticated, service_role;
grant execute on function public.clutch_admin_corriger_resultat_v1(
  text, integer, integer, text, text, text, text, timestamptz
) to authenticated, service_role;
grant execute on function public.regler_match(text, integer, integer)
  to authenticated, service_role;
grant execute on function public.clutch_admin_demarrer_match_v1(text)
  to authenticated, service_role;
grant execute on function public.clutch_admin_reporter_match_v1(text, timestamptz)
  to authenticated, service_role;
grant execute on function public.annuler_match(text, text)
  to authenticated, service_role;
grant execute on function public.clutch_admin_historique_match_v1(text, integer)
  to authenticated, service_role;

comment on function public.clutch_admin_regler_match_v1(
  text, integer, integer, text, text, text, timestamptz
) is 'Regle un match avec provenance obligatoire, serialisation saisonniere et rejeu idempotent.';
comment on function public.clutch_admin_corriger_resultat_v1(
  text, integer, integer, text, text, text, text, timestamptz
) is 'Corrige un resultat final, reconstruit les Frags et ajoute une revision au journal immuable.';
comment on function public.clutch_admin_historique_match_v1(text, integer) is
  'Retourne aux administrateurs le journal immuable des operations d un match.';

-- ---------------------------------------------------------------------------
-- Player-facing transparency now consumes the stored canonical provenance.
-- ---------------------------------------------------------------------------

create or replace function public.clutch_mes_calls_v1(p_saison_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_saison record;
  v_payload jsonb;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  if p_saison_id is null then
    select s.id, s.nom into v_saison
    from public.saisons s
    order by (s.debut <= now() and s.fin > now()) desc, s.debut desc
    limit 1;
  else
    select s.id, s.nom into v_saison
    from public.saisons s
    where s.id = p_saison_id;
  end if;

  if v_saison.id is null then
    return jsonb_build_object(
      'saison_id', null,
      'saison_nom', null,
      'compteurs', jsonb_build_object('ouverts', 0, 'verrouilles', 0, 'reussis', 0, 'manques', 0),
      'ouverts', '[]'::jsonb,
      'verrouilles', '[]'::jsonb,
      'reussis', '[]'::jsonb,
      'manques', '[]'::jsonb
    );
  end if;

  with mes_pronostics as (
    select p.*
    from public.pronostics_classes p
    where p.user_id = v_user
      and p.saison_id = v_saison.id
      and p.statut <> 'annule'
  ), distributions as (
    select
      p.match_id,
      count(*)::integer as total,
      count(*) filter (where p.choix = 'a')::integer as total_a,
      count(*) filter (where p.choix = 'b')::integer as total_b
    from public.pronostics_classes p
    where p.saison_id = v_saison.id
      and p.statut <> 'annule'
    group by p.match_id
  ), items as (
    select
      m.debut,
      case
        when p.id is null then 'ouvert'
        when p.statut = 'en_cours' then 'verrouille'
        when p.statut = 'gagne' then 'reussi'
        when p.statut = 'perdu' then 'manque'
      end as etat,
      jsonb_build_object(
        'id', coalesce(p.id::text, m.id),
        'pronostic_id', p.id,
        'match_id', m.id,
        'saison_id', m.saison_id,
        'etat', case
          when p.id is null then 'ouvert'
          when p.statut = 'en_cours' then 'verrouille'
          when p.statut = 'gagne' then 'reussi'
          when p.statut = 'perdu' then 'manque'
        end,
        'jeu', m.jeu,
        'evenement', m.evenement,
        'format', m.format,
        'debut', m.debut,
        'statut_match', m.statut,
        'equipe_a', m.equipe_a,
        'tag_a', m.tag_a,
        'equipe_b', m.equipe_b,
        'tag_b', m.tag_b,
        'score_a', m.score_a,
        'score_b', m.score_b,
        'choix', p.choix,
        'statut', p.statut,
        'delta_frags', p.delta_frags,
        'verrouille_le', p.cree_le,
        'ferme_le', m.debut,
        'regle_le', p.regle_le,
        'participants', coalesce(d.total, 0),
        'distribution', case when p.id is null then null else jsonb_build_object(
          'total', coalesce(d.total, 0),
          'a', coalesce(d.total_a, 0),
          'b', coalesce(d.total_b, 0),
          'a_pct', case when coalesce(d.total, 0) = 0 then 0 else round(d.total_a::numeric / d.total * 100, 1) end,
          'b_pct', case when coalesce(d.total, 0) = 0 then 0 else round(d.total_b::numeric / d.total * 100, 1) end
        ) end,
        'regle_resolution', jsonb_build_object(
          'cle', 'vainqueur_match',
          'libelle', 'Vainqueur de la série',
          'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
        ),
        'source_resultat', case when p.statut in ('gagne', 'perdu') then m.resultat_source end,
        'source_resultat_label', case when p.statut in ('gagne', 'perdu') then m.resultat_source_label end,
        'identifiant_resultat_externe', case when p.statut in ('gagne', 'perdu') then m.resultat_identifiant_externe end,
        'revision_resultat', case when p.statut in ('gagne', 'perdu') then m.resultat_revision end,
        'resultat_corrige', case when p.statut in ('gagne', 'perdu') then m.resultat_revision > 1 else false end
      ) as item
    from public.v_matchs m
    left join mes_pronostics p on p.match_id = m.id
    left join distributions d on d.match_id = m.id
    where m.saison_id = v_saison.id
      and (
        p.id is not null
        or (m.statut = 'a_venir' and m.debut > now())
      )
  )
  select jsonb_build_object(
    'saison_id', v_saison.id,
    'saison_nom', v_saison.nom,
    'compteurs', jsonb_build_object(
      'ouverts', count(*) filter (where etat = 'ouvert'),
      'verrouilles', count(*) filter (where etat = 'verrouille'),
      'reussis', count(*) filter (where etat = 'reussi'),
      'manques', count(*) filter (where etat = 'manque')
    ),
    'ouverts', coalesce(jsonb_agg(item order by debut asc) filter (where etat = 'ouvert'), '[]'::jsonb),
    'verrouilles', coalesce(jsonb_agg(item order by debut asc) filter (where etat = 'verrouille'), '[]'::jsonb),
    'reussis', coalesce(jsonb_agg(item order by debut desc) filter (where etat = 'reussi'), '[]'::jsonb),
    'manques', coalesce(jsonb_agg(item order by debut desc) filter (where etat = 'manque'), '[]'::jsonb)
  ) into v_payload
  from items;

  return v_payload;
end;
$$;

create or replace function public.clutch_call_context_v1(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_match record;
  v_prediction public.pronostics_classes%rowtype;
  v_total integer := 0;
  v_total_a integer := 0;
  v_total_b integer := 0;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select m.* into v_match
  from public.v_matchs m
  where m.id = p_match_id;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  select p.* into v_prediction
  from public.pronostics_classes p
  where p.user_id = v_user and p.match_id = p_match_id
  limit 1;

  select
    count(*)::integer,
    count(*) filter (where p.choix = 'a')::integer,
    count(*) filter (where p.choix = 'b')::integer
  into v_total, v_total_a, v_total_b
  from public.pronostics_classes p
  where p.match_id = p_match_id and p.statut <> 'annule';

  return jsonb_build_object(
    'match_id', p_match_id,
    'participants', v_total,
    'ferme_le', v_match.debut,
    'verrouille_le', v_prediction.cree_le,
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'distribution', case when v_prediction.id is null then null else jsonb_build_object(
      'total', v_total,
      'a', v_total_a,
      'b', v_total_b,
      'a_pct', case when v_total = 0 then 0 else round(v_total_a::numeric / v_total * 100, 1) end,
      'b_pct', case when v_total = 0 then 0 else round(v_total_b::numeric / v_total * 100, 1) end
    ) end,
    'prediction', case when v_prediction.id is null then null else jsonb_build_object(
      'id', v_prediction.id,
      'match_id', v_prediction.match_id,
      'choix', v_prediction.choix,
      'statut', v_prediction.statut,
      'proba_figee', v_prediction.proba_figee,
      'proba_scoring', v_prediction.proba_scoring,
      'k_frags', v_prediction.k_frags,
      'delta_frags', v_prediction.delta_frags,
      'conviction', v_prediction.conviction,
      'multiplicateur_conviction', v_prediction.multiplicateur_conviction,
      'cree_le', v_prediction.cree_le,
      'regle_le', v_prediction.regle_le
    ) end,
    'source_resultat', case when v_prediction.statut in ('gagne', 'perdu') then v_match.resultat_source end,
    'source_resultat_label', case when v_prediction.statut in ('gagne', 'perdu') then v_match.resultat_source_label end,
    'identifiant_resultat_externe', case when v_prediction.statut in ('gagne', 'perdu') then v_match.resultat_identifiant_externe end,
    'revision_resultat', case when v_prediction.statut in ('gagne', 'perdu') then v_match.resultat_revision end,
    'resultat_corrige', case when v_prediction.statut in ('gagne', 'perdu') then v_match.resultat_revision > 1 else false end
  );
end;
$$;

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
      m.debut,
      m.resultat_source,
      m.resultat_source_label,
      m.resultat_identifiant_externe,
      m.resultat_revision
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
      and p.revele_le is null
    order by p.regle_le asc nulls last, p.cree_le asc, p.id asc
    limit 1
  ), contexte as (
    select
      c.*,
      (
        select count(*)::integer
        from public.pronostics_classes h
        where h.user_id = c.user_id
          and h.saison_id = c.saison_id
          and h.statut in ('gagne', 'perdu')
          and (h.regle_le, h.cree_le, h.id) < (c.regle_le, c.cree_le, c.id)
      ) as verdicts_avant
    from cible c
  ), compteur as (
    select count(*)::integer as total
    from public.pronostics_classes p
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
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
    'rang_avant', case when c.verdicts_avant >= public.clutch_frags_nb_placements() then c.rang_avant end,
    'rang_apres', case when c.verdicts_avant + 1 >= public.clutch_frags_nb_placements() then c.rang_apres end,
    'verdicts_avant', c.verdicts_avant,
    'verdicts_apres', c.verdicts_avant + 1,
    'grade_avant', public.clutch_grade_frags_v1(coalesce(c.frags_avant, public.clutch_frags_initial()), c.verdicts_avant),
    'grade_apres', public.clutch_grade_frags_v1(coalesce(c.frags_apres, public.clutch_frags_initial()), c.verdicts_avant + 1),
    'objectif_placements', public.clutch_frags_nb_placements(),
    'regle_le', c.regle_le,
    'revele_le', c.revele_le,
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
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'source_resultat', c.resultat_source,
    'source_resultat_label', c.resultat_source_label,
    'identifiant_resultat_externe', c.resultat_identifiant_externe,
    'revision_resultat', c.resultat_revision,
    'resultat_corrige', c.resultat_revision > 1,
    'restants', compteur.total
  ) end
  from compteur
  left join contexte c on true
$$;

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
    'rang_avant', case when historique.verdicts_avant >= public.clutch_frags_nb_placements() then p.rang_avant end,
    'rang_apres', case when historique.verdicts_avant + 1 >= public.clutch_frags_nb_placements() then p.rang_apres end,
    'verdicts_avant', historique.verdicts_avant,
    'verdicts_apres', historique.verdicts_avant + 1,
    'grade_avant', public.clutch_grade_frags_v1(coalesce(p.frags_avant, public.clutch_frags_initial()), historique.verdicts_avant),
    'grade_apres', public.clutch_grade_frags_v1(coalesce(p.frags_apres, public.clutch_frags_initial()), historique.verdicts_avant + 1),
    'objectif_placements', public.clutch_frags_nb_placements(),
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
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'source_resultat', m.resultat_source,
    'source_resultat_label', m.resultat_source_label,
    'identifiant_resultat_externe', m.resultat_identifiant_externe,
    'revision_resultat', m.resultat_revision,
    'resultat_corrige', m.resultat_revision > 1,
    'restants', 1
  )
  from public.pronostics_classes p
  join public.v_matchs m on m.id = p.match_id
  cross join lateral (
    select count(*)::integer as verdicts_avant
    from public.pronostics_classes h
    where h.user_id = p.user_id
      and h.saison_id = p.saison_id
      and h.statut in ('gagne', 'perdu')
      and (h.regle_le, h.cree_le, h.id) < (p.regle_le, p.cree_le, p.id)
  ) historique
  where p.user_id = (select auth.uid())
    and p.match_id = p_match_id
    and p.statut in ('gagne', 'perdu')
  limit 1
$$;

revoke all privileges on function public.clutch_mes_calls_v1(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_call_context_v1(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_prochain_resultat_a_reveler()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_resultat_match_v1(text)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_mes_calls_v1(text)
  to authenticated, service_role;
grant execute on function public.clutch_call_context_v1(text)
  to authenticated, service_role;
grant execute on function public.clutch_prochain_resultat_a_reveler()
  to authenticated, service_role;
grant execute on function public.clutch_resultat_match_v1(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Migration assertions.
-- ---------------------------------------------------------------------------

do $$
declare
  v_function text;
begin
  if exists (
    select 1
    from public.matchs m
    where m.statut = 'termine'
      and (
        m.resultat_source is null
        or m.resultat_identifiant_externe is null
        or m.resultat_revision < 1
      )
  ) then
    raise exception 'Lot 1.4 failed: a final result has no provenance.';
  end if;

  if has_table_privilege('anon', 'private.clutch_match_operations_audit', 'SELECT')
     or has_table_privilege('authenticated', 'private.clutch_match_operations_audit', 'SELECT')
     or has_table_privilege('service_role', 'private.clutch_match_operations_audit', 'SELECT')
  then
    raise exception 'Lot 1.4 failed: the private audit is directly readable.';
  end if;

  foreach v_function in array array[
    'public.clutch_admin_regler_match_v1(text,integer,integer,text,text,text,timestamp with time zone)',
    'public.clutch_admin_corriger_resultat_v1(text,integer,integer,text,text,text,text,timestamp with time zone)',
    'public.clutch_admin_historique_match_v1(text,integer)'
  ] loop
    if to_regprocedure(v_function) is null
       or not has_function_privilege('authenticated', to_regprocedure(v_function), 'EXECUTE')
       or has_function_privilege('anon', to_regprocedure(v_function), 'EXECUTE')
    then
      raise exception 'Lot 1.4 failed: invalid RPC privilege for %', v_function;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'private.clutch_match_operations_audit'::regclass
      and t.tgname = 'clutch_match_audit_immutable_v1'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then
    raise exception 'Lot 1.4 failed: immutable audit trigger missing.';
  end if;
end;
$$;
