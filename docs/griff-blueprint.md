# Blueprint produit & business — GRIFF

- Version : 1.2
- Dernière mise à jour : 22 août 2026
- Statut produit : blocs A et B intégrés
- Statut de marque : **AMBRE — GRIFF reste un nom de travail**
- Nom actuellement publié dans le produit : `Clutch`

Ce document est la source de vérité synthétique de la direction produit. Les
règles détaillées sont dans [les contrats produit](./product-contracts.md),
l'avancement vérifiable dans [la checklist](./griff-blueprint-checklist.md) et
l'ordre de livraison dans [la roadmap exécutable](./product-roadmap.md).

---

## 1. Vision et promesse

Créer le compagnon esport où les supporters :

1. suivent les matchs importants ;
2. posent leurs calls gratuitement ;
3. prouvent leur expertise par leurs Frags et leur rang ;
4. progressent au fil des saisons ;
5. rejoignent une faction et défient leurs amis ;
6. collectionnent des objets représentant leur parcours.

Promesse de travail :

> **GRIFF. — LAISSE TA MARQUE.**

Positionnement :

> Le produit ne monétise pas les calls. Il monétise le fandom, l'identité et
> l'engagement autour de l'esport.

Invariants :

- aucun dépôt, retrait ou achat requis pour poser un call ;
- aucune récompense en argent dépendant d'un résultat ;
- aucun achat de Frags, d'XP ou d'avantage compétitif ;
- aucune loot box ;
- résultat, source et variation de Frags toujours explicables.

---

## 2. Décisions définitives des blocs A et B

### Marque

- `GRIFF.` est un candidat de travail, pas encore le nom public validé.
- Aucun rebranding du code, des stores, des produits IAP ou des identifiants
  `clutch_*` avant le Go juridique et commercial.
- Le futur rebranding sera visible d'abord et techniquement compatible avec les
  comptes, achats, liens et données existants.

### Rank

Le système actuel est conservé sans seconde monnaie ni MMR caché :

- 1 000 Frags au début de la saison ;
- cinq verdicts de placement ;
- probabilités figées lors du verrouillage ;
- coefficient `K=60` pendant les placements puis `K=40` ;
- gain ou perte de Frags selon le verdict ;
- promotions et rétrogradations possibles ;
- grades V1 : Recrue, Challenger, Élite, Master et Clutch.

Les calls classés utilisent le marché vainqueur sur chaque match éligible. La
sélection hebdomadaire commune et le barème uniquement positif du blueprint
initial ne font pas partie de la V1.

### Loadout

Le Loadout conserve cinq emplacements :

1. cadre d'avatar ;
2. bannière de profil ;
3. titre ;
4. relique principale ;
5. apparence du Core.

### Room

- Room reste gelée et masquée de la navigation.
- Les modèles et assets existants sont conservés.
- La Vitrine 2.5D reste une évolution conditionnelle, pas un chantier V1.

---

## 3. Navigation V1

| Onglet | Rôle |
| --- | --- |
| Hub | Résumé personnel, action immédiate et actualité du moment |
| Matchs | Calendrier, directs, calls, résultats et Mes calls |
| Social | Faction, Cercle, défis, missions et duels |
| Rank | Saison, classements et récompenses |
| Moi | Identité, statistiques, Loadout, Collection et paramètres |

Cette navigation à cinq onglets est implémentée. Room reste accessible
uniquement comme placeholder de développement masqué.

---

## 4. Boucle produit principale

> Match → Call → Verdict → Frags → Rank → Récompense → Profil

### Hub

Le Hub montre en priorité :

- le match du moment et l'action encore possible ;
- les prochains matchs ;
- le dernier verdict et son delta de Frags ;
- la progression de saison avec un accès à Rank ;
- une mission quotidienne calculée depuis les vrais calls de la faction ;
- la dernière récompense réellement possédée.

Ces compléments reposent sur des données serveur réelles. Le Hub ne doit pas
devenir un agrégateur de toutes les fonctionnalités.

### Matchs et Match Center

Trois entrées sont conservées : À venir, Résultats et Mes calls. Une fiche doit
toujours rendre lisibles le jeu, la compétition, les équipes, le BO, l'heure,
l'état du call, les impacts possibles et le résultat officiel.

La révélation après-match montre le score, la source, le choix, le verdict, les
Frags et le rang avant/après, puis propose le prochain call.

### Social

Social reste limité à :

- Faction : relique, classement et mission collective ;
- Cercle : amis, demandes, ligues privées et classement hebdomadaire ;
- Défis : missions et duels.

Le blocage, le déblocage et le signalement sont disponibles depuis les profils
publics. Les interactions et profils bloqués sont masqués dans les deux sens.
Aucun fil public, chat généraliste ou salon public n'est prévu en V1.

### Rank

Rank est le cinquième onglet et orchestre :

1. **Ma saison** : Frags, placement, grade, rang, précision et records ;
2. **Classements** : Global, Cercle et Faction ;
3. **Récompenses** : contrat de fin de saison, sans afficher un objet qui
   n'aurait pas encore été produit ou attribué.

### Moi

Moi regroupe identité, niveau permanent, rang, Frags, statistiques de calls,
jeux et équipes suivis, Loadout, Collection, confidentialité, sécurité et
gestion du compte.

---

## 5. Économie

### XP

- progression permanente et non achetable ;
- ne revient jamais à zéro ;
- attribuée par l'activité réellement accomplie ;
- autorité serveur du solde encore à consolider, le calcul mobile restant
  transitoire.

### Frags

- rating compétitif saisonnier ;
- non achetables, non dépensables et non transférables ;
- tri direct des classements ;
- remise à 1 000 au début d'une nouvelle saison ;
- meilleur grade et meilleur rang conservés dans l'historique.

### Volts

- monnaie cosmétique gagnable et, à terme, achetable ;
- journal serveur append-only et idempotent ;
- utilisable uniquement pour l'identité et la Collection ;
- aucun effet possible sur Frags, XP, probabilités ou rang.

---

## 6. Collection et monétisation

Le catalogue, l'inventaire, l'équipement, l'aperçu et l'achat direct avec Volts
existent déjà. La prochaine étape n'est pas d'ajouter du volume, mais de réduire
l'offre à une collection de lancement désirable.

Ordre de validation commercial :

1. stabiliser et mesurer la boucle gratuite ;
2. éditorialiser la collection de lancement ;
3. déployer et tester le Pack Fondateur dans les stores sandbox ;
4. mesurer le premier achat ;
5. préparer une collection partenaire réelle ;
6. considérer seulement ensuite packs de Volts et abonnement.

Le Pack Fondateur reste un produit cosmétique non consommable. Ses fonctions
RevenueCat sont présentes dans le dépôt mais **non déployées** : l'échange de
l'UUID Supabase comme identifiant RevenueCat attend une autorisation explicite
et une recette de suppression/restauration.

### Niveaux business

| Niveau | Décision actuelle |
| --- | --- |
| Pack Fondateur | Premier achat à tester après stabilité et recette sandbox |
| Packs de Volts | Différés jusqu'à validation du premier achat |
| Collections officielles | Seulement avec autorisation des ayants droit |
| Activations sponsorisées | Prototype Nova Week disponible comme démonstrateur |
| Abonnement | Futur, sans effet sur Frags ou rang |
| Affiliation physique | Future et séparée des achats numériques |
| Offre professionnelle | Long terme, après un pilote partenaire mesuré |

Une activation partenaire pilote peut réunir une page, une mission limitée,
des objets numériques, une mise en avant dans le Hub, une notification et un
rapport final. Les récompenses dépendent de la participation, jamais de
l'exactitude d'un call.

Les partenaires ne reçoivent que des données agrégées : participants,
complétion, objets débloqués et équipés, visites et engagement avec les matchs.
Les données personnelles ne sont ni vendues ni transmises dans le reporting.

---

## 7. Analytics, confidentialité et sécurité

Le registre analytique first-party V4 est privé, soumis à un consentement
facultatif et limité à une liste blanche sans métadonnée libre.

La boucle instrumentée couvre notamment :

- onboarding commencé et terminé ;
- match consulté ;
- call commencé et verrouillé ;
- résultat consulté et Frags gagnés ;
- Rank et profil public consultés ;
- mission commencée et terminée ;
- objet obtenu ou équipé ;
- achat commencé et terminé ;
- notification ouverte.

La bêta doit mesurer en priorité :

- premier call après inscription ;
- conversion Match Center → call verrouillé ;
- retour pour consulter un verdict ;
- rétention J1 et J7 ;
- visites et usage de Rank ;
- utilisation du Loadout et visites des profils publics ;
- activité des factions ;
- conversion vers un premier achat.

Le parcours de confidentialité comprend :

- déclaration d'âge minimum 15+, sans date de naissance ;
- analytics désactivés tant que le consentement n'est pas donné ;
- modification ultérieure du choix ;
- règles de modération ;
- blocage, déblocage et signalement ;
- politique de confidentialité et conditions consultables avant validation.

Le choix de 15 ans et les documents restent à faire valider juridiquement avant
une publication publique.

---

## 8. Design et identité

Le produit conserve pendant la phase Clutch :

- un fond presque noir ;
- le vert acide réservé aux actions, états actifs et récompenses ;
- de grandes cartes événementielles ;
- Space Grotesk pour la lecture ;
- Barlow Condensed pour les scores et accroches ;
- une esthétique esport premium avec moins de bordures et plus d'espace.

Le futur territoire GRIFF reposera sur les fragments, entailles, traces et
surfaces gravées. Le logo cible est un `G` simple construit par deux fragments,
accompagné du mot-symbole `GRIFF.`. Aucun logo final ni asset store ne doit être
produit avant la clearance du nom.

---

## 9. État technique au 22 août 2026

### Terminé

- blocs A et B intégrés au produit ;
- Rank et navigation à cinq onglets ;
- Hub complété avec données réelles ;
- analytics de la boucle et consentement ;
- blocage, signalement et règles de modération ;
- migrations confidentialité, Bloc B, jetons Expo et profils bloqués appliquées
  sur Supabase ;
- tests SQL distants verts ;
- architecture, typecheck, lint, tests Jest, pages publiques et contrôle de
  release verts ;
- rendu des trois sections Rank vérifié sur le preview web.

### Ouvert avant bêta

- autoriser puis déployer `clutch-account-delete`, `clutch-founder-sync` et
  `clutch-founder-webhook` ;
- configurer leurs secrets et effectuer la recette RevenueCat sandbox ;
- activer la protection Supabase Auth contre les mots de passe compromis ;
- tester iPhone, Android, grande police et lecteurs d'écran ;
- valider notifications réelles et liens lorsque l'application est fermée ;
- fournir domaine HTTPS, support et identité légale de publication ;
- terminer la clearance du nom GRIFF.

---

## 10. Roadmap mise à jour

### Bloc A — Décisions irréversibles

- [x] Adopter le blueprint comme direction produit.
- [x] Conserver le rating Frags existant.
- [x] Conserver les cinq grades actuels.
- [x] Conserver le Core dans le Loadout.
- [x] Préparer la migration compatible Clutch → GRIFF.
- [ ] Obtenir le Go juridique et commercial sur le nom.

### Bloc B — Cœur de bêta

- [x] Instrumenter la boucle principale.
- [x] Construire Rank sur les Frags existants.
- [x] Compléter le Hub avec des données réelles.
- [x] Ajouter consentement, âge minimum, blocage et signalement.
- [x] Appliquer et tester les migrations Supabase.
- [ ] Déployer les fonctions RevenueCat après autorisation.
- [ ] Signer la recette native, stores, notifications et liens.

### Bloc C — Validation marché

- [ ] Lancer une bêta fermée.
- [ ] Mesurer activation, J1/J7, calls, retour au verdict et usage de Rank.
- [ ] Réduire le catalogue à une collection de lancement forte.
- [ ] Tester le Pack Fondateur après stabilité.
- [ ] Préparer une activation partenaire réelle à partir de Nova Week.
- [ ] Reconsidérer la Vitrine uniquement après preuve d'usage et financement.

---

## 11. À ne pas construire maintenant

- Room ou Vitrine photoréaliste ;
- messagerie complète ou fil social généraliste ;
- marketplace entre utilisateurs ;
- loot boxes ou récompenses en argent ;
- second rating, MMR caché ou monnaie supplémentaire ;
- fonctionnalités payantes influençant le classement ;
- dizaines d'objets sans rôle clair ;
- rebranding GRIFF avant le Go.

## Règle directrice

À chaque nouvelle idée :

1. renforce-t-elle la boucle Match → Call → Verdict → Progression ?
2. sera-t-elle utilisée régulièrement ?
3. peut-elle être réalisée sans diminuer la clarté du produit ?

Si deux réponses sont négatives, l'idée reste dans la roadmap future.
