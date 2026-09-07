# Sélection des équipes proposées

La liste fournie par l'utilisateur le 7 septembre 2026 remplace la sélection
éditoriale précédente. Elle contient **30 organisations**, communes à LoL,
Valorant et Rocket League. Une organisation compte une seule fois même si elle
participe à plusieurs jeux. Ce n'est pas un classement d'audience.

| | Organisation | | Organisation |
| --- | --- | --- | --- |
| 1 | Team Vitality | 16 | Virtus.pro |
| 2 | Team Falcons | 17 | ZETA DIVISION |
| 3 | Aurora Gaming | 18 | Natus Vincere |
| 4 | FURIA | 19 | Gen.G |
| 5 | All Gamers | 20 | S2G Esports |
| 6 | eArena | 21 | Karmine Corp |
| 7 | Tianba | 22 | G2 Esports |
| 8 | Yangon Galacticos | 23 | DRX |
| 9 | Team Spirit | 24 | Team Heretics |
| 10 | ONIC Esports | 25 | NRG |
| 11 | T1 | 26 | 100 Thieves |
| 12 | Twisted Minds | 27 | FaZe Clan |
| 13 | Dplus | 28 | OpTic Gaming |
| 14 | Team Liquid | 29 | Geekay Esports |
| 15 | Weibo Gaming | 30 | Gentle Mates |

## Règle

Le Hub, les listes Matchs (à venir, en cours et résultats) et les suggestions
du détail de match lisent `v_matchs_selectionnes`. Au moins une équipe de la
confrontation doit appartenir à l'une de ces organisations. Le filtre SQL
précède le tri et la pagination. L'ordre chronologique est conservé.

Les rencontres « à venir » doivent avoir une date future ; « en cours » exige
un statut explicite du fournisseur et un début dans les dernières 24 heures.
Les anciens matchs encore ouverts attendent leur synchronisation hors du flux
de découverte, sans être artificiellement transformés en résultats.

La table `match_team_selection` contient les 30 noms, leurs alias exacts
(casse et espaces de début/fin ignorés), et les identifiants PandaScore connus
résolus depuis ces alias. Exemples : Dplus KIA, FURIA Esports, NRG Esports,
Gen.G Mobil1 Racing et G2 Stride. Aucun rapprochement par préfixe : T1 Academy,
Karmine Corp Blue, G2 NORD, etc. ne sont pas admis par simple ressemblance.
Un match avec une académie reste visible si son adversaire est sélectionné.

La présence d'un nom dans cette liste ne crée pas de matchs : une organisation
sans équipe ou sans rencontre importée dans les trois jeux ne produit aucun
résultat. Aucun nouveau jeu n'est ajouté.

Les imports PandaScore et l'historique Elo restent complets. Aucun match,
pronostic ou résultat n'est supprimé. « Mes calls », le détail par identifiant,
les règlements et l'administration utilisent toujours les données complètes.
Il s'agit d'un filtre de découverte, pas d'une restriction d'accès : un ancien
lien direct reste accessible selon les règles habituelles des calls.

## Mise à jour

Modifier la sélection par migration SQL : remplacer un slot existant pour
conserver 30 organisations, vérifier les identifiants du fournisseur et les
alias exacts. Les clients peuvent lire la table mais ne peuvent pas la modifier.
La liste n'est pas synchronisée automatiquement avec des audiences externes.

Validation : `supabase/tests/selected_teams_match_feed.sql` (inclus dans
`npm run db:verify`) et les tests des API Hub/Matchs.
