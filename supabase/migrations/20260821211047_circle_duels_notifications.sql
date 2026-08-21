-- Lot 2.3 / 2.4 — Cercle hebdomadaire, duels cibles et notifications utiles.
--
-- Les notifications sont produites uniquement par un evenement produit concret :
-- verrouillage d'un match pertinent, debut d'un match suivi, verdict, promotion,
-- mutation de faction ou duel cible. Aucun rappel generique n'est planifie.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- Preferences, appareils et file d'envoi
-- -----------------------------------------------------------------------------

create table if not exists public.preferences_notifications (
  user_id uuid primary key references public.profils(id) on delete cascade,
  fuseau text not null default 'UTC',
  verrouillage_imminent boolean not null default true,
  debut_match boolean not null default true,
  verdict boolean not null default true,
  promotion boolean not null default true,
  mutation boolean not null default true,
  duel_recu boolean not null default true,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create table if not exists public.jetons_notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  jeton_expo text not null unique,
  plateforme text not null check (plateforme in ('ios', 'android', 'unknown')),
  appareil_id text,
  actif boolean not null default true,
  vu_le timestamptz not null default now(),
  desactive_le timestamptz,
  motif_desactivation text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  check (appareil_id is null or length(appareil_id) between 8 and 180)
);

create unique index if not exists jetons_notification_appareil_actif_idx
  on public.jetons_notification(user_id, appareil_id)
  where actif and appareil_id is not null;

create index if not exists jetons_notification_user_actif_idx
  on public.jetons_notification(user_id, vu_le desc)
  where actif;

create table if not exists public.evenements_notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  type text not null check (type in (
    'verrouillage_imminent', 'debut_match', 'verdict',
    'promotion', 'mutation', 'duel_recu'
  )),
  cle_evenement text not null,
  titre text not null,
  corps text not null,
  donnees jsonb not null default '{}'::jsonb,
  planifie_pour timestamptz not null default now(),
  statut text not null default 'en_attente' check (statut in (
    'en_attente', 'traitement', 'envoye', 'echec', 'annule'
  )),
  derniere_erreur text,
  envoye_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (user_id, type, cle_evenement),
  check (length(cle_evenement) between 1 and 240),
  check (length(titre) between 1 and 120),
  check (length(corps) between 1 and 240)
);

create index if not exists evenements_notification_file_idx
  on public.evenements_notification(planifie_pour, cree_le)
  where statut in ('en_attente', 'traitement');

create table if not exists public.livraisons_notification (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.evenements_notification(id) on delete cascade,
  jeton_id uuid not null references public.jetons_notification(id) on delete cascade,
  jeton_expo text not null,
  statut text not null default 'en_attente' check (statut in (
    'en_attente', 'traitement', 'ticket', 'verification', 'livre', 'echec'
  )),
  tentatives smallint not null default 0,
  prochaine_tentative timestamptz not null default now(),
  ticket_id text unique,
  code_erreur text,
  message_erreur text,
  envoye_le timestamptz,
  reclame_recu_le timestamptz,
  verifie_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (notification_id, jeton_id),
  check (tentatives between 0 and 12)
);

create index if not exists livraisons_notification_file_idx
  on public.livraisons_notification(prochaine_tentative, cree_le)
  where statut in ('en_attente', 'traitement', 'echec');

create index if not exists livraisons_notification_recus_idx
  on public.livraisons_notification(envoye_le, cree_le)
  where statut in ('ticket', 'verification');

alter table public.preferences_notifications enable row level security;
alter table public.jetons_notification enable row level security;
alter table public.evenements_notification enable row level security;
alter table public.livraisons_notification enable row level security;

revoke all privileges on table public.preferences_notifications from public, anon, authenticated;
revoke all privileges on table public.jetons_notification from public, anon, authenticated;
revoke all privileges on table public.evenements_notification from public, anon, authenticated;
revoke all privileges on table public.livraisons_notification from public, anon, authenticated;

grant select, insert, update, delete on table public.preferences_notifications to service_role;
grant select, insert, update, delete on table public.jetons_notification to service_role;
grant select, insert, update, delete on table public.evenements_notification to service_role;
grant select, insert, update, delete on table public.livraisons_notification to service_role;

drop policy if exists preferences_notifications_proprietaire on public.preferences_notifications;
create policy preferences_notifications_proprietaire
  on public.preferences_notifications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists jetons_notification_proprietaire on public.jetons_notification;
create policy jetons_notification_proprietaire
  on public.jetons_notification for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists evenements_notification_proprietaire on public.evenements_notification;
create policy evenements_notification_proprietaire
  on public.evenements_notification for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists livraisons_notification_proprietaire on public.livraisons_notification;
create policy livraisons_notification_proprietaire
  on public.livraisons_notification for select to authenticated
  using (
    exists (
      select 1
      from public.evenements_notification e
      where e.id = notification_id and e.user_id = (select auth.uid())
    )
  );

create or replace function private.clutch_notification_autorisee_v1(
  p_user_id uuid,
  p_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'verrouillage_imminent' then coalesce(p.verrouillage_imminent, true)
    when 'debut_match' then coalesce(p.debut_match, true)
    when 'verdict' then coalesce(p.verdict, true)
    when 'promotion' then coalesce(p.promotion, true)
    when 'mutation' then coalesce(p.mutation, true)
    when 'duel_recu' then coalesce(p.duel_recu, true)
    else false
  end
  from (select 1) seed
  left join public.preferences_notifications p on p.user_id = p_user_id;
$$;

create or replace function private.clutch_ajouter_notification_v1(
  p_user_id uuid,
  p_type text,
  p_cle_evenement text,
  p_titre text,
  p_corps text,
  p_donnees jsonb default '{}'::jsonb,
  p_planifie_pour timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
begin
  if p_user_id is null
     or not private.clutch_notification_autorisee_v1(p_user_id, p_type) then
    return null;
  end if;

  insert into public.evenements_notification(
    user_id, type, cle_evenement, titre, corps, donnees, planifie_pour
  ) values (
    p_user_id,
    p_type,
    left(p_cle_evenement, 240),
    left(p_titre, 120),
    left(p_corps, 240),
    coalesce(p_donnees, '{}'::jsonb),
    coalesce(p_planifie_pour, now())
  )
  on conflict (user_id, type, cle_evenement) do nothing
  returning id into v_notification_id;

  if v_notification_id is null then return null; end if;

  insert into public.livraisons_notification(
    notification_id, jeton_id, jeton_expo, prochaine_tentative
  )
  select v_notification_id, j.id, j.jeton_expo, greatest(now(), p_planifie_pour)
  from public.jetons_notification j
  where j.user_id = p_user_id and j.actif
  on conflict (notification_id, jeton_id) do nothing;

  return v_notification_id;
end;
$$;

revoke all privileges on function private.clutch_notification_autorisee_v1(uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_ajouter_notification_v1(uuid, text, text, text, text, jsonb, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.clutch_mes_preferences_notification_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'fuseau', coalesce(p.fuseau, 'UTC'),
    'verrouillage_imminent', coalesce(p.verrouillage_imminent, true),
    'debut_match', coalesce(p.debut_match, true),
    'verdict', coalesce(p.verdict, true),
    'promotion', coalesce(p.promotion, true),
    'mutation', coalesce(p.mutation, true),
    'duel_recu', coalesce(p.duel_recu, true),
    'appareils_actifs', (
      select count(*)::integer
      from public.jetons_notification j
      where j.user_id = auth.uid() and j.actif
    )
  ) end
  from (select 1) seed
  left join public.preferences_notifications p on p.user_id = auth.uid();
$$;

create or replace function public.clutch_enregistrer_preferences_notification_v1(
  p_fuseau text,
  p_verrouillage_imminent boolean,
  p_debut_match boolean,
  p_verdict boolean,
  p_promotion boolean,
  p_mutation boolean,
  p_duel_recu boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_fuseau text := trim(coalesce(p_fuseau, 'UTC'));
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuseau) then
    raise exception 'fuseau horaire invalide' using errcode = '22023';
  end if;

  insert into public.preferences_notifications(
    user_id, fuseau, verrouillage_imminent, debut_match,
    verdict, promotion, mutation, duel_recu
  ) values (
    v_user, v_fuseau, coalesce(p_verrouillage_imminent, true),
    coalesce(p_debut_match, true), coalesce(p_verdict, true),
    coalesce(p_promotion, true), coalesce(p_mutation, true),
    coalesce(p_duel_recu, true)
  )
  on conflict (user_id) do update set
    fuseau = excluded.fuseau,
    verrouillage_imminent = excluded.verrouillage_imminent,
    debut_match = excluded.debut_match,
    verdict = excluded.verdict,
    promotion = excluded.promotion,
    mutation = excluded.mutation,
    duel_recu = excluded.duel_recu,
    maj_le = now();

  return public.clutch_mes_preferences_notification_v1();
end;
$$;

create or replace function public.clutch_enregistrer_jeton_notification_v1(
  p_jeton_expo text,
  p_plateforme text,
  p_appareil_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_jeton text := trim(coalesce(p_jeton_expo, ''));
  v_plateforme text := lower(trim(coalesce(p_plateforme, 'unknown')));
  v_appareil text := nullif(trim(coalesce(p_appareil_id, '')), '');
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_jeton !~ '^(Expo|Exponent)PushToken\\[[A-Za-z0-9_-]+\\]$' then
    raise exception 'jeton Expo invalide' using errcode = '22023';
  end if;
  if v_plateforme not in ('ios', 'android', 'unknown') then
    v_plateforme := 'unknown';
  end if;
  if v_appareil is not null and length(v_appareil) not between 8 and 180 then
    raise exception 'identifiant appareil invalide' using errcode = '22023';
  end if;

  if v_appareil is not null then
    update public.jetons_notification
    set actif = false,
        desactive_le = now(),
        motif_desactivation = 'jeton_remplace',
        maj_le = now()
    where user_id = v_user
      and appareil_id = v_appareil
      and jeton_expo <> v_jeton
      and actif;
  end if;

  insert into public.jetons_notification(
    user_id, jeton_expo, plateforme, appareil_id
  ) values (v_user, v_jeton, v_plateforme, v_appareil)
  on conflict (jeton_expo) do update set
    user_id = excluded.user_id,
    plateforme = excluded.plateforme,
    appareil_id = excluded.appareil_id,
    actif = true,
    vu_le = now(),
    desactive_le = null,
    motif_desactivation = null,
    maj_le = now()
  returning id into v_id;

  insert into public.livraisons_notification(
    notification_id, jeton_id, jeton_expo, prochaine_tentative
  )
  select e.id, v_id, v_jeton, greatest(now(), e.planifie_pour)
  from public.evenements_notification e
  where e.user_id = v_user
    and e.statut = 'en_attente'
    and e.planifie_pour >= now() - interval '10 minutes'
  on conflict (notification_id, jeton_id) do nothing;

  return jsonb_build_object('enregistre', true, 'appareils_actifs', (
    select count(*)::integer
    from public.jetons_notification j
    where j.user_id = v_user and j.actif
  ));
end;
$$;

create or replace function public.clutch_desactiver_mon_jeton_notification_v1(
  p_jeton_expo text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  update public.jetons_notification
  set actif = false,
      desactive_le = now(),
      motif_desactivation = 'utilisateur',
      maj_le = now()
  where user_id = auth.uid() and jeton_expo = trim(p_jeton_expo) and actif;
  return found;
end;
$$;

revoke all privileges on function public.clutch_mes_preferences_notification_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_enregistrer_preferences_notification_v1(text, boolean, boolean, boolean, boolean, boolean, boolean)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_enregistrer_jeton_notification_v1(text, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_desactiver_mon_jeton_notification_v1(text)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_mes_preferences_notification_v1() to authenticated;
grant execute on function public.clutch_enregistrer_preferences_notification_v1(text, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.clutch_enregistrer_jeton_notification_v1(text, text, text) to authenticated;
grant execute on function public.clutch_desactiver_mon_jeton_notification_v1(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Classement ISO du Cercle et carte de performance
-- -----------------------------------------------------------------------------

create or replace function public.clutch_cercle_hebdo_v1(
  p_saison_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_saison text;
  v_debut timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  v_fin timestamptz := v_debut + interval '7 days';
  v_resultat jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(
    p_saison_id,
    (select s.id from public.v_saisons s where s.statut = 'en_cours' order by s.debut desc limit 1)
  ) into v_saison;

  with cercle as (
    select v_user as user_id
    union
    select case when a.a = v_user then a.b else a.a end
    from public.amities a
    where a.statut = 'acceptee' and v_user in (a.a, a.b)
  ), hebdo as (
    select p.user_id,
           count(*) filter (where p.statut in ('gagne', 'perdu'))::integer as calls,
           count(*) filter (where p.statut = 'gagne')::integer as victoires,
           coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne', 'perdu')), 0)::integer as frags_hebdo,
           coalesce(max(p.delta_frags) filter (where p.statut = 'gagne'), 0)::integer as meilleur_call
    from public.pronostics_classes p
    join cercle c on c.user_id = p.user_id
    where p.saison_id = v_saison
      and p.regle_le >= v_debut and p.regle_le < v_fin
    group by p.user_id
  ), base as (
    select pr.id,
           pr.pseudo,
           coalesce(eq.tag, '') as tag_favori,
           coalesce(h.calls, 0)::integer as calls,
           coalesce(h.victoires, 0)::integer as victoires,
           coalesce(h.frags_hebdo, 0)::integer as frags_hebdo,
           coalesce(h.meilleur_call, 0)::integer as meilleur_call,
           coalesce(cf.frags, public.clutch_frags_initial())::integer as frags,
           coalesce(cf.pronostics_regles, 0)::integer as pronostics_regles,
           public.clutch_grade_frags_v1(
             coalesce(cf.frags, public.clutch_frags_initial()),
             coalesce(cf.pronostics_regles, 0)
           ) as grade
    from cercle c
    join public.profils pr on pr.id = c.user_id
    left join public.equipes eq on eq.id = pr.equipe_favorite_id
    left join public.classements_frags cf on cf.user_id = c.user_id and cf.saison_id = v_saison
    left join hebdo h on h.user_id = c.user_id
  ), classes as (
    select b.*,
           row_number() over (
             order by b.frags_hebdo desc, b.victoires desc, b.calls desc, b.frags desc, b.id asc
           )::integer as rang,
           case when b.calls = 0 then null
                else round(b.victoires::numeric / b.calls * 100, 1) end as precision_pct
    from base b
  ), moi as (
    select * from classes where id = v_user
  )
  select jsonb_build_object(
    'saison_id', v_saison,
    'semaine', to_char(v_debut at time zone 'UTC', 'IYYY-"S"IW'),
    'debut', v_debut,
    'fin', v_fin,
    'classement', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'pseudo', c.pseudo,
        'tag_favori', c.tag_favori,
        'rang', c.rang,
        'calls', c.calls,
        'victoires', c.victoires,
        'precision_pct', c.precision_pct,
        'frags_hebdo', c.frags_hebdo,
        'meilleur_call', c.meilleur_call,
        'frags', c.frags,
        'grade', c.grade,
        'moi', c.id = v_user
      ) order by c.rang)
      from classes c
    ), '[]'::jsonb),
    'moi', (select jsonb_build_object(
      'id', m.id,
      'pseudo', m.pseudo,
      'tag_favori', m.tag_favori,
      'rang', m.rang,
      'participants', (select count(*)::integer from classes),
      'calls', m.calls,
      'victoires', m.victoires,
      'precision_pct', m.precision_pct,
      'frags_hebdo', m.frags_hebdo,
      'meilleur_call', m.meilleur_call,
      'frags', m.frags,
      'grade', m.grade
    ) from moi m)
  ) into v_resultat;

  return v_resultat;
end;
$$;

revoke all privileges on function public.clutch_cercle_hebdo_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_cercle_hebdo_v1(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Duels : le face-a-face reste une projection du marche classe match_winner.
-- Une cible optionnelle permet une invitation directe au sein du Cercle.
-- -----------------------------------------------------------------------------

alter table public.defis_match
  add column if not exists cible_id uuid references public.profils(id) on delete set null;

alter table public.defis_match
  drop constraint if exists defis_match_cible_distincte;
alter table public.defis_match
  add constraint defis_match_cible_distincte
  check (cible_id is null or cible_id <> createur_id);

create index if not exists defis_match_cible_statut_idx
  on public.defis_match(cible_id, statut, cree_le desc)
  where cible_id is not null;

drop function if exists public.clutch_creer_defi_match(text);

create function public.clutch_creer_defi_match(
  p_match_id text,
  p_cible_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_prono public.pronostics_classes%rowtype;
  v_match public.matchs%rowtype;
  v_defi public.defis_match%rowtype;
  v_attente integer;
begin
  if v_moi is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_cible_id = v_moi then
    raise exception 'tu ne peux pas te defier toi-meme' using errcode = '22023';
  end if;
  if p_cible_id is not null and not exists (
    select 1
    from public.amities a
    where a.statut = 'acceptee'
      and (
        (a.a = v_moi and a.b = p_cible_id)
        or (a.a = p_cible_id and a.b = v_moi)
      )
  ) then
    raise exception 'ce joueur ne fait pas partie de ton cercle' using errcode = '42501';
  end if;

  select * into v_match from public.matchs where id = p_match_id;
  if not found then raise exception 'match introuvable' using errcode = 'P0002'; end if;
  if v_match.statut <> 'a_venir' or v_match.debut <= now() then
    raise exception 'ce match ne peut plus etre defie' using errcode = 'P0001';
  end if;

  select * into v_prono
  from public.pronostics_classes
  where user_id = v_moi and match_id = p_match_id and statut = 'en_cours'
  limit 1;
  if not found then
    raise exception 'verrouille d abord ton pronostic sur ce match' using errcode = 'P0001';
  end if;

  select * into v_defi
  from public.defis_match
  where createur_id = v_moi and match_id = p_match_id
  for update;

  if found then
    if v_defi.statut = 'annule' then
      update public.defis_match
      set token = replace(gen_random_uuid()::text, '-', ''),
          createur_pronostic_id = v_prono.id,
          saison_id = v_prono.saison_id,
          cible_id = p_cible_id,
          accepteur_id = null,
          accepteur_pronostic_id = null,
          statut = 'en_attente',
          cree_le = now(),
          accepte_le = null,
          termine_le = null,
          annule_le = null
      where id = v_defi.id
      returning * into v_defi;
    elsif v_defi.statut = 'en_attente'
          and v_defi.cible_id is distinct from p_cible_id then
      raise exception 'une autre invitation est deja ouverte sur ce match' using errcode = 'P0001';
    end if;

    return jsonb_build_object(
      'id', v_defi.id,
      'token', v_defi.token,
      'statut', v_defi.statut,
      'match_id', v_defi.match_id,
      'cible_id', v_defi.cible_id,
      'marche', 'match_winner',
      'marche_classe', true
    );
  end if;

  select count(*) into v_attente
  from public.defis_match
  where createur_id = v_moi and statut = 'en_attente';
  if v_attente >= 10 then
    raise exception 'trop de defis en attente' using errcode = 'P0001';
  end if;

  insert into public.defis_match(
    match_id, saison_id, createur_id, createur_pronostic_id, cible_id
  ) values (
    p_match_id, v_prono.saison_id, v_moi, v_prono.id, p_cible_id
  ) returning * into v_defi;

  return jsonb_build_object(
    'id', v_defi.id,
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id,
    'cible_id', v_defi.cible_id,
    'marche', 'match_winner',
    'marche_classe', true
  );
end;
$$;

create or replace function public.clutch_defi_match_public(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select dm.*,
      case when dm.statut = 'en_attente' and (m.statut <> 'a_venir' or m.debut <= now()) then 'expire' else dm.statut end as statut_effectif,
      m.jeu, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b, m.evenement, m.format, m.debut, m.score_a, m.score_b,
      pc.choix as createur_choix, pc.conviction as createur_conviction, pc.multiplicateur_conviction as createur_mult,
      pa.choix as accepteur_choix, pa.conviction as accepteur_conviction,
      pcrea.pseudo as createur_pseudo,
      pacc.pseudo as accepteur_pseudo,
      pcible.pseudo as cible_pseudo
    from public.defis_match dm
    join public.v_matchs m on m.id = dm.match_id
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.profils pcrea on pcrea.id = dm.createur_id
    left join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = dm.accepteur_id
    left join public.profils pcible on pcible.id = dm.cible_id
    where dm.token = lower(trim(p_token))
    limit 1
  ), moi as (
    select p.id, p.choix, p.conviction, p.statut
    from d
    join public.pronostics_classes p on p.match_id = d.match_id
    where auth.uid() is not null and p.user_id = auth.uid()
    limit 1
  )
  select case when d.id is null then null else jsonb_build_object(
    'token', d.token,
    'statut', d.statut_effectif,
    'match_id', d.match_id,
    'jeu', d.jeu,
    'evenement', d.evenement,
    'format', d.format,
    'debut', d.debut,
    'score_a', d.score_a,
    'score_b', d.score_b,
    'equipe_a', d.equipe_a,
    'equipe_b', d.equipe_b,
    'tag_a', d.tag_a,
    'tag_b', d.tag_b,
    'marche', 'match_winner',
    'marche_libelle', 'Vainqueur de la serie',
    'marche_classe', true,
    'createur_pseudo', d.createur_pseudo,
    'createur_choix', d.createur_choix,
    'createur_conviction', d.createur_conviction,
    'createur_multiplicateur', d.createur_mult,
    'choix_oppose', case when d.createur_choix = 'a' then 'b' else 'a' end,
    'equipe_opposee', case when d.createur_choix = 'a' then d.equipe_b else d.equipe_a end,
    'tag_oppose', case when d.createur_choix = 'a' then d.tag_b else d.tag_a end,
    'ciblee', d.cible_id is not null,
    'cible_pseudo', d.cible_pseudo,
    'accepteur_pseudo', d.accepteur_pseudo,
    'accepteur_choix', d.accepteur_choix,
    'accepteur_conviction', d.accepteur_conviction,
    'moi_role', case
      when auth.uid() = d.createur_id then 'createur'
      when auth.uid() = d.accepteur_id then 'accepteur'
      when auth.uid() = d.cible_id then 'cible'
      else 'visiteur'
    end,
    'mon_prono', case when moi.id is null then null else jsonb_build_object(
      'id', moi.id,
      'choix', moi.choix,
      'conviction', moi.conviction,
      'statut', moi.statut
    ) end
  ) end
  from d left join moi on true;
$$;

create or replace function public.clutch_accepter_defi_match(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
  v_createur public.pronostics_classes%rowtype;
  v_mien public.pronostics_classes%rowtype;
  v_match public.matchs%rowtype;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;

  select * into v_defi from public.defis_match where token = lower(trim(p_token)) for update;
  if not found then raise exception 'defi introuvable' using errcode = 'P0002'; end if;
  if v_defi.createur_id = v_moi then raise exception 'tu ne peux pas accepter ton propre defi' using errcode = 'P0001'; end if;
  if v_defi.cible_id is not null and v_defi.cible_id <> v_moi then
    raise exception 'ce duel est reserve a un autre joueur' using errcode = '42501';
  end if;
  if v_defi.statut <> 'en_attente' then raise exception 'ce defi n est plus disponible' using errcode = 'P0001'; end if;

  select * into v_match from public.matchs where id = v_defi.match_id;
  if v_match.statut <> 'a_venir' or v_match.debut <= now() then
    raise exception 'ce defi est expire' using errcode = 'P0001';
  end if;

  select * into v_createur from public.pronostics_classes where id = v_defi.createur_pronostic_id;
  select * into v_mien from public.pronostics_classes
  where user_id = v_moi and match_id = v_defi.match_id and statut = 'en_cours'
  limit 1;
  if not found then raise exception 'verrouille ton pronostic avant d accepter' using errcode = 'P0001'; end if;
  if v_mien.choix = v_createur.choix then
    raise exception 'ton pronostic est du meme camp que le challenger' using errcode = 'P0001';
  end if;

  update public.defis_match
  set accepteur_id = v_moi,
      accepteur_pronostic_id = v_mien.id,
      statut = 'accepte',
      accepte_le = now()
  where id = v_defi.id
  returning * into v_defi;

  return jsonb_build_object(
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id,
    'marche', 'match_winner',
    'marche_classe', true
  );
end;
$$;

create or replace function public.clutch_mes_defis_match(p_limite integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce(jsonb_agg(x order by x.quand desc), '[]'::jsonb) end
  from (
    select
      d.token,
      case when d.statut = 'en_attente' and (m.statut <> 'a_venir' or m.debut <= now()) then 'expire' else d.statut end as statut,
      d.match_id,
      d.cree_le as quand,
      d.accepte_le,
      d.termine_le,
      d.cible_id,
      pcible.pseudo as cible_pseudo,
      d.cible_id is not null as ciblee,
      'match_winner'::text as marche,
      'Vainqueur de la serie'::text as marche_libelle,
      true as marche_classe,
      m.jeu, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b, m.evenement, m.debut, m.score_a, m.score_b,
      pc.choix as createur_choix, pc.conviction as createur_conviction, pcrea.pseudo as createur_pseudo,
      pa.choix as accepteur_choix, pa.conviction as accepteur_conviction, pacc.pseudo as accepteur_pseudo,
      case
        when d.createur_id = auth.uid() then 'createur'
        when d.accepteur_id = auth.uid() then 'accepteur'
        else 'cible'
      end as moi_role
    from public.defis_match d
    join public.v_matchs m on m.id = d.match_id
    join public.pronostics_classes pc on pc.id = d.createur_pronostic_id
    join public.profils pcrea on pcrea.id = d.createur_id
    left join public.pronostics_classes pa on pa.id = d.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = d.accepteur_id
    left join public.profils pcible on pcible.id = d.cible_id
    where auth.uid() is not null
      and (
        d.createur_id = auth.uid()
        or d.accepteur_id = auth.uid()
        or (d.cible_id = auth.uid() and d.statut = 'en_attente')
      )
    order by d.cree_le desc
    limit greatest(1, least(coalesce(p_limite, 30), 50))
  ) x;
$$;

create or replace function private.clutch_notifier_duel_cible_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_createur text;
  v_match record;
begin
  if new.cible_id is null or new.statut <> 'en_attente' then return new; end if;
  if tg_op = 'UPDATE'
     and old.cible_id is not distinct from new.cible_id
     and old.token is not distinct from new.token then return new; end if;

  select p.pseudo into v_createur from public.profils p where p.id = new.createur_id;
  select m.tag_a, m.tag_b into v_match from public.v_matchs m where m.id = new.match_id;

  perform private.clutch_ajouter_notification_v1(
    new.cible_id,
    'duel_recu',
    new.token,
    'Nouveau duel',
    coalesce(v_createur, 'Un joueur') || ' te defie sur ' || coalesce(v_match.tag_a, 'A') || ' - ' || coalesce(v_match.tag_b, 'B') || '.',
    jsonb_build_object(
      'path', '/duel/' || new.token,
      'duel_token', new.token,
      'match_id', new.match_id
    ),
    now()
  );
  return new;
end;
$$;

drop trigger if exists trg_clutch_notifier_duel_cible_v1 on public.defis_match;
create trigger trg_clutch_notifier_duel_cible_v1
after insert or update of cible_id, token on public.defis_match
for each row execute function private.clutch_notifier_duel_cible_v1();

revoke all privileges on function private.clutch_notifier_duel_cible_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_creer_defi_match(text, uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_defi_match_public(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_accepter_defi_match(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_defis_match(integer)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_creer_defi_match(text, uuid) to authenticated;
grant execute on function public.clutch_defi_match_public(text) to anon, authenticated;
grant execute on function public.clutch_accepter_defi_match(text) to authenticated;
grant execute on function public.clutch_mes_defis_match(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Production des notifications evenementielles
-- -----------------------------------------------------------------------------

create or replace function private.clutch_notifier_verdict_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match record;
  v_verdicts_avant integer;
  v_grade_avant jsonb;
  v_grade_apres jsonb;
begin
  if new.statut not in ('gagne', 'perdu')
     or old.statut is not distinct from new.statut then
    return new;
  end if;

  select m.tag_a, m.tag_b into v_match
  from public.v_matchs m where m.id = new.match_id;

  select count(*)::integer into v_verdicts_avant
  from public.pronostics_classes p
  where p.user_id = new.user_id
    and p.saison_id = new.saison_id
    and p.id <> new.id
    and p.statut in ('gagne', 'perdu')
    and (p.regle_le, p.cree_le, p.id) < (new.regle_le, new.cree_le, new.id);

  v_grade_avant := public.clutch_grade_frags_v1(
    coalesce(new.frags_avant, public.clutch_frags_initial()),
    v_verdicts_avant
  );
  v_grade_apres := public.clutch_grade_frags_v1(
    coalesce(new.frags_apres, public.clutch_frags_initial()),
    v_verdicts_avant + 1
  );

  perform private.clutch_ajouter_notification_v1(
    new.user_id,
    'verdict',
    new.id::text,
    case when new.statut = 'gagne' then 'Call valide' else 'Verdict disponible' end,
    coalesce(v_match.tag_a, 'A') || ' - ' || coalesce(v_match.tag_b, 'B') ||
      ' : ' || case when new.delta_frags >= 0 then '+' else '' end ||
      coalesce(new.delta_frags, 0)::text || ' Frags.',
    jsonb_build_object(
      'path', '/result/' || new.match_id,
      'match_id', new.match_id,
      'pronostic_id', new.id,
      'statut', new.statut
    ),
    now()
  );

  if v_grade_avant ? 'cle'
     and v_grade_apres ? 'cle'
     and (v_grade_apres ->> 'ordre')::integer > (v_grade_avant ->> 'ordre')::integer then
    perform private.clutch_ajouter_notification_v1(
      new.user_id,
      'promotion',
      new.id::text,
      'Promotion Clutch',
      'Tu passes ' || coalesce(v_grade_apres ->> 'libelle', 'au grade suivant') || '.',
      jsonb_build_object(
        'path', '/result/' || new.match_id,
        'match_id', new.match_id,
        'grade', v_grade_apres ->> 'cle'
      ),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clutch_notifier_verdict_v1 on public.pronostics_classes;
create trigger trg_clutch_notifier_verdict_v1
after update of statut on public.pronostics_classes
for each row execute function private.clutch_notifier_verdict_v1();

create or replace function private.clutch_notifier_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profils p
    where p.equipe_favorite_id = new.equipe_id
  loop
    perform private.clutch_ajouter_notification_v1(
      r.id,
      'mutation',
      new.equipe_id || ':' || new.niveau::text,
      'Relique en mutation',
      'Ta faction atteint ' || new.nom || '. La transformation est permanente.',
      jsonb_build_object(
        'path', '/(tabs)/social',
        'equipe_id', new.equipe_id,
        'niveau', new.niveau,
        'mutation', new.nom
      ),
      now()
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_clutch_notifier_mutation_v1 on public.communaute_mutations;
create trigger trg_clutch_notifier_mutation_v1
after insert on public.communaute_mutations
for each row execute function private.clutch_notifier_mutation_v1();

create or replace function private.clutch_planifier_notifications_match_v1()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_total integer := 0;
  v_id uuid;
  v_cle text;
begin
  -- Dernieres minutes : uniquement pour un joueur qui suit une equipe du match
  -- ou qui possede deja un call sur ce marche.
  for r in
    select distinct p.id as user_id, m.id as match_id, m.debut, m.tag_a, m.tag_b
    from public.v_matchs m
    join public.profils p on (
      p.equipe_favorite_id in (m.equipe_a_id, m.equipe_b_id)
      or exists (
        select 1 from public.pronostics_classes pc
        where pc.user_id = p.id and pc.match_id = m.id and pc.statut = 'en_cours'
      )
    )
    where m.statut = 'a_venir'
      and m.debut > now() + interval '14 minutes'
      and m.debut <= now() + interval '16 minutes'
  loop
    v_cle := r.match_id || ':' || extract(epoch from r.debut)::bigint::text;
    v_id := private.clutch_ajouter_notification_v1(
      r.user_id,
      'verrouillage_imminent',
      v_cle,
      'Verrouillage dans 15 min',
      coalesce(r.tag_a, 'A') || ' - ' || coalesce(r.tag_b, 'B') || ' ferme bientot.',
      jsonb_build_object('path', '/match/' || r.match_id, 'match_id', r.match_id),
      now()
    );
    if v_id is not null then v_total := v_total + 1; end if;
  end loop;

  -- Debut : meme perimetre pertinent, avec une cle distincte et idempotente.
  for r in
    select distinct p.id as user_id, m.id as match_id, m.debut, m.tag_a, m.tag_b
    from public.v_matchs m
    join public.profils p on (
      p.equipe_favorite_id in (m.equipe_a_id, m.equipe_b_id)
      or exists (
        select 1 from public.pronostics_classes pc
        where pc.user_id = p.id and pc.match_id = m.id and pc.statut = 'en_cours'
      )
    )
    where m.statut in ('a_venir', 'en_cours')
      and m.debut <= now()
      and m.debut > now() - interval '2 minutes'
  loop
    v_cle := r.match_id || ':' || extract(epoch from r.debut)::bigint::text;
    v_id := private.clutch_ajouter_notification_v1(
      r.user_id,
      'debut_match',
      v_cle,
      'Le match commence',
      coalesce(r.tag_a, 'A') || ' - ' || coalesce(r.tag_b, 'B') || ' est lance.',
      jsonb_build_object('path', '/match/' || r.match_id, 'match_id', r.match_id),
      now()
    );
    if v_id is not null then v_total := v_total + 1; end if;
  end loop;

  delete from public.evenements_notification
  where cree_le < now() - interval '60 days';

  return v_total;
end;
$$;

revoke all privileges on function private.clutch_notifier_verdict_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_notifier_mutation_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_planifier_notifications_match_v1()
  from public, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Contrats service_role consommes par l'Edge Function d'envoi
-- -----------------------------------------------------------------------------

create or replace function public.clutch_reclamer_livraisons_notification_v1(
  p_limite integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;

  with candidates as (
    select l.id
    from public.livraisons_notification l
    join public.evenements_notification e on e.id = l.notification_id
    join public.jetons_notification j on j.id = l.jeton_id
    where j.actif
      and e.planifie_pour <= now()
      and l.tentatives < 6
      and (
        (l.statut in ('en_attente', 'echec') and l.prochaine_tentative <= now())
        or (l.statut = 'traitement' and l.maj_le <= now() - interval '10 minutes')
      )
    order by e.planifie_pour, l.cree_le
    limit greatest(1, least(coalesce(p_limite, 100), 100))
    for update of l skip locked
  ), claimed as (
    update public.livraisons_notification l
    set statut = 'traitement',
        tentatives = l.tentatives + 1,
        maj_le = now()
    from candidates c
    where l.id = c.id
    returning l.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'livraison_id', c.id,
    'jeton', c.jeton_expo,
    'titre', e.titre,
    'corps', e.corps,
    'donnees', e.donnees,
    'type', e.type
  ) order by e.planifie_pour, c.cree_le), '[]'::jsonb)
  into v_result
  from claimed c
  join public.evenements_notification e on e.id = c.notification_id;

  update public.evenements_notification e
  set statut = 'traitement', maj_le = now()
  where exists (
    select 1 from public.livraisons_notification l
    where l.notification_id = e.id and l.statut = 'traitement'
  ) and e.statut = 'en_attente';

  return v_result;
end;
$$;

create or replace function private.clutch_actualiser_statut_notification_v1(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evenements_notification e
  set statut = case
        when exists (
          select 1 from public.livraisons_notification l
          where l.notification_id = e.id
            and l.statut in ('en_attente', 'traitement', 'echec')
            and l.tentatives < 6
        ) then 'traitement'
        when exists (
          select 1 from public.livraisons_notification l
          where l.notification_id = e.id
            and l.statut in ('ticket', 'verification', 'livre')
        ) then 'envoye'
        else 'echec'
      end,
      envoye_le = case when exists (
        select 1 from public.livraisons_notification l
        where l.notification_id = e.id
          and l.statut in ('ticket', 'verification', 'livre')
      ) then coalesce(e.envoye_le, now()) else e.envoye_le end,
      maj_le = now()
  where e.id = p_notification_id;
end;
$$;

create or replace function public.clutch_enregistrer_tickets_notification_v1(
  p_resultats jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_notification_id uuid;
  v_code text;
  v_total integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_resultats, '[]'::jsonb)) <> 'array' then
    raise exception 'resultats invalides' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_resultats, '[]'::jsonb))
  loop
    v_code := nullif(r ->> 'code_erreur', '');
    update public.livraisons_notification l
    set statut = case when r ->> 'statut' = 'ok' and nullif(r ->> 'ticket_id', '') is not null then 'ticket' else 'echec' end,
        ticket_id = case when r ->> 'statut' = 'ok' then nullif(r ->> 'ticket_id', '') else null end,
        code_erreur = v_code,
        message_erreur = nullif(left(coalesce(r ->> 'message', ''), 400), ''),
        envoye_le = case when r ->> 'statut' = 'ok' then now() else l.envoye_le end,
        prochaine_tentative = case
          when r ->> 'statut' = 'ok' then now() + interval '15 minutes'
          when v_code in ('DeviceNotRegistered', 'InvalidCredentials', 'MessageTooBig', 'MessageRateExceeded') then now() + interval '30 days'
          else now() + make_interval(secs => least(300, (2 ^ greatest(l.tentatives, 1))::integer))
        end,
        maj_le = now()
    where l.id = (r ->> 'livraison_id')::uuid
      and l.statut = 'traitement'
    returning l.notification_id into v_notification_id;

    if found then
      v_total := v_total + 1;
      if v_code = 'DeviceNotRegistered' then
        update public.jetons_notification j
        set actif = false,
            desactive_le = now(),
            motif_desactivation = v_code,
            maj_le = now()
        where j.jeton_expo = r ->> 'jeton';
      end if;
      perform private.clutch_actualiser_statut_notification_v1(v_notification_id);
    end if;
  end loop;
  return v_total;
end;
$$;

create or replace function public.clutch_reclamer_recus_notification_v1(
  p_limite integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;

  with candidates as (
    select l.id
    from public.livraisons_notification l
    where l.ticket_id is not null
      and l.envoye_le <= now() - interval '15 minutes'
      and l.envoye_le > now() - interval '24 hours'
      and l.prochaine_tentative <= now()
      and (
        l.statut = 'ticket'
        or (l.statut = 'verification' and l.reclame_recu_le <= now() - interval '10 minutes')
      )
    order by l.envoye_le, l.cree_le
    limit greatest(1, least(coalesce(p_limite, 1000), 1000))
    for update skip locked
  ), claimed as (
    update public.livraisons_notification l
    set statut = 'verification', reclame_recu_le = now(), maj_le = now()
    from candidates c
    where l.id = c.id
    returning l.id, l.ticket_id, l.jeton_expo
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'livraison_id', c.id,
    'ticket_id', c.ticket_id,
    'jeton', c.jeton_expo
  )), '[]'::jsonb) into v_result
  from claimed c;

  return v_result;
end;
$$;

create or replace function public.clutch_enregistrer_recus_notification_v1(
  p_resultats jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_notification_id uuid;
  v_code text;
  v_total integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_resultats, '[]'::jsonb)) <> 'array' then
    raise exception 'resultats invalides' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_resultats, '[]'::jsonb))
  loop
    v_code := nullif(r ->> 'code_erreur', '');
    update public.livraisons_notification l
    set statut = case
          when r ->> 'statut' = 'ok' then 'livre'
          when r ->> 'statut' = 'attente' then 'ticket'
          else 'echec'
        end,
        code_erreur = v_code,
        message_erreur = nullif(left(coalesce(r ->> 'message', ''), 400), ''),
        verifie_le = case when r ->> 'statut' = 'attente' then null else now() end,
        prochaine_tentative = case when r ->> 'statut' = 'attente' then now() + interval '5 minutes' else l.prochaine_tentative end,
        maj_le = now()
    where l.id = (r ->> 'livraison_id')::uuid
      and l.statut = 'verification'
    returning l.notification_id into v_notification_id;

    if found then
      v_total := v_total + 1;
      if v_code = 'DeviceNotRegistered' then
        update public.jetons_notification j
        set actif = false,
            desactive_le = now(),
            motif_desactivation = v_code,
            maj_le = now()
        where j.jeton_expo = r ->> 'jeton';
      end if;
      perform private.clutch_actualiser_statut_notification_v1(v_notification_id);
    end if;
  end loop;
  return v_total;
end;
$$;

revoke all privileges on function public.clutch_reclamer_livraisons_notification_v1(integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_enregistrer_tickets_notification_v1(jsonb)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_reclamer_recus_notification_v1(integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_enregistrer_recus_notification_v1(jsonb)
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_actualiser_statut_notification_v1(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.clutch_reclamer_livraisons_notification_v1(integer) to service_role;
grant execute on function public.clutch_enregistrer_tickets_notification_v1(jsonb) to service_role;
grant execute on function public.clutch_reclamer_recus_notification_v1(integer) to service_role;
grant execute on function public.clutch_enregistrer_recus_notification_v1(jsonb) to service_role;

-- Le projet URL et la cle anon legacy sont injectes dans Vault apres migration.
-- La cle est publique par nature ; Vault evite simplement de la figer dans Git.
create or replace function private.clutch_cycle_notifications_v1()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_cle text;
  v_requete bigint;
begin
  perform private.clutch_planifier_notifications_match_v1();

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'clutch_project_url'
  order by created_at desc limit 1;

  select decrypted_secret into v_cle
  from vault.decrypted_secrets
  where name = 'clutch_anon_key'
  order by created_at desc limit 1;

  if coalesce(v_url, '') = '' or coalesce(v_cle, '') = '' then return null; end if;

  select net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/clutch-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cle,
      'apikey', v_cle
    ),
    body := jsonb_build_object('source', 'pg_cron', 'at', now()),
    timeout_milliseconds := 15000
  ) into v_requete;
  return v_requete;
end;
$$;

revoke all privileges on function private.clutch_cycle_notifications_v1()
  from public, anon, authenticated, service_role;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in select jobid from cron.job where jobname = 'clutch-notifications-minute'
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'clutch-notifications-minute',
    '* * * * *',
    'select private.clutch_cycle_notifications_v1()'
  );
end;
$$;
