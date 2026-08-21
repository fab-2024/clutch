# Roadmap produit exécutable

Cette roadmap traduit la vision produit en lots vérifiables. Le détail des
règles se trouve dans [les contrats produit](./product-contracts.md).

## Principes de livraison

Une tranche n'est terminée que si :

- le parcours principal fonctionne avec données réelles ;
- les états chargement, vide, erreur, succès et annulation sont traités ;
- les changements de base ont RLS, privilèges et RPC explicites ;
- les écritures sont idempotentes ;
- les événements produit nécessaires sont mesurés ;
- `npm run mobile:architecture` et `npm run mobile:typecheck` passent ;
- le parcours est vérifié sur le rendu web mobile et au moins un appareil natif
  avant une release.

## Lot 0 — Fondations produit

### 0.1 Contrats

- [x] Définir Calls, XP, Frags, Volts, Grade, Classement, Forme et Charge.
- [x] Abandonner fonctionnellement la conviction multiplicative.
- [x] Séparer la relique permanente de la guerre temporaire.
- [x] Définir les cinq grades V1.

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

- [ ] Produire une liste courte de noms.
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

- [ ] Enregistrer source et identifiant externe du résultat.
- [ ] Documenter annulation, report, correction et égalité invalide.
- [ ] Ajouter une piste d'audit aux corrections administratives.
- [ ] Tester résolution simultanée, rejeu et concurrence.

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

- [ ] Consolider le classement hebdomadaire du Cercle.
- [ ] Relier les duels au marché classé existant.
- [ ] Créer une carte de performance partageable.
- [ ] Ne pas ajouter de Club, fil public ou messagerie complexe.

### 2.4 Notifications utiles

- [ ] Enregistrer préférences, fuseau et jetons de notification.
- [ ] Notifier verrouillage imminent, début du match et verdict.
- [ ] Notifier promotion, mutation et duel reçu.
- [ ] Éviter tout rappel sans événement concret.

## Lot 3 — Usage des Volts

Ce lot ne démarre qu'après mesure d'une rétention J7 et d'un retour au verdict
suffisants pour justifier une économie cosmétique.

- [ ] Catalogue de cadres, emblèmes, titres et effets de call.
- [ ] Apparences du Core et effets de faction.
- [ ] Inventaire, équipement et historique d'achat.
- [ ] Aperçu avant achat et confirmation explicite.
- [ ] Aucun avantage compétitif, loot box ou récompense réelle.

## Instrumentation préalable

Avant le Lot 1, choisir un outil et implémenter un vocabulaire d'événements
stable. La première période sert à établir la base ; les seuils de décision sont
fixés ensuite.

Indicateurs à suivre :

- premier call dans les 24 heures suivant l'inscription ;
- conversion vue Match Center -> call verrouillé ;
- retour dans les 24 heures suivant un verdict ;
- taux de révélation des résultats ;
- passage récapitulatif -> prochain call ;
- rétention J1 et J7 ;
- participation au Cercle et à la guerre de factions.

## Prochaine tranche recommandée

Finaliser le lot **0.2 Typographie et lisibilité** par un contrôle visuel natif
des cinq onglets (contraste, troncature et taille dynamique), puis ouvrir le lot
**0.3 Identité des monnaies** sans redessiner les parcours validés.
