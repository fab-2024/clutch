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
  cree_le   timestamptz not null default now()
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
