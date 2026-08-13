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
