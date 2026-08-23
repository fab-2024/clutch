# Roadmap produit exécutable

Cette roadmap traduit la vision produit en lots vérifiables. Le détail des
règles se trouve dans [les contrats produit](./product-contracts.md) et la
direction consolidée dans [le blueprint GRIFF](./griff-blueprint.md).

## Principes de livraison

Une tranche n'est terminée que si :

- le parcours principal fonctionne avec données réelles ;
- les états chargement, vide, erreur, succès et annulation sont traités ;
- les changements de base ont RLS, privilèges et RPC explicites ;
- les écritures sont idempotentes ;
- les événements produit nécessaires sont mesurés ;
- `npm run mobile:architecture` et `npm run mobile:typecheck` passent ;
- le lint, les tests unitaires et les contrats SQL passent dans la CI ;
- le parcours est vérifié sur le rendu web mobile et au moins un appareil natif
  avant une release.

## Lot 0 — Fondations produit

### 0.1 Contrats

- [x] Définir Calls, XP, Frags, Volts, Grade, Classement, Forme et Charge.
- [x] Abandonner fonctionnellement la conviction multiplicative.
- [x] Séparer la relique permanente de la guerre temporaire.
- [x] Définir les cinq grades V1.
- [x] Confirmer le rating saisonnier actuel comme doctrine Rank de GRIFF.
- [x] Conserver le cinquième emplacement Core dans le Loadout V1.

### 0.2 Typographie et lisibilité

- [x] Créer des tokens typographiques sémantiques.
- [x] Utiliser Space Grotesk pour la lecture et les titres fonctionnels des
  parcours principaux.
- [x] Réserver Barlow Condensed aux punchlines, scores, classements et glyphes
  de marque des parcours principaux.
- [x] Porter le texte courant à 13 px minimum et les labels à 10 px minimum sur
  Hub, Matchs, l'entrée Social, Moi, l'onboarding et l'authentification.
- [x] Réduire les capitales dans les contrôles fonctionnels migrés.
- [x] Migrer les écrans Social secondaires, Match Center, paramètres et admin.
- [ ] Vérifier contraste, troncature et taille dynamique sur les cinq onglets.

### 0.3 Identité des monnaies

- [x] Créer un symbole Frag plat reconnaissable sans couleur.
- [x] Créer un symbole Volt circulaire sans éclair.
- [x] Remplacer les lettres temporaires du header par les symboles plats.
- [ ] Préparer séparément les variantes 3D de récompense.

### 0.4 Naming en parallèle

- [x] Retenir `GRIFF.` comme candidat de travail.
- [ ] Vérifier marque, domaines et identifiants sociaux.
- [ ] Ne renommer le code et les assets qu'après choix définitif.

## Lot 1 — Boucle Call de référence

### 1.1 Révélation après-match

- [x] Consommer les RPC de résultat déjà présents dans le backend.
- [x] Afficher score officiel, choix, verdict et source.
- [x] Afficher Frags et classement avant/après.
- [x] Déduire et célébrer la promotion ou rétrogradation de grade.
- [x] Marquer la révélation comme vue une seule fois.
- [x] Proposer le prochain call sans impasse.

Critère d'acceptation : un résultat réglé apparaît une fois au retour du joueur,
reste consultable depuis l'historique et ne peut jamais créditer deux fois.

### 1.2 Mes Calls et transparence

- [x] Séparer Ouverts, Verrouillés, Réussis et Manqués.
- [x] Afficher l'heure de verrouillage et la règle de résolution.
- [x] Afficher le nombre de participants.
- [x] Révéler la répartition seulement après validation du joueur.
- [x] Afficher la source du résultat dans les verdicts.

Critère d'acceptation : chaque call est compréhensible avant validation et
entièrement explicable après résolution.

### 1.3 Grade et classement

- [x] Centraliser les seuils des cinq grades côté serveur.
- [x] Masquer grade et classement pendant les cinq placements.
- [x] Exposer grade, progression, rang exact et percentile.
- [x] Conserver meilleur grade et meilleur rang de chaque saison.
- [x] Renommer les prestiges XP qui entrent en conflit.

### 1.4 Fiabilité opérationnelle

- [x] Enregistrer source et identifiant externe du résultat.
- [x] Documenter annulation, report, correction et égalité invalide.
- [x] Ajouter une piste d'audit aux corrections administratives.
- [x] Tester résolution simultanée, rejeu et concurrence.

## Lot 1 bis — Cœur de bêta GRIFF

### Navigation, Rank et Hub

- [x] Ajouter Rank comme cinquième onglet sans réactiver Room.
- [x] Construire Ma saison sur le rating Frags existant.
- [x] Réunir les classements Global, Cercle et Faction.
- [x] Afficher le contrat de récompense de saison sans inventer d'objet.
- [x] Relier la progression du Hub à Rank.
- [x] Afficher dernier verdict, mission réelle de faction et dernière
  récompense possédée dans le Hub.

### Analytics et sécurité

- [x] Instrumenter onboarding, match, call, verdict, Frags, Rank, profil,
  mission, achat et notification.
- [x] Soumettre les événements clients à un consentement facultatif.
- [x] Ajouter une déclaration 15+ sans collecter la date de naissance.
- [x] Ajouter blocage, déblocage, signalement et règles de modération.
- [x] Appliquer et tester les migrations du bloc B sur Supabase.
- [ ] Faire valider juridiquement l'âge minimum et les documents.

### Fermeture de release

- [ ] Autoriser le traitement de l'UUID Supabase par RevenueCat.
- [ ] Déployer les trois fonctions Edge compte et Founder Pack.
- [ ] Effectuer la recette sandbox achat, restauration et suppression.
- [ ] Activer la protection Auth contre les mots de passe compromis.
- [ ] Signer la matrice native iOS/Android, notifications et liens.

## Lot 2 — Rétention et expertise

### 2.1 Charge de faction

- [ ] Créer les guerres limitées et leur calendrier.
- [ ] Créditer la charge lors de la résolution d'un call.
- [ ] Afficher contribution personnelle et classement de guerre.
- [ ] Célébrer séparément mutation permanente et victoire temporaire.

### 2.2 Expertise

- [ ] Calculer précision par jeu, équipe et compétition.
- [ ] Exposer meilleure série et meilleur call.
- [ ] Ajouter le marché « score de la série » sans impact Frags initial.
- [ ] Comparer deux profils sur un périmètre explicite.

### 2.3 Cercle et duels

- [x] Consolider le classement hebdomadaire du Cercle.
- [x] Relier les duels au marché classé existant.
- [x] Créer une carte de performance partageable.
- [x] Ne pas ajouter de Club, fil public ou messagerie complexe.

### 2.4 Notifications utiles

- [x] Enregistrer préférences, fuseau et jetons de notification.
- [ ] Notifier verrouillage imminent, début du match et verdict.
- [ ] Notifier promotion, mutation et duel reçu.
- [x] Éviter tout rappel sans événement concret.

Le planificateur, la file idempotente et le relais Expo sont déployés ; le
cycle cron répond en production. Les deux types de livraison restent ouverts
jusqu'à leur validation sur une build native EAS avec un vrai appareil.

## Lot 3 — Usage des Volts et Collection

Le socle a été construit avant la mesure de bêta. Il ne doit plus être étendu
avant d'avoir mesuré une rétention J7 et un retour au verdict suffisants.

- [x] Catalogue de cadres, bannières, titres, reliques et effets de profil.
- [x] Apparences du Core et effets de faction.
- [x] Inventaire, équipement et historique d'achat.
- [x] Aperçu avant achat et confirmation explicite.
- [x] Aucun avantage compétitif, loot box ou récompense réelle.
- [ ] Réduire l'offre visible à une collection de lancement éditorialisée.
- [ ] Mesurer acquisition, équipement, dépense et frustration sur une cohorte.
- [ ] Tester le Pack Fondateur seulement après stabilité de la boucle gratuite.

## Instrumentation de bêta

Le socle first-party privé, la liste blanche d'événements et le consentement
facultatif sont en place. La première cohorte fermée doit maintenant établir la
base ; les seuils de décision seront fixés ensuite.

Indicateurs à suivre :

- premier call dans les 24 heures suivant l'inscription ;
- conversion vue Match Center -> call verrouillé ;
- retour dans les 24 heures suivant un verdict ;
- taux de révélation des résultats ;
- passage récapitulatif -> prochain call ;
- rétention J1 et J7 ;
- participation au Cercle et à la guerre de factions.

Les événements nécessaires sont disponibles. Les tableaux de cohorte et les
seuils chiffrés restent à produire à partir d'utilisateurs réels.

## Prochaine tranche recommandée

La tranche active est la **fermeture externe du bloc B** : autoriser puis
déployer les fonctions RevenueCat, valider achat/restauration/suppression en
sandbox, activer la protection Auth contre les mots de passe compromis,
configurer le domaine HTTPS et ses associations iOS/Android, puis signer la
matrice native. Le détail et les responsabilités sont dans
[`mobile/docs/release-readiness.md`](../mobile/docs/release-readiness.md).

Les nouveaux lots produit restent gelés jusqu'à fermeture de ces critères. La
bêta fermée et la mesure du bloc C viennent immédiatement après ; la Collection
et la monétisation ne doivent pas être enrichies avant cette preuve d'usage.
