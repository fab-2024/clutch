-- Team packs v1 -- published bundles of permanent cosmetics bought with Volts.
--
-- A pack purchase creates exactly one append-only Volt movement, one permanent
-- pack entitlement, the inventory rows for every member and the default
-- equipment subset. The dedicated equip RPC can reapply that subset later.
-- No pack field can affect Frags, rank, calls or competitive projections.

begin;

-- Team-pack members are not individually purchasable. Their zero price is the
-- intentional catalogue representation of a right granted by a paid bundle.
alter table public.objets_catalogue
  drop constraint if exists objets_catalogue_source_check;

alter table public.objets_catalogue
  add constraint objets_catalogue_source_check
  check (source in (
    'gratuit',
    'mission',
    'partenaire',
    'achat',
    'founder_pack',
    'team_pack'
  ));

comment on column public.objets_catalogue.source is
  'Acquisition channel: gratuit, mission, partenaire, achat, founder_pack or team_pack. A team_pack member is only granted by its pack RPC.';

create table public.packs_cosmetiques (
  id text primary key,
  nom text not null,
  description text not null,
  prix_volts integer not null,
  nombre_objets integer not null,
  actif boolean not null default true,
  statut_publication text not null default 'brouillon',
  disponible_du timestamptz,
  disponible_au timestamptz,
  marque_key text,
  collection_key text not null,
  accent text,
  licence jsonb not null,
  cree_le timestamptz not null default pg_catalog.now(),
  maj_le timestamptz not null default pg_catalog.now(),
  constraint packs_cosmetiques_id_check
    check (id ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint packs_cosmetiques_nom_check
    check (char_length(btrim(nom)) between 1 and 120),
  constraint packs_cosmetiques_description_check
    check (char_length(btrim(description)) between 1 and 500),
  constraint packs_cosmetiques_prix_check
    check (prix_volts between 1 and 100000),
  constraint packs_cosmetiques_nombre_objets_check
    check (nombre_objets between 1 and 50),
  constraint packs_cosmetiques_publication_check
    check (statut_publication in ('brouillon', 'publie', 'retire')),
  constraint packs_cosmetiques_publication_complete_check
    check (statut_publication <> 'publie' or actif),
  constraint packs_cosmetiques_disponibilite_check
    check (
      disponible_du is null
      or disponible_au is null
      or disponible_au > disponible_du
    ),
  constraint packs_cosmetiques_marque_check
    check (marque_key is null or marque_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint packs_cosmetiques_collection_check
    check (collection_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint packs_cosmetiques_accent_check
    check (accent is null or accent ~ '^#[0-9A-Fa-f]{6}$'),
  constraint packs_cosmetiques_licence_check
    check (
      jsonb_typeof(licence) = 'object'
      and coalesce(nullif(btrim(licence ->> 'type'), ''), '') <> ''
      and coalesce(nullif(btrim(licence ->> 'titulaire'), ''), '') <> ''
    )
);

create table public.pack_cosmetique_membres (
  pack_id text not null
    references public.packs_cosmetiques(id)
    on update cascade
    on delete cascade,
  objet_id text not null,
  emplacement text not null,
  ordre smallint not null,
  equip_by_default boolean not null default false,
  primary key (pack_id, objet_id),
  constraint pack_cosmetique_membres_objet_emplacement_fkey
    foreign key (objet_id, emplacement)
    references public.objets_catalogue(id, emplacement)
    on update cascade,
  constraint pack_cosmetique_membres_ordre_check
    check (ordre between 1 and 50),
  constraint pack_cosmetique_membres_pack_ordre_key
    unique (pack_id, ordre)
);

-- PostgreSQL cannot express the joined slot invariant in a CHECK. Keeping the
-- slot on the membership row plus its composite catalogue FK lets this partial
-- index prove that a pack equips at most one default object per slot.
create unique index pack_cosmetique_membres_default_slot_uidx
  on public.pack_cosmetique_membres (pack_id, emplacement)
  where equip_by_default;

create index pack_cosmetique_membres_objet_idx
  on public.pack_cosmetique_membres (objet_id);

create table public.inventaire_packs_cosmetiques (
  user_id uuid not null
    references public.profils(id)
    on delete cascade,
  pack_id text not null
    references public.packs_cosmetiques(id)
    on update cascade,
  mouvement_id uuid not null
    references public.volts_mouvements(id),
  prix_paye_volts integer not null,
  acquis_le timestamptz not null default pg_catalog.now(),
  primary key (user_id, pack_id),
  constraint inventaire_packs_cosmetiques_mouvement_key unique (mouvement_id),
  constraint inventaire_packs_cosmetiques_prix_check
    check (prix_paye_volts > 0)
);

create index inventaire_packs_cosmetiques_pack_idx
  on public.inventaire_packs_cosmetiques (pack_id, acquis_le desc);

alter table public.packs_cosmetiques enable row level security;
alter table public.pack_cosmetique_membres enable row level security;
alter table public.inventaire_packs_cosmetiques enable row level security;

create policy packs_cosmetiques_lecture_v1
  on public.packs_cosmetiques
  for select
  to authenticated
  using (
    (
      actif
      and statut_publication = 'publie'
      and (disponible_du is null or disponible_du <= pg_catalog.now())
      and (disponible_au is null or disponible_au > pg_catalog.now())
    )
    or exists (
      select 1
      from public.inventaire_packs_cosmetiques i
      where i.user_id = (select auth.uid())
        and i.pack_id = packs_cosmetiques.id
    )
  );

create policy pack_cosmetique_membres_lecture_v1
  on public.pack_cosmetique_membres
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.packs_cosmetiques p
      where p.id = pack_cosmetique_membres.pack_id
    )
  );

create policy inventaire_packs_cosmetiques_lecture_v1
  on public.inventaire_packs_cosmetiques
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.packs_cosmetiques
from public, anon, authenticated, service_role;
revoke all privileges on table public.pack_cosmetique_membres
from public, anon, authenticated, service_role;
revoke all privileges on table public.inventaire_packs_cosmetiques
from public, anon, authenticated, service_role;

grant select on table public.packs_cosmetiques
to authenticated;
grant select on table public.pack_cosmetique_membres
to authenticated;
grant select on table public.inventaire_packs_cosmetiques
to authenticated;

grant select, insert, update, delete on table public.packs_cosmetiques
to service_role;
grant select, insert, update, delete on table public.pack_cosmetique_membres
to service_role;
grant select, insert, update, delete on table public.inventaire_packs_cosmetiques
to service_role;

comment on table public.packs_cosmetiques is
  'Published deterministic cosmetic bundles. Prices are in earned Volts only; ownership never expires.';
comment on table public.pack_cosmetique_membres is
  'Ordered pack contents, immutable after the first entitlement. equip_by_default identifies the collision-free subset applied atomically.';
comment on table public.inventaire_packs_cosmetiques is
  'Permanent owner-only team-pack entitlements linked one-to-one to their immutable Volt debit.';

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
  collection_key,
  source,
  statut_publication,
  licence,
  est_inclus
) values
  (
    'fnatic-room-lighting', 'vitrine_eclairage', 4,
    'Salle Fnatic · Black & Orange', 0, true,
    'Un éclairage noir et orange transforme la Vitrine en salle Fnatic.',
    'legendaire', 'fnatic-room-lighting', '#FF5900', 'vitrine_eclairage',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-jersey', 'vitrine_maillot', 4,
    'Maillot Fnatic', 0, true,
    'Le maillot noir Fnatic, présenté sur son socle dédié.',
    'legendaire', 'fnatic-jersey', '#FF5900', 'vitrine_maillot',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-logo-3d', 'apparence_core', 4,
    'Logo Fnatic 3D', 0, true,
    'Le logo Fnatic sculpté en métal orange au cœur de la Vitrine.',
    'legendaire', 'fnatic-logo-3d', '#FF5900', 'core_clutch',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-banner', 'carte_profil', 4,
    'Bannière Fnatic', 0, true,
    'Une bannière noire bordée d’orange pour afficher les couleurs Fnatic.',
    'legendaire', 'fnatic-banner', '#FF5900', 'banniere',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-pedestals', 'vitrine_supports', 4,
    'Socles Fnatic', 0, true,
    'Des socles noirs cerclés d’orange et leur projection Fnatic.',
    'legendaire', 'fnatic-pedestals', '#FF5900', 'vitrine_supports',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-supporter-token', 'apparence_core', 4,
    'Jeton Supporter Fnatic', 0, true,
    'Un jeton de collection frappé du logo Fnatic.',
    'legendaire', 'fnatic-supporter-token', '#FF5900', 'core_clutch',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-totem', 'apparence_core', 4,
    'Totem Fnatic', 0, true,
    'Une figurine totem métallique inspirée du logo Fnatic.',
    'legendaire', 'fnatic-totem', '#FF5900', 'core_clutch',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-supporter-badge', 'apparence_core', 4,
    'Badge Supporter Fnatic', 0, true,
    'Un badge de collection dédié aux supporters Fnatic.',
    'legendaire', 'fnatic-supporter-badge', '#FF5900', 'core_clutch',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-profile-frame', 'cadre_profil', 4,
    'Cadre de profil Fnatic', 0, true,
    'Un cadre technique noir ponctué des accents orange Fnatic.',
    'legendaire', 'fnatic-profile-frame', '#FF5900', 'cadre_avatar',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-embers', 'effet_faction', 4,
    'Braises Fnatic', 0, true,
    'Des braises orange accompagnent l’entrée puis restent discrètes au repos.',
    'legendaire', 'fnatic-embers', '#FF5900', 'signature_relique',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-share-card', 'carte_profil', 4,
    'Carte de partage Fnatic', 0, true,
    'Une carte paysage Fnatic prête à partager la Vitrine équipée.',
    'legendaire', 'fnatic-share-card', '#FF5900', 'banniere',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
  ),
  (
    'fnatic-title', 'titre_profil', 4,
    'Always Fnatic', 0, true,
    'Le titre supporter permanent Always Fnatic.',
    'legendaire', 'fnatic-title', '#FF5900', 'titre_supporter',
    'fnatic', 'fnatic-black-orange', 'team_pack', 'publie',
    '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb, false
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
    collection_key = excluded.collection_key,
    source = excluded.source,
    statut_publication = excluded.statut_publication,
    licence = excluded.licence,
    est_inclus = excluded.est_inclus;

insert into public.packs_cosmetiques (
  id,
  nom,
  description,
  prix_volts,
  nombre_objets,
  actif,
  statut_publication,
  marque_key,
  collection_key,
  accent,
  licence
) values (
  'fnatic-black-orange',
  'Pack Fnatic · Black & Orange',
  'Douze cosmétiques Fnatic connus à l’avance, avec une remise pack et huit éléments équipables en une action.',
  1200,
  12,
  true,
  'publie',
  'fnatic',
  'fnatic-black-orange',
  '#FF5900',
  '{"type":"partenaire","titulaire":"Fnatic"}'::jsonb
)
on conflict (id) do update
set nom = excluded.nom,
    description = excluded.description,
    prix_volts = excluded.prix_volts,
    nombre_objets = excluded.nombre_objets,
    actif = excluded.actif,
    statut_publication = excluded.statut_publication,
    marque_key = excluded.marque_key,
    collection_key = excluded.collection_key,
    accent = excluded.accent,
    licence = excluded.licence,
    maj_le = pg_catalog.now();

insert into public.pack_cosmetique_membres (
  pack_id,
  objet_id,
  emplacement,
  ordre,
  equip_by_default
) values
  ('fnatic-black-orange', 'fnatic-room-lighting', 'vitrine_eclairage', 1, true),
  ('fnatic-black-orange', 'fnatic-jersey', 'vitrine_maillot', 2, true),
  ('fnatic-black-orange', 'fnatic-logo-3d', 'apparence_core', 3, true),
  ('fnatic-black-orange', 'fnatic-banner', 'carte_profil', 4, false),
  ('fnatic-black-orange', 'fnatic-pedestals', 'vitrine_supports', 5, true),
  ('fnatic-black-orange', 'fnatic-supporter-token', 'apparence_core', 6, false),
  ('fnatic-black-orange', 'fnatic-totem', 'apparence_core', 7, false),
  ('fnatic-black-orange', 'fnatic-supporter-badge', 'apparence_core', 8, false),
  ('fnatic-black-orange', 'fnatic-profile-frame', 'cadre_profil', 9, true),
  ('fnatic-black-orange', 'fnatic-embers', 'effet_faction', 10, true),
  ('fnatic-black-orange', 'fnatic-share-card', 'carte_profil', 11, true),
  ('fnatic-black-orange', 'fnatic-title', 'titre_profil', 12, true)
on conflict (pack_id, objet_id) do update
set emplacement = excluded.emplacement,
    ordre = excluded.ordre,
    equip_by_default = excluded.equip_by_default;

create or replace function public.clutch_contrat_monetisation_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 5,
    'code', 'identity_showcase_team_packs_v5',
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
      'schema_version', 5,
      'emplacements', jsonb_build_array(
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil',
        'vitrine_materiau',
        'vitrine_eclairage',
        'vitrine_supports',
        'vitrine_rang',
        'vitrine_maillot'
      ),
      'familles_initiales', jsonb_build_array(
        'cadre_avatar',
        'banniere',
        'titre_supporter',
        'signature_relique'
      ),
      'extensions', jsonb_build_array(
        'core_clutch',
        'vitrine_materiau',
        'vitrine_eclairage',
        'vitrine_supports',
        'vitrine_rang',
        'vitrine_maillot'
      ),
      'familles_par_emplacement', jsonb_build_object(
        'cadre_profil', 'cadre_avatar',
        'carte_profil', 'banniere',
        'titre_profil', 'titre_supporter',
        'effet_faction', 'signature_relique',
        'apparence_core', 'core_clutch',
        'vitrine_materiau', 'vitrine_materiau',
        'vitrine_eclairage', 'vitrine_eclairage',
        'vitrine_supports', 'vitrine_supports',
        'vitrine_rang', 'vitrine_rang',
        'vitrine_maillot', 'vitrine_maillot'
      ),
      'sources', jsonb_build_array(
        'gratuit',
        'mission',
        'partenaire',
        'achat',
        'founder_pack',
        'team_pack'
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
      'packs_volts_actifs', true,
      'packs_volts', jsonb_build_object(
        'contenu_connu_avant_achat', true,
        'achat_idempotent', true,
        'propriete_permanente', true,
        'equipement_a_l_achat', true,
        'reequipement_explicite', true
      )
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
        'detail', 'Les Volts ne débloquent que des objets visuels connus à l’avance.'
      ),
      jsonb_build_object(
        'id', 'no-randomness',
        'label', 'AUCUNE LOOT BOX',
        'detail', 'Chaque objet obtenu est connu avant la dépense.'
      ),
      jsonb_build_object(
        'id', 'permanent-ownership',
        'label', 'OBJETS PERMANENTS',
        'detail', 'Un objet possédé reste disponible et équipable sans expiration.'
      ),
      jsonb_build_object(
        'id', 'partner-participation',
        'label', 'PARTICIPATION, PAS JUSTESSE',
        'detail', 'Une activation partenaire récompense une action, jamais un bon pronostic.'
      )
    )
  );
$$;

comment on function public.clutch_contrat_monetisation_v1() is
  'Monetization contract v5. Enables deterministic Volt team packs while preserving the ten cosmetic slots and competitive isolation.';

revoke all privileges on function public.clutch_contrat_monetisation_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_monetisation_v1()
to anon, authenticated, service_role;

-- Every pack read-modify-write flow follows the same lock order:
--   1. global team-pack catalogue lock (shared for purchases/equipment,
--      exclusive for editorial mutations),
--   2. per-user cosmetic lock,
--   3. per-user Volt ledger lock.
-- A single deterministic catalogue key also makes multi-pack member moves
-- deadlock-free: an editorial statement locks before PostgreSQL touches rows.
create or replace function private.clutch_verrouiller_catalogue_packs_v1(
  p_exclusif boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_exclusif then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('clutch-team-packs:catalogue-v1', 0)
    );
  else
    perform pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended('clutch-team-packs:catalogue-v1', 0)
    );
  end if;
end;
$$;

revoke all privileges on function private.clutch_verrouiller_catalogue_packs_v1(boolean)
from public, anon, authenticated, service_role;

create or replace function private.clutch_verrouiller_mutation_pack_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.clutch_verrouiller_catalogue_packs_v1(true);
  return null;
end;
$$;

revoke all privileges on function private.clutch_verrouiller_mutation_pack_v1()
from public, anon, authenticated, service_role;

-- Statement-level BEFORE triggers acquire the exclusive advisory lock before
-- any tuple lock. Purchase/equipment can therefore safely take the shared lock
-- and then lock a coherent pack/member snapshot without a lock-order cycle.
create trigger packs_cosmetiques_mutation_lock_v1
before insert or update or delete on public.packs_cosmetiques
for each statement execute function private.clutch_verrouiller_mutation_pack_v1();

create trigger pack_cosmetique_membres_mutation_lock_v1
before insert or update or delete on public.pack_cosmetique_membres
for each statement execute function private.clutch_verrouiller_mutation_pack_v1();

create or replace function private.clutch_garder_pack_immuable_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_pack_id text;
  v_new_pack_id text;
begin
  if tg_table_name = 'pack_cosmetique_membres' then
    v_old_pack_id := case when tg_op in ('UPDATE', 'DELETE') then old.pack_id else null end;
    v_new_pack_id := case when tg_op in ('UPDATE', 'INSERT') then new.pack_id else null end;

    -- Both sides matter. In particular, UPDATE old_pack -> new_pack must not
    -- move content out of an acquired pack or into another acquired pack.
    if exists (
      select 1
      from public.inventaire_packs_cosmetiques i
      where i.pack_id = v_old_pack_id
         or i.pack_id = v_new_pack_id
    ) then
      raise exception 'contenu immuable apres le premier achat du pack : % -> %',
        coalesce(v_old_pack_id, '∅'),
        coalesce(v_new_pack_id, '∅')
        using errcode = '55000';
    end if;
  elsif tg_op = 'UPDATE' and old.id is distinct from new.id and exists (
    select 1
    from public.inventaire_packs_cosmetiques i
    where i.pack_id = old.id
       or i.pack_id = new.id
  ) then
    raise exception 'identifiant immuable apres le premier achat du pack : % -> %',
      old.id,
      new.id
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all privileges on function private.clutch_garder_pack_immuable_v1()
from public, anon, authenticated, service_role;

create trigger packs_cosmetiques_immutabilite_v1
before update on public.packs_cosmetiques
for each row execute function private.clutch_garder_pack_immuable_v1();

create trigger pack_cosmetique_membres_immutabilite_v1
before insert or update or delete on public.pack_cosmetique_membres
for each row execute function private.clutch_garder_pack_immuable_v1();

create or replace function private.clutch_assert_pack_cosmetique_acquerable_v1(
  p_pack_id text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pack public.packs_cosmetiques%rowtype;
  v_nombre_membres integer;
begin
  perform private.clutch_verrouiller_catalogue_packs_v1(false);

  select p.*
  into strict v_pack
  from public.packs_cosmetiques p
  where p.id = btrim(p_pack_id)
  for share;

  perform 1
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
  order by m.ordre
  for share;

  if not v_pack.actif
     or v_pack.statut_publication <> 'publie'
     or (v_pack.disponible_du is not null and v_pack.disponible_du > pg_catalog.now())
     or (v_pack.disponible_au is not null and v_pack.disponible_au <= pg_catalog.now())
  then
    raise exception 'pack cosmetique indisponible : %', p_pack_id
      using errcode = 'P0002';
  end if;

  select count(*)::integer
  into v_nombre_membres
  from public.pack_cosmetique_membres m
  join public.objets_catalogue o
    on o.id = m.objet_id
   and o.emplacement = m.emplacement
  where m.pack_id = v_pack.id
    and o.source = 'team_pack'
    and o.prix = 0
    and o.actif
    and o.statut_publication = 'publie'
    and (o.disponible_du is null or o.disponible_du <= pg_catalog.now())
    and (o.disponible_au is null or o.disponible_au > pg_catalog.now());

  if v_nombre_membres <> v_pack.nombre_objets then
    raise exception 'contenu du pack cosmetique incomplet : %/%',
      v_nombre_membres,
      v_pack.nombre_objets
      using errcode = '23514';
  end if;
exception
  when no_data_found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
end;
$$;

revoke all privileges on function private.clutch_assert_pack_cosmetique_acquerable_v1(text)
from public, anon, authenticated, service_role;

create or replace function private.clutch_valider_pack_cosmetique_publication_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pack_id text;
  v_pack_ids text[];
  v_pack public.packs_cosmetiques%rowtype;
  v_nombre_membres integer;
begin
  if tg_table_name = 'packs_cosmetiques' then
    v_pack_ids := case tg_op
      when 'INSERT' then array[new.id]
      when 'DELETE' then array[old.id]
      else array[old.id, new.id]
    end;
  else
    v_pack_ids := case tg_op
      when 'INSERT' then array[new.pack_id]
      when 'DELETE' then array[old.pack_id]
      else array[old.pack_id, new.pack_id]
    end;
  end if;

  for v_pack_id in
    select distinct affected.id
    from unnest(v_pack_ids) as affected(id)
    where affected.id is not null
    order by affected.id
  loop
    select p.*
    into v_pack
    from public.packs_cosmetiques p
    where p.id = v_pack_id;

    -- A deleted, draft or retired pack has no publication completeness duty.
    if not found or v_pack.statut_publication <> 'publie' then
      continue;
    end if;

    select count(*)::integer
    into v_nombre_membres
    from public.pack_cosmetique_membres m
    join public.objets_catalogue o
      on o.id = m.objet_id
     and o.emplacement = m.emplacement
    where m.pack_id = v_pack.id
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie';

    if v_nombre_membres <> v_pack.nombre_objets then
      raise exception 'contenu du pack publie incomplet : %/%',
        v_nombre_membres,
        v_pack.nombre_objets
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack.id
        and m.equip_by_default
    ) then
      raise exception 'pack publie sans equipement par defaut : %', v_pack.id
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.pack_cosmetique_membres m
      join public.objets_catalogue o on o.id = m.objet_id
      where m.pack_id = v_pack.id
        and o.collection_key <> v_pack.collection_key
    ) then
      raise exception 'collection des membres incoherente pour le pack : %', v_pack.id
        using errcode = '23514';
    end if;
  end loop;

  return null;
end;
$$;

revoke all privileges on function private.clutch_valider_pack_cosmetique_publication_v1()
from public, anon, authenticated, service_role;

create constraint trigger packs_cosmetiques_publication_complete_v1
after insert or update on public.packs_cosmetiques
deferrable initially deferred
for each row execute function private.clutch_valider_pack_cosmetique_publication_v1();

create constraint trigger pack_cosmetique_membres_publication_complete_v1
after insert or update or delete on public.pack_cosmetique_membres
deferrable initially deferred
for each row execute function private.clutch_valider_pack_cosmetique_publication_v1();

-- Extend the existing append-only ledger instead of creating a second balance
-- source. Existing object purchases keep objet_id and their normalized source;
-- a pack debit uses pack_id and an equally strict origin/source pair.
alter table public.volts_mouvements
  add column if not exists pack_id text;

alter table public.volts_mouvements
  drop constraint if exists volts_mouvements_origine_check,
  drop constraint if exists volts_mouvements_source_economique_check,
  drop constraint if exists volts_mouvements_sens_check,
  drop constraint if exists volts_mouvements_objet_check,
  drop constraint if exists volts_mouvements_pack_id_fkey;

alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
    check (origine in (
      'badge',
      'saison',
      'call',
      'achat',
      'achat_pack',
      'ajustement',
      'pari',
      'faction',
      'friend_quest',
      'onboarding',
      'progression',
      'mission',
      'activation',
      'exceptionnelle'
    )),
  add constraint volts_mouvements_source_economique_check
    check (source_economique in (
      'onboarding',
      'progression',
      'mission',
      'activation',
      'exceptionnelle',
      'achat_cosmetique',
      'achat_pack_cosmetique',
      'ajustement'
    )),
  add constraint volts_mouvements_sens_check
    check (
      (source_economique in (
        'onboarding',
        'progression',
        'mission',
        'activation',
        'exceptionnelle'
      ) and montant > 0)
      or (source_economique in ('achat_cosmetique', 'achat_pack_cosmetique') and montant < 0)
      or (source_economique = 'ajustement' and montant <> 0)
    ),
  add constraint volts_mouvements_objet_check
    check (
      (
        source_economique = 'achat_cosmetique'
        and objet_id is not null
        and pack_id is null
      )
      or (
        source_economique = 'achat_pack_cosmetique'
        and objet_id is null
        and pack_id is not null
      )
      or (
        source_economique not in ('achat_cosmetique', 'achat_pack_cosmetique')
        and objet_id is null
        and pack_id is null
      )
    ),
  add constraint volts_mouvements_pack_id_fkey
    foreign key (pack_id)
    references public.packs_cosmetiques(id);

create index volts_mouvements_pack_idx
  on public.volts_mouvements (pack_id)
  where pack_id is not null;

comment on column public.volts_mouvements.pack_id is
  'Published cosmetic pack linked to an achat_pack debit; mutually exclusive with objet_id.';
comment on table public.volts_mouvements is
  'Append-only Volt ledger. Every row has a normalized source, an object, pack or campaign link when applicable, an idempotency key and a resulting balance; it never mutates Frags or rank.';

create or replace function private.clutch_source_economique_volts_v1(p_origine text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case lower(btrim(p_origine))
    when 'onboarding' then 'onboarding'
    when 'badge' then 'progression'
    when 'saison' then 'progression'
    when 'call' then 'progression'
    when 'pari' then 'progression'
    when 'faction' then 'progression'
    when 'progression' then 'progression'
    when 'friend_quest' then 'mission'
    when 'mission' then 'mission'
    when 'activation' then 'activation'
    when 'exceptionnelle' then 'exceptionnelle'
    when 'achat' then 'achat_cosmetique'
    when 'achat_pack' then 'achat_pack_cosmetique'
    when 'ajustement' then 'ajustement'
    else null
  end;
$$;

revoke all privileges on function private.clutch_source_economique_volts_v1(text)
from public, anon, authenticated, service_role;

create or replace function private.clutch_preparer_mouvement_volts_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_solde integer;
  v_pack_prix integer;
begin
  new.origine := lower(btrim(new.origine));
  new.reference := btrim(new.reference);

  if new.reference = '' then
    raise exception 'reference Volt requise' using errcode = '22023';
  end if;

  v_source := private.clutch_source_economique_volts_v1(new.origine);
  if v_source is null then
    raise exception 'origine Volt inconnue : %', new.origine using errcode = '22023';
  end if;

  if new.source_economique is not null
     and lower(btrim(new.source_economique)) <> v_source
  then
    raise exception 'source economique incoherente pour %', new.origine
      using errcode = '23514';
  end if;
  new.source_economique := v_source;

  new.cle_idempotence := coalesce(
    nullif(btrim(new.cle_idempotence), ''),
    new.origine || ':' || new.reference
  );
  new.metadata := coalesce(new.metadata, '{}'::jsonb);

  if v_source = 'achat_cosmetique' then
    new.objet_id := coalesce(nullif(btrim(new.objet_id), ''), new.reference);
    if new.objet_id <> new.reference then
      raise exception 'la reference d achat doit identifier le cosmetique'
        using errcode = '23514';
    end if;
    if new.pack_id is not null then
      raise exception 'un achat objet ne peut pas identifier un pack'
        using errcode = '23514';
    end if;
    perform private.clutch_assert_objet_acquerable_v2(new.objet_id);
  elsif v_source = 'achat_pack_cosmetique' then
    new.pack_id := coalesce(nullif(btrim(new.pack_id), ''), new.reference);
    if new.pack_id <> new.reference then
      raise exception 'la reference d achat doit identifier le pack cosmetique'
        using errcode = '23514';
    end if;
    if new.objet_id is not null then
      raise exception 'un achat pack ne peut pas identifier un objet individuel'
        using errcode = '23514';
    end if;
    perform private.clutch_assert_pack_cosmetique_acquerable_v1(new.pack_id);
    select p.prix_volts
    into v_pack_prix
    from public.packs_cosmetiques p
    where p.id = new.pack_id;
    if new.montant <> -v_pack_prix then
      raise exception 'montant du pack cosmetique incoherent : % attendu, % recu',
        v_pack_prix,
        abs(new.montant)
        using errcode = '23514';
    end if;
  else
    if new.objet_id is not null then
      raise exception 'un objet ne peut etre lie qu a une depense cosmetique'
        using errcode = '23514';
    end if;
    if new.pack_id is not null then
      raise exception 'un pack ne peut etre lie qu a une depense de pack cosmetique'
        using errcode = '23514';
    end if;
  end if;

  new.campagne_key := nullif(lower(btrim(new.campagne_key)), '');
  if v_source = 'activation' and new.campagne_key is null then
    new.campagne_key := lower(new.reference);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-volts:' || new.user_id::text, 0)
  );

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = new.user_id;

  new.solde_apres := v_solde + new.montant;
  if new.solde_apres < 0 then
    raise exception 'solde Volts insuffisant : % disponibles, % demandes',
      v_solde,
      abs(new.montant)
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_preparer_mouvement_volts_v2()
from public, anon, authenticated, service_role;

-- Preserve the trusted reward contract while reserving both purchase origins.
create or replace function public.clutch_crediter_volts(
  p_user uuid,
  p_montant integer,
  p_origine text,
  p_reference text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pose boolean;
  v_origine text := lower(btrim(p_origine));
begin
  if p_user is null then
    raise exception 'utilisateur requis' using errcode = '22023';
  end if;
  if p_montant <= 0 then
    raise exception 'un credit doit etre strictement positif (recu : %)', p_montant
      using errcode = '22023';
  end if;
  if v_origine in ('achat', 'achat_pack', 'ajustement') then
    raise exception 'origine reservee a une operation interne : %', v_origine
      using errcode = '22023';
  end if;
  if private.clutch_source_economique_volts_v1(v_origine) is null then
    raise exception 'origine Volt inconnue : %', v_origine using errcode = '22023';
  end if;

  insert into public.volts_mouvements (
    user_id,
    montant,
    origine,
    reference,
    campagne_key
  ) values (
    p_user,
    p_montant,
    v_origine,
    btrim(p_reference),
    case when v_origine = 'activation' then lower(btrim(p_reference)) else null end
  )
  on conflict (user_id, origine, reference) do nothing;

  get diagnostics v_pose = row_count;
  return v_pose;
end;
$$;

comment on function public.clutch_crediter_volts(uuid, integer, text, text) is
  'Trusted idempotent reward primitive. Purchase and adjustment origins are reserved for reviewed internal flows.';

revoke all privileges on function public.clutch_crediter_volts(uuid, integer, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_crediter_volts(uuid, integer, text, text)
to service_role;

create or replace function private.clutch_valider_droit_pack_cosmetique_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.volts_mouvements m
    where m.id = new.mouvement_id
      and m.user_id = new.user_id
      and m.pack_id = new.pack_id
      and m.reference = new.pack_id
      and m.origine = 'achat_pack'
      and m.source_economique = 'achat_pack_cosmetique'
      and m.montant = -new.prix_paye_volts
  ) then
    raise exception 'droit pack sans debit Volt compatible : %', new.pack_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_valider_droit_pack_cosmetique_v1()
from public, anon, authenticated, service_role;

create trigger inventaire_packs_cosmetiques_ledger_v1
before insert or update on public.inventaire_packs_cosmetiques
for each row execute function private.clutch_valider_droit_pack_cosmetique_v1();

create or replace function public.clutch_pack_cosmetique_v1(p_pack_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pack_id text := btrim(p_pack_id);
  v_pack public.packs_cosmetiques%rowtype;
  v_possede boolean;
  v_solde integer;
  v_objets jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  select p.*
  into v_pack
  from public.packs_cosmetiques p
  where p.id = v_pack_id;

  if not found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.inventaire_packs_cosmetiques i
    where i.user_id = v_user
      and i.pack_id = v_pack.id
  ) into v_possede;

  if not v_possede and (
    not v_pack.actif
    or v_pack.statut_publication <> 'publie'
    or (v_pack.disponible_du is not null and v_pack.disponible_du > pg_catalog.now())
    or (v_pack.disponible_au is not null and v_pack.disponible_au <= pg_catalog.now())
  ) then
    raise exception 'pack cosmetique indisponible : %', p_pack_id
      using errcode = 'P0002';
  end if;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'emplacement', o.emplacement,
        'famille', o.famille,
        'ordre', m.ordre,
        'nom', o.nom,
        'description', o.description,
        'rarete', o.rarete,
        'style_key', o.style_key,
        'accent', o.accent,
        'equip_by_default', m.equip_by_default,
        'possede', i.objet_id is not null,
        'equipe', e.objet_id = o.id
      )
      order by m.ordre
    ),
    '[]'::jsonb
  )
  into v_objets
  from public.pack_cosmetique_membres m
  join public.objets_catalogue o
    on o.id = m.objet_id
   and o.emplacement = m.emplacement
  left join public.inventaire i
    on i.user_id = v_user
   and i.objet_id = m.objet_id
  left join public.equipement e
    on e.user_id = v_user
   and e.emplacement = m.emplacement
  where m.pack_id = v_pack.id;

  return jsonb_build_object(
    'version', 1,
    'id', v_pack.id,
    'nom', v_pack.nom,
    'description', v_pack.description,
    'prix_volts', v_pack.prix_volts,
    'nombre_objets', v_pack.nombre_objets,
    'accent', v_pack.accent,
    'marque_key', v_pack.marque_key,
    'collection_key', v_pack.collection_key,
    'statut_publication', v_pack.statut_publication,
    'possede', v_possede,
    'solde', v_solde,
    'achetable', not v_possede and v_solde >= v_pack.prix_volts,
    'objets', v_objets,
    'contrat_version', (
      public.clutch_contrat_monetisation_v1() ->> 'version'
    )::integer
  );
end;
$$;

create or replace function public.clutch_acheter_pack_cosmetique_v1(p_pack_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pack_id text := btrim(p_pack_id);
  v_pack public.packs_cosmetiques%rowtype;
  v_mouvement_id uuid;
  v_solde integer;
  v_achete boolean := false;
  v_objets_attribues integer;
  v_defaults integer;
  v_nombre_equipes integer;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  -- Lock the editorial catalogue first, then materialize and row-lock the
  -- exact pack/member snapshot used by debit, grants and equipment.
  perform private.clutch_verrouiller_catalogue_packs_v1(false);

  select p.*
  into v_pack
  from public.packs_cosmetiques p
  where p.id = v_pack_id
  for share;

  if not found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
  end if;

  perform 1
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
  order by m.ordre
  for share;

  -- The per-user lock follows the catalogue lock everywhere.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select i.mouvement_id
  into v_mouvement_id
  from public.inventaire_packs_cosmetiques i
  where i.user_id = v_user
    and i.pack_id = v_pack.id;

  if v_mouvement_id is null then
    perform private.clutch_assert_pack_cosmetique_acquerable_v1(v_pack.id);

    select coalesce(sum(m.montant), 0)::integer
    into v_solde
    from public.volts_mouvements m
    where m.user_id = v_user;

    if v_solde < v_pack.prix_volts then
      raise exception 'solde insuffisant : % Volts requis, % disponibles',
        v_pack.prix_volts,
        v_solde
        using errcode = 'P0001';
    end if;

    insert into public.volts_mouvements (
      user_id,
      montant,
      origine,
      reference,
      pack_id,
      cle_idempotence,
      metadata
    ) values (
      v_user,
      -v_pack.prix_volts,
      'achat_pack',
      v_pack.id,
      v_pack.id,
      'achat_pack:' || v_pack.id,
      jsonb_build_object(
        'nombre_objets', v_pack.nombre_objets,
        'collection_key', v_pack.collection_key
      )
    )
    returning id into v_mouvement_id;

    insert into public.inventaire_packs_cosmetiques (
      user_id,
      pack_id,
      mouvement_id,
      prix_paye_volts
    ) values (
      v_user,
      v_pack.id,
      v_mouvement_id,
      v_pack.prix_volts
    );

    v_achete := true;
  end if;

  -- Repeating a completed purchase is a no-charge repair operation. It makes
  -- ownership resilient to a previously interrupted administrative backfill
  -- without ever creating another debit.
  insert into public.inventaire (user_id, objet_id)
  select v_user, m.objet_id
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
  on conflict (user_id, objet_id) do nothing;

  select count(*)::integer
  into v_objets_attribues
  from public.inventaire i
  join public.pack_cosmetique_membres m
    on m.pack_id = v_pack.id
   and m.objet_id = i.objet_id
  where i.user_id = v_user;

  if v_objets_attribues <> v_pack.nombre_objets then
    raise exception 'attribution du pack incomplete : %/%',
      v_objets_attribues,
      v_pack.nombre_objets
      using errcode = '23514';
  end if;

  select count(*)::integer
  into v_defaults
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
    and m.equip_by_default;

  -- Unlock and equip are one transaction. Any slot/FK failure rolls the debit,
  -- entitlement and all inventory rows back with this statement.
  insert into public.equipement (user_id, emplacement, objet_id)
  select v_user, m.emplacement, m.objet_id
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
    and m.equip_by_default
  order by m.ordre
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = pg_catalog.now();

  get diagnostics v_nombre_equipes = row_count;

  if v_nombre_equipes <> v_defaults or v_nombre_equipes = 0 then
    raise exception 'equipement par defaut du pack incomplet : %/%',
      v_nombre_equipes,
      v_defaults
      using errcode = '23514';
  end if;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  return jsonb_build_object(
    'pack_id', v_pack.id,
    'prix_pack', v_pack.prix_volts,
    'prix', case when v_achete then v_pack.prix_volts else 0 end,
    'solde', v_solde,
    'achete', v_achete,
    'possede', true,
    'nombre_objets', v_pack.nombre_objets,
    'objets_attribues', v_objets_attribues,
    'equipables_par_defaut', v_defaults,
    'nombre_equipes', v_nombre_equipes,
    'equipe', true,
    'contrat_version', (
      public.clutch_contrat_monetisation_v1() ->> 'version'
    )::integer
  );
end;
$$;

create or replace function public.clutch_equiper_pack_cosmetique_v1(p_pack_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pack_id text := btrim(p_pack_id);
  v_nombre_membres integer;
  v_nombre_possedes integer;
  v_nombre_defaults integer;
  v_nombre_equipes integer;
  v_objets jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  perform private.clutch_verrouiller_catalogue_packs_v1(false);

  perform 1
  from public.packs_cosmetiques p
  where p.id = v_pack_id
  for share;

  if not found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
  end if;

  perform 1
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack_id
  order by m.ordre
  for share;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  if not exists (
    select 1
    from public.inventaire_packs_cosmetiques i
    where i.user_id = v_user
      and i.pack_id = v_pack_id
  ) then
    raise exception 'pack cosmetique non possede : %', p_pack_id
      using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_nombre_membres
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack_id;

  select count(*)::integer
  into v_nombre_possedes
  from public.pack_cosmetique_membres m
  join public.inventaire i
    on i.user_id = v_user
   and i.objet_id = m.objet_id
  where m.pack_id = v_pack_id;

  if v_nombre_membres = 0 then
    raise exception 'pack cosmetique vide : %', p_pack_id
      using errcode = '23514';
  end if;

  if v_nombre_possedes <> v_nombre_membres then
    raise exception 'inventaire du pack incomplet : %/%',
      v_nombre_possedes,
      v_nombre_membres
      using errcode = '23514';
  end if;

  select count(*)::integer
  into v_nombre_defaults
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack_id
    and m.equip_by_default;

  insert into public.equipement (user_id, emplacement, objet_id)
  select v_user, m.emplacement, m.objet_id
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack_id
    and m.equip_by_default
  order by m.ordre
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = pg_catalog.now();

  get diagnostics v_nombre_equipes = row_count;

  if v_nombre_equipes = 0 or v_nombre_equipes <> v_nombre_defaults then
    raise exception 'equipement par defaut du pack incomplet : %/%',
      v_nombre_equipes,
      v_nombre_defaults
      using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(m.objet_id order by m.ordre), '[]'::jsonb)
  into v_objets
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack_id
    and m.equip_by_default;

  return jsonb_build_object(
    'pack_id', v_pack_id,
    'equipe', true,
    'nombre_objets', v_nombre_membres,
    'objets_attribues', v_nombre_possedes,
    'objets_equipes', v_objets,
    'nombre_equipes', v_nombre_equipes,
    'solde', (
      select coalesce(sum(m.montant), 0)::integer
      from public.volts_mouvements m
      where m.user_id = v_user
    ),
    'contrat_version', (
      public.clutch_contrat_monetisation_v1() ->> 'version'
    )::integer
  );
end;
$$;

comment on function public.clutch_pack_cosmetique_v1(text) is
  'Owner-scoped Fnatic/team-pack read model with ordered members, ownership, equipment and Volt affordability.';
comment on function public.clutch_acheter_pack_cosmetique_v1(text) is
  'Authenticated atomic and idempotent Volt pack purchase. One debit grants one permanent entitlement, every declared member and equips the collision-free default subset.';
comment on function public.clutch_equiper_pack_cosmetique_v1(text) is
  'Authenticated atomic equipment of the owned pack members explicitly marked equip_by_default.';

revoke all privileges on function public.clutch_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_acheter_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_pack_cosmetique_v1(text)
to authenticated, service_role;

-- Keep the journal API shape backward-compatible and add a nullable pack link.
create or replace function public.clutch_journal_volts_v1(
  p_limit integer default 30,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_solde integer;
  v_mouvements jsonb;
  v_has_more boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  with candidats as (
    select m.*
    from public.volts_mouvements m
    where m.user_id = v_user
      and (p_before is null or m.cree_le < p_before)
    order by m.cree_le desc, m.id desc
    limit v_limit + 1
  ),
  page as (
    select c.*
    from candidats c
    order by c.cree_le desc, c.id desc
    limit v_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'montant', page.montant,
          'source_economique', page.source_economique,
          'origine', page.origine,
          'reference', page.reference,
          'objet', case
            when objet.id is null then null
            else jsonb_build_object(
              'id', objet.id,
              'nom', objet.nom,
              'emplacement', objet.emplacement
            )
          end,
          'pack', case
            when pack.id is null then null
            else jsonb_build_object(
              'id', pack.id,
              'nom', pack.nom,
              'nombre_objets', pack.nombre_objets
            )
          end,
          'campagne_key', page.campagne_key,
          'date', page.cree_le,
          'cle_idempotence', page.cle_idempotence,
          'solde_apres', page.solde_apres
        )
        order by page.cree_le desc, page.id desc
      ),
      '[]'::jsonb
    ),
    (select count(*) > v_limit from candidats)
  into v_mouvements, v_has_more
  from page
  left join public.objets_catalogue objet on objet.id = page.objet_id
  left join public.packs_cosmetiques pack on pack.id = page.pack_id;

  return jsonb_build_object(
    'solde', v_solde,
    'mouvements', v_mouvements,
    'has_more', coalesce(v_has_more, false),
    'limite', v_limit,
    'integrite', jsonb_build_object(
      'conversion_volts_vers_frags', false,
      'impact_classement', false
    )
  );
end;
$$;

comment on function public.clutch_journal_volts_v1(integer, timestamptz) is
  'Authenticated owner-only Volt ledger. SECURITY INVOKER exposes backward-compatible object/campaign links plus a nullable cosmetic-pack link.';

revoke all privileges on function public.clutch_journal_volts_v1(integer, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_journal_volts_v1(integer, timestamptz)
to authenticated, service_role;

do $$
declare
  v_contract constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if (v_contract ->> 'version')::integer <> 5
     or v_contract ->> 'code' <> 'identity_showcase_team_packs_v5'
     or (v_contract #>> '{catalogue,schema_version}')::integer <> 5
     or jsonb_array_length(v_contract #> '{catalogue,emplacements}') <> 10
     or not ((v_contract #> '{catalogue,sources}') ? 'team_pack')
     or not coalesce((v_contract #>> '{paiements,packs_volts_actifs}')::boolean, false)
     or not coalesce((v_contract #>> '{paiements,packs_volts,equipement_a_l_achat}')::boolean, false)
     or coalesce((v_contract #>> '{catalogue,objets_aleatoires_payants}')::boolean, true)
     or coalesce((v_contract #>> '{catalogue,effets_competitifs}')::boolean, true)
  then
    raise exception 'contrat de packs cosmetiques v5 incomplet';
  end if;

  if not exists (
    select 1
    from public.packs_cosmetiques p
    where p.id = 'fnatic-black-orange'
      and p.prix_volts = 1200
      and p.nombre_objets = 12
      and p.actif
      and p.statut_publication = 'publie'
      and p.marque_key = 'fnatic'
      and p.licence ->> 'titulaire' = 'Fnatic'
  ) then
    raise exception 'pack Fnatic publie incomplet';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.collection_key = 'fnatic-black-orange'
      and o.source = 'team_pack'
      and o.prix = 0
      and o.actif
      and o.statut_publication = 'publie'
      and o.licence ->> 'titulaire' = 'Fnatic'
  ) <> 12 then
    raise exception 'catalogue Fnatic incomplet';
  end if;

  if (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
  ) <> 12
     or (
    select count(*)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.equip_by_default
  ) <> 8
     or (
    select count(distinct m.emplacement)
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.equip_by_default
  ) <> 8
  then
    raise exception 'membres ou defaults du pack Fnatic incoherents';
  end if;

  if not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.objet_id = 'fnatic-room-lighting'
      and m.emplacement = 'vitrine_eclairage'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.objet_id = 'fnatic-pedestals'
      and m.emplacement = 'vitrine_supports'
      and m.equip_by_default
  ) or not exists (
    select 1
    from public.pack_cosmetique_membres m
    where m.pack_id = 'fnatic-black-orange'
      and m.objet_id = 'fnatic-supporter-badge'
      and m.emplacement = 'apparence_core'
      and not m.equip_by_default
  ) then
    raise exception 'mapping des slots Fnatic incoherent';
  end if;

  if private.clutch_source_economique_volts_v1('achat') <> 'achat_cosmetique'
     or private.clutch_source_economique_volts_v1('achat_pack') <> 'achat_pack_cosmetique'
  then
    raise exception 'mapping du ledger Volt incompatible';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and t.tgname in (
        'packs_cosmetiques_mutation_lock_v1',
        'pack_cosmetique_membres_mutation_lock_v1',
        'packs_cosmetiques_immutabilite_v1',
        'pack_cosmetique_membres_immutabilite_v1'
      )
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) <> 4 then
    raise exception 'verrous editoriaux ou immutabilite des packs incomplets';
  end if;

  if has_table_privilege('anon', 'public.packs_cosmetiques', 'SELECT')
     or has_table_privilege('authenticated', 'public.packs_cosmetiques', 'INSERT')
     or has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'UPDATE')
     or has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'INSERT')
     or not has_table_privilege('authenticated', 'public.packs_cosmetiques', 'SELECT')
     or not has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege(
       'authenticated',
       'private.clutch_assert_pack_cosmetique_acquerable_v1(text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'private.clutch_verrouiller_catalogue_packs_v1(boolean)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'private.clutch_garder_pack_immuable_v1()',
       'EXECUTE'
     )
  then
    raise exception 'privileges des packs cosmetiques incoherents';
  end if;
end;
$$;

commit;
