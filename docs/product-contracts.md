# Contrats produit GRIFF V1

Version : 1.2

Statut : décision produit adoptée, bascule visible GRIFF préparée

Date : 23 août 2026

Marque visible : `GRIFF`

Identifiants techniques historiques : `clutch_*`, `clutch://` et
`com.fabthetap.clutch` conservés pour compatibilité

Ce document fixe le sens des mécaniques du produit avant leur extension. Les
écrans peuvent évoluer, mais ils ne doivent pas contredire ces règles sans une
nouvelle décision produit explicite et versionnée.

Il détaille le [blueprint produit et business](./griff-blueprint.md), qui reste
la source synthétique de la direction actuelle.

## 0. Décisions du bloc A

Les décisions suivantes remplacent les passages contradictoires du blueprint
initial :

- le blueprint GRIFF est adopté comme direction produit et business ;
- la bascule visible vers `GRIFF` est préparée dans le produit ; la publication
  store et domaine reste conditionnée à la clearance externe ;
- le système Rank actuel est conservé sans changement de doctrine : rating
  saisonnier initialisé à 1 000, probabilités figées, coefficients `K=60` en
  placement puis `K=40`, gains et pertes de Frags, cinq placements et
  promotions ou rétrogradations ;
- les cinq grades `Recrue`, `Challenger`, `Élite`, `Master` et `Clutch` ainsi
  que leurs seuils V1 restent la référence ;
- la sélection hebdomadaire de calls classés et le barème cumulatif uniquement
  positif du blueprint ne font pas partie de la V1 ;
- le Loadout conserve cinq emplacements : cadre, bannière, titre, signature de
  relique et Core. Le Core est une extension identitaire assumée ;
- aucun identifiant technique `clutch_*`, bundle, package, produit IAP ou clé
  historique n'est renommé pour la bascule visible. La migration de marque
  reste additive et compatible avec les données existantes.

La recherche de nom et la stratégie de migration sont suivies dans
[le dossier de validation GRIFF](./griff-name-clearance.md) et
[la matrice Clutch vers GRIFF](./clutch-to-griff-migration-matrix.md).

### État du bloc B

- la navigation Hub, Matchs, Social, Rank et Moi est implémentée ;
- Rank orchestre le rating existant sans modifier son calcul ;
- le Hub consomme le dernier verdict, la mission de faction et la dernière
  récompense réellement possédée ;
- l'analytics de la boucle est first-party, sur consentement facultatif et sans
  métadonnée libre ;
- la déclaration 15+, le blocage, le déblocage, le signalement et les règles de
  modération sont intégrés ;
- les migrations correspondantes sont appliquées et testées sur Supabase ;
- les fonctions Edge RevenueCat restent volontairement non déployées en attente
  d'une autorisation explicite du traitement de l'UUID Supabase.

## 1. Promesse

GRIFF est un compagnon compétitif esport : le joueur suit les matchs, réalise
des calls gratuits, prouve son expertise et fait progresser sa communauté.

Les invariants sont :

- aucune mise et aucun retrait de monnaie pour participer ;
- aucun achat de score, de protection ou de multiplicateur compétitif ;
- un résultat explicable à partir d'une règle et d'une source affichées ;
- une séparation stricte entre expertise saisonnière, ancienneté et cosmétique ;
- chaque fonctionnalité renforce l'expérience d'un match esport.

## 2. Vocabulaire canonique

| Terme | Définition |
| --- | --- |
| Match | Rencontre esport officielle suivie dans le produit. |
| Marché | Question résoluble attachée à un match, par exemple « Qui gagne ? ». |
| Call | Réponse définitive d'un joueur à un marché. |
| Verdict | Résolution officielle d'un call : réussi, manqué ou annulé. |
| Frags | Rating compétitif non dépensable de la saison. |
| Grade | Palier visuel dérivé des Frags après les placements. |
| Classement | Position exacte du joueur dans la saison. |
| XP | Progression permanente du compte. |
| Volts | Monnaie dépensable, exclusivement cosmétique ou sociale. |
| Faction | Communauté permanente liée à une équipe favorite. |
| Cercle | Groupe privé d'amis avec une compétition hebdomadaire. |
| Forme | Évolution permanente de la relique selon les supporters. |
| Charge | Activité temporaire de la faction dans une guerre limitée. |

Les mots « pari », « mise », « cote », « encaissement » et « jackpot » ne font
pas partie du vocabulaire produit.

## 3. Boucle principale

```text
match important
  -> marché ouvert
  -> call gratuit et définitif
  -> répartition communautaire révélée
  -> suivi du match
  -> verdict officiel
  -> Frags, XP et charge de faction
  -> récapitulatif
  -> grade, profil et prochain call
```

Le Hub doit toujours permettre de comprendre : ce qui arrive, l'action
immédiate et sa conséquence.

## 4. Contrat d'un Call classé

### 4.1 Première version

Le seul marché classé V1 est `match_winner` :

- deux options, équipe A ou équipe B ;
- un call maximum par joueur et par marché ;
- participation gratuite ;
- choix irréversible après validation ;
- verrouillage au plus tard au début officiel du match ;
- annulation sans effet compétitif si le match ne peut pas être résolu.

Un joueur peut consulter le gain et la perte potentiels avant de valider. Il ne
donne, ne bloque et ne dépense aucun Frag.

### 4.2 États visibles dans « Mes Calls »

| État UI | Définition |
| --- | --- |
| Ouverts | Marchés encore accessibles sur lesquels le joueur n'a pas répondu. |
| Verrouillés | Calls validés dont le résultat n'est pas encore connu. |
| Réussis | Calls réglés en faveur du joueur. |
| Manqués | Calls réglés contre le joueur. |

Un call annulé apparaît dans l'historique, mais ne compte ni comme réussi ni
comme manqué et ne modifie pas les Frags.

### 4.3 Informations obligatoires

Avant validation :

- question et options exactes ;
- date et heure de verrouillage dans le fuseau du joueur ;
- règle de résolution ;
- gain et perte potentiels en Frags ;
- état du marché.

Après validation :

- choix du joueur et heure de validation ;
- nombre de participants ;
- répartition communautaire ;
- rappel du gain et de la perte potentiels.

Après résolution :

- résultat officiel et score final ;
- source et date de la résolution ;
- réponse du joueur ;
- verdict ;
- Frags avant, delta et Frags après ;
- classement et grade avant/après si disponibles ;
- contribution personnelle à la charge de faction.

La répartition communautaire reste cachée avant le call afin de ne pas orienter
le choix. Elle est calculée uniquement avec des calls valides et verrouillés.

### 4.4 Résolution

Le serveur est l'unique autorité. Une résolution doit être atomique et
idempotente : rejouer le même résultat ne peut pas attribuer deux fois des
Frags, de l'XP, des Volts ou de la charge.

La source et son identifiant externe doivent être traçables. Une correction
administrative doit laisser un historique immuable et recalculer les
conséquences de manière déterministe. Les procédures d'annulation, de report,
de correction et de score invalide sont définies dans
[le runbook des résultats](./match-result-operations.md).

Le backend possède déjà les snapshots `frags_avant`, `frags_apres`,
`rang_avant`, `rang_apres` et le mécanisme `revele_le`. La V1 doit les exposer
dans l'expérience mobile au lieu de recalculer ces valeurs côté client.

### 4.5 Futurs marchés

Le modèle cible est générique : type de marché, options, verrouillage, règle,
source et résolution. L'ordre prévu est :

1. vainqueur du match ;
2. score de la série ;
3. vainqueur d'une map ;
4. premier sang ;
5. MVP ;
6. événement propre à un jeu.

Pour la première phase, un seul marché par match affecte le rating. Les marchés
secondaires servent d'abord à l'expertise, à l'XP et aux missions. Leur impact
sur les Frags ne sera activé qu'après calibration, afin de ne pas avantager les
jeux ayant naturellement plus de marchés.

## 5. Économie

### 5.1 Frags

- rating saisonnier, non dépensable et non transférable ;
- valeur initiale : 1 000 ;
- cinq calls réglés avant révélation du grade ;
- coefficient de placement actuel : `K=60` ;
- coefficient normal actuel : `K=40` ;
- évolution positive ou négative selon le verdict et la probabilité figée ;
- plancher cible : 0 ;
- réinitialisation à la valeur initiale de 1 000 au début d'une nouvelle
  saison ;
- meilleur résultat de saison conservé dans l'historique.

Le système historique de conviction `0,75x / 1x / 1,5x` est abandonné. Il reste
toléré pour relire les anciennes données, mais aucun nouvel écran ni nouveau
call ne doit l'exposer. Les nouvelles écritures utilisent la valeur normale
jusqu'à sa suppression technique.

### 5.2 XP

- progression permanente ;
- ne baisse jamais et ne se réinitialise pas ;
- obtenue par activité réellement résolue, accomplissements et missions ;
- un call réglé accorde l'XP de participation ;
- un call réussi accorde un bonus d'expertise ;
- aucun achat direct d'XP.

La formule actuelle attribue notamment 30 XP par call réglé et 20 XP
supplémentaires par call réussi. À terme, le serveur doit être l'autorité du
solde ; le calcul mobile actuel à partir du récapitulatif est transitoire.

### 5.3 Volts

- monnaie dépensable ;
- obtenue par missions, accomplissements, événements et mutations de faction ;
- dépensée uniquement pour des éléments cosmétiques ou d'expression sociale ;
- aucun effet sur Frags, probabilités, séries, verrouillages ou résultats ;
- solde et mouvements tenus par un journal serveur idempotent ;
- aucun solde négatif.

## 6. Grade et classement

Le rating existe dès le premier call, mais le grade et la position restent
masqués jusqu'à cinq verdicts de placement.

| État ou grade | Frags V1 |
| --- | ---: |
| Non classé | moins de 5 verdicts |
| Recrue | 0 à 1 199 |
| Challenger | 1 200 à 1 599 |
| Élite | 1 600 à 1 999 |
| Master | 2 000 à 2 399 |
| Clutch | 2 400 et plus |

Les seuils sont une configuration V1, pas des constantes dispersées dans les
écrans. Ils pourront être recalibrés entre deux saisons, jamais au milieu d'une
saison active.

Après les placements :

- le grade suit les Frags et peut monter ou descendre ;
- le classement exact suit les autres joueurs ;
- le profil affiche aussi le percentile lorsque l'échantillon le permet ;
- une promotion ou une rétrogradation est expliquée dans le récapitulatif ;
- le meilleur grade historique est conservé séparément.

Le niveau XP permanent ne doit pas reprendre les noms de ces grades. Les
anciens labels de prestige `Challenger`, `Elite`, `Master` et `Clutch` devront
être renommés avant l'affichage du grade saisonnier.

## 7. Factions : deux progressions complémentaires

### 7.1 Forme permanente de la relique

La forme dépend uniquement du nombre de supporters et ne régresse jamais.

| Forme | Supporters | Récompense de mutation par membre présent |
| --- | ---: | ---: |
| Fiole | 0 | 0 Volt |
| Flacon | 10 | 200 Volts |
| Bombonne | 50 | 300 Volts |
| Calice | 100 | 500 Volts |
| Alambic | 500 | 750 Volts |
| Cornue | 1 000 | 1 000 Volts |
| Océan | 5 000 | 1 500 Volts |

Cette progression raconte la taille durable de la communauté.

### 7.2 Charge de guerre temporaire

La charge mesure l'activité de la faction pendant une guerre limitée, sans
modifier sa forme permanente :

- +1 charge pour chaque call classé réglé ;
- +1 charge supplémentaire si le call est réussi ;
- aucune charge pour un call annulé ;
- attribution à la faction du joueur au moment du verrouillage ;
- une contribution maximum par joueur et par marché ;
- remise à zéro à la fin de la guerre ;
- classement basé sur la charge totale, avec nombre de contributeurs comme
  premier départage puis précision comme second départage.

Le profil et l'écran Faction affichent la contribution personnelle. Une guerre
de factions ne distribue aucun Frag et ne modifie jamais le rating individuel.

## 8. Autorité et sécurité

- Les heures de verrouillage et de résolution viennent du serveur.
- Seuls les modules `api.ts` des features mobiles accèdent à Supabase.
- Toute table publique exposée conserve RLS et privilèges Data API explicites.
- Les écritures compétitives passent par des fonctions serveur contrôlées.
- Les RPC sensibles vérifient l'utilisateur et n'accordent pas `EXECUTE` à
  `PUBLIC` ou `anon` sans justification.
- Le client n'utilise jamais de métadonnée utilisateur modifiable pour une
  décision d'autorisation.
- Les clés administratives ne sont jamais présentes dans l'application.

## 9. Mesure produit

L'événement central est un call classé réglé puis révélé au joueur. La mesure
principale est le nombre hebdomadaire de joueurs qui reviennent consulter leur
verdict.

Événements minimums actuellement contractuels :

- `onboarding_commence` et `onboarding_termine` ;
- `match_consulte` ;
- `call_commence` et `call_verrouille` ;
- `resultat_consulte` et `frags_gagnes` ;
- `rank_consulte` et `profil_public_consulte` ;
- `mission_commencee` et `mission_terminee` ;
- `objet_obtenu`, `objet_equipe` et `objet_retire` ;
- `achat_commence` et `achat_termine` ;
- `notification_ouverte`.

Les événements clients sont refusés tant que l'utilisateur n'a pas consenti.
Les événements compétitifs ou économiques faisant autorité sont produits côté
serveur afin de ne pas dépendre d'une déclaration du mobile.

Le premier relevé doit établir une base pour : activation par un premier call,
taux de retour après résolution, rétention J1/J7 et passage du récapitulatif au
prochain call. Aucun objectif chiffré n'est fixé avant cette base réelle.

## 10. État du dépôt et écarts connus

| Contrat | État actuel |
| --- | --- |
| Call vainqueur gratuit et irréversible | En place |
| Projection gain/perte et cinq placements | En place |
| Snapshots Frags/rang avant-après | En place et consommés par le mobile |
| Révélation communautaire | En place après validation du call |
| Grade saisonnier à cinq paliers | En place |
| Rank : saison, classements et récompenses | En place sur le rating existant |
| Hub : verdict, mission de faction et récompense | En place avec données serveur |
| XP permanente | Calcul mobile existant, autorité serveur à consolider |
| Forme permanente par supporters | En place |
| Charge temporaire par activité | À construire |
| Volts de mutation | En place |
| Conviction multiplicative | Historique à déprécier |
| Instrumentation de la boucle | En place, first-party et soumise au consentement |
| Âge minimum, blocage et signalement | En place ; validation juridique finale requise |
| Suppression de compte coordonnée | Implémentée, déploiement et recette distante requis |
| Fonctions Edge RevenueCat | Code prêt, déploiement différé par décision explicite |
| Liens publics HTTPS | Implémentés, domaine et associations stores à configurer |

## 11. Hors périmètre V1

- boutique de récompenses réelles ;
- loot boxes et mécaniques aléatoires payantes ;
- mise de Volts ou de Frags ;
- multiplicateurs de résultat ;
- chat public ou messagerie complexe ;
- fil social généraliste ;
- marché portant sur l'actualité non esport ;
- réactivation de Room.
