-- Clutch local development seed.
-- Derived from the historical 04_donnees.sql fixture set.
-- Applied only after migrations by supabase db reset.

-- =====================================================================
--  Clutch — données de départ : saisons, équipes, compétitions, calendrier.
--  Les dates sont relatives à l exécution du script (now() + N heures),
--  ce qui donne un calendrier crédible dès la première ouverture.
-- =====================================================================

insert into saisons (id, nom, debut, fin, solde_initial) values
  ('saison-ete-2026', 'Saison 1 — Été 2026', now() + interval '-30.0 days', now() + interval '45.0 days', 1000),
  ('saison-automne-2026', 'Saison 2 — Automne 2026', now() + interval '46.0 days', now() + interval '140.0 days', 1000)
on conflict (id) do nothing;

insert into evenements (id, jeu, nom, tier) values
  ('lec-summer', 'lol', 'LEC Summer Split', 'S'),
  ('lfl-summer', 'lol', 'LFL Summer Split', 'A'),
  ('blast-bounty', 'cs2', 'BLAST Bounty', 'S'),
  ('esl-pro', 'cs2', 'ESL Pro League', 'S'),
  ('vct-masters', 'valorant', 'VCT Masters', 'S'),
  ('vct-emea', 'valorant', 'VCT EMEA League', 'A')
on conflict (id) do nothing;

insert into equipes (id, jeu, nom, tag, elo) values
  ('lol-g2', 'lol', 'G2 Esports', 'G2', 1712),
  ('lol-kc', 'lol', 'Karmine Corp', 'KC', 1648),
  ('lol-fnc', 'lol', 'Fnatic', 'FNC', 1601),
  ('lol-mkoi', 'lol', 'Movistar KOI', 'MKOI', 1589),
  ('lol-vit', 'lol', 'Team Vitality', 'VIT', 1544),
  ('lol-bds', 'lol', 'Team BDS', 'BDS', 1498),
  ('lol-th', 'lol', 'Team Heretics', 'TH', 1455),
  ('lol-sk', 'lol', 'SK Gaming', 'SK', 1421),
  ('lol-gx', 'lol', 'GiantX', 'GX', 1398),
  ('lol-rge', 'lol', 'Rogue', 'RGE', 1472),
  ('cs-vit', 'cs2', 'Team Vitality', 'VIT', 1738),
  ('cs-navi', 'cs2', 'Natus Vincere', 'NAVI', 1665),
  ('cs-spirit', 'cs2', 'Team Spirit', 'SPR', 1691),
  ('cs-faze', 'cs2', 'FaZe Clan', 'FAZE', 1612),
  ('cs-mouz', 'cs2', 'MOUZ', 'MOUZ', 1587),
  ('cs-g2', 'cs2', 'G2 Esports', 'G2', 1573),
  ('cs-falcons', 'cs2', 'Team Falcons', 'FLC', 1541),
  ('cs-astralis', 'cs2', 'Astralis', 'AST', 1466),
  ('cs-vp', 'cs2', 'Virtus.pro', 'VP', 1489),
  ('cs-heroic', 'cs2', 'Heroic', 'HER', 1432),
  ('val-tl', 'valorant', 'Team Liquid', 'TL', 1622),
  ('val-fnc', 'valorant', 'Fnatic', 'FNC', 1704),
  ('val-kc', 'valorant', 'Karmine Corp', 'KC', 1651),
  ('val-prx', 'valorant', 'Paper Rex', 'PRX', 1683),
  ('val-sen', 'valorant', 'Sentinels', 'SEN', 1558),
  ('val-drx', 'valorant', 'DRX', 'DRX', 1596),
  ('val-g2', 'valorant', 'G2 Esports', 'G2', 1534),
  ('val-t1', 'valorant', 'T1', 'T1', 1512),
  ('val-nvg', 'valorant', 'NAVI', 'NAVI', 1478),
  ('val-edg', 'valorant', 'EDward Gaming', 'EDG', 1607)
on conflict (id) do nothing;

insert into matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut, statut, score_a, score_b) values
  ('m-fini-5', 'vct-emea', 'saison-ete-2026', 'valorant', 'val-kc', 'val-g2', 3, now() + interval '-74.00 hours', 'termine', 1, 2),
  ('m-fini-4', 'esl-pro', 'saison-ete-2026', 'cs2', 'cs-faze', 'cs-astralis', 3, now() + interval '-70.00 hours', 'termine', 2, 0),
  ('m-fini-3', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-vit', 'lol-sk', 3, now() + interval '-48.00 hours', 'termine', 2, 1),
  ('m-fini-2', 'vct-masters', 'saison-ete-2026', 'valorant', 'val-prx', 'val-sen', 3, now() + interval '-44.00 hours', 'termine', 2, 1),
  ('m-fini-1', 'blast-bounty', 'saison-ete-2026', 'cs2', 'cs-navi', 'cs-g2', 3, now() + interval '-26.00 hours', 'termine', 2, 1),
  ('m-fini-0', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-kc', 'lol-bds', 3, now() + interval '-20.00 hours', 'termine', 2, 0),
  ('m-2', 'blast-bounty', 'saison-ete-2026', 'cs2', 'cs-vit', 'cs-navi', 3, now() + interval '2.00 hours', 'a_venir', null, null),
  ('m-0', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-g2', 'lol-kc', 3, now() + interval '3.20 hours', 'a_venir', null, null),
  ('m-1', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-fnc', 'lol-vit', 3, now() + interval '5.48 hours', 'a_venir', null, null),
  ('m-3', 'vct-masters', 'saison-ete-2026', 'valorant', 'val-fnc', 'val-prx', 3, now() + interval '7.02 hours', 'a_venir', null, null),
  ('m-5', 'esl-pro', 'saison-ete-2026', 'cs2', 'cs-spirit', 'cs-faze', 3, now() + interval '24.17 hours', 'a_venir', null, null),
  ('m-4', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-mkoi', 'lol-bds', 3, now() + interval '26.20 hours', 'a_venir', null, null),
  ('m-6', 'vct-emea', 'saison-ete-2026', 'valorant', 'val-kc', 'val-tl', 3, now() + interval '28.28 hours', 'a_venir', null, null),
  ('m-7', 'lfl-summer', 'saison-ete-2026', 'lol', 'lol-th', 'lol-sk', 1, now() + interval '29.90 hours', 'a_venir', null, null),
  ('m-8', 'blast-bounty', 'saison-ete-2026', 'cs2', 'cs-mouz', 'cs-g2', 3, now() + interval '49.30 hours', 'a_venir', null, null),
  ('m-9', 'vct-masters', 'saison-ete-2026', 'valorant', 'val-drx', 'val-sen', 3, now() + interval '51.15 hours', 'a_venir', null, null),
  ('m-10', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-rge', 'lol-gx', 3, now() + interval '52.15 hours', 'a_venir', null, null),
  ('m-11', 'esl-pro', 'saison-ete-2026', 'cs2', 'cs-falcons', 'cs-astralis', 3, now() + interval '72.10 hours', 'a_venir', null, null),
  ('m-12', 'vct-emea', 'saison-ete-2026', 'valorant', 'val-g2', 'val-t1', 3, now() + interval '73.92 hours', 'a_venir', null, null),
  ('m-13', 'lec-summer', 'saison-ete-2026', 'lol', 'lol-g2', 'lol-fnc', 5, now() + interval '96.23 hours', 'a_venir', null, null),
  ('m-14', 'blast-bounty', 'saison-ete-2026', 'cs2', 'cs-vit', 'cs-spirit', 5, now() + interval '99.88 hours', 'a_venir', null, null),
  ('m-15', 'vct-masters', 'saison-ete-2026', 'valorant', 'val-edg', 'val-nvg', 3, now() + interval '119.73 hours', 'a_venir', null, null),
  ('m-16', 'lfl-summer', 'saison-ete-2026', 'lol', 'lol-kc', 'lol-vit', 3, now() + interval '121.80 hours', 'a_venir', null, null),
  ('m-17', 'esl-pro', 'saison-ete-2026', 'cs2', 'cs-vp', 'cs-heroic', 3, now() + interval '144.08 hours', 'a_venir', null, null)
on conflict (id) do nothing;

-- Les matchs déjà marqués "termine" ci-dessus ne repassent pas par regler_match(),
-- ils servent uniquement à remplir l onglet Résultats au premier lancement.
--
-- Pour ouvrir une nouvelle saison plus tard, voir la fin de 03_securite.sql.

