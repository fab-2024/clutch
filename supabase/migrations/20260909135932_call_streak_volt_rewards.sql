-- Call streak milestone rewards: 7 days = 50 Volts, 14 days = 100 Volts.
-- No backfill or client claim RPC: grant once per account on an accepted call.
-- Reuses the RLS-protected, append-only ledger with its existing unique key,
-- accounting trigger and per-player advisory lock. No new exposed table.
begin;

create or replace function private.clutch_enregistrer_jour_call_v1(p_user uuid, p_pronostic uuid, p_match text, p_now timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e private.series_calls_etats%rowtype;
  v_fuseau text;
  v_jour date;
  v_premier boolean;
begin
  perform private.clutch_clore_journees_serie_v1(p_user, p_now);
  select fuseau into strict v_fuseau from private.journees_recompense_joueur where user_id = p_user;
  v_jour := (p_now at time zone v_fuseau)::date;
  insert into private.series_calls_preuves values (p_pronostic, p_user, p_match, v_jour, p_now)
  on conflict do nothing;
  if not found then return; end if;
  select * into strict e from private.series_calls_etats where user_id = p_user;
  v_premier := not exists (select 1 from private.series_calls_jours where user_id = p_user and jour = v_jour and etat = 'valide');
  insert into private.series_calls_jours values (p_user, v_jour, 'valide', 1, p_now)
  on conflict (user_id, jour) do update set etat = 'valide', nb_calls = private.series_calls_jours.nb_calls + 1;
  perform private.clutch_journaliser_evenement_analytics_v1(p_user, 'call_created', p_cle_idempotence := 'call-created:' || p_pronostic::text);
  if v_premier then
    e.serie_actuelle := e.serie_actuelle + 1;
    update private.series_calls_etats set serie_actuelle = e.serie_actuelle,
      meilleure_serie = greatest(meilleure_serie, e.serie_actuelle), jours_valides = jours_valides + 1,
      dernier_jour_valide = v_jour, debut_serie = coalesce(debut_serie, v_jour) where user_id = p_user;
    perform private.clutch_journaliser_evenement_analytics_v1(p_user, 'call_streak_extended', p_cle_idempotence := 'call-day:' || v_jour::text);
    if e.serie_actuelle in (3, 7, 14, 30, 50, 100) then
      insert into private.series_calls_jalons values (p_user, e.serie_actuelle, p_now) on conflict do nothing;
    end if;
  end if;
  -- Only a newly accepted call can award these lifetime milestones. The
  -- existing economy advisory lock and ledger uniqueness make retries atomic.
  -- Existing active streaks qualify on their next call, never on a page view.
  if e.serie_actuelle >= 7 then
    perform public.clutch_crediter_volts(p_user, 50, 'progression', 'serie-calls:7');
  end if;
  if e.serie_actuelle >= 14 then
    perform public.clutch_crediter_volts(p_user, 100, 'progression', 'serie-calls:14');
  end if;
  update public.evenements_notification set statut = 'annule', maj_le = p_now
  where user_id = p_user and type = 'serie_en_danger' and cle_evenement = v_jour::text
    and statut in ('en_attente', 'traitement');
end;
$$;

create or replace function private.clutch_etat_serie_json_v1(p_user uuid, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e private.series_calls_etats%rowtype;
  v_fuseau text;
  v_jour record;
  v_match text;
  v_valide boolean;
  v_historique jsonb;
begin
  select * into strict e from private.series_calls_etats where user_id = p_user;
  select fuseau into strict v_fuseau from private.journees_recompense_joueur where user_id = p_user;
  select * into v_jour from private.clutch_journee_recompense_v1(p_now, v_fuseau);
  v_valide := exists (select 1 from private.series_calls_jours where user_id = p_user and jour = v_jour.jour and etat = 'valide');
  select m.id into v_match from public.matchs m join public.saisons s on s.id = m.saison_id
  join public.matchs_scoring_frags f on f.match_id = m.id
  where m.statut = 'a_venir' and m.debut > p_now and s.debut <= p_now and s.fin >= p_now
    and not exists (select 1 from public.pronostics_classes p where p.user_id = p_user and p.match_id = m.id)
    and not exists (select 1 from private.series_calls_preuves p where p.user_id = p_user and p.match_id = m.id)
  order by m.debut, m.id limit 1;
  select jsonb_agg(jsonb_build_object('jour', d.jour, 'etat', coalesce(j.etat,
    case when d.jour = v_jour.jour then 'a_faire'
      when d.jour < (e.cree_le at time zone v_fuseau)::date then 'inactif'
      when not private.clutch_opportunite_serie_v1(p_user, greatest(d.jour::timestamp at time zone v_fuseau, e.cree_le),
        (d.jour + 1)::timestamp at time zone v_fuseau) then 'neutre' else 'manque' end),
    'calls', coalesce(j.nb_calls, 0)) order by d.jour)
  into v_historique from (select v_jour.jour - i as jour from generate_series(0, 13) i) d
  left join private.series_calls_jours j on j.user_id = p_user and j.jour = d.jour;
  return jsonb_build_object(
    'version', 1, 'user_id', p_user, 'jour', v_jour.jour, 'fuseau', v_fuseau,
    'heure_serveur', p_now, 'fin_journee', v_jour.fin,
    'serie_actuelle', e.serie_actuelle, 'meilleure_serie', e.meilleure_serie,
    'jours_valides', e.jours_valides, 'dernier_jour_valide', e.dernier_jour_valide,
    'jour_valide', v_valide, 'match_eligible_id', v_match,
    'opportunite_du_jour', private.clutch_opportunite_serie_v1(p_user, greatest(v_jour.debut, e.cree_le), v_jour.fin),
    'stock_protecteurs', e.stock_protecteurs, 'stock_max', 2, 'prix_protecteur', 90,
    'operation_achat', gen_random_uuid(),
    'protection_utilisee', e.protection_utilisee, 'jalon_selectionne', e.jalon_selectionne,
    'solde_volts', (select coalesce(sum(montant), 0) from public.volts_mouvements where user_id = p_user),
    'historique', v_historique,
    'recompenses', (select jsonb_agg(jsonb_build_object(
      'palier', r.palier, 'volts', r.volts, 'credite_le', m.cree_le) order by r.palier)
      from (values (7, 50), (14, 100)) r(palier, volts)
      left join public.volts_mouvements m on m.user_id = p_user and m.origine = 'progression'
        and m.reference = 'serie-calls:' || r.palier::text),
    'jalons', (select coalesce(jsonb_agg(jsonb_build_object('palier', palier, 'obtenu_le', obtenu_le) order by palier), '[]'::jsonb)
      from private.series_calls_jalons where user_id = p_user),
    'protecteurs_historique', (select coalesce(jsonb_agg(to_jsonb(m) order by m.cree_le desc), '[]'::jsonb)
      from (select id, type, quantite, stock_apres, cree_le from private.protecteurs_serie_mouvements
        where user_id = p_user order by cree_le desc, id limit 20) m)
  );
end;
$$;

revoke all privileges on function
  private.clutch_enregistrer_jour_call_v1(uuid, uuid, text, timestamptz),
  private.clutch_etat_serie_json_v1(uuid, timestamptz)
from public, anon, authenticated, service_role;

comment on function private.clutch_enregistrer_jour_call_v1(uuid,uuid,text,timestamptz) is
  'Authoritative call-day writer; lifetime rewards of 50/100 Volts at 7/14 validated days, once per player. Not client-callable.';
commit;
