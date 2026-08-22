-- Monetization phase 5.1: a single, non-consumable Founder Pack used to
-- validate demand for visual identity before any Volt packs are considered.
--
-- Store receipts are validated by RevenueCat in Edge Functions. This migration
-- only accepts normalized results through a service-role-only RPC, keeps the
-- operation idempotent, and never exposes the purchase ledger through Data API.

create schema if not exists private;
revoke all on schema private from public;

-- Existing founder accounts predate the paid pack. Keep that origin separate
-- so a later store refund never removes a historical founder badge.
create table if not exists private.fondateurs_heritage (
  user_id uuid primary key references public.profils(id) on delete cascade,
  enregistre_le timestamptz not null default pg_catalog.now()
);

insert into private.fondateurs_heritage (user_id)
select p.id
from public.profils p
where p.est_fondateur
on conflict (user_id) do nothing;

create table if not exists private.achats_founder_pack (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profils(id) on delete cascade,
  fournisseur text not null default 'revenuecat',
  produit_id text not null,
  droit_id text not null,
  store text not null,
  environnement text not null,
  transaction_id text not null,
  transaction_originale_id text not null,
  statut text not null,
  achete_le timestamptz not null,
  statut_maj_le timestamptz not null default pg_catalog.now(),
  constraint achats_founder_pack_fournisseur_check
    check (fournisseur = 'revenuecat'),
  constraint achats_founder_pack_produit_check
    check (produit_id = 'clutch_founder_pack_v1'),
  constraint achats_founder_pack_droit_check
    check (droit_id = 'founder_pack'),
  constraint achats_founder_pack_store_check
    check (store in ('app_store', 'play_store', 'test_store')),
  constraint achats_founder_pack_environnement_check
    check (environnement in ('sandbox', 'production')),
  constraint achats_founder_pack_statut_check
    check (statut in ('active', 'refunded', 'revoked', 'transferred')),
  constraint achats_founder_pack_transaction_check
    check (
      transaction_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'
      and transaction_originale_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'
    ),
  constraint achats_founder_pack_transaction_uidx
    unique (fournisseur, store, transaction_id)
);

create unique index if not exists achats_founder_pack_actif_user_uidx
  on private.achats_founder_pack (user_id, produit_id)
  where statut = 'active';

create index if not exists achats_founder_pack_user_idx
  on private.achats_founder_pack (user_id, statut_maj_le desc);

create index if not exists achats_founder_pack_originale_idx
  on private.achats_founder_pack (fournisseur, store, transaction_originale_id);

create table if not exists private.evenements_founder_pack (
  id bigint generated always as identity primary key,
  fournisseur text not null default 'revenuecat',
  evenement_id text not null,
  user_id uuid not null references public.profils(id) on delete cascade,
  type_evenement text not null,
  source_evenement text not null,
  produit_id text not null,
  transaction_id text,
  droit_actif boolean not null,
  traite_le timestamptz not null default pg_catalog.now(),
  constraint evenements_founder_pack_fournisseur_check
    check (fournisseur = 'revenuecat'),
  constraint evenements_founder_pack_id_check
    check (evenement_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'),
  constraint evenements_founder_pack_type_check
    check (type_evenement ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint evenements_founder_pack_source_check
    check (source_evenement in ('sync', 'webhook')),
  constraint evenements_founder_pack_produit_check
    check (produit_id = 'clutch_founder_pack_v1'),
  constraint evenements_founder_pack_transaction_check
    check (
      transaction_id is null
      or transaction_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'
    ),
  constraint evenements_founder_pack_evenement_uidx
    unique (fournisseur, evenement_id)
);

create index if not exists evenements_founder_pack_user_idx
  on private.evenements_founder_pack (user_id, traite_le desc);

alter table private.fondateurs_heritage enable row level security;
alter table private.achats_founder_pack enable row level security;
alter table private.evenements_founder_pack enable row level security;

revoke all privileges on table private.fondateurs_heritage
from public, anon, authenticated, service_role;
revoke all privileges on table private.achats_founder_pack
from public, anon, authenticated, service_role;
revoke all privileges on table private.evenements_founder_pack
from public, anon, authenticated, service_role;

comment on table private.achats_founder_pack is
  'Private normalized store-purchase ledger. Only server-validated RevenueCat state may mutate it.';
comment on table private.evenements_founder_pack is
  'Private idempotency ledger. It stores normalized lifecycle fields, never raw webhook payloads or customer attributes.';

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
  collection_key,
  source,
  statut_publication,
  licence,
  est_inclus
) values
  (
    'founder-frame-v1',
    'cadre_profil',
    4,
    'Cadre Pionnier',
    0,
    true,
    'Un cadre graphite fendu par le premier signal Volt.',
    'legendaire',
    'founder-frame',
    '#FFCB45',
    'cadre_avatar',
    'founder-origin',
    'founder_pack',
    'publie',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb,
    false
  ),
  (
    'founder-title-v1',
    'titre_profil',
    4,
    'Fondateur Clutch',
    0,
    true,
    'Le titre permanent de celles et ceux qui ont lancé l’Arena.',
    'legendaire',
    'founder-title',
    '#FFCB45',
    'titre_supporter',
    'founder-origin',
    'founder_pack',
    'publie',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb,
    false
  ),
  (
    'founder-relic-v1',
    'effet_faction',
    4,
    'Relique Originelle',
    0,
    true,
    'Une signature ambrée née avant la première Guerre des factions.',
    'legendaire',
    'founder-relic',
    '#FFCB45',
    'signature_relique',
    'founder-origin',
    'founder_pack',
    'publie',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb,
    false
  ),
  (
    'founder-banner-v1',
    'carte_profil',
    4,
    'Bannière Première Vague',
    0,
    true,
    'Une carte noire et or réservée aux premiers supporters.',
    'legendaire',
    'founder-banner',
    '#FFCB45',
    'banniere',
    'founder-origin',
    'founder_pack',
    'publie',
    '{"type":"interne","titulaire":"Clutch"}'::jsonb,
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
    collection_key = excluded.collection_key,
    source = excluded.source,
    statut_publication = excluded.statut_publication,
    licence = excluded.licence,
    est_inclus = excluded.est_inclus;

create or replace function public.clutch_contrat_monetisation_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
    'code', 'identity_founder_v2',
    'promesse', 'L’identité du supporter. Jamais ses performances.',
    'devises', jsonb_build_object(
      'frags', jsonb_build_object(
        'usage', 'classement_competitif',
        'achetables', false,
        'depensables', false,
        'convertibles_depuis_volts', false
      ),
      'volts', jsonb_build_object(
        'usage', 'cosmetiques_uniquement',
        'achat_reel_actif', false,
        'expiration', false,
        'conversion_frags', false
      )
    ),
    'catalogue', jsonb_build_object(
      'schema_version', 2,
      'emplacements', jsonb_build_array(
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil'
      ),
      'familles_initiales', jsonb_build_array(
        'cadre_avatar',
        'banniere',
        'titre_supporter',
        'signature_relique'
      ),
      'extensions', jsonb_build_array('core_clutch'),
      'familles_par_emplacement', jsonb_build_object(
        'cadre_profil', 'cadre_avatar',
        'carte_profil', 'banniere',
        'titre_profil', 'titre_supporter',
        'effet_faction', 'signature_relique',
        'apparence_core', 'core_clutch'
      ),
      'sources', jsonb_build_array(
        'gratuit',
        'mission',
        'partenaire',
        'achat',
        'founder_pack'
      ),
      'objets_aleatoires_payants', false,
      'objets_possedes_expirent', false,
      'effets_competitifs', false,
      'achat_idempotent', true
    ),
    'partenaires', jsonb_build_object(
      'recompense', 'participation_uniquement',
      'justesse_pronostic_recompensee', false,
      'donnees_personnelles_exposees', false
    ),
    'paiements', jsonb_build_object(
      'actifs', true,
      'biens_numeriques_via_stores', true,
      'validateur', 'revenuecat',
      'founder_pack', jsonb_build_object(
        'actif', true,
        'type', 'non_consumable',
        'produit_id', 'clutch_founder_pack_v1',
        'droit_id', 'founder_pack',
        'offre_id', 'founder_launch',
        'prix_cible_eur', 4.99,
        'prix_affiche_depuis_store', true,
        'restauration', true,
        'remboursements', true,
        'volts_inclus', 0
      ),
      'packs_volts_actifs', false
    ),
    'regles', jsonb_build_array(
      jsonb_build_object(
        'id', 'competitive-integrity',
        'label', 'FRAGS INACHETABLES',
        'detail', 'Le rating, le rang et les résultats de Calls ne s’achètent jamais.'
      ),
      jsonb_build_object(
        'id', 'cosmetics-only',
        'label', 'IDENTITÉ UNIQUEMENT',
        'detail', 'Le Founder Pack ne débloque que quatre éléments visuels connus à l’avance.'
      ),
      jsonb_build_object(
        'id', 'no-randomness',
        'label', 'AUCUNE LOOT BOX',
        'detail', 'Chaque objet obtenu est connu avant la dépense.'
      ),
      jsonb_build_object(
        'id', 'permanent-ownership',
        'label', 'ACHAT UNIQUE',
        'detail', 'Un achat valide est permanent, restaurable et ne se renouvelle pas.'
      ),
      jsonb_build_object(
        'id', 'partner-participation',
        'label', 'PARTICIPATION, PAS JUSTESSE',
        'detail', 'Une activation partenaire récompense une action, jamais un bon pronostic.'
      )
    )
  );
$$;

revoke all privileges on function public.clutch_contrat_monetisation_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_monetisation_v1()
to anon, authenticated, service_role;

-- Trusted store-state reducer. The caller cannot be a mobile user; the Edge
-- Function first verifies the user/store with RevenueCat, then invokes this RPC
-- with service_role. All mutations happen in one short database transaction.
create or replace function public.clutch_appliquer_statut_founder_pack_v1(
  p_user uuid,
  p_evenement_id text,
  p_type_evenement text,
  p_actif boolean,
  p_transaction_id text,
  p_transaction_originale_id text,
  p_store text,
  p_environnement text,
  p_achete_le timestamptz,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id text := btrim(coalesce(p_evenement_id, ''));
  v_event_type text := upper(btrim(coalesce(p_type_evenement, 'SYNC')));
  v_transaction text := nullif(btrim(coalesce(p_transaction_id, '')), '');
  v_original_transaction text := nullif(
    btrim(coalesce(p_transaction_originale_id, p_transaction_id, '')),
    ''
  );
  v_store text := lower(btrim(coalesce(p_store, '')));
  v_environment text := lower(btrim(coalesce(p_environnement, '')));
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_status text;
  v_event_rows integer := 0;
  v_pack_active boolean;
begin
  if p_user is null or not exists (
    select 1 from public.profils p where p.id = p_user
  ) then
    raise exception 'profil Founder Pack invalide' using errcode = 'P0002';
  end if;

  if v_event_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'
     or v_event_type !~ '^[A-Z][A-Z0-9_]{1,63}$'
     or v_source not in ('sync', 'webhook')
  then
    raise exception 'evenement Founder Pack invalide' using errcode = '22023';
  end if;

  if p_actif and (
    v_transaction is null
    or v_original_transaction is null
    or v_store not in ('app_store', 'play_store', 'test_store')
    or v_environment not in ('sandbox', 'production')
    or p_achete_le is null
  ) then
    raise exception 'preuve d achat Founder Pack incomplete' using errcode = '22023';
  end if;

  if not p_actif then
    v_store := case
      when v_store in ('app_store', 'play_store', 'test_store') then v_store
      else 'test_store'
    end;
    v_environment := case
      when v_environment in ('sandbox', 'production') then v_environment
      else 'sandbox'
    end;
  end if;

  -- Phase 5 is deliberately low volume. One short global reducer lock avoids
  -- races during refunds/transfers without holding a lock during store I/O.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-founder-pack-v1', 0)
  );

  -- Check idempotency only after acquiring the lock. Two simultaneous webhook
  -- retries can therefore never execute the reducer body twice.
  if exists (
    select 1
    from private.evenements_founder_pack e
    where e.fournisseur = 'revenuecat'
      and e.evenement_id = v_event_id
  ) then
    return public.clutch_statut_founder_pack_v1(p_user);
  end if;

  if p_actif then
    update private.achats_founder_pack a
    set statut = 'revoked',
        statut_maj_le = pg_catalog.now()
    where a.user_id = p_user
      and a.produit_id = 'clutch_founder_pack_v1'
      and a.statut = 'active'
      and (a.store, a.transaction_id) <> (v_store, v_transaction);

    insert into private.achats_founder_pack (
      user_id,
      fournisseur,
      produit_id,
      droit_id,
      store,
      environnement,
      transaction_id,
      transaction_originale_id,
      statut,
      achete_le,
      statut_maj_le
    ) values (
      p_user,
      'revenuecat',
      'clutch_founder_pack_v1',
      'founder_pack',
      v_store,
      v_environment,
      v_transaction,
      v_original_transaction,
      'active',
      p_achete_le,
      pg_catalog.now()
    )
    on conflict (fournisseur, store, transaction_id) do update
    set user_id = excluded.user_id,
        produit_id = excluded.produit_id,
        droit_id = excluded.droit_id,
        environnement = excluded.environnement,
        transaction_originale_id = excluded.transaction_originale_id,
        statut = 'active',
        achete_le = excluded.achete_le,
        statut_maj_le = pg_catalog.now();

    insert into public.inventaire (user_id, objet_id)
    select p_user, o.id
    from public.objets_catalogue o
    where o.source = 'founder_pack'
      and o.collection_key = 'founder-origin'
      and o.statut_publication = 'publie'
    on conflict (user_id, objet_id) do nothing;

    update public.profils
    set est_fondateur = true
    where id = p_user;

    v_status := 'active';
  else
    v_status := case
      when v_event_type = 'CANCELLATION' then 'refunded'
      when v_event_type = 'TRANSFER' then 'transferred'
      else 'revoked'
    end;

    update private.achats_founder_pack a
    set statut = v_status,
        statut_maj_le = pg_catalog.now()
    where a.user_id = p_user
      and a.produit_id = 'clutch_founder_pack_v1'
      and a.statut = 'active'
      and (v_transaction is null or a.transaction_id = v_transaction);

    select exists (
      select 1
      from private.achats_founder_pack a
      where a.user_id = p_user
        and a.produit_id = 'clutch_founder_pack_v1'
        and a.statut = 'active'
    ) into v_pack_active;

    if not v_pack_active then
      delete from public.equipement e
      using public.objets_catalogue o
      where e.user_id = p_user
        and e.objet_id = o.id
        and o.source = 'founder_pack'
        and o.collection_key = 'founder-origin';

      delete from public.inventaire i
      using public.objets_catalogue o
      where i.user_id = p_user
        and i.objet_id = o.id
        and o.source = 'founder_pack'
        and o.collection_key = 'founder-origin';

      update public.profils p
      set est_fondateur = exists (
        select 1
        from private.fondateurs_heritage h
        where h.user_id = p.id
      )
      where p.id = p_user;
    end if;
  end if;

  insert into private.evenements_founder_pack (
    fournisseur,
    evenement_id,
    user_id,
    type_evenement,
    source_evenement,
    produit_id,
    transaction_id,
    droit_actif
  ) values (
    'revenuecat',
    v_event_id,
    p_user,
    v_event_type,
    v_source,
    'clutch_founder_pack_v1',
    v_transaction,
    p_actif
  )
  on conflict (fournisseur, evenement_id) do nothing;

  get diagnostics v_event_rows = row_count;

  if v_event_rows = 1 and (p_actif or v_transaction is not null) then
    perform private.clutch_journaliser_evenement_analytics_v1(
      p_user,
      case when p_actif then 'founder_pack_attribue' else 'founder_pack_revoque' end,
      null,
      null,
      null,
      'serveur',
      'founder-pack:' || v_event_id
    );
  end if;

  return public.clutch_statut_founder_pack_v1(p_user);
end;
$$;

-- Authenticated read model. Passing p_user is reserved for the trusted reducer;
-- regular clients always receive auth.uid() and cannot inspect another account.
create or replace function public.clutch_statut_founder_pack_v1(
  p_user uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_auth_user uuid := auth.uid();
  v_user uuid := coalesce(p_user, v_auth_user);
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
  v_purchase private.achats_founder_pack%rowtype;
  v_items jsonb;
  v_legacy boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if p_user is not null and not v_is_service and p_user is distinct from v_auth_user then
    raise exception 'lecture Founder Pack interdite' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  select a.*
  into v_purchase
  from private.achats_founder_pack a
  where a.user_id = v_user
    and a.produit_id = 'clutch_founder_pack_v1'
  order by (a.statut = 'active') desc, a.statut_maj_le desc
  limit 1;

  select exists (
    select 1 from private.fondateurs_heritage h where h.user_id = v_user
  ) into v_legacy;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'emplacement', o.emplacement,
        'nom', o.nom,
        'description', o.description,
        'style_key', o.style_key,
        'accent', o.accent,
        'possede', i.objet_id is not null,
        'equipe', e.objet_id = o.id
      )
      order by array_position(
        array['cadre_profil', 'titre_profil', 'effet_faction', 'carte_profil'],
        o.emplacement
      )
    ),
    '[]'::jsonb
  )
  into v_items
  from public.objets_catalogue o
  left join public.inventaire i
    on i.user_id = v_user
   and i.objet_id = o.id
  left join public.equipement e
    on e.user_id = v_user
   and e.emplacement = o.emplacement
  where o.source = 'founder_pack'
    and o.collection_key = 'founder-origin';

  return jsonb_build_object(
    'version', 1,
    'produit_id', 'clutch_founder_pack_v1',
    'droit_id', 'founder_pack',
    'offre_id', 'founder_launch',
    'type', 'non_consumable',
    'prix_indicatif', '4,99 €',
    'prix_store_requis', true,
    'volts_inclus', 0,
    'pack_actif', coalesce(v_purchase.statut = 'active', false),
    'fondateur_heritage', v_legacy,
    'est_fondateur', v_legacy or coalesce(v_purchase.statut = 'active', false),
    'statut', coalesce(v_purchase.statut, case when v_legacy then 'legacy' else 'available' end),
    'store', v_purchase.store,
    'environnement', v_purchase.environnement,
    'achete_le', v_purchase.achete_le,
    'restaurable', true,
    'objets', v_items
  );
end;
$$;

comment on function public.clutch_appliquer_statut_founder_pack_v1(
  uuid, text, text, boolean, text, text, text, text, timestamptz, text
) is
  'Service-role-only reducer for RevenueCat-validated Founder Pack state. It is idempotent and handles grant, restore, refund and transfer reconciliation.';
comment on function public.clutch_statut_founder_pack_v1(uuid) is
  'Owner-only Founder Pack read model. Service role may pass a user UUID for reconciliation.';

revoke all privileges on function public.clutch_appliquer_statut_founder_pack_v1(
  uuid, text, text, boolean, text, text, text, text, timestamptz, text
) from public, anon, authenticated, service_role;
grant execute on function public.clutch_appliquer_statut_founder_pack_v1(
  uuid, text, text, boolean, text, text, text, text, timestamptz, text
) to service_role;

revoke all privileges on function public.clutch_statut_founder_pack_v1(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_statut_founder_pack_v1(uuid)
to authenticated, service_role;

-- Extend the privacy-first analytics allowlist with the minimum funnel needed
-- to decide whether the Founder Pack validates demand. No price, receipt,
-- device, free-form metadata or provider payload is stored in analytics.
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
      'founder_pack_revoque'
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
      'founder_pack_achat_annule'
    )
  ) not valid,
  add constraint analytics_evenements_contexte_check check (
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
      when 'founder_pack_affiche' then objet_id is null and campagne_key is null and tache_key is null
      when 'founder_pack_achat_demarre' then objet_id is null and campagne_key is null and tache_key is null
      when 'founder_pack_restauration_demandee' then objet_id is null and campagne_key is null and tache_key is null
      when 'founder_pack_achat_annule' then objet_id is null and campagne_key is null and tache_key is null
      when 'founder_pack_attribue' then objet_id is null and campagne_key is null and tache_key is null
      when 'founder_pack_revoque' then objet_id is null and campagne_key is null and tache_key is null
      else false
    end
  ) not valid;

alter table private.analytics_evenements
  validate constraint analytics_evenements_type_check;
alter table private.analytics_evenements
  validate constraint analytics_evenements_client_check;
alter table private.analytics_evenements
  validate constraint analytics_evenements_contexte_check;

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

  if v_type not in (
    'application_active',
    'collection_affichee',
    'objet_consulte',
    'founder_pack_affiche',
    'founder_pack_achat_demarre',
    'founder_pack_restauration_demandee',
    'founder_pack_achat_annule'
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

comment on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) is
  'Authenticated allowlisted product analytics API. Founder Pack funnel events carry no receipt, price, provider payload, device identifier or free-form metadata.';

create or replace function public.clutch_contrat_analytics_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
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
      'recompense_reclamee',
      'founder_pack_affiche',
      'founder_pack_achat_demarre',
      'founder_pack_restauration_demandee',
      'founder_pack_achat_annule',
      'founder_pack_attribue',
      'founder_pack_revoque'
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

revoke all privileges on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.clutch_enregistrer_evenement_analytics_v1(
  text, text, text, text
) to authenticated, service_role;

revoke all privileges on function public.clutch_contrat_analytics_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_analytics_v1()
to anon, authenticated, service_role;

create or replace function public.clutch_rapport_founder_pack_v1(
  p_depuis timestamptz default pg_catalog.now() - interval '30 days'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with funnel as (
    select
      count(distinct a.user_id) filter (
        where a.type_evenement = 'founder_pack_affiche'
      )::integer as vues,
      count(distinct a.user_id) filter (
        where a.type_evenement = 'founder_pack_achat_demarre'
      )::integer as intentions,
      count(distinct a.user_id) filter (
        where a.type_evenement = 'founder_pack_restauration_demandee'
      )::integer as restaurations,
      count(distinct a.user_id) filter (
        where a.type_evenement = 'founder_pack_achat_annule'
      )::integer as annulations
    from private.analytics_evenements a
    where a.cree_le >= p_depuis
  ), purchases as (
    select
      count(distinct a.user_id) filter (where a.statut = 'active')::integer as actifs,
      count(distinct a.user_id) filter (where a.statut = 'refunded')::integer as rembourses
    from private.achats_founder_pack a
    where a.statut_maj_le >= p_depuis
  )
  select jsonb_build_object(
    'depuis', p_depuis,
    'vues_uniques', funnel.vues,
    'intentions_uniques', funnel.intentions,
    'restaurations_uniques', funnel.restaurations,
    'annulations_uniques', funnel.annulations,
    'packs_actifs', purchases.actifs,
    'packs_rembourses', purchases.rembourses,
    'conversion_vue_achat', case
      when funnel.vues = 0 then 0
      else round(purchases.actifs::numeric / funnel.vues::numeric, 4)
    end,
    'donnees_individuelles_exposees', false
  )
  from funnel cross join purchases;
$$;

revoke all privileges on function public.clutch_rapport_founder_pack_v1(timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_rapport_founder_pack_v1(timestamptz)
to service_role;

do $$
declare
  v_contract jsonb := public.clutch_contrat_monetisation_v1();
  v_analytics jsonb := public.clutch_contrat_analytics_v1();
begin
  if (v_contract ->> 'version')::integer <> 2
     or v_contract ->> 'code' <> 'identity_founder_v2'
     or not coalesce((v_contract #>> '{paiements,actifs}')::boolean, false)
     or coalesce((v_contract #>> '{paiements,packs_volts_actifs}')::boolean, true)
     or (v_contract #>> '{paiements,founder_pack,volts_inclus}')::integer <> 0
     or coalesce((v_contract #>> '{devises,volts,achat_reel_actif}')::boolean, true)
  then
    raise exception 'Founder Pack monetization contract is inconsistent';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.source = 'founder_pack'
      and o.collection_key = 'founder-origin'
      and o.prix = 0
      and o.statut_publication = 'publie'
  ) <> 4 then
    raise exception 'Founder Pack must contain exactly four published cosmetics';
  end if;

  if (v_analytics ->> 'version')::integer <> 2
     or not (v_analytics -> 'evenements' ? 'founder_pack_affiche')
     or not (v_analytics -> 'evenements' ? 'founder_pack_attribue')
  then
    raise exception 'Founder Pack analytics contract is incomplete';
  end if;

  if has_table_privilege('authenticated', 'private.achats_founder_pack', 'SELECT')
     or has_table_privilege('service_role', 'private.achats_founder_pack', 'INSERT')
     or has_table_privilege('authenticated', 'private.evenements_founder_pack', 'SELECT')
     or has_function_privilege(
       'authenticated',
       'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.clutch_statut_founder_pack_v1(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.clutch_statut_founder_pack_v1(uuid)',
       'EXECUTE'
     )
  then
    raise exception 'Founder Pack privileges are not fail-closed';
  end if;
end;
$$;
