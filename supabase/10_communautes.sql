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
