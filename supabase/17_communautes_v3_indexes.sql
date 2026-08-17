-- Clutch — Communautés V3 / index de hot-path
-- Ces index couvrent les deux colonnes sollicitées à chaque changement de faction :
-- comptage des membres d'une équipe et maintenance de l'historique utilisateur.

create index if not exists profils_equipe_favorite_idx
  on public.profils(equipe_favorite_id)
  where equipe_favorite_id is not null;

create index if not exists communaute_mouvements_user_idx
  on public.communaute_mouvements(user_id)
  where user_id is not null;
