-- Clutch public schema baseline.
--
-- This migration is the canonical bootstrap for a new local, CI, staging or
-- preview environment. It freezes the final public state of the historical
-- numbered scripts in their real execution order.
--
-- It intentionally excludes:
--   - 04_donnees.sql, now replayed as development seed data;
--   - 11_verification.sql, which is a read-only diagnostic;
--   - production-only data backfills (for example founder assignment).
--
-- IMPORTANT: never execute this baseline against the existing production
-- project. Its version must be marked as applied during the one-time migration
-- history adoption described in supabase/README.md.


-- =====================================================================
-- Legacy source: supabase/01_schema.sql
-- =====================================================================
-- =====================================================================
--  Clutch — schéma de base
--  À exécuter en premier dans l'éditeur SQL de Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- Profils
-- Un profil par compte. Il est créé automatiquement à l'inscription par le
-- trigger défini plus bas : on ne crée jamais un profil à la main.
create table if not exists profils (
  id        uuid primary key references auth.users on delete cascade,
  pseudo    text not null,
  email     text,
  est_admin boolean not null default false,
  cree_le   timestamptz not null default now(),
  est_fondateur boolean not null default false,
  titre_profil text
);

-- ---------------------------------------------------------------- Saisons
-- Une saison est une période de jeu. Le solde d'un joueur n'est PAS global :
-- il appartient à une saison. À chaque nouvelle saison, tout le monde repart
-- au même niveau — sans ça, un joueur qui arrive en cours de route ne peut
-- mathématiquement plus rattraper les autres.
create table if not exists saisons (
  id            text primary key,
  nom           text not null,
  debut         timestamptz not null,
  fin           timestamptz not null,
  solde_initial integer not null default 1000 check (solde_initial > 0),
  check (fin > debut)
);

-- Un joueur dans une saison : son solde et sa prime y sont rattachés.
-- La ligne est créée à la volée au premier pari (voir clutch_participation).
create table if not exists participations (
  saison_id      text not null references saisons (id) on delete cascade,
  user_id        uuid not null references profils (id) on delete cascade,
  solde          integer not null check (solde >= 0),
  derniere_prime timestamptz,
  rejoint_le     timestamptz not null default now(),
  primary key (saison_id, user_id)
);
create index if not exists participations_classement_idx on participations (saison_id, solde desc);

-- ---------------------------------------------------------------- Équipes
create table if not exists equipes (
  id   text primary key,
  jeu  text not null check (jeu in ('lol', 'cs2', 'valorant')),
  nom  text not null,
  tag  text not null,
  elo  integer not null default 1500,
  logo text
);
create index if not exists equipes_jeu_idx on equipes (jeu);

-- ----------------------------------------------------------- Évènements
create table if not exists evenements (
  id   text primary key,
  jeu  text not null check (jeu in ('lol', 'cs2', 'valorant')),
  nom  text not null,
  tier text default 'A'
);

-- ----------------------------------------------------------------- Matchs
create table if not exists matchs (
  id          text primary key default gen_random_uuid()::text,
  event_id    text not null references evenements (id),
  saison_id   text not null references saisons (id),
  jeu         text not null check (jeu in ('lol', 'cs2', 'valorant')),
  equipe_a_id text not null references equipes (id),
  equipe_b_id text not null references equipes (id),
  format      integer not null check (format in (1, 3, 5)),
  debut       timestamptz not null,
  statut      text not null default 'a_venir' check (statut in ('a_venir', 'en_cours', 'termine', 'annule')),
  score_a     integer,
  score_b     integer,
  -- Elo figés au moment du règlement, pour garder une trace de la cote servie
  elo_a_fige  integer,
  elo_b_fige  integer,
  check (equipe_a_id <> equipe_b_id)
);
create index if not exists matchs_statut_debut_idx on matchs (statut, debut);
create index if not exists matchs_jeu_idx on matchs (jeu);
create index if not exists matchs_saison_idx on matchs (saison_id, statut, debut);

-- ------------------------------------------------------------------ Paris
create table if not exists paris (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profils (id) on delete cascade,
  match_id       text not null references matchs (id) on delete cascade,
  saison_id      text not null references saisons (id),
  marche         text not null check (marche in ('vainqueur', 'score_exact', 'total_maps')),
  choix          text not null,
  libelle_marche text not null,
  libelle_choix  text not null,
  mise           integer not null check (mise > 0),
  cote           numeric(6, 2) not null check (cote >= 1),
  statut         text not null default 'en_cours' check (statut in ('en_cours', 'gagne', 'perdu', 'rembourse')),
  gain           integer not null default 0,
  cree_le        timestamptz not null default now(),
  -- Un seul pari par joueur, par match, par sélection.
  unique (user_id, match_id, marche, choix)
);
create index if not exists paris_user_idx on paris (user_id, saison_id, cree_le desc);
create index if not exists paris_match_idx on paris (match_id) where statut = 'en_cours';

-- ----------------------------------------------------------------- Ligues
create table if not exists ligues (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (char_length(nom) between 1 and 40),
  code        text not null unique,
  createur_id uuid not null references profils (id) on delete cascade,
  cree_le     timestamptz not null default now()
);

create table if not exists membres_ligue (
  ligue_id   uuid not null references ligues (id) on delete cascade,
  user_id    uuid not null references profils (id) on delete cascade,
  rejoint_le timestamptz not null default now(),
  primary key (ligue_id, user_id)
);

-- ------------------------------------------- Création auto du profil
create or replace function public.creer_profil_a_inscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (id, pseudo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'pseudo', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil_a_inscription();

-- ------------------------------------------------------------------- Vues
-- Statut d'une saison, déduit de la date du jour : rien à maintenir à la main.
create or replace view v_saisons as
select
  s.*,
  case
    when now() < s.debut then 'a_venir'
    when now() > s.fin   then 'terminee'
    else 'en_cours'
  end as statut
from saisons s;

create or replace view v_matchs as
select
  m.id, m.event_id, m.saison_id, m.jeu, m.format, m.debut, m.statut, m.score_a, m.score_b,
  m.equipe_a_id, m.equipe_b_id,
  ea.nom as equipe_a, eb.nom as equipe_b,
  ea.tag as tag_a,    eb.tag as tag_b,
  coalesce(m.elo_a_fige, ea.elo) as elo_a,
  coalesce(m.elo_b_fige, eb.elo) as elo_b,
  ev.nom as evenement
from matchs m
join equipes ea on ea.id = m.equipe_a_id
join equipes eb on eb.id = m.equipe_b_id
join evenements ev on ev.id = m.event_id;

create or replace view v_mes_paris as
select
  p.*,
  m.equipe_a, m.equipe_b, m.jeu, m.statut as statut_match,
  m.score_a, m.score_b, m.debut
from paris p
join v_matchs m on m.id = p.match_id
where p.user_id = auth.uid();

create or replace view v_mes_ligues as
select l.*, (select count(*) from membres_ligue x where x.ligue_id = l.id) as nb_membres
from ligues l
join membres_ligue ml on ml.ligue_id = l.id
where ml.user_id = auth.uid();

-- =====================================================================
-- Legacy source: supabase/02_fonctions.sql
-- =====================================================================
-- =====================================================================
--  Clutch — moteur de cotes et logique métier, côté serveur.
--
--  C'est ce fichier qui fait autorité : le navigateur affiche des cotes,
--  mais c'est Postgres qui les recalcule au moment de valider un pari.
--  Miroir de web/js/core.js — si tu modifies l'un, modifie l'autre.
-- =====================================================================

-- Paramètres du jeu, au même endroit que dans core.js
create or replace function clutch_marge()          returns numeric language sql immutable as $$ select 0.06 $$;
create or replace function clutch_cote_min()       returns numeric language sql immutable as $$ select 1.01 $$;
create or replace function clutch_cote_max()       returns numeric language sql immutable as $$ select 50.0 $$;
create or replace function clutch_mise_min()       returns integer language sql immutable as $$ select 10 $$;
create or replace function clutch_mise_max()       returns integer language sql immutable as $$ select 5000 $$;
create or replace function clutch_bonus()          returns integer language sql immutable as $$ select 200 $$;
create or replace function clutch_seuil_faillite() returns integer language sql immutable as $$ select 100 $$;
create or replace function clutch_elo_k()          returns numeric language sql immutable as $$ select 24 $$;

-- ------------------------------------------------- Probabilité d'une map
create or replace function clutch_proba_map(elo_a integer, elo_b integer)
returns numeric language sql immutable as $$
  select least(0.95, greatest(0.05, 1.0 / (1.0 + power(10.0, (elo_b - elo_a) / 400.0))));
$$;

-- ------------------------------------------------- Cote depuis une proba
create or replace function clutch_cote(p numeric)
returns numeric language sql immutable as $$
  select round(
    least(clutch_cote_max(), greatest(clutch_cote_min(), 1.0 / (greatest(p, 0.0000001) * (1 + clutch_marge())))),
    2
  );
$$;

-- ------------------------------- Distribution des scores possibles d'une série
create or replace function clutch_distribution(p numeric, format integer)
returns table (score_a integer, score_b integer, proba numeric)
language plpgsql immutable as $$
declare q numeric := 1 - p;
begin
  if format = 1 then
    return query values (1, 0, p), (0, 1, q);
  elsif format = 3 then
    return query values
      (2, 0, p * p),
      (2, 1, 2 * p * p * q),
      (1, 2, 2 * q * q * p),
      (0, 2, q * q);
  elsif format = 5 then
    return query values
      (3, 0, power(p, 3)),
      (3, 1, 3 * power(p, 3) * q),
      (3, 2, 6 * power(p, 3) * q * q),
      (2, 3, 6 * power(q, 3) * p * p),
      (1, 3, 3 * power(q, 3) * p),
      (0, 3, power(q, 3));
  else
    raise exception 'Format de série non supporté : BO%', format;
  end if;
end;
$$;

-- ------------------------------------------------ Marchés d'un match (JSON)
-- Retourne exactement la structure attendue par web/js/views/match.js.
create or replace function cotes_du_match(p_match_id text)
returns jsonb language plpgsql stable as $$
declare
  m record;
  p numeric;
  p_serie numeric;
  p_court numeric;
  maps_min integer;
  marches jsonb := '[]'::jsonb;
  choix_score jsonb;
begin
  select * into m from v_matchs where id = p_match_id;
  if not found then raise exception 'Match introuvable'; end if;

  p := clutch_proba_map(m.elo_a, m.elo_b);

  -- Marché 1 : vainqueur
  select coalesce(sum(proba), 0) into p_serie
  from clutch_distribution(p, m.format) where score_a > score_b;

  marches := marches || jsonb_build_array(jsonb_build_object(
    'cle', 'vainqueur',
    'libelle', 'Vainqueur du match',
    'aide', 'Qui remporte la série ?',
    'choix', jsonb_build_array(
      jsonb_build_object('cle', 'a', 'libelle', m.equipe_a, 'proba', p_serie,     'cote', clutch_cote(p_serie)),
      jsonb_build_object('cle', 'b', 'libelle', m.equipe_b, 'proba', 1 - p_serie, 'cote', clutch_cote(1 - p_serie))
    )
  ));

  -- Marché 2 : score exact
  select jsonb_agg(jsonb_build_object(
           'cle', score_a || '-' || score_b,
           'libelle', score_a || ' – ' || score_b,
           'proba', proba,
           'cote', clutch_cote(proba)
         ) order by score_a desc, score_b asc)
    into choix_score
  from clutch_distribution(p, m.format);

  marches := marches || jsonb_build_array(jsonb_build_object(
    'cle', 'score_exact',
    'libelle', 'Score exact en maps',
    'aide', 'Le score final de la série, map par map.',
    'choix', choix_score
  ));

  -- Marché 3 : nombre de maps (BO3 et BO5 uniquement)
  if m.format > 1 then
    maps_min := ceil(m.format / 2.0);
    select coalesce(sum(proba), 0) into p_court
    from clutch_distribution(p, m.format) where score_a + score_b <= maps_min;

    marches := marches || jsonb_build_array(jsonb_build_object(
      'cle', 'total_maps',
      'libelle', 'Nombre de maps jouées',
      'aide', 'La série ira-t-elle au-delà de ' || maps_min || ' maps ?',
      'choix', jsonb_build_array(
        jsonb_build_object('cle', 'under', 'libelle', 'Moins de ' || (maps_min + 0.5) || ' maps',
                           'proba', p_court, 'cote', clutch_cote(p_court)),
        jsonb_build_object('cle', 'over', 'libelle', 'Plus de ' || (maps_min + 0.5) || ' maps',
                           'proba', 1 - p_court, 'cote', clutch_cote(1 - p_court))
      )
    ));
  end if;

  return marches;
end;
$$;

-- ------------------------------------------- Participation à une saison
-- Renvoie le solde du joueur pour une saison, en créant la ligne au premier
-- appel. C'est le seul endroit où un solde apparaît de nulle part.
create or replace function clutch_participation(p_user uuid, p_saison text)
returns participations language plpgsql security definer set search_path = public as $$
declare v_part participations%rowtype; v_initial integer;
begin
  select * into v_part from participations where user_id = p_user and saison_id = p_saison for update;
  if found then return v_part; end if;

  select solde_initial into v_initial from saisons where id = p_saison;
  if v_initial is null then raise exception 'Saison inconnue.'; end if;

  insert into participations (saison_id, user_id, solde)
  values (p_saison, p_user, v_initial)
  on conflict (saison_id, user_id) do nothing;

  select * into v_part from participations where user_id = p_user and saison_id = p_saison;
  return v_part;
end;
$$;

-- --------------------------------------------------------- Placer un pari
create or replace function placer_pari(
  p_match_id text, p_marche text, p_choix text, p_mise integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_solde  integer;
  m        record;
  marche   jsonb;
  choix    jsonb;
  v_pari   paris%rowtype;
begin
  if v_user is null then raise exception 'Connecte-toi pour miser.'; end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut <> 'a_venir' then raise exception 'Ce match a déjà commencé.'; end if;
  if m.debut <= now() then raise exception 'Les mises sont fermées sur ce match.'; end if;

  if p_mise < clutch_mise_min() then raise exception 'Mise minimale : % Frags.', clutch_mise_min(); end if;
  if p_mise > clutch_mise_max() then raise exception 'Mise maximale : % Frags.', clutch_mise_max(); end if;

  -- La saison doit être ouverte : on ne mise ni dans le passé ni dans le futur.
  if (select statut from v_saisons where id = m.saison_id) <> 'en_cours' then
    raise exception 'Cette saison n''est pas ouverte aux mises.';
  end if;

  -- Verrou sur la participation : évite qu'un double clic ne dépense deux fois.
  v_solde := (clutch_participation(v_user, m.saison_id)).solde;
  if v_solde < p_mise then raise exception 'Solde insuffisant.'; end if;

  -- La cote est recalculée ici, jamais reprise du navigateur.
  select value into marche
  from jsonb_array_elements(cotes_du_match(p_match_id)) as value
  where value ->> 'cle' = p_marche;
  if marche is null then raise exception 'Marché inconnu.'; end if;

  select value into choix
  from jsonb_array_elements(marche -> 'choix') as value
  where value ->> 'cle' = p_choix;
  if choix is null then raise exception 'Sélection inconnue.'; end if;

  update participations set solde = solde - p_mise
   where user_id = v_user and saison_id = m.saison_id;

  insert into paris (user_id, match_id, saison_id, marche, choix, libelle_marche, libelle_choix, mise, cote)
  values (v_user, p_match_id, m.saison_id, p_marche, p_choix,
          marche ->> 'libelle', choix ->> 'libelle', p_mise, (choix ->> 'cote')::numeric)
  returning * into v_pari;

  return to_jsonb(v_pari);
exception
  when unique_violation then
    raise exception 'Tu as déjà un pari en cours sur ce choix.';
end;
$$;

-- ------------------------------------------------------- Régler un match
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  pa        numeric; -- proba de map attendue
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  -- Règlement des paris en cours
  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    v_regles := v_regles + 1;
  end loop;

  -- Mise à jour des Elo, pondérée par l'écart de maps
  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- ----------------------------------------------------- Prime quotidienne
create or replace function reclamer_prime(p_saison_id text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_part participations%rowtype; v_statut text; montant integer;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;

  select statut into v_statut from v_saisons where id = p_saison_id;
  if v_statut is null then raise exception 'Saison inconnue.'; end if;
  if v_statut = 'terminee' then raise exception 'Cette saison est terminée.'; end if;
  if v_statut = 'a_venir' then raise exception 'Cette saison n''a pas encore commencé.'; end if;

  v_part := clutch_participation(auth.uid(), p_saison_id);
  if v_part.derniere_prime is not null and v_part.derniere_prime > now() - interval '24 hours' then
    raise exception 'Prime déjà réclamée. Reviens dans % h.',
      ceil(extract(epoch from (v_part.derniere_prime + interval '24 hours' - now())) / 3600);
  end if;

  montant := case when v_part.solde < clutch_seuil_faillite() then clutch_bonus() * 2 else clutch_bonus() end;
  update participations set solde = solde + montant, derniere_prime = now()
   where user_id = auth.uid() and saison_id = p_saison_id;
  return montant;
end;
$$;

-- ---------------------------------------------------------------- Ligues
create or replace function clutch_code_ligue()
returns text language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1), ''
  ) from generate_series(1, 6);
$$;

create or replace function creer_ligue(p_nom text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ligue ligues%rowtype; v_code text; essais integer := 0;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom à ta ligue.'; end if;

  loop
    v_code := clutch_code_ligue();
    exit when not exists (select 1 from ligues where code = v_code);
    essais := essais + 1;
    if essais > 20 then raise exception 'Impossible de générer un code, réessaie.'; end if;
  end loop;

  insert into ligues (nom, code, createur_id)
  values (left(trim(p_nom), 40), v_code, auth.uid())
  returning * into v_ligue;

  insert into membres_ligue (ligue_id, user_id) values (v_ligue.id, auth.uid());
  return to_jsonb(v_ligue);
end;
$$;

create or replace function rejoindre_ligue(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ligue ligues%rowtype;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  select * into v_ligue from ligues where code = upper(trim(p_code));
  if not found then raise exception 'Aucune ligue avec ce code.'; end if;
  if exists (select 1 from membres_ligue where ligue_id = v_ligue.id and user_id = auth.uid()) then
    raise exception 'Tu es déjà dans cette ligue.';
  end if;
  insert into membres_ligue (ligue_id, user_id) values (v_ligue.id, auth.uid());
  return to_jsonb(v_ligue);
end;
$$;

-- ----------------------------------------------------------- Classements
-- Un classement est TOUJOURS relatif à une saison : c'est le solde de la
-- participation qui est classé, jamais un solde global.
create or replace function clutch_classement(p_ids uuid[], p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(pt.solde, (select solde_initial from saisons where id = p_saison_id)) as solde,
    count(pa.id) filter (where pa.statut in ('gagne', 'perdu')) as paris,
    count(pa.id) filter (where pa.statut = 'gagne')             as gagnes,
    pr.id = auth.uid()                                          as moi
  from profils pr
  left join participations pt on pt.user_id = pr.id and pt.saison_id = p_saison_id
  left join paris pa on pa.user_id = pr.id and pa.saison_id = p_saison_id
  where pr.id = any (p_ids)
  group by pr.id, pr.pseudo, pt.solde
  order by solde desc, gagnes desc;
$$;

create or replace function classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from membres_ligue where ligue_id = p_ligue_id), p_saison_id
  );
$$;

create or replace function classement_global(p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select * from clutch_classement(
    array(
      select user_id from participations
      where saison_id = p_saison_id order by solde desc limit 100
    ),
    p_saison_id
  );
$$;

-- Vainqueur de chaque saison déjà close.
create or replace function palmares()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x -> 'saison' ->> 'fin' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'saison', to_jsonb(s),
      'vainqueur', (
        select to_jsonb(c) from clutch_classement(
          array(select user_id from participations where saison_id = s.id), s.id
        ) c limit 1
      )
    ) as x
    from v_saisons s
    where s.statut = 'terminee'
  ) t;
$$;

create or replace function mes_statistiques(p_saison_id text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'solde', coalesce(
      (select solde from participations where user_id = auth.uid() and saison_id = p_saison_id),
      (select solde_initial from saisons where id = p_saison_id)
    ),
    'paris',  count(*) filter (where statut in ('gagne', 'perdu')),
    'gagnes', count(*) filter (where statut = 'gagne'),
    'mises',  coalesce(sum(mise) filter (where statut in ('gagne', 'perdu')), 0),
    'gains',  coalesce(sum(gain), 0),
    'roi', case
             when coalesce(sum(mise) filter (where statut in ('gagne', 'perdu')), 0) = 0 then 0
             else round(
               (coalesce(sum(gain), 0) - sum(mise) filter (where statut in ('gagne', 'perdu')))::numeric
               / sum(mise) filter (where statut in ('gagne', 'perdu')) * 100, 1)
           end
  )
  from paris where user_id = auth.uid() and saison_id = p_saison_id;
$$;

-- =====================================================================
-- Legacy source: supabase/03_securite.sql
-- =====================================================================
-- =====================================================================
--  Clutch — sécurité (Row Level Security).
--
--  Principe : la clé "anon" est publique et vit dans le navigateur. Tout
--  ce qui protège les données, c'est ce fichier. Règle d'or : AUCUNE
--  écriture directe sur les tables sensibles — solde, paris et résultats
--  ne se modifient qu'à travers les fonctions SECURITY DEFINER de 02.
-- =====================================================================

alter table profils        enable row level security;
alter table saisons        enable row level security;
alter table participations enable row level security;
alter table equipes        enable row level security;
alter table evenements     enable row level security;
alter table matchs         enable row level security;
alter table paris          enable row level security;
alter table ligues         enable row level security;
alter table membres_ligue  enable row level security;

-- --------------------------------------------------------------- Profils
-- Chacun lit son propre profil en entier.
drop policy if exists "profil lisible par son propriétaire" on profils;
create policy "profil lisible par son propriétaire"
  on profils for select using (auth.uid() = id);

-- Les profils des membres de mes ligues sont lisibles (nécessaire au classement).
drop policy if exists "profils des colistiers lisibles" on profils;
create policy "profils des colistiers lisibles"
  on profils for select using (
    exists (
      select 1
      from membres_ligue moi
      join membres_ligue autre on autre.ligue_id = moi.ligue_id
      where moi.user_id = auth.uid() and autre.user_id = profils.id
    )
  );

-- Le joueur peut changer son pseudo, rien d'autre : le statut admin est
-- verrouillé par le trigger ci-dessous, et le solde ne vit plus ici — il est
-- dans participations, table sur laquelle aucune écriture directe n'est permise.
drop policy if exists "modification de son propre pseudo" on profils;
create policy "modification de son propre pseudo"
  on profils for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.verrouiller_champs_sensibles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Les fonctions SECURITY DEFINER passent en tant que propriétaire du schéma :
  -- seul un appel utilisateur direct est bloqué ici.
  if current_setting('role', true) = 'authenticated' then
    new.est_admin := old.est_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profils_verrou on profils;
create trigger profils_verrou
  before update on profils
  for each row execute function public.verrouiller_champs_sensibles();

-- --------------------------------------------------------------- Saisons
-- Calendrier des saisons : public en lecture, modifiable par les admins seuls.
drop policy if exists "saisons publiques" on saisons;
create policy "saisons publiques" on saisons for select using (true);

drop policy if exists "saisons modifiables par les admins" on saisons;
create policy "saisons modifiables par les admins"
  on saisons for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

-- Les soldes : je lis le mien, et celui des membres de mes ligues (classement).
-- Aucune écriture directe : seules les fonctions de 02 touchent aux soldes.
drop policy if exists "ma participation" on participations;
create policy "ma participation" on participations for select using (auth.uid() = user_id);

drop policy if exists "participations des colistiers" on participations;
create policy "participations des colistiers"
  on participations for select using (
    exists (
      select 1
      from membres_ligue moi
      join membres_ligue autre on autre.ligue_id = moi.ligue_id
      where moi.user_id = auth.uid() and autre.user_id = participations.user_id
    )
  );

-- ------------------------------------------------- Données de compétition
-- Publiques en lecture : n'importe qui peut consulter le calendrier et les cotes.
drop policy if exists "équipes publiques" on equipes;
create policy "équipes publiques" on equipes for select using (true);

drop policy if exists "évènements publics" on evenements;
create policy "évènements publics" on evenements for select using (true);

drop policy if exists "matchs publics" on matchs;
create policy "matchs publics" on matchs for select using (true);

-- Seuls les admins peuvent créer ou modifier un match / une équipe.
drop policy if exists "matchs modifiables par les admins" on matchs;
create policy "matchs modifiables par les admins"
  on matchs for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

drop policy if exists "équipes modifiables par les admins" on equipes;
create policy "équipes modifiables par les admins"
  on equipes for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

drop policy if exists "évènements modifiables par les admins" on evenements;
create policy "évènements modifiables par les admins"
  on evenements for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

-- ------------------------------------------------------------------ Paris
-- Je lis mes paris. Je n'en écris JAMAIS un directement : seule la fonction
-- placer_pari() peut insérer, parce qu'elle seule débite le solde.
drop policy if exists "mes paris" on paris;
create policy "mes paris" on paris for select using (auth.uid() = user_id);

-- (aucune policy insert/update/delete : tout passe par les fonctions)

-- ----------------------------------------------------------------- Ligues
drop policy if exists "ligues de mes ligues" on ligues;
create policy "ligues de mes ligues"
  on ligues for select using (
    exists (select 1 from membres_ligue where ligue_id = ligues.id and user_id = auth.uid())
  );

drop policy if exists "membres visibles entre colistiers" on membres_ligue;
create policy "membres visibles entre colistiers"
  on membres_ligue for select using (
    exists (select 1 from membres_ligue m2 where m2.ligue_id = membres_ligue.ligue_id and m2.user_id = auth.uid())
  );

-- Quitter une ligue : autorisé sur sa propre adhésion.
drop policy if exists "quitter une ligue" on membres_ligue;
create policy "quitter une ligue" on membres_ligue for delete using (auth.uid() = user_id);

-- ------------------------------------------------------- Droits d'exécution
revoke all on function placer_pari(text, text, text, integer) from public;
revoke all on function regler_match(text, integer, integer) from public;
revoke all on function reclamer_prime(text) from public;
revoke all on function creer_ligue(text) from public;
revoke all on function rejoindre_ligue(text) from public;

grant execute on function placer_pari(text, text, text, integer)   to authenticated;
grant execute on function regler_match(text, integer, integer)     to authenticated;
grant execute on function reclamer_prime(text)                     to authenticated;
grant execute on function creer_ligue(text)                        to authenticated;
grant execute on function rejoindre_ligue(text)                    to authenticated;
grant execute on function cotes_du_match(text)                     to anon, authenticated;
grant execute on function classement_ligue(uuid, text)              to authenticated;
grant execute on function classement_global(text)                  to anon, authenticated;
grant execute on function mes_statistiques(text)                    to authenticated;
grant execute on function palmares()                               to anon, authenticated;

-- ------------------------------------------------------- Ouvrir une saison
-- Créer la saison suivante remet tout le monde à égalité. À faire au début de
-- chaque grand tournoi :
--
--   insert into saisons (id, nom, debut, fin, solde_initial)
--   values ('saison-hiver-2027', 'Saison 3 — Hiver 2027',
--           '2027-01-05 00:00+01', '2027-03-30 23:59+02', 1000);
--
-- Les matchs de cette période devront porter saison_id = 'saison-hiver-2027'.

-- ----------------------------------------------------------- Se nommer admin
-- Après ta première connexion, exécute cette ligne avec TON e-mail :
--
--   update profils set est_admin = true where email = 'toi@exemple.fr';
--
-- Sans ça, personne ne peut régler de match.


-- =====================================================================
-- Legacy source: supabase/05_xs.sql
-- =====================================================================
-- =====================================================================
--  Clutch — palier 1 (les gains rapides).
--
--  À exécuter APRÈS 01 à 04, dans l'éditeur SQL de Supabase.
--  Le fichier est idempotent : le relancer ne casse rien.
--
--  Il apporte quatre choses :
--    1. la prime de connexion en série de sept jours (+ son historique)
--    2. l'équipe préférée
--    3. le call de la saison (pronostic unique sur le vainqueur d'un tournoi)
--    4. la rivalité de la semaine (aucune table : tout est calculé)
--
--  Miroir de web/js/core.js et web/js/store.js — si tu modifies l'un,
--  modifie les autres.
-- =====================================================================

-- =====================================================================
--  1. Prime de connexion en série
-- =====================================================================

alter table participations add column if not exists serie_prime integer not null default 0;

-- Historique des primes : c'est la « table de retraits ». Elle sert à afficher
-- ce qui a été encaissé, et surtout à auditer l'économie du jeu si les soldes
-- se mettent à enfler sans raison.
create table if not exists primes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profils (id) on delete cascade,
  saison_id text not null references saisons (id) on delete cascade,
  montant   integer not null check (montant > 0),
  serie     integer not null check (serie between 1 and 7),
  cree_le   timestamptz not null default now()
);
create index if not exists primes_user_idx on primes (user_id, saison_id, cree_le desc);

-- Paramètres, au même endroit que dans core.js
create or replace function clutch_prime_paliers() returns integer[] language sql immutable as $$ select array[120, 150, 180, 210, 240, 280, 420] $$;
create or replace function clutch_prime_base()    returns integer language sql immutable as $$ select 120 $$;
create or replace function clutch_prime_serie_max() returns integer language sql immutable as $$ select 7 $$;
create or replace function clutch_prime_plafond() returns integer language sql immutable as $$ select 3000 $$;
create or replace function clutch_prime_jour_mise() returns integer language sql immutable as $$ select 3 $$;

-- Série obtenue si le joueur réclame maintenant.
create or replace function clutch_serie_apres(p_serie integer, p_derniere timestamptz)
returns integer language sql immutable as $$
  select case
    when p_derniere is null then 1
    when now() - p_derniere >= interval '48 hours' then 1
    when coalesce(p_serie, 0) >= clutch_prime_serie_max() then 1
    else coalesce(p_serie, 0) + 1
  end;
$$;

-- Montant de la prime. Même ordre de règles que montantPrime() en JavaScript :
-- palier de série, rabot si riche ou si le joueur ne mise pas, filet en dernier.
create or replace function clutch_montant_prime(p_serie integer, p_solde integer, p_mises_recentes integer)
returns integer language sql immutable as $$
  select round(
    case when p_solde < clutch_seuil_faillite() then 2 else 1 end
    * case
        when p_solde >= clutch_prime_plafond() then clutch_prime_base()
        when p_serie >= clutch_prime_jour_mise() and coalesce(p_mises_recentes, 0) = 0 then clutch_prime_base()
        else (clutch_prime_paliers())[least(greatest(p_serie, 1), clutch_prime_serie_max())]
      end
  )::integer;
$$;

-- Où en est ma série, et combien vaut la prochaine prime ?
create or replace function etat_prime(p_saison_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_part   participations%rowtype;
  v_solde  integer;
  v_serie  integer;
  v_mises  integer;
  v_statut text;
  v_attente numeric;
begin
  if auth.uid() is null then return null; end if;
  select statut into v_statut from v_saisons where id = p_saison_id;

  select * into v_part from participations where user_id = auth.uid() and saison_id = p_saison_id;
  v_solde := coalesce(v_part.solde, (select solde_initial from saisons where id = p_saison_id));
  v_serie := clutch_serie_apres(v_part.serie_prime, v_part.derniere_prime);

  select count(*) into v_mises
  from paris
  where user_id = auth.uid() and saison_id = p_saison_id and cree_le > now() - interval '7 days';

  v_attente := greatest(
    0,
    extract(epoch from (coalesce(v_part.derniere_prime, now() - interval '48 hours') + interval '24 hours' - now())) * 1000
  );

  return jsonb_build_object(
    'serie_actuelle',  coalesce(v_part.serie_prime, 0),
    'serie_prochaine', v_serie,
    'montant',         clutch_montant_prime(v_serie, v_solde, v_mises),
    'disponible',      (v_attente = 0 and v_statut = 'en_cours'),
    'attente_ms',      v_attente,
    'paliers',         to_jsonb(clutch_prime_paliers()),
    'total_encaisse',  coalesce((select sum(montant) from primes where user_id = auth.uid() and saison_id = p_saison_id), 0)
  );
end;
$$;

-- Remplace la version de 02_fonctions.sql : même nom, mais renvoie désormais
-- le montant ET la série, et enregistre la ligne dans primes.
drop function if exists reclamer_prime(text);
create or replace function reclamer_prime(p_saison_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_part   participations%rowtype;
  v_statut text;
  v_serie  integer;
  v_mises  integer;
  v_montant integer;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;

  select statut into v_statut from v_saisons where id = p_saison_id;
  if v_statut is null then raise exception 'Saison inconnue.'; end if;
  if v_statut = 'terminee' then raise exception 'Cette saison est terminée.'; end if;
  if v_statut = 'a_venir' then raise exception 'Cette saison n''a pas encore commencé.'; end if;

  v_part := clutch_participation(auth.uid(), p_saison_id);
  if v_part.derniere_prime is not null and v_part.derniere_prime > now() - interval '24 hours' then
    raise exception 'Prime déjà réclamée. Reviens dans % h.',
      ceil(extract(epoch from (v_part.derniere_prime + interval '24 hours' - now())) / 3600);
  end if;

  v_serie := clutch_serie_apres(v_part.serie_prime, v_part.derniere_prime);

  select count(*) into v_mises
  from paris
  where user_id = auth.uid() and saison_id = p_saison_id and cree_le > now() - interval '7 days';

  v_montant := clutch_montant_prime(v_serie, v_part.solde, v_mises);

  update participations
     set solde = solde + v_montant, derniere_prime = now(), serie_prime = v_serie
   where user_id = auth.uid() and saison_id = p_saison_id;

  insert into primes (user_id, saison_id, montant, serie)
  values (auth.uid(), p_saison_id, v_montant, v_serie);

  return jsonb_build_object('montant', v_montant, 'serie', v_serie);
end;
$$;

-- =====================================================================
--  2. Équipe préférée
-- =====================================================================

alter table profils add column if not exists equipe_favorite_id text references equipes (id) on delete set null;

-- Le pseudo et l'équipe préférée sont modifiables par leur propriétaire ; le
-- reste ne l'est pas. Le trigger de 03_securite.sql verrouille déjà est_admin.
create or replace function public.verrouiller_champs_sensibles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role', true) = 'authenticated' then
    new.est_admin := old.est_admin;
    new.id        := old.id;
    new.email     := old.email;
    new.cree_le   := old.cree_le;
  end if;
  return new;
end;
$$;

-- =====================================================================
--  3. Le call de la saison
-- =====================================================================

-- Un pronostic unique par joueur et par saison : le vainqueur d'un tournoi,
-- posé avant que ce tournoi ne commence. C'est ce qui garde en vie un joueur
-- mal parti, et ce qu'il affichera sur son profil pendant deux mois.
create table if not exists calls (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profils (id) on delete cascade,
  saison_id text not null references saisons (id) on delete cascade,
  event_id  text not null references evenements (id) on delete cascade,
  equipe_id text not null references equipes (id),
  mise      integer not null check (mise > 0),
  cote      numeric(6, 2) not null check (cote >= 1),
  statut    text not null default 'en_cours' check (statut in ('en_cours', 'gagne', 'perdu', 'rembourse')),
  gain      integer not null default 0,
  cree_le   timestamptz not null default now(),
  unique (user_id, saison_id)
);
create index if not exists calls_event_idx on calls (event_id, saison_id) where statut = 'en_cours';

-- Vainqueur désigné d'un événement, pour une saison donnée.
create table if not exists resultats_evenement (
  saison_id text not null references saisons (id) on delete cascade,
  event_id  text not null references evenements (id) on delete cascade,
  equipe_id text not null references equipes (id),
  regle_le  timestamptz not null default now(),
  primary key (saison_id, event_id)
);

create or replace function clutch_call_mise_min() returns integer language sql immutable as $$ select 50 $$;
create or replace function clutch_call_mise_max() returns integer language sql immutable as $$ select 2000 $$;

-- Les événements d'une saison, avec la date de leur premier match et leur
-- statut vis-à-vis du call. Vue publique : elle ne révèle rien de personnel.
create or replace view v_evenements_saison as
select
  m.event_id                as id,
  ev.nom,
  ev.jeu,
  ev.tier,
  m.saison_id,
  min(m.debut)              as debut,
  count(*)                  as nb_matchs,
  (
    select count(distinct t.id)
    from matchs m2
    cross join lateral (values (m2.equipe_a_id), (m2.equipe_b_id)) as t (id)
    where m2.event_id = m.event_id and m2.saison_id = m.saison_id
  )                         as nb_equipes,
  case
    when re.equipe_id is not null then 'regle'
    when min(m.debut) > now()     then 'ouvert'
    else 'verrouille'
  end                       as statut,
  re.equipe_id              as vainqueur_id,
  eq.nom                    as vainqueur
from matchs m
join evenements ev on ev.id = m.event_id
left join resultats_evenement re on re.event_id = m.event_id and re.saison_id = m.saison_id
left join equipes eq on eq.id = re.equipe_id
group by m.event_id, ev.nom, ev.jeu, ev.tier, m.saison_id, re.equipe_id, eq.nom;

-- Cotes du vainqueur d'un événement : poids = 10^(Elo/400), même échelle que
-- la formule Elo, transposée à un champ de plus de deux concurrents.
create or replace function cotes_evenement(p_event_id text, p_saison_id text)
returns jsonb language sql stable as $$
  with engagees as (
    select distinct e.id, e.nom, e.tag, e.jeu, e.elo
    from matchs m
    join equipes e on e.id in (m.equipe_a_id, m.equipe_b_id)
    where m.event_id = p_event_id and m.saison_id = p_saison_id
  ),
  pondere as (
    select *, power(10.0, elo / 400.0) as poids from engagees
  )
  select coalesce(jsonb_agg(x order by (x ->> 'proba')::numeric desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', id, 'nom', nom, 'tag', tag, 'jeu', jeu, 'elo', elo,
      'proba', poids / sum(poids) over (),
      'cote',  clutch_cote(poids / sum(poids) over ())
    ) as x
    from pondere
  ) t;
$$;

create or replace function mon_call(p_saison_id text)
returns jsonb language sql stable as $$
  select to_jsonb(c) || jsonb_build_object(
           'equipe', e.nom, 'tag', e.tag, 'jeu', e.jeu,
           'evenement', ev.nom,
           'gain_potentiel', round(c.mise * c.cote)
         )
  from calls c
  join equipes e on e.id = c.equipe_id
  join evenements ev on ev.id = c.event_id
  where c.user_id = auth.uid() and c.saison_id = p_saison_id;
$$;

create or replace function placer_call(p_event_id text, p_equipe_id text, p_mise integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_saison text;
  v_statut text;
  v_solde  integer;
  v_cote   numeric;
begin
  if v_user is null then raise exception 'Connecte-toi pour poser ton call.'; end if;

  select id into v_saison from v_saisons where statut = 'en_cours' order by debut desc limit 1;
  if v_saison is null then raise exception 'Aucune saison ouverte.'; end if;

  if exists (select 1 from calls where user_id = v_user and saison_id = v_saison) then
    raise exception 'Tu as déjà posé ton call pour cette saison.';
  end if;

  select statut into v_statut from v_evenements_saison where id = p_event_id and saison_id = v_saison;
  if v_statut is null then raise exception 'Événement inconnu pour cette saison.'; end if;
  if v_statut <> 'ouvert' then raise exception 'Cet événement a déjà commencé : le call est fermé.'; end if;

  if p_mise < clutch_call_mise_min() then
    raise exception 'Mise minimale du call : % Frags.', clutch_call_mise_min();
  end if;
  if p_mise > clutch_call_mise_max() then
    raise exception 'Mise maximale du call : % Frags.', clutch_call_mise_max();
  end if;

  -- La cote est recalculée ici, jamais reprise du navigateur.
  select (value ->> 'cote')::numeric into v_cote
  from jsonb_array_elements(cotes_evenement(p_event_id, v_saison)) as value
  where value ->> 'id' = p_equipe_id;
  if v_cote is null then raise exception 'Cette équipe ne participe pas à l''événement.'; end if;

  v_solde := (clutch_participation(v_user, v_saison)).solde;
  if v_solde < p_mise then raise exception 'Solde insuffisant.'; end if;

  update participations set solde = solde - p_mise
   where user_id = v_user and saison_id = v_saison;

  insert into calls (user_id, saison_id, event_id, equipe_id, mise, cote)
  values (v_user, v_saison, p_event_id, p_equipe_id, p_mise, v_cote);

  return mon_call(v_saison);
exception
  when unique_violation then
    raise exception 'Tu as déjà posé ton call pour cette saison.';
end;
$$;

-- Côté admin : désigner le vainqueur d'un événement et régler tous les calls.
create or replace function regler_evenement(p_event_id text, p_equipe_id text, p_saison_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_regles integer := 0;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  if exists (select 1 from resultats_evenement where event_id = p_event_id and saison_id = p_saison_id) then
    raise exception 'Événement déjà réglé.';
  end if;

  if not exists (
    select 1 from matchs
    where event_id = p_event_id and saison_id = p_saison_id
      and p_equipe_id in (equipe_a_id, equipe_b_id)
  ) then
    raise exception 'Cette équipe ne participe pas à l''événement.';
  end if;

  insert into resultats_evenement (saison_id, event_id, equipe_id)
  values (p_saison_id, p_event_id, p_equipe_id);

  update calls
     set statut = case when equipe_id = p_equipe_id then 'gagne' else 'perdu' end,
         gain   = case when equipe_id = p_equipe_id then round(mise * cote) else 0 end
   where event_id = p_event_id and saison_id = p_saison_id and statut = 'en_cours';

  get diagnostics v_regles = row_count;

  update participations p
     set solde = p.solde + c.gain
    from calls c
   where c.event_id = p_event_id and c.saison_id = p_saison_id and c.statut = 'gagne'
     and p.user_id = c.user_id and p.saison_id = c.saison_id;

  return jsonb_build_object('regles', v_regles);
end;
$$;

-- =====================================================================
--  4. Rivalité de la semaine
-- =====================================================================
--  Aucune table : le rival se déduit du classement et de la semaine ISO, et le
--  bilan hebdomadaire se lit dans les paris déjà enregistrés. C'est pour ça que
--  cette fonctionnalité ne coûte presque rien.

create or replace function clutch_debut_semaine()
returns timestamptz language sql stable as $$ select date_trunc('week', now()) $$;

-- Bilan des paris réglés d'un joueur depuis lundi.
create or replace function clutch_bilan_semaine(p_user uuid, p_saison_id text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'paris',  count(*),
    'gagnes', count(*) filter (where statut = 'gagne'),
    'mises',  coalesce(sum(mise), 0),
    'gains',  coalesce(sum(gain), 0),
    'net',    coalesce(sum(gain), 0) - coalesce(sum(mise), 0)
  )
  from paris
  where user_id = p_user and saison_id = p_saison_id
    and statut in ('gagne', 'perdu')
    and cree_le >= clutch_debut_semaine();
$$;

-- Le rival : un joueur pris parmi les trois plus proches au classement, choisi
-- de façon déterministe à partir de l'identifiant et du numéro de semaine ISO.
-- Il ne change donc pas d'une page à l'autre, mais change tout seul le lundi.
--
-- Le tirage utilise hashtext() côté serveur et une empreinte FNV-1a côté
-- navigateur : les deux backends ne désignent pas forcément le même voisin,
-- ce qui est sans conséquence — un seul des deux tourne à la fois.
create or replace function rivalite_semaine(p_saison_id text, p_ligue_id uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with classement as (
    select row_number() over (order by c.solde desc, c.gagnes desc) as rang, c.*
    from clutch_classement(
      case
        when p_ligue_id is null then array(select user_id from participations where saison_id = p_saison_id)
        else array(select user_id from membres_ligue where ligue_id = p_ligue_id)
      end,
      p_saison_id
    ) c
  ),
  moi as (select * from classement where id = auth.uid()),
  -- Les voisins les plus proches, ceux du dessus d'abord à distance égale.
  voisins as (
    select c.*, row_number() over (order by abs(c.rang - m.rang), (c.rang > m.rang)) as ordre
    from classement c, moi m
    where c.id <> m.id
  ),
  candidats as (select * from voisins where ordre <= 3),
  choisi as (
    select * from candidats
    where ordre = mod(
      abs(hashtext(auth.uid()::text || '|' || to_char(now(), 'IYYY-"S"IW'))::bigint),
      greatest((select count(*) from candidats), 1)
    ) + 1
  )
  select jsonb_build_object(
    'semaine', to_char(now(), 'IYYY-"S"IW'),
    'depuis',  clutch_debut_semaine(),
    'moi',     to_jsonb(m) || jsonb_build_object('bilan', clutch_bilan_semaine(m.id, p_saison_id)),
    'rival',   to_jsonb(r) || jsonb_build_object('bilan', clutch_bilan_semaine(r.id, p_saison_id)),
    'ecart',   m.solde - r.solde
  )
  from moi m, choisi r;
$$;

-- =====================================================================
--  Classement : on y ajoute l'équipe préférée
-- =====================================================================
-- Le type de retour change (deux colonnes en plus) : Postgres exige un drop
-- explicite de chaque fonction, les dépendances entre fonctions SQL n'étant
-- pas suivies automatiquement.
drop function if exists classement_ligue(uuid, text);
drop function if exists classement_global(text);
drop function if exists clutch_classement(uuid[], text) cascade;
create or replace function clutch_classement(p_ids uuid[], p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text
)
language sql stable as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(pt.solde, (select solde_initial from saisons where id = p_saison_id)) as solde,
    count(pa.id) filter (where pa.statut in ('gagne', 'perdu')) as paris,
    count(pa.id) filter (where pa.statut = 'gagne')             as gagnes,
    pr.id = auth.uid()                                          as moi,
    ef.tag                                                      as tag_favori,
    ef.nom                                                      as equipe_favorite
  from profils pr
  left join participations pt on pt.user_id = pr.id and pt.saison_id = p_saison_id
  left join paris pa on pa.user_id = pr.id and pa.saison_id = p_saison_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where pr.id = any (p_ids)
  group by pr.id, pr.pseudo, pt.solde, ef.tag, ef.nom
  order by solde desc, gagnes desc;
$$;

create or replace function classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text
)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from membres_ligue where ligue_id = p_ligue_id), p_saison_id
  );
$$;

create or replace function classement_global(p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text
)
language sql stable as $$
  select * from clutch_classement(
    array(
      select user_id from participations
      where saison_id = p_saison_id order by solde desc limit 100
    ),
    p_saison_id
  );
$$;

-- palmares() dépendait de clutch_classement : on la recrée telle quelle.
create or replace function palmares()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x -> 'saison' ->> 'fin' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'saison', to_jsonb(s),
      'vainqueur', (
        select to_jsonb(c) from clutch_classement(
          array(select user_id from participations where saison_id = s.id), s.id
        ) c limit 1
      )
    ) as x
    from v_saisons s
    where s.statut = 'terminee'
  ) t;
$$;

-- =====================================================================
--  Sécurité
-- =====================================================================

alter table primes              enable row level security;
alter table calls               enable row level security;
alter table resultats_evenement enable row level security;

drop policy if exists "mes primes" on primes;
create policy "mes primes" on primes for select using (auth.uid() = user_id);

-- Un call est public au sein d'une ligue : c'est tout l'intérêt de l'annoncer.
drop policy if exists "mes calls" on calls;
create policy "mes calls" on calls for select using (auth.uid() = user_id);

drop policy if exists "calls des colistiers" on calls;
create policy "calls des colistiers"
  on calls for select using (
    exists (
      select 1
      from membres_ligue moi
      join membres_ligue autre on autre.ligue_id = moi.ligue_id
      where moi.user_id = auth.uid() and autre.user_id = calls.user_id
    )
  );

drop policy if exists "résultats d'événement publics" on resultats_evenement;
create policy "résultats d'événement publics" on resultats_evenement for select using (true);

grant select on v_evenements_saison to anon, authenticated;

-- (aucune policy d'écriture : primes, calls et résultats ne bougent que par
--  les fonctions SECURITY DEFINER ci-dessus.)

revoke all on function reclamer_prime(text)                       from public;
revoke all on function etat_prime(text)                           from public;
revoke all on function placer_call(text, text, integer)           from public;
revoke all on function regler_evenement(text, text, text)         from public;
revoke all on function mon_call(text)                             from public;
revoke all on function rivalite_semaine(text, uuid)               from public;

grant execute on function reclamer_prime(text)                     to authenticated;
grant execute on function etat_prime(text)                         to authenticated;
grant execute on function placer_call(text, text, integer)         to authenticated;
grant execute on function regler_evenement(text, text, text)       to authenticated;
grant execute on function mon_call(text)                           to authenticated;
grant execute on function rivalite_semaine(text, uuid)             to authenticated;
grant execute on function cotes_evenement(text, text)              to anon, authenticated;
grant execute on function classement_ligue(uuid, text)             to authenticated;
grant execute on function classement_global(text)                  to anon, authenticated;
grant execute on function palmares()                               to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/06_analyse.sql
-- =====================================================================
-- =====================================================================
--  Clutch — palier 1 bis et palier 2.
--
--  À exécuter APRÈS 01 à 05, dans l'éditeur SQL de Supabase.
--  Idempotent : le relancer ne casse rien.
--
--  Il apporte trois choses :
--    1. le prono par défaut (mise automatique sur le favori au coup d'envoi)
--    2. le défi de ligue (un tournoi tiré au sort, avec son classement)
--    3. le profil d'analyste (agrégations et constats)
--
--  Miroir de web/js/core.js et web/js/store.js.
-- =====================================================================

-- =====================================================================
--  1. Prono par défaut
-- =====================================================================

alter table profils add column if not exists pari_auto_mode text not null default 'off';
alter table profils add column if not exists pari_auto_mise integer not null default 100;

do $$ begin
  alter table profils add constraint profils_pari_auto_mode_check
    check (pari_auto_mode in ('off', 'favori', 'tous'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table profils add constraint profils_pari_auto_mise_check
    check (pari_auto_mise between 10 and 500);
exception when duplicate_object then null; end $$;

-- On marque les paris posés automatiquement : le joueur doit pouvoir les
-- distinguer des siens d'un coup d'œil, sinon il ne comprend pas son solde.
alter table paris add column if not exists auto boolean not null default false;

/*
 * Pose le pari automatique d'un joueur sur un match, si toutes les conditions
 * sont réunies. Retourne 1 si un pari a été créé, 0 sinon.
 *
 * Aucune de ces sorties n'est une erreur : « pas de pari automatique ici » est
 * un cas normal, et lever une exception ferait échouer le règlement du match.
 */
create or replace function clutch_pari_auto(p_user uuid, p_match_id text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m         record;
  prof      record;
  v_solde   integer;
  v_mise    integer;
  choix     jsonb;
begin
  select * into m from v_matchs where id = p_match_id;
  if not found or m.statut = 'termine' then return 0; end if;

  select * into prof from profils where id = p_user;
  if not found or coalesce(prof.pari_auto_mode, 'off') = 'off' then return 0; end if;

  -- Mode « favori » : uniquement les matchs de son équipe.
  if prof.pari_auto_mode = 'favori' then
    if prof.equipe_favorite_id is null then return 0; end if;
    if prof.equipe_favorite_id not in (m.equipe_a_id, m.equipe_b_id) then return 0; end if;
  end if;

  if exists (select 1 from paris where user_id = p_user and match_id = p_match_id) then
    return 0;
  end if;

  if (select statut from v_saisons where id = m.saison_id) <> 'en_cours' then return 0; end if;

  v_mise := least(coalesce(prof.pari_auto_mise, 100), clutch_mise_max());
  v_solde := (clutch_participation(p_user, m.saison_id)).solde;
  if v_solde < v_mise then return 0; end if;

  -- Le favori du marché « vainqueur », c'est-à-dire la cote la plus basse.
  select value into choix
  from jsonb_array_elements(
         (select value -> 'choix'
          from jsonb_array_elements(cotes_du_match(p_match_id)) as value
          where value ->> 'cle' = 'vainqueur')
       ) as value
  order by (value ->> 'cote')::numeric asc
  limit 1;
  if choix is null then return 0; end if;

  update participations set solde = solde - v_mise
   where user_id = p_user and saison_id = m.saison_id;

  insert into paris (user_id, match_id, saison_id, marche, choix, libelle_marche,
                     libelle_choix, mise, cote, auto)
  values (p_user, p_match_id, m.saison_id, 'vainqueur', choix ->> 'cle',
          'Vainqueur du match', choix ->> 'libelle', v_mise,
          (choix ->> 'cote')::numeric, true);

  return 1;
exception
  when unique_violation then return 0;
end;
$$;

/*
 * Rattrapage, appelé par le joueur à l'ouverture de l'application : pose ses
 * paris automatiques sur les matchs déjà commencés mais pas encore réglés.
 * Sans lui, le pari par défaut n'apparaîtrait qu'après le résultat.
 */
create or replace function rattraper_paris_auto(p_saison_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_poses integer := 0; m record;
begin
  if auth.uid() is null then return jsonb_build_object('poses', 0); end if;
  if (select coalesce(pari_auto_mode, 'off') from profils where id = auth.uid()) = 'off' then
    return jsonb_build_object('poses', 0);
  end if;

  for m in
    select id from matchs
    where saison_id = p_saison_id and statut = 'a_venir' and debut <= now()
    order by debut
  loop
    v_poses := v_poses + clutch_pari_auto(auth.uid(), m.id);
  end loop;

  return jsonb_build_object('poses', v_poses);
end;
$$;

/*
 * Filet de sécurité : au règlement d'un match, on pose d'abord les paris
 * automatiques manquants de TOUS les joueurs concernés — y compris ceux qui
 * n'ont pas ouvert l'application. C'est le cœur de l'anti-décrochage.
 *
 * L'ordre compte : les paris sont posés AVANT la mise à jour des Elo, donc à
 * la cote d'avant-match, celle qui était affichée.
 */
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  v_autos   integer := 0;
  pa        numeric;
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  joueur    record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  -- Paris automatiques des joueurs qui n'ont rien saisi.
  for joueur in
    select id from profils where coalesce(pari_auto_mode, 'off') <> 'off'
  loop
    v_autos := v_autos + clutch_pari_auto(joueur.id, p_match_id);
  end loop;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    v_regles := v_regles + 1;
  end loop;

  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'autos',  v_autos,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- =====================================================================
--  2. Défi de ligue : la compétition tirée au hasard
-- =====================================================================

create table if not exists defis_ligue (
  ligue_id  uuid not null references ligues (id) on delete cascade,
  saison_id text not null references saisons (id) on delete cascade,
  event_id  text not null references evenements (id) on delete cascade,
  tire_par  uuid not null references profils (id) on delete cascade,
  tire_le   timestamptz not null default now(),
  primary key (ligue_id, saison_id)
);

create or replace function defi_ligue(p_ligue_id uuid, p_saison_id text)
returns jsonb language sql stable as $$
  select to_jsonb(d) || jsonb_build_object('nom', ev.nom, 'jeu', ev.jeu)
  from defis_ligue d
  join evenements ev on ev.id = d.event_id
  where d.ligue_id = p_ligue_id and d.saison_id = p_saison_id;
$$;

/*
 * Tire un tournoi au sort pour une ligue : un seul par saison, tiré par le
 * créateur, et uniquement parmi les tournois qui ont encore des matchs à
 * jouer — tirer un tournoi déjà fini n'aurait aucun intérêt.
 */
create or replace function tirer_defi(p_ligue_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_saison text; v_event text;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  if not exists (select 1 from ligues where id = p_ligue_id and createur_id = auth.uid()) then
    raise exception 'Seul le créateur de la ligue peut tirer le défi.';
  end if;

  select id into v_saison from v_saisons where statut = 'en_cours' order by debut desc limit 1;
  if v_saison is null then raise exception 'Aucune saison ouverte.'; end if;

  if exists (select 1 from defis_ligue where ligue_id = p_ligue_id and saison_id = v_saison) then
    raise exception 'Le défi de cette saison est déjà tiré.';
  end if;

  select event_id into v_event
  from matchs
  where saison_id = v_saison and statut = 'a_venir' and debut > now()
  group by event_id
  order by random()
  limit 1;
  if v_event is null then raise exception 'Aucun tournoi n''a encore de match à jouer.'; end if;

  insert into defis_ligue (ligue_id, saison_id, event_id, tire_par)
  values (p_ligue_id, v_saison, v_event, auth.uid());

  return defi_ligue(p_ligue_id, v_saison);
end;
$$;

/*
 * Classement du défi : seuls les paris posés sur les matchs du tournoi tiré
 * comptent, et on classe au bénéfice net — pas au solde, qui mélangerait le
 * reste de la saison.
 */
create or replace function classement_defi(p_ligue_id uuid, p_saison_id text)
returns table (
  id uuid, pseudo text, moi boolean,
  paris bigint, gagnes bigint, mises bigint, gains bigint, net bigint
)
language sql stable as $$
  with defi as (
    select event_id from defis_ligue where ligue_id = p_ligue_id and saison_id = p_saison_id
  ),
  matchs_defi as (
    select m.id from matchs m join defi d on d.event_id = m.event_id
    where m.saison_id = p_saison_id
  )
  select
    pr.id,
    pr.pseudo,
    pr.id = auth.uid() as moi,
    count(pa.id)                                  as paris,
    count(pa.id) filter (where pa.statut = 'gagne') as gagnes,
    coalesce(sum(pa.mise), 0)                     as mises,
    coalesce(sum(pa.gain), 0)                     as gains,
    coalesce(sum(pa.gain), 0) - coalesce(sum(pa.mise), 0) as net
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  left join paris pa
    on pa.user_id = pr.id
   and pa.statut in ('gagne', 'perdu')
   and pa.match_id in (select id from matchs_defi)
  where ml.ligue_id = p_ligue_id
  group by pr.id, pr.pseudo
  order by net desc, paris desc;
$$;

-- =====================================================================
--  3. Profil d'analyste
-- =====================================================================
--  Tout est calculé sur les paris RÉGLÉS uniquement : un pari en cours n'a ni
--  gain ni enseignement. Les tranches de cote reprennent celles de core.js.

-- Agrégation par dimension. Une seule fonction, la dimension est un paramètre :
-- quatre fonctions jumelles auraient divergé à la première correction.
create or replace function clutch_agreger(p_saison_id text, p_dimension text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_expression text;
begin
  v_expression := case p_dimension
    when 'format' then 'm.format::text'
    when 'jeu'    then 'm.jeu'
    when 'marche' then 'p.marche'
    when 'cote'   then $c$case when p.cote < 1.8 then 'favori'
                               when p.cote < 3.0 then 'equilibre'
                               else 'outsider' end$c$
    else null
  end;
  if v_expression is null then raise exception 'Dimension inconnue : %', p_dimension; end if;

  execute format($f$
    select coalesce(jsonb_agg(x order by (x ->> 'paris')::bigint desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'cle',    cle,
        'paris',  count(*),
        'gagnes', count(*) filter (where statut = 'gagne'),
        'mises',  coalesce(sum(mise), 0),
        'gains',  coalesce(sum(gain), 0),
        'net',    coalesce(sum(gain), 0) - coalesce(sum(mise), 0),
        'roi',    case when coalesce(sum(mise), 0) = 0 then 0
                       else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
      ) as x
      from (
        select p.statut, p.mise, p.gain, %s as cle
        from paris p
        join matchs m on m.id = p.match_id
        where p.user_id = auth.uid()
          and p.saison_id = $1
          and p.statut in ('gagne', 'perdu')
      ) t
      where cle is not null
      group by cle
    ) g
  $f$, v_expression)
  into v
  using p_saison_id;

  return v;
end;
$$;

-- Bilan sur les matchs de l'équipe préférée (avec = true) ou sur tous les autres.
-- C'est la comparaison qui révèle le biais du supporter.
create or replace function clutch_bloc_favorite(p_saison_id text, p_avec boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'paris',  count(*),
    'gagnes', count(*) filter (where p.statut = 'gagne'),
    'mises',  coalesce(sum(p.mise), 0),
    'gains',  coalesce(sum(p.gain), 0),
    'net',    coalesce(sum(p.gain), 0) - coalesce(sum(p.mise), 0),
    'roi',    case when coalesce(sum(p.mise), 0) = 0 then 0
                   else round((coalesce(sum(p.gain), 0) - sum(p.mise))::numeric / sum(p.mise) * 100, 1) end
  )
  from paris p
  join matchs m on m.id = p.match_id
  join profils pr on pr.id = p.user_id
  where p.user_id = auth.uid()
    and p.saison_id = p_saison_id
    and p.statut in ('gagne', 'perdu')
    and case when p_avec
             then pr.equipe_favorite_id in (m.equipe_a_id, m.equipe_b_id)
             else pr.equipe_favorite_id is distinct from m.equipe_a_id
              and pr.equipe_favorite_id is distinct from m.equipe_b_id
        end;
$$;

create or replace function mes_statistiques_detaillees(p_saison_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_fav record; v_total jsonb;
begin
  if auth.uid() is null then return null; end if;

  select e.id as id, e.nom as nom, e.tag as tag into v_fav
  from profils pr
  left join equipes e on e.id = pr.equipe_favorite_id
  where pr.id = auth.uid();

  select jsonb_build_object(
    'paris',  count(*),
    'gagnes', count(*) filter (where statut = 'gagne'),
    'mises',  coalesce(sum(mise), 0),
    'gains',  coalesce(sum(gain), 0),
    'net',    coalesce(sum(gain), 0) - coalesce(sum(mise), 0),
    'roi',    case when coalesce(sum(mise), 0) = 0 then 0
                   else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
  ) into v_total
  from paris
  where user_id = auth.uid() and saison_id = p_saison_id and statut in ('gagne', 'perdu');

  return jsonb_build_object(
    'total',      v_total,
    'par_format', clutch_agreger(p_saison_id, 'format'),
    'par_jeu',    clutch_agreger(p_saison_id, 'jeu'),
    'par_marche', clutch_agreger(p_saison_id, 'marche'),
    'par_cote',   clutch_agreger(p_saison_id, 'cote'),
    'equipe_favorite', case
      when v_fav.id is null then null
      else jsonb_build_object(
        'nom',  v_fav.nom,
        'tag',  v_fav.tag,
        'avec', clutch_bloc_favorite(p_saison_id, true),
        'sans', clutch_bloc_favorite(p_saison_id, false))
    end
  );
end;
$$;

-- =====================================================================
--  Sécurité
-- =====================================================================

alter table defis_ligue enable row level security;

drop policy if exists "défi visible par les membres de la ligue" on defis_ligue;
create policy "défi visible par les membres de la ligue"
  on defis_ligue for select using (
    exists (select 1 from membres_ligue where ligue_id = defis_ligue.ligue_id and user_id = auth.uid())
  );

revoke all on function rattraper_paris_auto(text)             from public;
revoke all on function tirer_defi(uuid)                       from public;
revoke all on function defi_ligue(uuid, text)                 from public;
revoke all on function classement_defi(uuid, text)            from public;
revoke all on function mes_statistiques_detaillees(text)      from public;
revoke all on function clutch_agreger(text, text)             from public;
revoke all on function clutch_bloc_favorite(text, boolean)    from public;
revoke all on function clutch_pari_auto(uuid, text)           from public;

grant execute on function rattraper_paris_auto(text)          to authenticated;
grant execute on function tirer_defi(uuid)                    to authenticated;
grant execute on function defi_ligue(uuid, text)              to authenticated;
grant execute on function classement_defi(uuid, text)         to authenticated;
grant execute on function mes_statistiques_detaillees(text)   to authenticated;
grant execute on function regler_match(text, integer, integer) to authenticated;

-- =====================================================================
-- Legacy source: supabase/07_correctif_rls.sql
-- =====================================================================
-- =====================================================================
--  Clutch — correctif de sécurité : récursion infinie dans les policies.
--
--  À exécuter APRÈS 01 à 06. Idempotent.
--
--  LE BUG
--  ------
--  La policy de lecture de membres_ligue interrogeait membres_ligue :
--
--    create policy ... on membres_ligue for select using (
--      exists (select 1 from membres_ligue m2 where ...)   -- <— récursion
--    );
--
--  Postgres refuse et lève « infinite recursion detected in policy for
--  relation membres_ligue ».
--
--  POURQUOI TOUTE LA BASE TOMBAIT AVEC
--  -----------------------------------
--  Les policies « modifiables par les admins » sont déclarées FOR ALL, donc
--  elles s'appliquent aussi en LECTURE. Lire equipes évaluait « admin ? »,
--  qui lisait profils, dont la policy lisait membres_ligue, qui explosait.
--  Résultat : une seule règle fautive rendait illisibles equipes, profils,
--  participations et ligues — d'où le « clé refusée » du diagnostic, qui
--  n'avait rien à voir avec la clé.
--
--  LE PRINCIPE DU CORRECTIF
--  ------------------------
--  Une policy ne doit jamais interroger directement une table protégée par
--  une policy. On passe par des fonctions SECURITY DEFINER : elles
--  s'exécutent avec les droits du propriétaire, donc sans déclencher la RLS,
--  et la chaîne s'arrête net. C'est la parade standard.
-- =====================================================================

-- ------------------------------------------------------------- Fonctions
-- STABLE : le résultat ne change pas dans une même requête, Postgres peut
-- donc n'appeler chacune qu'une fois par ligne évaluée.

/** Les ligues dont je suis membre. Ne déclenche aucune policy. */
create or replace function clutch_mes_ligues()
returns setof uuid language sql stable security definer set search_path = public as $$
  select ligue_id from membres_ligue where user_id = auth.uid();
$$;

/** Cette personne partage-t-elle au moins une ligue avec moi ? */
create or replace function clutch_est_colistier(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from membres_ligue autre
    where autre.user_id = p_user
      and autre.ligue_id in (select ligue_id from membres_ligue where user_id = auth.uid())
  );
$$;

/** Suis-je administrateur ? Lit profils sans passer par ses policies. */
create or replace function clutch_est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select est_admin from profils where id = auth.uid()), false);
$$;

-- --------------------------------------------------------- membres_ligue
-- La règle qui causait tout. Elle ne s'interroge plus elle-même.
drop policy if exists "membres visibles entre colistiers" on membres_ligue;
create policy "membres visibles entre colistiers"
  on membres_ligue for select using (
    user_id = auth.uid() or ligue_id in (select clutch_mes_ligues())
  );

-- ---------------------------------------------------------------- Ligues
drop policy if exists "ligues de mes ligues" on ligues;
create policy "ligues de mes ligues"
  on ligues for select using (id in (select clutch_mes_ligues()));

-- --------------------------------------------------------------- Profils
drop policy if exists "profils des colistiers lisibles" on profils;
create policy "profils des colistiers lisibles"
  on profils for select using (clutch_est_colistier(profils.id));

-- -------------------------------------------------------- Participations
drop policy if exists "participations des colistiers" on participations;
create policy "participations des colistiers"
  on participations for select using (clutch_est_colistier(participations.user_id));

-- ----------------------------------------------------------------- Calls
drop policy if exists "calls des colistiers" on calls;
create policy "calls des colistiers"
  on calls for select using (clutch_est_colistier(calls.user_id));

-- ------------------------------------------------------------ Défis
drop policy if exists "défi visible par les membres de la ligue" on defis_ligue;
create policy "défi visible par les membres de la ligue"
  on defis_ligue for select using (ligue_id in (select clutch_mes_ligues()));

-- ------------------------------------------------- Policies d'administration
-- Elles restent FOR ALL, mais passent désormais par clutch_est_admin(), qui
-- ne déclenche plus la lecture de profils et donc plus la chaîne.

drop policy if exists "saisons modifiables par les admins" on saisons;
create policy "saisons modifiables par les admins"
  on saisons for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "matchs modifiables par les admins" on matchs;
create policy "matchs modifiables par les admins"
  on matchs for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "équipes modifiables par les admins" on equipes;
create policy "équipes modifiables par les admins"
  on equipes for all using (clutch_est_admin()) with check (clutch_est_admin());

drop policy if exists "évènements modifiables par les admins" on evenements;
create policy "évènements modifiables par les admins"
  on evenements for all using (clutch_est_admin()) with check (clutch_est_admin());

-- --------------------------------------------------------------- Droits
revoke all on function clutch_mes_ligues()          from public;
revoke all on function clutch_est_colistier(uuid)   from public;
revoke all on function clutch_est_admin()           from public;

grant execute on function clutch_mes_ligues()        to authenticated;
grant execute on function clutch_est_colistier(uuid) to authenticated;
grant execute on function clutch_est_admin()         to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/08_palier2.sql
-- =====================================================================
-- =====================================================================
--  Clutch — palier 2 : classement enrichi, badges, cartes.
--
--  À exécuter APRÈS 01 à 07. Idempotent.
--
--  Il apporte deux choses seulement, et c'est volontaire :
--    1. la note à vie (une colonne, mise à jour au règlement)
--    2. le récapitulatif qui alimente les badges
--
--  Les VINGT ET UNE RÈGLES de badges ne sont PAS ici : elles vivent dans
--  web/js/core.js et nulle part ailleurs. Les réécrire en PL/pgSQL aurait
--  créé deux vérités qui auraient divergé dès le premier badge ajouté. Un
--  badge n'est ni de l'argent ni un droit — rien n'oblige à le calculer côté
--  serveur. Le solde, lui, reste calculé ici et seulement ici.
-- =====================================================================

-- =====================================================================
--  1. La note à vie
-- =====================================================================

alter table profils add column if not exists note integer not null default 1000;
alter table profils add column if not exists note_paris integer not null default 0;

create or replace function clutch_note_initiale() returns integer language sql immutable as $$ select 1000 $$;
create or replace function clutch_note_k()        returns integer language sql immutable as $$ select 16 $$;

/*
 * Probabilité réelle derrière une cote, marge retirée.
 *
 * La cote servie intègre 6 % de marge : sa probabilité implicite est
 * surestimée. Noter les joueurs dessus les ferait tous dériver vers le bas,
 * y compris un joueur parfait — la note mesurerait la marge, pas le jugement.
 */
create or replace function clutch_proba_sans_marge(p_cote numeric)
returns numeric language sql immutable as $$
  select least(1, greatest(0, 1.0 / (p_cote * (1 + clutch_marge()))));
$$;

/*
 * Nouvelle note après un pari réglé : un Elo joué contre le marché.
 * La mise n'entre pas dans le calcul — la note mesure la justesse, pas le
 * courage ni le volume. Le classement au solde s'occupe déjà de ça.
 */
create or replace function clutch_maj_note(p_note integer, p_cote numeric, p_gagnant boolean)
returns integer language sql immutable as $$
  select round(
    coalesce(p_note, clutch_note_initiale())
    + clutch_note_k() * ((case when p_gagnant then 1 else 0 end) - clutch_proba_sans_marge(p_cote))
  )::integer;
$$;

-- =====================================================================
--  2. Règlement d'un match : on y ajoute la note
-- =====================================================================
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  v_autos   integer := 0;
  pa        numeric;
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  joueur    record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  -- Paris automatiques des joueurs qui n'ont rien saisi (anti-décrochage).
  for joueur in select id from profils where coalesce(pari_auto_mode, 'off') <> 'off' loop
    v_autos := v_autos + clutch_pari_auto(joueur.id, p_match_id);
  end loop;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    -- La note à vie suit chaque pari réglé, toutes saisons confondues.
    update profils
       set note = clutch_maj_note(note, pari.cote, gagnant),
           note_paris = note_paris + 1
     where id = pari.user_id;

    v_regles := v_regles + 1;
  end loop;

  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles, 'autos', v_autos,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- =====================================================================
--  3. Classements : la note et le retour sur mise s'ajoutent au solde
-- =====================================================================
drop function if exists classement_ligue(uuid, text);
drop function if exists classement_global(text);
drop function if exists clutch_classement(uuid[], text) cascade;

create or replace function clutch_classement(p_ids uuid[], p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(pt.solde, (select solde_initial from saisons where id = p_saison_id)) as solde,
    count(pa.id) filter (where pa.statut in ('gagne', 'perdu'))    as paris,
    count(pa.id) filter (where pa.statut = 'gagne')                as gagnes,
    pr.id = auth.uid()                                             as moi,
    ef.tag                                                         as tag_favori,
    ef.nom                                                         as equipe_favorite,
    coalesce(sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')), 0) as mises,
    coalesce(sum(pa.gain), 0)                                      as gains,
    case
      when coalesce(sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')), 0) = 0 then 0
      else round(
        (coalesce(sum(pa.gain), 0) - sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')))::numeric
        / sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')) * 100, 1)
    end                                                            as roi,
    pr.note,
    pr.note_paris
  from profils pr
  left join participations pt on pt.user_id = pr.id and pt.saison_id = p_saison_id
  left join paris pa on pa.user_id = pr.id and pa.saison_id = p_saison_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where pr.id = any (p_ids)
  group by pr.id, pr.pseudo, pt.solde, ef.tag, ef.nom, pr.note, pr.note_paris
  order by solde desc, gagnes desc;
$$;

create or replace function classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from membres_ligue where ligue_id = p_ligue_id), p_saison_id
  );
$$;

create or replace function classement_global(p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from participations where saison_id = p_saison_id order by solde desc limit 100),
    p_saison_id
  );
$$;

create or replace function palmares()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x -> 'saison' ->> 'fin' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'saison', to_jsonb(s),
      'vainqueur', (
        select to_jsonb(c) from clutch_classement(
          array(select user_id from participations where saison_id = s.id), s.id
        ) c limit 1
      )
    ) as x
    from v_saisons s
    where s.statut = 'terminee'
  ) t;
$$;

-- =====================================================================
--  4. Le récapitulatif qui alimente les badges
-- =====================================================================
/*
 * Une seule requête, sur TOUTE la carrière du joueur — pas sur la saison
 * courante : un badge qui disparaîtrait au changement de saison n'aurait
 * aucun sens.
 *
 * Les noms de champs sont exactement ceux qu'attend recapPourBadges() en
 * JavaScript. C'est le contrat entre les deux moitiés.
 */
create or replace function recap_badges()
returns jsonb language sql stable security definer set search_path = public as $$
  with mes_paris as (
    select p.*, m.jeu
    from paris p join matchs m on m.id = p.match_id
    where p.user_id = auth.uid() and p.statut in ('gagne', 'perdu')
  ),
  -- Plus longue série de paris gagnants d'affilée, en ordre chronologique.
  chrono as (
    select statut, cree_le,
           row_number() over (order by cree_le)
             - row_number() over (partition by statut order by cree_le) as groupe
    from mes_paris
  ),
  series as (
    select count(*) as longueur from chrono where statut = 'gagne' group by groupe
  ),
  par_jeu as (
    select jeu, count(*) as n from mes_paris where jeu is not null group by jeu
  ),
  mes_ligues as (
    select l.id, l.createur_id,
           (select count(*) from membres_ligue x where x.ligue_id = l.id) as nb_membres
    from ligues l
    join membres_ligue ml on ml.ligue_id = l.id and ml.user_id = auth.uid()
  )
  select jsonb_build_object(
    'paris',            (select count(*) from mes_paris),
    'gagnes',           (select count(*) from mes_paris where statut = 'gagne'),
    'mises',            (select coalesce(sum(mise), 0) from mes_paris),
    'gains',            (select coalesce(sum(gain), 0) from mes_paris),
    'net',              (select coalesce(sum(gain), 0) - coalesce(sum(mise), 0) from mes_paris),
    'roi',              (select case when coalesce(sum(mise), 0) = 0 then 0
                                     else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
                         from mes_paris),
    'cote_max_gagnee',  (select coalesce(max(cote), 0) from mes_paris where statut = 'gagne'),
    'mise_max_gagnee',  (select coalesce(max(mise), 0) from mes_paris where statut = 'gagne'),
    'scores_exacts',    (select count(*) from mes_paris where statut = 'gagne' and marche = 'score_exact'),
    'total_maps_gagnes',(select count(*) from mes_paris where statut = 'gagne' and marche = 'total_maps'),
    'plus_longue_serie',(select coalesce(max(longueur), 0) from series),
    'jours_actifs',     (select count(distinct cree_le::date) from mes_paris),
    'saisons_jouees',   (select count(distinct saison_id) from mes_paris),
    'jeux_joues',       (select count(*) from par_jeu),
    'paris_jeu_max',    (select coalesce(max(n), 0) from par_jeu),
    'calls_gagnes',     (select count(*) from calls where user_id = auth.uid() and statut = 'gagne'),
    'serie_prime_max',  (select coalesce(max(serie), 0) from primes where user_id = auth.uid()),
    'ligues_creees',    (select count(*) from mes_ligues where createur_id = auth.uid()),
    'plus_grande_ligue',(select coalesce(max(nb_membres), 0) from mes_ligues),
    'a_equipe_favorite',(select equipe_favorite_id is not null from profils where id = auth.uid())
  );
$$;

-- =====================================================================
--  Droits
-- =====================================================================
revoke all on function recap_badges() from public;
grant execute on function recap_badges()                to authenticated;
grant execute on function classement_ligue(uuid, text)  to authenticated;
grant execute on function classement_global(text)       to anon, authenticated;
grant execute on function palmares()                    to anon, authenticated;
grant execute on function regler_match(text, integer, integer) to authenticated;


-- =====================================================================
-- Legacy source: supabase/09_admin_competition.sql
-- =====================================================================
-- =====================================================================
--  Clutch — création de compétition depuis la console d'administration.
--
--  À exécuter APRÈS 01 à 08. Idempotent.
--
--  Jusqu'ici, créer un tournoi, une équipe ou un match supposait d'écrire des
--  INSERT à la main dans l'éditeur SQL. C'était le dernier obstacle entre le
--  produit et une vraie partie : tout tournait sur des affiches inventées.
--
--  Il apporte aussi l'ANNULATION avec remboursement, identifiée comme risque
--  dans le cadrage initial (« matchs reportés, forfaits ») et jamais traitée.
-- =====================================================================

alter table matchs add column if not exists motif_annulation text;

-- Retire les accents sans dépendre de l'extension unaccent, absente par défaut.
create or replace function unaccent_simple(p_texte text)
returns text language sql immutable as $$
  select translate(
    p_texte,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- --------------------------------------------------------------- Tournois
create or replace function creer_evenement(p_nom text, p_jeu text, p_tier text default 'A')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_ev evenements%rowtype;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom au tournoi.'; end if;
  if p_jeu not in ('lol', 'cs2', 'valorant') then raise exception 'Jeu inconnu.'; end if;

  -- Identifiant lisible, dérivé du nom : « LEC Summer » -> « ev-lec-summer ».
  v_id := 'ev-' || left(regexp_replace(lower(unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);

  if exists (select 1 from evenements where id = v_id) then
    raise exception 'Un tournoi porte déjà ce nom.';
  end if;

  insert into evenements (id, jeu, nom, tier)
  values (v_id, p_jeu, left(trim(p_nom), 60), coalesce(p_tier, 'A'))
  returning * into v_ev;
  return to_jsonb(v_ev);
end;
$$;

-- ---------------------------------------------------------------- Équipes
create or replace function creer_equipe(p_nom text, p_tag text, p_jeu text, p_elo integer default 1500)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_eq equipes%rowtype;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom à l''équipe.'; end if;
  if trim(p_tag) !~ '^[A-Za-z0-9.]{2,6}$' then
    raise exception 'Le tag fait 2 à 6 caractères, sans espace.';
  end if;
  if p_jeu not in ('lol', 'cs2', 'valorant') then raise exception 'Jeu inconnu.'; end if;
  if p_elo < 1000 or p_elo > 2200 then
    raise exception 'L''Elo de départ doit être entre 1000 et 2200.';
  end if;

  v_id := 'eq-' || left(regexp_replace(lower(unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);
  if exists (select 1 from equipes where id = v_id) then
    raise exception 'Une équipe porte déjà ce nom.';
  end if;

  insert into equipes (id, jeu, nom, tag, elo)
  values (v_id, p_jeu, left(trim(p_nom), 40), upper(trim(p_tag)), p_elo)
  returning * into v_eq;
  return to_jsonb(v_eq);
end;
$$;

-- ----------------------------------------------------------------- Matchs
create or replace function creer_match(
  p_event_id text, p_equipe_a text, p_equipe_b text,
  p_format integer, p_debut timestamptz, p_saison_id text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ev record; v_a record; v_b record; v_id text;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;

  select * into v_ev from evenements where id = p_event_id;
  if not found then raise exception 'Tournoi inconnu.'; end if;
  if p_equipe_a = p_equipe_b then raise exception 'Une équipe ne joue pas contre elle-même.'; end if;
  if p_format not in (1, 3, 5) then raise exception 'Format attendu : BO1, BO3 ou BO5.'; end if;

  -- Un match créé après son coup d'envoi serait fermé aux mises d'emblée, et
  -- personne ne comprendrait pourquoi. On refuse plutôt que de le laisser passer.
  if p_debut <= now() then
    raise exception 'La date doit être dans le futur, sinon les mises sont fermées d''emblée.';
  end if;
  if not exists (select 1 from saisons where id = p_saison_id) then
    raise exception 'Saison inconnue.';
  end if;

  select * into v_a from equipes where id = p_equipe_a;
  select * into v_b from equipes where id = p_equipe_b;
  if v_a is null or v_b is null then raise exception 'Équipe inconnue.'; end if;
  if v_a.jeu <> v_ev.jeu or v_b.jeu <> v_ev.jeu then
    raise exception 'Les deux équipes doivent jouer au même jeu que le tournoi.';
  end if;

  v_id := gen_random_uuid()::text;
  insert into matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut, statut)
  values (v_id, p_event_id, p_saison_id, v_ev.jeu, p_equipe_a, p_equipe_b, p_format, p_debut, 'a_venir');

  return (select to_jsonb(v) from v_matchs v where v.id = v_id);
end;
$$;

/*
 * Annulation d'un match, avec remboursement intégral.
 *
 * Le filet manquant du cadrage : un match reporté ou un forfait ne doit pas
 * priver les joueurs de leur mise. On rembourse à l'unité près, et on ne
 * touche NI aux notes NI aux Elo — un match qui n'a pas eu lieu n'apprend
 * rien sur personne.
 */
create or replace function annuler_match(p_match_id text, p_motif text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare m record; v_nb integer := 0; v_total bigint := 0; pari record;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Un match déjà réglé ne peut plus être annulé.'; end if;
  if m.statut = 'annule' then raise exception 'Match déjà annulé.'; end if;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    update paris set statut = 'rembourse', gain = pari.mise where id = pari.id;
    update participations set solde = solde + pari.mise
     where user_id = pari.user_id and saison_id = pari.saison_id;
    v_nb := v_nb + 1;
    v_total := v_total + pari.mise;
  end loop;

  update matchs
     set statut = 'annule', motif_annulation = nullif(left(coalesce(p_motif, ''), 120), '')
   where id = p_match_id;

  return jsonb_build_object('rembourses', v_nb, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------- Droits
revoke all on function creer_evenement(text, text, text)                          from public;
revoke all on function creer_equipe(text, text, text, integer)                     from public;
revoke all on function creer_match(text, text, text, integer, timestamptz, text)   from public;
revoke all on function annuler_match(text, text)                                   from public;

grant execute on function creer_evenement(text, text, text)                        to authenticated;
grant execute on function creer_equipe(text, text, text, integer)                  to authenticated;
grant execute on function creer_match(text, text, text, integer, timestamptz, text) to authenticated;
grant execute on function annuler_match(text, text)                                to authenticated;
grant execute on function unaccent_simple(text)                                    to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/10_communautes.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 10. Les communautés
--
--  Une communauté, c'est l'ensemble des joueurs qui ont choisi la même
--  équipe préférée. Rien de nouveau n'est stocké : tout se déduit de
--  profils.equipe_favorite_id, qui existe depuis le fichier 05.
--
--  À exécuter après 09_admin_competition.sql. Ce fichier est rejouable :
--  on peut le lancer deux fois sans rien casser.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Classement des communautés
--
--  SECURITY DEFINER, et c'est délibéré. La politique de lecture sur
--  `profils` peut restreindre les lignes visibles ; un simple count()
--  renverrait alors un nombre faux, différent selon qui regarde. Or ce
--  compteur ne divulgue rien de personnel : c'est un total agrégé, sans
--  aucun pseudo ni identifiant. On le calcule donc avec les droits du
--  propriétaire de la fonction, et on ne sort que des totaux.
--
--  Les équipes sans aucun membre ne sont pas renvoyées : un classement
--  de 30 lignes dont 27 à zéro n'apprend rien à personne.
-- ---------------------------------------------------------------------
drop function if exists classement_communautes();

create or replace function classement_communautes()
returns table (
  equipe_id text,
  nom       text,
  tag       text,
  jeu       text,
  elo       integer,
  membres   bigint,
  moi       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.nom,
    e.tag,
    e.jeu,
    e.elo,
    count(pr.id)                                        as membres,
    coalesce(bool_or(pr.id = auth.uid()), false)        as moi
  from equipes e
  join profils pr on pr.equipe_favorite_id = e.id
  group by e.id, e.nom, e.tag, e.jeu, e.elo
  order by count(pr.id) desc, e.nom asc;
$$;

-- Lisible sans compte : la page communauté est une vitrine, elle doit
-- pouvoir donner envie à quelqu'un qui n'est pas encore inscrit.
grant execute on function classement_communautes() to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/11_volts.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 11_volts.sql
--  La monnaie cosmétique : grand livre, catalogue, inventaire, achat.
--
--  À exécuter après 10_communautes.sql. Rejouable sans effet de bord.
--
--  Décision de référence : claude/double-monnaie-frags-volts.md (16 août).
--    · Les Frags restent la bankroll misable, saisonnière, dans
--      participations.solde. Ce fichier n'y touche pas une seule fois.
--    · Les Volts s'accumulent à vie, ne se misent jamais, et ne peuvent
--      donc pas déplacer un joueur au classement.
--
--  Règle héritée de l'incident du 13 août : une policy ne doit jamais
--  interroger directement une table protégée par une policy. Toutes les
--  lectures croisées passent par les fonctions SECURITY DEFINER ci-dessous.
-- =====================================================================

-- ------------------------------------------------- Aides de sécurité
-- Aucune nouvelle : ce fichier réutilise clutch_est_admin() et
-- clutch_est_colistier(uuid) de 07_correctif_rls.sql, qui sont déjà les
-- fonctions SECURITY DEFINER par lesquelles tout le reste de la base passe.
-- On échoue tôt et clairement si 07 n'a pas été exécuté.
do $$
begin
  if to_regprocedure('clutch_est_admin()') is null
     or to_regprocedure('clutch_est_colistier(uuid)') is null then
    raise exception
      'Executer 07_correctif_rls.sql avant ce fichier : clutch_est_admin() et clutch_est_colistier(uuid) sont requises';
  end if;
end $$;

-- ----------------------------------------------------------- Catalogue
-- Un objet par (emplacement, niveau). Le niveau 1 est toujours à 0 Volt :
-- c'est le manque de départ, pas un achat — la Tour Beige jaunie et la
-- sortie graphique intégrée doivent être subies avant d'être remplacées.
create table if not exists objets_catalogue (
  id          text primary key,
  emplacement text not null,
  niveau      integer not null check (niveau between 1 and 4),
  nom         text not null,
  prix        integer not null check (prix >= 0),
  actif       boolean not null default true,
  unique (emplacement, niveau),
  -- Le niveau 1 est gratuit, les autres ne le sont pas.
  check ((niveau = 1 and prix = 0) or (niveau > 1 and prix > 0))
);
create index if not exists objets_catalogue_emplacement_idx
  on objets_catalogue (emplacement, niveau);

-- ------------------------------------------------------- Grand livre
-- Un seul journal, crédits en positif et débits en négatif. Le solde est
-- toujours la somme du journal : il ne peut pas diverger d'un total tenu
-- à part, et chaque Volt reste traçable jusqu'à son origine.
--
-- La contrainte d'unicité (user_id, origine, reference) est ce qui rend
-- toute attribution idempotente : recréditer deux fois le même badge, ou
-- clôturer deux fois la même saison, ne fait rien.
create table if not exists volts_mouvements (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profils (id) on delete cascade,
  montant   integer not null check (montant <> 0),
  origine   text not null check (origine in ('badge', 'saison', 'call', 'achat', 'ajustement')),
  reference text not null,
  cree_le   timestamptz not null default now(),
  unique (user_id, origine, reference)
);
create index if not exists volts_mouvements_user_idx
  on volts_mouvements (user_id, cree_le desc);

-- ---------------------------------------------------------- Inventaire
create table if not exists inventaire (
  user_id   uuid not null references profils (id) on delete cascade,
  objet_id  text not null references objets_catalogue (id),
  acquis_le timestamptz not null default now(),
  primary key (user_id, objet_id)
);

-- --------------------------------------------------------- Équipement
-- Un objet équipé par emplacement. Ce qu'on montre, pas ce qu'on possède.
create table if not exists equipement (
  user_id     uuid not null references profils (id) on delete cascade,
  emplacement text not null,
  objet_id    text not null references objets_catalogue (id),
  maj_le      timestamptz not null default now(),
  primary key (user_id, emplacement)
);

-- ================================================================ Solde
create or replace function clutch_solde_volts(p_user uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(montant), 0)::integer
  from volts_mouvements
  where user_id = p_user;
$$;

-- ================================================= Attribution de Volts
-- Primitive unique de crédit. Idempotente par (user, origine, reference).
-- Renvoie true si le crédit a été posé, false s'il l'avait déjà été.
create or replace function clutch_crediter_volts(
  p_user      uuid,
  p_montant   integer,
  p_origine   text,
  p_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pose boolean;
begin
  if p_montant <= 0 then
    raise exception 'un credit doit etre strictement positif (recu : %)', p_montant
      using errcode = '22023';
  end if;
  if p_origine = 'achat' then
    raise exception 'l''origine achat est reservee a clutch_acheter_objet'
      using errcode = '22023';
  end if;

  insert into volts_mouvements (user_id, montant, origine, reference)
  values (p_user, p_montant, p_origine, p_reference)
  on conflict (user_id, origine, reference) do nothing;

  get diagnostics v_pose = row_count;
  return v_pose;
end;
$$;

-- Personne ne crédite des Volts depuis le client : cette fonction n'est
-- appelable que par le serveur (clé de service) ou par un autre SECURITY
-- DEFINER. Les rôles Supabase n'existent pas sur un PostgreSQL nu, d'où le
-- test — le script reste exécutable hors Supabase.
do $$
declare r text;
begin
  revoke execute on function clutch_crediter_volts(uuid, integer, text, text) from public;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function clutch_crediter_volts(uuid, integer, text, text) from %I', r);
    end if;
  end loop;
end $$;

-- ========================================================== Achat
-- Atomique par construction :
--   · un verrou consultatif par joueur sérialise ses achats simultanés ;
--   · l'unicité (user, 'achat', objet) interdit le double débit même si
--     le verrou sautait ;
--   · le débit et l'entrée en inventaire sont dans la même transaction.
create or replace function clutch_acheter_objet(p_objet_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_prix        integer;
  v_emplacement text;
  v_nom         text;
  v_solde       integer;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select prix, emplacement, nom
    into v_prix, v_emplacement, v_nom
  from objets_catalogue
  where id = p_objet_id and actif;

  if not found then
    raise exception 'objet introuvable ou retire du catalogue : %', p_objet_id
      using errcode = 'P0002';
  end if;

  if exists (select 1 from inventaire where user_id = v_user and objet_id = p_objet_id) then
    raise exception 'objet deja possede : %', p_objet_id using errcode = 'P0001';
  end if;

  select coalesce(sum(montant), 0) into v_solde
  from volts_mouvements where user_id = v_user;

  if v_solde < v_prix then
    raise exception 'solde insuffisant : % Volts requis, % disponibles', v_prix, v_solde
      using errcode = 'P0001';
  end if;

  -- Le niveau 1 est gratuit : pas de mouvement à zéro dans le journal.
  if v_prix > 0 then
    insert into volts_mouvements (user_id, montant, origine, reference)
    values (v_user, -v_prix, 'achat', p_objet_id);
  end if;

  insert into inventaire (user_id, objet_id) values (v_user, p_objet_id);

  -- On équipe ce qu'on vient d'acheter : personne n'achète pour ne pas porter.
  insert into equipement (user_id, emplacement, objet_id)
  values (v_user, v_emplacement, p_objet_id)
  on conflict (user_id, emplacement) do update
    set objet_id = excluded.objet_id, maj_le = now();

  return json_build_object(
    'objet',       p_objet_id,
    'nom',         v_nom,
    'emplacement', v_emplacement,
    'prix',        v_prix,
    'solde',       v_solde - v_prix
  );
end;
$$;

-- ====================================================== Équiper
create or replace function clutch_equiper(p_objet_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_emplacement text;
  v_niveau      integer;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select emplacement, niveau into v_emplacement, v_niveau
  from objets_catalogue where id = p_objet_id and actif;

  if not found then
    raise exception 'objet introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  -- Le niveau 1 est le défaut de chaque emplacement : équipable sans posséder.
  if v_niveau > 1
     and not exists (select 1 from inventaire where user_id = v_user and objet_id = p_objet_id)
  then
    raise exception 'objet non possede : %', p_objet_id using errcode = 'P0001';
  end if;

  insert into equipement (user_id, emplacement, objet_id)
  values (v_user, v_emplacement, p_objet_id)
  on conflict (user_id, emplacement) do update
    set objet_id = excluded.objet_id, maj_le = now();

  return json_build_object('objet', p_objet_id, 'emplacement', v_emplacement);
end;
$$;

-- ============================================ Clôture d'une saison
-- Le robinet serveur. Barème de double-monnaie-frags-volts.md §3 :
--   participation (≥10 paris réglés)  600 V   ← le plancher
--   top 50 % au retour sur mise      +300 V
--   top 25 %                         +300 V
--   1er de sa ligue                  +300 V
-- Le plancher fait 600 sur 1500 maximum hors call, soit 40 % : au-dessus
-- du tiers que la décision impose de tenir pour que l'écart ne se creuse pas.
--
-- Indexé sur le RETOUR SUR MISE et jamais sur le solde : le volume ne
-- rapporte donc rien, conformément à la doctrine des badges.
--
-- La formule de retour sur mise est recopiée à l'identique de
-- clutch_classement (08_palier2.sql). C'est délibéré : le joueur doit
-- toucher des Volts sur exactement le chiffre qu'il lit à l'écran. Si l'une
-- des deux change un jour, l'autre doit changer dans le même commit.
create or replace function clutch_cloturer_saison(p_saison_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credites integer := 0;
  v_joueurs  integer := 0;
  r          record;
begin
  if not clutch_est_admin() then
    raise exception 'reserve aux administrateurs' using errcode = '42501';
  end if;

  if not exists (select 1 from saisons where id = p_saison_id) then
    raise exception 'saison inconnue : %', p_saison_id using errcode = 'P0002';
  end if;

  for r in
    with regles as (
      select
        p.user_id,
        count(*) filter (where p.statut in ('gagne', 'perdu')) as nb,
        case
          when coalesce(sum(p.mise) filter (where p.statut in ('gagne', 'perdu')), 0) = 0 then 0
          else round(
            (coalesce(sum(p.gain), 0) - sum(p.mise) filter (where p.statut in ('gagne', 'perdu')))::numeric
            / sum(p.mise) filter (where p.statut in ('gagne', 'perdu')) * 100, 1)
        end                                                    as roi
      from paris p
      where p.saison_id = p_saison_id
      group by p.user_id
      having count(*) filter (where p.statut in ('gagne', 'perdu')) >= 10
    ),
    classe as (
      select user_id, roi, percent_rank() over (order by roi desc) as rang
      from regles
    )
    select
      c.user_id,
      600
      + case when c.rang <= 0.50 then 300 else 0 end
      + case when c.rang <= 0.25 then 300 else 0 end
      + case when c.rang  = 0    then 300 else 0 end as montant
    from classe c
  loop
    v_joueurs := v_joueurs + 1;
    if clutch_crediter_volts(r.user_id, r.montant, 'saison', p_saison_id) then
      v_credites := v_credites + 1;
    end if;
  end loop;

  return json_build_object(
    'saison',   p_saison_id,
    'eligibles', v_joueurs,
    'credites',  v_credites,
    'deja_fait', v_joueurs - v_credites
  );
end;
$$;

-- ================================================================ Vues
-- La chambre d'un joueur : l'objet équipé, ou le niveau 1 par défaut.
create or replace view v_chambre as
select
  p.id as user_id,
  o.emplacement,
  coalesce(e.objet_id, d.id) as objet_id,
  coalesce(oe.nom, d.nom)    as nom,
  coalesce(oe.niveau, 1)     as niveau
from profils p
cross join (select distinct emplacement from objets_catalogue where actif) o
left join equipement e  on e.user_id = p.id and e.emplacement = o.emplacement
left join objets_catalogue oe on oe.id = e.objet_id
join objets_catalogue d on d.emplacement = o.emplacement and d.niveau = 1;

create or replace view v_mon_solde_volts as
select clutch_solde_volts() as solde;

-- Tout l'écran boutique en un seul aller-retour : le solde, le catalogue, et
-- ce que le joueur possède ou porte déjà. C'est un écran qu'on rafraîchit
-- après chaque achat — trois requêtes séparées s'y verraient.
create or replace function clutch_boutique()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'solde', clutch_solde_volts(),
    'objets', coalesce((
      select json_agg(
        json_build_object(
          'id',          o.id,
          'emplacement', o.emplacement,
          'niveau',      o.niveau,
          'nom',         o.nom,
          'prix',        o.prix,
          'possede',     (i.user_id is not null),
          'equipe',      (e.objet_id is not null)
        )
        order by o.emplacement, o.niveau
      )
      from objets_catalogue o
      left join inventaire i on i.objet_id = o.id  and i.user_id = auth.uid()
      left join equipement e on e.objet_id = o.id  and e.user_id = auth.uid()
      where o.actif
    ), '[]'::json)
  );
$$;

-- =============================================================== RLS
alter table objets_catalogue enable row level security;
alter table volts_mouvements enable row level security;
alter table inventaire       enable row level security;
alter table equipement       enable row level security;

-- Catalogue : lisible par tous les connectés, écrit par les admins seuls.
drop policy if exists catalogue_lecture on objets_catalogue;
create policy catalogue_lecture on objets_catalogue
  for select using (auth.uid() is not null);

drop policy if exists catalogue_admin on objets_catalogue;
create policy catalogue_admin on objets_catalogue
  for all using (clutch_est_admin()) with check (clutch_est_admin());

-- Grand livre : chacun lit le sien, personne n'écrit directement.
-- Les seules écritures passent par clutch_acheter_objet et
-- clutch_crediter_volts, qui sont SECURITY DEFINER et contournent la RLS.
drop policy if exists volts_lecture on volts_mouvements;
create policy volts_lecture on volts_mouvements
  for select using (user_id = auth.uid());

-- Inventaire : privé. Ce qu'on possède ne regarde que soi.
drop policy if exists inventaire_lecture on inventaire;
create policy inventaire_lecture on inventaire
  for select using (user_id = auth.uid());

-- Équipement : le sien, plus celui des joueurs d'une même ligue — c'est ce
-- qui rend « visiter la chambre d'un autre » possible sans exposer
-- l'inventaire ni le solde.
drop policy if exists equipement_lecture on equipement;
create policy equipement_lecture on equipement
  for select using (user_id = auth.uid() or clutch_est_colistier(user_id));

-- ================================================= Catalogue de départ
-- Les 25 produits tarifés de double-monnaie-frags-volts.md §4.
-- Les 13 restants (4 emplacements) ne sont pas encore tarifés : ils
-- s'ajoutent ici, plafond entre 900 et 1800 selon la visibilité.
insert into objets_catalogue (id, emplacement, niveau, nom, prix) values
  ('boitier-1',        'boitier',        1, 'Tour Beige',        0),
  ('boitier-2',        'boitier',        2, 'Core S',          550),
  ('boitier-3',        'boitier',        3, 'Volt Core',      1400),
  ('boitier-4',        'boitier',        4, 'Reactor X',      2400),
  ('gpu-1',            'gpu',            1, 'Sortie Intégrée',   0),
  ('gpu-2',            'gpu',            2, 'Clutch G6',       480),
  ('gpu-3',            'gpu',            3, 'Volt RTX',       1100),
  ('gpu-4',            'gpu',            4, 'Titan Prism',    2100),
  ('refroid-1',        'refroidissement',1, 'Air Core',          0),
  ('refroid-2',        'refroidissement',2, 'Tour Alu',        320),
  ('refroid-3',        'refroidissement',3, 'Aqua Loop',       850),
  ('refroid-4',        'refroidissement',4, 'Reactor Loop',   1500),
  ('vent-1',           'ventilation',    1, 'Souffle Unique',    0),
  ('vent-2',           'ventilation',    2, 'Trio Blanc',      380),
  ('vent-3',           'ventilation',    3, 'Trio ARGB',       900),
  ('vent-4',           'ventilation',    4, 'Flux Total',     1650),
  ('memoire-1',        'memoire',        1, 'Core 16',           0),
  ('memoire-2',        'memoire',        2, 'Pulse 32',        600),
  ('memoire-3',        'memoire',        3, 'Prism 64',       1200),
  ('cablage-1',        'cablage',        1, 'Plat de Nouilles',  0),
  ('cablage-2',        'cablage',        2, 'Rangé Derrière',  260),
  ('cablage-3',        'cablage',        3, 'Gainé Club',      700),
  ('piece-1',          'piece',          1, 'Le Coin',           0),
  ('piece-2',          'piece',          2, 'Studio',         1900),
  ('piece-3',          'piece',          3, 'Loft Clutch',    4200)
on conflict (id) do update
  set emplacement = excluded.emplacement,
      niveau      = excluded.niveau,
      nom         = excluded.nom,
      prix        = excluded.prix;

-- =====================================================================
-- Legacy source: supabase/12_volts_paris.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 12_volts_paris.sql
--  Les Volts au fil des paris : un Frag de bénéfice = un Volt.
--
--  À exécuter après 11_volts.sql. Rejouable sans effet de bord.
--
--  Décision du 16 août. Elle rend facultatif le robinet à badges du §3 de
--  double-monnaie-frags-volts.md : plus besoin de réécrire les 21 règles
--  de badges en SQL pour ouvrir la boutique.
--
-- ---------------------------------------------------------------------
--  POURQUOI UN SOMMET, ET PAS UN CRÉDIT PAR PARI
--
--  Créditer le bénéfice de chaque pari gagné semble équivalent, et ne
--  l'est pas : les pertes ne se soustraient jamais. Un joueur qui pose
--  mille paris à pile ou face en gagne cinq cents, encaisse cinq cents
--  bénéfices — et repart à l'équilibre en Frags avec une fortune en
--  Volts. C'est exactement le « 500 paris médiocres » que les badges
--  refusent depuis le premier jour, réintroduit par la petite porte.
--
--  On crédite donc sur le SOMMET du bénéfice net de la saison : le
--  cumul de (gains - mises) sur les paris réglés, et on paie chaque fois
--  qu'il dépasse son propre record.
--
--    · volume-neutre : un joueur à l'équilibre ne dépasse jamais
--      durablement son record, il ne gagne quasiment rien ;
--    · continu : chaque nouveau record paie immédiatement, il n'y a pas
--      à attendre la fin de saison pour voir bouger le compteur ;
--    · jamais punitif : le sommet ne redescend pas. Une mauvaise série
--      ne retire aucun Volt déjà gagné, elle repousse seulement le
--      prochain versement.
--
--  L'assiette reste le bénéfice net, jamais le gain brut : miser 100 et
--  récupérer 200, c'est 100 Volts, pas 200.
-- =====================================================================

-- 'pari' rejoint les origines autorisées du grand livre.
alter table volts_mouvements drop constraint if exists volts_mouvements_origine_check;
alter table volts_mouvements add constraint volts_mouvements_origine_check
  check (origine in ('badge', 'saison', 'call', 'achat', 'ajustement', 'pari'));

-- ------------------------------------------------------------ Le sommet
-- Un record par joueur et par saison. Il ne descend jamais.
create table if not exists volts_sommet (
  saison_id text not null references saisons (id) on delete cascade,
  user_id   uuid not null references profils (id) on delete cascade,
  sommet    integer not null default 0 check (sommet >= 0),
  maj_le    timestamptz not null default now(),
  primary key (saison_id, user_id)
);

-- --------------------------------------------------------- Le déclencheur
-- Posé sur `paris` plutôt que dans regler_match : le règlement passe par
-- plusieurs chemins (match réglé, événement réglé, rattrapage des paris
-- automatiques) et un déclencheur les couvre tous sans les modifier. Un
-- chemin ajouté demain sera couvert sans qu'on y pense.
--
-- Il ne lit que `paris` : le bonus de connexion quotidien gonfle le solde
-- de Frags sans être un mérite de pronostic, et n'a donc rien à faire
-- dans une assiette à Volts. Passer par le solde l'aurait inclus.
--
-- Choix assumé : AUCUNE reprise. Si un match réglé est ensuite annulé, le
-- sommet ne redescend pas et les Volts restent acquis. Les reprendre
-- pourrait rendre un solde négatif si le joueur a déjà dépensé — et il
-- s'agit de cosmétique, pas de bankroll. Les Frags, eux, sont bien
-- remboursés par annuler_match : c'est là que ça compte.
create or replace function clutch_volts_sur_pari()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net    integer;
  v_sommet integer;
begin
  if new.statut not in ('gagne', 'perdu') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = new.statut then
    return new;
  end if;

  -- Deux règlements simultanés du même joueur se sérialisent, sinon les
  -- deux liraient le même sommet et paieraient chacun l'écart complet.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.saison_id, 0));

  select coalesce(sum(gain), 0) - coalesce(sum(mise), 0)
    into v_net
  from paris
  where user_id = new.user_id
    and saison_id = new.saison_id
    and statut in ('gagne', 'perdu');

  insert into volts_sommet (saison_id, user_id, sommet)
  values (new.saison_id, new.user_id, 0)
  on conflict (saison_id, user_id) do nothing;

  select sommet into v_sommet
  from volts_sommet
  where saison_id = new.saison_id and user_id = new.user_id
  for update;

  if v_net > v_sommet then
    insert into volts_mouvements (user_id, montant, origine, reference)
    values (new.user_id, v_net - v_sommet, 'pari', new.id::text)
    on conflict (user_id, origine, reference) do nothing;

    update volts_sommet
       set sommet = v_net, maj_le = now()
     where saison_id = new.saison_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists volts_sur_pari on paris;
create trigger volts_sur_pari
  after insert or update of statut on paris
  for each row execute function clutch_volts_sur_pari();

alter table volts_sommet enable row level security;
drop policy if exists sommet_lecture on volts_sommet;
create policy sommet_lecture on volts_sommet
  for select using (user_id = auth.uid());

-- ------------------------------------------------- Le plancher demeure
-- clutch_cloturer_saison de 11_volts.sql n'est pas touchée. Elle reste
-- pour deux raisons :
--
--   · le plancher de participation (600 V dès 10 paris réglés) est ce
--     qui empêche un joueur qui finit dans le rouge de ne rien toucher
--     du tout — sans lui, une mauvaise saison ne rapporte rien, ce qui
--     est dur dans un jeu entre potes ;
--   · les paliers de rang et le call sont des rendez-vous. Le flux au
--     fil des paris donne la sensation, la clôture donne l'événement.

-- ------------------------------------------------------------ Contrôle
create or replace function clutch_volts_detail(p_user uuid default auth.uid())
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'solde', clutch_solde_volts(p_user),
    'par_origine', coalesce((
      select json_object_agg(origine, total)
      from (
        select origine, sum(montant)::integer as total
        from volts_mouvements
        where user_id = p_user
        group by origine
      ) x
    ), '{}'::json)
  );
$$;

-- =====================================================================
-- Legacy source: supabase/13_amis.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 13_amis.sql
--  Le graphe d'amis : recherche, demande, réponse, et ce qu'on en voit.
--
--  À exécuter après 12_volts_paris.sql. Rejouable sans effet de bord.
--
--  Deux principes qui gouvernent tout le fichier :
--
--  1. L'amitié est MUTUELLE et RÉCIPROQUE. Une seule ligne par paire,
--     quel que soit le sens de la demande. La paire est stockée sous
--     forme canonique (a < b) : deux personnes qui se demandent en ami
--     en même temps tombent sur la même ligne au lieu d'en créer deux,
--     et l'unicité de la clé primaire règle la course sans verrou.
--
--  2. On ne montre JAMAIS un pronostic non résolu d'un ami. La
--     répartition anonyme de la communauté existe déjà pour donner le
--     sentiment du groupe ; montrer nommément ce qu'un bon joueur a
--     joué sur un match à venir transformerait le jeu en recopiage. Les
--     fonctions de lecture ci-dessous filtrent sur statut réglé, et
--     c'est une règle de produit, pas une optimisation.
-- =====================================================================

create table if not exists amities (
  a          uuid not null references profils (id) on delete cascade,
  b          uuid not null references profils (id) on delete cascade,
  demandeur  uuid not null references profils (id) on delete cascade,
  statut     text not null default 'en_attente' check (statut in ('en_attente', 'acceptee')),
  cree_le    timestamptz not null default now(),
  repondu_le timestamptz,
  primary key (a, b),
  check (a < b),
  check (demandeur = a or demandeur = b)
);
create index if not exists amities_b_idx on amities (b);

alter table amities enable row level security;

-- Chacun ne voit que les liens qui le concernent. Aucune lecture croisée,
-- donc aucun risque de récursion : la policy ne consulte aucune table.
drop policy if exists amities_lecture on amities;
create policy amities_lecture on amities
  for select using (a = auth.uid() or b = auth.uid());

-- ------------------------------------------------------------- Utilitaire
-- Les uuid triés, pour retrouver la ligne canonique d'une paire.
create or replace function clutch_paire(p1 uuid, p2 uuid)
returns uuid[]
language sql
immutable
as $$ select case when p1 < p2 then array[p1, p2] else array[p2, p1] end $$;

-- ============================================================ Recherche
-- Rendre `profils` interrogeable par pseudo sans l'ouvrir : la fonction
-- est SECURITY DEFINER mais ne renvoie que l'identifiant, le pseudo et
-- l'état de la relation. Ni e-mail, ni solde, ni statut admin.
--
-- Deux caractères minimum et dix résultats : on cherche quelqu'un qu'on
-- connaît, on ne parcourt pas l'annuaire.
create or replace function clutch_chercher_joueurs(p_terme text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(x order by x.pseudo), '[]'::json)
  from (
    select
      p.id,
      p.pseudo,
      case
        when am.statut = 'acceptee'                          then 'ami'
        when am.statut = 'en_attente' and am.demandeur = auth.uid() then 'demande_envoyee'
        when am.statut = 'en_attente'                        then 'demande_recue'
        else 'aucune'
      end as relation
    from profils p
    left join amities am
      on am.a = (clutch_paire(auth.uid(), p.id))[1]
     and am.b = (clutch_paire(auth.uid(), p.id))[2]
    where auth.uid() is not null
      and length(btrim(p_terme)) >= 2
      and p.id <> auth.uid()
      and p.pseudo ilike '%' || btrim(p_terme) || '%'
    limit 10
  ) x;
$$;

-- ============================================================== Demander
-- Trois garde-fous : pas soi-même, pas deux fois, et un plafond de
-- demandes en attente. Le plafond est le seul rempart contre le
-- démarchage en masse — à 25, il ne gêne aucun usage normal.
--
-- Cas particulier utile : si l'autre t'a déjà demandé, demander à ton
-- tour vaut acceptation. C'est ce que tout le monde attend.
create or replace function clutch_demander_ami(p_user uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moi     uuid := auth.uid();
  v_paire   uuid[];
  v_ligne   amities%rowtype;
  v_attente integer;
begin
  if v_moi is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_user = v_moi then
    raise exception 'on ne se demande pas soi-meme en ami' using errcode = 'P0001';
  end if;
  if not exists (select 1 from profils where id = p_user) then
    raise exception 'joueur introuvable' using errcode = 'P0002';
  end if;

  v_paire := clutch_paire(v_moi, p_user);
  select * into v_ligne from amities where a = v_paire[1] and b = v_paire[2];

  if found then
    if v_ligne.statut = 'acceptee' then
      raise exception 'vous etes deja amis' using errcode = 'P0001';
    end if;
    if v_ligne.demandeur = v_moi then
      raise exception 'demande deja envoyee' using errcode = 'P0001';
    end if;
    -- Il t'avait demandé : ta demande vaut acceptation.
    update amities set statut = 'acceptee', repondu_le = now()
     where a = v_paire[1] and b = v_paire[2];
    return json_build_object('statut', 'acceptee');
  end if;

  select count(*) into v_attente
  from amities
  where demandeur = v_moi and statut = 'en_attente';
  if v_attente >= 25 then
    raise exception 'trop de demandes en attente (%). Attends des reponses avant d''en envoyer d''autres.', v_attente
      using errcode = 'P0001';
  end if;

  insert into amities (a, b, demandeur) values (v_paire[1], v_paire[2], v_moi);
  return json_build_object('statut', 'en_attente');
end;
$$;

-- =============================================================== Répondre
-- Refuser supprime la ligne plutôt que de la marquer refusée. Conséquence
-- assumée : la demande peut être renvoyée. C'est le plafond de 25 qui tient
-- lieu de rempart. Un blocage dur se posera ici le jour où quelqu'un en
-- aura besoin — pas avant, et pas à l'échelle d'un jeu entre potes.
create or replace function clutch_repondre_demande(p_user uuid, p_accepter boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moi   uuid := auth.uid();
  v_paire uuid[];
  v_ligne amities%rowtype;
begin
  if v_moi is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  v_paire := clutch_paire(v_moi, p_user);
  select * into v_ligne from amities
   where a = v_paire[1] and b = v_paire[2] and statut = 'en_attente';

  if not found then
    raise exception 'aucune demande en attente de ce joueur' using errcode = 'P0002';
  end if;
  if v_ligne.demandeur = v_moi then
    raise exception 'on ne repond pas a sa propre demande' using errcode = 'P0001';
  end if;

  if p_accepter then
    update amities set statut = 'acceptee', repondu_le = now()
     where a = v_paire[1] and b = v_paire[2];
    return json_build_object('statut', 'acceptee');
  end if;

  delete from amities where a = v_paire[1] and b = v_paire[2];
  return json_build_object('statut', 'refusee');
end;
$$;

-- Retirer un ami, ou annuler une demande qu'on a envoyée : même geste.
create or replace function clutch_retirer_ami(p_user uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paire uuid[] := clutch_paire(auth.uid(), p_user);
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  delete from amities where a = v_paire[1] and b = v_paire[2];
  if not found then
    raise exception 'aucun lien avec ce joueur' using errcode = 'P0002';
  end if;
  return json_build_object('statut', 'retire');
end;
$$;

-- ============================================================ Mes amis
-- Amis, demandes reçues et demandes envoyées en un seul aller-retour.
-- La forme des amis vient de clutch_classement, la même fonction que les
-- classements de ligue : un ami affiche exactement les chiffres qu'il voit
-- lui-même, il ne peut pas y avoir deux vérités.
create or replace function clutch_mes_amis(p_saison_id text default null)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_moi    uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from v_saisons where statut = 'en_cours' order by debut desc limit 1));
  v_amis   uuid[];
begin
  if v_moi is null then
    return json_build_object('amis', '[]'::json, 'recues', '[]'::json, 'envoyees', '[]'::json);
  end if;

  select coalesce(array_agg(case when a = v_moi then b else a end), '{}')
    into v_amis
  from amities
  where statut = 'acceptee' and (a = v_moi or b = v_moi);

  return json_build_object(
    'saison', v_saison,
    'amis', coalesce((
      select json_agg(to_jsonb(c) order by c.solde desc)
      from clutch_classement(v_amis, v_saison) c
    ), '[]'::json),
    'recues', coalesce((
      select json_agg(json_build_object('id', p.id, 'pseudo', p.pseudo, 'depuis', am.cree_le) order by am.cree_le)
      from amities am
      join profils p on p.id = am.demandeur
      where am.statut = 'en_attente'
        and am.demandeur <> v_moi
        and (am.a = v_moi or am.b = v_moi)
    ), '[]'::json),
    'envoyees', coalesce((
      select json_agg(json_build_object(
               'id', p.id, 'pseudo', p.pseudo, 'depuis', am.cree_le) order by am.cree_le)
      from amities am
      join profils p on p.id = case when am.a = v_moi then am.b else am.a end
      where am.statut = 'en_attente'
        and am.demandeur = v_moi
        and (am.a = v_moi or am.b = v_moi)
    ), '[]'::json)
  );
end;
$$;

-- ======================================================= Leur activité
-- Uniquement des paris RÉGLÉS. Voir le §2 de l'en-tête : montrer un
-- pronostic en cours ferait du meilleur joueur de la ligue une antisèche.
create or replace function clutch_activite_amis(p_saison_id text default null, p_limite integer default 20)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_moi    uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from v_saisons where statut = 'en_cours' order by debut desc limit 1));
  v_amis   uuid[];
begin
  if v_moi is null then return '[]'::json; end if;

  select coalesce(array_agg(case when a = v_moi then b else a end), '{}')
    into v_amis
  from amities
  where statut = 'acceptee' and (a = v_moi or b = v_moi);

  return coalesce((
    select json_agg(x order by x.quand desc)
    from (
      select
        pr.pseudo,
        pa.libelle_choix as choix,
        pa.mise,
        pa.cote,
        pa.statut,
        pa.gain - pa.mise as net,
        m.equipe_a, m.equipe_b, m.jeu,
        pa.cree_le       as quand
      from paris pa
      join profils pr on pr.id = pa.user_id
      join v_matchs m on m.id = pa.match_id
      where pa.user_id = any (v_amis)
        and pa.saison_id = v_saison
        and pa.statut in ('gagne', 'perdu')
      order by pa.cree_le desc
      limit greatest(1, least(p_limite, 50))
    ) x
  ), '[]'::json);
end;
$$;

-- =====================================================================
-- Legacy source: supabase/14_correctif_volts.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 14_correctif_volts.sql
--  Une fuite dans clutch_solde_volts, et sa fermeture.
--
--  À exécuter après 13_amis.sql. Rejouable.
-- =====================================================================
--
--  LE DÉFAUT
--
--  clutch_solde_volts(p_user uuid default auth.uid()) est SECURITY
--  DEFINER : elle s'exécute avec les droits du propriétaire et contourne
--  donc la RLS. Le paramètre étant libre, n'importe quel joueur pouvait
--  appeler clutch_solde_volts('<uuid d'un autre>') et lire son solde.
--
--  C'est exactement ce que la policy de volts_mouvements interdit — elle
--  limite la lecture à user_id = auth.uid(). La fonction disait le
--  contraire de la policy, et c'est la fonction qui gagnait.
--
--  La leçon, à appliquer à toute fonction SECURITY DEFINER future :
--  un paramètre d'identité dans une fonction qui contourne la RLS est
--  une fuite tant qu'il n'est pas contrôlé. Soit on le retire, soit on
--  vérifie qui appelle.
--
--  Ici on vérifie : chacun lit le sien, un administrateur lit celui de
--  tout le monde — il en a besoin pour le support.
-- =====================================================================

create or replace function clutch_solde_volts(p_user uuid default auth.uid())
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_user <> auth.uid() and not clutch_est_admin() then
    raise exception 'on ne lit que son propre solde' using errcode = '42501';
  end if;

  return (
    select coalesce(sum(montant), 0)::integer
    from volts_mouvements
    where user_id = p_user
  );
end;
$$;

-- Même raisonnement pour le détail par robinet.
create or replace function clutch_volts_detail(p_user uuid default auth.uid())
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_user <> auth.uid() and not clutch_est_admin() then
    raise exception 'on ne lit que son propre detail' using errcode = '42501';
  end if;

  return json_build_object(
    'solde', clutch_solde_volts(p_user),
    'par_origine', coalesce((
      select json_object_agg(origine, total)
      from (
        select origine, sum(montant)::integer as total
        from volts_mouvements
        where user_id = p_user
        group by origine
      ) x
    ), '{}'::json)
  );
end;
$$;


-- =====================================================================
-- Legacy source: supabase/14_badges_v2.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 14_badges_v2.sql
-- Catalogue fondateur : métriques publiques + stockage des badges secrets.
--
-- À exécuter APRÈS 13_amis.sql. Rejouable sans effet de bord.
--
-- IMPORTANT : les CONDITIONS des badges secrets ne vivent volontairement PAS
-- dans le dépôt public. Cette migration ne fait que stocker les secrets déjà
-- accordés et les exposer au joueur concerné. Les règles privées seront
-- installées directement côté Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Badges secrets déjà décrochés
-- ---------------------------------------------------------------------
create table if not exists badges_secrets_obtenus (
  user_id   uuid not null references profils(id) on delete cascade,
  cle       text not null check (cle in (
    'sixieme_sens', 'main_froide', 'david', 'contre_le_monde', 'clutch_secret'
  )),
  obtenu_le timestamptz not null default now(),
  primary key (user_id, cle)
);

alter table badges_secrets_obtenus enable row level security;

drop policy if exists badges_secrets_lecture on badges_secrets_obtenus;
create policy badges_secrets_lecture on badges_secrets_obtenus
  for select using (user_id = auth.uid());

-- Aucun INSERT/UPDATE/DELETE n'est accordé au navigateur.
-- Cette fonction est réservée au rôle service_role et sert de point d'entrée
-- au moteur privé de secrets. Elle est idempotente.
create or replace function clutch_accorder_badge_secret(p_user uuid, p_cle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_cle not in ('sixieme_sens', 'main_froide', 'david', 'contre_le_monde', 'clutch_secret') then
    raise exception 'badge secret inconnu';
  end if;

  insert into badges_secrets_obtenus(user_id, cle)
  values (p_user, p_cle)
  on conflict (user_id, cle) do nothing;
end;
$$;

revoke all on function clutch_accorder_badge_secret(uuid, text) from public;
revoke all on function clutch_accorder_badge_secret(uuid, text) from anon;
revoke all on function clutch_accorder_badge_secret(uuid, text) from authenticated;
grant execute on function clutch_accorder_badge_secret(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 2. Récapitulatif V2
-- ---------------------------------------------------------------------
-- Les 25 conditions publiques sont calculées dans le navigateur. Ici on ne
-- renvoie que les métriques nécessaires, sur toute la carrière.
create or replace function recap_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mes_paris as (
    select p.*, m.jeu, m.debut as match_debut
    from paris p
    join matchs m on m.id = p.match_id
    where p.user_id = auth.uid()
      and p.statut in ('gagne', 'perdu')
  ),

  chrono as (
    select mp.*,
           row_number() over (order by cree_le, id)
             - row_number() over (partition by statut order by cree_le, id) as groupe
    from mes_paris mp
  ),

  series_gagnees as (
    select groupe,
           count(*) as longueur
    from chrono
    where statut = 'gagne'
    group by groupe
  ),

  par_jeu as (
    select jeu,
           count(*) as n,
           count(*) filter (where statut = 'gagne') as gagnes,
           round(
             count(*) filter (where statut = 'gagne')::numeric
             / nullif(count(*), 0) * 100,
             1
           ) as precision
    from mes_paris
    where jeu is not null
    group by jeu
  ),

  outsiders_par_semaine as (
    select date_trunc('week', cree_le) as semaine,
           count(*) filter (where statut = 'gagne' and cote >= 2.20) as n
    from mes_paris
    group by date_trunc('week', cree_le)
  ),

  semaine_resultats as (
    select date_trunc('week', cree_le) as semaine,
           count(*) as n,
           bool_and(statut = 'gagne') as parfaite
    from mes_paris
    group by date_trunc('week', cree_le)
  ),

  semaines_actives as (
    select distinct date_trunc('week', cree_le)::date as semaine
    from mes_paris
  ),

  semaines_indexees as (
    select semaine,
           semaine - ((row_number() over (order by semaine))::integer * 7) as ancre
    from semaines_actives
  ),

  series_semaines as (
    select ancre, count(*) as longueur
    from semaines_indexees
    group by ancre
  ),

  mes_ligues as (
    select l.id, l.createur_id,
           (select count(*) from membres_ligue x where x.ligue_id = l.id) as nb_membres
    from ligues l
    join membres_ligue ml on ml.ligue_id = l.id and ml.user_id = auth.uid()
  ),

  classements_ligue as (
    select
      ml.ligue_id,
      pt.saison_id,
      ml.user_id,
      pt.solde,
      count(*) over (partition by ml.ligue_id, pt.saison_id) as nb_membres,
      rank() over (
        partition by ml.ligue_id, pt.saison_id
        order by pt.solde desc, ml.user_id
      ) as rang
    from membres_ligue ml
    join participations pt on pt.user_id = ml.user_id
    join saisons s on s.id = pt.saison_id
    where s.fin < now()
  ),

  mon_classement as (
    select * from classements_ligue where user_id = auth.uid()
  ),

  mon_equipe as (
    select equipe_favorite_id
    from profils
    where id = auth.uid()
  )

  select jsonb_build_object(
    -- Contrat historique conservé.
    'paris',             (select count(*) from mes_paris),
    'gagnes',            (select count(*) from mes_paris where statut = 'gagne'),
    'mises',             (select coalesce(sum(mise), 0) from mes_paris),
    'gains',             (select coalesce(sum(gain), 0) from mes_paris),
    'net',               (select coalesce(sum(gain), 0) - coalesce(sum(mise), 0) from mes_paris),
    'roi',               (select case when coalesce(sum(mise), 0) = 0 then 0
                                      else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
                          from mes_paris),
    'precision_pct',     (select case when count(*) = 0 then 0
                                      else round(count(*) filter (where statut = 'gagne')::numeric / count(*) * 100, 1) end
                          from mes_paris),
    'cote_max_gagnee',   (select coalesce(max(cote), 0) from mes_paris where statut = 'gagne'),
    'mise_max_gagnee',   (select coalesce(max(mise), 0) from mes_paris where statut = 'gagne'),
    'scores_exacts',     (select count(*) from mes_paris where statut = 'gagne' and marche = 'score_exact'),
    'total_maps_gagnes', (select count(*) from mes_paris where statut = 'gagne' and marche = 'total_maps'),
    'plus_longue_serie', (select coalesce(max(longueur), 0) from series_gagnees),
    'jours_actifs',      (select count(distinct cree_le::date) from mes_paris),
    'saisons_jouees',    (select count(distinct saison_id) from mes_paris),
    'jeux_joues',        (select count(*) from par_jeu),
    'paris_jeu_max',     (select coalesce(max(n), 0) from par_jeu),
    'calls_gagnes',      (select count(*) from calls where user_id = auth.uid() and statut = 'gagne'),
    'serie_prime_max',   (select coalesce(max(serie), 0) from primes where user_id = auth.uid()),
    'ligues_creees',     (select count(*) from mes_ligues where createur_id = auth.uid()),
    'ligues_rejointes',  (select count(*) from mes_ligues),
    'plus_grande_ligue', (select coalesce(max(nb_membres), 0) from mes_ligues),
    'a_equipe_favorite', (select equipe_favorite_id is not null from mon_equipe),

    -- Nouvelles métriques publiques du catalogue fondateur.
    'outsiders_220_meme_semaine_max',
      (select coalesce(max(n), 0) from outsiders_par_semaine),
    'outsiders_250_gagnes',
      (select count(*) from mes_paris where statut = 'gagne' and cote >= 2.50),
    'meilleure_precision_jeu_30',
      (select coalesce(max(precision), 0) from par_jeu where n >= 30),
    'plus_longue_serie_semaines',
      (select coalesce(max(longueur), 0) from series_semaines),
    'semaine_parfaite',
      exists(select 1 from semaine_resultats where n >= 5 and parfaite),
    'top10_ligue_20',
      exists(select 1 from mon_classement where nb_membres >= 20 and rang <= 10),
    'podium_ligue_10',
      exists(select 1 from mon_classement where nb_membres >= 10 and rang <= 3),
    'roi_ligue_10',
      exists(select 1 from mon_classement where nb_membres >= 10 and rang = 1),
    'a_devance_ami',
      exists(
        select 1
        from mon_classement moi
        join classements_ligue ami
          on ami.ligue_id = moi.ligue_id
         and ami.saison_id = moi.saison_id
         and ami.user_id <> moi.user_id
        join amities am
          on am.statut = 'acceptee'
         and ((am.a = auth.uid() and am.b = ami.user_id)
           or (am.b = auth.uid() and am.a = ami.user_id))
        where moi.solde > ami.solde
      ),
    'communaute_membres',
      (select case
         when equipe_favorite_id is null then 0
         else (select count(*) from profils p2 where p2.equipe_favorite_id = mon_equipe.equipe_favorite_id)
       end
       from mon_equipe),

    -- Le navigateur ne reçoit que les clés déjà décrochées. Les conditions
    -- secrètes ne traversent jamais cette frontière.
    'secrets_obtenus',
      coalesce(
        (select jsonb_agg(cle order by obtenu_le)
         from badges_secrets_obtenus
         where user_id = auth.uid()),
        '[]'::jsonb
      )
  );
$$;

revoke all on function recap_badges() from public;
grant execute on function recap_badges() to authenticated;

-- =====================================================================
-- Legacy source: supabase/15_profil_personnalisation.sql
-- =====================================================================
-- =====================================================================
-- Clutch — Profil V2 : personnalisation de l'étendard et de la vitrine
-- À exécuter après 14_badges_v2.sql. Idempotent.
-- =====================================================================

alter table profils add column if not exists badge_vedette text;
alter table profils add column if not exists badges_exposes text[] not null default '{}'::text[];
alter table profils add column if not exists arsenal_exposes text[] not null default '{}'::text[];

alter table profils drop constraint if exists profils_badges_exposes_taille;
alter table profils add constraint profils_badges_exposes_taille
  check (cardinality(badges_exposes) <= 3);

alter table profils drop constraint if exists profils_arsenal_exposes_taille;
alter table profils add constraint profils_arsenal_exposes_taille
  check (cardinality(arsenal_exposes) <= 5);

-- Les règles RLS existantes autorisent déjà le propriétaire à mettre à jour
-- sa propre ligne de profil. L'interface filtre toujours les clés sélectionnées
-- contre les badges réellement obtenus : inscrire une clé arbitraire dans la
-- colonne ne permet donc pas d'afficher une distinction non gagnée.

-- =====================================================================
-- Legacy source: supabase/16_communautes_v2.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 16. Communautés V2 persistantes
--
-- Fiole I est la forme de départ. Les mutations permanentes sont :
--   10 -> Flacon II (+200 Frags)
--   50 -> Bombonne III (+300)
--  100 -> Calice IV (+500)
--  500 -> Alambic V (+750)
-- 1000 -> Cornue VI (+1000)
-- 5000 -> Océan VII (+1500)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Métadonnées de présence / changement de faction
-- ---------------------------------------------------------------------
alter table public.profils
  add column if not exists equipe_favorite_changee_le timestamptz,
  add column if not exists equipe_favorite_rejointe_le timestamptz;

-- Pas de faux mouvement pour les membres préexistants : leur ancienneté est
-- simplement bornée par la date de création de leur profil.
update public.profils
set equipe_favorite_rejointe_le = coalesce(equipe_favorite_rejointe_le, cree_le)
where equipe_favorite_id is not null;

-- ---------------------------------------------------------------------
-- État permanent + journal + mutations
-- ---------------------------------------------------------------------
create table if not exists public.communaute_etat (
  equipe_id       text primary key references public.equipes(id) on delete cascade,
  niveau_atteint  smallint not null default 1 check (niveau_atteint between 1 and 7),
  atteint_le      timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);

create table if not exists public.communaute_mouvements (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profils(id) on delete set null,
  equipe_id  text not null references public.equipes(id) on delete cascade,
  delta      smallint not null check (delta in (-1, 1)),
  cree_le    timestamptz not null default now()
);
create index if not exists communaute_mouvements_equipe_date_idx
  on public.communaute_mouvements(equipe_id, cree_le desc);

create table if not exists public.communaute_mutations (
  id                  bigint generated always as identity primary key,
  equipe_id           text not null references public.equipes(id) on delete cascade,
  niveau              smallint not null check (niveau between 2 and 7),
  nom                  text not null,
  seuil                integer not null check (seuil > 0),
  recompense_frags     integer not null check (recompense_frags >= 0),
  membres_au_moment    integer not null check (membres_au_moment >= 0),
  cree_le              timestamptz not null default now(),
  unique (equipe_id, niveau)
);
create index if not exists communaute_mutations_equipe_date_idx
  on public.communaute_mutations(equipe_id, cree_le desc);

-- Tables internes : le navigateur ne lit jamais les mouvements individuels.
alter table public.communaute_etat enable row level security;
alter table public.communaute_mouvements enable row level security;
alter table public.communaute_mutations enable row level security;
revoke all on table public.communaute_etat from anon, authenticated;
revoke all on table public.communaute_mouvements from anon, authenticated;
revoke all on table public.communaute_mutations from anon, authenticated;

-- Bootstrap sans récompense rétroactive.
insert into public.communaute_etat (equipe_id, niveau_atteint, atteint_le, maj_le)
select
  e.id,
  case
    when count(p.id) >= 5000 then 7
    when count(p.id) >= 1000 then 6
    when count(p.id) >= 500  then 5
    when count(p.id) >= 100  then 4
    when count(p.id) >= 50   then 3
    when count(p.id) >= 10   then 2
    else 1
  end::smallint,
  now(),
  now()
from public.equipes e
left join public.profils p on p.equipe_favorite_id = e.id
group by e.id
on conflict (equipe_id) do nothing;

-- ---------------------------------------------------------------------
-- Cooldown serveur : 7 jours après chaque choix/changement
-- ---------------------------------------------------------------------
create or replace function public.clutch_verifier_changement_faction()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Les timestamps sont pilotés par la base, jamais par un PATCH client.
  if new.equipe_favorite_id is not distinct from old.equipe_favorite_id then
    new.equipe_favorite_changee_le := old.equipe_favorite_changee_le;
    new.equipe_favorite_rejointe_le := old.equipe_favorite_rejointe_le;
    return new;
  end if;

  if old.equipe_favorite_id is not null
     and old.equipe_favorite_changee_le is not null
     and old.equipe_favorite_changee_le > now() - interval '7 days' then
    raise exception 'Changement de faction bloqué jusqu’au %',
      to_char(old.equipe_favorite_changee_le + interval '7 days', 'DD/MM/YYYY HH24:MI');
  end if;

  new.equipe_favorite_changee_le := now();
  new.equipe_favorite_rejointe_le := case
    when new.equipe_favorite_id is null then null
    else now()
  end;
  return new;
end;
$$;

revoke all on function public.clutch_verifier_changement_faction() from public, anon, authenticated;

drop trigger if exists profils_changement_faction_avant on public.profils;
create trigger profils_changement_faction_avant
before update of equipe_favorite_id, equipe_favorite_changee_le, equipe_favorite_rejointe_le
on public.profils
for each row execute function public.clutch_verifier_changement_faction();

-- ---------------------------------------------------------------------
-- Évaluation atomique d'une mutation + récompense collective
-- ---------------------------------------------------------------------
create or replace function public.clutch_evaluer_mutation(p_equipe_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_membres integer;
  v_cible smallint;
  v_courant smallint;
  v_niveau integer;
  v_nom text;
  v_seuil integer;
  v_recompense integer;
  v_saison public.saisons%rowtype;
begin
  select count(*)::integer into v_membres
  from public.profils
  where equipe_favorite_id = p_equipe_id;

  v_cible := case
    when v_membres >= 5000 then 7
    when v_membres >= 1000 then 6
    when v_membres >= 500  then 5
    when v_membres >= 100  then 4
    when v_membres >= 50   then 3
    when v_membres >= 10   then 2
    else 1
  end;

  insert into public.communaute_etat(equipe_id, niveau_atteint)
  values (p_equipe_id, 1)
  on conflict (equipe_id) do nothing;

  select niveau_atteint into v_courant
  from public.communaute_etat
  where equipe_id = p_equipe_id
  for update;

  if v_cible <= v_courant then
    update public.communaute_etat set maj_le = now() where equipe_id = p_equipe_id;
    return;
  end if;

  select * into v_saison
  from public.saisons
  where now() between debut and fin
  order by debut desc
  limit 1;

  for v_niveau in (v_courant + 1)..v_cible loop
    select
      case v_niveau
        when 2 then 'Flacon'
        when 3 then 'Bombonne'
        when 4 then 'Calice'
        when 5 then 'Alambic'
        when 6 then 'Cornue'
        when 7 then 'Océan'
      end,
      case v_niveau
        when 2 then 10
        when 3 then 50
        when 4 then 100
        when 5 then 500
        when 6 then 1000
        when 7 then 5000
      end,
      case v_niveau
        when 2 then 200
        when 3 then 300
        when 4 then 500
        when 5 then 750
        when 6 then 1000
        when 7 then 1500
      end
    into v_nom, v_seuil, v_recompense;

    insert into public.communaute_mutations(
      equipe_id, niveau, nom, seuil, recompense_frags, membres_au_moment
    ) values (
      p_equipe_id, v_niveau, v_nom, v_seuil, v_recompense, v_membres
    )
    on conflict (equipe_id, niveau) do nothing;

    if v_saison.id is not null and v_recompense > 0 then
      insert into public.participations(
        saison_id, user_id, solde, derniere_prime, rejoint_le, serie_prime
      )
      select
        v_saison.id,
        p.id,
        v_saison.solde_initial + v_recompense,
        null,
        now(),
        0
      from public.profils p
      where p.equipe_favorite_id = p_equipe_id
      on conflict (saison_id, user_id)
      do update set solde = public.participations.solde + v_recompense;
    end if;

    update public.communaute_etat
    set niveau_atteint = v_niveau::smallint,
        atteint_le = now(),
        maj_le = now()
    where equipe_id = p_equipe_id;
  end loop;
end;
$$;

-- Critique : cette fonction crédite des Frags. Elle n'est jamais exposée.
revoke all on function public.clutch_evaluer_mutation(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Journaliser entrées/sorties, puis évaluer la nouvelle faction
-- ---------------------------------------------------------------------
create or replace function public.clutch_journaliser_faction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.equipe_favorite_id is distinct from new.equipe_favorite_id then
    if old.equipe_favorite_id is not null then
      insert into public.communaute_mouvements(user_id, equipe_id, delta)
      values (new.id, old.equipe_favorite_id, -1);
    end if;

    if new.equipe_favorite_id is not null then
      insert into public.communaute_mouvements(user_id, equipe_id, delta)
      values (new.id, new.equipe_favorite_id, 1);
      perform public.clutch_evaluer_mutation(new.equipe_favorite_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' and old.equipe_favorite_id is not null then
    insert into public.communaute_mouvements(user_id, equipe_id, delta)
    values (null, old.equipe_favorite_id, -1);
    return old;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.clutch_journaliser_faction() from public, anon, authenticated;

drop trigger if exists profils_journal_faction_apres on public.profils;
create trigger profils_journal_faction_apres
after update of equipe_favorite_id or delete
on public.profils
for each row execute function public.clutch_journaliser_faction();

-- ---------------------------------------------------------------------
-- Classement V3 : vitesse réelle + progression + histoire
-- ---------------------------------------------------------------------
drop function if exists public.classement_communautes();

create or replace function public.classement_communautes()
returns table (
  equipe_id                    text,
  nom                          text,
  tag                          text,
  jeu                          text,
  elo                          integer,
  logo                         text,
  membres                      bigint,
  moi                          boolean,
  niveau_atteint               smallint,
  croissance_24h               integer,
  croissance_7j                integer,
  membre_depuis                timestamptz,
  pronos_depuis                bigint,
  mutations_vecues             bigint,
  dernier_evenement_id         bigint,
  dernier_evenement_niveau     smallint,
  dernier_evenement_nom        text,
  dernier_evenement_le         timestamptz,
  dernier_evenement_recompense integer,
  historique                   jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with effectifs as (
    select e.id as equipe_id, count(p.id)::bigint as membres
    from public.equipes e
    left join public.profils p on p.equipe_favorite_id = e.id
    group by e.id
  ),
  croissance as (
    select
      m.equipe_id,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '24 hours'), 0)::integer as croissance_24h,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '7 days'), 0)::integer as croissance_7j
    from public.communaute_mouvements m
    group by m.equipe_id
  ),
  mon_profil as (
    select
      p.id,
      p.equipe_favorite_id,
      coalesce(p.equipe_favorite_rejointe_le, p.cree_le) as membre_depuis
    from public.profils p
    where p.id = auth.uid()
  )
  select
    e.id,
    e.nom,
    e.tag,
    e.jeu,
    e.elo,
    e.logo,
    ef.membres,
    (mp.id is not null and mp.equipe_favorite_id = e.id) as moi,
    coalesce(ce.niveau_atteint, 1)::smallint,
    coalesce(c.croissance_24h, 0),
    coalesce(c.croissance_7j, 0),
    case when mp.equipe_favorite_id = e.id then mp.membre_depuis end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.paris pa
      where pa.user_id = mp.id
        and pa.cree_le >= mp.membre_depuis
    ) else 0 end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.communaute_mutations cmv
      where cmv.equipe_id = e.id
        and cmv.cree_le >= mp.membre_depuis
    ) else 0 end,
    last_mut.id,
    last_mut.niveau,
    last_mut.nom,
    last_mut.cree_le,
    last_mut.recompense_frags,
    coalesce(hist.items, '[]'::jsonb)
  from public.equipes e
  join effectifs ef on ef.equipe_id = e.id
  left join public.communaute_etat ce on ce.equipe_id = e.id
  left join croissance c on c.equipe_id = e.id
  left join mon_profil mp on mp.equipe_favorite_id = e.id
  left join lateral (
    select cm.id, cm.niveau, cm.nom, cm.cree_le, cm.recompense_frags
    from public.communaute_mutations cm
    where cm.equipe_id = e.id
    order by cm.cree_le desc
    limit 1
  ) last_mut on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'niveau', x.niveau,
        'nom', x.nom,
        'seuil', x.seuil,
        'recompense_frags', x.recompense_frags,
        'membres', x.membres_au_moment,
        'cree_le', x.cree_le
      ) order by x.cree_le desc
    ) as items
    from (
      select *
      from public.communaute_mutations cm2
      where cm2.equipe_id = e.id
      order by cm2.cree_le desc
      limit 5
    ) x
  ) hist on true
  where ef.membres > 0
  order by
    coalesce(c.croissance_24h, 0) desc,
    coalesce(c.croissance_7j, 0) desc,
    ef.membres desc,
    e.nom asc;
$$;

revoke all on function public.classement_communautes() from public;
grant execute on function public.classement_communautes() to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/17_communautes_v3_indexes.sql
-- =====================================================================
-- Clutch — Communautés V3 / index de hot-path
-- Ces index couvrent les deux colonnes sollicitées à chaque changement de faction :
-- comptage des membres d'une équipe et maintenance de l'historique utilisateur.

create index if not exists profils_equipe_favorite_idx
  on public.profils(equipe_favorite_id)
  where equipe_favorite_id is not null;

create index if not exists communaute_mouvements_user_idx
  on public.communaute_mouvements(user_id)
  where user_id is not null;


-- =====================================================================
-- Legacy source: supabase/18_economie_v2.sql
-- =====================================================================
-- =====================================================================
--  Clutch — 18_economie_v2.sql
--  Frags V2 : rating compétitif non dépensable + pronostics classés.
--
--  Migration ADDITIVE : l'ancien moteur de mise (`paris`, `participations.solde`)
--  reste en place pour compatibilité pendant la transition UI.
--
--  Nouvelle doctrine :
--    · Frags = score compétitif saisonnier, jamais une monnaie.
--    · Volts = seule monnaie dépensable dans la Boutique.
--    · Un pronostic classé n'engage aucun solde.
--    · Seul un pronostic classé réglé peut modifier les Frags.
--    · Correct   : +K × (1 - p)
--    · Incorrect : -K × p
--    · p est bornée à 15–85 % pour le scoring.
--    · K = 60 sur les 5 premiers pronostics classés, puis K = 40.
--    · Tous les joueurs utilisent la même probabilité figée pour un match.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;

create or replace function public.clutch_frags_initial()
returns integer language sql immutable as $$ select 1000 $$;
create or replace function public.clutch_frags_k()
returns integer language sql immutable as $$ select 40 $$;
create or replace function public.clutch_frags_k_placement()
returns integer language sql immutable as $$ select 60 $$;
create or replace function public.clutch_frags_nb_placements()
returns integer language sql immutable as $$ select 5 $$;
create or replace function public.clutch_frags_proba_min()
returns numeric language sql immutable as $$ select 0.15::numeric $$;
create or replace function public.clutch_frags_proba_max()
returns numeric language sql immutable as $$ select 0.85::numeric $$;

create or replace function public.clutch_borner_proba_frags(p_proba numeric)
returns numeric language plpgsql immutable as $$
begin
  if p_proba is null or p_proba <= 0 or p_proba >= 1 then
    raise exception 'probabilite invalide : %', p_proba using errcode = '22023';
  end if;
  return least(clutch_frags_proba_max(), greatest(clutch_frags_proba_min(), p_proba));
end;
$$;

create or replace function public.clutch_delta_frags(p_proba numeric,p_gagnant boolean,p_k integer default 40)
returns integer language plpgsql immutable as $$
declare v_p numeric := clutch_borner_proba_frags(p_proba);
begin
  if p_k <= 0 then raise exception 'coefficient K invalide : %', p_k using errcode = '22023'; end if;
  if p_gagnant then return round(p_k * (1 - v_p))::integer; end if;
  return -round(p_k * v_p)::integer;
end;
$$;

create or replace function public.clutch_soft_reset_frags(p_frags integer)
returns integer language sql immutable as $$ select round(1000 + 0.4 * (p_frags - 1000))::integer $$;

create table if not exists public.matchs_scoring_frags (
  match_id text primary key references public.matchs(id) on delete cascade,
  proba_a numeric(8,7) not null check (proba_a > 0 and proba_a < 1),
  proba_b numeric(8,7) not null check (proba_b > 0 and proba_b < 1),
  source text not null default 'elo_v1',
  figee_le timestamptz not null default now(),
  check (abs((proba_a + proba_b) - 1) < 0.000001)
);
alter table public.matchs_scoring_frags enable row level security;

create or replace function private.clutch_creer_snapshot_frags()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v_elo_a integer; v_elo_b integer; v_p_map numeric; v_p_a numeric;
begin
  select elo into v_elo_a from equipes where id = new.equipe_a_id;
  select elo into v_elo_b from equipes where id = new.equipe_b_id;
  if v_elo_a is null or v_elo_b is null then raise exception 'Elo introuvable pour le match %', new.id; end if;
  v_p_map := clutch_proba_map(v_elo_a,v_elo_b);
  select coalesce(sum(proba),0) into v_p_a from clutch_distribution(v_p_map,new.format) where score_a > score_b;
  insert into matchs_scoring_frags(match_id,proba_a,proba_b,source)
  values(new.id,v_p_a,1-v_p_a,'elo_v1') on conflict(match_id) do nothing;
  return new;
end;
$$;
revoke all on function private.clutch_creer_snapshot_frags() from public;
drop trigger if exists frags_snapshot_nouveau_match on public.matchs;
create trigger frags_snapshot_nouveau_match after insert on public.matchs for each row execute function private.clutch_creer_snapshot_frags();

insert into public.matchs_scoring_frags(match_id,proba_a,proba_b,source)
select m.id,x.p_a,1-x.p_a,'elo_v1'
from public.matchs m
join public.equipes ea on ea.id=m.equipe_a_id
join public.equipes eb on eb.id=m.equipe_b_id
cross join lateral (
  select coalesce(sum(d.proba),0)::numeric as p_a
  from clutch_distribution(clutch_proba_map(ea.elo,eb.elo),m.format) d
  where d.score_a>d.score_b
) x
where not exists(select 1 from public.matchs_scoring_frags ms where ms.match_id=m.id)
on conflict(match_id) do nothing;

create table if not exists public.classements_frags (
  saison_id text not null references public.saisons(id) on delete cascade,
  user_id uuid not null references public.profils(id) on delete cascade,
  frags integer not null default 1000,
  pic_frags integer not null default 1000,
  pronostics_regles integer not null default 0 check(pronostics_regles>=0),
  pronostics_gagnes integer not null default 0 check(pronostics_gagnes>=0),
  rejoint_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  primary key(saison_id,user_id),
  check(pronostics_gagnes<=pronostics_regles)
);
create index if not exists classements_frags_saison_idx on public.classements_frags(saison_id,frags desc,pronostics_gagnes desc);
alter table public.classements_frags enable row level security;
drop policy if exists classements_frags_mon_score on public.classements_frags;
create policy classements_frags_mon_score on public.classements_frags for select to authenticated using((select auth.uid())=user_id);

create table if not exists public.pronostics_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  match_id text not null references public.matchs(id) on delete cascade,
  saison_id text not null references public.saisons(id) on delete cascade,
  choix text not null check(choix in('a','b')),
  proba_figee numeric(8,7) not null check(proba_figee>0 and proba_figee<1),
  proba_scoring numeric(8,7) not null check(proba_scoring between 0.15 and 0.85),
  k_frags integer not null check(k_frags in(40,60)),
  statut text not null default 'en_cours' check(statut in('en_cours','gagne','perdu','annule')),
  delta_frags integer,
  cree_le timestamptz not null default now(),
  regle_le timestamptz,
  unique(user_id,match_id)
);
create index if not exists pronostics_classes_user_saison_idx on public.pronostics_classes(user_id,saison_id,cree_le desc);
create index if not exists pronostics_classes_match_idx on public.pronostics_classes(match_id) where statut='en_cours';
alter table public.pronostics_classes enable row level security;
drop policy if exists pronostics_classes_mes_pronos on public.pronostics_classes;
create policy pronostics_classes_mes_pronos on public.pronostics_classes for select to authenticated using((select auth.uid())=user_id);

create or replace function public.clutch_projection_match_frags(p_match_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer:=0; v_k integer; v_pa numeric; v_pb numeric;
begin
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  if v_user is not null then select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule'; end if;
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_pa:=clutch_borner_proba_frags(v_snap.proba_a); v_pb:=clutch_borner_proba_frags(v_snap.proba_b);
  return jsonb_build_object('match_id',p_match_id,'figee_le',v_snap.figee_le,'source',v_snap.source,'k',v_k,'placements_restants',greatest(0,clutch_frags_nb_placements()-v_nb),'choix',jsonb_build_array(
    jsonb_build_object('cle','a','proba',v_snap.proba_a,'proba_scoring',v_pa,'gain',clutch_delta_frags(v_pa,true,v_k),'perte',clutch_delta_frags(v_pa,false,v_k)),
    jsonb_build_object('cle','b','proba',v_snap.proba_b,'proba_scoring',v_pb,'gain',clutch_delta_frags(v_pb,true,v_k),'perte',clutch_delta_frags(v_pb,false,v_k))));
end;
$$;

create or replace function public.placer_pronostic_classe(p_match_id text,p_choix text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer; v_k integer; v_proba numeric; v_scoring numeric; v_prono pronostics_classes%rowtype;
begin
  if v_user is null then raise exception 'Connecte-toi pour pronostiquer.' using errcode='28000'; end if;
  if p_choix not in('a','b') then raise exception 'Choix classe invalide.' using errcode='22023'; end if;
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id for update;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  if v_match.statut<>'a_venir' or v_match.debut<=now() then raise exception 'Les pronostics sont fermes sur ce match.'; end if;
  if(select statut from v_saisons where id=v_match.saison_id)<>'en_cours' then raise exception 'Cette saison n''est pas ouverte aux pronostics.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||'|'||v_match.saison_id,0));
  if exists(select 1 from pronostics_classes where user_id=v_user and match_id=p_match_id) then raise exception 'Tu as deja un pronostic classe sur ce match.' using errcode='23505'; end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule';
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_proba:=case when p_choix='a' then v_snap.proba_a else v_snap.proba_b end;
  v_scoring:=clutch_borner_proba_frags(v_proba);
  insert into classements_frags(saison_id,user_id,frags,pic_frags) values(v_match.saison_id,v_user,clutch_frags_initial(),clutch_frags_initial()) on conflict(saison_id,user_id) do nothing;
  insert into pronostics_classes(user_id,match_id,saison_id,choix,proba_figee,proba_scoring,k_frags)
  values(v_user,p_match_id,v_match.saison_id,p_choix,v_proba,v_scoring,v_k) returning * into v_prono;
  return to_jsonb(v_prono)||jsonb_build_object('gain_si_correct',clutch_delta_frags(v_scoring,true,v_k),'perte_si_faux',clutch_delta_frags(v_scoring,false,v_k),'placement',v_k=clutch_frags_k_placement());
end;
$$;

create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare r pronostics_classes%rowtype; v_gagnant boolean; v_delta integer; v_frags_avant integer; v_frags_apres integer;
begin
  if new.statut='annule' and old.statut is distinct from 'annule' then update pronostics_classes set statut='annule',delta_frags=0,regle_le=now() where match_id=new.id and statut='en_cours'; return new; end if;
  if new.statut<>'termine' or old.statut='termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a=new.score_b then raise exception 'Impossible de regler les Frags : score final invalide pour %',new.id; end if;
  for r in select * from pronostics_classes where match_id=new.id and statut='en_cours' order by cree_le,id for update loop
    v_gagnant:=case when r.choix='a' then new.score_a>new.score_b else new.score_b>new.score_a end;
    v_delta:=clutch_delta_frags(r.proba_scoring,v_gagnant,r.k_frags);
    insert into classements_frags(saison_id,user_id,frags,pic_frags) values(r.saison_id,r.user_id,clutch_frags_initial(),clutch_frags_initial()) on conflict(saison_id,user_id) do nothing;
    select frags into v_frags_avant from classements_frags where saison_id=r.saison_id and user_id=r.user_id for update;
    v_frags_apres:=v_frags_avant+v_delta;
    update classements_frags set frags=v_frags_apres,pic_frags=greatest(pic_frags,v_frags_apres),pronostics_regles=pronostics_regles+1,pronostics_gagnes=pronostics_gagnes+case when v_gagnant then 1 else 0 end,maj_le=now() where saison_id=r.saison_id and user_id=r.user_id;
    update pronostics_classes set statut=case when v_gagnant then 'gagne' else 'perdu' end,delta_frags=v_delta,regle_le=now() where id=r.id;
  end loop;
  return new;
end;
$$;
revoke all on function private.clutch_resoudre_pronostics_classes() from public;
drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics after update of statut,score_a,score_b on public.matchs for each row execute function private.clutch_resoudre_pronostics_classes();

create or replace function public.clutch_etat_frags(p_saison_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_c record; v_places integer;
begin
  if v_user is null then raise exception 'Authentification requise.' using errcode='28000'; end if;
  select * into v_c from classements_frags where saison_id=p_saison_id and user_id=v_user;
  select count(*)::integer into v_places from pronostics_classes where saison_id=p_saison_id and user_id=v_user and statut<>'annule';
  return jsonb_build_object('saison_id',p_saison_id,'frags',coalesce(v_c.frags,clutch_frags_initial()),'pic_frags',coalesce(v_c.pic_frags,clutch_frags_initial()),'pronostics_regles',coalesce(v_c.pronostics_regles,0),'pronostics_gagnes',coalesce(v_c.pronostics_gagnes,0),'placements_restants',greatest(0,clutch_frags_nb_placements()-v_places),'provisoire',v_places<clutch_frags_nb_placements());
end;
$$;

create or replace function public.clutch_mes_pronostics_classes(p_saison_id text)
returns table(id uuid,match_id text,saison_id text,choix text,proba_figee numeric,proba_scoring numeric,k_frags integer,statut text,delta_frags integer,cree_le timestamptz,regle_le timestamptz,equipe_a text,equipe_b text,score_a integer,score_b integer,debut timestamptz)
language sql stable security definer set search_path=public as $$
select p.id,p.match_id,p.saison_id,p.choix,p.proba_figee,p.proba_scoring,p.k_frags,p.statut,p.delta_frags,p.cree_le,p.regle_le,m.equipe_a,m.equipe_b,m.score_a,m.score_b,m.debut
from pronostics_classes p join v_matchs m on m.id=p.match_id where p.user_id=auth.uid() and p.saison_id=p_saison_id order by p.cree_le desc;
$$;

create or replace function public.clutch_classement_frags(p_saison_id text)
returns table(rang bigint,id uuid,pseudo text,frags integer,pic_frags integer,pronostics_regles integer,pronostics_gagnes integer,taux_reussite numeric,provisoire boolean,moi boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise.' using errcode='28000'; end if;
  return query select row_number() over(order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc),pr.id,pr.pseudo,c.frags,c.pic_frags,c.pronostics_regles,c.pronostics_gagnes,case when c.pronostics_regles=0 then 0::numeric else round(c.pronostics_gagnes::numeric/c.pronostics_regles*100,1) end,c.pronostics_regles<clutch_frags_nb_placements(),pr.id=auth.uid()
  from classements_frags c join profils pr on pr.id=c.user_id where c.saison_id=p_saison_id order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc;
end;
$$;

do $$ declare r text; begin
  foreach r in array array['public','anon'] loop
    if r='public' then
      revoke execute on function public.placer_pronostic_classe(text,text) from public;
      revoke execute on function public.clutch_etat_frags(text) from public;
      revoke execute on function public.clutch_mes_pronostics_classes(text) from public;
      revoke execute on function public.clutch_classement_frags(text) from public;
    elsif exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke execute on function public.placer_pronostic_classe(text,text) from %I',r);
      execute format('revoke execute on function public.clutch_etat_frags(text) from %I',r);
      execute format('revoke execute on function public.clutch_mes_pronostics_classes(text) from %I',r);
      execute format('revoke execute on function public.clutch_classement_frags(text) from %I',r);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    grant execute on function public.placer_pronostic_classe(text,text) to authenticated;
    grant execute on function public.clutch_etat_frags(text) to authenticated;
    grant execute on function public.clutch_mes_pronostics_classes(text) to authenticated;
    grant execute on function public.clutch_classement_frags(text) to authenticated;
    grant execute on function public.clutch_projection_match_frags(text) to authenticated;
  end if;
end $$;

-- =====================================================================
-- Legacy source: supabase/19_classements_frags_v2.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 19_classements_frags_v2.sql
-- Classements Global/Ligues + rivalité sur le rating Frags V2.
-- =====================================================================

-- Indexes signalés par l'advisor Supabase après 18_economie_v2.sql.
create index if not exists classements_frags_user_idx
  on public.classements_frags (user_id, saison_id);

create index if not exists pronostics_classes_saison_idx
  on public.pronostics_classes (saison_id, user_id);

-- Classement d'une ligue : même métrique que le Global, filtrée aux membres.
create or replace function public.clutch_classement_ligue_frags(
  p_ligue_id uuid,
  p_saison_id text
)
returns table (
  rang bigint,
  id uuid,
  pseudo text,
  frags integer,
  pic_frags integer,
  pronostics_regles integer,
  pronostics_gagnes integer,
  taux_reussite numeric,
  provisoire boolean,
  moi boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from membres_ligue
    where ligue_id = p_ligue_id and user_id = auth.uid()
  ) then
    raise exception 'Tu ne fais pas partie de cette ligue.' using errcode = '42501';
  end if;

  return query
  select
    row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
    pr.id,
    pr.pseudo,
    c.frags,
    c.pic_frags,
    c.pronostics_regles,
    c.pronostics_gagnes,
    case when c.pronostics_regles = 0 then 0::numeric
         else round(c.pronostics_gagnes::numeric / c.pronostics_regles * 100, 1) end,
    c.pronostics_regles < clutch_frags_nb_placements(),
    pr.id = auth.uid()
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  join classements_frags c
    on c.user_id = ml.user_id and c.saison_id = p_saison_id
  where ml.ligue_id = p_ligue_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc;
end;
$$;

-- Rivalité hebdomadaire : un voisin de classement, déterministe pour la semaine.
-- Aucun bénéfice net / mise legacy n'entre dans le calcul.
create or replace function public.clutch_rivalite_frags(
  p_saison_id text,
  p_ligue_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with source as (
    select
      row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
      pr.id,
      pr.pseudo,
      c.frags,
      c.pronostics_regles,
      c.pronostics_gagnes
    from classements_frags c
    join profils pr on pr.id = c.user_id
    where c.saison_id = p_saison_id
      and (
        p_ligue_id is null
        or exists (
          select 1 from membres_ligue ml
          where ml.ligue_id = p_ligue_id and ml.user_id = c.user_id
        )
      )
  ),
  moi as (
    select * from source where id = auth.uid()
  ),
  voisins as (
    select s.*,
      row_number() over (order by abs(s.rang - m.rang), (s.rang > m.rang)) as ordre
    from source s, moi m
    where s.id <> m.id
  ),
  candidats as (
    select * from voisins where ordre <= 3
  ),
  choisi as (
    select * from candidats
    where ordre = mod(
      abs(hashtext(auth.uid()::text || '|' || to_char(now(), 'IYYY-"S"IW'))::bigint),
      greatest((select count(*) from candidats), 1)
    ) + 1
  )
  select jsonb_build_object(
    'semaine', to_char(now(), 'IYYY-"S"IW'),
    'moi', jsonb_build_object(
      'id', m.id,
      'pseudo', m.pseudo,
      'rang', m.rang,
      'frags', m.frags,
      'pronostics_regles', m.pronostics_regles,
      'pronostics_gagnes', m.pronostics_gagnes
    ),
    'rival', jsonb_build_object(
      'id', r.id,
      'pseudo', r.pseudo,
      'rang', r.rang,
      'frags', r.frags,
      'pronostics_regles', r.pronostics_regles,
      'pronostics_gagnes', r.pronostics_gagnes
    ),
    'ecart', m.frags - r.frags
  )
  from moi m, choisi r;
$$;

-- Permissions : uniquement les joueurs connectés.
do $$
declare r text;
begin
  foreach r in array array['public', 'anon'] loop
    if r = 'public' then
      revoke execute on function public.clutch_classement_ligue_frags(uuid, text) from public;
      revoke execute on function public.clutch_rivalite_frags(text, uuid) from public;
    elsif exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function public.clutch_classement_ligue_frags(uuid, text) from %I', r);
      execute format('revoke execute on function public.clutch_rivalite_frags(text, uuid) from %I', r);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.clutch_classement_ligue_frags(uuid, text) to authenticated;
    grant execute on function public.clutch_rivalite_frags(text, uuid) to authenticated;
  end if;
end $$;

-- =====================================================================
-- Legacy source: supabase/20_compat_classements_v2.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 20_compat_classements_v2.sql
-- Garde les contrats historiques des écrans tout en servant le rating V2.
-- =====================================================================

create or replace function public.classement_global(p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.pseudo,
    c.frags as solde,
    c.pronostics_regles::bigint as paris,
    c.pronostics_gagnes::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    0::bigint as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from classements_frags c
  join profils pr on pr.id = c.user_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where c.saison_id = p_saison_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc
  limit 100;
$$;

create or replace function public.classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.pseudo,
    c.frags as solde,
    c.pronostics_regles::bigint as paris,
    c.pronostics_gagnes::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    0::bigint as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  join classements_frags c on c.user_id = ml.user_id and c.saison_id = p_saison_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where ml.ligue_id = p_ligue_id
  order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc;
$$;

-- Le JSON garde les clés historiques pour ne casser aucun composant,
-- mais le score et le bilan viennent exclusivement des pronostics classés V2.
create or replace function public.rivalite_semaine(
  p_saison_id text,
  p_ligue_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with classement as (
    select
      row_number() over (order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc) as rang,
      pr.id,
      pr.pseudo,
      c.frags as solde,
      c.pronostics_regles as paris,
      c.pronostics_gagnes as gagnes
    from classements_frags c
    join profils pr on pr.id = c.user_id
    where c.saison_id = p_saison_id
      and (
        p_ligue_id is null
        or exists (
          select 1 from membres_ligue ml
          where ml.ligue_id = p_ligue_id and ml.user_id = c.user_id
        )
      )
  ),
  moi as (select * from classement where id = auth.uid()),
  voisins as (
    select c.*, row_number() over (order by abs(c.rang - m.rang), (c.rang > m.rang)) as ordre
    from classement c, moi m
    where c.id <> m.id
  ),
  candidats as (select * from voisins where ordre <= 3),
  choisi as (
    select * from candidats
    where ordre = mod(
      abs(hashtext(auth.uid()::text || '|' || to_char(now(), 'IYYY-"S"IW'))::bigint),
      greatest((select count(*) from candidats), 1)
    ) + 1
  ),
  bilan_moi as (
    select
      count(*) filter (where p.statut in ('gagne','perdu'))::integer as paris,
      coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu')), 0)::integer as net
    from pronostics_classes p, moi m
    where p.user_id = m.id and p.saison_id = p_saison_id
      and p.regle_le >= date_trunc('week', now())
  ),
  bilan_rival as (
    select
      count(*) filter (where p.statut in ('gagne','perdu'))::integer as paris,
      coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu')), 0)::integer as net
    from pronostics_classes p, choisi r
    where p.user_id = r.id and p.saison_id = p_saison_id
      and p.regle_le >= date_trunc('week', now())
  )
  select jsonb_build_object(
    'semaine', to_char(now(), 'IYYY-"S"IW'),
    'depuis', date_trunc('week', now()),
    'moi', to_jsonb(m) || jsonb_build_object('bilan', jsonb_build_object('paris', bm.paris, 'net', bm.net)),
    'rival', to_jsonb(r) || jsonb_build_object('bilan', jsonb_build_object('paris', br.paris, 'net', br.net)),
    'ecart', m.solde - r.solde
  )
  from moi m, choisi r, bilan_moi bm, bilan_rival br;
$$;

-- =====================================================================
-- Legacy source: supabase/21_frags_security_hardening.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 21_frags_security_hardening.sql
-- Fige le search_path des helpers purs Economy V2.
-- =====================================================================

alter function public.clutch_frags_initial() set search_path = '';
alter function public.clutch_frags_k() set search_path = '';
alter function public.clutch_frags_k_placement() set search_path = '';
alter function public.clutch_frags_nb_placements() set search_path = '';
alter function public.clutch_frags_proba_min() set search_path = '';
alter function public.clutch_frags_proba_max() set search_path = '';
alter function public.clutch_borner_proba_frags(numeric) set search_path = '';
alter function public.clutch_delta_frags(numeric, boolean, integer) set search_path = '';
alter function public.clutch_soft_reset_frags(integer) set search_path = '';

-- =====================================================================
-- Legacy source: supabase/22_economie_v1_cleanup.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 22_economie_v1_cleanup.sql
--
-- Ferme définitivement les écritures Economy V1 sans supprimer l'historique.
-- Frags = rating non dépensable. Volts = seule monnaie de Boutique.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Les pronostics automatiques et les anciennes primes ne doivent plus
--    pouvoir créer de mouvement de bankroll.
-- ---------------------------------------------------------------------
update public.profils
   set pari_auto_mode = 'off'
 where coalesce(pari_auto_mode, 'off') <> 'off';

revoke execute on function public.placer_pari(text, text, text, integer) from public;
revoke execute on function public.reclamer_prime(text) from public;
revoke execute on function public.etat_prime(text) from public;
revoke execute on function public.placer_call(text, text, integer) from public;
revoke execute on function public.rattraper_paris_auto(text) from public;
revoke execute on function public.clutch_pari_auto(uuid, text) from public;

revoke execute on function public.placer_pari(text, text, text, integer) from anon, authenticated;
revoke execute on function public.reclamer_prime(text) from anon, authenticated;
revoke execute on function public.etat_prime(text) from anon, authenticated;
revoke execute on function public.placer_call(text, text, integer) from anon, authenticated;
revoke execute on function public.rattraper_paris_auto(text) from anon, authenticated;
revoke execute on function public.clutch_pari_auto(uuid, text) from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Call V2 : un choix de prestige, gratuit, sans cote ni paiement.
--    Les anciennes lignes sont conservées comme archives.
-- ---------------------------------------------------------------------
alter table public.calls drop constraint if exists calls_mise_check;
alter table public.calls add constraint calls_mise_check check (mise >= 0);

create or replace function public.placer_call_v2(p_event_id text, p_equipe_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_saison text;
  v_statut text;
  v_cote numeric;
begin
  if v_user is null then
    raise exception 'Connecte-toi pour poser ton call.' using errcode = '28000';
  end if;

  select id into v_saison
  from public.v_saisons
  where statut = 'en_cours'
  order by debut desc
  limit 1;

  if v_saison is null then raise exception 'Aucune saison ouverte.'; end if;
  if exists(select 1 from public.calls where user_id = v_user and saison_id = v_saison) then
    raise exception 'Tu as déjà posé ton call pour cette saison.' using errcode = '23505';
  end if;

  select statut into v_statut
  from public.v_evenements_saison
  where id = p_event_id and saison_id = v_saison;

  if v_statut is null then raise exception 'Événement inconnu pour cette saison.'; end if;
  if v_statut <> 'ouvert' then raise exception 'Cet événement a déjà commencé : le call est fermé.'; end if;

  -- La cote reste stockée uniquement comme snapshot historique du modèle.
  -- Elle n'est jamais affichée comme multiplicateur et ne produit aucun gain.
  select (value ->> 'cote')::numeric into v_cote
  from jsonb_array_elements(public.cotes_evenement(p_event_id, v_saison)) as value
  where value ->> 'id' = p_equipe_id;

  if v_cote is null then raise exception 'Cette équipe ne participe pas à l''événement.'; end if;

  insert into public.calls(user_id, saison_id, event_id, equipe_id, mise, cote, gain)
  values(v_user, v_saison, p_event_id, p_equipe_id, 0, v_cote, 0);

  return public.mon_call(v_saison);
exception
  when unique_violation then
    raise exception 'Tu as déjà posé ton call pour cette saison.' using errcode = '23505';
end;
$$;

revoke execute on function public.placer_call_v2(text, text) from public, anon;
grant execute on function public.placer_call_v2(text, text) to authenticated;

create or replace function public.mon_call(p_saison_id text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(c) || jsonb_build_object(
    'equipe', e.nom,
    'tag', e.tag,
    'jeu', e.jeu,
    'evenement', ev.nom,
    'mode', case when c.mise = 0 then 'v2' else 'archive_legacy' end
  )
  from public.calls c
  join public.equipes e on e.id = c.equipe_id
  join public.evenements ev on ev.id = c.event_id
  where c.user_id = auth.uid() and c.saison_id = p_saison_id;
$$;

-- Le règlement d'un événement ne crédite plus aucune bankroll.
create or replace function public.regler_evenement(p_event_id text, p_equipe_id text, p_saison_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_regles integer := 0;
begin
  if not exists(select 1 from public.profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  if exists(select 1 from public.resultats_evenement where event_id = p_event_id and saison_id = p_saison_id) then
    raise exception 'Événement déjà réglé.';
  end if;

  if not exists(
    select 1 from public.matchs
    where event_id = p_event_id and saison_id = p_saison_id
      and p_equipe_id in (equipe_a_id, equipe_b_id)
  ) then
    raise exception 'Cette équipe ne participe pas à l''événement.';
  end if;

  insert into public.resultats_evenement(saison_id, event_id, equipe_id)
  values(p_saison_id, p_event_id, p_equipe_id);

  update public.calls
     set statut = case when equipe_id = p_equipe_id then 'gagne' else 'perdu' end,
         gain = 0
   where event_id = p_event_id
     and saison_id = p_saison_id
     and statut = 'en_cours';

  get diagnostics v_regles = row_count;
  return jsonb_build_object('regles', v_regles);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Règlement d'un match : uniquement résultat + Frags V2 + Elo équipes.
--    Le trigger frags_regler_pronostics, installé par 18_economie_v2.sql,
--    règle les pronostics classés lors du passage du match à "termine".
-- ---------------------------------------------------------------------
create or replace function public.regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  attendu integer;
  v_regles integer := 0;
  pa numeric;
  reel_a numeric;
  delta numeric;
  ea record;
  eb record;
begin
  if not exists(select 1 from public.profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  select * into m from public.matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  select count(*)::integer into v_regles
  from public.pronostics_classes
  where match_id = p_match_id and statut = 'en_cours';

  select * into ea from public.equipes where id = m.equipe_a_id for update;
  select * into eb from public.equipes where id = m.equipe_b_id for update;

  update public.matchs
     set score_a = p_score_a,
         score_b = p_score_b,
         statut = 'termine',
         elo_a_fige = ea.elo,
         elo_b_fige = eb.elo
   where id = p_match_id;

  pa := public.clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := public.clutch_elo_k() * (reel_a - pa);

  update public.equipes set elo = round(ea.elo + delta) where id = ea.id;
  update public.equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'autos', 0,
    'elo_a', (select elo from public.equipes where id = ea.id),
    'elo_b', (select elo from public.equipes where id = eb.id)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Badges / carrière : les métriques de performance viennent désormais
--    exclusivement des pronostics classés Economy V2.
-- ---------------------------------------------------------------------
create or replace function public.recap_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with mes_pronos as (
  select p.*, m.jeu, m.debut as match_debut
  from public.pronostics_classes p
  join public.matchs m on m.id = p.match_id
  where p.user_id = auth.uid() and p.statut in ('gagne','perdu')
),
chrono as (
  select mp.*,
         row_number() over(order by cree_le,id)
         - row_number() over(partition by statut order by cree_le,id) as groupe
  from mes_pronos mp
),
series_gagnees as (
  select groupe,count(*) as longueur
  from chrono where statut='gagne' group by groupe
),
par_jeu as (
  select jeu,
         count(*) as n,
         count(*) filter(where statut='gagne') as gagnes,
         round(count(*) filter(where statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
  from mes_pronos where jeu is not null group by jeu
),
outsiders_par_semaine as (
  select date_trunc('week',cree_le) as semaine,
         count(*) filter(where statut='gagne' and proba_figee <= 0.4545455) as n
  from mes_pronos group by date_trunc('week',cree_le)
),
semaine_resultats as (
  select date_trunc('week',cree_le) as semaine,
         count(*) as n,
         bool_and(statut='gagne') as parfaite
  from mes_pronos group by date_trunc('week',cree_le)
),
semaines_actives as (
  select distinct date_trunc('week',cree_le)::date as semaine from mes_pronos
),
semaines_indexees as (
  select semaine,semaine-((row_number() over(order by semaine))::integer*7) as ancre
  from semaines_actives
),
series_semaines as (
  select ancre,count(*) as longueur from semaines_indexees group by ancre
),
jours_actifs as (
  select distinct cree_le::date as jour from mes_pronos
),
jours_indexes as (
  select jour,jour-(row_number() over(order by jour))::integer as ancre from jours_actifs
),
series_jours as (
  select ancre,count(*) as longueur from jours_indexes group by ancre
),
mes_ligues as (
  select l.id,l.createur_id,
         (select count(*) from public.membres_ligue x where x.ligue_id=l.id) as nb_membres
  from public.ligues l
  join public.membres_ligue ml on ml.ligue_id=l.id and ml.user_id=auth.uid()
),
classements_ligue as (
  select ml.ligue_id,c.saison_id,ml.user_id,c.frags,
         count(*) over(partition by ml.ligue_id,c.saison_id) as nb_membres,
         rank() over(
           partition by ml.ligue_id,c.saison_id
           order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,ml.user_id
         ) as rang
  from public.membres_ligue ml
  join public.classements_frags c on c.user_id=ml.user_id
  join public.saisons s on s.id=c.saison_id
  where s.fin < now()
),
mon_classement as (
  select * from classements_ligue where user_id=auth.uid()
),
mon_profil as (
  select equipe_favorite_id,est_fondateur from public.profils where id=auth.uid()
)
select jsonb_build_object(
  'paris',(select count(*) from mes_pronos),
  'gagnes',(select count(*) from mes_pronos where statut='gagne'),
  'precision_pct',(select case when count(*)=0 then 0 else round(count(*) filter(where statut='gagne')::numeric/count(*)*100,1) end from mes_pronos),
  'plus_longue_serie',(select coalesce(max(longueur),0) from series_gagnees),
  'jours_actifs',(select count(*) from jours_actifs),
  'serie_jours_actifs_max',(select coalesce(max(longueur),0) from series_jours),
  'saisons_jouees',(select count(distinct saison_id) from mes_pronos),
  'jeux_joues',(select count(*) from par_jeu),
  'paris_jeu_max',(select coalesce(max(n),0) from par_jeu),
  'proba_min_gagnee',(select coalesce(min(proba_figee),1) from mes_pronos where statut='gagne'),
  'outsiders_220_meme_semaine_max',(select coalesce(max(n),0) from outsiders_par_semaine),
  'outsiders_250_gagnes',(select count(*) from mes_pronos where statut='gagne' and proba_figee<=0.40),
  'meilleure_precision_jeu_30',(select coalesce(max(precision),0) from par_jeu where n>=30),
  'plus_longue_serie_semaines',(select coalesce(max(longueur),0) from series_semaines),
  'semaine_parfaite',exists(select 1 from semaine_resultats where n>=5 and parfaite),
  'calls_gagnes',(select count(*) from public.calls where user_id=auth.uid() and statut='gagne'),
  'ligues_creees',(select count(*) from mes_ligues where createur_id=auth.uid()),
  'ligues_rejointes',(select count(*) from mes_ligues),
  'plus_grande_ligue',(select coalesce(max(nb_membres),0) from mes_ligues),
  'a_equipe_favorite',(select equipe_favorite_id is not null from mon_profil),
  'est_fondateur',(select coalesce(est_fondateur,false) from mon_profil),
  'top10_ligue_20',exists(select 1 from mon_classement where nb_membres>=20 and rang<=10),
  'podium_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang<=3),
  'roi_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang=1),
  'a_devance_ami',exists(
    select 1 from mon_classement moi
    join classements_ligue ami on ami.ligue_id=moi.ligue_id and ami.saison_id=moi.saison_id and ami.user_id<>moi.user_id
    join public.amities am on am.statut='acceptee'
      and ((am.a=auth.uid() and am.b=ami.user_id) or (am.b=auth.uid() and am.a=ami.user_id))
    where moi.frags>ami.frags
  ),
  'communaute_membres',(
    select case when equipe_favorite_id is null then 0
      else (select count(*) from public.profils p2 where p2.equipe_favorite_id=mon_profil.equipe_favorite_id)
    end from mon_profil
  ),
  'rating_frags_max',(select coalesce(max(pic_frags),1000) from public.classements_frags where user_id=auth.uid()),
  -- Champs historiques conservés à zéro pour ne pas casser un ancien client
  -- pendant la transition. Ils ne pilotent plus aucun badge V2.
  'mises',0,'gains',0,'net',0,'roi',0,'mise_max_gagnee',0,'scores_exacts',0,'total_maps_gagnes',0,'serie_prime_max',0,
  'cote_max_gagnee',(select coalesce(max(1.0/nullif(proba_figee,0)),0) from mes_pronos where statut='gagne'),
  'secrets_obtenus',coalesce((select jsonb_agg(cle order by obtenu_le) from public.badges_secrets_obtenus where user_id=auth.uid()),'[]'::jsonb)
);
$$;

revoke execute on function public.recap_badges() from public, anon;
grant execute on function public.recap_badges() to authenticated;

-- =====================================================================
-- Legacy source: supabase/23_economie_v2_read_compat.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 23_economie_v2_read_compat.sql
-- Compatibilité de lecture pendant le nettoyage frontend.
-- Aucun de ces contrats ne recrée une bankroll.
-- =====================================================================

create or replace function public.etat_prime(p_saison_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$ select null::jsonb $$;
revoke execute on function public.etat_prime(text) from public, anon;
grant execute on function public.etat_prime(text) to authenticated;

create or replace view public.v_mes_paris
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.match_id,
  p.saison_id,
  'vainqueur'::text as marche,
  p.choix,
  'Vainqueur du match'::text as libelle_marche,
  case when p.choix='a' then ea.nom else eb.nom end::text as libelle_choix,
  0::integer as mise,
  1::numeric(6,2) as cote,
  p.statut,
  coalesce(p.delta_frags,0)::integer as gain,
  p.cree_le,
  ea.nom::text as equipe_a,
  eb.nom::text as equipe_b,
  m.jeu::text as jeu,
  m.statut::text as statut_match,
  m.score_a,
  m.score_b,
  m.debut,
  p.delta_frags
from public.pronostics_classes p
join public.matchs m on m.id=p.match_id
join public.equipes ea on ea.id=m.equipe_a_id
join public.equipes eb on eb.id=m.equipe_b_id
where p.user_id=(select auth.uid());

grant select on public.v_mes_paris to authenticated;

create or replace function public.mes_statistiques(p_saison_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'solde',coalesce((select frags from public.classements_frags where user_id=auth.uid() and saison_id=p_saison_id),1000),
  'paris',count(*) filter(where statut in('gagne','perdu')),
  'gagnes',count(*) filter(where statut='gagne'),
  'mises',0,
  'gains',coalesce(sum(delta_frags) filter(where statut in('gagne','perdu')),0),
  'roi',0
)
from public.pronostics_classes
where user_id=auth.uid() and saison_id=p_saison_id;
$$;
revoke execute on function public.mes_statistiques(text) from public, anon;
grant execute on function public.mes_statistiques(text) to authenticated;

-- =====================================================================
-- Legacy source: supabase/24_economy_v1_safe_shims.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 24_economy_v1_safe_shims.sql
--
-- Compatibilité temporaire pour les anciens bundles déjà servis : les anciens
-- RPC restent appelables mais ne peuvent plus écrire dans l'économie V1.
-- =====================================================================

create or replace function public.placer_pari(
  p_match_id text,
  p_marche text,
  p_choix text,
  p_mise integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_marche <> 'vainqueur' then
    raise exception 'Les marchés secondaires ne sont plus classés. Utilise le vainqueur du match.';
  end if;

  v_result := public.placer_pronostic_classe(p_match_id, p_choix);
  return v_result || jsonb_build_object(
    'mise',0,
    'cote',1,
    'gain',0,
    'legacy_shim',true
  );
end;
$$;

create or replace function public.placer_call(
  p_event_id text,
  p_equipe_id text,
  p_mise integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.placer_call_v2(p_event_id,p_equipe_id)
    || jsonb_build_object('mise',0,'gain',0,'legacy_shim',true);
end;
$$;

create or replace function public.reclamer_prime(p_saison_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'montant',0,
    'desactive',true,
    'message','Les bonus quotidiens en Frags ont été retirés.'
  )
$$;

create or replace function public.rattraper_paris_auto(p_saison_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$ select jsonb_build_object('poses',0,'desactive',true) $$;

create or replace function public.clutch_pari_auto(p_user uuid,p_match_id text)
returns integer
language sql
security definer
set search_path = public
as $$ select 0 $$;

revoke execute on function public.placer_pari(text,text,text,integer) from public,anon;
revoke execute on function public.placer_call(text,text,integer) from public,anon;
revoke execute on function public.reclamer_prime(text) from public,anon;
revoke execute on function public.rattraper_paris_auto(text) from public,anon;
revoke execute on function public.clutch_pari_auto(uuid,text) from public,anon,authenticated;

grant execute on function public.placer_pari(text,text,text,integer) to authenticated;
grant execute on function public.placer_call(text,text,integer) to authenticated;
grant execute on function public.reclamer_prime(text) to authenticated;
grant execute on function public.rattraper_paris_auto(text) to authenticated;

-- =====================================================================
-- Legacy source: supabase/25_frags_search_path_fix.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 25_frags_search_path_fix.sql
-- Les helpers hardenis avec search_path='' doivent qualifier leurs appels.
-- =====================================================================

create or replace function public.clutch_borner_proba_frags(p_proba numeric)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_proba is null or p_proba <= 0 or p_proba >= 1 then
    raise exception 'probabilite invalide : %',p_proba using errcode='22023';
  end if;
  return least(
    public.clutch_frags_proba_max(),
    greatest(public.clutch_frags_proba_min(),p_proba)
  );
end;
$$;

create or replace function public.clutch_delta_frags(
  p_proba numeric,
  p_gagnant boolean,
  p_k integer default 40
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_p numeric := public.clutch_borner_proba_frags(p_proba);
begin
  if p_k <= 0 then
    raise exception 'coefficient K invalide : %',p_k using errcode='22023';
  end if;
  if p_gagnant then return round(p_k*(1-v_p))::integer; end if;
  return -round(p_k*v_p)::integer;
end;
$$;


-- =====================================================================
-- Legacy source: supabase/26_admin_rpc_privileges.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 26_admin_rpc_privileges.sql
-- Les RPC de règlement vérifient déjà est_admin dans leur corps ; on retire
-- aussi EXECUTE aux rôles publics/anonymes pour réduire la surface exposée.
-- =====================================================================

revoke execute on function public.regler_match(text,integer,integer) from public,anon;
revoke execute on function public.regler_evenement(text,text,text) from public,anon;

grant execute on function public.regler_match(text,integer,integer) to authenticated;
grant execute on function public.regler_evenement(text,text,text) to authenticated;

-- =====================================================================
-- Legacy source: supabase/27_secret_badges_v2_and_remove_bet_volts.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 27_secret_badges_v2_and_remove_bet_volts.sql
-- Badges secrets sur pronostics_classes ; suppression définitive du vieux
-- mécanisme Volts <- profit de paris.
-- =====================================================================

-- Aucun Volt ne doit être créé à partir d'un résultat compétitif.
drop trigger if exists volts_sur_pari on public.paris;
drop function if exists public.clutch_volts_sur_pari();

-- L'ancien trigger de secrets sur `paris` n'est plus pertinent.
drop trigger if exists trg_clutch_badges_secrets on public.paris;

create or replace function public.clutch_evaluer_badges_secrets(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if p_user is null then return; end if;

  -- Le Sixième Sens : les 3 derniers pronostics réglés sont gagnants et
  -- chacun portait sur un choix non favori (probabilité modèle <= 50 %).
  select coalesce(bool_and(statut='gagne' and proba_figee<=0.50),false)
    into v_ok
  from (
    select statut,proba_figee
    from public.pronostics_classes
    where user_id=p_user and statut in('gagne','perdu')
    order by cree_le desc,id desc
    limit 3
  ) q
  having count(*)=3;
  if coalesce(v_ok,false) then
    perform public.clutch_accorder_badge_secret(p_user,'sixieme_sens');
  end if;

  -- Main Froide : 3 pronostics gagnants verrouillés dans les 10 dernières
  -- minutes avant le coup d'envoi.
  select count(*)>=3 into v_ok
  from public.pronostics_classes p
  join public.matchs m on m.id=p.match_id
  where p.user_id=p_user
    and p.statut='gagne'
    and p.cree_le>=m.debut-interval '10 minutes'
    and p.cree_le<m.debut;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'main_froide');
  end if;

  -- David : gagner un choix auquel le modèle donnait 25 % ou moins.
  select exists(
    select 1 from public.pronostics_classes
    where user_id=p_user and statut='gagne' and proba_figee<=0.25
  ) into v_ok;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'david');
  end if;

  -- Contre le monde : gagner en faisant partie d'une minorité <=10 % sur un
  -- match ayant au moins 10 pronostics classés.
  select exists(
    select 1
    from public.pronostics_classes p
    where p.user_id=p_user
      and p.statut='gagne'
      and (
        select count(*) filter(where x.choix=p.choix)::numeric/nullif(count(*),0)
        from public.pronostics_classes x
        where x.match_id=p.match_id and x.statut<>'annule'
      )<=0.10
      and (
        select count(*)
        from public.pronostics_classes x
        where x.match_id=p.match_id and x.statut<>'annule'
      )>=10
  ) into v_ok;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'contre_le_monde');
  end if;

  -- CLUTCH. : 5 derniers résultats gagnants, dont au moins un choix à 40 %
  -- ou moins. Le signal combine régularité et audace sans notion de mise.
  with derniers as (
    select statut,proba_figee
    from public.pronostics_classes
    where user_id=p_user and statut in('gagne','perdu')
    order by cree_le desc,id desc
    limit 5
  )
  select count(*)=5
         and bool_and(statut='gagne')
         and min(proba_figee)<=0.40
    into v_ok
  from derniers;
  if coalesce(v_ok,false) then
    perform public.clutch_accorder_badge_secret(p_user,'clutch_secret');
  end if;
end;
$$;

create or replace function public.clutch_badges_secret_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut in('gagne','perdu') and old.statut is distinct from new.statut then
    perform public.clutch_evaluer_badges_secrets(new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.clutch_evaluer_badges_secrets(uuid) from public,anon,authenticated;
revoke execute on function public.clutch_badges_secret_trigger() from public,anon,authenticated;

drop trigger if exists trg_clutch_badges_secrets_v2 on public.pronostics_classes;
create trigger trg_clutch_badges_secrets_v2
after update of statut on public.pronostics_classes
for each row
when (old.statut is distinct from new.statut)
execute function public.clutch_badges_secret_trigger();

-- =====================================================================
-- Legacy source: supabase/28_economy_table_least_privilege.sql
-- =====================================================================
-- =====================================================================
-- Clutch — 28_economy_table_least_privilege.sql
-- Les clients lisent les données autorisées par RLS, mais toute mutation
-- économique passe par les RPC SECURITY DEFINER contrôlés.
-- =====================================================================

revoke insert,update,delete,truncate,references,trigger
on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
from public,anon,authenticated;

-- Lecture conservée : les policies RLS restent l'autorité de visibilité.
grant select on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
to authenticated;

-- Aucun accès direct anonyme aux données économiques privées.
revoke select on table
  public.paris,
  public.participations,
  public.primes,
  public.calls,
  public.pronostics_classes,
  public.classements_frags
from anon;

-- =====================================================================
-- Legacy source: supabase/29_phase0_security_hardening.sql
-- =====================================================================
-- Clutch — Phase 0 security hardening
-- Audited against the live Supabase project before UI System V4 work.

-- Public views must obey the caller's RLS and table privileges.
alter view public.v_saisons set (security_invoker = true);
alter view public.v_matchs set (security_invoker = true);
alter view public.v_evenements_saison set (security_invoker = true);
alter view public.v_mes_ligues set (security_invoker = true);
alter view public.v_chambre set (security_invoker = true);
alter view public.v_mon_solde_volts set (security_invoker = true);

-- User-private views are not anonymous API surfaces.
revoke select on public.v_mes_ligues from anon;
revoke select on public.v_chambre from anon;
revoke select on public.v_mon_solde_volts from anon;

-- Server-authoritative scoring snapshot: never queried directly by browsers.
revoke all on table public.matchs_scoring_frags from public, anon, authenticated;

-- Admin mutations: authenticated admins only; authorization remains checked in-function.
revoke execute on function public.annuler_match(text, text) from public, anon;
revoke execute on function public.clutch_cloturer_saison(text) from public, anon;
revoke execute on function public.creer_equipe(text, text, text, integer) from public, anon;
revoke execute on function public.creer_evenement(text, text, text) from public, anon;
revoke execute on function public.creer_match(text, text, text, integer, timestamptz, text) from public, anon;
grant execute on function public.annuler_match(text, text) to authenticated;
grant execute on function public.clutch_cloturer_saison(text) to authenticated;
grant execute on function public.creer_equipe(text, text, text, integer) to authenticated;
grant execute on function public.creer_evenement(text, text, text) to authenticated;
grant execute on function public.creer_match(text, text, text, integer, timestamptz, text) to authenticated;

-- Private/player actions: no anonymous execution.
revoke execute on function public.clutch_acheter_objet(text) from public, anon;
revoke execute on function public.clutch_activite_amis(text, integer) from public, anon;
revoke execute on function public.clutch_agreger(text, text) from public, anon;
revoke execute on function public.clutch_bloc_favorite(text, boolean) from public, anon;
revoke execute on function public.clutch_chercher_joueurs(text) from public, anon;
revoke execute on function public.clutch_demander_ami(uuid) from public, anon;
revoke execute on function public.clutch_equiper(text) from public, anon;
revoke execute on function public.clutch_mes_amis(text) from public, anon;
revoke execute on function public.clutch_participation(uuid, text) from public, anon;
revoke execute on function public.clutch_repondre_demande(uuid, boolean) from public, anon;
revoke execute on function public.clutch_retirer_ami(uuid) from public, anon;
revoke execute on function public.clutch_solde_volts(uuid) from public, anon;
revoke execute on function public.clutch_volts_detail(uuid) from public, anon;
revoke execute on function public.creer_ligue(text) from public, anon;
revoke execute on function public.rejoindre_ligue(text) from public, anon;
revoke execute on function public.tirer_defi(uuid) from public, anon;
revoke execute on function public.classement_ligue(uuid, text) from public, anon;
revoke execute on function public.rivalite_semaine(text, uuid) from public, anon;
revoke execute on function public.mes_statistiques_detaillees(text) from public, anon;

-- =====================================================================
-- Legacy source: supabase/30_social_economy_v2.sql
-- =====================================================================
-- Clutch Phase 2 — Social / Faction Economy V2 alignment
-- Frags remain competitive rating only. Faction mutations now reward Volts.

alter table public.volts_mouvements
  drop constraint if exists volts_mouvements_origine_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
  check (origine in ('badge','saison','call','achat','ajustement','pari','faction'));

alter table public.communaute_mutations
  add column if not exists recompense_volts integer not null default 0
  check (recompense_volts >= 0);

comment on column public.communaute_mutations.recompense_frags is
  'Legacy archive only. Economy V2 never credits ranking Frags from faction mutations.';
comment on column public.communaute_mutations.recompense_volts is
  'Economy V2 cosmetic-currency reward granted to members present at mutation time.';

create or replace function public.clutch_evaluer_mutation(p_equipe_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_membres integer;
  v_cible smallint;
  v_courant smallint;
  v_niveau integer;
  v_nom text;
  v_seuil integer;
  v_recompense_volts integer;
  r record;
begin
  select count(*)::integer into v_membres
  from public.profils
  where equipe_favorite_id = p_equipe_id;

  v_cible := case
    when v_membres >= 5000 then 7
    when v_membres >= 1000 then 6
    when v_membres >= 500 then 5
    when v_membres >= 100 then 4
    when v_membres >= 50 then 3
    when v_membres >= 10 then 2
    else 1
  end;

  insert into public.communaute_etat(equipe_id, niveau_atteint)
  values (p_equipe_id, 1)
  on conflict (equipe_id) do nothing;

  select niveau_atteint into v_courant
  from public.communaute_etat
  where equipe_id = p_equipe_id
  for update;

  if v_cible <= v_courant then
    update public.communaute_etat set maj_le = now() where equipe_id = p_equipe_id;
    return;
  end if;

  for v_niveau in (v_courant + 1)..v_cible loop
    select
      case v_niveau when 2 then 'Flacon' when 3 then 'Bombonne' when 4 then 'Calice' when 5 then 'Alambic' when 6 then 'Cornue' when 7 then 'Océan' end,
      case v_niveau when 2 then 10 when 3 then 50 when 4 then 100 when 5 then 500 when 6 then 1000 when 7 then 5000 end,
      case v_niveau when 2 then 200 when 3 then 300 when 4 then 500 when 5 then 750 when 6 then 1000 when 7 then 1500 end
    into v_nom, v_seuil, v_recompense_volts;

    insert into public.communaute_mutations(
      equipe_id, niveau, nom, seuil, recompense_frags, recompense_volts, membres_au_moment
    ) values (
      p_equipe_id, v_niveau, v_nom, v_seuil, 0, v_recompense_volts, v_membres
    )
    on conflict (equipe_id, niveau) do nothing;

    for r in
      select p.id from public.profils p where p.equipe_favorite_id = p_equipe_id
    loop
      perform public.clutch_crediter_volts(
        r.id,
        v_recompense_volts,
        'faction',
        p_equipe_id || ':mutation:' || v_niveau::text
      );
    end loop;

    update public.communaute_etat
    set niveau_atteint = v_niveau::smallint,
        atteint_le = now(),
        maj_le = now()
    where equipe_id = p_equipe_id;
  end loop;
end;
$$;
revoke all on function public.clutch_evaluer_mutation(text) from public, anon, authenticated;

create or replace function public.clutch_classement(p_ids uuid[], p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(c.frags, 1000)::integer as solde,
    coalesce(c.pronostics_regles, 0)::bigint as paris,
    coalesce(c.pronostics_gagnes, 0)::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    coalesce((select sum(pc.delta_frags)::bigint from public.pronostics_classes pc where pc.user_id = pr.id and pc.saison_id = p_saison_id and pc.statut in ('gagne','perdu')), 0::bigint) as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from public.profils pr
  left join public.classements_frags c on c.user_id = pr.id and c.saison_id = p_saison_id
  left join public.equipes ef on ef.id = pr.equipe_favorite_id
  where pr.id = any (p_ids)
  order by coalesce(c.frags, 1000) desc, coalesce(c.pronostics_gagnes, 0) desc, pr.pseudo asc;
$$;
revoke execute on function public.clutch_classement(uuid[], text) from public, anon, authenticated;

create or replace function public.clutch_mes_amis(p_saison_id text default null)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_moi uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from public.v_saisons where statut = 'en_cours' order by debut desc limit 1));
  v_amis uuid[];
begin
  if v_moi is null then return json_build_object('amis','[]'::json,'recues','[]'::json,'envoyees','[]'::json); end if;
  select coalesce(array_agg(case when a = v_moi then b else a end), '{}') into v_amis from public.amities where statut='acceptee' and (a=v_moi or b=v_moi);
  return json_build_object(
    'saison', v_saison,
    'amis', coalesce((select json_agg(to_jsonb(c) order by c.solde desc) from public.clutch_classement(v_amis, v_saison) c), '[]'::json),
    'recues', coalesce((select json_agg(json_build_object('id',p.id,'pseudo',p.pseudo,'depuis',am.cree_le) order by am.cree_le) from public.amities am join public.profils p on p.id=am.demandeur where am.statut='en_attente' and am.demandeur<>v_moi and (am.a=v_moi or am.b=v_moi)), '[]'::json),
    'envoyees', coalesce((select json_agg(json_build_object('id',p.id,'pseudo',p.pseudo,'depuis',am.cree_le) order by am.cree_le) from public.amities am join public.profils p on p.id=case when am.a=v_moi then am.b else am.a end where am.statut='en_attente' and am.demandeur=v_moi and (am.a=v_moi or am.b=v_moi)), '[]'::json)
  );
end;
$$;
revoke execute on function public.clutch_mes_amis(text) from public, anon;
grant execute on function public.clutch_mes_amis(text) to authenticated;

create or replace function public.clutch_activite_amis(p_saison_id text default null, p_limite integer default 20)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_moi uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from public.v_saisons where statut='en_cours' order by debut desc limit 1));
  v_amis uuid[];
begin
  if v_moi is null then return '[]'::json; end if;
  select coalesce(array_agg(case when a=v_moi then b else a end), '{}') into v_amis from public.amities where statut='acceptee' and (a=v_moi or b=v_moi);
  return coalesce((select json_agg(x order by x.quand desc) from (
    select pr.pseudo, pc.choix, pc.statut, pc.delta_frags, pc.proba_figee, ea.nom as equipe_a, eb.nom as equipe_b, m.jeu, pc.regle_le as quand
    from public.pronostics_classes pc
    join public.profils pr on pr.id=pc.user_id
    join public.matchs m on m.id=pc.match_id
    join public.equipes ea on ea.id=m.equipe_a_id
    join public.equipes eb on eb.id=m.equipe_b_id
    where pc.user_id=any(v_amis) and pc.saison_id=v_saison and pc.statut in ('gagne','perdu')
    order by pc.regle_le desc nulls last, pc.cree_le desc
    limit greatest(1, least(p_limite,50))
  ) x), '[]'::json);
end;
$$;
revoke execute on function public.clutch_activite_amis(text, integer) from public, anon;
grant execute on function public.clutch_activite_amis(text, integer) to authenticated;

-- classement_communautes is replaced in 31_social_economy_v2_compat.sql so the
-- legacy Community V3 renderer can keep reading its historical JSON contract
-- while values now come from Volts and pronostics_classes.

-- =====================================================================
-- Legacy source: supabase/31_social_economy_v2_compat.sql
-- =====================================================================
-- Clutch Phase 2 — Community reward compatibility after Economy V2.
-- The legacy renderer still reads `recompense_frags` inside history JSON.
-- Keep that JSON key temporarily, but feed it from Volts. Ranking Frags are never credited.

create or replace function public.classement_communautes()
returns table (
  equipe_id text,
  nom text,
  tag text,
  jeu text,
  elo integer,
  logo text,
  membres bigint,
  moi boolean,
  niveau_atteint smallint,
  croissance_24h integer,
  croissance_7j integer,
  membre_depuis timestamptz,
  pronos_depuis bigint,
  mutations_vecues bigint,
  dernier_evenement_id bigint,
  dernier_evenement_niveau smallint,
  dernier_evenement_nom text,
  dernier_evenement_le timestamptz,
  dernier_evenement_recompense integer,
  historique jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with effectifs as (
    select e.id as equipe_id, count(p.id)::bigint as membres
    from public.equipes e
    left join public.profils p on p.equipe_favorite_id = e.id
    group by e.id
  ),
  croissance as (
    select
      m.equipe_id,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '24 hours'), 0)::integer as croissance_24h,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '7 days'), 0)::integer as croissance_7j
    from public.communaute_mouvements m
    group by m.equipe_id
  ),
  mon_profil as (
    select p.id, p.equipe_favorite_id, coalesce(p.equipe_favorite_rejointe_le, p.cree_le) as membre_depuis
    from public.profils p
    where p.id = auth.uid()
  )
  select
    e.id,
    e.nom,
    e.tag,
    e.jeu,
    e.elo,
    e.logo,
    ef.membres,
    (mp.id is not null and mp.equipe_favorite_id = e.id) as moi,
    coalesce(ce.niveau_atteint, 1)::smallint,
    coalesce(c.croissance_24h, 0),
    coalesce(c.croissance_7j, 0),
    case when mp.equipe_favorite_id = e.id then mp.membre_depuis end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.pronostics_classes pc
      where pc.user_id = mp.id and pc.cree_le >= mp.membre_depuis
    ) else 0 end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.communaute_mutations cmv
      where cmv.equipe_id = e.id and cmv.cree_le >= mp.membre_depuis
    ) else 0 end,
    last_mut.id,
    last_mut.niveau,
    last_mut.nom,
    last_mut.cree_le,
    coalesce(last_mut.recompense_volts, 0),
    coalesce(hist.items, '[]'::jsonb)
  from public.equipes e
  join effectifs ef on ef.equipe_id = e.id
  left join public.communaute_etat ce on ce.equipe_id = e.id
  left join croissance c on c.equipe_id = e.id
  left join mon_profil mp on mp.equipe_favorite_id = e.id
  left join lateral (
    select cm.id, cm.niveau, cm.nom, cm.cree_le, cm.recompense_volts
    from public.communaute_mutations cm
    where cm.equipe_id = e.id
    order by cm.cree_le desc
    limit 1
  ) last_mut on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'niveau', x.niveau,
        'nom', x.nom,
        'seuil', x.seuil,
        'recompense_volts', x.recompense_volts,
        'recompense_frags', x.recompense_volts,
        'membres', x.membres_au_moment,
        'cree_le', x.cree_le
      ) order by x.cree_le desc
    ) as items
    from (
      select *
      from public.communaute_mutations cm2
      where cm2.equipe_id = e.id
      order by cm2.cree_le desc
      limit 5
    ) x
  ) hist on true
  where ef.membres > 0
  order by coalesce(c.croissance_24h, 0) desc,
           coalesce(c.croissance_7j, 0) desc,
           ef.membres desc,
           e.nom asc;
$$;

revoke execute on function public.classement_communautes() from public;
grant execute on function public.classement_communautes() to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/32_phase4_1_onboarding_jeux_suivis.sql
-- =====================================================================
-- Clutch — Phase 4.1 onboarding hotfix
-- Persiste les jeux choisis pendant l'onboarding dans le profil utilisateur.

alter table public.profils
  add column if not exists jeux_suivis text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profils_jeux_suivis_valides'
      and conrelid = 'public.profils'::regclass
  ) then
    alter table public.profils
      add constraint profils_jeux_suivis_valides
      check (jeux_suivis <@ array['lol','cs2','valorant']::text[]);
  end if;
end $$;

create or replace function public.clutch_definir_jeux_suivis(p_jeux text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_jeux text[];
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select coalesce(array_agg(distinct jeu order by jeu), '{}'::text[])
    into v_jeux
  from unnest(coalesce(p_jeux, '{}'::text[])) as jeu
  where jeu = any(array['lol','cs2','valorant']::text[]);

  update public.profils
     set jeux_suivis = v_jeux
   where id = v_user;

  if not found then
    raise exception 'profil introuvable' using errcode = 'P0002';
  end if;

  return v_jeux;
end;
$$;

revoke execute on function public.clutch_definir_jeux_suivis(text[]) from public, anon;
grant execute on function public.clutch_definir_jeux_suivis(text[]) to authenticated;

-- =====================================================================
-- Legacy source: supabase/33_phase5_prediction_conviction.sql
-- =====================================================================
-- =====================================================================
-- Clutch — Phase 5 / Flow de pronostic + conviction
--
-- Migration additive au-dessus de 18_economie_v2.sql.
-- Les Frags restent un rating non dépensable. La conviction ne retire aucun
-- Frag : elle module uniquement le K utilisé au règlement du pronostic.
--
-- Faible = 0.75x · Normal = 1.00x · Fort = 1.50x
-- =====================================================================

alter table public.pronostics_classes
  add column if not exists conviction text not null default 'normal';

alter table public.pronostics_classes
  add column if not exists multiplicateur_conviction numeric(4,2) not null default 1.00;

update public.pronostics_classes
set conviction = 'normal'
where conviction is null or conviction not in ('faible','normal','fort');

update public.pronostics_classes
set multiplicateur_conviction = case conviction
  when 'faible' then 0.75
  when 'fort' then 1.50
  else 1.00
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pronostics_classes_conviction_check'
      and conrelid = 'public.pronostics_classes'::regclass
  ) then
    alter table public.pronostics_classes
      add constraint pronostics_classes_conviction_check
      check (conviction in ('faible','normal','fort'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pronostics_classes_conviction_mult_check'
      and conrelid = 'public.pronostics_classes'::regclass
  ) then
    alter table public.pronostics_classes
      add constraint pronostics_classes_conviction_mult_check
      check (multiplicateur_conviction in (0.75,1.00,1.50));
  end if;
end $$;

create or replace function public.clutch_conviction_multiplier(p_conviction text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_conviction text := lower(trim(coalesce(p_conviction,'')));
begin
  case v_conviction
    when 'faible' then return 0.75::numeric;
    when 'normal' then return 1.00::numeric;
    when 'fort' then return 1.50::numeric;
    else
      raise exception 'Conviction invalide : %', p_conviction using errcode = '22023';
  end case;
end;
$$;

create or replace function public.clutch_k_conviction(p_k integer,p_conviction text)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_k integer;
begin
  if p_k is null or p_k <= 0 then
    raise exception 'Coefficient K invalide : %', p_k using errcode = '22023';
  end if;
  v_k := round(p_k * clutch_conviction_multiplier(p_conviction))::integer;
  return greatest(1,v_k);
end;
$$;

create or replace function public.clutch_delta_frags_conviction(
  p_proba numeric,
  p_gagnant boolean,
  p_k integer,
  p_conviction text
)
returns integer
language sql
immutable
set search_path = public
as $$
  select public.clutch_delta_frags(
    p_proba,
    p_gagnant,
    public.clutch_k_conviction(p_k,p_conviction)
  )
$$;

create or replace function public.clutch_projection_convictions_json(p_proba numeric,p_k integer)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'faible', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('faible'),
      'k_effectif', public.clutch_k_conviction(p_k,'faible'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'faible'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'faible')
    ),
    'normal', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('normal'),
      'k_effectif', public.clutch_k_conviction(p_k,'normal'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'normal'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'normal')
    ),
    'fort', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('fort'),
      'k_effectif', public.clutch_k_conviction(p_k,'fort'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'fort'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'fort')
    )
  )
$$;

-- Même projection que Economy V2, enrichie des trois convictions.
create or replace function public.clutch_projection_match_frags_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_k integer;
  v_choix jsonb;
begin
  v_base := public.clutch_projection_match_frags(p_match_id);
  v_k := (v_base ->> 'k')::integer;

  select jsonb_agg(
    c || jsonb_build_object(
      'convictions',
      public.clutch_projection_convictions_json((c ->> 'proba_scoring')::numeric,v_k)
    )
    order by ord
  )
  into v_choix
  from jsonb_array_elements(v_base -> 'choix') with ordinality as x(c,ord);

  return jsonb_set(v_base,'{choix}',coalesce(v_choix,'[]'::jsonb),true);
end;
$$;

-- RPC Phase 5. L'ancien placer_pronostic_classe(text,text) reste intact pour
-- compatibilité et enregistre implicitement une conviction Normal.
create or replace function public.placer_pronostic_classe_v2(
  p_match_id text,
  p_choix text,
  p_conviction text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conviction text := lower(trim(coalesce(p_conviction,'')));
  v_mult numeric;
  v_result jsonb;
  v_id uuid;
  v_scoring numeric;
  v_k integer;
begin
  v_mult := public.clutch_conviction_multiplier(v_conviction);

  -- On réutilise volontairement l'autorité Economy V2 pour toutes les règles :
  -- auth, saison, fermeture, lock, unicité, snapshot et K de placement.
  v_result := public.placer_pronostic_classe(p_match_id,p_choix);
  v_id := (v_result ->> 'id')::uuid;

  update public.pronostics_classes
  set conviction = v_conviction,
      multiplicateur_conviction = v_mult
  where id = v_id
    and user_id = auth.uid()
  returning proba_scoring,k_frags into v_scoring,v_k;

  if not found then
    raise exception 'Pronostic classe introuvable apres creation.';
  end if;

  return v_result || jsonb_build_object(
    'conviction', v_conviction,
    'multiplicateur_conviction', v_mult,
    'k_effectif', public.clutch_k_conviction(v_k,v_conviction),
    'gain_si_correct', public.clutch_delta_frags_conviction(v_scoring,true,v_k,v_conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_scoring,false,v_k,v_conviction)
  );
end;
$$;

-- Lecture ciblée utilisée par le Match Center pour réafficher le prono après
-- un refresh sans modifier le RPC historique consommé par les autres écrans.
create or replace function public.clutch_mon_pronostic_match_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p public.pronostics_classes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_p
  from public.pronostics_classes
  where user_id = auth.uid()
    and match_id = p_match_id
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_p.id,
    'match_id', v_p.match_id,
    'choix', v_p.choix,
    'conviction', v_p.conviction,
    'multiplicateur_conviction', v_p.multiplicateur_conviction,
    'proba_figee', v_p.proba_figee,
    'proba_scoring', v_p.proba_scoring,
    'k_frags', v_p.k_frags,
    'k_effectif', public.clutch_k_conviction(v_p.k_frags,v_p.conviction),
    'statut', v_p.statut,
    'delta_frags', v_p.delta_frags,
    'gain_si_correct', public.clutch_delta_frags_conviction(v_p.proba_scoring,true,v_p.k_frags,v_p.conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_p.proba_scoring,false,v_p.k_frags,v_p.conviction),
    'cree_le', v_p.cree_le,
    'regle_le', v_p.regle_le
  );
end;
$$;

-- Le règlement devient conviction-aware. Les anciens pronostics sont Normal
-- grâce aux defaults/backfills ci-dessus.
create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = public,private
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_avant integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    update public.pronostics_classes
    set statut = 'annule',delta_frags = 0,regle_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' or old.statut = 'termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a = new.score_b then
    raise exception 'Impossible de regler les Frags : score final invalide pour %',new.id;
  end if;

  for r in
    select * from public.pronostics_classes
    where match_id = new.id and statut = 'en_cours'
    order by cree_le,id
    for update
  loop
    v_gagnant := case
      when r.choix = 'a' then new.score_a > new.score_b
      else new.score_b > new.score_a
    end;

    v_delta := public.clutch_delta_frags_conviction(
      r.proba_scoring,
      v_gagnant,
      r.k_frags,
      coalesce(r.conviction,'normal')
    );

    insert into public.classements_frags(saison_id,user_id,frags,pic_frags)
    values(r.saison_id,r.user_id,public.clutch_frags_initial(),public.clutch_frags_initial())
    on conflict(saison_id,user_id) do nothing;

    select frags into v_frags_avant
    from public.classements_frags
    where saison_id = r.saison_id and user_id = r.user_id
    for update;

    v_frags_apres := v_frags_avant + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags,v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        regle_le = now()
    where id = r.id;
  end loop;

  return new;
end;
$$;

revoke all on function private.clutch_resoudre_pronostics_classes() from public;

-- Le trigger existe déjà ; recréation explicite pour rendre la migration
-- autonome si la phase 5 est rejouée sur une base restaurée.
drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of statut,score_a,score_b on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

revoke execute on function public.placer_pronostic_classe_v2(text,text,text) from public;
revoke execute on function public.clutch_mon_pronostic_match_v2(text) from public;
revoke execute on function public.clutch_projection_match_frags_v2(text) from public;

revoke execute on function public.placer_pronostic_classe_v2(text,text,text) from anon;
revoke execute on function public.clutch_mon_pronostic_match_v2(text) from anon;

grant execute on function public.clutch_projection_match_frags_v2(text) to anon;
grant execute on function public.clutch_projection_match_frags_v2(text) to authenticated;
grant execute on function public.placer_pronostic_classe_v2(text,text,text) to authenticated;
grant execute on function public.clutch_mon_pronostic_match_v2(text) to authenticated;

-- =====================================================================
-- Legacy source: supabase/34_phase5_rpc_hardening.sql
-- =====================================================================
-- =====================================================================
-- Clutch — Phase 5 / RPC hardening
--
-- Les deux RPC de lecture Phase 5 n'ont pas besoin de privilèges élevés.
-- On les repasse en SECURITY INVOKER :
--   - la projection délègue déjà au RPC Economy V2 existant ;
--   - la lecture du prono s'appuie sur la policy RLS user_id = auth.uid().
-- Le RPC d'écriture reste SECURITY DEFINER car il orchestre de façon atomique
-- la création Economy V2 + la conviction et vérifie auth.uid().
-- =====================================================================

create or replace function public.clutch_projection_match_frags_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_base jsonb;
  v_k integer;
  v_choix jsonb;
begin
  v_base := public.clutch_projection_match_frags(p_match_id);
  v_k := (v_base ->> 'k')::integer;

  select jsonb_agg(
    c || jsonb_build_object(
      'convictions',
      public.clutch_projection_convictions_json((c ->> 'proba_scoring')::numeric,v_k)
    )
    order by ord
  )
  into v_choix
  from jsonb_array_elements(v_base -> 'choix') with ordinality as x(c,ord);

  return jsonb_set(v_base,'{choix}',coalesce(v_choix,'[]'::jsonb),true);
end;
$$;

create or replace function public.clutch_mon_pronostic_match_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_p public.pronostics_classes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_p
  from public.pronostics_classes
  where user_id = auth.uid()
    and match_id = p_match_id
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_p.id,
    'match_id', v_p.match_id,
    'choix', v_p.choix,
    'conviction', v_p.conviction,
    'multiplicateur_conviction', v_p.multiplicateur_conviction,
    'proba_figee', v_p.proba_figee,
    'proba_scoring', v_p.proba_scoring,
    'k_frags', v_p.k_frags,
    'k_effectif', public.clutch_k_conviction(v_p.k_frags,v_p.conviction),
    'statut', v_p.statut,
    'delta_frags', v_p.delta_frags,
    'gain_si_correct', public.clutch_delta_frags_conviction(v_p.proba_scoring,true,v_p.k_frags,v_p.conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_p.proba_scoring,false,v_p.k_frags,v_p.conviction),
    'cree_le', v_p.cree_le,
    'regle_le', v_p.regle_le
  );
end;
$$;

revoke execute on function public.clutch_mon_pronostic_match_v2(text) from public,anon;
revoke execute on function public.clutch_projection_match_frags_v2(text) from public;

grant execute on function public.clutch_mon_pronostic_match_v2(text) to authenticated;
grant execute on function public.clutch_projection_match_frags_v2(text) to anon,authenticated;


-- =====================================================================
-- Legacy source: supabase/35_phase6_result_reveal.sql
-- =====================================================================
-- =====================================================================
-- Clutch — Phase 6 / Result reveal
--
-- A settled prediction is now a durable product moment, not just a history row.
-- We snapshot the competitive state around settlement so the client can show
-- a truthful Frags/rank transition, and we track whether that result has been
-- revealed to the player.
-- =====================================================================

alter table public.pronostics_classes
  add column if not exists frags_avant integer;

alter table public.pronostics_classes
  add column if not exists frags_apres integer;

alter table public.pronostics_classes
  add column if not exists rang_avant integer;

alter table public.pronostics_classes
  add column if not exists rang_apres integer;

alter table public.pronostics_classes
  add column if not exists revele_le timestamptz;

comment on column public.pronostics_classes.frags_avant is
  'Phase 6 snapshot: rating immediately before this prediction was settled.';
comment on column public.pronostics_classes.frags_apres is
  'Phase 6 snapshot: rating immediately after this prediction was settled.';
comment on column public.pronostics_classes.rang_avant is
  'Phase 6 snapshot: deterministic global season rank before settlement.';
comment on column public.pronostics_classes.rang_apres is
  'Phase 6 snapshot: deterministic global season rank after every prediction on the match has settled.';
comment on column public.pronostics_classes.revele_le is
  'First time the player explicitly dismissed/continued past the cinematic result reveal.';

-- Historical settled rows predate the snapshot contract. Do not surprise users
-- by replaying an unverifiable backlog after deploying Phase 6.
update public.pronostics_classes
set revele_le = coalesce(revele_le, regle_le, now())
where statut in ('gagne','perdu')
  and (frags_avant is null or frags_apres is null);

-- Same ordering as the public Global ranking, with user_id as a final stable
-- tie-breaker so a reveal never displays a nondeterministic rank.
create or replace function private.clutch_rang_frags_v1(
  p_saison_id text,
  p_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select q.rang::integer
  from (
    select
      c.user_id,
      row_number() over (
        order by c.frags desc,
                 c.pronostics_gagnes desc,
                 c.maj_le asc,
                 c.user_id asc
      ) as rang
    from public.classements_frags c
    where c.saison_id = p_saison_id
  ) q
  where q.user_id = p_user_id
$$;

revoke all on function private.clutch_rang_frags_v1(text, uuid) from public, anon, authenticated;

-- Phase 5 conviction-aware settlement + Phase 6 before/after snapshots.
create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    update public.pronostics_classes
    set statut = 'annule',
        delta_frags = 0,
        regle_le = now(),
        revele_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' or old.statut = 'termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a = new.score_b then
    raise exception 'Impossible de regler les Frags : score final invalide pour %', new.id;
  end if;

  -- Ensure every participant has a ranking row BEFORE taking the snapshot.
  insert into public.classements_frags(saison_id,user_id,frags,pic_frags)
  select distinct
    p.saison_id,
    p.user_id,
    public.clutch_frags_initial(),
    public.clutch_frags_initial()
  from public.pronostics_classes p
  where p.match_id = new.id and p.statut = 'en_cours'
  on conflict(saison_id,user_id) do nothing;

  -- Snapshot every player's BEFORE state while standings are still untouched.
  update public.pronostics_classes p
  set frags_avant = c.frags,
      rang_avant = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  from public.classements_frags c
  where p.match_id = new.id
    and p.statut = 'en_cours'
    and c.saison_id = p.saison_id
    and c.user_id = p.user_id;

  for r in
    select *
    from public.pronostics_classes
    where match_id = new.id and statut = 'en_cours'
    order by cree_le,id
    for update
  loop
    v_gagnant := case
      when r.choix = 'a' then new.score_a > new.score_b
      else new.score_b > new.score_a
    end;

    v_delta := public.clutch_delta_frags_conviction(
      r.proba_scoring,
      v_gagnant,
      r.k_frags,
      coalesce(r.conviction,'normal')
    );

    v_frags_apres := coalesce(r.frags_avant, public.clutch_frags_initial()) + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags,v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        frags_apres = v_frags_apres,
        regle_le = now(),
        revele_le = null
    where id = r.id;
  end loop;

  -- Rank AFTER is captured only once the whole match has affected standings.
  update public.pronostics_classes p
  set rang_apres = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  where p.match_id = new.id
    and p.statut in ('gagne','perdu')
    and p.rang_avant is not null
    and p.rang_apres is null;

  return new;
end;
$$;

revoke all on function private.clutch_resoudre_pronostics_classes() from public, anon, authenticated;

drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of statut,score_a,score_b on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

-- The next unseen result. Read-only and SECURITY INVOKER: RLS on
-- pronostics_classes remains the authority for private player data.
create or replace function public.clutch_prochain_resultat_a_reveler()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cible as (
    select
      p.*,
      m.equipe_a,
      m.equipe_b,
      m.tag_a,
      m.tag_b,
      m.score_a,
      m.score_b,
      m.jeu,
      m.evenement,
      m.format,
      m.debut
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = auth.uid()
      and p.statut in ('gagne','perdu')
      and p.revele_le is null
    order by p.regle_le asc nulls last, p.cree_le asc
    limit 1
  ), compteur as (
    select count(*)::integer as total
    from public.pronostics_classes p
    where p.user_id = auth.uid()
      and p.statut in ('gagne','perdu')
      and p.revele_le is null
  )
  select case when c.id is null then null else jsonb_build_object(
    'id', c.id,
    'match_id', c.match_id,
    'saison_id', c.saison_id,
    'statut', c.statut,
    'choix', c.choix,
    'conviction', c.conviction,
    'multiplicateur_conviction', c.multiplicateur_conviction,
    'proba_figee', c.proba_figee,
    'delta_frags', c.delta_frags,
    'frags_avant', c.frags_avant,
    'frags_apres', c.frags_apres,
    'rang_avant', c.rang_avant,
    'rang_apres', c.rang_apres,
    'regle_le', c.regle_le,
    'equipe_a', c.equipe_a,
    'equipe_b', c.equipe_b,
    'tag_a', c.tag_a,
    'tag_b', c.tag_b,
    'score_a', c.score_a,
    'score_b', c.score_b,
    'jeu', c.jeu,
    'evenement', c.evenement,
    'format', c.format,
    'debut', c.debut,
    'restants', compteur.total
  ) end
  from compteur
  left join cible c on true
$$;

-- Same payload for replay from a completed Match Center, even if already seen.
create or replace function public.clutch_resultat_match_v1(p_match_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'match_id', p.match_id,
    'saison_id', p.saison_id,
    'statut', p.statut,
    'choix', p.choix,
    'conviction', p.conviction,
    'multiplicateur_conviction', p.multiplicateur_conviction,
    'proba_figee', p.proba_figee,
    'delta_frags', p.delta_frags,
    'frags_avant', p.frags_avant,
    'frags_apres', p.frags_apres,
    'rang_avant', p.rang_avant,
    'rang_apres', p.rang_apres,
    'regle_le', p.regle_le,
    'revele_le', p.revele_le,
    'equipe_a', m.equipe_a,
    'equipe_b', m.equipe_b,
    'tag_a', m.tag_a,
    'tag_b', m.tag_b,
    'score_a', m.score_a,
    'score_b', m.score_b,
    'jeu', m.jeu,
    'evenement', m.evenement,
    'format', m.format,
    'debut', m.debut,
    'restants', 1
  )
  from public.pronostics_classes p
  join public.v_matchs m on m.id = p.match_id
  where p.user_id = auth.uid()
    and p.match_id = p_match_id
    and p.statut in ('gagne','perdu')
  limit 1
$$;

create or replace function public.clutch_marquer_resultat_revele(p_pronostic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_revele timestamptz;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  update public.pronostics_classes
  set revele_le = coalesce(revele_le, now())
  where id = p_pronostic_id
    and user_id = v_user
    and statut in ('gagne','perdu')
  returning revele_le into v_revele;

  if not found then
    raise exception 'Resultat introuvable.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id',p_pronostic_id,'revele_le',v_revele);
end;
$$;

revoke execute on function public.clutch_prochain_resultat_a_reveler() from public, anon;
revoke execute on function public.clutch_resultat_match_v1(text) from public, anon;
revoke execute on function public.clutch_marquer_resultat_revele(uuid) from public, anon;

grant execute on function public.clutch_prochain_resultat_a_reveler() to authenticated;
grant execute on function public.clutch_resultat_match_v1(text) to authenticated;
grant execute on function public.clutch_marquer_resultat_revele(uuid) to authenticated;

-- =====================================================================
-- Legacy source: supabase/36_phase8_friend_challenges.sql
-- =====================================================================
-- Phase 8 — friend challenges / 1v1 match duels

create table if not exists public.defis_match (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  match_id text not null references public.matchs(id) on delete cascade,
  saison_id text not null,
  createur_id uuid not null references public.profils(id) on delete cascade,
  createur_pronostic_id uuid not null references public.pronostics_classes(id) on delete cascade,
  accepteur_id uuid references public.profils(id) on delete set null,
  accepteur_pronostic_id uuid references public.pronostics_classes(id) on delete set null,
  statut text not null default 'en_attente' check (statut in ('en_attente','accepte','termine','annule')),
  cree_le timestamptz not null default now(),
  accepte_le timestamptz,
  termine_le timestamptz,
  annule_le timestamptz,
  unique (createur_id, match_id),
  check (accepteur_id is null or accepteur_id <> createur_id)
);

create index if not exists defis_match_accepteur_statut_idx on public.defis_match(accepteur_id, statut);
create index if not exists defis_match_match_statut_idx on public.defis_match(match_id, statut);
create index if not exists defis_match_createur_statut_idx on public.defis_match(createur_id, statut);

alter table public.defis_match enable row level security;
revoke all on table public.defis_match from anon, authenticated;

create or replace function public.clutch_creer_defi_match(p_match_id text)
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
      set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
          createur_pronostic_id = v_prono.id,
          saison_id = v_prono.saison_id,
          accepteur_id = null,
          accepteur_pronostic_id = null,
          statut = 'en_attente',
          cree_le = now(),
          accepte_le = null,
          termine_le = null,
          annule_le = null
      where id = v_defi.id
      returning * into v_defi;
    end if;

    return jsonb_build_object(
      'id', v_defi.id,
      'token', v_defi.token,
      'statut', v_defi.statut,
      'match_id', v_defi.match_id
    );
  end if;

  select count(*) into v_attente
  from public.defis_match
  where createur_id = v_moi and statut = 'en_attente';
  if v_attente >= 10 then
    raise exception 'trop de defis en attente' using errcode = 'P0001';
  end if;

  insert into public.defis_match(match_id, saison_id, createur_id, createur_pronostic_id)
  values (p_match_id, v_prono.saison_id, v_moi, v_prono.id)
  returning * into v_defi;

  return jsonb_build_object(
    'id', v_defi.id,
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id
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
      pacc.pseudo as accepteur_pseudo
    from public.defis_match dm
    join public.v_matchs m on m.id = dm.match_id
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.profils pcrea on pcrea.id = dm.createur_id
    left join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = dm.accepteur_id
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
    'createur_pseudo', d.createur_pseudo,
    'createur_choix', d.createur_choix,
    'createur_conviction', d.createur_conviction,
    'createur_multiplicateur', d.createur_mult,
    'choix_oppose', case when d.createur_choix = 'a' then 'b' else 'a' end,
    'equipe_opposee', case when d.createur_choix = 'a' then d.equipe_b else d.equipe_a end,
    'tag_oppose', case when d.createur_choix = 'a' then d.tag_b else d.tag_a end,
    'accepteur_pseudo', d.accepteur_pseudo,
    'accepteur_choix', d.accepteur_choix,
    'accepteur_conviction', d.accepteur_conviction,
    'moi_role', case when auth.uid() = d.createur_id then 'createur' when auth.uid() = d.accepteur_id then 'accepteur' else 'visiteur' end,
    'mon_prono', case when moi.id is null then null else jsonb_build_object('id', moi.id, 'choix', moi.choix, 'conviction', moi.conviction, 'statut', moi.statut) end
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

  return jsonb_build_object('token', v_defi.token, 'statut', v_defi.statut, 'match_id', v_defi.match_id);
end;
$$;

create or replace function public.clutch_annuler_defi_match(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  update public.defis_match
  set statut = 'annule', annule_le = now()
  where token = lower(trim(p_token)) and createur_id = v_moi and statut = 'en_attente'
  returning * into v_defi;
  if not found then raise exception 'defi non annulable' using errcode = 'P0001'; end if;
  return jsonb_build_object('token', v_defi.token, 'statut', v_defi.statut);
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
      d.statut,
      d.match_id,
      d.cree_le as quand,
      d.accepte_le,
      d.termine_le,
      m.jeu, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b, m.evenement, m.debut, m.score_a, m.score_b,
      pc.choix as createur_choix, pc.conviction as createur_conviction, pcrea.pseudo as createur_pseudo,
      pa.choix as accepteur_choix, pa.conviction as accepteur_conviction, pacc.pseudo as accepteur_pseudo,
      case when d.createur_id = auth.uid() then 'createur' else 'accepteur' end as moi_role
    from public.defis_match d
    join public.v_matchs m on m.id = d.match_id
    join public.pronostics_classes pc on pc.id = d.createur_pronostic_id
    join public.profils pcrea on pcrea.id = d.createur_id
    left join public.pronostics_classes pa on pa.id = d.accepteur_pronostic_id
    left join public.profils pacc on pacc.id = d.accepteur_id
    where auth.uid() is not null
      and (d.createur_id = auth.uid() or d.accepteur_id = auth.uid())
    order by d.cree_le desc
    limit greatest(1, least(coalesce(p_limite,30), 50))
  ) x;
$$;

create or replace function public.clutch_duel_resultat_match(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_defi public.defis_match%rowtype;
  v_autre uuid;
  v_autre_pseudo text;
  v_moi_prono public.pronostics_classes%rowtype;
  v_autre_prono public.pronostics_classes%rowtype;
  v_score_moi integer := 0;
  v_score_autre integer := 0;
begin
  if v_moi is null then return null; end if;

  select * into v_defi
  from public.defis_match
  where match_id = p_match_id
    and statut in ('accepte','termine')
    and (createur_id = v_moi or accepteur_id = v_moi)
  order by accepte_le desc nulls last
  limit 1;
  if not found then return null; end if;

  if v_defi.createur_id = v_moi then
    v_autre := v_defi.accepteur_id;
    select * into v_moi_prono from public.pronostics_classes where id = v_defi.createur_pronostic_id;
    select * into v_autre_prono from public.pronostics_classes where id = v_defi.accepteur_pronostic_id;
  else
    v_autre := v_defi.createur_id;
    select * into v_moi_prono from public.pronostics_classes where id = v_defi.accepteur_pronostic_id;
    select * into v_autre_prono from public.pronostics_classes where id = v_defi.createur_pronostic_id;
  end if;

  select pseudo into v_autre_pseudo from public.profils where id = v_autre;

  select
    count(*) filter (where (d.createur_id = v_moi and pc.statut = 'gagne') or (d.accepteur_id = v_moi and pa.statut = 'gagne')),
    count(*) filter (where (d.createur_id = v_autre and pc.statut = 'gagne') or (d.accepteur_id = v_autre and pa.statut = 'gagne'))
  into v_score_moi, v_score_autre
  from public.defis_match d
  join public.pronostics_classes pc on pc.id = d.createur_pronostic_id
  join public.pronostics_classes pa on pa.id = d.accepteur_pronostic_id
  where d.statut = 'termine'
    and ((d.createur_id = v_moi and d.accepteur_id = v_autre) or (d.createur_id = v_autre and d.accepteur_id = v_moi));

  return jsonb_build_object(
    'token', v_defi.token,
    'statut', v_defi.statut,
    'adversaire_pseudo', v_autre_pseudo,
    'moi_gagne', v_moi_prono.statut = 'gagne',
    'mon_statut', v_moi_prono.statut,
    'adversaire_statut', v_autre_prono.statut,
    'score_moi', coalesce(v_score_moi,0),
    'score_adversaire', coalesce(v_score_autre,0)
  );
end;
$$;

create or replace function private.clutch_terminer_defis_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut not in ('gagne','perdu') then return new; end if;

  update public.defis_match d
  set statut = 'termine', termine_le = coalesce(d.termine_le, now())
  where d.statut = 'accepte'
    and (d.createur_pronostic_id = new.id or d.accepteur_pronostic_id = new.id)
    and exists (select 1 from public.pronostics_classes p where p.id = d.createur_pronostic_id and p.statut in ('gagne','perdu'))
    and exists (select 1 from public.pronostics_classes p where p.id = d.accepteur_pronostic_id and p.statut in ('gagne','perdu'));
  return new;
end;
$$;

drop trigger if exists trg_phase8_terminer_defis_match on public.pronostics_classes;
create trigger trg_phase8_terminer_defis_match
after update of statut on public.pronostics_classes
for each row
when (old.statut is distinct from new.statut and new.statut in ('gagne','perdu'))
execute function private.clutch_terminer_defis_match();

revoke execute on function public.clutch_creer_defi_match(text) from public, anon;
revoke execute on function public.clutch_accepter_defi_match(text) from public, anon;
revoke execute on function public.clutch_annuler_defi_match(text) from public, anon;
revoke execute on function public.clutch_mes_defis_match(integer) from public, anon;
revoke execute on function public.clutch_duel_resultat_match(text) from public, anon;
revoke execute on function public.clutch_defi_match_public(text) from public;

grant execute on function public.clutch_creer_defi_match(text) to authenticated;
grant execute on function public.clutch_accepter_defi_match(text) to authenticated;
grant execute on function public.clutch_annuler_defi_match(text) to authenticated;
grant execute on function public.clutch_mes_defis_match(integer) to authenticated;
grant execute on function public.clutch_duel_resultat_match(text) to authenticated;
grant execute on function public.clutch_defi_match_public(text) to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/37_phase8_challenge_hardening.sql
-- =====================================================================
-- Phase 8 hardening: stronger capability tokens and FK indexes.

alter table public.defis_match
  alter column token set default replace(gen_random_uuid()::text, '-', '');

create index if not exists defis_match_createur_pronostic_idx
  on public.defis_match(createur_pronostic_id);

create index if not exists defis_match_accepteur_pronostic_idx
  on public.defis_match(accepteur_pronostic_id)
  where accepteur_pronostic_id is not null;

create or replace function public.clutch_creer_defi_match(p_match_id text)
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
          accepteur_id = null,
          accepteur_pronostic_id = null,
          statut = 'en_attente',
          cree_le = now(),
          accepte_le = null,
          termine_le = null,
          annule_le = null
      where id = v_defi.id
      returning * into v_defi;
    end if;

    return jsonb_build_object(
      'id', v_defi.id,
      'token', v_defi.token,
      'statut', v_defi.statut,
      'match_id', v_defi.match_id
    );
  end if;

  select count(*) into v_attente
  from public.defis_match
  where createur_id = v_moi and statut = 'en_attente';
  if v_attente >= 10 then
    raise exception 'trop de defis en attente' using errcode = 'P0001';
  end if;

  insert into public.defis_match(match_id, saison_id, createur_id, createur_pronostic_id)
  values (p_match_id, v_prono.saison_id, v_moi, v_prono.id)
  returning * into v_defi;

  return jsonb_build_object(
    'id', v_defi.id,
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id
  );
end;
$$;

-- =====================================================================
-- Legacy source: supabase/38_phase10_leagues_social_first.sql
-- =====================================================================
-- Phase 10 — Ligues V3 social-first

create table if not exists public.ligue_reactions (
  ligue_id uuid not null references public.ligues(id) on delete cascade,
  event_key text not null,
  user_id uuid not null references public.profils(id) on delete cascade,
  reaction text not null check (reaction in ('fire','eyes','skull','w','l')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  primary key (ligue_id, event_key, user_id),
  check (length(event_key) between 1 and 180)
);

create index if not exists ligue_reactions_event_idx on public.ligue_reactions(ligue_id, event_key);
create index if not exists ligue_reactions_user_idx on public.ligue_reactions(user_id, maj_le desc);

alter table public.ligue_reactions enable row level security;
revoke all on table public.ligue_reactions from anon, authenticated;

create or replace function public.clutch_ligue_public(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_ligue public.ligues%rowtype;
  v_saison_id text;
  v_saison_nom text;
  v_nb integer;
  v_createur text;
  v_leader text;
  v_leader_frags integer;
begin
  if v_code = '' or length(v_code) > 12 or v_code !~ '^[A-Z0-9]+$' then return null; end if;
  select * into v_ligue from public.ligues where code = v_code limit 1;
  if not found then return null; end if;

  select s.id, s.nom into v_saison_id, v_saison_nom
  from public.saisons s
  order by case when now() >= s.debut and now() < s.fin then 0 else 1 end, s.debut desc
  limit 1;

  select count(*)::integer into v_nb from public.membres_ligue ml where ml.ligue_id = v_ligue.id;
  select p.pseudo into v_createur from public.profils p where p.id = v_ligue.createur_id;
  select p.pseudo, coalesce(c.frags, public.clutch_frags_initial())
  into v_leader, v_leader_frags
  from public.membres_ligue ml
  join public.profils p on p.id = ml.user_id
  left join public.classements_frags c on c.user_id = ml.user_id and c.saison_id = v_saison_id
  where ml.ligue_id = v_ligue.id
  order by coalesce(c.frags, public.clutch_frags_initial()) desc,
           coalesce(c.pronostics_gagnes, 0) desc,
           ml.rejoint_le asc,
           p.id asc
  limit 1;

  return jsonb_build_object(
    'id', v_ligue.id, 'code', v_ligue.code, 'nom', v_ligue.nom,
    'nb_membres', coalesce(v_nb, 0), 'createur_pseudo', v_createur,
    'leader_pseudo', v_leader, 'leader_frags', v_leader_frags,
    'saison_id', v_saison_id, 'saison_nom', v_saison_nom
  );
end;
$$;

create or replace function public.clutch_ligue_dashboard_v1(p_ligue_id uuid, p_saison_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_result jsonb;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  if p_ligue_id is null or p_saison_id is null then raise exception 'ligue et saison requises' using errcode = '22023'; end if;
  if not exists (select 1 from public.membres_ligue ml where ml.ligue_id = p_ligue_id and ml.user_id = v_moi) then
    raise exception 'tu ne fais pas partie de cette ligue' using errcode = '42501';
  end if;

  with weekly as (
    select p.user_id,
           coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu') and p.regle_le >= now() - interval '7 days'), 0)::integer as net_7j
    from public.pronostics_classes p
    join public.membres_ligue ml on ml.user_id = p.user_id and ml.ligue_id = p_ligue_id
    where p.saison_id = p_saison_id
    group by p.user_id
  ), ranking_base as (
    select pr.id, pr.pseudo, coalesce(eq.tag, '') as tag_favori,
           coalesce(c.frags, public.clutch_frags_initial())::integer as frags,
           coalesce(c.pronostics_regles, 0)::integer as pronostics_regles,
           coalesce(c.pronostics_gagnes, 0)::integer as pronostics_gagnes,
           coalesce(w.net_7j, 0)::integer as net_7j,
           (coalesce(c.frags, public.clutch_frags_initial()) - coalesce(w.net_7j, 0))::integer as frags_7j,
           ml.rejoint_le
    from public.membres_ligue ml
    join public.profils pr on pr.id = ml.user_id
    left join public.classements_frags c on c.user_id = ml.user_id and c.saison_id = p_saison_id
    left join weekly w on w.user_id = ml.user_id
    left join public.equipes eq on eq.id = pr.equipe_favorite_id
    where ml.ligue_id = p_ligue_id
  ), ranked as (
    select rb.*,
           row_number() over (order by rb.frags desc, rb.pronostics_gagnes desc, rb.rejoint_le asc, rb.id asc)::integer as rang,
           row_number() over (order by rb.frags_7j desc, rb.pronostics_gagnes desc, rb.rejoint_le asc, rb.id asc)::integer as rang_7j
    from ranking_base rb
  ), me as (
    select * from ranked where id = v_moi
  ), target as (
    select r.* from ranked r, me where r.rang = me.rang - 1 limit 1
  ), pursuer as (
    select r.* from ranked r, me where r.rang = me.rang + 1 limit 1
  ), upcoming_base as (
    select m.id, m.jeu, m.format, m.debut, m.evenement, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b,
           count(pc.id)::integer as participants,
           count(pc.id) filter (where pc.choix = 'a')::integer as choix_a_brut,
           count(pc.id) filter (where pc.choix = 'b')::integer as choix_b_brut,
           max(pc.choix) filter (where pc.user_id = v_moi) as mon_choix,
           max(pc.choix) filter (where pc.user_id = (select id from target)) as cible_choix
    from public.v_matchs m
    left join public.pronostics_classes pc
      on pc.match_id = m.id and pc.saison_id = p_saison_id
     and exists (select 1 from public.membres_ligue lm where lm.ligue_id = p_ligue_id and lm.user_id = pc.user_id)
    where m.saison_id = p_saison_id and m.statut = 'a_venir'
      and m.debut > now() and m.debut <= now() + interval '36 hours'
    group by m.id, m.jeu, m.format, m.debut, m.evenement, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b
    order by m.debut asc
    limit 5
  ), duel_raw as (
    select dm.token, dm.termine_le, dm.createur_id, dm.accepteur_id,
           case when pc.statut = 'gagne' then dm.createur_id when pa.statut = 'gagne' then dm.accepteur_id else null end as gagnant_id
    from public.defis_match dm
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    where dm.statut = 'termine'
      and exists (select 1 from public.membres_ligue x where x.ligue_id = p_ligue_id and x.user_id = dm.createur_id)
      and exists (select 1 from public.membres_ligue y where y.ligue_id = p_ligue_id and y.user_id = dm.accepteur_id)
  ), duel_norm as (
    select d.*,
           case when d.createur_id::text < d.accepteur_id::text then d.createur_id else d.accepteur_id end as p1,
           case when d.createur_id::text < d.accepteur_id::text then d.accepteur_id else d.createur_id end as p2
    from duel_raw d where d.gagnant_id is not null
  ), duel_pairs as (
    select p1, p2, count(*)::integer as duels,
           count(*) filter (where gagnant_id = p1)::integer as p1_wins,
           count(*) filter (where gagnant_id = p2)::integer as p2_wins,
           max(termine_le) as dernier_duel
    from duel_norm group by p1, p2
    order by count(*) desc, max(termine_le) desc limit 5
  ), feed_base as (
    select 'prono:' || p.id::text as event_key, 'prediction'::text as type, p.regle_le as moment,
           p.user_id as acteur_id, pr.pseudo as acteur_pseudo,
           jsonb_build_object('statut',p.statut,'delta_frags',coalesce(p.delta_frags,0),'match_id',p.match_id,'tag_a',m.tag_a,'tag_b',m.tag_b,'evenement',m.evenement) as payload
    from public.pronostics_classes p
    join public.membres_ligue ml on ml.user_id = p.user_id and ml.ligue_id = p_ligue_id
    join public.profils pr on pr.id = p.user_id
    join public.v_matchs m on m.id = p.match_id
    where p.saison_id = p_saison_id and p.statut in ('gagne','perdu') and p.regle_le >= now() - interval '7 days'
    union all
    select 'join:' || ml.user_id::text, 'join'::text, ml.rejoint_le, ml.user_id, pr.pseudo, '{}'::jsonb
    from public.membres_ligue ml join public.profils pr on pr.id = ml.user_id
    where ml.ligue_id = p_ligue_id and ml.rejoint_le >= now() - interval '7 days'
    union all
    select 'duel:' || dm.token, 'duel'::text, dm.termine_le,
           case when pc.statut = 'gagne' then dm.createur_id else dm.accepteur_id end,
           case when pc.statut = 'gagne' then pcrea.pseudo else pacc.pseudo end,
           jsonb_build_object('gagnant',case when pc.statut='gagne' then pcrea.pseudo else pacc.pseudo end,'perdant',case when pc.statut='gagne' then pacc.pseudo else pcrea.pseudo end,'match_id',dm.match_id,'tag_a',m.tag_a,'tag_b',m.tag_b)
    from public.defis_match dm
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    join public.profils pcrea on pcrea.id = dm.createur_id
    join public.profils pacc on pacc.id = dm.accepteur_id
    join public.v_matchs m on m.id = dm.match_id
    where dm.statut='termine' and dm.termine_le >= now() - interval '7 days'
      and exists (select 1 from public.membres_ligue x where x.ligue_id=p_ligue_id and x.user_id=dm.createur_id)
      and exists (select 1 from public.membres_ligue y where y.ligue_id=p_ligue_id and y.user_id=dm.accepteur_id)
  ), feed_limited as (
    select * from feed_base where moment is not null order by moment desc limit 24
  )
  select jsonb_build_object(
    'ligue', (select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'createur_id',l.createur_id,'nb_membres',(select count(*) from public.membres_ligue ml where ml.ligue_id=l.id)) from public.ligues l where l.id=p_ligue_id),
    'classement', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'pseudo',r.pseudo,'tag_favori',r.tag_favori,'frags',r.frags,'pronostics_regles',r.pronostics_regles,'pronostics_gagnes',r.pronostics_gagnes,'rang',r.rang,'rang_7j',r.rang_7j,'mouvement',r.rang_7j-r.rang,'net_7j',r.net_7j,'moi',r.id=v_moi) order by r.rang) from ranked r),'[]'::jsonb),
    'moi', (select to_jsonb(me) || jsonb_build_object('mouvement',rang_7j-rang) from me),
    'cible', (select to_jsonb(target) || jsonb_build_object('ecart',target.frags-(select frags from me)) from target),
    'poursuivant', (select to_jsonb(pursuer) || jsonb_build_object('ecart',(select frags from me)-pursuer.frags) from pursuer),
    'matchs', coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'jeu',u.jeu,'format',u.format,'debut',u.debut,'evenement',u.evenement,'equipe_a',u.equipe_a,'equipe_b',u.equipe_b,'tag_a',u.tag_a,'tag_b',u.tag_b,'participants',u.participants,'mon_choix',u.mon_choix,'choix_a',case when u.mon_choix is not null then u.choix_a_brut else null end,'choix_b',case when u.mon_choix is not null then u.choix_b_brut else null end,'cible_choix',case when u.mon_choix is not null then u.cible_choix else null end) order by u.debut) from upcoming_base u),'[]'::jsonb),
    'rivalites', coalesce((select jsonb_agg(jsonb_build_object('joueur_a_id',dp.p1,'joueur_a',(select p.pseudo from public.profils p where p.id=dp.p1),'score_a',dp.p1_wins,'joueur_b_id',dp.p2,'joueur_b',(select p.pseudo from public.profils p where p.id=dp.p2),'score_b',dp.p2_wins,'duels',dp.duels,'dernier_duel',dp.dernier_duel,'moi',v_moi in (dp.p1,dp.p2)) order by dp.duels desc,dp.dernier_duel desc) from duel_pairs dp),'[]'::jsonb),
    'feed', coalesce((select jsonb_agg(jsonb_build_object('event_key',f.event_key,'type',f.type,'moment',f.moment,'acteur_id',f.acteur_id,'acteur_pseudo',f.acteur_pseudo,'payload',f.payload,'reactions',coalesce((select jsonb_object_agg(rr.reaction,rr.n) from (select lr.reaction,count(*)::integer n from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=f.event_key group by lr.reaction) rr),'{}'::jsonb),'ma_reaction',(select lr.reaction from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=f.event_key and lr.user_id=v_moi limit 1)) order by f.moment desc) from feed_limited f),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.clutch_reagir_ligue_v1(p_ligue_id uuid,p_event_key text,p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_event text := trim(coalesce(p_event_key,''));
  v_reaction text := lower(trim(coalesce(p_reaction,'')));
  v_current text;
  v_exists boolean := false;
  v_counts jsonb;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode='28000'; end if;
  if not exists(select 1 from public.membres_ligue ml where ml.ligue_id=p_ligue_id and ml.user_id=v_moi) then raise exception 'tu ne fais pas partie de cette ligue' using errcode='42501'; end if;
  if v_reaction not in ('fire','eyes','skull','w','l') then raise exception 'reaction invalide' using errcode='22023'; end if;
  if length(v_event)<1 or length(v_event)>180 then raise exception 'evenement invalide' using errcode='22023'; end if;

  if v_event like 'prono:%' then
    select exists(select 1 from public.pronostics_classes p join public.membres_ligue ml on ml.user_id=p.user_id and ml.ligue_id=p_ligue_id where 'prono:'||p.id::text=v_event) into v_exists;
  elsif v_event like 'join:%' then
    select exists(select 1 from public.membres_ligue ml where ml.ligue_id=p_ligue_id and 'join:'||ml.user_id::text=v_event) into v_exists;
  elsif v_event like 'duel:%' then
    select exists(select 1 from public.defis_match d where 'duel:'||d.token=v_event and exists(select 1 from public.membres_ligue a where a.ligue_id=p_ligue_id and a.user_id=d.createur_id) and exists(select 1 from public.membres_ligue b where b.ligue_id=p_ligue_id and b.user_id=d.accepteur_id)) into v_exists;
  end if;
  if not v_exists then raise exception 'evenement introuvable dans cette ligue' using errcode='P0002'; end if;

  select lr.reaction into v_current from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=v_event and lr.user_id=v_moi;
  if v_current=v_reaction then
    delete from public.ligue_reactions where ligue_id=p_ligue_id and event_key=v_event and user_id=v_moi;
    v_current:=null;
  else
    insert into public.ligue_reactions(ligue_id,event_key,user_id,reaction) values(p_ligue_id,v_event,v_moi,v_reaction)
    on conflict(ligue_id,event_key,user_id) do update set reaction=excluded.reaction,maj_le=now();
    v_current:=v_reaction;
  end if;
  select coalesce(jsonb_object_agg(x.reaction,x.n),'{}'::jsonb) into v_counts from (select lr.reaction,count(*)::integer n from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=v_event group by lr.reaction) x;
  return jsonb_build_object('event_key',v_event,'ma_reaction',v_current,'reactions',v_counts);
end;
$$;

revoke execute on function public.clutch_ligue_public(text) from public;
revoke execute on function public.clutch_ligue_dashboard_v1(uuid,text) from public, anon;
revoke execute on function public.clutch_reagir_ligue_v1(uuid,text,text) from public, anon;
grant execute on function public.clutch_ligue_public(text) to anon, authenticated;
grant execute on function public.clutch_ligue_dashboard_v1(uuid,text) to authenticated;
grant execute on function public.clutch_reagir_ligue_v1(uuid,text,text) to authenticated;

-- =====================================================================
-- Legacy source: supabase/39_phase10_league_indexes.sql
-- =====================================================================
-- Phase 10 hardening: indexes for league creator/member lookup paths.
create index if not exists ligues_createur_idx on public.ligues(createur_id);
create index if not exists membres_ligue_user_idx on public.membres_ligue(user_id);

-- =====================================================================
-- Legacy source: supabase/42_phase11_community_mobile.sql
-- =====================================================================
-- Phase 11 — Community mobile-first dashboard.
-- Progression remains supporter-based. Pronostics are activity context only.

create or replace function public.clutch_communaute_dashboard_v4()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with effectifs as (
  select e.id as equipe_id, count(p.id)::integer as membres
  from public.equipes e left join public.profils p on p.equipe_favorite_id=e.id
  group by e.id
), croissance as (
  select m.equipe_id,
    coalesce(sum(m.delta) filter(where m.cree_le>=now()-interval '24 hours'),0)::integer as croissance_24h,
    coalesce(sum(m.delta) filter(where m.cree_le>=now()-interval '7 days'),0)::integer as croissance_7j
  from public.communaute_mouvements m group by m.equipe_id
), moi as (
  select p.id,p.pseudo,p.equipe_favorite_id,coalesce(p.equipe_favorite_rejointe_le,p.cree_le) as membre_depuis
  from public.profils p where p.id=auth.uid()
), factions as (
  select e.id as equipe_id,e.nom,e.tag,e.jeu,e.logo,ef.membres,
    coalesce(ce.niveau_atteint,1)::integer as niveau_atteint,
    coalesce(c.croissance_24h,0) as croissance_24h,coalesce(c.croissance_7j,0) as croissance_7j,
    (m.equipe_favorite_id=e.id) as moi,
    lm.id as dernier_evenement_id,lm.niveau as dernier_evenement_niveau,lm.nom as dernier_evenement_nom,
    lm.cree_le as dernier_evenement_le,coalesce(lm.recompense_volts,0) as dernier_evenement_recompense_volts
  from public.equipes e
  join effectifs ef on ef.equipe_id=e.id
  left join public.communaute_etat ce on ce.equipe_id=e.id
  left join croissance c on c.equipe_id=e.id
  left join moi m on true
  left join lateral (
    select cm.id,cm.niveau,cm.nom,cm.cree_le,cm.recompense_volts
    from public.communaute_mutations cm where cm.equipe_id=e.id order by cm.cree_le desc limit 1
  ) lm on true
  where ef.membres>0
), activite_membres as (
  select p.id,p.pseudo,p.equipe_favorite_id,
    count(pc.id) filter(where pc.cree_le>=now()-interval '7 days')::integer as pronos_7j,
    count(pc.id) filter(where pc.regle_le>=now()-interval '7 days' and pc.statut='gagne')::integer as gagnes_7j,
    coalesce(sum(pc.delta_frags) filter(where pc.regle_le>=now()-interval '7 days' and pc.statut in('gagne','perdu')),0)::integer as delta_frags_7j
  from public.profils p left join public.pronostics_classes pc on pc.user_id=p.id
  where p.equipe_favorite_id is not null group by p.id,p.pseudo,p.equipe_favorite_id
), activite_classee as (
  select a.*,
    row_number() over(partition by a.equipe_favorite_id order by a.pronos_7j desc,a.gagnes_7j desc,a.delta_frags_7j desc,a.pseudo asc)::integer as rang_activite,
    count(*) over(partition by a.equipe_favorite_id)::integer as total_activite
  from activite_membres a
), detail_moi as (
  select jsonb_build_object(
    'user_id',m.id,'pseudo',m.pseudo,'equipe_id',m.equipe_favorite_id,'membre_depuis',m.membre_depuis,
    'pronos_depuis',(select count(*) from public.pronostics_classes pc where pc.user_id=m.id and pc.cree_le>=m.membre_depuis),
    'mutations_vecues',(select count(*) from public.communaute_mutations cm where cm.equipe_id=m.equipe_favorite_id and cm.cree_le>=m.membre_depuis),
    'pronos_7j',coalesce(a.pronos_7j,0),'gagnes_7j',coalesce(a.gagnes_7j,0),'delta_frags_7j',coalesce(a.delta_frags_7j,0),
    'rang_activite',a.rang_activite,'total_activite',a.total_activite,
    'top_activite',coalesce((select jsonb_agg(jsonb_build_object('user_id',x.id,'pseudo',x.pseudo,'pronos_7j',x.pronos_7j,'gagnes_7j',x.gagnes_7j,'rang',x.rang_activite) order by x.rang_activite) from activite_classee x where x.equipe_favorite_id=m.equipe_favorite_id and x.rang_activite<=5),'[]'::jsonb),
    'archives',coalesce((select jsonb_agg(jsonb_build_object('id',cm.id,'niveau',cm.niveau,'nom',cm.nom,'seuil',cm.seuil,'recompense_volts',cm.recompense_volts,'membres',cm.membres_au_moment,'cree_le',cm.cree_le) order by cm.cree_le asc) from public.communaute_mutations cm where cm.equipe_id=m.equipe_favorite_id),'[]'::jsonb)
  ) as data
  from moi m left join activite_classee a on a.id=m.id
)
select jsonb_build_object(
  'factions',coalesce((select jsonb_agg(to_jsonb(f) order by f.croissance_24h desc,f.croissance_7j desc,f.membres desc,f.nom asc) from factions f),'[]'::jsonb),
  'moi',(select data from detail_moi)
);
$$;

revoke execute on function public.clutch_communaute_dashboard_v4() from public;
grant execute on function public.clutch_communaute_dashboard_v4() to anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/43_phase12_public_profiles.sql
-- =====================================================================
-- Phase 12 — public player profiles / identity layer

alter table public.profils
  add column if not exists profil_public boolean not null default true;

create unique index if not exists profils_pseudo_lower_unique
  on public.profils (lower(pseudo));

create or replace function private.clutch_recap_badges_user_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with mes_pronos as (
  select p.*, m.jeu, m.debut as match_debut
  from public.pronostics_classes p
  join public.matchs m on m.id = p.match_id
  where p.user_id = p_user and p.statut in ('gagne','perdu')
),
chrono as (
  select mp.*,
         row_number() over(order by cree_le,id)
         - row_number() over(partition by statut order by cree_le,id) as groupe
  from mes_pronos mp
),
series_gagnees as (
  select groupe,count(*) as longueur from chrono where statut='gagne' group by groupe
),
par_jeu as (
  select jeu,count(*) as n,
         count(*) filter(where statut='gagne') as gagnes,
         round(count(*) filter(where statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
  from mes_pronos where jeu is not null group by jeu
),
outsiders_par_semaine as (
  select date_trunc('week',cree_le) as semaine,
         count(*) filter(where statut='gagne' and proba_figee<=0.4545455) as n
  from mes_pronos group by date_trunc('week',cree_le)
),
semaine_resultats as (
  select date_trunc('week',cree_le) as semaine,count(*) as n,bool_and(statut='gagne') as parfaite
  from mes_pronos group by date_trunc('week',cree_le)
),
semaines_actives as (
  select distinct date_trunc('week',cree_le)::date as semaine from mes_pronos
),
semaines_indexees as (
  select semaine,semaine-((row_number() over(order by semaine))::integer*7) as ancre from semaines_actives
),
series_semaines as (
  select ancre,count(*) as longueur from semaines_indexees group by ancre
),
jours_actifs as (
  select distinct cree_le::date as jour from mes_pronos
),
jours_indexes as (
  select jour,jour-(row_number() over(order by jour))::integer as ancre from jours_actifs
),
series_jours as (
  select ancre,count(*) as longueur from jours_indexes group by ancre
),
mes_ligues as (
  select l.id,l.createur_id,(select count(*) from public.membres_ligue x where x.ligue_id=l.id) as nb_membres
  from public.ligues l
  join public.membres_ligue ml on ml.ligue_id=l.id and ml.user_id=p_user
),
classements_ligue as (
  select ml.ligue_id,c.saison_id,ml.user_id,c.frags,
         count(*) over(partition by ml.ligue_id,c.saison_id) as nb_membres,
         rank() over(partition by ml.ligue_id,c.saison_id order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,ml.user_id) as rang
  from public.membres_ligue ml
  join public.classements_frags c on c.user_id=ml.user_id
  join public.saisons s on s.id=c.saison_id
  where s.fin<now()
),
mon_classement as (select * from classements_ligue where user_id=p_user),
mon_profil as (select equipe_favorite_id,est_fondateur from public.profils where id=p_user)
select jsonb_build_object(
  'paris',(select count(*) from mes_pronos),
  'gagnes',(select count(*) from mes_pronos where statut='gagne'),
  'precision_pct',(select case when count(*)=0 then 0 else round(count(*) filter(where statut='gagne')::numeric/count(*)*100,1) end from mes_pronos),
  'plus_longue_serie',(select coalesce(max(longueur),0) from series_gagnees),
  'jours_actifs',(select count(*) from jours_actifs),
  'serie_jours_actifs_max',(select coalesce(max(longueur),0) from series_jours),
  'saisons_jouees',(select count(distinct saison_id) from mes_pronos),
  'jeux_joues',(select count(*) from par_jeu),
  'paris_jeu_max',(select coalesce(max(n),0) from par_jeu),
  'proba_min_gagnee',(select coalesce(min(proba_figee),1) from mes_pronos where statut='gagne'),
  'outsiders_220_meme_semaine_max',(select coalesce(max(n),0) from outsiders_par_semaine),
  'outsiders_250_gagnes',(select count(*) from mes_pronos where statut='gagne' and proba_figee<=0.40),
  'meilleure_precision_jeu_30',(select coalesce(max(precision),0) from par_jeu where n>=30),
  'plus_longue_serie_semaines',(select coalesce(max(longueur),0) from series_semaines),
  'semaine_parfaite',exists(select 1 from semaine_resultats where n>=5 and parfaite),
  'calls_gagnes',(select count(*) from public.calls where user_id=p_user and statut='gagne'),
  'ligues_creees',(select count(*) from mes_ligues where createur_id=p_user),
  'ligues_rejointes',(select count(*) from mes_ligues),
  'plus_grande_ligue',(select coalesce(max(nb_membres),0) from mes_ligues),
  'a_equipe_favorite',(select equipe_favorite_id is not null from mon_profil),
  'est_fondateur',(select coalesce(est_fondateur,false) from mon_profil),
  'top10_ligue_20',exists(select 1 from mon_classement where nb_membres>=20 and rang<=10),
  'podium_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang<=3),
  'roi_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang=1),
  'a_devance_ami',exists(
    select 1 from mon_classement moi
    join classements_ligue ami on ami.ligue_id=moi.ligue_id and ami.saison_id=moi.saison_id and ami.user_id<>moi.user_id
    join public.amities am on am.statut='acceptee' and ((am.a=p_user and am.b=ami.user_id) or (am.b=p_user and am.a=ami.user_id))
    where moi.frags>ami.frags
  ),
  'communaute_membres',(select case when equipe_favorite_id is null then 0 else (select count(*) from public.profils p2 where p2.equipe_favorite_id=mon_profil.equipe_favorite_id) end from mon_profil),
  'rating_frags_max',(select coalesce(max(pic_frags),1000) from public.classements_frags where user_id=p_user),
  'secrets_obtenus',coalesce((select jsonb_agg(cle order by obtenu_le) from public.badges_secrets_obtenus where user_id=p_user),'[]'::jsonb)
);
$$;

revoke execute on function private.clutch_recap_badges_user_v1(uuid) from public, anon, authenticated;

create or replace function public.clutch_profil_public_v1(p_pseudo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target public.profils%rowtype;
  v_viewer uuid := auth.uid();
  v_saison record;
  v_classement jsonb;
  v_recap jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_best_game jsonb;
  v_conviction jsonb;
  v_streak integer := 0;
  v_supporters integer := 0;
  v_forme text := 'Fiole';
  v_forme_niveau integer := 1;
  v_ligue jsonb;
  v_rivalite jsonb;
begin
  if p_pseudo is null or length(trim(p_pseudo)) < 1 or length(trim(p_pseudo)) > 48 then return null; end if;

  select * into v_target
  from public.profils
  where lower(pseudo)=lower(trim(p_pseudo))
  limit 1;

  if not found then return null; end if;
  if not v_target.profil_public and v_viewer is distinct from v_target.id then return null; end if;

  select s.id,s.nom,s.debut,s.fin into v_saison
  from public.saisons s
  order by (s.debut<=now() and s.fin>now()) desc, s.debut desc
  limit 1;

  if v_saison.id is not null then
    with ranked as (
      select c.user_id,c.frags,c.pronostics_regles,c.pronostics_gagnes,c.pic_frags,
             row_number() over(order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,c.user_id) as rang
      from public.classements_frags c
      where c.saison_id=v_saison.id
    )
    select jsonb_build_object(
      'saison_id',v_saison.id,'saison_nom',v_saison.nom,
      'frags',coalesce(r.frags,1000),'rang',r.rang,
      'pronostics_regles',coalesce(r.pronostics_regles,0),
      'pronostics_gagnes',coalesce(r.pronostics_gagnes,0),
      'pic_frags',coalesce(r.pic_frags,1000)
    ) into v_classement
    from ranked r where r.user_id=v_target.id;
  end if;

  if v_classement is null then
    v_classement := jsonb_build_object('saison_id',v_saison.id,'saison_nom',v_saison.nom,'frags',1000,'rang',null,'pronostics_regles',0,'pronostics_gagnes',0,'pic_frags',1000);
  end if;

  v_recap := private.clutch_recap_badges_user_v1(v_target.id);

  select coalesce(jsonb_agg(to_jsonb(q) order by q.regle_le desc nulls last, q.cree_le desc), '[]'::jsonb)
  into v_recent
  from (
    select p.id,p.match_id,p.statut,p.choix,p.conviction,p.delta_frags,p.cree_le,p.regle_le,
           m.jeu,m.evenement,m.equipe_a,m.equipe_b,m.tag_a,m.tag_b,m.score_a,m.score_b
    from public.pronostics_classes p
    join public.v_matchs m on m.id=p.match_id
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
    order by p.regle_le desc nulls last,p.cree_le desc,p.id desc
    limit 5
  ) q;

  select jsonb_build_object('jeu',x.jeu,'pronostics',x.n,'gagnes',x.gagnes,'precision_pct',x.precision)
  into v_best_game
  from (
    select m.jeu,count(*) as n,count(*) filter(where p.statut='gagne') as gagnes,
           round(count(*) filter(where p.statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
    from public.pronostics_classes p
    join public.matchs m on m.id=p.match_id
    where p.user_id=v_target.id and p.statut in ('gagne','perdu') and m.jeu is not null
    group by m.jeu
    order by count(*) desc, precision desc, m.jeu
    limit 1
  ) x;

  select jsonb_build_object('conviction',x.conviction,'pronostics',x.n)
  into v_conviction
  from (
    select p.conviction,count(*) as n
    from public.pronostics_classes p
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
    group by p.conviction
    order by count(*) desc,p.conviction
    limit 1
  ) x;

  with ordered as (
    select p.statut,row_number() over(order by p.regle_le desc nulls last,p.cree_le desc,p.id desc) as rn
    from public.pronostics_classes p
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
  ), first_loss as (
    select min(rn) as rn from ordered where statut='perdu'
  )
  select count(*)::integer into v_streak
  from ordered, first_loss
  where ordered.statut='gagne' and ordered.rn < coalesce(first_loss.rn,2147483647);

  if v_target.equipe_favorite_id is not null then
    select count(*)::integer into v_supporters from public.profils where equipe_favorite_id=v_target.equipe_favorite_id;
    if v_supporters >= 5000 then v_forme:='Océan'; v_forme_niveau:=7;
    elsif v_supporters >= 1000 then v_forme:='Cornue'; v_forme_niveau:=6;
    elsif v_supporters >= 500 then v_forme:='Alambic'; v_forme_niveau:=5;
    elsif v_supporters >= 100 then v_forme:='Calice'; v_forme_niveau:=4;
    elsif v_supporters >= 50 then v_forme:='Bombonne'; v_forme_niveau:=3;
    elsif v_supporters >= 10 then v_forme:='Flacon'; v_forme_niveau:=2;
    end if;
  end if;

  if v_viewer is not null then
    select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'membres',count(*) over(partition by l.id))
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    join public.membres_ligue allm on allm.ligue_id=l.id
    where mt.user_id=v_target.id
    group by l.id,l.nom,l.code,mt.rejoint_le
    order by count(allm.user_id) desc,mt.rejoint_le desc
    limit 1;

    if v_viewer <> v_target.id then
      with duels as (
        select d.*,pc.statut as createur_statut,pa.statut as accepteur_statut
        from public.defis_match d
        join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
        join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
        where d.statut='termine'
          and ((d.createur_id=v_target.id and d.accepteur_id=v_viewer) or (d.createur_id=v_viewer and d.accepteur_id=v_target.id))
      ), counts as (
        select count(*) filter(where (createur_id=v_target.id and createur_statut='gagne') or (accepteur_id=v_target.id and accepteur_statut='gagne')) as target_wins,
               count(*) filter(where (createur_id=v_viewer and createur_statut='gagne') or (accepteur_id=v_viewer and accepteur_statut='gagne')) as viewer_wins,
               count(*) as total
        from duels
      ), last_duel as (
        select d.token,d.match_id,d.termine_le,m.tag_a,m.tag_b,m.score_a,m.score_b
        from duels d join public.v_matchs m on m.id=d.match_id
        order by d.termine_le desc nulls last limit 1
      )
      select case when c.total=0 then null else jsonb_build_object(
        'target_wins',c.target_wins,'viewer_wins',c.viewer_wins,'total',c.total,
        'dernier',case when ld.token is null then null else jsonb_build_object('token',ld.token,'match_id',ld.match_id,'termine_le',ld.termine_le,'tag_a',ld.tag_a,'tag_b',ld.tag_b,'score_a',ld.score_a,'score_b',ld.score_b) end
      ) end
      into v_rivalite
      from counts c left join last_duel ld on true;
    end if;
  end if;

  return jsonb_build_object(
    'pseudo',v_target.pseudo,
    'cree_le',v_target.cree_le,
    'titre_profil',v_target.titre_profil,
    'est_fondateur',v_target.est_fondateur,
    'profil_public',v_target.profil_public,
    'badge_vedette',v_target.badge_vedette,
    'badges_exposes',coalesce(to_jsonb(v_target.badges_exposes),'[]'::jsonb),
    'arsenal_exposes',coalesce(to_jsonb(v_target.arsenal_exposes),'[]'::jsonb),
    'classement',v_classement,
    'recap',v_recap,
    'serie_actuelle',coalesce(v_streak,0),
    'meilleur_jeu',v_best_game,
    'conviction_preferee',v_conviction,
    'forme_recente',v_recent,
    'equipe_favorite',case when v_target.equipe_favorite_id is null then null else (
      select jsonb_build_object('id',e.id,'nom',e.nom,'tag',e.tag,'jeu',e.jeu,'logo',e.logo,'supporters',v_supporters,'relique',v_forme,'relique_niveau',v_forme_niveau)
      from public.equipes e where e.id=v_target.equipe_favorite_id
    ) end,
    'viewer',case when v_viewer is null then null else jsonb_build_object('est_moi',v_viewer=v_target.id,'ligue_commune',v_ligue,'rivalite',v_rivalite) end
  );
end;
$$;

revoke execute on function public.clutch_profil_public_v1(text) from public;
grant execute on function public.clutch_profil_public_v1(text) to anon, authenticated;

create or replace function public.clutch_regler_visibilite_profil_v1(p_public boolean)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentification requise' using errcode='28000'; end if;
  update public.profils set profil_public=coalesce(p_public,true) where id=auth.uid();
  if not found then raise exception 'profil introuvable' using errcode='P0002'; end if;
  return coalesce(p_public,true);
end;
$$;

revoke execute on function public.clutch_regler_visibilite_profil_v1(boolean) from public, anon;
grant execute on function public.clutch_regler_visibilite_profil_v1(boolean) to authenticated;

-- =====================================================================
-- Legacy source: supabase/44_phase12_public_profile_hardening.sql
-- =====================================================================
-- Phase 12 hardening — correct shared league member count without exposing private league data.
do $$
declare
  v_def text;
  v_old text := $old$
    select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'membres',count(*) over(partition by l.id))
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    join public.membres_ligue allm on allm.ligue_id=l.id
    where mt.user_id=v_target.id
    group by l.id,l.nom,l.code,mt.rejoint_le
    order by count(allm.user_id) desc,mt.rejoint_le desc
    limit 1;
$old$;
  v_new text := $new$
    select jsonb_build_object(
      'id',l.id,
      'nom',l.nom,
      'code',l.code,
      'membres',(select count(*) from public.membres_ligue lm_count where lm_count.ligue_id=l.id)
    )
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    where mt.user_id=v_target.id
    order by (select count(*) from public.membres_ligue lm_count where lm_count.ligue_id=l.id) desc,mt.rejoint_le desc
    limit 1;
$new$;
begin
  select pg_get_functiondef('public.clutch_profil_public_v1(text)'::regprocedure) into v_def;
  if strpos(v_def,v_old)=0 then
    raise exception 'Phase 12 profile function shape changed; hardening patch not applied';
  end if;
  execute replace(v_def,v_old,v_new);
end $$;


-- =====================================================================
-- Legacy source: supabase/45_phase13_friend_quests.sql
-- =====================================================================
-- Phase 13 — Friend Quests
-- Social retention built from real friends, predictions, duels and leagues.
-- Rewards: XP + Volts only. This migration never credits or debits Frags.

alter table public.volts_mouvements drop constraint if exists volts_mouvements_origine_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
  check (origine = any (array['badge','saison','call','achat','ajustement','pari','faction','friend_quest']::text[]));

create table if not exists public.friend_quests (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profils(id) on delete cascade,
  user_b uuid not null references public.profils(id) on delete cascade,
  owner_id uuid not null references public.profils(id) on delete cascade,
  type text not null check (type in ('duo_calls','same_side','opposition','duel','revenge','league_push')),
  match_id text references public.matchs(id) on delete set null,
  league_id uuid references public.ligues(id) on delete set null,
  objectif integer not null check (objectif > 0),
  progression integer not null default 0 check (progression >= 0),
  recompense_xp integer not null default 0 check (recompense_xp >= 0),
  recompense_volts integer not null default 0 check (recompense_volts >= 0),
  statut text not null default 'active' check (statut in ('active','terminee','ratee','expiree')),
  cle text not null unique,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null,
  terminee_le timestamptz,
  revele_a_le timestamptz,
  revele_b_le timestamptz,
  check (user_a < user_b),
  check (owner_id = user_a or owner_id = user_b),
  check (expire_le > cree_le)
);

create index if not exists friend_quests_user_a_active_idx on public.friend_quests(user_a, statut, expire_le desc);
create index if not exists friend_quests_user_b_active_idx on public.friend_quests(user_b, statut, expire_le desc);
create index if not exists friend_quests_pair_history_idx on public.friend_quests(user_a, user_b, terminee_le desc);
create index if not exists friend_quests_match_idx on public.friend_quests(match_id) where match_id is not null;
create index if not exists friend_quests_league_idx on public.friend_quests(league_id) where league_id is not null;

alter table public.friend_quests enable row level security;
revoke all on public.friend_quests from anon, authenticated;

create table if not exists public.friend_duo_stats (
  user_a uuid not null references public.profils(id) on delete cascade,
  user_b uuid not null references public.profils(id) on delete cascade,
  missions_terminees integer not null default 0 check (missions_terminees >= 0),
  serie_semaines integer not null default 0 check (serie_semaines >= 0),
  semaine_derniere date,
  maj_le timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.friend_duo_stats enable row level security;
revoke all on public.friend_duo_stats from anon, authenticated;

create or replace function private.clutch_friend_quest_refresh_one(p_quest uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.friend_quests%rowtype;
  v_progress integer := 0;
  v_a integer := 0;
  v_b integer := 0;
  v_choice_a text;
  v_choice_b text;
  v_complete boolean := false;
  v_fail boolean := false;
  v_week date := date_trunc('week', now() at time zone 'Europe/Paris')::date;
begin
  select * into q from public.friend_quests where id=p_quest for update;
  if not found or q.statut <> 'active' then return; end if;

  if q.expire_le <= now() then
    update public.friend_quests set statut='expiree' where id=q.id and statut='active';
    return;
  end if;

  if q.type='duo_calls' then
    select count(*)::integer into v_a from public.pronostics_classes where user_id=q.user_a and cree_le>=q.cree_le;
    select count(*)::integer into v_b from public.pronostics_classes where user_id=q.user_b and cree_le>=q.cree_le;
    v_progress := least(q.objectif, v_a+v_b);
    v_complete := v_progress>=q.objectif and v_a>0 and v_b>0;
  elsif q.type in ('same_side','opposition') then
    select choix into v_choice_a from public.pronostics_classes where user_id=q.user_a and match_id=q.match_id order by cree_le desc limit 1;
    select choix into v_choice_b from public.pronostics_classes where user_id=q.user_b and match_id=q.match_id order by cree_le desc limit 1;
    v_progress := (case when v_choice_a is null then 0 else 1 end) + (case when v_choice_b is null then 0 else 1 end);
    if v_choice_a is not null and v_choice_b is not null then
      if q.type='same_side' then v_complete := v_choice_a=v_choice_b; else v_complete := v_choice_a<>v_choice_b; end if;
      v_fail := not v_complete;
    end if;
  elsif q.type='duel' then
    select count(*)::integer into v_progress
    from public.defis_match d
    where d.statut='termine' and d.termine_le>=q.cree_le
      and ((d.createur_id=q.user_a and d.accepteur_id=q.user_b) or (d.createur_id=q.user_b and d.accepteur_id=q.user_a));
    v_progress := least(1,v_progress);
    v_complete := v_progress>=1;
  elsif q.type='revenge' then
    select count(*)::integer into v_progress
    from public.defis_match d
    join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
    join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
    where d.statut='termine' and d.termine_le>=q.cree_le
      and ((d.createur_id=q.owner_id and d.accepteur_id=case when q.owner_id=q.user_a then q.user_b else q.user_a end and pc.statut='gagne')
        or (d.accepteur_id=q.owner_id and d.createur_id=case when q.owner_id=q.user_a then q.user_b else q.user_a end and pa.statut='gagne'));
    v_progress := least(1,v_progress);
    v_complete := v_progress>=1;
  elsif q.type='league_push' then
    select coalesce(sum(greatest(coalesce(delta_frags,0),0)),0)::integer into v_progress
    from public.pronostics_classes
    where user_id in (q.user_a,q.user_b) and regle_le>=q.cree_le and statut in ('gagne','perdu');
    v_progress := least(q.objectif,v_progress);
    v_complete := v_progress>=q.objectif;
  end if;

  update public.friend_quests set progression=v_progress where id=q.id;

  if v_fail then
    update public.friend_quests set statut='ratee', progression=v_progress, terminee_le=now() where id=q.id and statut='active';
    return;
  end if;
  if not v_complete then return; end if;

  update public.friend_quests
     set statut='terminee', progression=objectif, terminee_le=now()
   where id=q.id and statut='active';
  if not found then return; end if;

  if q.recompense_volts>0 then
    perform public.clutch_crediter_volts(q.user_a,q.recompense_volts,'friend_quest',q.id::text);
    perform public.clutch_crediter_volts(q.user_b,q.recompense_volts,'friend_quest',q.id::text);
  end if;

  insert into public.friend_duo_stats(user_a,user_b,missions_terminees,serie_semaines,semaine_derniere,maj_le)
  values(q.user_a,q.user_b,1,1,v_week,now())
  on conflict(user_a,user_b) do update set
    missions_terminees=public.friend_duo_stats.missions_terminees+1,
    serie_semaines=case
      when public.friend_duo_stats.semaine_derniere=excluded.semaine_derniere then public.friend_duo_stats.serie_semaines
      when public.friend_duo_stats.semaine_derniere=excluded.semaine_derniere-7 then public.friend_duo_stats.serie_semaines+1
      else 1 end,
    semaine_derniere=excluded.semaine_derniere,
    maj_le=now();
end;
$$;
revoke execute on function private.clutch_friend_quest_refresh_one(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_refresh_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  for r in select id from public.friend_quests where statut='active' and (user_a=p_user or user_b=p_user)
  loop perform private.clutch_friend_quest_refresh_one(r.id); end loop;
end;
$$;
revoke execute on function private.clutch_friend_quests_refresh_user(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_ensure(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active integer;
  v_friend1 uuid;
  v_friend2 uuid;
  v_friend3 uuid;
  v_other uuid;
  v_a uuid;
  v_b uuid;
  v_day date := (now() at time zone 'Europe/Paris')::date;
  v_day_end timestamptz := ((now() at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris';
  v_match record;
  v_league uuid;
  v_last record;
  v_type text;
  v_key text;
  v_expire timestamptz;
begin
  if p_user is null then return; end if;
  perform private.clutch_friend_quests_refresh_user(p_user);
  update public.friend_quests set statut='expiree' where statut='active' and expire_le<=now() and (user_a=p_user or user_b=p_user);

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);
  if v_active>=3 then return; end if;

  with friends as (
    select case when a=p_user then b else a end as friend_id,
           row_number() over(order by coalesce((select max(d.termine_le) from public.defis_match d where d.statut='termine' and ((d.createur_id=p_user and d.accepteur_id=case when am.a=p_user then am.b else am.a end) or (d.accepteur_id=p_user and d.createur_id=case when am.a=p_user then am.b else am.a end))),am.repondu_le,am.cree_le) desc, case when a=p_user then b else a end) rn
    from public.amities am where statut='acceptee' and (a=p_user or b=p_user)
  )
  select (max(friend_id::text) filter(where rn=1))::uuid,
         (max(friend_id::text) filter(where rn=2))::uuid,
         (max(friend_id::text) filter(where rn=3))::uuid
  into v_friend1,v_friend2,v_friend3 from friends;
  if v_friend1 is null then return; end if;
  v_friend2:=coalesce(v_friend2,v_friend1); v_friend3:=coalesce(v_friend3,v_friend2,v_friend1);

  if v_active<3 then
    v_other:=v_friend1; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select d.termine_le,
           case when (d.createur_id=p_user and pc.statut='perdu') or (d.accepteur_id=p_user and pa.statut='perdu') then true else false end as lost
    into v_last
    from public.defis_match d
    join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
    join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
    where d.statut='termine' and ((d.createur_id=p_user and d.accepteur_id=v_other) or (d.accepteur_id=p_user and d.createur_id=v_other))
    order by d.termine_le desc nulls last limit 1;
    if v_last.lost is true then
      v_type:='revenge'; v_key:='revenge|'||v_day||'|'||p_user||'|'||v_other; v_expire:=now()+interval '48 hours';
      insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,v_type,1,140,40,v_key,v_expire) on conflict(cle) do nothing;
    else
      v_type:='duo_calls'; v_key:='duo|'||v_day||'|'||v_a||'|'||v_b; v_expire:=v_day_end;
      if v_expire>now()+interval '30 minutes' then
        insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
        values(v_a,v_b,p_user,v_type,3,100,25,v_key,v_expire) on conflict(cle) do nothing;
      end if;
    end if;
  end if;

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);

  if v_active<3 then
    v_other:=v_friend2; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select m.id,m.debut into v_match
    from public.matchs m
    where m.statut='a_venir' and m.debut>now()+interval '15 minutes' and m.debut<now()+interval '36 hours'
      and not exists(select 1 from public.pronostics_classes p where p.user_id=p_user and p.match_id=m.id)
    order by m.debut asc,m.id limit 1;
    if v_match.id is not null then
      v_type:=case when mod(abs(hashtext(v_a::text||v_b::text||v_day::text)),2)=0 then 'same_side' else 'opposition' end;
      v_key:=v_type||'|'||v_day||'|'||v_a||'|'||v_b||'|'||v_match.id;
      v_expire:=least(v_day_end,v_match.debut-interval '5 minutes');
      if v_expire>now()+interval '10 minutes' then
        insert into public.friend_quests(user_a,user_b,owner_id,type,match_id,objectif,recompense_xp,recompense_volts,cle,expire_le)
        values(v_a,v_b,p_user,v_type,v_match.id,2,120,30,v_key,v_expire) on conflict(cle) do nothing;
      end if;
    end if;
  end if;

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);

  if v_active<3 then
    v_other:=v_friend3; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select ml1.ligue_id into v_league
    from public.membres_ligue ml1 join public.membres_ligue ml2 on ml2.ligue_id=ml1.ligue_id and ml2.user_id=v_other
    where ml1.user_id=p_user order by ml1.rejoint_le desc limit 1;
    if v_league is not null and v_day_end>now()+interval '30 minutes' then
      v_key:='league|'||v_day||'|'||v_a||'|'||v_b||'|'||v_league;
      insert into public.friend_quests(user_a,user_b,owner_id,type,league_id,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,'league_push',v_league,60,140,40,v_key,v_day_end) on conflict(cle) do nothing;
    else
      v_key:='duel|'||v_day||'|'||v_a||'|'||v_b;
      insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,'duel',1,110,25,v_key,now()+interval '48 hours') on conflict(cle) do nothing;
    end if;
  end if;
end;
$$;
revoke execute on function private.clutch_friend_quests_ensure(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_prono_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.clutch_friend_quests_refresh_user(new.user_id);
  return new;
end; $$;
revoke execute on function private.clutch_friend_quests_prono_trigger() from public, anon, authenticated;

drop trigger if exists friend_quests_prono_refresh on public.pronostics_classes;
create trigger friend_quests_prono_refresh
after insert or update of statut,delta_frags,choix on public.pronostics_classes
for each row execute function private.clutch_friend_quests_prono_trigger();

create or replace function private.clutch_friend_quests_duel_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.statut='termine' and old.statut is distinct from new.statut then
    perform private.clutch_friend_quests_refresh_user(new.createur_id);
    if new.accepteur_id is not null then perform private.clutch_friend_quests_refresh_user(new.accepteur_id); end if;
  end if;
  return new;
end; $$;
revoke execute on function private.clutch_friend_quests_duel_trigger() from public, anon, authenticated;

drop trigger if exists friend_quests_duel_refresh on public.defis_match;
create trigger friend_quests_duel_refresh
after update of statut on public.defis_match
for each row execute function private.clutch_friend_quests_duel_trigger();

create or replace function public.clutch_friend_quests_dashboard_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_active jsonb; v_history jsonb; v_reveal jsonb; v_duos jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform private.clutch_friend_quests_ensure(v_user);
  perform private.clutch_friend_quests_refresh_user(v_user);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.expire_le,x.cree_le),'[]'::jsonb) into v_active from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.statut,q.cree_le,q.expire_le,q.match_id,q.league_id,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire,
      case when q.owner_id=v_user then true else false end as mission_perso,
      case when q.match_id is null then null else jsonb_build_object('id',m.id,'jeu',m.jeu,'evenement',m.evenement,'debut',m.debut,'equipe_a',m.equipe_a,'equipe_b',m.equipe_b,'tag_a',m.tag_a,'tag_b',m.tag_b) end match,
      case when q.league_id is null then null else jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code) end ligue,
      case when q.type='duo_calls' then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.cree_le>=q.cree_le)
           when q.type in ('same_side','opposition') then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.match_id=q.match_id)
           when q.type='league_push' then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.regle_le>=q.cree_le and coalesce(pp.delta_frags,0)>0)
           else false end as moi_fait,
      case when q.type='duo_calls' then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.cree_le>=q.cree_le)
           when q.type in ('same_side','opposition') then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.match_id=q.match_id)
           when q.type='league_push' then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.regle_le>=q.cree_le and coalesce(pp.delta_frags,0)>0)
           else false end as partenaire_fait
    from public.friend_quests q
    join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    left join public.v_matchs m on m.id=q.match_id
    left join public.ligues l on l.id=q.league_id
    where q.statut='active' and q.expire_le>now() and (q.user_a=v_user or q.user_b=v_user)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.terminee_le desc),'[]'::jsonb) into v_history from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.statut,q.cree_le,q.expire_le,q.terminee_le,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire
    from public.friend_quests q join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    where q.statut in ('terminee','ratee','expiree') and (q.user_a=v_user or q.user_b=v_user)
    order by q.terminee_le desc nulls last,q.expire_le desc limit 12
  ) x;

  select to_jsonb(x) into v_reveal from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.terminee_le,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire,
      ds.missions_terminees,ds.serie_semaines
    from public.friend_quests q
    join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    left join public.friend_duo_stats ds on ds.user_a=q.user_a and ds.user_b=q.user_b
    where q.statut='terminee' and (q.user_a=v_user or q.user_b=v_user)
      and ((q.user_a=v_user and q.revele_a_le is null) or (q.user_b=v_user and q.revele_b_le is null))
    order by q.terminee_le desc limit 1
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.missions_terminees desc,x.serie_semaines desc),'[]'::jsonb) into v_duos from (
    select case when ds.user_a=v_user then ds.user_b else ds.user_a end as user_id,p.pseudo,ds.missions_terminees,ds.serie_semaines,ds.semaine_derniere
    from public.friend_duo_stats ds join public.profils p on p.id=case when ds.user_a=v_user then ds.user_b else ds.user_a end
    where ds.user_a=v_user or ds.user_b=v_user order by ds.missions_terminees desc,ds.serie_semaines desc limit 8
  ) x;

  return jsonb_build_object('actives',v_active,'historique',v_history,'a_reveler',v_reveal,'duos',v_duos);
end;
$$;
revoke execute on function public.clutch_friend_quests_dashboard_v1() from public, anon;
grant execute on function public.clutch_friend_quests_dashboard_v1() to authenticated, service_role;

create or replace function public.clutch_friend_quest_mark_revealed_v1(p_quest uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.friend_quests set
    revele_a_le=case when user_a=v_user then coalesce(revele_a_le,now()) else revele_a_le end,
    revele_b_le=case when user_b=v_user then coalesce(revele_b_le,now()) else revele_b_le end
  where id=p_quest and statut='terminee' and (user_a=v_user or user_b=v_user);
  get diagnostics v_count=row_count; return v_count>0;
end; $$;
revoke execute on function public.clutch_friend_quest_mark_revealed_v1(uuid) from public, anon;
grant execute on function public.clutch_friend_quest_mark_revealed_v1(uuid) to authenticated, service_role;

create or replace function public.clutch_mon_xp_quetes_v1()
returns integer language sql stable security definer set search_path='' as $$
  select case when auth.uid() is null then 0 else coalesce(sum(recompense_xp),0)::integer end
  from public.friend_quests where statut='terminee' and (user_a=auth.uid() or user_b=auth.uid());
$$;
revoke execute on function public.clutch_mon_xp_quetes_v1() from public, anon;
grant execute on function public.clutch_mon_xp_quetes_v1() to authenticated, service_role;

create or replace function public.clutch_xp_quetes_public_v1(p_pseudo text)
returns integer language plpgsql stable security definer set search_path='' as $$
declare v_id uuid; v_public boolean;
begin
  select id,profil_public into v_id,v_public from public.profils where lower(pseudo)=lower(trim(p_pseudo)) limit 1;
  if v_id is null then return 0; end if;
  if not v_public and auth.uid() is distinct from v_id then return 0; end if;
  return coalesce((select sum(recompense_xp)::integer from public.friend_quests where statut='terminee' and (user_a=v_id or user_b=v_id)),0);
end; $$;
revoke execute on function public.clutch_xp_quetes_public_v1(text) from public;
grant execute on function public.clutch_xp_quetes_public_v1(text) to anon, authenticated, service_role;

-- =====================================================================
-- Legacy source: supabase/46_phase13_friend_quest_xp.sql
-- =====================================================================
-- Phase 13 — Friend Quest XP is part of the existing permanent XP contract.
-- The browser keeps one progression model: recap -> xpDetailleeV2 -> level.

alter function public.recap_badges() rename to recap_badges_base_v13;

create or replace function public.recap_badges()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(public.recap_badges_base_v13(),'{}'::jsonb)
    || jsonb_build_object(
      'xp_quetes', coalesce((
        select sum(q.recompense_xp)::integer
        from public.friend_quests q
        where q.statut='terminee'
          and (q.user_a=auth.uid() or q.user_b=auth.uid())
      ),0)
    );
$$;

revoke execute on function public.recap_badges_base_v13() from public, anon, authenticated;
revoke execute on function public.recap_badges() from public, anon;
grant execute on function public.recap_badges() to authenticated, service_role;

alter function private.clutch_recap_badges_user_v1(uuid) rename to clutch_recap_badges_user_base_v13;

create or replace function private.clutch_recap_badges_user_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(private.clutch_recap_badges_user_base_v13(p_user),'{}'::jsonb)
    || jsonb_build_object(
      'xp_quetes', coalesce((
        select sum(q.recompense_xp)::integer
        from public.friend_quests q
        where q.statut='terminee'
          and (q.user_a=p_user or q.user_b=p_user)
      ),0)
    );
$$;

revoke execute on function private.clutch_recap_badges_user_base_v13(uuid) from public, anon, authenticated;
revoke execute on function private.clutch_recap_badges_user_v1(uuid) from public, anon, authenticated;

-- =====================================================================
-- Legacy source: supabase/47_phase13_friend_quest_capacity_guard.sql
-- =====================================================================
-- Hard cap: no player can receive a fourth active Friend Quest, even when
-- their partner opens another dashboard concurrently.

create or replace function private.clutch_friend_quest_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.statut='active' then
    if (select count(*) from public.friend_quests q where q.statut='active' and q.expire_le>now() and (q.user_a=new.user_a or q.user_b=new.user_a)) >= 3
       or (select count(*) from public.friend_quests q where q.statut='active' and q.expire_le>now() and (q.user_a=new.user_b or q.user_b=new.user_b)) >= 3 then
      return null;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.clutch_friend_quest_capacity_guard() from public, anon, authenticated;

drop trigger if exists friend_quests_capacity_guard on public.friend_quests;
create trigger friend_quests_capacity_guard
before insert on public.friend_quests
for each row execute function private.clutch_friend_quest_capacity_guard();

-- =====================================================================
-- Legacy source: supabase/48_phase13_xp_public_rpc_hardening.sql
-- =====================================================================
-- Phase 13 hardening: public profile XP now flows through the existing
-- profile recap contract. This standalone RPC is no longer needed by clients.

revoke execute on function public.clutch_xp_quetes_public_v1(text) from public, anon, authenticated;
grant execute on function public.clutch_xp_quetes_public_v1(text) to service_role;

-- =====================================================================
-- Legacy source: supabase/49_phase13_friend_quest_fk_indexes.sql
-- =====================================================================
-- Cover the remaining Phase 13 foreign keys reported by the Supabase advisor.

create index if not exists friend_quests_owner_idx on public.friend_quests(owner_id);
create index if not exists friend_duo_stats_user_b_idx on public.friend_duo_stats(user_b);

-- END OF PUBLIC BASELINE
