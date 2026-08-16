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
