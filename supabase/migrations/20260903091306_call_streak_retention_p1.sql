-- P1: authenticated call-day streaks and their first non-competitive consumable.
-- The pinned reward calendar and append-only Volt ledger remain authoritative.
-- No backfill, winning-call badge changes, Frags, ranking or Clutch Room changes.

create table private.series_calls_etats (
  user_id uuid primary key references public.profils(id) on delete cascade,
  serie_actuelle integer not null default 0 check (serie_actuelle >= 0),
  meilleure_serie integer not null default 0 check (meilleure_serie >= serie_actuelle),
  jours_valides integer not null default 0 check (jours_valides >= meilleure_serie),
  dernier_jour_valide date,
  debut_serie date,
  traite_jusqua date not null,
  prochaine_cloture timestamptz not null,
  protection_utilisee boolean not null default false,
  stock_protecteurs smallint not null default 1 check (stock_protecteurs between 0 and 2),
  jalon_selectionne integer check (jalon_selectionne in (3, 7, 14, 30, 50, 100)),
  cree_le timestamptz not null,
  verifie_le timestamptz not null
);
create index series_calls_verification_idx on private.series_calls_etats(verifie_le, user_id)
  where serie_actuelle > 0;

create table private.series_calls_jours (
  user_id uuid not null references private.series_calls_etats(user_id) on delete cascade,
  jour date not null,
  etat text not null check (etat in ('valide', 'protege', 'neutre', 'manque')),
  nb_calls integer not null default 0,
  cree_le timestamptz not null,
  primary key (user_id, jour),
  check ((etat = 'valide' and nb_calls > 0) or (etat <> 'valide' and nb_calls = 0))
);

-- Preserve effort if the platform cancels a match or removes its source record.
-- Clients cannot insert/delete these proofs or ranked predictions. A deleted
-- and recreated prediction for the same match cannot validate a second day.
create table private.series_calls_preuves (
  pronostic_id uuid primary key,
  user_id uuid not null references private.series_calls_etats(user_id) on delete cascade,
  match_id text not null,
  jour date not null,
  recu_le timestamptz not null,
  unique (user_id, match_id)
);
create index series_calls_preuves_jour_idx on private.series_calls_preuves(user_id, jour);

create table private.series_calls_jalons (
  user_id uuid not null references private.series_calls_etats(user_id) on delete cascade,
  palier integer not null check (palier in (3, 7, 14, 30, 50, 100)),
  obtenu_le timestamptz not null,
  primary key (user_id, palier)
);

create table private.protecteurs_serie_mouvements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references private.series_calls_etats(user_id) on delete cascade,
  type text not null check (type in ('bienvenue', 'achat', 'utilisation')),
  reference text not null check (length(reference) between 1 and 100),
  quantite smallint not null,
  stock_apres smallint not null check (stock_apres between 0 and 2),
  -- The append-only ledger already rejects standalone deletion. Cascade here
  -- lets account erasure remove both histories, regardless of FK trigger order.
  mouvement_volts_id uuid references public.volts_mouvements(id) on delete cascade,
  cree_le timestamptz not null,
  unique (user_id, type, reference),
  check ((type in ('bienvenue', 'achat') and quantite = 1) or (type = 'utilisation' and quantite = -1)),
  check ((type = 'achat') = (mouvement_volts_id is not null))
);
create unique index protecteurs_serie_mouvement_volts_idx
  on private.protecteurs_serie_mouvements(mouvement_volts_id) where mouvement_volts_id is not null;
create index protecteurs_serie_historique_idx on private.protecteurs_serie_mouvements(user_id, cree_le desc);

-- Observed availability windows avoid retrospectively guessing whether there
-- was an eligible call on a missed day. Season boundaries are included, even
-- when a season starts without any match row being updated that minute.
create table private.series_calls_fenetres (
  id bigint generated always as identity primary key,
  match_id text not null,
  ouvert_le timestamptz not null,
  ferme_le timestamptz not null,
  check (ferme_le >= ouvert_le)
);
create index series_calls_fenetres_match_idx on private.series_calls_fenetres(match_id, ferme_le desc);
create index series_calls_fenetres_periode_idx on private.series_calls_fenetres(ferme_le, ouvert_le);

alter table private.series_calls_etats enable row level security;
alter table private.series_calls_jours enable row level security;
alter table private.series_calls_preuves enable row level security;
alter table private.series_calls_jalons enable row level security;
alter table private.protecteurs_serie_mouvements enable row level security;
alter table private.series_calls_fenetres enable row level security;
revoke all privileges on table private.series_calls_etats, private.series_calls_jours,
  private.series_calls_preuves, private.series_calls_jalons, private.protecteurs_serie_mouvements,
  private.series_calls_fenetres from public, anon, authenticated, service_role;
revoke all privileges on sequence private.series_calls_fenetres_id_seq from public, anon, authenticated, service_role;
grant select on table private.series_calls_etats, private.series_calls_jours,
  private.series_calls_preuves, private.series_calls_jalons, private.protecteurs_serie_mouvements,
  private.series_calls_fenetres to service_role;

create function private.clutch_synchroniser_fenetre_serie_v1(p_match_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_debut timestamptz;
  v_fin timestamptz;
  v_fenetre private.series_calls_fenetres%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('clutch-streak-market:' || p_match_id, 0));
  v_now := clock_timestamp();
  select greatest(v_now, s.debut), least(m.debut, s.fin) into v_debut, v_fin
  from public.matchs m join public.saisons s on s.id = m.saison_id
  join public.matchs_scoring_frags f on f.match_id = m.id
  where m.id = p_match_id and m.statut = 'a_venir' and least(m.debut, s.fin) > greatest(v_now, s.debut);

  select * into v_fenetre from private.series_calls_fenetres
  where match_id = p_match_id and ferme_le > v_now order by id desc limit 1;
  if v_fin is null then
    update private.series_calls_fenetres set ferme_le = greatest(ouvert_le, v_now)
    where match_id = p_match_id and ferme_le > v_now;
  elsif v_fenetre.id is not null and v_fenetre.ouvert_le <= v_now and v_debut > v_now then
    -- Moving a season's start into the future pauses an already-open market.
    -- Keep the observed past, but never count that suspension as an opportunity.
    update private.series_calls_fenetres set ferme_le = v_now where id = v_fenetre.id;
    insert into private.series_calls_fenetres(match_id, ouvert_le, ferme_le)
    values (p_match_id, v_debut, v_fin);
  elsif v_fenetre.id is not null then
    -- Keep the observed start of an already-open window; postponement can
    -- extend its end. A reopened, previously closed market gets a new window.
    update private.series_calls_fenetres set ferme_le = v_fin,
      ouvert_le = case when ouvert_le > v_now then v_debut else ouvert_le end
    where id = v_fenetre.id;
  else
    insert into private.series_calls_fenetres(match_id, ouvert_le, ferme_le)
    values (p_match_id, v_debut, v_fin);
  end if;
end;
$$;

create function private.clutch_observer_fenetre_serie_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'matchs' then
    perform private.clutch_synchroniser_fenetre_serie_v1(case when tg_op = 'DELETE' then old.id else new.id end);
  else
    perform private.clutch_synchroniser_fenetre_serie_v1(case when tg_op = 'DELETE' then old.match_id else new.match_id end);
  end if;
  return null;
end;
$$;
create trigger clutch_observer_match_serie_v1 after insert or update of debut, statut, saison_id or delete on public.matchs
for each row execute function private.clutch_observer_fenetre_serie_v1();
create trigger clutch_observer_scoring_serie_v1 after insert or delete on public.matchs_scoring_frags
for each row execute function private.clutch_observer_fenetre_serie_v1();

create function private.clutch_observer_saison_serie_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.matchs where saison_id = new.id order by id loop
    perform private.clutch_synchroniser_fenetre_serie_v1(r.id);
  end loop;
  return null;
end;
$$;
create trigger clutch_observer_saison_serie_v1 after update of debut, fin on public.saisons
for each row execute function private.clutch_observer_saison_serie_v1();
insert into private.series_calls_fenetres(match_id, ouvert_le, ferme_le)
select m.id, greatest(statement_timestamp(), s.debut), least(m.debut, s.fin)
from public.matchs m join public.saisons s on s.id = m.saison_id
join public.matchs_scoring_frags f on f.match_id = m.id
where m.statut = 'a_venir' and least(m.debut, s.fin) > greatest(statement_timestamp(), s.debut);

create function private.clutch_opportunite_serie_v1(p_user uuid, p_debut timestamptz, p_fin timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.series_calls_fenetres f
    where f.ouvert_le < p_fin and f.ferme_le > greatest(f.ouvert_le, p_debut)
      and not exists (select 1 from public.pronostics_classes p
        where p.user_id = p_user and p.match_id = f.match_id and p.cree_le < p_fin)
      and not exists (select 1 from private.series_calls_preuves p
        where p.user_id = p_user and p.match_id = f.match_id and p.recu_le < p_fin)
  );
$$;

create function private.clutch_initialiser_serie_v1(p_user uuid, p_fuseau text default 'UTC')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz;
  v_fuseau text;
  v_jour record;
begin
  if p_user is null or not exists (select 1 from auth.users where id = p_user and not coalesce(is_anonymous, false)) then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('clutch-volts:' || p_user::text, 0));
  v_now := clock_timestamp();
  select fuseau into v_fuseau from private.journees_recompense_joueur where user_id = p_user;
  if not found then
    v_fuseau := coalesce(nullif(btrim(p_fuseau), ''), 'UTC');
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuseau) then
      raise exception 'invalid_reward_timezone' using errcode = '22023';
    end if;
    insert into private.journees_recompense_joueur(user_id, fuseau, cree_le) values (p_user, v_fuseau, v_now);
  end if;
  select * into v_jour from private.clutch_journee_recompense_v1(v_now, v_fuseau);
  insert into private.series_calls_etats(user_id, traite_jusqua, prochaine_cloture, cree_le, verifie_le)
  values (p_user, v_jour.jour - 1, v_jour.fin, v_now, v_now) on conflict do nothing;
  if found then
    insert into private.protecteurs_serie_mouvements(user_id, type, reference, quantite, stock_apres, cree_le)
    values (p_user, 'bienvenue', 'decouverte-p1', 1, 1, v_now);
  end if;
end;
$$;

-- Internal clock injection is for deterministic contract tests and the worker.
-- No client/RPC role can call this helper or supply the date of a call/day.
create function private.clutch_clore_journees_serie_v1(p_user uuid, p_now timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e private.series_calls_etats%rowtype;
  v_fuseau text;
  v_aujourdhui record;
  d date;
  v_debut timestamptz;
  v_fin timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('clutch-volts:' || p_user::text, 0));
  select * into strict e from private.series_calls_etats where user_id = p_user;
  select fuseau into strict v_fuseau from private.journees_recompense_joueur where user_id = p_user;
  select * into v_aujourdhui from private.clutch_journee_recompense_v1(p_now, v_fuseau);
  d := e.traite_jusqua + 1;
  while d < v_aujourdhui.jour and e.serie_actuelle > 0 loop
    if not exists (select 1 from private.series_calls_jours where user_id = p_user and jour = d) then
      v_debut := greatest(d::timestamp at time zone v_fuseau, e.cree_le);
      v_fin := (d + 1)::timestamp at time zone v_fuseau;
      if not private.clutch_opportunite_serie_v1(p_user, v_debut, v_fin) then
        insert into private.series_calls_jours values (p_user, d, 'neutre', 0, p_now);
      elsif e.stock_protecteurs > 0 and not e.protection_utilisee
        and not exists (select 1 from private.series_calls_jours where user_id = p_user and jour = d - 1 and etat = 'protege') then
        e.stock_protecteurs := e.stock_protecteurs - 1;
        e.protection_utilisee := true;
        insert into private.series_calls_jours values (p_user, d, 'protege', 0, p_now);
        insert into private.protecteurs_serie_mouvements(user_id, type, reference, quantite, stock_apres, cree_le)
        values (p_user, 'utilisation', d::text, -1, e.stock_protecteurs, p_now);
        perform private.clutch_journaliser_evenement_analytics_v1(p_user, 'streak_protector_used',
          p_cle_idempotence := 'streak-protected:' || d::text);
        if d = v_aujourdhui.jour - 1 then
          perform private.clutch_ajouter_notification_v1(p_user, 'serie_protegee', d::text,
            'Ta série est protégée', 'Un protecteur a couvert ta journée manquée. Aucun call fictif n’a été ajouté.',
            jsonb_build_object('path', '/streak', 'jour', d));
        end if;
      else
        insert into private.series_calls_jours values (p_user, d, 'manque', 0, p_now);
        e.serie_actuelle := 0;
        e.debut_serie := null;
        e.protection_utilisee := false;
      end if;
    end if;
    d := d + 1;
  end loop;
  update private.series_calls_etats set serie_actuelle = e.serie_actuelle,
    debut_serie = e.debut_serie, protection_utilisee = e.protection_utilisee,
    stock_protecteurs = e.stock_protecteurs, traite_jusqua = v_aujourdhui.jour - 1,
    prochaine_cloture = v_aujourdhui.fin, verifie_le = p_now where user_id = p_user;
end;
$$;

create function private.clutch_enregistrer_jour_call_v1(p_user uuid, p_pronostic uuid, p_match text, p_now timestamptz)
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
  update public.evenements_notification set statut = 'annule', maj_le = p_now
  where user_id = p_user and type = 'serie_en_danger' and cle_evenement = v_jour::text
    and statut in ('en_attente', 'traitement');
end;
$$;

create function private.clutch_observer_call_serie_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz;
begin
  if new.statut <> 'en_cours' or not exists (
    select 1 from auth.users where id = new.user_id and not coalesce(is_anonymous, false)
  ) then return null; end if;
  perform private.clutch_initialiser_serie_v1(new.user_id,
    coalesce((select fuseau from public.preferences_notifications where user_id = new.user_id), 'UTC'));
  v_now := clock_timestamp();
  -- The ranked-call RPC is authoritative, but its transaction may have waited
  -- on a lock past midnight/market closure. Never award a late call-day credit.
  if exists (select 1 from public.matchs m join public.saisons s on s.id = m.saison_id
    join public.matchs_scoring_frags f on f.match_id = m.id
    where m.id = new.match_id and m.statut = 'a_venir' and m.debut > v_now
      and s.debut <= v_now and s.fin >= v_now) then
    perform private.clutch_enregistrer_jour_call_v1(new.user_id, new.id, new.match_id, v_now);
  end if;
  return null;
end;
$$;
create trigger clutch_call_day_serie_v1 after insert on public.pronostics_classes
for each row execute function private.clutch_observer_call_serie_v1();

create function private.clutch_etat_serie_json_v1(p_user uuid, p_now timestamptz)
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
    'jalons', (select coalesce(jsonb_agg(jsonb_build_object('palier', palier, 'obtenu_le', obtenu_le) order by palier), '[]'::jsonb)
      from private.series_calls_jalons where user_id = p_user),
    'protecteurs_historique', (select coalesce(jsonb_agg(to_jsonb(m) order by m.cree_le desc), '[]'::jsonb)
      from (select id, type, quantite, stock_apres, cree_le from private.protecteurs_serie_mouvements
        where user_id = p_user order by cree_le desc, id limit 20) m)
  );
end;
$$;

create function private.clutch_ma_serie_calls_v1(p_fuseau text default 'UTC')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_now timestamptz;
begin
  perform private.clutch_initialiser_serie_v1(v_user, p_fuseau);
  v_now := clock_timestamp();
  perform private.clutch_clore_journees_serie_v1(v_user, v_now);
  return private.clutch_etat_serie_json_v1(v_user, v_now);
end;
$$;

create function private.clutch_selectionner_jalon_serie_v1(p_palier integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_now timestamptz;
begin
  perform private.clutch_initialiser_serie_v1(v_user);
  v_now := clock_timestamp();
  perform private.clutch_clore_journees_serie_v1(v_user, v_now);
  if p_palier is not null and not exists (select 1 from private.series_calls_jalons where user_id = v_user and palier = p_palier) then
    raise exception 'streak_milestone_locked' using errcode = '22023';
  end if;
  update private.series_calls_etats set jalon_selectionne = p_palier where user_id = v_user;
  return private.clutch_etat_serie_json_v1(v_user, v_now);
end;
$$;

-- Consumables use the same append-only accounting and lock as cosmetics/bonus.
alter table public.volts_mouvements drop constraint volts_mouvements_origine_check,
  drop constraint volts_mouvements_source_economique_check, drop constraint volts_mouvements_sens_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check check (origine in (
    'badge', 'saison', 'call', 'achat', 'achat_pack', 'ajustement', 'pari', 'faction', 'friend_quest',
    'onboarding', 'progression', 'mission', 'activation', 'exceptionnelle', 'bonus_quotidien', 'achat_consommable')),
  add constraint volts_mouvements_source_economique_check check (source_economique in (
    'onboarding', 'progression', 'mission', 'activation', 'exceptionnelle', 'achat_cosmetique',
    'achat_pack_cosmetique', 'ajustement', 'bonus_quotidien', 'achat_consommable')),
  add constraint volts_mouvements_sens_check check (
    (source_economique in ('onboarding', 'progression', 'mission', 'activation', 'exceptionnelle', 'bonus_quotidien') and montant > 0)
    or (source_economique in ('achat_cosmetique', 'achat_pack_cosmetique', 'achat_consommable') and montant < 0)
    or (source_economique = 'ajustement' and montant <> 0)),
  add constraint volts_mouvements_protecteur_check check (origine <> 'achat_consommable' or (
    montant = -90 and source_economique = 'achat_consommable' and objet_id is null and campagne_key is null
    and reference ~ '^protecteur-serie:[0-9a-f-]{36}$' and cle_idempotence = 'achat_consommable:' || reference));

create or replace function private.clutch_source_economique_volts_v1(p_origine text)
returns text language sql immutable parallel safe security invoker set search_path = '' as $$
  select case lower(btrim(p_origine))
    when 'onboarding' then 'onboarding'
    when 'badge' then 'progression' when 'saison' then 'progression' when 'call' then 'progression'
    when 'pari' then 'progression' when 'faction' then 'progression' when 'progression' then 'progression'
    when 'friend_quest' then 'mission' when 'mission' then 'mission'
    when 'activation' then 'activation' when 'exceptionnelle' then 'exceptionnelle'
    when 'achat' then 'achat_cosmetique' when 'achat_pack' then 'achat_pack_cosmetique'
    when 'ajustement' then 'ajustement' when 'bonus_quotidien' then 'bonus_quotidien'
    when 'achat_consommable' then 'achat_consommable' else null end;
$$;

create function private.clutch_acheter_protecteur_serie_v1(p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_now timestamptz;
  v_stock integer;
  v_mouvement uuid;
  v_achat private.protecteurs_serie_mouvements%rowtype;
begin
  if p_operation is null then raise exception 'purchase_operation_required' using errcode = '22023'; end if;
  perform private.clutch_initialiser_serie_v1(v_user);
  v_now := clock_timestamp();
  -- Settle expired days BEFORE making newly bought stock available. Buying
  -- after midnight cannot resurrect an unprotected streak from yesterday.
  perform private.clutch_clore_journees_serie_v1(v_user, v_now);
  select * into v_achat from private.protecteurs_serie_mouvements
  where user_id = v_user and type = 'achat' and reference = p_operation::text;
  if found then
    return jsonb_build_object('operation_id', p_operation, 'achete', false, 'mouvement_id', v_achat.mouvement_volts_id,
      'etat', private.clutch_etat_serie_json_v1(v_user, v_now));
  end if;
  select stock_protecteurs into strict v_stock from private.series_calls_etats where user_id = v_user;
  if v_stock >= 2 then raise exception 'protector_stock_full' using errcode = 'P0001'; end if;
  if (select coalesce(sum(montant), 0) from public.volts_mouvements where user_id = v_user) < 90 then
    raise exception 'insufficient_volts' using errcode = 'P0001';
  end if;
  insert into public.volts_mouvements(user_id, montant, origine, reference, cree_le)
  values (v_user, -90, 'achat_consommable', 'protecteur-serie:' || p_operation::text, v_now)
  returning id into v_mouvement;
  update private.series_calls_etats set stock_protecteurs = v_stock + 1 where user_id = v_user;
  insert into private.protecteurs_serie_mouvements(user_id, type, reference, quantite, stock_apres, mouvement_volts_id, cree_le)
  values (v_user, 'achat', p_operation::text, 1, v_stock + 1, v_mouvement, v_now);
  return jsonb_build_object('operation_id', p_operation, 'achete', true, 'mouvement_id', v_mouvement,
    'etat', private.clutch_etat_serie_json_v1(v_user, v_now));
end;
$$;

alter table public.preferences_notifications
  add column serie_en_danger boolean not null default true,
  add column serie_protegee boolean not null default true,
  add column silence_actif boolean not null default false,
  add column silence_debut integer not null default 1320 check (silence_debut between 0 and 1439),
  add column silence_fin integer not null default 480 check (silence_fin between 0 and 1439),
  add constraint preferences_notifications_silence_check check (silence_debut <> silence_fin);
alter table public.evenements_notification drop constraint evenements_notification_type_check;
alter table public.evenements_notification add constraint evenements_notification_type_check check (type in (
  'verrouillage_imminent', 'debut_match', 'verdict', 'promotion', 'mutation', 'duel_recu', 'serie_en_danger', 'serie_protegee'));

create or replace function private.clutch_notification_autorisee_v1(p_user_id uuid, p_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'verrouillage_imminent' then coalesce(p.verrouillage_imminent, true)
    when 'debut_match' then coalesce(p.debut_match, true)
    when 'verdict' then coalesce(p.verdict, true)
    when 'promotion' then coalesce(p.promotion, true)
    when 'mutation' then coalesce(p.mutation, true)
    when 'duel_recu' then coalesce(p.duel_recu, true)
    when 'serie_en_danger' then coalesce(p.serie_en_danger, true)
    when 'serie_protegee' then coalesce(p.serie_protegee, true)
    else false end
  from (select 1) seed left join public.preferences_notifications p on p.user_id = p_user_id;
$$;

create function private.clutch_hors_silence_notification_v1(p_user uuid, p_now timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select not coalesce(p.silence_actif, false) or case when p.silence_debut < p.silence_fin
    then minutes < p.silence_debut or minutes >= p.silence_fin
    else minutes >= p.silence_fin and minutes < p.silence_debut end
  from (select 1) seed left join public.preferences_notifications p on p.user_id = p_user
  cross join lateral (select extract(hour from p_now at time zone coalesce(p.fuseau, 'UTC')) * 60
    + extract(minute from p_now at time zone coalesce(p.fuseau, 'UTC')) as minutes) t;
$$;

create function private.clutch_mes_preferences_notification_v2()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_preferences public.preferences_notifications%rowtype;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_preferences from public.preferences_notifications where user_id = v_user;
  return public.clutch_mes_preferences_notification_v1() || jsonb_build_object(
    'retention_disponible', true,
    'serie_en_danger', coalesce(v_preferences.serie_en_danger, true),
    'serie_protegee', coalesce(v_preferences.serie_protegee, true),
    'silence_actif', coalesce(v_preferences.silence_actif, false),
    'silence_debut', coalesce(v_preferences.silence_debut, 1320),
    'silence_fin', coalesce(v_preferences.silence_fin, 480));
end;
$$;

create function private.clutch_enregistrer_preferences_notification_v2(
  p_fuseau text, p_verrouillage_imminent boolean, p_debut_match boolean, p_verdict boolean,
  p_promotion boolean, p_mutation boolean, p_duel_recu boolean,
  p_serie_en_danger boolean, p_serie_protegee boolean, p_silence_actif boolean,
  p_silence_debut integer, p_silence_fin integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_silence_debut is null or p_silence_fin is null or p_silence_debut not between 0 and 1439
     or p_silence_fin not between 0 and 1439 or p_silence_debut = p_silence_fin then
    raise exception 'invalid_quiet_hours' using errcode = '22023';
  end if;
  perform public.clutch_enregistrer_preferences_notification_v1(p_fuseau, p_verrouillage_imminent, p_debut_match,
    p_verdict, p_promotion, p_mutation, p_duel_recu);
  update public.preferences_notifications set serie_en_danger = coalesce(p_serie_en_danger, true),
    serie_protegee = coalesce(p_serie_protegee, true), silence_actif = coalesce(p_silence_actif, false),
    silence_debut = p_silence_debut, silence_fin = p_silence_fin, maj_le = clock_timestamp() where user_id = v_user;
  return private.clutch_mes_preferences_notification_v2();
end;
$$;

-- Called both when producing reminders and immediately before claiming them.
-- A reminder must still be actionable after a quiet period or a network retry.
create function private.clutch_rappel_serie_pertinent_v1(p_user uuid, p_jour text, p_now timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.series_calls_etats e
    join private.journees_recompense_joueur j on j.user_id = e.user_id
    where e.user_id = p_user and e.serie_actuelle > 0
      and p_jour = (p_now at time zone j.fuseau)::date::text
      and e.prochaine_cloture > p_now
      and e.prochaine_cloture <= p_now + interval '3 hours'
      and not exists (select 1 from private.series_calls_jours d
        where d.user_id = p_user and d.jour::text = p_jour and d.etat = 'valide')
      and exists (select 1 from public.matchs m join public.saisons s on s.id = m.saison_id
        join public.matchs_scoring_frags f on f.match_id = m.id
        where m.statut = 'a_venir' and m.debut > p_now and s.debut <= p_now and s.fin >= p_now
          and not exists (select 1 from public.pronostics_classes p where p.user_id = p_user and p.match_id = m.id)
          and not exists (select 1 from private.series_calls_preuves p where p.user_id = p_user and p.match_id = m.id))
  );
$$;

create function private.clutch_cycle_retention_p1()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v_now timestamptz; v_jour text; v_total integer := 0;
begin
  -- Round-robin bounded work. Try-locks prevent a batch holding user A from
  -- waiting on user B while match settlement holds them in the opposite order.
  for r in select e.user_id, j.fuseau from private.series_calls_etats e
    join private.journees_recompense_joueur j on j.user_id = e.user_id
    where e.serie_actuelle > 0 order by e.verifie_le, e.user_id limit 500 loop
    if not pg_try_advisory_xact_lock(hashtextextended('clutch-volts:' || r.user_id::text, 0)) then continue; end if;
    v_now := clock_timestamp();
    perform private.clutch_clore_journees_serie_v1(r.user_id, v_now);
    v_jour := (v_now at time zone r.fuseau)::date::text;
    if private.clutch_rappel_serie_pertinent_v1(r.user_id, v_jour, v_now)
      and private.clutch_hors_silence_notification_v1(r.user_id, v_now) then
      perform private.clutch_ajouter_notification_v1(r.user_id, 'serie_en_danger', v_jour,
        'Un call pour ta série', 'Il reste moins de 3 h pour valider ta journée. Un match éligible t’attend.',
        jsonb_build_object('path', '/streak', 'jour', v_jour));
    end if;
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

create function private.clutch_protection_notification_pertinente_v1(p_user uuid, p_jour text, p_now timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.series_calls_etats e
    join private.journees_recompense_joueur j on j.user_id = e.user_id
    join private.series_calls_jours d on d.user_id = e.user_id and d.etat = 'protege'
    where e.user_id = p_user and e.serie_actuelle > 0 and e.protection_utilisee
      and d.jour::text = p_jour and d.jour = (p_now at time zone j.fuseau)::date - 1
  );
$$;

create function private.clutch_reclamer_livraisons_notification_p1(p_limite integer default 100)
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
    'titre', e.titre, 'corps', e.corps, 'donnees', e.donnees || jsonb_build_object('notification_id', e.id),
    'type', e.type) order by e.planifie_pour, c.cree_le), '[]'::jsonb) into v_result
  from claimed c join public.evenements_notification e on e.id = c.notification_id;
  update public.evenements_notification e set statut = 'traitement', maj_le = v_now
  where e.statut = 'en_attente' and exists (select 1 from public.livraisons_notification l
    where l.notification_id = e.id and l.statut = 'traitement');
  return v_result;
end;
$$;

-- Accepted by Expo is an "envoi", not proof of delivery on the device. Delivery
-- receipts remain in the existing queue; analytics is deduplicated per event,
-- not per token, and still requires the user's analytics consent.
create function private.clutch_analytics_notification_envoyee_p1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.ticket_id is not null and old.ticket_id is null then
    select user_id into v_user from public.evenements_notification where id = new.notification_id;
    perform private.clutch_journaliser_evenement_analytics_v1(v_user, 'notification_sent',
      p_cle_idempotence := 'notification-sent:' || new.notification_id::text);
  end if;
  return null;
end;
$$;
create trigger clutch_analytics_notification_envoyee_p1 after update of ticket_id on public.livraisons_notification
for each row execute function private.clutch_analytics_notification_envoyee_p1();

create function private.clutch_ouvrir_notification_v2(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not exists (select 1 from public.evenements_notification where id = p_notification_id and user_id = v_user) then
    return false;
  end if;
  perform private.clutch_journaliser_evenement_analytics_v1(v_user, 'notification_opened',
    p_cle_idempotence := 'notification-opened:' || p_notification_id::text);
  return true;
end;
$$;

-- New events have server-side proof. The generic client analytics endpoint
-- deliberately still rejects every one of these event names.
alter table private.analytics_evenements drop constraint analytics_evenements_type_check;
alter table private.analytics_evenements add constraint analytics_evenements_type_check check (type_evenement in (
  'app_opened', 'daily_bonus_awarded', 'application_active', 'collection_affichee', 'objet_consulte',
  'objet_obtenu', 'objet_equipe', 'objet_retire', 'campagne_rejointe', 'tache_terminee', 'recompense_reclamee',
  'founder_pack_affiche', 'founder_pack_achat_demarre', 'founder_pack_restauration_demandee',
  'founder_pack_achat_annule', 'founder_pack_attribue', 'founder_pack_revoque', 'onboarding_commence',
  'onboarding_termine', 'match_consulte', 'call_commence', 'call_verrouille', 'resultat_consulte',
  'frags_gagnes', 'rank_consulte', 'profil_public_consulte', 'mission_commencee', 'mission_terminee',
  'achat_commence', 'achat_termine', 'notification_ouverte',
  'call_created', 'call_streak_extended', 'streak_protector_used', 'notification_sent', 'notification_opened'));

-- Preserve the full existing public contracts and extend them without copying
-- their economic baseline or changing the legacy event definitions.
alter function public.clutch_contrat_analytics_v1() rename to clutch_contrat_analytics_p0;
alter function public.clutch_contrat_analytics_p0() set schema private;
revoke all on function private.clutch_contrat_analytics_p0() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_analytics_p0() to anon, authenticated, service_role;
create function public.clutch_contrat_analytics_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_analytics_p0() || jsonb_build_object('version', 6,
    'evenements', (private.clutch_contrat_analytics_p0() -> 'evenements') ||
      '["call_created","call_streak_extended","streak_protector_used","notification_sent","notification_opened"]'::jsonb);
end;

alter function public.clutch_contrat_economie_volts_v1() rename to clutch_contrat_economie_volts_p0;
alter function public.clutch_contrat_economie_volts_p0() set schema private;
revoke all on function private.clutch_contrat_economie_volts_p0() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_economie_volts_p0() to anon, authenticated, service_role;
create function public.clutch_contrat_economie_volts_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_economie_volts_p0() || jsonb_build_object('version', 3,
    'consommables', jsonb_build_object('protecteur_serie', jsonb_build_object('prix_volts', 90,
      'stock_max', 2, 'offert_decouverte', 1, 'maximum_par_serie', 1, 'call_fictif', false, 'impact_frags', false)));
end;

-- Expose only fixed, account-bound operations via SQL-standard invokers. No
-- client gets table DML, USAGE on private, dates, amount or another user's ID.
create function public.clutch_ma_serie_calls_v1(p_fuseau text default 'UTC')
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_ma_serie_calls_v1(p_fuseau); end;
create function public.clutch_acheter_protecteur_serie_v1(p_operation uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_acheter_protecteur_serie_v1(p_operation); end;
create function public.clutch_selectionner_jalon_serie_v1(p_palier integer)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_selectionner_jalon_serie_v1(p_palier); end;
create function public.clutch_mes_preferences_notification_v2()
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_mes_preferences_notification_v2(); end;
create function public.clutch_enregistrer_preferences_notification_v2(
  p_fuseau text, p_verrouillage_imminent boolean, p_debut_match boolean, p_verdict boolean,
  p_promotion boolean, p_mutation boolean, p_duel_recu boolean,
  p_serie_en_danger boolean, p_serie_protegee boolean, p_silence_actif boolean,
  p_silence_debut integer, p_silence_fin integer
)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_enregistrer_preferences_notification_v2(p_fuseau, p_verrouillage_imminent,
  p_debut_match, p_verdict, p_promotion, p_mutation, p_duel_recu, p_serie_en_danger,
  p_serie_protegee, p_silence_actif, p_silence_debut, p_silence_fin); end;
create function public.clutch_ouvrir_notification_v2(p_notification_id uuid)
returns boolean language sql security invoker set search_path = ''
begin atomic select private.clutch_ouvrir_notification_v2(p_notification_id); end;
create or replace function public.clutch_reclamer_livraisons_notification_v1(p_limite integer default 100)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_reclamer_livraisons_notification_p1(p_limite); end;

revoke all on function private.clutch_synchroniser_fenetre_serie_v1(text), private.clutch_observer_fenetre_serie_v1(),
  private.clutch_observer_saison_serie_v1(), private.clutch_opportunite_serie_v1(uuid,timestamptz,timestamptz),
  private.clutch_initialiser_serie_v1(uuid,text), private.clutch_clore_journees_serie_v1(uuid,timestamptz),
  private.clutch_enregistrer_jour_call_v1(uuid,uuid,text,timestamptz), private.clutch_observer_call_serie_v1(),
  private.clutch_etat_serie_json_v1(uuid,timestamptz), private.clutch_cycle_retention_p1(),
  private.clutch_hors_silence_notification_v1(uuid,timestamptz), private.clutch_rappel_serie_pertinent_v1(uuid,text,timestamptz),
  private.clutch_protection_notification_pertinente_v1(uuid,text,timestamptz),
  private.clutch_analytics_notification_envoyee_p1(), private.clutch_source_economique_volts_v1(text),
  private.clutch_notification_autorisee_v1(uuid,text)
from public, anon, authenticated, service_role;

revoke all on function public.clutch_ma_serie_calls_v1(text), private.clutch_ma_serie_calls_v1(text),
  public.clutch_acheter_protecteur_serie_v1(uuid), private.clutch_acheter_protecteur_serie_v1(uuid),
  public.clutch_selectionner_jalon_serie_v1(integer), private.clutch_selectionner_jalon_serie_v1(integer),
  public.clutch_mes_preferences_notification_v2(), private.clutch_mes_preferences_notification_v2(),
  public.clutch_enregistrer_preferences_notification_v2(text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,integer,integer),
  private.clutch_enregistrer_preferences_notification_v2(text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,integer,integer),
  public.clutch_ouvrir_notification_v2(uuid), private.clutch_ouvrir_notification_v2(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_ma_serie_calls_v1(text), private.clutch_ma_serie_calls_v1(text),
  public.clutch_acheter_protecteur_serie_v1(uuid), private.clutch_acheter_protecteur_serie_v1(uuid),
  public.clutch_selectionner_jalon_serie_v1(integer), private.clutch_selectionner_jalon_serie_v1(integer),
  public.clutch_mes_preferences_notification_v2(), private.clutch_mes_preferences_notification_v2(),
  public.clutch_enregistrer_preferences_notification_v2(text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,integer,integer),
  private.clutch_enregistrer_preferences_notification_v2(text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,integer,integer),
  public.clutch_ouvrir_notification_v2(uuid), private.clutch_ouvrir_notification_v2(uuid) to authenticated;
revoke all on function public.clutch_reclamer_livraisons_notification_v1(integer),
  private.clutch_reclamer_livraisons_notification_p1(integer) from public, anon, authenticated, service_role;
grant execute on function public.clutch_reclamer_livraisons_notification_v1(integer),
  private.clutch_reclamer_livraisons_notification_p1(integer) to service_role;
revoke all on function public.clutch_contrat_economie_volts_v1(), public.clutch_contrat_analytics_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_economie_volts_v1(), public.clutch_contrat_analytics_v1()
to anon, authenticated, service_role;

-- Supabase already provides pg_cron through the notification migrations. This
-- only schedules the database worker; no deployment or live push is sent here.
select cron.schedule('clutch-retention-minute', '* * * * *', 'select private.clutch_cycle_retention_p1()');
