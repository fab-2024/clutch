-- Monetization phase 4.1 -- first-party, privacy-respecting product analytics.
--
-- Raw events stay in the non-exposed private schema. The mobile client can
-- only record low-risk first-party interactions; acquisition, equipment and
-- future partner conversions are emitted by trusted database operations.
-- There is deliberately no device identifier, IP address, advertising id,
-- free-form metadata or partner-visible user identifier in this model.

create schema if not exists private;

create table if not exists private.analytics_evenements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  type_evenement text not null,
  objet_id text references public.objets_catalogue(id) on update cascade on delete set null,
  campagne_key text,
  tache_key text,
  source_evenement text not null,
  cle_idempotence text,
  cree_le timestamptz not null default pg_catalog.now(),
  constraint analytics_evenements_type_check check (
    type_evenement in (
      'application_active',
      'collection_affichee',
      'objet_consulte',
      'objet_obtenu',
      'objet_equipe',
      'objet_retire',
      'campagne_rejointe',
      'tache_terminee',
      'recompense_reclamee'
    )
  ),
  constraint analytics_evenements_source_check check (
    source_evenement in ('client', 'serveur')
  ),
  constraint analytics_evenements_client_check check (
    source_evenement <> 'client'
    or type_evenement in ('application_active', 'collection_affichee', 'objet_consulte')
  ),
  constraint analytics_evenements_campagne_key_check check (
    campagne_key is null
    or campagne_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
  ),
  constraint analytics_evenements_tache_key_check check (
    tache_key is null
    or tache_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
  ),
  constraint analytics_evenements_idempotence_check check (
    cle_idempotence is null
    or cle_idempotence ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$'
  ),
  constraint analytics_evenements_contexte_check check (
    case type_evenement
      when 'application_active' then objet_id is null and campagne_key is null and tache_key is null
      when 'collection_affichee' then objet_id is null and tache_key is null
      when 'objet_consulte' then objet_id is not null and tache_key is null
      when 'objet_obtenu' then objet_id is not null and tache_key is null
      when 'objet_equipe' then objet_id is not null and tache_key is null
      when 'objet_retire' then objet_id is not null and tache_key is null
      when 'campagne_rejointe' then objet_id is null and campagne_key is not null and tache_key is null
      when 'tache_terminee' then objet_id is null and campagne_key is not null and tache_key is not null
      when 'recompense_reclamee' then objet_id is null and campagne_key is not null and tache_key is null
      else false
    end
  )
);

create unique index if not exists analytics_evenements_idempotence_uidx
  on private.analytics_evenements (user_id, type_evenement, cle_idempotence)
  where cle_idempotence is not null;

create index if not exists analytics_evenements_campagne_idx
  on private.analytics_evenements (campagne_key, type_evenement, cree_le)
  where campagne_key is not null;

create index if not exists analytics_evenements_activite_idx
  on private.analytics_evenements (user_id, cree_le)
  where type_evenement = 'application_active';

create index if not exists analytics_evenements_objet_idx
  on private.analytics_evenements (objet_id, type_evenement, cree_le)
  where objet_id is not null;

alter table private.analytics_evenements enable row level security;

revoke all privileges on table private.analytics_evenements
from public, anon, authenticated, service_role;

comment on table private.analytics_evenements is
  'Private first-party interaction ledger. It contains no device/ad identifier or free-form metadata and is never exposed to partners or the Data API.';
comment on column private.analytics_evenements.user_id is
  'Internal first-party owner used for deduplication and retention measurement. Partner reports must never return it.';

create or replace function private.clutch_journaliser_evenement_analytics_v1(
  p_user uuid,
  p_type text,
  p_objet_id text default null,
  p_campagne_key text default null,
  p_tache_key text default null,
  p_source text default 'serveur',
  p_cle_idempotence text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := lower(btrim(coalesce(p_type, '')));
  v_objet_id text := nullif(btrim(coalesce(p_objet_id, '')), '');
  v_campagne_key text := nullif(lower(btrim(coalesce(p_campagne_key, ''))), '');
  v_tache_key text := nullif(lower(btrim(coalesce(p_tache_key, ''))), '');
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_cle text := nullif(btrim(coalesce(p_cle_idempotence, '')), '');
  v_inserted integer := 0;
begin
  if p_user is null or not exists (
    select 1 from public.profils p where p.id = p_user
  ) then
    raise exception 'profil analytics invalide' using errcode = 'P0002';
  end if;

  if v_objet_id is not null then
    select o.campagne_key
    into v_campagne_key
    from public.objets_catalogue o
    where o.id = v_objet_id;

    if not found then
      raise exception 'objet analytics introuvable' using errcode = 'P0002';
    end if;

    v_campagne_key := coalesce(
      nullif(lower(btrim(coalesce(p_campagne_key, ''))), ''),
      v_campagne_key
    );
  end if;

  insert into private.analytics_evenements (
    user_id,
    type_evenement,
    objet_id,
    campagne_key,
    tache_key,
    source_evenement,
    cle_idempotence
  ) values (
    p_user,
    v_type,
    v_objet_id,
    v_campagne_key,
    v_tache_key,
    v_source,
    v_cle
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all privileges on function private.clutch_journaliser_evenement_analytics_v1(
  uuid, text, text, text, text, text, text
) from public, anon, authenticated, service_role;

comment on function private.clutch_journaliser_evenement_analytics_v1(
  uuid, text, text, text, text, text, text
) is
  'Internal allowlisted analytics primitive. Callers never supply arbitrary metadata and duplicates can be suppressed with a scoped idempotency key.';

create or replace function public.clutch_enregistrer_evenement_analytics_v1(
  p_type text,
  p_objet_id text default null,
  p_campagne_key text default null,
  p_cle_idempotence text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_type text := lower(btrim(coalesce(p_type, '')));
  v_objet_id text := nullif(btrim(coalesce(p_objet_id, '')), '');
  v_campagne_key text := nullif(lower(btrim(coalesce(p_campagne_key, ''))), '');
  v_cle text := nullif(btrim(coalesce(p_cle_idempotence, '')), '');
  v_inserted boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if v_type not in ('application_active', 'collection_affichee', 'objet_consulte') then
    raise exception 'evenement client interdit' using errcode = '22023';
  end if;

  if v_type = 'application_active'
     and (v_objet_id is not null or v_campagne_key is not null)
  then
    raise exception 'contexte activite invalide' using errcode = '22023';
  end if;

  if v_type = 'collection_affichee' and v_objet_id is not null then
    raise exception 'contexte collection invalide' using errcode = '22023';
  end if;

  if v_type = 'objet_consulte' and v_objet_id is null then
    raise exception 'objet requis' using errcode = '22023';
  end if;

  v_inserted := private.clutch_journaliser_evenement_analytics_v1(
    v_user,
    v_type,
    v_objet_id,
    v_campagne_key,
    null,
    'client',
    v_cle
  );

  return jsonb_build_object(
    'accepte', true,
    'nouveau', v_inserted,
    'type', v_type,
    'portee', 'first_party_aggregate_only'
  );
end;
$$;

revoke all privileges on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) to authenticated, service_role;

comment on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) is
  'Intentional authenticated SECURITY DEFINER API. It derives the user from auth.uid() and only accepts activity, collection impression and item-view events without arbitrary metadata.';

create or replace function private.clutch_analytics_inventaire_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.clutch_journaliser_evenement_analytics_v1(
    new.user_id,
    'objet_obtenu',
    new.objet_id,
    null,
    null,
    'serveur',
    'inventory:' || new.objet_id
  );
  return new;
end;
$$;

create or replace function private.clutch_analytics_equipement_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.clutch_journaliser_evenement_analytics_v1(
      old.user_id,
      'objet_retire',
      old.objet_id,
      null,
      null,
      'serveur',
      'equipment-remove:' || old.emplacement || ':' || old.objet_id || ':' || extract(epoch from pg_catalog.clock_timestamp())::bigint::text
    );
    return old;
  end if;

  if tg_op = 'UPDATE' and old.objet_id is distinct from new.objet_id then
    perform private.clutch_journaliser_evenement_analytics_v1(
      old.user_id,
      'objet_retire',
      old.objet_id,
      null,
      null,
      'serveur',
      'equipment-remove:' || old.emplacement || ':' || old.objet_id || ':' || extract(epoch from pg_catalog.clock_timestamp())::bigint::text
    );
  end if;

  if tg_op = 'INSERT' or old.objet_id is distinct from new.objet_id then
    perform private.clutch_journaliser_evenement_analytics_v1(
      new.user_id,
      'objet_equipe',
      new.objet_id,
      null,
      null,
      'serveur',
      'equipment-set:' || new.emplacement || ':' || new.objet_id || ':' || extract(epoch from pg_catalog.clock_timestamp())::bigint::text
    );
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_analytics_inventaire_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_analytics_equipement_v1()
from public, anon, authenticated, service_role;

drop trigger if exists inventaire_analytics_v1 on public.inventaire;
create trigger inventaire_analytics_v1
after insert on public.inventaire
for each row execute function private.clutch_analytics_inventaire_v1();

drop trigger if exists equipement_analytics_v1 on public.equipement;
create trigger equipement_analytics_v1
after insert or update of objet_id or delete on public.equipement
for each row execute function private.clutch_analytics_equipement_v1();

create or replace function public.clutch_contrat_analytics_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'stockage_brut', 'private.analytics_evenements',
    'data_api_brute', false,
    'identifiant_publicitaire', false,
    'identifiant_appareil', false,
    'metadata_libre', false,
    'partage_partenaire', 'agregats_uniquement',
    'evenements', jsonb_build_array(
      'application_active',
      'collection_affichee',
      'objet_consulte',
      'objet_obtenu',
      'objet_equipe',
      'objet_retire',
      'campagne_rejointe',
      'tache_terminee',
      'recompense_reclamee'
    ),
    'indicateurs_partenaire', jsonb_build_array(
      'utilisateurs_eligibles',
      'impressions_uniques',
      'taux_participation',
      'taux_completion',
      'recompenses_reclamees',
      'objets_equipes',
      'retention_j7',
      'retention_j30'
    ),
    'declaration_store', jsonb_build_object(
      'categorie', 'donnees_utilisation_interaction_produit',
      'finalite', 'analytics',
      'liee_identite_interne', true,
      'tracking_inter_apps', false,
      'vente_donnees', false
    )
  );
$$;

revoke all privileges on function public.clutch_contrat_analytics_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_analytics_v1()
to anon, authenticated, service_role;

comment on function public.clutch_contrat_analytics_v1() is
  'Machine-readable privacy contract for store disclosure and partner reporting. Product interaction is first-party and linked internally, never cross-app tracked.';

do $$
declare
  v_contract jsonb := public.clutch_contrat_analytics_v1();
begin
  if coalesce((v_contract ->> 'data_api_brute')::boolean, true)
     or coalesce((v_contract ->> 'identifiant_publicitaire')::boolean, true)
     or coalesce((v_contract ->> 'identifiant_appareil')::boolean, true)
     or v_contract ->> 'partage_partenaire' <> 'agregats_uniquement'
     or has_table_privilege('authenticated', 'private.analytics_evenements', 'SELECT')
     or has_table_privilege('authenticated', 'private.analytics_evenements', 'INSERT')
     or has_function_privilege(
       'anon',
       'public.clutch_enregistrer_evenement_analytics_v1(text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.clutch_enregistrer_evenement_analytics_v1(text,text,text,text)',
       'EXECUTE'
     )
  then
    raise exception 'privacy analytics contract is not fail-closed';
  end if;
end;
$$;
