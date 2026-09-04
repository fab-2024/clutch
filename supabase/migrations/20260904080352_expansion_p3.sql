-- P3: English launch, privacy-preserving notification recommendations and
-- two temporary visual consumables. Neither consumable changes calls, Frags,
-- rank, faction progression or any competitive projection.

-- ---------------------------------------------------------------------------
-- Notification locale and recommendations
-- ---------------------------------------------------------------------------

alter table public.preferences_notifications
  add column locale text not null default 'fr-FR'
  constraint preferences_notifications_locale_check check (locale in ('fr-FR', 'en-US'));

create index analytics_evenements_recommandation_p3_idx
  on private.analytics_evenements(user_id, cree_le)
  where type_evenement in ('app_opened', 'application_active');

create function private.clutch_recommandation_notifications_p3(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_zone text := coalesce((select fuseau from public.preferences_notifications where user_id = p_user), 'UTC');
  v_sample integer;
  v_start integer := 1320;
  v_categories jsonb := '[]'::jsonb;
  v_source text := 'defaults';
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_zone) then v_zone := 'UTC'; end if;
  select count(*)::integer into v_sample from private.analytics_evenements a
  where a.user_id = p_user and a.type_evenement in ('app_opened', 'application_active')
    and a.cree_le >= now() - interval '28 days';

  if v_sample >= 7 then
    v_source := 'activity';
    select candidate.minute into v_start
    from generate_series(0, 1410, 30) as candidate(minute)
    order by (
      select count(*) from private.analytics_evenements a
      cross join lateral (
        select extract(hour from a.cree_le at time zone v_zone)::integer * 60
          + extract(minute from a.cree_le at time zone v_zone)::integer as local_minute
      ) local_time
      where a.user_id = p_user and a.type_evenement in ('app_opened', 'application_active')
        and a.cree_le >= now() - interval '28 days'
        and case when candidate.minute + 600 < 1440
          then local_time.local_minute >= candidate.minute and local_time.local_minute < candidate.minute + 600
          else local_time.local_minute >= candidate.minute or local_time.local_minute < (candidate.minute + 600) % 1440 end
    ), abs(candidate.minute - 1320), candidate.minute
    limit 1;
  end if;

  if exists (select 1 from private.series_calls_etats where user_id = p_user and serie_actuelle > 0) then
    v_categories := v_categories || jsonb_build_array('streakRisk');
  end if;
  if exists (select 1 from public.profils where id = p_user
    and (equipe_favorite_id is not null or cardinality(coalesce(jeux_suivis, '{}'::text[])) > 0)) then
    v_categories := v_categories || jsonb_build_array('matchStart');
  end if;
  if exists (select 1 from public.amities where statut = 'acceptee' and p_user in (a, b)) then
    v_categories := v_categories || jsonb_build_array('duelReceived');
  end if;

  return jsonb_build_object('source', v_source, 'echantillon', v_sample,
    'silence_debut', v_start, 'silence_fin', (v_start + 600) % 1440,
    'categories', v_categories, 'genere_le', now());
end $$;

create function private.clutch_mes_preferences_notification_v3()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_locale text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select locale into v_locale from public.preferences_notifications where user_id = v_user;
  return private.clutch_mes_preferences_notification_v2() || jsonb_build_object(
    'expansion_disponible', true,
    'locale', coalesce(v_locale, 'fr-FR'),
    'recommandation', private.clutch_recommandation_notifications_p3(v_user));
end $$;

create function private.clutch_enregistrer_preferences_notification_v3(
  p_fuseau text, p_verrouillage_imminent boolean, p_debut_match boolean, p_verdict boolean,
  p_promotion boolean, p_mutation boolean, p_duel_recu boolean,
  p_serie_en_danger boolean, p_serie_protegee boolean, p_silence_actif boolean,
  p_silence_debut integer, p_silence_fin integer, p_locale text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_locale is null or p_locale not in ('fr-FR', 'en-US') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;
  perform private.clutch_enregistrer_preferences_notification_v2(p_fuseau, p_verrouillage_imminent,
    p_debut_match, p_verdict, p_promotion, p_mutation, p_duel_recu,
    p_serie_en_danger, p_serie_protegee, p_silence_actif, p_silence_debut, p_silence_fin);
  update public.preferences_notifications set locale = p_locale, maj_le = clock_timestamp() where user_id = v_user;
  return private.clutch_mes_preferences_notification_v3();
end $$;

create function private.clutch_texte_notification_p3(
  p_type text, p_locale text, p_titre text, p_corps text, p_donnees jsonb
)
returns jsonb language sql immutable parallel safe security definer set search_path = '' as $$
  select case when p_locale <> 'en-US' then jsonb_build_object('titre', p_titre, 'corps', p_corps)
  else case p_type
    when 'verrouillage_imminent' then jsonb_build_object('titre', 'A call closes soon', 'corps', 'A relevant market closes in 15 minutes.')
    when 'debut_match' then jsonb_build_object('titre', 'The match is live', 'corps', 'A matchup you follow has just started.')
    when 'verdict' then jsonb_build_object('titre', 'Your result is ready', 'corps', 'Your call has been settled. See your final Frags.')
    when 'promotion' then jsonb_build_object('titre', 'New rank', 'corps', 'Your season rank has changed.')
    when 'mutation' then jsonb_build_object('titre', 'Your faction relic evolved', 'corps', 'Open Social to discover its new form.')
    when 'duel_recu' then jsonb_build_object('titre', 'New duel', 'corps', 'A friend challenged you on a ranked match.')
    when 'serie_en_danger' then jsonb_build_object('titre', 'One call for your streak', 'corps', 'Less than 3 hours remain to validate today. An eligible match is waiting.')
    when 'serie_protegee' then jsonb_build_object('titre', 'Streak protected', 'corps', 'A streak protector covered your missed day. No fictitious call was created.')
    when 'vitrine_likes' then jsonb_build_object('titre', 'Your showcase is getting noticed', 'corps', 'New likes landed on your showcase. Open its activity.')
    else jsonb_build_object('titre', p_titre, 'corps', p_corps) end end;
$$;

-- Keep queue-time French copy for audit/support and localize only at delivery.
-- This also localizes notifications that were already queued before a player
-- changed language, while preserving all P1/P2 relevance checks.
create or replace function private.clutch_reclamer_livraisons_notification_p1(p_limite integer default 100)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb; v_now timestamptz := clock_timestamp();
begin
  if coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  with candidates as (
    select l.id from public.livraisons_notification l
    join public.evenements_notification e on e.id = l.notification_id
    join public.jetons_notification j on j.id = l.jeton_id
    where j.actif and j.user_id = e.user_id and j.jeton_expo = l.jeton_expo
      and e.statut in ('en_attente', 'traitement') and e.planifie_pour <= v_now and l.tentatives < 6
      and private.clutch_notification_autorisee_v1(e.user_id, e.type)
      and private.clutch_hors_silence_notification_v1(e.user_id, v_now)
      and (e.type <> 'vitrine_likes' or private.clutch_notification_vitrine_pertinente_v1(e.user_id, v_now))
      and (e.type <> 'serie_en_danger' or private.clutch_rappel_serie_pertinent_v1(e.user_id, e.cle_evenement, v_now))
      and (e.type <> 'serie_protegee' or private.clutch_protection_notification_pertinente_v1(e.user_id, e.cle_evenement, v_now))
      and (e.type <> 'verrouillage_imminent' or exists (select 1 from public.matchs m
        where m.id = e.donnees ->> 'match_id' and m.statut = 'a_venir' and m.debut > v_now))
      and (e.type <> 'debut_match' or e.planifie_pour > v_now - interval '15 minutes')
      and ((l.statut in ('en_attente', 'echec') and l.prochaine_tentative <= v_now)
        or (l.statut = 'traitement' and l.maj_le <= v_now - interval '10 minutes'))
    order by e.planifie_pour, l.cree_le
    limit greatest(1, least(coalesce(p_limite, 100), 100)) for update of l skip locked
  ), claimed as (
    update public.livraisons_notification l set statut = 'traitement', tentatives = l.tentatives + 1, maj_le = v_now
    from candidates c where l.id = c.id returning l.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('livraison_id', c.id, 'jeton', c.jeton_expo,
    'titre', localized.copy ->> 'titre', 'corps', localized.copy ->> 'corps',
    'donnees', e.donnees || jsonb_build_object('notification_id', e.id), 'type', e.type)
    order by e.planifie_pour, c.cree_le), '[]'::jsonb) into v_result
  from claimed c join public.evenements_notification e on e.id = c.notification_id
  left join public.preferences_notifications p on p.user_id = e.user_id
  cross join lateral (select private.clutch_texte_notification_p3(
    e.type, coalesce(p.locale, 'fr-FR'), e.titre, e.corps, e.donnees) as copy) localized;
  update public.evenements_notification e set statut = 'traitement', maj_le = v_now
  where e.statut = 'en_attente' and exists (select 1 from public.livraisons_notification l
    where l.notification_id = e.id and l.statut = 'traitement');
  return v_result;
end $$;

create function public.clutch_mes_preferences_notification_v3()
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_mes_preferences_notification_v3(); end;
create function public.clutch_enregistrer_preferences_notification_v3(
  p_fuseau text, p_verrouillage_imminent boolean, p_debut_match boolean, p_verdict boolean,
  p_promotion boolean, p_mutation boolean, p_duel_recu boolean,
  p_serie_en_danger boolean, p_serie_protegee boolean, p_silence_actif boolean,
  p_silence_debut integer, p_silence_fin integer, p_locale text
)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_enregistrer_preferences_notification_v3(p_fuseau, p_verrouillage_imminent,
  p_debut_match, p_verdict, p_promotion, p_mutation, p_duel_recu,
  p_serie_en_danger, p_serie_protegee, p_silence_actif, p_silence_debut, p_silence_fin, p_locale); end;

-- ---------------------------------------------------------------------------
-- Temporary visual consumables
-- ---------------------------------------------------------------------------

create table private.consommables_visuels_etats (
  user_id uuid not null references public.profils(id) on delete cascade,
  type text not null check (type in ('showcase_spotlight', 'profile_pulse')),
  stock smallint not null default 0 check (stock between 0 and 3),
  actif_jusqua timestamptz,
  maj_le timestamptz not null default clock_timestamp(),
  primary key (user_id, type)
);

create table private.consommables_visuels_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  operation uuid not null,
  type text not null check (type in ('showcase_spotlight', 'profile_pulse')),
  action text not null check (action in ('purchase', 'activation')),
  mouvement_volts_id uuid references public.volts_mouvements(id) on delete cascade,
  cree_le timestamptz not null default clock_timestamp(),
  unique (user_id, operation),
  check ((action = 'purchase') = (mouvement_volts_id is not null))
);
create index consommables_visuels_historique_p3_idx
  on private.consommables_visuels_operations(user_id, cree_le desc);
create unique index consommables_visuels_mouvement_p3_idx
  on private.consommables_visuels_operations(mouvement_volts_id) where mouvement_volts_id is not null;

alter table private.consommables_visuels_etats enable row level security;
alter table private.consommables_visuels_operations enable row level security;
revoke all on table private.consommables_visuels_etats, private.consommables_visuels_operations
  from public, anon, authenticated, service_role;
grant select on table private.consommables_visuels_etats, private.consommables_visuels_operations to service_role;

-- P1 restricted every achat_consommable debit to a protector. Expand the same
-- invariant instead of weakening it: each visual type keeps one server price
-- and a reference containing the durable operation UUID.
alter table public.volts_mouvements
  drop constraint if exists volts_mouvements_protecteur_check,
  drop constraint if exists volts_mouvements_consommable_p3_check;
alter table public.volts_mouvements add constraint volts_mouvements_consommable_p3_check check (
  origine <> 'achat_consommable' or (
    source_economique = 'achat_consommable' and objet_id is null and pack_id is null and campagne_key is null
    and (
      (montant = -90 and reference ~ '^protecteur-serie:[0-9a-f-]{36}$')
      or (montant = -60 and reference ~ '^visuel:showcase_spotlight:[0-9a-f-]{36}$')
      or (montant = -45 and reference ~ '^visuel:profile_pulse:[0-9a-f-]{36}$')
    )
    and cle_idempotence = 'achat_consommable:' || reference
  )
);

create function private.clutch_etat_consommables_visuels_p3(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_items jsonb; v_history jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('type', catalog.type,
    'prix_volts', catalog.price, 'stock_max', catalog.max_stock,
    'stock', coalesce(state.stock, 0), 'actif_jusqua', state.actif_jusqua)
    order by catalog.ordre), '[]'::jsonb) into v_items
  from (values (1, 'showcase_spotlight'::text, 60, 3), (2, 'profile_pulse'::text, 45, 3))
    as catalog(ordre, type, price, max_stock)
  left join private.consommables_visuels_etats state on state.user_id = p_user and state.type = catalog.type;

  select coalesce(jsonb_agg(jsonb_build_object('id', recent.id, 'operation_id', recent.operation,
    'type', recent.type, 'action', recent.action, 'cree_le', recent.cree_le)
    order by recent.cree_le desc), '[]'::jsonb) into v_history
  from (select * from private.consommables_visuels_operations where user_id = p_user
    order by cree_le desc limit 20) recent;

  return jsonb_build_object('expansion_disponible', true,
    'solde_volts', coalesce((select sum(montant) from public.volts_mouvements where user_id = p_user), 0),
    'consommables', v_items, 'historique', v_history,
    'impact_classement', false, 'conversion_frags', false);
end $$;

create function private.clutch_mes_consommables_visuels_p3()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := private.clutch_compte_croissance_v1();
begin return private.clutch_etat_consommables_visuels_p3(v_user); end $$;

create function private.clutch_acheter_consommable_visuel_p3(p_type text, p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.clutch_compte_croissance_v1();
  v_price integer;
  v_stock integer;
  v_movement uuid;
  v_previous private.consommables_visuels_operations%rowtype;
begin
  if p_operation is null then raise exception 'purchase_operation_required' using errcode = '22023'; end if;
  v_price := case p_type when 'showcase_spotlight' then 60 when 'profile_pulse' then 45 else null end;
  if v_price is null then raise exception 'invalid_consumable_type' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clutch-volts:' || v_user::text, 0));
  select * into v_previous from private.consommables_visuels_operations
    where user_id = v_user and operation = p_operation;
  if found then
    if v_previous.type <> p_type or v_previous.action <> 'purchase' then
      raise exception 'operation_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object('operation_id', p_operation, 'action', 'purchase', 'applique', false,
      'mouvement_id', v_previous.mouvement_volts_id,
      'etat', private.clutch_etat_consommables_visuels_p3(v_user));
  end if;
  insert into private.consommables_visuels_etats(user_id, type) values (v_user, p_type) on conflict do nothing;
  select stock into strict v_stock from private.consommables_visuels_etats
    where user_id = v_user and type = p_type for update;
  if v_stock >= 3 then raise exception 'consumable_stock_full' using errcode = 'P0001'; end if;
  if coalesce((select sum(montant) from public.volts_mouvements where user_id = v_user), 0) < v_price then
    raise exception 'insufficient_volts' using errcode = 'P0001';
  end if;
  insert into public.volts_mouvements(user_id, montant, origine, reference, metadata, cree_le)
  values (v_user, -v_price, 'achat_consommable', 'visuel:' || p_type || ':' || p_operation::text,
    jsonb_build_object('consommable', p_type, 'duree_heures', 24), clock_timestamp())
  returning id into v_movement;
  update private.consommables_visuels_etats set stock = stock + 1, maj_le = clock_timestamp()
    where user_id = v_user and type = p_type;
  insert into private.consommables_visuels_operations(user_id, operation, type, action, mouvement_volts_id)
    values (v_user, p_operation, p_type, 'purchase', v_movement);
  perform private.clutch_journaliser_evenement_analytics_v1(v_user, 'consumable_purchased',
    p_cle_idempotence := 'consumable-purchased:' || p_operation::text);
  return jsonb_build_object('operation_id', p_operation, 'action', 'purchase', 'applique', true,
    'mouvement_id', v_movement, 'etat', private.clutch_etat_consommables_visuels_p3(v_user));
end $$;

create function private.clutch_activer_consommable_visuel_p3(p_type text, p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.clutch_compte_croissance_v1();
  v_state private.consommables_visuels_etats%rowtype;
  v_previous private.consommables_visuels_operations%rowtype;
begin
  if p_operation is null then raise exception 'activation_operation_required' using errcode = '22023'; end if;
  if p_type not in ('showcase_spotlight', 'profile_pulse') or p_type is null then
    raise exception 'invalid_consumable_type' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('clutch-volts:' || v_user::text, 0));
  select * into v_previous from private.consommables_visuels_operations
    where user_id = v_user and operation = p_operation;
  if found then
    if v_previous.type <> p_type or v_previous.action <> 'activation' then
      raise exception 'operation_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object('operation_id', p_operation, 'action', 'activation', 'applique', false,
      'mouvement_id', null, 'etat', private.clutch_etat_consommables_visuels_p3(v_user));
  end if;
  insert into private.consommables_visuels_etats(user_id, type) values (v_user, p_type) on conflict do nothing;
  select * into strict v_state from private.consommables_visuels_etats
    where user_id = v_user and type = p_type for update;
  if v_state.stock <= 0 then raise exception 'consumable_stock_empty' using errcode = 'P0001'; end if;
  if v_state.actif_jusqua > clock_timestamp() then raise exception 'effect_already_active' using errcode = 'P0001'; end if;
  update private.consommables_visuels_etats set stock = stock - 1,
    actif_jusqua = clock_timestamp() + interval '24 hours', maj_le = clock_timestamp()
    where user_id = v_user and type = p_type;
  insert into private.consommables_visuels_operations(user_id, operation, type, action)
    values (v_user, p_operation, p_type, 'activation');
  perform private.clutch_journaliser_evenement_analytics_v1(v_user, 'consumable_activated',
    p_cle_idempotence := 'consumable-activated:' || p_operation::text);
  return jsonb_build_object('operation_id', p_operation, 'action', 'activation', 'applique', true,
    'mouvement_id', null, 'etat', private.clutch_etat_consommables_visuels_p3(v_user));
end $$;

create function private.clutch_effets_vitrine_p3(p_pseudo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_owner uuid; v_viewer uuid := (select auth.uid());
begin
  if length(coalesce(p_pseudo, '')) not between 1 and 48 then return '[]'::jsonb; end if;
  v_owner := private.clutch_resoudre_pseudo_v1(p_pseudo);
  if not private.clutch_vitrine_accessible_v1(v_owner, v_viewer) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('type', type, 'actif_jusqua', actif_jusqua) order by type)
    from private.consommables_visuels_etats where user_id = v_owner and actif_jusqua > now()), '[]'::jsonb);
end $$;

create function public.clutch_mes_consommables_visuels_p3()
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_mes_consommables_visuels_p3(); end;
create function public.clutch_acheter_consommable_visuel_p3(p_type text, p_operation uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_acheter_consommable_visuel_p3(p_type, p_operation); end;
create function public.clutch_activer_consommable_visuel_p3(p_type text, p_operation uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_activer_consommable_visuel_p3(p_type, p_operation); end;
create function public.clutch_effets_vitrine_p3(p_pseudo text)
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_effets_vitrine_p3(p_pseudo); end;

-- ---------------------------------------------------------------------------
-- Published contracts and analytics proof
-- ---------------------------------------------------------------------------

alter table private.analytics_evenements drop constraint analytics_evenements_type_check;
alter table private.analytics_evenements add constraint analytics_evenements_type_check check (type_evenement in (
  'app_opened','daily_bonus_awarded','application_active','collection_affichee','objet_consulte','objet_obtenu',
  'objet_equipe','objet_retire','campagne_rejointe','tache_terminee','recompense_reclamee','founder_pack_affiche',
  'founder_pack_achat_demarre','founder_pack_restauration_demandee','founder_pack_achat_annule','founder_pack_attribue',
  'founder_pack_revoque','onboarding_commence','onboarding_termine','match_consulte','call_commence','call_verrouille',
  'resultat_consulte','frags_gagnes','rank_consulte','profil_public_consulte','mission_commencee','mission_terminee',
  'achat_commence','achat_termine','notification_ouverte','call_created','call_streak_extended','streak_protector_used',
  'notification_sent','notification_opened','invite_link_created','invite_activated','showcase_viewed','showcase_liked',
  'milestone_share_created','consumable_purchased','consumable_activated'));

alter function public.clutch_contrat_analytics_v1() rename to clutch_contrat_analytics_p2;
alter function public.clutch_contrat_analytics_p2() set schema private;
revoke all on function private.clutch_contrat_analytics_p2() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_analytics_p2() to anon, authenticated, service_role;
create function public.clutch_contrat_analytics_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_analytics_p2() || jsonb_build_object('version', 8,
    'evenements', (private.clutch_contrat_analytics_p2() -> 'evenements') ||
      '["consumable_purchased","consumable_activated"]'::jsonb);
end;

alter function public.clutch_contrat_economie_volts_v1() rename to clutch_contrat_economie_volts_p2;
alter function public.clutch_contrat_economie_volts_p2() set schema private;
revoke all on function private.clutch_contrat_economie_volts_p2() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_economie_volts_p2() to anon, authenticated, service_role;
create function public.clutch_contrat_economie_volts_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_economie_volts_p2() || jsonb_build_object('version', 5,
    'consommables', coalesce(private.clutch_contrat_economie_volts_p2() -> 'consommables', '{}'::jsonb) ||
      jsonb_build_object(
        'showcase_spotlight', jsonb_build_object('prix_volts', 60, 'stock_max', 3, 'duree_heures', 24),
        'profile_pulse', jsonb_build_object('prix_volts', 45, 'stock_max', 3, 'duree_heures', 24)),
    'garde_fous', coalesce(private.clutch_contrat_economie_volts_p2() -> 'garde_fous', '{}'::jsonb) ||
      jsonb_build_object('impact_classement', false, 'conversion_volts_vers_frags', false));
end;

-- Explicit grants: private remains outside the exposed Data API. Public RPCs
-- are narrow SQL-standard invokers and all economic decisions stay in definer
-- implementations with an empty search_path.
revoke all on function
  private.clutch_recommandation_notifications_p3(uuid),
  private.clutch_texte_notification_p3(text,text,text,text,jsonb),
  private.clutch_etat_consommables_visuels_p3(uuid)
from public, anon, authenticated, service_role;

do $$ declare sig text; schema_name text; begin
  foreach sig in array array[
    'clutch_mes_preferences_notification_v3()',
    'clutch_enregistrer_preferences_notification_v3(text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,integer,integer,text)',
    'clutch_mes_consommables_visuels_p3()',
    'clutch_acheter_consommable_visuel_p3(text,uuid)',
    'clutch_activer_consommable_visuel_p3(text,uuid)'
  ] loop
    foreach schema_name in array array['private', 'public'] loop
      execute 'revoke all on function ' || schema_name || '.' || sig || ' from public,anon,authenticated,service_role';
      execute 'grant execute on function ' || schema_name || '.' || sig || ' to authenticated';
    end loop;
  end loop;
  foreach schema_name in array array['private', 'public'] loop
    execute 'revoke all on function ' || schema_name || '.clutch_effets_vitrine_p3(text) from public,anon,authenticated,service_role';
    execute 'grant execute on function ' || schema_name || '.clutch_effets_vitrine_p3(text) to anon,authenticated,service_role';
  end loop;
end $$;

revoke all on function private.clutch_reclamer_livraisons_notification_p1(integer)
  from public, anon, authenticated, service_role;
grant execute on function private.clutch_reclamer_livraisons_notification_p1(integer) to service_role;
revoke all on function public.clutch_contrat_analytics_v1(), public.clutch_contrat_economie_volts_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_analytics_v1(), public.clutch_contrat_economie_volts_v1()
  to anon, authenticated, service_role;
