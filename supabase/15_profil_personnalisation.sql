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
