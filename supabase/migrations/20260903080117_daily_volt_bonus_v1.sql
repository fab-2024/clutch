-- Retention foundations + phase 1. No Frags, rank, streak or Room mutation.
-- Reuse the append-only Volt ledger and its per-account economy lock.
-- A reward timezone is pinned on the first authenticated claim, not per device.

create table private.journees_recompense_joueur (
  user_id uuid primary key references public.profils(id) on delete cascade,
  fuseau text not null check (fuseau = btrim(fuseau) and char_length(fuseau) between 1 and 80),
  cree_le timestamptz not null default pg_catalog.clock_timestamp()
);
alter table private.journees_recompense_joueur enable row level security;
revoke all privileges on table private.journees_recompense_joueur
from public, anon, authenticated, service_role;
grant select on table private.journees_recompense_joueur to service_role;
comment on table private.journees_recompense_joueur is
  'Immutable-to-clients reward timezone, initialized by the daily bonus RPC only. Device travel, notification preferences and reinstall cannot reset the reward calendar.';

-- Shared, testable calendar boundary for daily rewards and future call-day
-- streaks. Computing tomorrow in local civil time handles 23/25-hour DST days.
create or replace function private.clutch_journee_recompense_v1(
  p_instant timestamptz,
  p_fuseau text
)
returns table (jour date, debut timestamptz, fin timestamptz)
language sql
stable
strict
security invoker
set search_path = ''
as $$
  select local_day,
         local_day::timestamp at time zone p_fuseau,
         (local_day + 1)::timestamp at time zone p_fuseau
  from (select (p_instant at time zone p_fuseau)::date as local_day) d;
$$;
revoke all privileges on function private.clutch_journee_recompense_v1(timestamptz, text)
from public, anon, authenticated, service_role;

alter table public.volts_mouvements
  drop constraint volts_mouvements_origine_check,
  drop constraint volts_mouvements_source_economique_check,
  drop constraint volts_mouvements_sens_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check check (origine in (
    'badge', 'saison', 'call', 'achat', 'achat_pack', 'ajustement', 'pari',
    'faction', 'friend_quest', 'onboarding', 'progression', 'mission',
    'activation', 'exceptionnelle', 'bonus_quotidien'
  )),
  add constraint volts_mouvements_source_economique_check check (source_economique in (
    'onboarding', 'progression', 'mission', 'activation', 'exceptionnelle',
    'achat_cosmetique', 'achat_pack_cosmetique', 'ajustement', 'bonus_quotidien'
  )),
  add constraint volts_mouvements_sens_check check (
    (source_economique in (
      'onboarding', 'progression', 'mission', 'activation', 'exceptionnelle',
      'bonus_quotidien'
    ) and montant > 0)
    or (source_economique in ('achat_cosmetique', 'achat_pack_cosmetique') and montant < 0)
    or (source_economique = 'ajustement' and montant <> 0)
  ),
  add constraint volts_mouvements_bonus_quotidien_check check (
    source_economique <> 'bonus_quotidien'
    or (
      montant = 10
      and origine = 'bonus_quotidien'
      and reference ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and cle_idempotence = 'bonus_quotidien:' || reference
      and campagne_key is null
    )
  );

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
    when 'bonus_quotidien' then 'bonus_quotidien'
    else null
  end;
$$;
revoke all privileges on function private.clutch_source_economique_volts_v1(text)
from public, anon, authenticated, service_role;

-- Reserve the daily origin for the server-calendar RPC, including trusted
-- generic credits: callers cannot choose another day to mint extra bonuses.
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
  if v_origine in ('achat', 'achat_pack', 'ajustement', 'bonus_quotidien') then
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

revoke all privileges on function public.clutch_crediter_volts(uuid, integer, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_crediter_volts(uuid, integer, text, text) to service_role;


-- No client-supplied account, date, amount or idempotency key.
create or replace function private.clutch_reclamer_bonus_quotidien_v1(p_fuseau text default 'UTC')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_fuseau text;
  v_now timestamptz;
  v_jour date;
  v_fin timestamptz;
  v_mouvement uuid;
  v_attribue boolean;
  v_attribue_le timestamptz;
  v_solde integer;
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id = v_user and not coalesce(u.is_anonymous, false)
  ) then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  -- Same lock as purchases and all Volt movements. Acquire it before reading
  -- the pinned timezone and the server clock, including first-claim races.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-volts:' || v_user::text, 0)
  );
  v_now := pg_catalog.clock_timestamp();

  select j.fuseau into v_fuseau
  from private.journees_recompense_joueur j where j.user_id = v_user;
  if not found then
    v_fuseau := coalesce(nullif(pg_catalog.btrim(p_fuseau), ''), 'UTC');
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuseau) then
      raise exception 'invalid_reward_timezone' using errcode = '22023';
    end if;
    insert into private.journees_recompense_joueur (user_id, fuseau, cree_le)
    values (v_user, v_fuseau, v_now);
  end if;

  select j.jour, j.fin into v_jour, v_fin
  from private.clutch_journee_recompense_v1(v_now, v_fuseau) j;

  insert into public.volts_mouvements (
    user_id, montant, origine, reference, cle_idempotence, cree_le, metadata
  ) values (
    v_user, 10, 'bonus_quotidien', v_jour::text,
    'bonus_quotidien:' || v_jour::text, v_now,
    jsonb_build_object('jour', v_jour, 'fuseau', v_fuseau)
  )
  on conflict (user_id, origine, reference) do nothing
  returning id, cree_le into v_mouvement, v_attribue_le;
  v_attribue := found;

  if not v_attribue then
    select m.id, m.cree_le into strict v_mouvement, v_attribue_le
    from public.volts_mouvements m
    where m.user_id = v_user and m.origine = 'bonus_quotidien' and m.reference = v_jour::text;
  else
    -- The business ledger does not require analytics consent. Optional product
    -- analytics still use the existing server-only, consent-gated primitive.
    perform private.clutch_journaliser_evenement_analytics_v1(
      v_user, 'daily_bonus_awarded', p_cle_idempotence := 'daily-bonus:' || v_jour::text
    );
  end if;

  select coalesce(sum(m.montant), 0)::integer into v_solde
  from public.volts_mouvements m where m.user_id = v_user;

  return jsonb_build_object(
    'user_id', v_user, 'attribue', v_attribue,
    'montant', case when v_attribue then 10 else 0 end,
    'montant_quotidien', 10, 'solde', v_solde,
    'mouvement_id', v_mouvement, 'attribue_le', v_attribue_le,
    'jour', v_jour, 'fuseau', v_fuseau,
    'heure_serveur', v_now, 'prochain_bonus_le', v_fin
  );
end;
$$;
revoke all privileges on function private.clutch_reclamer_bonus_quotidien_v1(text)
from public, anon, authenticated, service_role;
grant execute on function private.clutch_reclamer_bonus_quotidien_v1(text) to authenticated;

-- The SQL-standard body resolves the private function at definition time.
-- No USAGE grant on the entire private schema, nor table grants, is required
-- for the mobile caller. The only exposed function stays SECURITY INVOKER.
create or replace function public.clutch_reclamer_bonus_quotidien_v1(p_fuseau text default 'UTC')
returns jsonb
language sql
security invoker
set search_path = ''
begin atomic
  select private.clutch_reclamer_bonus_quotidien_v1(p_fuseau);
end;
revoke all privileges on function public.clutch_reclamer_bonus_quotidien_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_reclamer_bonus_quotidien_v1(text) to authenticated;
comment on function public.clutch_reclamer_bonus_quotidien_v1(text) is
  'First authenticated activity of a pinned civil day grants exactly 10 Volts. Atomic, replay-safe, no backfill, no client clock, no anonymous users, no competitive effect.';

-- Add the new source without silently changing existing prices or budgets.
create or replace function public.clutch_contrat_economie_volts_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
    'devise', 'volts',
    'sources', jsonb_build_object(
      'bonus_quotidien', jsonb_build_object(
        'montant', 10,
        'frequence', 'une_fois_par_jour_civil',
        'fuseau', 'ancre_a_la_premiere_attribution',
        'jours_manques', 'non_recuperables'
      ),
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
    'profils_simules_hypothese', 'reference historique hors bonus quotidien, onboarding et recompenses exceptionnelles',
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

revoke all privileges on function public.clutch_contrat_economie_volts_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_economie_volts_v1()
to anon, authenticated, service_role;


-- Extend the existing analytics contract without renaming legacy events.
alter table private.analytics_evenements
  drop constraint if exists analytics_evenements_type_check,
  drop constraint if exists analytics_evenements_client_check,
  drop constraint if exists analytics_evenements_contexte_check;

alter table private.analytics_evenements
  add constraint analytics_evenements_type_check check (
    type_evenement in (
      'app_opened',
      'daily_bonus_awarded',
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
      'app_opened',
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
    'app_opened',
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
revoke all privileges on function public.clutch_enregistrer_evenement_analytics_v1(text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_enregistrer_evenement_analytics_v1(text, text, text, text)
to authenticated;

create or replace function public.clutch_contrat_analytics_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 5,
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
      'app_opened',
      'daily_bonus_awarded',
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
grant execute on function public.clutch_contrat_analytics_v1() to anon, authenticated, service_role;
