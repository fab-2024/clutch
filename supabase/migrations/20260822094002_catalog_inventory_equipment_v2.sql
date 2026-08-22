-- Monetization phase 1.2 -- evolve the existing cosmetic catalogue, inventory,
-- equipment and Volt ledger without duplicating any of them.
--
-- The four launch families map onto the approved UI slots:
--   cadre_profil  -> cadre_avatar
--   carte_profil  -> banniere
--   titre_profil  -> titre_supporter
--   effet_faction -> signature_relique
-- apparence_core remains an approved Clutch extension.

alter table public.objets_catalogue
  add column if not exists famille text,
  add column if not exists equipe_id text,
  add column if not exists marque_key text,
  add column if not exists campagne_key text,
  add column if not exists saison_id text,
  add column if not exists collection_key text not null default 'origine',
  add column if not exists source text not null default 'gratuit',
  add column if not exists disponible_du timestamptz,
  add column if not exists disponible_au timestamptz,
  add column if not exists statut_publication text not null default 'brouillon',
  add column if not exists licence jsonb not null
    default '{"type":"interne","titulaire":"Clutch"}'::jsonb,
  add column if not exists est_inclus boolean not null default false;

update public.objets_catalogue
set famille = case emplacement
      when 'cadre_profil' then 'cadre_avatar'
      when 'carte_profil' then 'banniere'
      when 'titre_profil' then 'titre_supporter'
      when 'effet_faction' then 'signature_relique'
      when 'apparence_core' then 'core_clutch'
      else null
    end,
    collection_key = case when style_key is null then 'legacy-room' else 'origine' end,
    source = case when prix > 0 then 'achat' else 'gratuit' end,
    statut_publication = case when style_key is null then 'retire' else 'publie' end,
    licence = '{"type":"interne","titulaire":"Clutch"}'::jsonb,
    est_inclus = style_key is not null and niveau = 1 and prix = 0;

-- The historical uniqueness limited every slot to four objects. Collections
-- need to support several objects at the same presentation tier.
alter table public.objets_catalogue
  drop constraint if exists objets_catalogue_emplacement_niveau_key,
  drop constraint if exists objets_catalogue_check;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_famille_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_famille_check
      check (
        famille is null
        or famille in (
          'cadre_avatar',
          'banniere',
          'titre_supporter',
          'signature_relique',
          'core_clutch'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_source_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_source_check
      check (source in ('gratuit', 'mission', 'partenaire', 'achat', 'founder_pack'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_source_prix_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_source_prix_check
      check (
        (source = 'achat' and prix > 0)
        or (source <> 'achat' and prix = 0)
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_publication_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_publication_check
      check (statut_publication in ('brouillon', 'publie', 'retire'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_publication_complete_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_publication_complete_check
      check (
        statut_publication <> 'publie'
        or (
          actif
          and style_key is not null
          and famille is not null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_disponibilite_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_disponibilite_check
      check (
        disponible_du is null
        or disponible_au is null
        or disponible_au > disponible_du
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_collection_key_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_collection_key_check
      check (collection_key ~ '^[a-z0-9][a-z0-9-]{1,63}$');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_association_keys_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_association_keys_check
      check (
        (marque_key is null or marque_key ~ '^[a-z0-9][a-z0-9-]{1,63}$')
        and (campagne_key is null or campagne_key ~ '^[a-z0-9][a-z0-9-]{1,63}$')
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_licence_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_licence_check
      check (
        jsonb_typeof(licence) = 'object'
        and coalesce(nullif(btrim(licence ->> 'type'), ''), '') <> ''
        and coalesce(nullif(btrim(licence ->> 'titulaire'), ''), '') <> ''
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_inclus_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_inclus_check
      check (
        not est_inclus
        or (
          source = 'gratuit'
          and prix = 0
          and statut_publication = 'publie'
          and actif
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_equipe_id_fkey'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_equipe_id_fkey
      foreign key (equipe_id)
      references public.equipes(id)
      on update cascade
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_saison_id_fkey'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_saison_id_fkey
      foreign key (saison_id)
      references public.saisons(id)
      on update cascade
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_id_emplacement_key'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_id_emplacement_key
      unique (id, emplacement);
  end if;
end;
$$;

alter table public.equipement
  drop constraint if exists equipement_objet_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.equipement'::regclass
      and conname = 'equipement_objet_emplacement_fkey'
  ) then
    alter table public.equipement
      add constraint equipement_objet_emplacement_fkey
      foreign key (objet_id, emplacement)
      references public.objets_catalogue(id, emplacement)
      on update cascade;
  end if;
end;
$$;

create unique index if not exists objets_catalogue_inclus_emplacement_uidx
  on public.objets_catalogue (emplacement)
  where est_inclus;

create index if not exists objets_catalogue_collection_idx
  on public.objets_catalogue (collection_key, famille, niveau);

create index if not exists objets_catalogue_publication_idx
  on public.objets_catalogue (emplacement, niveau, disponible_du, disponible_au)
  where actif and statut_publication = 'publie';

create index if not exists objets_catalogue_equipe_idx
  on public.objets_catalogue (equipe_id)
  where equipe_id is not null;

create index if not exists objets_catalogue_saison_idx
  on public.objets_catalogue (saison_id)
  where saison_id is not null;

create index if not exists objets_catalogue_marque_idx
  on public.objets_catalogue (marque_key)
  where marque_key is not null;

create index if not exists objets_catalogue_campagne_idx
  on public.objets_catalogue (campagne_key)
  where campagne_key is not null;

create index if not exists inventaire_objet_id_idx
  on public.inventaire (objet_id);

create index if not exists equipement_objet_emplacement_idx
  on public.equipement (objet_id, emplacement);

comment on column public.objets_catalogue.famille is
  'Product family. The four launch families are avatar frame, banner, supporter title and relic signature; core_clutch is an approved extension.';
comment on column public.objets_catalogue.source is
  'Acquisition channel: gratuit, mission, partenaire, achat or founder_pack.';
comment on column public.objets_catalogue.disponible_du is
  'Start of the acquisition window. Ownership never starts or expires from this value.';
comment on column public.objets_catalogue.disponible_au is
  'End of the acquisition window. Already-owned items remain usable after this value.';
comment on column public.objets_catalogue.statut_publication is
  'Editorial state. Retiring an item only removes new acquisition; it never removes ownership.';
comment on column public.objets_catalogue.licence is
  'Licence metadata. type and titulaire are mandatory; references and territories can be added without schema churn.';
comment on column public.objets_catalogue.est_inclus is
  'Exactly one permanent included default may exist per application slot.';

create or replace function public.clutch_contrat_monetisation_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'code', 'identity_only_v1',
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
      'actifs', false,
      'biens_numeriques_via_stores', true
    ),
    'regles', jsonb_build_array(
      jsonb_build_object(
        'id', 'competitive-integrity',
        'label', 'FRAGS INACHETABLES',
        'detail', 'Le rating, le rang et les résultats de Calls ne s’achètent jamais.'
      ),
      jsonb_build_object(
        'id', 'cosmetics-only',
        'label', 'VOLTS COSMÉTIQUES',
        'detail', 'Les Volts ne débloquent que des éléments d’identité visuelle.'
      ),
      jsonb_build_object(
        'id', 'no-randomness',
        'label', 'AUCUNE LOOT BOX',
        'detail', 'Chaque objet obtenu est connu avant la dépense.'
      ),
      jsonb_build_object(
        'id', 'permanent-ownership',
        'label', 'OBJETS PERMANENTS',
        'detail', 'Un objet possédé ne peut pas expirer.'
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

create or replace function private.clutch_famille_cosmetique_v2(p_emplacement text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select public.clutch_contrat_monetisation_v1()
    #>> array['catalogue', 'familles_par_emplacement', btrim(p_emplacement)];
$$;

create or replace function private.clutch_assert_objet_cosmetique_v2(p_objet_id text)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_item public.objets_catalogue%rowtype;
begin
  select o.*
  into v_item
  from public.objets_catalogue o
  where o.id = btrim(p_objet_id);

  if not found
     or v_item.style_key is null
     or not private.clutch_emplacement_cosmetique_v1(v_item.emplacement)
     or v_item.famille is distinct from private.clutch_famille_cosmetique_v2(v_item.emplacement)
  then
    raise exception 'cosmetique invalide : %', p_objet_id using errcode = 'P0002';
  end if;

  perform private.clutch_assert_acquisition_cosmetique_v1(
    v_item.emplacement,
    v_item.prix,
    false,
    null::timestamptz,
    false
  );
end;
$$;

create or replace function private.clutch_assert_objet_acquerable_v2(p_objet_id text)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_item public.objets_catalogue%rowtype;
begin
  perform private.clutch_assert_objet_cosmetique_v2(p_objet_id);

  select o.*
  into strict v_item
  from public.objets_catalogue o
  where o.id = btrim(p_objet_id);

  if v_item.est_inclus then
    return;
  end if;

  if v_item.source <> 'achat' then
    raise exception 'objet attribue via % : achat Volt interdit', v_item.source
      using errcode = 'P0001';
  end if;

  if not v_item.actif
     or v_item.statut_publication <> 'publie'
     or (v_item.disponible_du is not null and v_item.disponible_du > pg_catalog.now())
     or (v_item.disponible_au is not null and v_item.disponible_au <= pg_catalog.now())
  then
    raise exception 'cosmetique indisponible : %', p_objet_id using errcode = 'P0002';
  end if;
end;
$$;

revoke all privileges on function private.clutch_famille_cosmetique_v2(text)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_assert_objet_cosmetique_v2(text)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_assert_objet_acquerable_v2(text)
from public, anon, authenticated, service_role;

create or replace function private.clutch_cosmetiques_equipes_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with categories(emplacement) as (
    select slot.value
    from jsonb_array_elements_text(
      public.clutch_contrat_monetisation_v1() #> '{catalogue,emplacements}'
    ) as slot(value)
  )
  select coalesce(
    jsonb_object_agg(
      c.emplacement,
      jsonb_build_object(
        'id', coalesce(chosen.id, defaults.id),
        'emplacement', c.emplacement,
        'famille', coalesce(chosen.famille, defaults.famille),
        'niveau', coalesce(chosen.niveau, defaults.niveau),
        'nom', coalesce(chosen.nom, defaults.nom),
        'description', coalesce(chosen.description, defaults.description),
        'rarete', coalesce(chosen.rarete, defaults.rarete),
        'style_key', coalesce(chosen.style_key, defaults.style_key),
        'accent', coalesce(chosen.accent, defaults.accent),
        'collection_key', coalesce(chosen.collection_key, defaults.collection_key),
        'source', coalesce(chosen.source, defaults.source),
        'equipe_id', coalesce(chosen.equipe_id, defaults.equipe_id),
        'marque_key', coalesce(chosen.marque_key, defaults.marque_key),
        'campagne_key', coalesce(chosen.campagne_key, defaults.campagne_key),
        'saison_id', coalesce(chosen.saison_id, defaults.saison_id),
        'licence', coalesce(chosen.licence, defaults.licence)
      )
      order by c.emplacement
    ),
    '{}'::jsonb
  )
  from categories c
  join public.objets_catalogue defaults
    on defaults.emplacement = c.emplacement
   and defaults.est_inclus
   and defaults.statut_publication = 'publie'
  left join public.equipement equipped
    on equipped.user_id = p_user
   and equipped.emplacement = c.emplacement
  left join public.objets_catalogue chosen
    on chosen.id = equipped.objet_id
   and chosen.emplacement = c.emplacement;
$$;

revoke all privileges on function private.clutch_cosmetiques_equipes_v1(uuid)
from public, anon, authenticated, service_role;

create or replace function public.clutch_boutique_cosmetique_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_solde integer;
  v_objets jsonb;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
  v_emplacements text[];
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select array_agg(slot.value)
  into v_emplacements
  from jsonb_array_elements_text(v_contrat #> '{catalogue,emplacements}') as slot(value);

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
        'niveau', o.niveau,
        'nom', o.nom,
        'description', o.description,
        'rarete', o.rarete,
        'style_key', o.style_key,
        'accent', o.accent,
        'prix', o.prix,
        'collection_key', o.collection_key,
        'source', o.source,
        'equipe_associee', case
          when team.id is null then null
          else jsonb_build_object(
            'id', team.id,
            'nom', team.nom,
            'tag', team.tag,
            'logo', team.logo
          )
        end,
        'marque_key', o.marque_key,
        'campagne_key', o.campagne_key,
        'saison_id', o.saison_id,
        'disponible_du', o.disponible_du,
        'disponible_au', o.disponible_au,
        'statut_publication', o.statut_publication,
        'licence', o.licence,
        'est_inclus', o.est_inclus,
        'disponible', (
          o.actif
          and o.statut_publication = 'publie'
          and (o.disponible_du is null or o.disponible_du <= pg_catalog.now())
          and (o.disponible_au is null or o.disponible_au > pg_catalog.now())
        ),
        'acquerable', (
          o.est_inclus
          or owned.objet_id is not null
          or (
            o.source = 'achat'
            and o.actif
            and o.statut_publication = 'publie'
            and (o.disponible_du is null or o.disponible_du <= pg_catalog.now())
            and (o.disponible_au is null or o.disponible_au > pg_catalog.now())
          )
        ),
        'possede', o.est_inclus or owned.objet_id is not null,
        'equipe', equipped.objet_id = o.id
          or (equipped.objet_id is null and o.est_inclus)
      )
      order by
        array_position(v_emplacements, o.emplacement),
        o.collection_key,
        o.niveau,
        o.nom
    ),
    '[]'::jsonb
  )
  into v_objets
  from public.objets_catalogue o
  left join public.inventaire owned
    on owned.user_id = v_user
   and owned.objet_id = o.id
  left join public.equipement equipped
    on equipped.user_id = v_user
   and equipped.emplacement = o.emplacement
  left join public.equipes team
    on team.id = o.equipe_id
  where o.style_key is not null
    and private.clutch_emplacement_cosmetique_v1(o.emplacement)
    and (
      o.est_inclus
      or owned.objet_id is not null
      or (
        o.actif
        and o.statut_publication = 'publie'
        and (o.disponible_du is null or o.disponible_du <= pg_catalog.now())
        and (o.disponible_au is null or o.disponible_au > pg_catalog.now())
      )
    );

  return jsonb_build_object(
    'solde', v_solde,
    'objets', v_objets,
    'equipes', private.clutch_cosmetiques_equipes_v1(v_user),
    'contrat', v_contrat
  );
end;
$$;

create or replace function public.clutch_acheter_cosmetique_v1(p_objet_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.objets_catalogue%rowtype;
  v_solde integer;
  v_deja_possede boolean;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select o.*
  into v_item
  from public.objets_catalogue o
  where o.id = btrim(p_objet_id);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  perform private.clutch_assert_objet_cosmetique_v2(v_item.id);

  select exists (
    select 1
    from public.inventaire i
    where i.user_id = v_user
      and i.objet_id = v_item.id
  )
  into v_deja_possede;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  if not v_item.est_inclus and not v_deja_possede then
    perform private.clutch_assert_objet_acquerable_v2(v_item.id);

    if v_solde < v_item.prix then
      raise exception 'solde insuffisant : % Volts requis, % disponibles', v_item.prix, v_solde
        using errcode = 'P0001';
    end if;

    insert into public.volts_mouvements (user_id, montant, origine, reference)
    values (v_user, -v_item.prix, 'achat', v_item.id);

    insert into public.inventaire (user_id, objet_id)
    values (v_user, v_item.id);

    v_solde := v_solde - v_item.prix;
  end if;

  insert into public.equipement (user_id, emplacement, objet_id)
  values (v_user, v_item.emplacement, v_item.id)
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = pg_catalog.now();

  return jsonb_build_object(
    'objet', v_item.id,
    'emplacement', v_item.emplacement,
    'famille', v_item.famille,
    'nom', v_item.nom,
    'prix', case when v_deja_possede or v_item.est_inclus then 0 else v_item.prix end,
    'solde', v_solde,
    'achete', not v_item.est_inclus and not v_deja_possede,
    'equipe', true,
    'source', v_item.source,
    'collection_key', v_item.collection_key,
    'contrat_version', (v_contrat ->> 'version')::integer
  );
exception
  when unique_violation then
    raise exception 'achat deja traite : %', p_objet_id using errcode = 'P0001';
end;
$$;

create or replace function public.clutch_equiper_cosmetique_v1(p_objet_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.objets_catalogue%rowtype;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select o.*
  into v_item
  from public.objets_catalogue o
  where o.id = btrim(p_objet_id);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  perform private.clutch_assert_objet_cosmetique_v2(v_item.id);

  if not v_item.est_inclus and not exists (
    select 1
    from public.inventaire i
    where i.user_id = v_user
      and i.objet_id = v_item.id
  ) then
    raise exception 'cosmetique non possede : %', p_objet_id using errcode = 'P0001';
  end if;

  insert into public.equipement (user_id, emplacement, objet_id)
  values (v_user, v_item.emplacement, v_item.id)
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = pg_catalog.now();

  return jsonb_build_object(
    'objet', v_item.id,
    'emplacement', v_item.emplacement,
    'famille', v_item.famille,
    'solde', (
      select coalesce(sum(m.montant), 0)::integer
      from public.volts_mouvements m
      where m.user_id = v_user
    ),
    'equipe', true,
    'source', v_item.source,
    'collection_key', v_item.collection_key,
    'contrat_version', (v_contrat ->> 'version')::integer
  );
end;
$$;

comment on function public.clutch_acheter_cosmetique_v1(text) is
  'Intentional authenticated SECURITY DEFINER API. It locks one user economy, validates publication/source/availability and performs one idempotent Volt debit plus permanent ownership.';
comment on function public.clutch_equiper_cosmetique_v1(text) is
  'Intentional authenticated SECURITY DEFINER API. It derives the owner from auth.uid(), accepts only included or permanently-owned cosmetics and preserves retired items.';
comment on function public.clutch_boutique_cosmetique_v1() is
  'Authenticated collection catalogue with commercial metadata, private inventory, equipped cosmetics and Volt balance.';

revoke all privileges on function public.clutch_boutique_cosmetique_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_cosmetique_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_boutique_cosmetique_v1()
to authenticated, service_role;
grant execute on function public.clutch_acheter_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_cosmetique_v1(text)
to authenticated, service_role;

-- Replace legacy PUBLIC policies with explicit role-scoped policies.
alter table public.objets_catalogue enable row level security;
alter table public.inventaire enable row level security;
alter table public.equipement enable row level security;
alter table public.volts_mouvements enable row level security;

drop policy if exists catalogue_admin on public.objets_catalogue;
drop policy if exists catalogue_lecture on public.objets_catalogue;
drop policy if exists catalogue_lecture_v2 on public.objets_catalogue;
create policy catalogue_lecture_v2
  on public.objets_catalogue
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
      from public.inventaire i
      where i.user_id = (select auth.uid())
        and i.objet_id = objets_catalogue.id
    )
  );

drop policy if exists inventaire_lecture on public.inventaire;
drop policy if exists inventaire_lecture_v2 on public.inventaire;
create policy inventaire_lecture_v2
  on public.inventaire
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists equipement_lecture on public.equipement;
drop policy if exists equipement_lecture_v2 on public.equipement;
create policy equipement_lecture_v2
  on public.equipement
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.clutch_est_colistier(user_id)
  );

drop policy if exists volts_lecture on public.volts_mouvements;
drop policy if exists volts_lecture_v2 on public.volts_mouvements;
create policy volts_lecture_v2
  on public.volts_mouvements
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.objets_catalogue
from public, anon, authenticated, service_role;
revoke all privileges on table public.inventaire
from public, anon, authenticated, service_role;
revoke all privileges on table public.equipement
from public, anon, authenticated, service_role;
revoke all privileges on table public.volts_mouvements
from public, anon, authenticated, service_role;

grant select on table public.objets_catalogue
to authenticated;
grant select on table public.inventaire
to authenticated;
grant select on table public.equipement
to authenticated;
grant select on table public.volts_mouvements
to authenticated;

grant select, insert, update, delete on table public.objets_catalogue
to service_role;
grant select, insert, update, delete on table public.inventaire
to service_role;
grant select, insert, update, delete on table public.equipement
to service_role;
grant select, insert, update, delete on table public.volts_mouvements
to service_role;

comment on table public.inventaire is
  'Permanent ownership ledger. No expiry column by design; catalogue retirement never deletes an acquired item.';
comment on table public.equipement is
  'One cosmetic per application slot. Composite FK guarantees that the object belongs to the recorded slot.';
comment on table public.volts_mouvements is
  'Append-only economic ledger. Authenticated clients have read-only owner access; all writes use reviewed RPCs.';

do $$
declare
  v_contract constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if (v_contract #>> '{catalogue,schema_version}')::integer <> 2
     or jsonb_array_length(v_contract #> '{catalogue,familles_initiales}') <> 4
     or v_contract #>> '{catalogue,familles_par_emplacement,carte_profil}' <> 'banniere'
     or v_contract #>> '{catalogue,familles_par_emplacement,effet_faction}' <> 'signature_relique'
  then
    raise exception 'Catalogue contract v2 is incomplete';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.style_key is not null
      and o.statut_publication = 'publie'
      and o.famille is not null
      and o.collection_key = 'origine'
      and o.licence ->> 'titulaire' = 'Clutch'
  ) <> 20 then
    raise exception 'Existing cosmetic catalogue metadata migration failed';
  end if;

  if (
    select count(*)
    from public.objets_catalogue o
    where o.est_inclus
  ) <> 5
     or exists (
       select 1
       from jsonb_array_elements_text(v_contract #> '{catalogue,emplacements}') slot(value)
       where not exists (
         select 1
         from public.objets_catalogue o
         where o.emplacement = slot.value
           and o.est_inclus
       )
     )
  then
    raise exception 'Each approved application slot requires one included default';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_emplacement_niveau_key'
  )
     or not exists (
       select 1
       from pg_catalog.pg_constraint
       where conrelid = 'public.equipement'::regclass
         and conname = 'equipement_objet_emplacement_fkey'
     )
  then
    raise exception 'Collection scale or equipment slot constraints are missing';
  end if;

  if has_table_privilege('anon', 'public.objets_catalogue', 'SELECT')
     or has_table_privilege('anon', 'public.inventaire', 'SELECT')
     or has_table_privilege('authenticated', 'public.objets_catalogue', 'INSERT')
     or has_table_privilege('authenticated', 'public.inventaire', 'INSERT')
     or has_table_privilege('authenticated', 'public.equipement', 'UPDATE')
     or has_table_privilege('authenticated', 'public.volts_mouvements', 'INSERT')
     or not has_table_privilege('authenticated', 'public.objets_catalogue', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire', 'SELECT')
     or not has_table_privilege('service_role', 'public.objets_catalogue', 'INSERT')
  then
    raise exception 'Collection Data API grants are not least privilege';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (
        'objets_catalogue',
        'inventaire',
        'equipement',
        'volts_mouvements'
      )
      and p.roles <> array['authenticated']::name[]
  ) then
    raise exception 'Collection RLS policies must target authenticated explicitly';
  end if;

  if has_function_privilege('authenticated', 'private.clutch_famille_cosmetique_v2(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_assert_objet_cosmetique_v2(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_assert_objet_acquerable_v2(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
  then
    raise exception 'Collection RPC grants are inconsistent';
  end if;
end;
$$;
