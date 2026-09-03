-- P2: referrals, private showcase visits, reversible likes and verified sharing.
-- P0 calendar / append-only ledger and P1 eligible-call proofs remain authoritative.
-- No client-supplied reward, date, beneficiary or competitive-stat mutation.

create table private.croissance_installations (
  user_id uuid not null references public.profils(id) on delete cascade,
  empreinte bytea not null,
  cree_le timestamptz not null default clock_timestamp(),
  primary key (user_id, empreinte)
);
create index croissance_installations_empreinte_idx on private.croissance_installations(empreinte, user_id);
create table private.croissance_secret (
  singleton boolean primary key default true check (singleton),
  sel text not null default gen_random_uuid()::text
);
insert into private.croissance_secret default values;

create table private.croissance_limites (
  user_id uuid not null references public.profils(id) on delete cascade,
  action text not null,
  minute timestamptz not null,
  compteur integer not null check (compteur > 0),
  primary key (user_id, action, minute)
);
create index croissance_limites_expiration_idx on private.croissance_limites(minute);

create table private.parrainage_liens (
  user_id uuid primary key references public.profils(id) on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', '') check (code ~ '^[0-9a-f]{32}$'),
  cree_le timestamptz not null default clock_timestamp()
);
create table private.parrainage_partages (
  user_id uuid not null references private.parrainage_liens(user_id) on delete cascade,
  operation uuid not null,
  cree_le timestamptz not null default clock_timestamp(),
  primary key (user_id, operation)
);
create table private.parrainages (
  id uuid primary key default gen_random_uuid(),
  filleul_id uuid not null unique references public.profils(id) on delete cascade,
  parrain_id uuid not null references public.profils(id) on delete cascade,
  inscrit_le timestamptz not null default clock_timestamp(),
  active_le timestamptz,
  premier_call uuid,
  recompense text not null default 'en_attente' check (recompense in ('en_attente', 'attribuee', 'plafonnee', 'verification')),
  verification_requise boolean not null default false,
  mouvement_id uuid references public.volts_mouvements(id) on delete cascade,
  jour_recompense date,
  check (parrain_id <> filleul_id),
  check ((active_le is null) = (premier_call is null)),
  check ((recompense = 'attribuee') = (mouvement_id is not null)),
  check ((mouvement_id is null) = (jour_recompense is null))
);
create index parrainages_parrain_idx on private.parrainages(parrain_id, inscrit_le desc);
create index parrainages_recompenses_idx on private.parrainages(parrain_id, jour_recompense) where mouvement_id is not null;
create index parrainages_attente_idx on private.parrainages(parrain_id, active_le, id)
  where active_le is not null and recompense = 'en_attente';
create unique index parrainages_mouvement_idx on private.parrainages(mouvement_id) where mouvement_id is not null;

create table private.vitrines_sociales (
  user_id uuid primary key references public.profils(id) on delete cascade,
  visibilite text not null default 'publique' check (visibilite in ('publique', 'cercle', 'privee')),
  montrer_rang boolean not null default true,
  montrer_serie boolean not null default true,
  montrer_jalons boolean not null default true,
  notifications_likes boolean not null default true,
  vues_total bigint not null default 0 check (vues_total >= 0)
);
create table private.vitrines_vues (
  proprietaire_id uuid not null references public.profils(id) on delete cascade,
  visiteur_id uuid not null references public.profils(id) on delete cascade,
  jour date not null,
  cree_le timestamptz not null default clock_timestamp(),
  primary key (proprietaire_id, visiteur_id, jour),
  check (proprietaire_id <> visiteur_id)
);
create index vitrines_vues_visiteur_idx on private.vitrines_vues(visiteur_id);
create index vitrines_vues_periode_idx on private.vitrines_vues(proprietaire_id, cree_le);
create index vitrines_vues_expiration_idx on private.vitrines_vues(cree_le);
create table private.vitrines_likes (
  proprietaire_id uuid not null references public.profils(id) on delete cascade,
  visiteur_id uuid not null references public.profils(id) on delete cascade,
  cree_le timestamptz not null default clock_timestamp(),
  primary key (proprietaire_id, visiteur_id),
  check (proprietaire_id <> visiteur_id)
);
create index vitrines_likes_visiteur_idx on private.vitrines_likes(visiteur_id);
create index vitrines_likes_recents_idx on private.vitrines_likes(proprietaire_id, cree_le);

-- Tables are deliberately not exposed by the Data API; narrow RPCs project data.
do $$ declare t text; begin
  foreach t in array array['croissance_installations', 'croissance_secret', 'croissance_limites',
    'parrainage_liens', 'parrainage_partages', 'parrainages', 'vitrines_sociales', 'vitrines_vues', 'vitrines_likes'] loop
    execute format('alter table private.%I enable row level security', t);
    execute format('revoke all on table private.%I from public, anon, authenticated, service_role', t);
    if t <> 'croissance_secret' then execute format('grant select on table private.%I to service_role', t); end if;
  end loop;
end $$;

create function private.clutch_compte_croissance_v1()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid());
begin
  if u is null or not exists (select 1 from auth.users where id = u and not coalesce(is_anonymous, false)
    and (email_confirmed_at is not null or phone_confirmed_at is not null)
    and deleted_at is null and (banned_until is null or banned_until <= now())) then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  return u;
end $$;

create function private.clutch_action_croissance_v1(p_user uuid, p_action text, p_max integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into private.croissance_limites(user_id, action, minute, compteur)
  values (p_user, p_action, date_trunc('minute', clock_timestamp()), 1)
  on conflict (user_id, action, minute) do update set compteur = private.croissance_limites.compteur + 1
    where private.croissance_limites.compteur < p_max returning compteur into n;
  return n is not null;
end $$;

create function private.clutch_installation_croissance_v1(p_user uuid, p_installation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h bytea; partage boolean;
begin
  if p_installation is null then raise exception 'installation_required' using errcode = '22023'; end if;
  h := sha256(convert_to((select sel from private.croissance_secret) || p_installation::text, 'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended('clutch-install:' || encode(h, 'hex'), 0));
  partage := exists (select 1 from private.croissance_installations where empreinte = h and user_id <> p_user);
  insert into private.croissance_installations(user_id, empreinte) values (p_user, h) on conflict do nothing;
  return partage;
end $$;

create function private.clutch_creer_invitation_v1(p_installation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); c text;
begin
  if not private.clutch_action_croissance_v1(u, 'invite_create', 10) then return jsonb_build_object('erreur', 'rate_limited'); end if;
  perform private.clutch_installation_croissance_v1(u, p_installation);
  insert into private.parrainage_liens(user_id) values (u) on conflict do nothing;
  if found then perform private.clutch_journaliser_evenement_analytics_v1(u, 'invite_link_created', p_cle_idempotence := 'invite-link-p2'); end if;
  select code into c from private.parrainage_liens where user_id = u;
  return jsonb_build_object('code', c, 'chemin', '/i/' || c);
end $$;

create function private.clutch_invitation_publique_v1(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profils%rowtype;
begin
  if p_code is null or p_code !~ '^[0-9a-f]{32}$' then return null; end if;
  select pr.* into p from private.parrainage_liens l join public.profils pr on pr.id = l.user_id
    join auth.users au on au.id = pr.id
  where l.code = p_code and not coalesce(au.is_anonymous, false)
    and (au.email_confirmed_at is not null or au.phone_confirmed_at is not null)
    and au.deleted_at is null and (au.banned_until is null or au.banned_until <= now());
  if not found or private.clutch_utilisateurs_bloques_v1((select auth.uid()), p.id) then return null; end if;
  -- Private inviters can still share a code without disclosing their identity.
  return jsonb_build_object('valide', true, 'parrain', case when p.profil_public then p.pseudo else null end,
    'recompense_volts', 30, 'plafond_jour', 5, 'plafond_mois', 20, 'protecteur_bienvenue', 1);
end $$;

create function private.clutch_accepter_invitation_v1(p_code text, p_installation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); r uuid; existant uuid; suspect boolean; v_now timestamptz;
begin
  if not private.clutch_action_croissance_v1(u, 'invite_accept', 10) then return jsonb_build_object('erreur', 'rate_limited'); end if;
  if private.clutch_invitation_publique_v1(p_code) is null then return jsonb_build_object('erreur', 'invite_invalid'); end if;
  select user_id into r from private.parrainage_liens where code = p_code;
  if r = u then return jsonb_build_object('erreur', 'invite_self'); end if;
  perform pg_advisory_xact_lock(hashtextextended('clutch-volts:' || u::text, 0));
  select parrain_id into existant from private.parrainages where filleul_id = u;
  if found then
    if existant = r then return jsonb_build_object('acceptee', true, 'nouvelle', false); end if;
    return jsonb_build_object('erreur', 'invite_already_attributed');
  end if;
  v_now := clock_timestamp();
  if not exists (select 1 from auth.users filleul join auth.users parrain on parrain.id = r
    where filleul.id = u and filleul.created_at >= v_now - interval '7 days'
      and parrain.created_at < filleul.created_at)
    or exists (select 1 from private.series_calls_preuves where user_id = u)
    or exists (select 1 from public.pronostics_classes where user_id = u) then
    return jsonb_build_object('erreur', 'invite_not_new_account');
  end if;
  suspect := private.clutch_installation_croissance_v1(u, p_installation);
  insert into private.parrainages(filleul_id, parrain_id, verification_requise) values (u, r, suspect);
  -- P1 owns this welcome benefit. Replaying this invitation never adds stock.
  perform private.clutch_initialiser_serie_v1(u,
    coalesce((select fuseau from public.preferences_notifications where user_id = u), 'UTC'));
  return jsonb_build_object('acceptee', true, 'nouvelle', true);
end $$;

create function private.clutch_activation_parrainage_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- P1 inserts these proofs only after an accepted, open ranked market check.
  -- Never acquire the inviter's economy lock while the invitee is placing a call.
  update private.parrainages set active_le = new.recu_le, premier_call = new.pronostic_id
  where filleul_id = new.user_id and active_le is null
    and exists (select 1 from public.profils where id = new.user_id
      and equipe_favorite_id is not null and cardinality(jeux_suivis) > 0);
  if found then perform private.clutch_journaliser_evenement_analytics_v1(new.user_id, 'invite_activated', p_cle_idempotence := 'invite-activated-p2'); end if;
  return null;
end $$;
create trigger clutch_activation_parrainage_p2 after insert on private.series_calls_preuves
for each row execute function private.clutch_activation_parrainage_v1();

-- Give referrals their own ledger origin (and support-history label).
alter table public.volts_mouvements drop constraint volts_mouvements_origine_check,
  drop constraint volts_mouvements_source_economique_check, drop constraint volts_mouvements_sens_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check check (origine in (
    'badge','saison','call','achat','achat_pack','ajustement','pari','faction','friend_quest','onboarding',
    'progression','mission','activation','exceptionnelle','bonus_quotidien','achat_consommable','parrainage')),
  add constraint volts_mouvements_source_economique_check check (source_economique in (
    'onboarding','progression','mission','activation','exceptionnelle','achat_cosmetique','achat_pack_cosmetique',
    'ajustement','bonus_quotidien','achat_consommable','parrainage')),
  add constraint volts_mouvements_sens_check check (
    (source_economique in ('onboarding','progression','mission','activation','exceptionnelle','bonus_quotidien','parrainage') and montant > 0)
    or (source_economique in ('achat_cosmetique','achat_pack_cosmetique','achat_consommable') and montant < 0)
    or (source_economique = 'ajustement' and montant <> 0)),
  add constraint volts_mouvements_parrainage_check check (origine <> 'parrainage' or (
    montant = 30 and source_economique = 'parrainage' and objet_id is null and campagne_key is null
    and reference ~ '^parrainage:[0-9a-f-]{36}$' and cle_idempotence = 'parrainage:' || reference));
create or replace function private.clutch_source_economique_volts_v1(p_origine text)
returns text language sql immutable parallel safe security invoker set search_path = '' as $$
  select case lower(btrim(p_origine))
    when 'onboarding' then 'onboarding' when 'badge' then 'progression' when 'saison' then 'progression'
    when 'call' then 'progression' when 'pari' then 'progression' when 'faction' then 'progression'
    when 'progression' then 'progression' when 'friend_quest' then 'mission' when 'mission' then 'mission'
    when 'activation' then 'activation' when 'exceptionnelle' then 'exceptionnelle' when 'achat' then 'achat_cosmetique'
    when 'achat_pack' then 'achat_pack_cosmetique' when 'ajustement' then 'ajustement'
    when 'bonus_quotidien' then 'bonus_quotidien' when 'achat_consommable' then 'achat_consommable'
    when 'parrainage' then 'parrainage' else null end;
$$;

-- The internal clock override supports deterministic calendar contract tests;
-- neither this helper nor its clock is exposed to Data API roles.
create function private.clutch_recompenser_parrain_v1(p_user uuid, p_now timestamptz default clock_timestamp())
returns void language plpgsql security definer set search_path = '' as $$
declare r private.parrainages%rowtype; j date; m date; n integer; n_mois integer; id_mouvement uuid; v_now timestamptz; zone text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('clutch-volts:' || p_user::text, 0)) then return; end if;
  perform private.clutch_initialiser_serie_v1(p_user,
    coalesce((select fuseau from public.preferences_notifications where user_id = p_user), 'UTC'));
  v_now := coalesce(p_now, clock_timestamp());
  select fuseau, (v_now at time zone fuseau)::date into strict zone, j from private.journees_recompense_joueur where user_id = p_user;
  m := date_trunc('month', j::timestamp)::date;
  -- Quotas survive deletion of an invitee: the inviter's append-only ledger
  -- remains the authority, not the erasable referral relationship.
  select count(*) filter (where (cree_le at time zone zone)::date = j), count(*) into n, n_mois
  from public.volts_mouvements where user_id = p_user and origine = 'parrainage'
    and cree_le >= m::timestamp at time zone zone
    and cree_le < (m + interval '1 month') at time zone zone;
  for r in select * from private.parrainages where parrain_id = p_user and active_le is not null
    and recompense = 'en_attente' order by active_le, id limit 100 for update skip locked loop
    if r.verification_requise or private.clutch_utilisateurs_bloques_v1(p_user, r.filleul_id)
      or exists (select 1 from auth.users where id in (p_user, r.filleul_id) and
        (coalesce(is_anonymous, false) or (email_confirmed_at is null and phone_confirmed_at is null)
          or deleted_at is not null or banned_until > v_now)) then
      update private.parrainages set recompense = 'verification' where id = r.id;
    elsif n >= 5 or n_mois >= 20 then
      update private.parrainages set recompense = 'plafonnee' where id = r.id;
    else
      insert into public.volts_mouvements(user_id, montant, origine, reference, cree_le)
      values (p_user, 30, 'parrainage', 'parrainage:' || r.id::text, v_now)
      on conflict (user_id, origine, reference) do nothing returning id into id_mouvement;
      if id_mouvement is null then select id into strict id_mouvement from public.volts_mouvements
        where user_id = p_user and origine = 'parrainage' and reference = 'parrainage:' || r.id::text; end if;
      update private.parrainages set recompense = 'attribuee', mouvement_id = id_mouvement, jour_recompense = j where id = r.id;
      n := n + 1; n_mois := n_mois + 1;
    end if;
  end loop;
end $$;

create function private.clutch_mes_invitations_v1()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); result jsonb; j date; zone text;
begin
  perform private.clutch_recompenser_parrain_v1(u);
  select fuseau, (clock_timestamp() at time zone fuseau)::date into zone, j from private.journees_recompense_joueur where user_id = u;
  select jsonb_build_object('code', (select code from private.parrainage_liens where user_id = u),
    'partages', (select count(*) from private.parrainage_partages where user_id = u),
    'inscrits', count(*), 'actives', count(*) filter (where active_le is not null),
    'volts_recus', (select coalesce(sum(montant),0) from public.volts_mouvements where user_id = u and origine = 'parrainage'),
    'recompenses_jour', (select count(*) from public.volts_mouvements where user_id = u and origine = 'parrainage' and (cree_le at time zone zone)::date = j),
    'recompenses_mois', (select count(*) from public.volts_mouvements where user_id = u and origine = 'parrainage' and cree_le >= date_trunc('month',j::timestamp) at time zone zone),
    'montant', 30, 'plafond_jour', 5, 'plafond_mois', 20,
    'deja_parraine', exists (select 1 from private.parrainages where filleul_id = u),
    'historique', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'inscrit_le', x.inscrit_le,
      'active_le', x.active_le, 'recompense', x.recompense) order by x.inscrit_le desc), '[]'::jsonb)
      from (select id, inscrit_le, active_le, recompense from private.parrainages
        where parrain_id = u order by inscrit_le desc limit 25) x)) into result
  from private.parrainages where parrain_id = u;
  return result;
end $$;

create function private.clutch_partager_invitation_v1(p_operation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1();
begin
  if p_operation is null or not private.clutch_action_croissance_v1(u, 'invite_share', 10) then return false; end if;
  if not exists (select 1 from private.parrainage_liens where user_id = u) then return false; end if;
  insert into private.parrainage_partages(user_id, operation) values (u, p_operation) on conflict do nothing;
  return true;
end $$;

create function private.clutch_vitrine_accessible_v1(p_owner uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (p_owner = p_viewer or (p.profil_public
    and not private.clutch_utilisateurs_bloques_v1(p_owner, p_viewer)
    and (coalesce(v.visibilite, 'publique') = 'publique'
      or (v.visibilite = 'cercle' and exists (select 1 from public.amities a
        where a.a = least(p_owner, p_viewer) and a.b = greatest(p_owner, p_viewer) and a.statut = 'acceptee')))))
    and au.deleted_at is null and (au.banned_until is null or au.banned_until <= now())
    and (p_viewer is null or exists (select 1 from auth.users viewer where viewer.id = p_viewer
      and viewer.deleted_at is null and (viewer.banned_until is null or viewer.banned_until <= now())))
    from public.profils p join auth.users au on au.id = p.id
    left join private.vitrines_sociales v on v.user_id = p.id where p.id = p_owner), false);
$$;

create function private.clutch_vitrine_v1(p_pseudo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); o uuid; p jsonb; v private.vitrines_sociales%rowtype; s jsonb;
begin
  if length(coalesce(p_pseudo, '')) not between 1 and 48 then return null; end if;
  o := private.clutch_resoudre_pseudo_v1(p_pseudo);
  if not private.clutch_vitrine_accessible_v1(o, u) then return null; end if;
  select * into v from private.vitrines_sociales where user_id = o;
  p := to_jsonb(public.clutch_profil_public_v1(p_pseudo));
  if p is null then return null; end if;
  -- A read-only visitor must never mutate another player's streak. If its
  -- background closure is overdue, omit the current count until refreshed.
  select jsonb_build_object('actuelle', case when coalesce(v.montrer_serie, true) and e.prochaine_cloture > now() then e.serie_actuelle else null end,
    'meilleure', case when coalesce(v.montrer_serie, true) then e.meilleure_serie else null end,
    'jalon', case when coalesce(v.montrer_jalons, true) then e.jalon_selectionne else null end)
  into s from private.series_calls_etats e where e.user_id = o;
  return jsonb_build_object('pseudo', p -> 'pseudo', 'avatar_id', p -> 'avatar_id',
    'titre', p -> 'titre_profil', 'equipe', p -> 'equipe_favorite',
    'classement', case when coalesce(v.montrer_rang, true) then p -> 'classement' else null end,
    'cosmetiques', public.clutch_cosmetiques_profil_v1(p_pseudo), 'serie', s,
    'proprietaire', coalesce(o = u, false), 'profil_public', p -> 'profil_public',
    'visibilite', coalesce(v.visibilite, 'publique'),
    'montrer_rang', coalesce(v.montrer_rang, true), 'montrer_serie', coalesce(v.montrer_serie, true),
    'montrer_jalons', coalesce(v.montrer_jalons, true),
    'notifications_likes', case when o = u then coalesce(v.notifications_likes, true) else null end,
    'likes', (select count(*) from private.vitrines_likes l where l.proprietaire_id = o
      and private.clutch_vitrine_accessible_v1(o, l.visiteur_id)),
    'aime', exists (select 1 from private.vitrines_likes where proprietaire_id = o and visiteur_id = u),
    'peut_aimer', u is not null and u <> o and exists (select 1 from auth.users where id = u
      and not coalesce(is_anonymous, false) and (email_confirmed_at is not null or phone_confirmed_at is not null)
      and deleted_at is null and (banned_until is null or banned_until <= now())),
    'vues', case when o = u then coalesce(v.vues_total, 0) else null end,
    'vues_semaine', case when o = u then (select count(*) from private.vitrines_vues
      where proprietaire_id = o and cree_le >= now() - interval '7 days') else null end,
    'vues_semaine_precedente', case when o = u then (select count(*) from private.vitrines_vues
      where proprietaire_id = o and cree_le >= now() - interval '14 days' and cree_le < now() - interval '7 days') else null end);
end $$;

create function private.clutch_visiter_vitrine_v1(p_pseudo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); o uuid; j date; v_new boolean;
begin
  if not private.clutch_action_croissance_v1(u, 'showcase_view', 30) then return jsonb_build_object('erreur', 'rate_limited'); end if;
  o := private.clutch_resoudre_pseudo_v1(p_pseudo);
  if not private.clutch_vitrine_accessible_v1(o, u) then return null; end if;
  if o <> u then
    j := (clock_timestamp() at time zone 'UTC')::date;
    insert into private.vitrines_vues(proprietaire_id, visiteur_id, jour) values (o, u, j) on conflict do nothing;
    v_new := found;
    if v_new then
      insert into private.vitrines_sociales(user_id, vues_total) values (o, 1)
      on conflict (user_id) do update set vues_total = private.vitrines_sociales.vues_total + 1;
      perform private.clutch_journaliser_evenement_analytics_v1(u, 'showcase_viewed',
        p_cle_idempotence := 'showcase-view:' || o::text || ':' || j::text);
    end if;
  end if;
  return private.clutch_vitrine_v1(p_pseudo);
end $$;

create function private.clutch_aimer_vitrine_v1(p_pseudo text, p_aime boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); o uuid;
begin
  if not private.clutch_action_croissance_v1(u, 'showcase_like', 20) then return jsonb_build_object('erreur', 'rate_limited'); end if;
  if p_aime is null then return jsonb_build_object('erreur', 'like_state_required'); end if;
  o := private.clutch_resoudre_pseudo_v1(p_pseudo);
  if o is null or o = u then return jsonb_build_object('erreur', 'like_unavailable'); end if;
  perform pg_advisory_xact_lock(hashtextextended('clutch-like:' || o::text || ':' || u::text, 0));
  -- Unliking remains possible after access is revoked. Return no private data.
  if not p_aime then
    delete from private.vitrines_likes where proprietaire_id = o and visiteur_id = u;
    return private.clutch_vitrine_v1(p_pseudo);
  end if;
  if not private.clutch_vitrine_accessible_v1(o, u) then return null; end if;
  insert into private.vitrines_likes(proprietaire_id, visiteur_id) values (o, u) on conflict do nothing;
  if found then perform private.clutch_journaliser_evenement_analytics_v1(u, 'showcase_liked',
    p_cle_idempotence := 'showcase-like:' || o::text || ':' || (clock_timestamp() at time zone 'UTC')::date::text); end if;
  return private.clutch_vitrine_v1(p_pseudo);
end $$;

create function private.clutch_preferences_vitrine_v1(
  p_visibilite text, p_rang boolean, p_serie boolean, p_jalons boolean, p_notifications boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); pseudo text;
begin
  if p_visibilite is null or p_visibilite not in ('publique', 'cercle', 'privee')
    or p_rang is null or p_serie is null or p_jalons is null or p_notifications is null then
    raise exception 'invalid_showcase_preferences' using errcode = '22023';
  end if;
  insert into private.vitrines_sociales(user_id, visibilite, montrer_rang, montrer_serie, montrer_jalons, notifications_likes)
  values (u, p_visibilite, p_rang, p_serie, p_jalons, p_notifications)
  on conflict (user_id) do update set visibilite = excluded.visibilite, montrer_rang = excluded.montrer_rang,
    montrer_serie = excluded.montrer_serie, montrer_jalons = excluded.montrer_jalons, notifications_likes = excluded.notifications_likes;
  select p.pseudo into pseudo from public.profils p where p.id = u;
  return private.clutch_vitrine_v1(pseudo);
end $$;

create function private.clutch_jalon_public_v1(p_pseudo text, p_palier integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o uuid; p public.profils%rowtype; v private.vitrines_sociales%rowtype;
begin
  o := private.clutch_resoudre_pseudo_v1(p_pseudo);
  select * into p from public.profils where id = o;
  select * into v from private.vitrines_sociales where user_id = o;
  if not coalesce(p.profil_public, false) or coalesce(v.visibilite, 'publique') <> 'publique'
    or not coalesce(v.montrer_jalons, true) or not private.clutch_vitrine_accessible_v1(o, (select auth.uid()))
    or not exists (select 1 from private.series_calls_jalons where user_id = o and palier = p_palier) then return null; end if;
  return jsonb_build_object('pseudo', p.pseudo, 'palier', p_palier,
    'obtenu_le', (select obtenu_le from private.series_calls_jalons where user_id = o and palier = p_palier));
end $$;

create function private.clutch_partage_jalon_v1(p_palier integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.clutch_compte_croissance_v1(); pseudo text; j jsonb;
begin
  if not private.clutch_action_croissance_v1(u, 'milestone_share', 10) then return jsonb_build_object('erreur', 'rate_limited'); end if;
  select p.pseudo into pseudo from public.profils p where p.id = u;
  j := private.clutch_jalon_public_v1(pseudo, p_palier);
  if j is null then return jsonb_build_object('erreur', 'milestone_not_public'); end if;
  perform private.clutch_journaliser_evenement_analytics_v1(u, 'milestone_share_created',
    p_cle_idempotence := 'milestone-share:' || p_palier::text || ':' || (clock_timestamp() at time zone 'UTC')::date::text);
  return j;
end $$;

alter table private.analytics_evenements drop constraint analytics_evenements_type_check;
alter table private.analytics_evenements add constraint analytics_evenements_type_check check (type_evenement in (
  'app_opened','daily_bonus_awarded','application_active','collection_affichee','objet_consulte','objet_obtenu',
  'objet_equipe','objet_retire','campagne_rejointe','tache_terminee','recompense_reclamee','founder_pack_affiche',
  'founder_pack_achat_demarre','founder_pack_restauration_demandee','founder_pack_achat_annule','founder_pack_attribue',
  'founder_pack_revoque','onboarding_commence','onboarding_termine','match_consulte','call_commence','call_verrouille',
  'resultat_consulte','frags_gagnes','rank_consulte','profil_public_consulte','mission_commencee','mission_terminee',
  'achat_commence','achat_termine','notification_ouverte','call_created','call_streak_extended','streak_protector_used',
  'notification_sent','notification_opened','invite_link_created','invite_activated','showcase_viewed','showcase_liked','milestone_share_created'));
-- Generic client analytics deliberately does NOT accept these proof-backed events.
alter function public.clutch_contrat_analytics_v1() rename to clutch_contrat_analytics_p1;
alter function public.clutch_contrat_analytics_p1() set schema private;
revoke all on function private.clutch_contrat_analytics_p1() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_analytics_p1() to anon, authenticated, service_role;
create function public.clutch_contrat_analytics_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_analytics_p1() || jsonb_build_object('version', 7,
    'evenements', (private.clutch_contrat_analytics_p1() -> 'evenements') ||
      '["invite_link_created","invite_activated","showcase_viewed","showcase_liked","milestone_share_created"]'::jsonb);
end;
alter function public.clutch_contrat_economie_volts_v1() rename to clutch_contrat_economie_volts_p1;
alter function public.clutch_contrat_economie_volts_p1() set schema private;
revoke all on function private.clutch_contrat_economie_volts_p1() from public, anon, authenticated, service_role;
grant execute on function private.clutch_contrat_economie_volts_p1() to anon, authenticated, service_role;
create function public.clutch_contrat_economie_volts_v1()
returns jsonb language sql immutable parallel safe security invoker set search_path = ''
begin atomic
  select private.clutch_contrat_economie_volts_p1() || jsonb_build_object('version', 4,
    'parrainage', jsonb_build_object('montant_volts',30,'plafond_jour',5,'plafond_mois',20,
      'declencheur','premier_call_eligible','gain_installation',false,'protecteur_bienvenue','unique_p1'));
end;

alter table public.evenements_notification drop constraint evenements_notification_type_check;
alter table public.evenements_notification add constraint evenements_notification_type_check check (type in (
  'verrouillage_imminent','debut_match','verdict','promotion','mutation','duel_recu','serie_en_danger','serie_protegee','vitrine_likes'));
create or replace function private.clutch_notification_autorisee_v1(p_user_id uuid, p_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'verrouillage_imminent' then coalesce(p.verrouillage_imminent,true)
    when 'debut_match' then coalesce(p.debut_match,true) when 'verdict' then coalesce(p.verdict,true)
    when 'promotion' then coalesce(p.promotion,true) when 'mutation' then coalesce(p.mutation,true)
    when 'duel_recu' then coalesce(p.duel_recu,true) when 'serie_en_danger' then coalesce(p.serie_en_danger,true)
    when 'serie_protegee' then coalesce(p.serie_protegee,true)
    when 'vitrine_likes' then coalesce((select notifications_likes from private.vitrines_sociales where user_id = p_user_id),true)
    else false end from (select 1) seed left join public.preferences_notifications p on p.user_id = p_user_id;
$$;

create function private.clutch_notification_vitrine_pertinente_v1(p_owner uuid, p_now timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.vitrines_likes l where l.proprietaire_id = p_owner
    and l.cree_le >= p_now - interval '24 hours' and private.clutch_vitrine_accessible_v1(p_owner, l.visiteur_id));
$$;

-- Delivery rechecks privacy/blocks and unlike, not just queue-time eligibility.
do $$ declare d text; marker text := 'and private.clutch_hors_silence_notification_v1(e.user_id, v_now)'; begin
  select pg_get_functiondef('private.clutch_reclamer_livraisons_notification_p1(integer)'::regprocedure) into d;
  if strpos(d, marker) = 0 then raise exception 'notification delivery contract changed'; end if;
  execute replace(d, marker, marker || E'\n      and (e.type <> ''vitrine_likes'' or private.clutch_notification_vitrine_pertinente_v1(e.user_id, v_now))');
end $$;

create function private.clutch_cycle_croissance_p2()
returns void language plpgsql security definer set search_path = '' as $$
declare r record; n timestamptz := clock_timestamp(); j text := (clock_timestamp() at time zone 'UTC')::date::text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('clutch-growth-worker-p2',0)) then return; end if;
  for r in select parrain_id from private.parrainages where active_le is not null and recompense = 'en_attente'
    group by parrain_id order by min(active_le), parrain_id limit 100 loop
    perform private.clutch_recompenser_parrain_v1(r.parrain_id);
  end loop;
  for r in select distinct l.proprietaire_id from private.vitrines_likes l
    where l.cree_le >= n - interval '24 hours'
      and private.clutch_notification_autorisee_v1(l.proprietaire_id,'vitrine_likes')
      and private.clutch_vitrine_accessible_v1(l.proprietaire_id,l.visiteur_id)
      and not exists (select 1 from public.evenements_notification e where e.user_id = l.proprietaire_id
        and e.type = 'vitrine_likes' and e.cle_evenement = j)
    order by l.proprietaire_id limit 500 loop
    perform private.clutch_ajouter_notification_v1(r.proprietaire_id,'vitrine_likes',j,
      'Ta vitrine plaît à la communauté','De nouveaux likes sur ta vitrine. Découvre son activité.',
      jsonb_build_object('path','/showcase-activity'));
  end loop;
  delete from private.croissance_limites where minute < n - interval '1 day';
  delete from private.vitrines_vues where cree_le < n - interval '90 days';
end $$;

-- Narrow SQL-standard invokers bind helper OIDs without USAGE on private.
create function public.clutch_creer_invitation_v1(p_installation uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_creer_invitation_v1(p_installation); end;
create function public.clutch_accepter_invitation_v1(p_code text,p_installation uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_accepter_invitation_v1(p_code,p_installation); end;
create function public.clutch_mes_invitations_v1()
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_mes_invitations_v1(); end;
create function public.clutch_partager_invitation_v1(p_operation uuid)
returns boolean language sql security invoker set search_path = ''
begin atomic select private.clutch_partager_invitation_v1(p_operation); end;
create function public.clutch_invitation_publique_v1(p_code text)
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_invitation_publique_v1(p_code); end;
create function public.clutch_vitrine_v1(p_pseudo text)
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_vitrine_v1(p_pseudo); end;
create function public.clutch_visiter_vitrine_v1(p_pseudo text)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_visiter_vitrine_v1(p_pseudo); end;
create function public.clutch_aimer_vitrine_v1(p_pseudo text,p_aime boolean)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_aimer_vitrine_v1(p_pseudo,p_aime); end;
create function public.clutch_preferences_vitrine_v1(p_visibilite text,p_rang boolean,p_serie boolean,p_jalons boolean,p_notifications boolean)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_preferences_vitrine_v1(p_visibilite,p_rang,p_serie,p_jalons,p_notifications); end;
create function public.clutch_jalon_public_v1(p_pseudo text,p_palier integer)
returns jsonb language sql stable security invoker set search_path = ''
begin atomic select private.clutch_jalon_public_v1(p_pseudo,p_palier); end;
create function public.clutch_partage_jalon_v1(p_palier integer)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.clutch_partage_jalon_v1(p_palier); end;

revoke all on function private.clutch_compte_croissance_v1(),private.clutch_action_croissance_v1(uuid,text,integer),
  private.clutch_installation_croissance_v1(uuid,uuid),private.clutch_activation_parrainage_v1(),
  private.clutch_recompenser_parrain_v1(uuid,timestamptz),private.clutch_vitrine_accessible_v1(uuid,uuid),
  private.clutch_notification_vitrine_pertinente_v1(uuid,timestamptz),private.clutch_cycle_croissance_p2()
from public,anon,authenticated,service_role;

do $$ declare sig text; s text; begin
  foreach sig in array array['clutch_creer_invitation_v1(uuid)','clutch_accepter_invitation_v1(text,uuid)',
    'clutch_mes_invitations_v1()','clutch_partager_invitation_v1(uuid)','clutch_visiter_vitrine_v1(text)',
    'clutch_aimer_vitrine_v1(text,boolean)','clutch_preferences_vitrine_v1(text,boolean,boolean,boolean,boolean)',
    'clutch_partage_jalon_v1(integer)'] loop
    foreach s in array array['private','public'] loop
      execute 'revoke all on function ' || s || '.' || sig || ' from public,anon,authenticated,service_role';
      execute 'grant execute on function ' || s || '.' || sig || ' to authenticated';
    end loop;
  end loop;
  foreach sig in array array['clutch_invitation_publique_v1(text)','clutch_vitrine_v1(text)','clutch_jalon_public_v1(text,integer)'] loop
    foreach s in array array['private','public'] loop
      execute 'revoke all on function ' || s || '.' || sig || ' from public,anon,authenticated,service_role';
      execute 'grant execute on function ' || s || '.' || sig || ' to anon,authenticated,service_role';
    end loop;
  end loop;
end $$;
revoke all on function public.clutch_contrat_analytics_v1(),public.clutch_contrat_economie_volts_v1() from public,anon,authenticated,service_role;
grant execute on function public.clutch_contrat_analytics_v1(),public.clutch_contrat_economie_volts_v1() to anon,authenticated,service_role;

select cron.schedule('clutch-growth-p2','* * * * *','select private.clutch_cycle_croissance_p2()');
