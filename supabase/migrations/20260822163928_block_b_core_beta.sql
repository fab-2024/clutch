-- Block B -- beta core: consented first-party analytics, Rank orchestration,
-- a real collective faction mission, Hub complements and social safety.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Privacy choices and minimum-age declaration
-- ---------------------------------------------------------------------------

create table if not exists private.preferences_confidentialite (
  user_id uuid primary key references public.profils(id) on delete cascade,
  analytics_autorise boolean not null default false,
  analytics_maj_le timestamptz,
  age_minimum_confirme boolean not null default false,
  age_maj_le timestamptz,
  version_confidentialite text not null default '2026-08-22',
  maj_le timestamptz not null default pg_catalog.now(),
  constraint preferences_confidentialite_version_check
    check (version_confidentialite ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

alter table private.preferences_confidentialite enable row level security;
revoke all privileges on table private.preferences_confidentialite
from public, anon, authenticated, service_role;

comment on table private.preferences_confidentialite is
  'Private register of the optional analytics choice and the 15+ self-declaration. No birth date is collected.';

insert into private.preferences_confidentialite (user_id)
select p.id
from public.profils p
on conflict (user_id) do nothing;

create or replace function private.clutch_initialiser_confidentialite_profil_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_age boolean := false;
begin
  select coalesce((u.raw_user_meta_data ->> 'age_minimum_confirme')::boolean, false)
  into v_age
  from auth.users u
  where u.id = new.id;

  insert into private.preferences_confidentialite (
    user_id,
    age_minimum_confirme,
    age_maj_le
  ) values (
    new.id,
    v_age,
    case when v_age then pg_catalog.now() end
  )
  on conflict (user_id) do nothing;

  return new;
exception
  when invalid_text_representation then
    insert into private.preferences_confidentialite (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$;

revoke all privileges on function private.clutch_initialiser_confidentialite_profil_v1()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_initialiser_confidentialite_profil_v1 on public.profils;
create trigger clutch_initialiser_confidentialite_profil_v1
after insert on public.profils
for each row execute function private.clutch_initialiser_confidentialite_profil_v1();

create or replace function public.clutch_mes_preferences_confidentialite_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_preferences private.preferences_confidentialite%rowtype;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select * into v_preferences
  from private.preferences_confidentialite p
  where p.user_id = v_user;

  return jsonb_build_object(
    'analytics_autorise', coalesce(v_preferences.analytics_autorise, false),
    'analytics_maj_le', v_preferences.analytics_maj_le,
    'age_minimum', 15,
    'age_minimum_confirme', coalesce(v_preferences.age_minimum_confirme, false),
    'age_maj_le', v_preferences.age_maj_le,
    'version_confidentialite', coalesce(v_preferences.version_confidentialite, '2026-08-22')
  );
end;
$$;

create or replace function public.clutch_enregistrer_preferences_confidentialite_v1(
  p_analytics_autorise boolean,
  p_age_minimum_confirme boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_before private.preferences_confidentialite%rowtype;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if coalesce(p_age_minimum_confirme, false) is not true then
    raise exception 'confirmation age minimum requise' using errcode = '22023';
  end if;

  select * into v_before
  from private.preferences_confidentialite p
  where p.user_id = v_user;

  insert into private.preferences_confidentialite (
    user_id,
    analytics_autorise,
    analytics_maj_le,
    age_minimum_confirme,
    age_maj_le,
    version_confidentialite,
    maj_le
  ) values (
    v_user,
    coalesce(p_analytics_autorise, false),
    pg_catalog.now(),
    true,
    pg_catalog.now(),
    '2026-08-22',
    pg_catalog.now()
  )
  on conflict (user_id) do update
  set analytics_autorise = excluded.analytics_autorise,
      analytics_maj_le = case
        when private.preferences_confidentialite.analytics_autorise is distinct from excluded.analytics_autorise
        then pg_catalog.now()
        else private.preferences_confidentialite.analytics_maj_le
      end,
      age_minimum_confirme = true,
      age_maj_le = coalesce(private.preferences_confidentialite.age_maj_le, pg_catalog.now()),
      version_confidentialite = excluded.version_confidentialite,
      maj_le = pg_catalog.now();

  return public.clutch_mes_preferences_confidentialite_v1();
end;
$$;

revoke all privileges on function public.clutch_mes_preferences_confidentialite_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_enregistrer_preferences_confidentialite_v1(boolean, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_mes_preferences_confidentialite_v1()
to authenticated, service_role;
grant execute on function public.clutch_enregistrer_preferences_confidentialite_v1(boolean, boolean)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Blocking, reporting and interaction guards
-- ---------------------------------------------------------------------------

create table if not exists private.utilisateurs_bloques (
  bloqueur_id uuid not null references public.profils(id) on delete cascade,
  bloque_id uuid not null references public.profils(id) on delete cascade,
  cree_le timestamptz not null default pg_catalog.now(),
  primary key (bloqueur_id, bloque_id),
  constraint utilisateurs_bloques_distincts_check check (bloqueur_id <> bloque_id)
);

create index if not exists utilisateurs_bloques_cible_idx
  on private.utilisateurs_bloques (bloque_id, bloqueur_id);

create table if not exists private.signalements_utilisateurs (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references public.profils(id) on delete cascade,
  cible_id uuid not null references public.profils(id) on delete cascade,
  motif text not null,
  detail text,
  statut text not null default 'ouvert',
  cree_le timestamptz not null default pg_catalog.now(),
  traite_le timestamptz,
  traite_par uuid references public.profils(id) on delete set null,
  constraint signalements_utilisateurs_distincts_check check (auteur_id <> cible_id),
  constraint signalements_utilisateurs_motif_check check (
    motif in ('harcelement', 'haine', 'spam', 'usurpation', 'contenu_inapproprie', 'autre')
  ),
  constraint signalements_utilisateurs_detail_check check (
    detail is null or pg_catalog.length(detail) between 1 and 500
  ),
  constraint signalements_utilisateurs_statut_check check (
    statut in ('ouvert', 'en_cours', 'clos', 'rejete')
  )
);

create index if not exists signalements_utilisateurs_cible_idx
  on private.signalements_utilisateurs (cible_id, statut, cree_le desc);
create index if not exists signalements_utilisateurs_auteur_idx
  on private.signalements_utilisateurs (auteur_id, cree_le desc);
create index if not exists signalements_utilisateurs_traite_par_idx
  on private.signalements_utilisateurs (traite_par)
  where traite_par is not null;

alter table private.utilisateurs_bloques enable row level security;
alter table private.signalements_utilisateurs enable row level security;
revoke all privileges on table private.utilisateurs_bloques
from public, anon, authenticated, service_role;
revoke all privileges on table private.signalements_utilisateurs
from public, anon, authenticated, service_role;

create or replace function private.clutch_utilisateurs_bloques_v1(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_a is not null
    and p_b is not null
    and exists (
      select 1
      from private.utilisateurs_bloques b
      where (b.bloqueur_id = p_a and b.bloque_id = p_b)
         or (b.bloqueur_id = p_b and b.bloque_id = p_a)
    )
$$;

revoke all privileges on function private.clutch_utilisateurs_bloques_v1(uuid, uuid)
from public, anon, authenticated, service_role;

create or replace function private.clutch_resoudre_pseudo_v1(p_pseudo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profils p
  where pg_catalog.lower(p.pseudo) = pg_catalog.lower(pg_catalog.btrim(coalesce(p_pseudo, '')))
  limit 1
$$;

revoke all privileges on function private.clutch_resoudre_pseudo_v1(text)
from public, anon, authenticated, service_role;

create or replace function public.clutch_etat_securite_profil_v1(p_pseudo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_target uuid := private.clutch_resoudre_pseudo_v1(p_pseudo);
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_target is null then
    return null;
  end if;

  return jsonb_build_object(
    'est_moi', v_target = v_user,
    'je_bloque', exists (
      select 1 from private.utilisateurs_bloques b
      where b.bloqueur_id = v_user and b.bloque_id = v_target
    ),
    'me_bloque', exists (
      select 1 from private.utilisateurs_bloques b
      where b.bloqueur_id = v_target and b.bloque_id = v_user
    )
  );
end;
$$;

create or replace function public.clutch_bloquer_utilisateur_v1(p_pseudo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_target uuid := private.clutch_resoudre_pseudo_v1(p_pseudo);
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_target is null then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;
  if v_target = v_user then
    raise exception 'auto blocage interdit' using errcode = '22023';
  end if;

  insert into private.utilisateurs_bloques (bloqueur_id, bloque_id)
  values (v_user, v_target)
  on conflict (bloqueur_id, bloque_id) do nothing;

  delete from public.amities a
  where (a.a = least(v_user, v_target) and a.b = greatest(v_user, v_target));

  update public.defis_match d
  set statut = 'annule',
      annule_le = coalesce(d.annule_le, pg_catalog.now())
  where d.statut not in ('termine', 'annule')
    and (
      (d.createur_id = v_user and coalesce(d.cible_id, d.accepteur_id) = v_target)
      or (d.createur_id = v_target and coalesce(d.cible_id, d.accepteur_id) = v_user)
    );

  return public.clutch_etat_securite_profil_v1(p_pseudo);
end;
$$;

create or replace function public.clutch_debloquer_utilisateur_v1(p_pseudo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_target uuid := private.clutch_resoudre_pseudo_v1(p_pseudo);
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_target is null then
    return false;
  end if;

  delete from private.utilisateurs_bloques b
  where b.bloqueur_id = v_user and b.bloque_id = v_target;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.clutch_mes_utilisateurs_bloques_v1()
returns table (
  id uuid,
  pseudo text,
  bloque_le timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  return query
  select p.id, p.pseudo, b.cree_le
  from private.utilisateurs_bloques b
  join public.profils p on p.id = b.bloque_id
  where b.bloqueur_id = v_user
  order by b.cree_le desc, p.pseudo asc;
end;
$$;

create or replace function public.clutch_signaler_utilisateur_v1(
  p_pseudo text,
  p_motif text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_target uuid := private.clutch_resoudre_pseudo_v1(p_pseudo);
  v_motif text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_motif, '')));
  v_detail text := nullif(pg_catalog.btrim(coalesce(p_detail, '')), '');
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_target is null then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;
  if v_target = v_user then
    raise exception 'auto signalement interdit' using errcode = '22023';
  end if;
  if v_motif not in ('harcelement', 'haine', 'spam', 'usurpation', 'contenu_inapproprie', 'autre') then
    raise exception 'motif invalide' using errcode = '22023';
  end if;
  if v_detail is not null and pg_catalog.length(v_detail) > 500 then
    raise exception 'detail trop long' using errcode = '22023';
  end if;

  select s.id into v_id
  from private.signalements_utilisateurs s
  where s.auteur_id = v_user
    and s.cible_id = v_target
    and s.motif = v_motif
    and s.statut in ('ouvert', 'en_cours')
    and s.cree_le >= pg_catalog.now() - interval '24 hours'
  order by s.cree_le desc
  limit 1;

  if v_id is null then
    insert into private.signalements_utilisateurs (auteur_id, cible_id, motif, detail)
    values (v_user, v_target, v_motif, v_detail)
    returning id into v_id;
  end if;

  return jsonb_build_object('accepte', true, 'signalement_id', v_id, 'statut', 'ouvert');
end;
$$;

create or replace function private.clutch_interdire_relation_bloquee_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.clutch_utilisateurs_bloques_v1(new.a, new.b) then
    raise exception 'interaction bloquee' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.clutch_interdire_duel_bloque_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid := coalesce(new.cible_id, new.accepteur_id);
begin
  if v_target is not null
     and private.clutch_utilisateurs_bloques_v1(new.createur_id, v_target)
  then
    raise exception 'interaction bloquee' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all privileges on function private.clutch_interdire_relation_bloquee_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_interdire_duel_bloque_v1()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_interdire_relation_bloquee_v1 on public.amities;
create trigger clutch_interdire_relation_bloquee_v1
before insert or update on public.amities
for each row execute function private.clutch_interdire_relation_bloquee_v1();

drop trigger if exists clutch_interdire_duel_bloque_v1 on public.defis_match;
create trigger clutch_interdire_duel_bloque_v1
before insert or update of cible_id, accepteur_id on public.defis_match
for each row execute function private.clutch_interdire_duel_bloque_v1();

revoke all privileges on function public.clutch_etat_securite_profil_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_bloquer_utilisateur_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_debloquer_utilisateur_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_utilisateurs_bloques_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_signaler_utilisateur_v1(text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_etat_securite_profil_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_bloquer_utilisateur_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_debloquer_utilisateur_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_mes_utilisateurs_bloques_v1()
to authenticated, service_role;
grant execute on function public.clutch_signaler_utilisateur_v1(text, text, text)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Consented, allowlisted beta-loop analytics
-- ---------------------------------------------------------------------------

alter table private.analytics_evenements
  drop constraint if exists analytics_evenements_type_check,
  drop constraint if exists analytics_evenements_client_check,
  drop constraint if exists analytics_evenements_contexte_check;

alter table private.analytics_evenements
  add constraint analytics_evenements_type_check check (
    type_evenement in (
      'application_active',
      'collection_affichee',
      'objet_consulte',
      'objet_obtenu',
      'objet_equipe',
      'objet_retire',
      'campagne_rejointe',
      'tache_terminee',
      'recompense_reclamee',
      'founder_pack_affiche',
      'founder_pack_achat_demarre',
      'founder_pack_restauration_demandee',
      'founder_pack_achat_annule',
      'founder_pack_attribue',
      'founder_pack_revoque',
      'onboarding_commence',
      'onboarding_termine',
      'match_consulte',
      'call_commence',
      'call_verrouille',
      'resultat_consulte',
      'frags_gagnes',
      'rank_consulte',
      'profil_public_consulte',
      'mission_commencee',
      'mission_terminee',
      'achat_commence',
      'achat_termine',
      'notification_ouverte'
    )
  ) not valid,
  add constraint analytics_evenements_client_check check (
    source_evenement <> 'client'
    or type_evenement in (
      'application_active',
      'collection_affichee',
      'objet_consulte',
      'founder_pack_affiche',
      'founder_pack_achat_demarre',
      'founder_pack_restauration_demandee',
      'founder_pack_achat_annule',
      'onboarding_commence',
      'onboarding_termine',
      'match_consulte',
      'call_commence',
      'call_verrouille',
      'resultat_consulte',
      'rank_consulte',
      'profil_public_consulte',
      'achat_commence',
      'notification_ouverte'
    )
  ) not valid,
  add constraint analytics_evenements_contexte_check check (
    case type_evenement
      when 'collection_affichee' then objet_id is null and tache_key is null
      when 'objet_consulte' then objet_id is not null and tache_key is null
      when 'objet_obtenu' then objet_id is not null and tache_key is null
      when 'objet_equipe' then objet_id is not null and tache_key is null
      when 'objet_retire' then objet_id is not null and tache_key is null
      when 'campagne_rejointe' then objet_id is null and campagne_key is not null and tache_key is null
      when 'tache_terminee' then objet_id is null and campagne_key is not null and tache_key is not null
      when 'recompense_reclamee' then objet_id is null and campagne_key is not null and tache_key is null
      else objet_id is null and campagne_key is null and tache_key is null
    end
  ) not valid;

alter table private.analytics_evenements validate constraint analytics_evenements_type_check;
alter table private.analytics_evenements validate constraint analytics_evenements_client_check;
alter table private.analytics_evenements validate constraint analytics_evenements_contexte_check;

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
  v_type text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_type, '')));
  v_objet_id text := nullif(pg_catalog.btrim(coalesce(p_objet_id, '')), '');
  v_campagne_key text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_campagne_key, ''))), '');
  v_tache_key text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_tache_key, ''))), '');
  v_source text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_source, '')));
  v_cle text := nullif(pg_catalog.btrim(coalesce(p_cle_idempotence, '')), '');
  v_inserted integer := 0;
begin
  if p_user is null or not exists (
    select 1 from public.profils p where p.id = p_user
  ) then
    raise exception 'profil analytics invalide' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from private.preferences_confidentialite c
    where c.user_id = p_user and c.analytics_autorise
  ) then
    return false;
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
      nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_campagne_key, ''))), ''),
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
  v_user uuid := (select auth.uid());
  v_type text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_type, '')));
  v_objet_id text := nullif(pg_catalog.btrim(coalesce(p_objet_id, '')), '');
  v_campagne_key text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_campagne_key, ''))), '');
  v_cle text := nullif(pg_catalog.btrim(coalesce(p_cle_idempotence, '')), '');
  v_inserted boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if v_type not in (
    'application_active',
    'collection_affichee',
    'objet_consulte',
    'founder_pack_affiche',
    'founder_pack_achat_demarre',
    'founder_pack_restauration_demandee',
    'founder_pack_achat_annule',
    'onboarding_commence',
    'onboarding_termine',
    'match_consulte',
    'call_commence',
    'call_verrouille',
    'resultat_consulte',
    'rank_consulte',
    'profil_public_consulte',
    'achat_commence',
    'notification_ouverte'
  ) then
    raise exception 'evenement client interdit' using errcode = '22023';
  end if;

  if v_type = 'objet_consulte' and v_objet_id is null then
    raise exception 'objet requis' using errcode = '22023';
  end if;
  if v_type <> 'objet_consulte' and v_objet_id is not null then
    raise exception 'objet analytics inattendu' using errcode = '22023';
  end if;
  if v_type not in ('collection_affichee', 'objet_consulte') and v_campagne_key is not null then
    raise exception 'campagne analytics inattendue' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from private.preferences_confidentialite c
    where c.user_id = v_user and c.analytics_autorise
  ) then
    return jsonb_build_object(
      'accepte', false,
      'nouveau', false,
      'type', v_type,
      'raison', 'consentement_requis',
      'portee', 'first_party_aggregate_only'
    );
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

create or replace function public.clutch_contrat_analytics_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 4,
    'stockage_brut', 'private.analytics_evenements',
    'retention_brute_mois', 13,
    'retention_brute', '13 months maximum',
    'purge_automatique', true,
    'consentement_requis', true,
    'age_minimum', 15,
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
      'recompense_reclamee',
      'founder_pack_affiche',
      'founder_pack_achat_demarre',
      'founder_pack_restauration_demandee',
      'founder_pack_achat_annule',
      'founder_pack_attribue',
      'founder_pack_revoque',
      'onboarding_commence',
      'onboarding_termine',
      'match_consulte',
      'call_commence',
      'call_verrouille',
      'resultat_consulte',
      'frags_gagnes',
      'rank_consulte',
      'profil_public_consulte',
      'mission_commencee',
      'mission_terminee',
      'achat_commence',
      'achat_termine',
      'notification_ouverte'
    ),
    'evenements_coeur', jsonb_build_array(
      'onboarding_commence',
      'onboarding_termine',
      'match_consulte',
      'call_commence',
      'call_verrouille',
      'resultat_consulte',
      'frags_gagnes',
      'rank_consulte'
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
  )
$$;

revoke all privileges on function public.clutch_contrat_analytics_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_analytics_v1()
to anon, authenticated, service_role;

create or replace function private.clutch_analytics_frags_gagnes_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'gagne'
     and old.statut is distinct from new.statut
     and coalesce(new.delta_frags, 0) > 0
  then
    perform private.clutch_journaliser_evenement_analytics_v1(
      new.user_id,
      'frags_gagnes',
      null,
      null,
      null,
      'serveur',
      'verdict:' || new.id::text
    );
  end if;
  return new;
end;
$$;

revoke all privileges on function private.clutch_analytics_frags_gagnes_v1()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_analytics_frags_gagnes_v1 on public.pronostics_classes;
create trigger clutch_analytics_frags_gagnes_v1
after update of statut, delta_frags on public.pronostics_classes
for each row execute function private.clutch_analytics_frags_gagnes_v1();

create or replace function private.clutch_analytics_achat_cosmetique_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origine = 'achat' and new.montant < 0 then
    perform private.clutch_journaliser_evenement_analytics_v1(
      new.user_id,
      'achat_termine',
      null,
      null,
      null,
      'serveur',
      'purchase:' || new.id::text
    );
  end if;
  return new;
end;
$$;

revoke all privileges on function private.clutch_analytics_achat_cosmetique_v1()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_analytics_achat_cosmetique_v1 on public.volts_mouvements;
create trigger clutch_analytics_achat_cosmetique_v1
after insert on public.volts_mouvements
for each row execute function private.clutch_analytics_achat_cosmetique_v1();

-- ---------------------------------------------------------------------------
-- Rank: orchestration only; the canonical Frags and grade rules stay intact.
-- ---------------------------------------------------------------------------

create or replace function public.clutch_classement_rank_v1(
  p_saison_id text,
  p_portee text default 'global'
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
  moi boolean,
  grade jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_portee text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_portee, 'global')));
  v_equipe text;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_portee not in ('global', 'cercle', 'faction') then
    raise exception 'portee de classement invalide' using errcode = '22023';
  end if;

  select p.equipe_favorite_id into v_equipe
  from public.profils p
  where p.id = v_user;

  return query
  with source as (
    select
      c.user_id,
      p.pseudo,
      c.frags,
      c.pic_frags,
      c.pronostics_regles,
      c.pronostics_gagnes,
      c.maj_le,
      c.pronostics_regles < public.clutch_frags_nb_placements() as provisoire
    from public.classements_frags c
    join public.profils p on p.id = c.user_id
    where c.saison_id = p_saison_id
      and not private.clutch_utilisateurs_bloques_v1(v_user, c.user_id)
      and (
        v_portee = 'global'
        or (
          v_portee = 'faction'
          and v_equipe is not null
          and p.equipe_favorite_id = v_equipe
        )
        or (
          v_portee = 'cercle'
          and (
            c.user_id = v_user
            or exists (
              select 1
              from public.amities a
              where a.statut = 'acceptee'
                and a.a = least(v_user, c.user_id)
                and a.b = greatest(v_user, c.user_id)
            )
          )
        )
      )
  ), classes as (
    select
      s.user_id,
      row_number() over (
        order by s.frags desc, s.pronostics_gagnes desc, s.maj_le asc, s.user_id asc
      ) as rang
    from source s
    where not s.provisoire
  )
  select
    c.rang,
    s.user_id,
    s.pseudo,
    s.frags,
    s.pic_frags,
    s.pronostics_regles,
    s.pronostics_gagnes,
    case when s.pronostics_regles = 0 then 0::numeric
         else pg_catalog.round(s.pronostics_gagnes::numeric / s.pronostics_regles * 100, 1) end,
    s.provisoire,
    s.user_id = v_user,
    public.clutch_grade_frags_v1(s.frags, s.pronostics_regles)
  from source s
  left join classes c on c.user_id = s.user_id
  order by s.provisoire asc, c.rang nulls last, s.frags desc, s.user_id asc
  limit 100;
end;
$$;

create or replace function public.clutch_rank_dashboard_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_saison public.saisons%rowtype;
  v_etat jsonb;
  v_global jsonb := '[]'::jsonb;
  v_cercle jsonb := '[]'::jsonb;
  v_faction jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select * into v_saison
  from public.saisons s
  order by (s.debut <= pg_catalog.now() and s.fin > pg_catalog.now()) desc, s.debut desc
  limit 1;

  if v_saison.id is null then
    return jsonb_build_object(
      'saison', null,
      'etat', null,
      'classements', jsonb_build_object('global', v_global, 'cercle', v_cercle, 'faction', v_faction),
      'recompense', jsonb_build_object('statut', 'intersaison')
    );
  end if;

  v_etat := public.clutch_etat_frags(v_saison.id);

  select coalesce(jsonb_agg(to_jsonb(r) order by r.provisoire, r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_global from public.clutch_classement_rank_v1(v_saison.id, 'global') r;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.provisoire, r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_cercle from public.clutch_classement_rank_v1(v_saison.id, 'cercle') r;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.provisoire, r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_faction from public.clutch_classement_rank_v1(v_saison.id, 'faction') r;

  return jsonb_build_object(
    'saison', jsonb_build_object(
      'id', v_saison.id,
      'nom', v_saison.nom,
      'debut', v_saison.debut,
      'fin', v_saison.fin
    ),
    'etat', v_etat,
    'classements', jsonb_build_object(
      'global', v_global,
      'cercle', v_cercle,
      'faction', v_faction
    ),
    'recompense', jsonb_build_object(
      'statut', 'a_annoncer',
      'titre', 'Récompense de fin de saison',
      'detail', 'La récompense cosmétique sera révélée avant la clôture. Aucun objet n’est encore attribué.'
    )
  );
end;
$$;

revoke all privileges on function public.clutch_classement_rank_v1(text, text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_rank_dashboard_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_classement_rank_v1(text, text)
to authenticated, service_role;
grant execute on function public.clutch_rank_dashboard_v1()
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Daily collective faction mission and Hub complements
-- ---------------------------------------------------------------------------

create table if not exists private.missions_faction (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  saison_id text not null references public.saisons(id) on update cascade on delete cascade,
  equipe_id text not null references public.equipes(id) on update cascade on delete cascade,
  titre text not null,
  objectif integer not null check (objectif > 0),
  debut timestamptz not null,
  fin timestamptz not null,
  terminee_le timestamptz,
  cree_le timestamptz not null default pg_catalog.now(),
  constraint missions_faction_fenetre_check check (fin > debut),
  constraint missions_faction_cle_check check (cle ~ '^[A-Za-z0-9:._-]{3,160}$')
);

create table if not exists private.missions_faction_contributions (
  mission_id uuid not null references private.missions_faction(id) on delete cascade,
  user_id uuid not null references public.profils(id) on delete cascade,
  pronostic_id uuid not null references public.pronostics_classes(id) on delete cascade,
  valeur integer not null default 1 check (valeur = 1),
  cree_le timestamptz not null default pg_catalog.now(),
  primary key (mission_id, pronostic_id),
  unique (pronostic_id)
);

create index if not exists missions_faction_equipe_fenetre_idx
  on private.missions_faction (equipe_id, debut desc, fin desc);
create index if not exists missions_faction_saison_idx
  on private.missions_faction (saison_id);
create index if not exists missions_faction_contributions_user_idx
  on private.missions_faction_contributions (user_id, cree_le desc);

alter table private.missions_faction enable row level security;
alter table private.missions_faction_contributions enable row level security;
revoke all privileges on table private.missions_faction
from public, anon, authenticated, service_role;
revoke all privileges on table private.missions_faction_contributions
from public, anon, authenticated, service_role;

create or replace function private.clutch_assurer_mission_faction_v1(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_equipe text;
  v_saison text;
  v_debut timestamptz;
  v_fin timestamptz;
  v_mission uuid;
  v_cle text;
  v_progression integer := 0;
begin
  select p.equipe_favorite_id into v_equipe
  from public.profils p
  where p.id = p_user;
  if v_equipe is null then return null; end if;

  select s.id into v_saison
  from public.saisons s
  where s.debut <= pg_catalog.now() and s.fin > pg_catalog.now()
  order by s.debut desc
  limit 1;
  if v_saison is null then return null; end if;

  v_debut := pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  v_fin := v_debut + interval '1 day';
  v_cle := v_saison || ':' || v_equipe || ':' || pg_catalog.to_char(v_debut at time zone 'Europe/Paris', 'YYYY-MM-DD');

  insert into private.missions_faction (
    cle,
    saison_id,
    equipe_id,
    titre,
    objectif,
    debut,
    fin
  ) values (
    v_cle,
    v_saison,
    v_equipe,
    'Verrouiller 12 calls en faction',
    12,
    v_debut,
    v_fin
  )
  on conflict (cle) do update set cle = excluded.cle
  returning id into v_mission;

  insert into private.missions_faction_contributions (
    mission_id,
    user_id,
    pronostic_id,
    cree_le
  )
  select
    v_mission,
    pc.user_id,
    pc.id,
    pc.cree_le
  from public.pronostics_classes pc
  join public.profils p on p.id = pc.user_id
  where pc.saison_id = v_saison
    and p.equipe_favorite_id = v_equipe
    and pc.cree_le >= v_debut
    and pc.cree_le < v_fin
  on conflict do nothing;

  select count(*)::integer into v_progression
  from private.missions_faction_contributions c
  where c.mission_id = v_mission;

  if v_progression >= 12 then
    update private.missions_faction m
    set terminee_le = coalesce(m.terminee_le, pg_catalog.now())
    where m.id = v_mission;
  end if;

  return v_mission;
end;
$$;

revoke all privileges on function private.clutch_assurer_mission_faction_v1(uuid)
from public, anon, authenticated, service_role;

create or replace function private.clutch_mission_faction_pronostic_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission uuid;
  v_objectif integer;
  v_progression integer;
  v_participant record;
begin
  v_mission := private.clutch_assurer_mission_faction_v1(new.user_id);
  if v_mission is null then return new; end if;

  perform private.clutch_journaliser_evenement_analytics_v1(
    new.user_id,
    'mission_commencee',
    null,
    null,
    null,
    'serveur',
    'faction-mission-start:' || v_mission::text
  );

  select m.objectif, count(c.pronostic_id)::integer
  into v_objectif, v_progression
  from private.missions_faction m
  left join private.missions_faction_contributions c on c.mission_id = m.id
  where m.id = v_mission
  group by m.objectif;

  if v_progression >= v_objectif then
    for v_participant in
      select distinct c.user_id
      from private.missions_faction_contributions c
      where c.mission_id = v_mission
    loop
      perform private.clutch_journaliser_evenement_analytics_v1(
        v_participant.user_id,
        'mission_terminee',
        null,
        null,
        null,
        'serveur',
        'faction-mission-complete:' || v_mission::text
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_mission_faction_pronostic_v1()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_mission_faction_pronostic_v1 on public.pronostics_classes;
create trigger clutch_mission_faction_pronostic_v1
after insert on public.pronostics_classes
for each row execute function private.clutch_mission_faction_pronostic_v1();

create or replace function public.clutch_mission_faction_active_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_mission uuid;
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  v_mission := private.clutch_assurer_mission_faction_v1(v_user);
  if v_mission is null then return null; end if;

  select jsonb_build_object(
    'id', m.id,
    'titre', m.titre,
    'objectif', m.objectif,
    'progression', count(c.pronostic_id),
    'contribution_personnelle', count(c.pronostic_id) filter (where c.user_id = v_user),
    'debut', m.debut,
    'fin', m.fin,
    'terminee', m.terminee_le is not null,
    'equipe', jsonb_build_object('id', e.id, 'nom', e.nom, 'tag', e.tag, 'logo', e.logo),
    'participants', count(distinct c.user_id)
  ) into v_result
  from private.missions_faction m
  join public.equipes e on e.id = m.equipe_id
  left join private.missions_faction_contributions c on c.mission_id = m.id
  where m.id = v_mission
  group by m.id, e.id, e.nom, e.tag, e.logo;

  return v_result;
end;
$$;

create or replace function public.clutch_hub_complements_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_resultat jsonb;
  v_recompense jsonb;
  v_mission jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select to_jsonb(r) into v_resultat
  from (
    select
      p.id,
      p.match_id,
      p.statut,
      p.choix,
      p.delta_frags,
      p.regle_le,
      m.jeu,
      m.evenement,
      m.equipe_a,
      m.tag_a,
      m.equipe_b,
      m.tag_b,
      m.score_a,
      m.score_b
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = v_user
      and p.statut in ('gagne', 'perdu')
    order by p.regle_le desc nulls last, p.cree_le desc
    limit 1
  ) r;

  select jsonb_build_object(
    'id', o.id,
    'nom', o.nom,
    'famille', o.famille,
    'emplacement', o.emplacement,
    'rarete', o.rarete,
    'style_key', o.style_key,
    'accent', o.accent,
    'source', o.source,
    'acquis_le', i.acquis_le
  ) into v_recompense
  from public.inventaire i
  join public.objets_catalogue o on o.id = i.objet_id
  where i.user_id = v_user
    and not o.est_inclus
    and o.source in ('mission', 'partenaire', 'founder_pack', 'gratuit')
  order by i.acquis_le desc, o.id
  limit 1;

  v_mission := public.clutch_mission_faction_active_v1();

  return jsonb_build_object(
    'resultat_recent', v_resultat,
    'mission_faction', v_mission,
    'derniere_recompense', v_recompense
  );
end;
$$;

revoke all privileges on function public.clutch_mission_faction_active_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_hub_complements_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_mission_faction_active_v1()
to authenticated, service_role;
grant execute on function public.clutch_hub_complements_v1()
to authenticated, service_role;

-- Explicitly document why the volatile APIs are SECURITY DEFINER: they derive
-- the owner from auth.uid(), hide private ledgers and return only that user's
-- privacy choices, safety state, Rank scopes and Hub data.
comment on function public.clutch_enregistrer_preferences_confidentialite_v1(boolean, boolean) is
  'Authenticated self-service privacy preferences. The minimum-age declaration is 15+ and no birth date is stored.';
comment on function public.clutch_bloquer_utilisateur_v1(text) is
  'Authenticated block primitive. It resolves the target server-side, removes friendship and cancels pending direct duels.';
comment on function public.clutch_signaler_utilisateur_v1(text, text, text) is
  'Authenticated moderation intake with an allowlisted reason and a 500-character optional detail.';
comment on function public.clutch_rank_dashboard_v1() is
  'Authenticated Rank orchestration over the unchanged canonical Frags, grade and placement functions.';
comment on function public.clutch_hub_complements_v1() is
  'Authenticated Hub complement returning the latest verdict, real collective faction mission and latest earned cosmetic.';
;
