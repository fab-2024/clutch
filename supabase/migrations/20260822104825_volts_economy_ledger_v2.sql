-- Monetization phase 3.1 / 3.2 — Volt economy and audit ledger.
--
-- Turn the existing Volt movements table into an auditable, append-only
-- economic ledger. The balance remains derived from the ledger, but every row
-- now records its normalized source, idempotency key and resulting balance.
-- Free acquisition and cosmetic spending stay isolated from Frags and every
-- competitive table.

alter table public.volts_mouvements
  add column if not exists source_economique text,
  add column if not exists objet_id text,
  add column if not exists campagne_key text,
  add column if not exists cle_idempotence text,
  add column if not exists solde_apres integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
    when 'ajustement' then 'ajustement'
    else null
  end;
$$;

revoke all privileges on function private.clutch_source_economique_volts_v1(text)
from public, anon, authenticated, service_role;

-- Backfill remains deterministic for projects that already contain movements.
update public.volts_mouvements m
set source_economique = private.clutch_source_economique_volts_v1(m.origine),
    objet_id = case
      when m.origine = 'achat'
       and exists (
         select 1
         from public.objets_catalogue o
         where o.id = m.reference
       )
      then m.reference
      else null
    end,
    campagne_key = case
      when m.origine = 'activation' then m.reference
      else null
    end,
    cle_idempotence = m.origine || ':' || m.reference,
    metadata = coalesce(m.metadata, '{}'::jsonb);

with running_balance as (
  select
    m.id,
    sum(m.montant) over (
      partition by m.user_id
      order by m.cree_le, m.id
      rows between unbounded preceding and current row
    )::integer as solde
  from public.volts_mouvements m
)
update public.volts_mouvements m
set solde_apres = running_balance.solde
from running_balance
where running_balance.id = m.id;

alter table public.volts_mouvements
  alter column source_economique set not null,
  alter column cle_idempotence set not null,
  alter column solde_apres set not null;

alter table public.volts_mouvements
  drop constraint if exists volts_mouvements_origine_check,
  drop constraint if exists volts_mouvements_source_economique_check,
  drop constraint if exists volts_mouvements_sens_check,
  drop constraint if exists volts_mouvements_objet_check,
  drop constraint if exists volts_mouvements_activation_check,
  drop constraint if exists volts_mouvements_cle_idempotence_check,
  drop constraint if exists volts_mouvements_campagne_key_check,
  drop constraint if exists volts_mouvements_metadata_check,
  drop constraint if exists volts_mouvements_solde_apres_check,
  drop constraint if exists volts_mouvements_objet_id_fkey;

alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
    check (origine in (
      'badge',
      'saison',
      'call',
      'achat',
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
      or (source_economique = 'achat_cosmetique' and montant < 0)
      or (source_economique = 'ajustement' and montant <> 0)
    ),
  add constraint volts_mouvements_objet_check
    check (
      (source_economique = 'achat_cosmetique' and objet_id is not null)
      or (source_economique <> 'achat_cosmetique' and objet_id is null)
    ),
  add constraint volts_mouvements_activation_check
    check (source_economique <> 'activation' or campagne_key is not null),
  add constraint volts_mouvements_cle_idempotence_check
    check (
      cle_idempotence = btrim(cle_idempotence)
      and char_length(cle_idempotence) between 3 and 240
    ),
  add constraint volts_mouvements_campagne_key_check
    check (
      campagne_key is null
      or campagne_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'
    ),
  add constraint volts_mouvements_metadata_check
    check (jsonb_typeof(metadata) = 'object'),
  add constraint volts_mouvements_solde_apres_check
    check (solde_apres >= 0),
  add constraint volts_mouvements_objet_id_fkey
    foreign key (objet_id) references public.objets_catalogue(id);

create unique index if not exists volts_mouvements_idempotence_idx
  on public.volts_mouvements (user_id, cle_idempotence);

create index if not exists volts_mouvements_source_idx
  on public.volts_mouvements (user_id, source_economique, cree_le desc);

create or replace function private.clutch_preparer_mouvement_volts_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_solde integer;
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
    perform private.clutch_assert_objet_acquerable_v2(new.objet_id);
  elsif new.objet_id is not null then
    raise exception 'un objet ne peut etre lie qu a une depense cosmetique'
      using errcode = '23514';
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

drop trigger if exists volts_preparer_mouvement_v2 on public.volts_mouvements;
create trigger volts_preparer_mouvement_v2
before insert on public.volts_mouvements
for each row execute function private.clutch_preparer_mouvement_volts_v2();

create or replace function private.clutch_refuser_modification_volts_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'le journal Volts est immuable' using errcode = '55000';
end;
$$;

revoke all privileges on function private.clutch_refuser_modification_volts_v2()
from public, anon, authenticated, service_role;

drop trigger if exists volts_refuser_modification_v2 on public.volts_mouvements;
create trigger volts_refuser_modification_v2
before update on public.volts_mouvements
for each row execute function private.clutch_refuser_modification_volts_v2();

-- Existing reward paths keep their four-argument contract. The insert trigger
-- enriches them and serializes concurrent writes. Only trusted server code may
-- call this primitive.
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
  if v_origine in ('achat', 'ajustement') then
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
  'Trusted idempotent reward primitive. It can only create positive free-source movements and never touches Frags or ranking.';

revoke all privileges on function public.clutch_crediter_volts(uuid, integer, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_crediter_volts(uuid, integer, text, text)
to service_role;

-- Public, versioned economy contract. Exceptional rewards are intentionally
-- excluded from recurring income simulations.
create or replace function public.clutch_contrat_economie_volts_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'devise', 'volts',
    'sources', jsonb_build_object(
      'onboarding', jsonb_build_object(
        'montant', 300,
        'frequence', 'une_fois'
      ),
      'progression', jsonb_build_object(
        'montant_min', 40,
        'montant_max', 120,
        'plafond_mensuel_cible', 600
      ),
      'mission', jsonb_build_object(
        'montant_min', 60,
        'montant_max', 150,
        'plafond_mensuel_cible', 900
      ),
      'activation', jsonb_build_object(
        'montant_min', 100,
        'montant_max', 180,
        'plafond_mensuel_cible', 360,
        'condition', 'participation_uniquement'
      ),
      'exceptionnelle', jsonb_build_object(
        'montant_min', 50,
        'montant_max', 500,
        'incluse_dans_revenu_recurrent', false
      )
    ),
    'depenses', jsonb_build_object(
      'destinations', jsonb_build_array(
        'cadre_profil',
        'carte_profil',
        'titre_profil',
        'effet_faction',
        'collection_limitee'
      ),
      'paliers_prix', jsonb_build_object(
        'entree', jsonb_build_array(250, 500),
        'signature', jsonb_build_array(600, 1200),
        'prestige', jsonb_build_array(1500, 2400),
        'collector', jsonb_build_array(2400, 4200)
      )
    ),
    'garde_fous', jsonb_build_object(
      'conversion_volts_vers_frags', false,
      'impact_classement', false,
      'solde_negatif', false,
      'ecriture_client', false,
      'depense_aleatoire', false,
      'depense_competitive', false
    ),
    'profils_simules', jsonb_build_array(
      jsonb_build_object(
        'id', 'occasionnel',
        'revenu_mensuel', 450,
        'budget_depense_cible', 750
      ),
      jsonb_build_object(
        'id', 'engage',
        'revenu_mensuel', 900,
        'budget_depense_cible', 1200
      ),
      jsonb_build_object(
        'id', 'core',
        'revenu_mensuel', 1600,
        'budget_depense_cible', 2200
      )
    )
  );
$$;

create or replace function public.clutch_simuler_economie_volts_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with prix as (
    select
      coalesce(min(o.prix) filter (where o.prix > 0), 250)::integer as entree,
      coalesce(
        percentile_disc(0.5) within group (order by o.prix)
          filter (where o.prix > 0),
        900
      )::integer as median,
      coalesce(
        percentile_disc(0.75) within group (order by o.prix)
          filter (where o.prix > 0),
        1500
      )::integer as prestige,
      coalesce(max(o.prix) filter (where o.prix > 0), 2200)::integer as maximum,
      count(*) filter (where o.prix > 0)::integer as objets_payants
    from public.objets_catalogue o
    where o.source = 'achat'
      and o.style_key is not null
      and private.clutch_emplacement_cosmetique_v1(o.emplacement)
  ),
  profils(id, revenu_mensuel, budget_depense_cible) as (
    values
      ('occasionnel'::text, 450::numeric, 750::numeric),
      ('engage'::text, 900::numeric, 1200::numeric),
      ('core'::text, 1600::numeric, 2200::numeric)
  )
  select jsonb_build_object(
    'version', 1,
    'hypothese', 'revenus recurrents hors onboarding et recompenses exceptionnelles',
    'catalogue', jsonb_build_object(
      'objets_payants', prix.objets_payants,
      'prix_entree', prix.entree,
      'prix_median', prix.median,
      'prix_prestige', prix.prestige,
      'prix_maximum', prix.maximum
    ),
    'profils', (
      select jsonb_agg(
        jsonb_build_object(
          'id', profils.id,
          'revenu_mensuel', profils.revenu_mensuel::integer,
          'jours_premier_objet', ceil(prix.entree * 30 / profils.revenu_mensuel)::integer,
          'mois_objet_median', round(prix.median / profils.revenu_mensuel, 2),
          'mois_objet_prestige', round(prix.prestige / profils.revenu_mensuel, 2),
          'ratio_revenu_sur_depense_cible', round(
            profils.revenu_mensuel / profils.budget_depense_cible,
            2
          ),
          'inflation_sous_controle',
            profils.revenu_mensuel / profils.budget_depense_cible <= 0.80
        )
        order by profils.revenu_mensuel
      )
      from profils
    ),
    'garde_fous', jsonb_build_object(
      'premier_objet_max_jours', 21,
      'ratio_revenu_sur_depense_cible_max', 0.80,
      'conversion_volts_vers_frags', false,
      'impact_classement', false
    )
  )
  from prix;
$$;

comment on function public.clutch_contrat_economie_volts_v1() is
  'Versioned Volt source, sink and integrity contract for monetization phase 3.1.';
comment on function public.clutch_simuler_economie_volts_v1() is
  'Deterministic economy smoke simulation using the currently published cosmetic catalogue.';

revoke all privileges on function public.clutch_contrat_economie_volts_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_simuler_economie_volts_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_economie_volts_v1()
to anon, authenticated, service_role;
grant execute on function public.clutch_simuler_economie_volts_v1()
to anon, authenticated, service_role;

create or replace function public.clutch_journal_volts_v1(
  p_limit integer default 30,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
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
  left join public.objets_catalogue objet on objet.id = page.objet_id;

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
  'Authenticated owner-only Volt ledger with source, linked object/campaign, idempotency key and resulting balance.';

revoke all privileges on function public.clutch_journal_volts_v1(integer, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_journal_volts_v1(integer, timestamptz)
to authenticated, service_role;

-- Complete onboarding atomically and award the one-time free source. Repeating
-- the RPC updates preferences but never credits the 300 Volts twice.
create or replace function public.clutch_terminer_onboarding_v1(
  p_jeux text[],
  p_equipe_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_jeux text[];
  v_equipe_id text := btrim(p_equipe_id);
  v_credite boolean;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(array_agg(distinct jeu order by jeu), '{}'::text[])
  into v_jeux
  from unnest(coalesce(p_jeux, '{}'::text[])) as jeu
  where jeu = any(array['lol', 'cs2', 'valorant']::text[]);

  if cardinality(v_jeux) = 0 then
    raise exception 'selectionne au moins un jeu' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.equipes e
    where e.id = v_equipe_id
      and e.jeu = any(v_jeux)
  ) then
    raise exception 'equipe incompatible avec les jeux suivis' using errcode = '22023';
  end if;

  update public.profils p
  set jeux_suivis = v_jeux,
      equipe_favorite_id = v_equipe_id
  where p.id = v_user;

  if not found then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;

  v_credite := public.clutch_crediter_volts(
    v_user,
    300,
    'onboarding',
    'completion-v1'
  );

  return jsonb_build_object(
    'jeux', to_jsonb(v_jeux),
    'equipe_id', v_equipe_id,
    'recompense_volts', case when v_credite then 300 else 0 end,
    'recompense_totale', 300,
    'deja_reclamee', not v_credite,
    'solde', public.clutch_solde_volts(v_user)
  );
end;
$$;

comment on function public.clutch_terminer_onboarding_v1(text[], text) is
  'Atomic onboarding completion with one idempotent 300 Volt reward.';

revoke all privileges on function public.clutch_terminer_onboarding_v1(text[], text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_terminer_onboarding_v1(text[], text)
to authenticated, service_role;

-- The obsolete generic shop could spend Volts on non-cosmetic legacy PC parts.
-- Keep the function for migration compatibility but remove every Data API path.
revoke all privileges on function public.clutch_acheter_objet(text)
from public, anon, authenticated, service_role;

alter table public.volts_mouvements enable row level security;

drop policy if exists volts_lecture on public.volts_mouvements;
drop policy if exists volts_lecture_v2 on public.volts_mouvements;
create policy volts_lecture_v2
  on public.volts_mouvements
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.volts_mouvements
from public, anon, authenticated, service_role;
grant select on table public.volts_mouvements
to authenticated;
grant select, insert on table public.volts_mouvements
to service_role;

comment on table public.volts_mouvements is
  'Append-only Volt ledger. Every row has a normalized source, object/campaign link when applicable, idempotency key and resulting balance. It never mutates Frags or ranking.';
comment on column public.volts_mouvements.source_economique is
  'Normalized free-source or cosmetic-spend category used by the product journal.';
comment on column public.volts_mouvements.cle_idempotence is
  'Stable per-user operation key preventing duplicate rewards or purchases.';
comment on column public.volts_mouvements.solde_apres is
  'Volt balance immediately after this serialized movement.';

do $$
declare
  v_contract jsonb := public.clutch_contrat_economie_volts_v1();
  v_simulation jsonb := public.clutch_simuler_economie_volts_v1();
begin
  if (v_contract ->> 'version')::integer <> 1
     or (v_contract #>> '{sources,onboarding,montant}')::integer <> 300
     or coalesce((v_contract #>> '{garde_fous,conversion_volts_vers_frags}')::boolean, true)
     or coalesce((v_contract #>> '{garde_fous,impact_classement}')::boolean, true)
  then
    raise exception 'Volt economy contract is incomplete';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_simulation -> 'profils') as profil(value)
    where (profil.value ->> 'jours_premier_objet')::integer > 21
       or (profil.value ->> 'ratio_revenu_sur_depense_cible')::numeric > 0.80
       or not (profil.value ->> 'inflation_sous_controle')::boolean
  ) then
    raise exception 'Volt economy simulation exceeds frustration or inflation guardrails';
  end if;

  if has_function_privilege('anon', 'public.clutch_journal_volts_v1(integer,timestamp with time zone)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_journal_volts_v1(integer,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.clutch_crediter_volts(uuid,integer,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.clutch_acheter_objet(text)', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.volts_mouvements', 'INSERT')
     or has_table_privilege('service_role', 'public.volts_mouvements', 'UPDATE')
     or has_table_privilege('service_role', 'public.volts_mouvements', 'DELETE')
  then
    raise exception 'Volt economy privileges are inconsistent';
  end if;
end;
$$;
