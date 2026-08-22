-- Monetization phase 4.2 -- fictitious partner activation "Nova Week".
--
-- Nova is an invented brand used only for the prototype. Rewards depend on
-- participation: following matches, making Calls (regardless of correctness)
-- and contributing once to a faction mission. The future sales report exposes
-- aggregates only and includes a clearly-labelled synthetic demo snapshot.

create table if not exists public.campagnes_partenaire (
  key text primary key,
  nom text not null,
  partenaire_nom text not null,
  partenaire_fictif boolean not null default true,
  description text not null,
  debut timestamptz not null,
  fin timestamptz not null,
  statut text not null default 'brouillon',
  accent text not null default '#8B6CFF',
  collection_key text not null,
  licence jsonb not null,
  rapport_demo jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default pg_catalog.now(),
  constraint campagnes_partenaire_key_check check (
    key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
  ),
  constraint campagnes_partenaire_dates_check check (fin > debut),
  constraint campagnes_partenaire_statut_check check (
    statut in ('brouillon', 'publie', 'termine', 'archive')
  ),
  constraint campagnes_partenaire_accent_check check (
    accent ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint campagnes_partenaire_collection_check check (
    collection_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
  ),
  constraint campagnes_partenaire_licence_check check (
    jsonb_typeof(licence) = 'object'
    and coalesce(nullif(btrim(licence ->> 'type'), ''), '') <> ''
    and coalesce(nullif(btrim(licence ->> 'titulaire'), ''), '') <> ''
  ),
  constraint campagnes_partenaire_demo_check check (
    jsonb_typeof(rapport_demo) = 'object'
  )
);

create table if not exists public.campagne_taches_partenaire (
  campagne_key text not null references public.campagnes_partenaire(key)
    on update cascade on delete cascade,
  key text not null,
  type_tache text not null,
  titre text not null,
  description text not null,
  objectif integer not null,
  ordre integer not null,
  primary key (campagne_key, key),
  constraint campagne_taches_key_check check (
    key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
  ),
  constraint campagne_taches_type_check check (
    type_tache in ('match_follow', 'calls', 'faction_mission')
  ),
  constraint campagne_taches_objectif_check check (objectif between 1 and 100),
  constraint campagne_taches_ordre_check check (ordre between 1 and 100),
  unique (campagne_key, ordre)
);

create table if not exists private.campagne_participations (
  campagne_key text not null references public.campagnes_partenaire(key)
    on update cascade on delete cascade,
  user_id uuid not null references public.profils(id) on delete cascade,
  rejoint_le timestamptz not null default pg_catalog.now(),
  terminee_le timestamptz,
  recompense_reclamee_le timestamptz,
  primary key (campagne_key, user_id),
  constraint campagne_participations_dates_check check (
    (terminee_le is null or terminee_le >= rejoint_le)
    and (
      recompense_reclamee_le is null
      or (terminee_le is not null and recompense_reclamee_le >= terminee_le)
    )
  )
);

create table if not exists private.campagne_matchs_suivis (
  campagne_key text not null,
  user_id uuid not null,
  match_id text not null references public.matchs(id) on update cascade on delete cascade,
  suivi_le timestamptz not null default pg_catalog.now(),
  primary key (campagne_key, user_id, match_id),
  foreign key (campagne_key, user_id)
    references private.campagne_participations(campagne_key, user_id)
    on update cascade on delete cascade
);

create table if not exists private.campagne_actions (
  campagne_key text not null,
  user_id uuid not null,
  tache_key text not null,
  action_le timestamptz not null default pg_catalog.now(),
  primary key (campagne_key, user_id, tache_key),
  foreign key (campagne_key, user_id)
    references private.campagne_participations(campagne_key, user_id)
    on update cascade on delete cascade,
  foreign key (campagne_key, tache_key)
    references public.campagne_taches_partenaire(campagne_key, key)
    on update cascade on delete cascade
);

create index if not exists campagne_participations_rejoint_idx
  on private.campagne_participations (campagne_key, rejoint_le);
create index if not exists campagne_participations_complete_idx
  on private.campagne_participations (campagne_key, terminee_le)
  where terminee_le is not null;
create index if not exists campagne_matchs_suivis_user_idx
  on private.campagne_matchs_suivis (user_id, campagne_key, suivi_le);

alter table public.campagnes_partenaire enable row level security;
alter table public.campagne_taches_partenaire enable row level security;
alter table private.campagne_participations enable row level security;
alter table private.campagne_matchs_suivis enable row level security;
alter table private.campagne_actions enable row level security;

revoke all privileges on table public.campagnes_partenaire
from public, anon, authenticated, service_role;
revoke all privileges on table public.campagne_taches_partenaire
from public, anon, authenticated, service_role;
revoke all privileges on table private.campagne_participations
from public, anon, authenticated, service_role;
revoke all privileges on table private.campagne_matchs_suivis
from public, anon, authenticated, service_role;
revoke all privileges on table private.campagne_actions
from public, anon, authenticated, service_role;

comment on table public.campagnes_partenaire is
  'Editorial partner campaign metadata. Mobile reads go through scoped RPCs; raw participation is stored in private tables.';
comment on table private.campagne_participations is
  'Private campaign state. Partner-facing reports may only expose aggregates and never this table.';

insert into public.campagnes_partenaire (
  key,
  nom,
  partenaire_nom,
  partenaire_fictif,
  description,
  debut,
  fin,
  statut,
  accent,
  collection_key,
  licence,
  rapport_demo
) values (
  'nova-week',
  'Nova Week',
  'Nova',
  true,
  'Une activation fictive où chaque action de supporter éclaire une partie de la collection Nova.',
  '2026-08-22 00:00:00+00'::timestamptz,
  '2026-09-07 00:00:00+00'::timestamptz,
  'publie',
  '#8B6CFF',
  'nova-week',
  '{"type":"prototype_fictif","titulaire":"Clutch","droits_tiers":false}'::jsonb,
  jsonb_build_object(
    'source', 'donnees_synthetiques',
    'libelle', 'PROJECTION COMMERCIALE FICTIVE',
    'utilisateurs_eligibles', 12840,
    'impressions_uniques', 8610,
    'participants', 3240,
    'completions', 2196,
    'recompenses_reclamees', 1984,
    'utilisateurs_avec_objet_equipe', 1428,
    'taux_participation_pct', 25.2,
    'taux_completion_pct', 67.8,
    'taux_reclamation_pct', 90.3,
    'retention_j7_pct', 47.2,
    'retention_j30_pct', 28.6
  )
)
on conflict (key) do update
set nom = excluded.nom,
    partenaire_nom = excluded.partenaire_nom,
    partenaire_fictif = excluded.partenaire_fictif,
    description = excluded.description,
    debut = excluded.debut,
    fin = excluded.fin,
    statut = excluded.statut,
    accent = excluded.accent,
    collection_key = excluded.collection_key,
    licence = excluded.licence,
    rapport_demo = excluded.rapport_demo;

insert into public.campagne_taches_partenaire (
  campagne_key,
  key,
  type_tache,
  titre,
  description,
  objectif,
  ordre
) values
  (
    'nova-week',
    'follow-3-matches',
    'match_follow',
    'Suivre 3 matchs',
    'Ajoute trois affiches à ton suivi Nova. Aucun résultat n’est requis.',
    3,
    1
  ),
  (
    'nova-week',
    'make-3-calls',
    'calls',
    'Faire 3 Calls',
    'Trois prises de position suffisent, qu’elles soient justes ou non.',
    3,
    2
  ),
  (
    'nova-week',
    'faction-signal',
    'faction_mission',
    'Activer le signal de faction',
    'Participe une fois à la mission collective de ta faction.',
    1,
    3
  )
on conflict (campagne_key, key) do update
set type_tache = excluded.type_tache,
    titre = excluded.titre,
    description = excluded.description,
    objectif = excluded.objectif,
    ordre = excluded.ordre;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_campagne_key_fkey'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_campagne_key_fkey
      foreign key (campagne_key)
      references public.campagnes_partenaire(key)
      on update cascade
      on delete set null
      not valid;
    alter table public.objets_catalogue
      validate constraint objets_catalogue_campagne_key_fkey;
  end if;
end;
$$;

insert into public.objets_catalogue (
  id,
  emplacement,
  niveau,
  nom,
  prix,
  actif,
  description,
  rarete,
  style_key,
  accent,
  famille,
  marque_key,
  campagne_key,
  collection_key,
  source,
  disponible_du,
  disponible_au,
  statut_publication,
  licence,
  est_inclus
) values
  (
    'nova-cadre',
    'cadre_profil',
    2,
    'Cadre Nova',
    0,
    true,
    'Un cadre violet froid traversé par un signal de supernova.',
    'rare',
    'frame-nova',
    '#8B6CFF',
    'cadre_avatar',
    'nova',
    'nova-week',
    'nova-week',
    'partenaire',
    '2026-08-22 00:00:00+00'::timestamptz,
    '2026-09-07 00:00:00+00'::timestamptz,
    'publie',
    '{"type":"prototype_fictif","titulaire":"Clutch","droits_tiers":false}'::jsonb,
    false
  ),
  (
    'nova-titre',
    'titre_profil',
    2,
    'Éclaireur Nova',
    0,
    true,
    'Le titre des supporters qui ont traversé Nova Week.',
    'rare',
    'title-nova',
    '#AFA0FF',
    'titre_supporter',
    'nova',
    'nova-week',
    'nova-week',
    'partenaire',
    '2026-08-22 00:00:00+00'::timestamptz,
    '2026-09-07 00:00:00+00'::timestamptz,
    'publie',
    '{"type":"prototype_fictif","titulaire":"Clutch","droits_tiers":false}'::jsonb,
    false
  ),
  (
    'nova-relique',
    'effet_faction',
    3,
    'Supernova Instable',
    0,
    true,
    'Une variation de relique cosmique, purement visuelle.',
    'epique',
    'faction-nova',
    '#C77DFF',
    'signature_relique',
    'nova',
    'nova-week',
    'nova-week',
    'partenaire',
    '2026-08-22 00:00:00+00'::timestamptz,
    '2026-09-07 00:00:00+00'::timestamptz,
    'publie',
    '{"type":"prototype_fictif","titulaire":"Clutch","droits_tiers":false}'::jsonb,
    false
  )
on conflict (id) do update
set emplacement = excluded.emplacement,
    niveau = excluded.niveau,
    nom = excluded.nom,
    prix = excluded.prix,
    actif = excluded.actif,
    description = excluded.description,
    rarete = excluded.rarete,
    style_key = excluded.style_key,
    accent = excluded.accent,
    famille = excluded.famille,
    marque_key = excluded.marque_key,
    campagne_key = excluded.campagne_key,
    collection_key = excluded.collection_key,
    source = excluded.source,
    disponible_du = excluded.disponible_du,
    disponible_au = excluded.disponible_au,
    statut_publication = excluded.statut_publication,
    licence = excluded.licence,
    est_inclus = excluded.est_inclus;

create or replace function private.clutch_campagne_eligible_v1(
  p_user uuid,
  p_campagne_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profils p
    join public.campagnes_partenaire c
      on c.key = lower(btrim(p_campagne_key))
    where p.id = p_user
      and cardinality(coalesce(p.jeux_suivis, '{}'::text[])) > 0
      and p.equipe_favorite_id is not null
      and c.statut = 'publie'
      and c.debut <= pg_catalog.now()
      and c.fin > pg_catalog.now()
  );
$$;

create or replace function private.clutch_progression_tache_campagne_v1(
  p_user uuid,
  p_campagne_key text,
  p_tache_key text
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rejoint_le timestamptz;
  v_type text;
  v_progression integer := 0;
begin
  select participation.rejoint_le, tache.type_tache
  into v_rejoint_le, v_type
  from private.campagne_participations participation
  join public.campagne_taches_partenaire tache
    on tache.campagne_key = participation.campagne_key
   and tache.key = lower(btrim(p_tache_key))
  where participation.campagne_key = lower(btrim(p_campagne_key))
    and participation.user_id = p_user;

  if not found then
    return 0;
  end if;

  if v_type = 'match_follow' then
    select count(*)::integer
    into v_progression
    from private.campagne_matchs_suivis suivi
    where suivi.campagne_key = lower(btrim(p_campagne_key))
      and suivi.user_id = p_user
      and suivi.suivi_le >= v_rejoint_le;
  elsif v_type = 'calls' then
    select count(*)::integer
    into v_progression
    from public.pronostics_classes prediction
    where prediction.user_id = p_user
      and prediction.cree_le >= v_rejoint_le
      and prediction.statut <> 'annule';
  elsif v_type = 'faction_mission' then
    select count(*)::integer
    into v_progression
    from private.campagne_actions action
    where action.campagne_key = lower(btrim(p_campagne_key))
      and action.user_id = p_user
      and action.tache_key = lower(btrim(p_tache_key))
      and action.action_le >= v_rejoint_le;
  end if;

  return coalesce(v_progression, 0);
end;
$$;

create or replace function private.clutch_synchroniser_campagne_v1(
  p_user uuid,
  p_campagne_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campagne_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_tache record;
  v_progression integer;
  v_total integer := 0;
  v_terminees integer := 0;
  v_complete boolean := false;
begin
  if not exists (
    select 1
    from private.campagne_participations participation
    where participation.campagne_key = v_campagne_key
      and participation.user_id = p_user
  ) then
    return false;
  end if;

  for v_tache in
    select tache.key, tache.objectif
    from public.campagne_taches_partenaire tache
    where tache.campagne_key = v_campagne_key
    order by tache.ordre
  loop
    v_total := v_total + 1;
    v_progression := private.clutch_progression_tache_campagne_v1(
      p_user,
      v_campagne_key,
      v_tache.key
    );

    if v_progression >= v_tache.objectif then
      v_terminees := v_terminees + 1;
      perform private.clutch_journaliser_evenement_analytics_v1(
        p_user,
        'tache_terminee',
        null,
        v_campagne_key,
        v_tache.key,
        'serveur',
        'campaign:' || v_campagne_key || ':task:' || v_tache.key
      );
    end if;
  end loop;

  v_complete := v_total > 0 and v_terminees = v_total;

  if v_complete then
    update private.campagne_participations participation
    set terminee_le = coalesce(participation.terminee_le, pg_catalog.now())
    where participation.campagne_key = v_campagne_key
      and participation.user_id = p_user;
  end if;

  return v_complete;
end;
$$;

revoke all privileges on function private.clutch_campagne_eligible_v1(uuid, text)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_progression_tache_campagne_v1(uuid, text, text)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_synchroniser_campagne_v1(uuid, text)
from public, anon, authenticated, service_role;

create or replace function public.clutch_campagne_partenaire_v1(p_campagne_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_campagne public.campagnes_partenaire%rowtype;
  v_participation private.campagne_participations%rowtype;
  v_taches jsonb := '[]'::jsonb;
  v_recompenses jsonb := '[]'::jsonb;
  v_matchs jsonb := '[]'::jsonb;
  v_total_objectif integer := 0;
  v_total_progression integer := 0;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select c.*
  into v_campagne
  from public.campagnes_partenaire c
  where c.key = v_key
    and c.statut in ('publie', 'termine');

  if not found then
    raise exception 'campagne introuvable' using errcode = 'P0002';
  end if;

  perform private.clutch_synchroniser_campagne_v1(v_user, v_key);

  select participation.*
  into v_participation
  from private.campagne_participations participation
  where participation.campagne_key = v_key
    and participation.user_id = v_user;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', task.key,
        'type', task.type_tache,
        'titre', task.titre,
        'description', task.description,
        'objectif', task.objectif,
        'progression', least(
          task.objectif,
          private.clutch_progression_tache_campagne_v1(v_user, v_key, task.key)
        ),
        'terminee', private.clutch_progression_tache_campagne_v1(
          v_user,
          v_key,
          task.key
        ) >= task.objectif,
        'ordre', task.ordre
      )
      order by task.ordre
    ),
    '[]'::jsonb
  ),
  coalesce(sum(task.objectif), 0)::integer,
  coalesce(sum(
    least(
      task.objectif,
      private.clutch_progression_tache_campagne_v1(v_user, v_key, task.key)
    )
  ), 0)::integer
  into v_taches, v_total_objectif, v_total_progression
  from public.campagne_taches_partenaire task
  where task.campagne_key = v_key;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', objet.id,
        'emplacement', objet.emplacement,
        'famille', objet.famille,
        'nom', objet.nom,
        'description', objet.description,
        'rarete', objet.rarete,
        'style_key', objet.style_key,
        'accent', objet.accent,
        'possede', inventaire.objet_id is not null,
        'equipe', equipement.objet_id = objet.id
      )
      order by array_position(
        array['cadre_profil', 'titre_profil', 'effet_faction']::text[],
        objet.emplacement
      )
    ),
    '[]'::jsonb
  )
  into v_recompenses
  from public.objets_catalogue objet
  left join public.inventaire inventaire
    on inventaire.user_id = v_user
   and inventaire.objet_id = objet.id
  left join public.equipement equipement
    on equipement.user_id = v_user
   and equipement.emplacement = objet.emplacement
  where objet.campagne_key = v_key
    and objet.source = 'partenaire';

  select coalesce(
    jsonb_agg(match_row.payload order by match_row.debut),
    '[]'::jsonb
  )
  into v_matchs
  from (
    select
      m.debut,
      jsonb_build_object(
        'id', m.id,
        'debut', m.debut,
        'statut', m.statut,
        'jeu', m.jeu,
        'evenement', evenement.nom,
        'equipe_a', equipe_a.nom,
        'tag_a', equipe_a.tag,
        'equipe_b', equipe_b.nom,
        'tag_b', equipe_b.tag,
        'suivi', suivi.match_id is not null
      ) as payload
    from public.matchs m
    join public.evenements evenement on evenement.id = m.event_id
    join public.equipes equipe_a on equipe_a.id = m.equipe_a_id
    join public.equipes equipe_b on equipe_b.id = m.equipe_b_id
    join public.profils profil on profil.id = v_user
    left join private.campagne_matchs_suivis suivi
      on suivi.campagne_key = v_key
     and suivi.user_id = v_user
     and suivi.match_id = m.id
    where m.jeu = any(coalesce(profil.jeux_suivis, '{}'::text[]))
      and m.statut in ('a_venir', 'en_cours')
      and (m.statut = 'en_cours' or m.debut > pg_catalog.now())
    order by m.debut
    limit 6
  ) match_row;

  return jsonb_build_object(
    'campagne', jsonb_build_object(
      'key', v_campagne.key,
      'nom', v_campagne.nom,
      'partenaire', v_campagne.partenaire_nom,
      'partenaire_fictif', v_campagne.partenaire_fictif,
      'description', v_campagne.description,
      'debut', v_campagne.debut,
      'fin', v_campagne.fin,
      'statut', v_campagne.statut,
      'accent', v_campagne.accent,
      'collection_key', v_campagne.collection_key
    ),
    'eligible', private.clutch_campagne_eligible_v1(v_user, v_key),
    'rejointe', v_participation.user_id is not null,
    'rejointe_le', v_participation.rejoint_le,
    'terminee', v_participation.terminee_le is not null,
    'terminee_le', v_participation.terminee_le,
    'recompense_reclamee', v_participation.recompense_reclamee_le is not null,
    'recompense_reclamee_le', v_participation.recompense_reclamee_le,
    'progression', jsonb_build_object(
      'actuelle', v_total_progression,
      'objectif', v_total_objectif
    ),
    'taches', v_taches,
    'recompenses', v_recompenses,
    'matchs', v_matchs,
    'regle_recompense', 'participation_uniquement',
    'justesse_calls_recompensee', false
  );
end;
$$;

create or replace function public.clutch_rejoindre_campagne_partenaire_v1(
  p_campagne_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_row_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not private.clutch_campagne_eligible_v1(v_user, v_key) then
    raise exception 'campagne indisponible ou profil non eligible' using errcode = 'P0001';
  end if;

  insert into private.campagne_participations (campagne_key, user_id)
  values (v_key, v_user)
  on conflict (campagne_key, user_id) do nothing;

  get diagnostics v_row_count = row_count;

  perform private.clutch_journaliser_evenement_analytics_v1(
    v_user,
    'campagne_rejointe',
    null,
    v_key,
    null,
    'serveur',
    'campaign:' || v_key || ':joined'
  );

  return public.clutch_campagne_partenaire_v1(v_key)
    || jsonb_build_object('nouvelle_participation', v_row_count = 1);
end;
$$;

create or replace function public.clutch_suivre_match_campagne_v1(
  p_campagne_key text,
  p_match_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_match_id text := btrim(coalesce(p_match_id, ''));
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from private.campagne_participations participation
    where participation.campagne_key = v_key
      and participation.user_id = v_user
  ) then
    raise exception 'rejoins la campagne avant de suivre un match' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.matchs m
    join public.profils profil on profil.id = v_user
    join public.campagnes_partenaire campagne on campagne.key = v_key
    where m.id = v_match_id
      and m.jeu = any(coalesce(profil.jeux_suivis, '{}'::text[]))
      and m.statut in ('a_venir', 'en_cours')
      and (m.statut = 'en_cours' or m.debut > pg_catalog.now())
      and campagne.statut = 'publie'
      and campagne.debut <= pg_catalog.now()
      and campagne.fin > pg_catalog.now()
  ) then
    raise exception 'match non eligible au suivi Nova' using errcode = 'P0002';
  end if;

  insert into private.campagne_matchs_suivis (campagne_key, user_id, match_id)
  values (v_key, v_user, v_match_id)
  on conflict (campagne_key, user_id, match_id) do nothing;

  perform private.clutch_synchroniser_campagne_v1(v_user, v_key);
  return public.clutch_campagne_partenaire_v1(v_key);
end;
$$;

create or replace function public.clutch_participer_mission_faction_campagne_v1(
  p_campagne_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_tache_key text;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from private.campagne_participations participation
    join public.profils profil on profil.id = participation.user_id
    join public.campagnes_partenaire campagne on campagne.key = participation.campagne_key
    where participation.campagne_key = v_key
      and participation.user_id = v_user
      and profil.equipe_favorite_id is not null
      and campagne.statut = 'publie'
      and campagne.debut <= pg_catalog.now()
      and campagne.fin > pg_catalog.now()
  ) then
    raise exception 'faction ou participation requise' using errcode = 'P0001';
  end if;

  select task.key
  into v_tache_key
  from public.campagne_taches_partenaire task
  where task.campagne_key = v_key
    and task.type_tache = 'faction_mission'
  order by task.ordre
  limit 1;

  if v_tache_key is null then
    raise exception 'mission de faction absente' using errcode = 'P0002';
  end if;

  insert into private.campagne_actions (campagne_key, user_id, tache_key)
  values (v_key, v_user, v_tache_key)
  on conflict (campagne_key, user_id, tache_key) do nothing;

  perform private.clutch_synchroniser_campagne_v1(v_user, v_key);
  return public.clutch_campagne_partenaire_v1(v_key);
end;
$$;

create or replace function public.clutch_reclamer_recompenses_campagne_v1(
  p_campagne_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_participation private.campagne_participations%rowtype;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-campaign:' || v_key || ':' || v_user::text, 0)
  );

  perform private.clutch_synchroniser_campagne_v1(v_user, v_key);

  select participation.*
  into v_participation
  from private.campagne_participations participation
  where participation.campagne_key = v_key
    and participation.user_id = v_user
  for update;

  if not found then
    raise exception 'participation introuvable' using errcode = 'P0002';
  end if;

  if v_participation.terminee_le is null then
    raise exception 'termine les trois taches avant de reclamer' using errcode = 'P0001';
  end if;

  if v_participation.recompense_reclamee_le is null then
    insert into public.inventaire (user_id, objet_id)
    select v_user, objet.id
    from public.objets_catalogue objet
    where objet.campagne_key = v_key
      and objet.source = 'partenaire'
      and objet.statut_publication = 'publie'
    on conflict (user_id, objet_id) do nothing;

    update private.campagne_participations participation
    set recompense_reclamee_le = pg_catalog.now()
    where participation.campagne_key = v_key
      and participation.user_id = v_user;

    perform private.clutch_journaliser_evenement_analytics_v1(
      v_user,
      'recompense_reclamee',
      null,
      v_key,
      null,
      'serveur',
      'campaign:' || v_key || ':reward-claimed'
    );
  end if;

  return public.clutch_campagne_partenaire_v1(v_key);
end;
$$;

create or replace function public.clutch_rapport_campagne_partenaire_v1(
  p_campagne_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_campagne_key, '')));
  v_campagne public.campagnes_partenaire%rowtype;
  v_eligibles integer := 0;
  v_impressions integer := 0;
  v_participants integer := 0;
  v_completions integer := 0;
  v_recompenses integer := 0;
  v_objets_equipes integer := 0;
  v_utilisateurs_equipes integer := 0;
  v_j7_eligibles integer := 0;
  v_j7_retenus integer := 0;
  v_j30_eligibles integer := 0;
  v_j30_retenus integer := 0;
  v_seuil_confidentialite constant integer := 5;
begin
  if v_user is null or not exists (
    select 1
    from public.profils profil
    where profil.id = v_user
      and profil.est_admin
  ) then
    raise exception 'reserve aux administrateurs Clutch' using errcode = '42501';
  end if;

  select campagne.*
  into v_campagne
  from public.campagnes_partenaire campagne
  where campagne.key = v_key;

  if not found then
    raise exception 'campagne introuvable' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into v_eligibles
  from public.profils profil
  where cardinality(coalesce(profil.jeux_suivis, '{}'::text[])) > 0
    and profil.equipe_favorite_id is not null
    and profil.cree_le < v_campagne.fin;

  select count(distinct evenement.user_id)::integer
  into v_impressions
  from private.analytics_evenements evenement
  where evenement.campagne_key = v_key
    and evenement.type_evenement = 'collection_affichee';

  select
    count(*)::integer,
    count(*) filter (where participation.terminee_le is not null)::integer,
    count(*) filter (where participation.recompense_reclamee_le is not null)::integer,
    count(*) filter (
      where participation.rejoint_le <= pg_catalog.now() - interval '7 days'
    )::integer,
    count(*) filter (
      where participation.rejoint_le <= pg_catalog.now() - interval '30 days'
    )::integer
  into
    v_participants,
    v_completions,
    v_recompenses,
    v_j7_eligibles,
    v_j30_eligibles
  from private.campagne_participations participation
  where participation.campagne_key = v_key;

  select
    count(*)::integer,
    count(distinct equipement.user_id)::integer
  into v_objets_equipes, v_utilisateurs_equipes
  from public.equipement equipement
  join public.objets_catalogue objet on objet.id = equipement.objet_id
  join private.campagne_participations participation
    on participation.user_id = equipement.user_id
   and participation.campagne_key = v_key
  where objet.campagne_key = v_key;

  select count(*)::integer
  into v_j7_retenus
  from private.campagne_participations participation
  where participation.campagne_key = v_key
    and participation.rejoint_le <= pg_catalog.now() - interval '7 days'
    and exists (
      select 1
      from private.analytics_evenements evenement
      where evenement.user_id = participation.user_id
        and evenement.type_evenement = 'application_active'
        and evenement.cree_le >= participation.rejoint_le + interval '7 days'
        and evenement.cree_le < participation.rejoint_le + interval '8 days'
    );

  select count(*)::integer
  into v_j30_retenus
  from private.campagne_participations participation
  where participation.campagne_key = v_key
    and participation.rejoint_le <= pg_catalog.now() - interval '30 days'
    and exists (
      select 1
      from private.analytics_evenements evenement
      where evenement.user_id = participation.user_id
        and evenement.type_evenement = 'application_active'
        and evenement.cree_le >= participation.rejoint_le + interval '30 days'
        and evenement.cree_le < participation.rejoint_le + interval '31 days'
    );

  return jsonb_build_object(
    'campagne', jsonb_build_object(
      'key', v_campagne.key,
      'nom', v_campagne.nom,
      'partenaire', v_campagne.partenaire_nom,
      'partenaire_fictif', v_campagne.partenaire_fictif,
      'debut', v_campagne.debut,
      'fin', v_campagne.fin,
      'accent', v_campagne.accent
    ),
    'live', jsonb_build_object(
      'source', 'agregats_pilote_reels',
      'utilisateurs_eligibles', v_eligibles,
      'impressions_uniques', v_impressions,
      'participants', v_participants,
      'completions', v_completions,
      'recompenses_reclamees', v_recompenses,
      'objets_equipes', v_objets_equipes,
      'utilisateurs_avec_objet_equipe', v_utilisateurs_equipes,
      'taux_participation_pct', case
        when v_eligibles = 0 then 0
        else round(v_participants * 100.0 / v_eligibles, 1)
      end,
      'taux_completion_pct', case
        when v_participants = 0 then 0
        else round(v_completions * 100.0 / v_participants, 1)
      end,
      'taux_reclamation_pct', case
        when v_completions = 0 then 0
        else round(v_recompenses * 100.0 / v_completions, 1)
      end,
      'retention_j7', jsonb_build_object(
        'cohorte', v_j7_eligibles,
        'retenus', v_j7_retenus,
        'taux_pct', case
          when v_j7_eligibles = 0 then null
          else round(v_j7_retenus * 100.0 / v_j7_eligibles, 1)
        end
      ),
      'retention_j30', jsonb_build_object(
        'cohorte', v_j30_eligibles,
        'retenus', v_j30_retenus,
        'taux_pct', case
          when v_j30_eligibles = 0 then null
          else round(v_j30_retenus * 100.0 / v_j30_eligibles, 1)
        end
      )
    ),
    'export_partenaire', jsonb_build_object(
      'publiable', v_eligibles >= v_seuil_confidentialite,
      'seuil_confidentialite', v_seuil_confidentialite,
      'raison_blocage', case
        when v_eligibles >= v_seuil_confidentialite then null
        else 'cohorte_trop_faible'
      end,
      'indicateurs', case
        when v_eligibles >= v_seuil_confidentialite then jsonb_build_object(
          'utilisateurs_eligibles', v_eligibles,
          'impressions_uniques', v_impressions,
          'taux_participation_pct', case
            when v_eligibles = 0 then 0
            else round(v_participants * 100.0 / v_eligibles, 1)
          end,
          'taux_completion_pct', case
            when v_participants = 0 then 0
            else round(v_completions * 100.0 / v_participants, 1)
          end,
          'recompenses_reclamees', v_recompenses,
          'objets_equipes', v_objets_equipes,
          'retention_j7_pct', case
            when v_j7_eligibles = 0 then null
            else round(v_j7_retenus * 100.0 / v_j7_eligibles, 1)
          end,
          'retention_j30_pct', case
            when v_j30_eligibles = 0 then null
            else round(v_j30_retenus * 100.0 / v_j30_eligibles, 1)
          end
        )
        else null
      end
    ),
    'demonstration', v_campagne.rapport_demo,
    'confidentialite', jsonb_build_object(
      'donnees_personnelles', false,
      'identifiants_utilisateur', false,
      'agregats_uniquement', true,
      'cohortes_faibles_masquees', true
    )
  );
end;
$$;

comment on function public.clutch_rapport_campagne_partenaire_v1(text) is
  'Admin-only aggregate campaign report. It never returns user ids, pseudonyms, emails or raw event rows; partner export is suppressed below five eligible users.';
comment on function public.clutch_reclamer_recompenses_campagne_v1(text) is
  'Atomic, idempotent campaign claim. It grants known permanent cosmetics after participation tasks only and never checks Call correctness.';

revoke all privileges on function public.clutch_campagne_partenaire_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_rejoindre_campagne_partenaire_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_suivre_match_campagne_v1(text, text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_participer_mission_faction_campagne_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_reclamer_recompenses_campagne_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_rapport_campagne_partenaire_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_campagne_partenaire_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_rejoindre_campagne_partenaire_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_suivre_match_campagne_v1(text, text)
to authenticated, service_role;
grant execute on function public.clutch_participer_mission_faction_campagne_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_reclamer_recompenses_campagne_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_rapport_campagne_partenaire_v1(text)
to authenticated, service_role;

do $$
declare
  v_contract jsonb := public.clutch_contrat_monetisation_v1();
begin
  if v_contract #>> '{partenaires,recompense}' <> 'participation_uniquement'
     or coalesce((v_contract #>> '{partenaires,justesse_pronostic_recompensee}')::boolean, true)
     or coalesce((v_contract #>> '{partenaires,donnees_personnelles_exposees}')::boolean, true)
     or has_table_privilege('authenticated', 'public.campagnes_partenaire', 'SELECT')
     or has_table_privilege('authenticated', 'private.campagne_participations', 'SELECT')
     or has_table_privilege('authenticated', 'private.campagne_matchs_suivis', 'INSERT')
     or has_function_privilege(
       'anon',
       'public.clutch_campagne_partenaire_v1(text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.clutch_reclamer_recompenses_campagne_v1(text)',
       'EXECUTE'
     )
  then
    raise exception 'Nova Week security or monetization contract is inconsistent';
  end if;
end;
$$;
