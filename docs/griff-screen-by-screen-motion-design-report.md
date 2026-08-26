# Rapport écran par écran — design, motion et refonte GRIFF

- Date : 25 août 2026
- Statut : proposition de direction, non implémentée
- Périmètre : application Expo dans `mobile/`
- Base produit : [blueprint GRIFF](./griff-blueprint.md) et [roadmap exécutable](./product-roadmap.md)
- Base d'observation : inventaire complet des routes et composants, complété par
  la revue visuelle des 14 previews principales en format mobile

## 1. Recommandation générale

L'application possède déjà une identité forte, premium et reconnaissable. La
bonne évolution n'est donc pas une refonte graphique globale. Il faut rendre la
hiérarchie plus calme, les interactions plus tactiles et les moments importants
plus mémorables.

La motion doit se concentrer sur la boucle principale :

> Match → Call → Verdict → Frags → Rank → Récompense → Profil

Les écrans fonctionnels restent rapides et sobres. Les animations expressives
sont réservées à quatre événements : verrouiller un Call, révéler un verdict,
changer de grade et faire évoluer une relique.

### Décision sur les bibliothèques étudiées

| Source étudiée | Ce que je retiendrais | Décision pour GRIFF |
| --- | --- | --- |
| `enzomanuelmangano/demos` | Gestes, transitions Reanimated et effets traités comme des études isolées | Adapter les principes utiles à la grammaire GRIFF, sans importer une galerie d'effets dans le produit |
| `animated-count-text` | Interpolation lisible d'une valeur avant/après | Extraire le pattern dans un composant interne `AnimatedMetric`, sans dépendance obligatoire |
| `rn-animated-components` | États pressés, indicateurs d'onglet et transitions de layout | Reproduire les patterns utiles avec Reanimated dans les primitives GRIFF |
| PanelUI | Composition claire, contrôles cohérents et surfaces structurées | S'en inspirer pour l'API des composants internes, sans reprendre sa direction visuelle |
| React Native Skia | Particules, liquide, réfraction, fragments et rendu procédural | Usage ciblé et expérimental sur la relique et le verdict uniquement |
| NativeWind | Vitesse de composition par classes utilitaires | Ne pas migrer : le projet utilise déjà massivement `StyleSheet` et un double système n'apporterait pas de valeur produit |
| gluestack-ui | Accessibilité, variantes et primitives composables | S'en inspirer pour les contrats des composants, sans installer tout le design system |
| React Native Filament | Véritable scène 3D et éclairage temps réel | Ne pas utiliser maintenant : Room est gelée et la Vitrine 2.5D répond au besoin actuel |

Les exemples externes doivent rester des références d'interaction. Les
composants finaux doivent employer les tokens, les métaphores et les règles
d'accessibilité propres à GRIFF.

### Les huit changements au meilleur rendement

1. Rendre le choix et le verrouillage du Call réellement tactiles.
2. Faire du verdict une séquence signature, avec Frags avant/après et promotion.
3. Replacer le résumé personnel en tête de Rank, avant l'échelle décorative.
4. Donner au Hub un hero qui reflète l'état réel du prochain Call.
5. Corriger immédiatement lisibilité, cibles tactiles et coût graphique de la
   Vitrine.
6. Mettre inventaire/catalogue avant les promotions dans la boutique.
7. Créer les primitives internes de motion, d'état et d'accessibilité avant de
   décliner les effets écran par écran.
8. Transformer les previews en laboratoire déterministe de QA visuelle.

## 2. Langage de mouvement proposé

### Métaphores de marque

GRIFF ne doit pas utiliser des rebonds ou des confettis génériques. Son langage
visuel peut être construit autour de cinq gestes :

- **trace** : une ligne révèle un état, un trajet ou une progression ;
- **fragment** : un élément se compose ou se détache après un verdict ;
- **entaille** : une sélection marque brièvement la surface ;
- **verrou** : une décision se resserre puis devient immuable ;
- **résonance** : une relique ou un objet réagit à la contribution du joueur.

### Durées et intensité

| Événement | Durée indicative | Retour haptique |
| --- | ---: | --- |
| Pression ou focus | 90–140 ms | sélection légère si utile |
| Changement d'onglet ou de layout | 180–260 ms | aucun ou très léger |
| Validation et verrouillage | 260–360 ms | impact moyen après confirmation serveur |
| Verdict et progression | 700–1 100 ms | succès, avertissement ou erreur sémantique |
| Mutation ou fin de saison | 1 800–2 900 ms | séquence rare, jamais automatique à répétition |

Les haptics doivent être centralisés dans `mobile/src/lib/feedback.ts` afin
qu'une même action possède la même signature partout.

### Règles de sobriété

- Ne pas animer les soldes et compteurs à chaque premier rendu ; seulement une
  variation causée par une action ou un événement compris par le joueur.
- Ne pas lancer une cascade sur chaque ligne d'une liste.
- Ne pas faire pulser plusieurs surfaces simultanément.
- Ne jamais rendre une confirmation destructive ludique.
- Mettre en pause les animations ambiantes quand l'écran n'est plus focalisé.
- Conserver le vert acide pour l'action, l'état actif et la récompense ; réduire
  son emploi décoratif.
- Remplacer une partie des contours concurrents par de l'espace, un contraste de
  surface et une hiérarchie typographique.

### Mouvement réduit et accessibilité

Quand le système demande moins de mouvement :

- remplacer les déplacements, parallaxes et particules par un fondu de
  120–180 ms ;
- afficher immédiatement la valeur finale d'un compteur ;
- supprimer les boucles, pulsations et secousses ;
- conserver l'information textuelle complète du verdict, du delta et du grade ;
- conserver des cibles tactiles d'au moins 44 × 44 points.

## 3. Socle de composants à créer avant les refontes

Je créerais une petite couche interne, extraite de l'apparence déjà approuvée :

| Primitive | Usage |
| --- | --- |
| `GriffButton` | variantes primaire, secondaire, destructive, chargement et désactivation |
| `PressableSurface` | profondeur, scale pressé, focus, haptic facultatif et état accessible |
| `SegmentedControl` | onglets locaux avec indicateur animé et libellés lisibles |
| `AnimatedMetric` | valeur précédente, valeur suivante, delta, préfixe/suffixe et mouvement réduit |
| `StatePanel` | chargement, vide, erreur, hors ligne, succès et nouvelle tentative |
| `GriffSheet` | confirmation, choix et détail avec focus, fermeture et clavier maîtrisés |
| `GriffTextField` | libellé, aide, erreur, mot de passe et autofill cohérents |
| `ListRow` | ligne stable pour amis, historique, notifications et réglages |

Ce socle reprend les qualités de PanelUI et gluestack-ui — composition,
variantes, états et accessibilité — sans ajouter une deuxième identité ni un
nouveau moteur de style.

## 4. Rapport écran par écran

Les priorités suivantes indiquent l'ordre recommandé :

- **P0 — fermeture release** : sécurité, achat, suppression de compte,
  accessibilité ou garde-fou indispensable ;
- **P1 — cœur bêta** : améliore directement le premier Call, le verdict ou la
  compréhension de la progression ;
- **P2 — consolidation** : cohérence, rétention et qualité après stabilisation ;
- **P3 — expansion conditionnelle** : seulement après preuve d'usage.

### 4.1 Shell, démarrage et navigation principale

**Routes :** `mobile/app/_layout.tsx`, `mobile/app/(tabs)/_layout.tsx`

**À conserver**

- les cinq destinations Hub, Matchs, Social, Rank et Moi ;
- la priorité donnée au contenu et la faible hauteur de navigation ;
- les garde-fous de consentement et de révélation de résultat.

**À modifier**

- Remplacer les glyphes typographiques actuels par cinq icônes SVG simples,
  dérivées du langage fragment/trace. Les glyphes de police ne garantissent ni
  le même rendu ni le même alignement entre iOS et Android.
- Donner à l'onglet actif une plaque ou une trace mobile de 180–220 ms, sans
  halo permanent sur toute la barre.
- Remplacer le spinner générique du démarrage par un signe GRIFF très léger :
  deux fragments qui se rejoignent, puis restent immobiles.
- N'animer les Frags ou Volts du header qu'après une variation réelle.
- Garder le consentement analytique calme et explicite, sous forme de feuille
  accessible, sans gamification.

**Technologie :** Reanimated, SVG et primitives internes. Ni Skia ni Filament.

**Priorité : P1** pour les icônes et la cohérence ; **P2** pour la finition du
démarrage.

### 4.2 Connexion et création de compte

**Route :** `mobile/app/login.tsx`

**À conserver**

- une surface sombre, directe et peu distraite ;
- les deux intentions connexion/inscription dans le même contexte.

**À modifier**

- Employer `GriffTextField` pour rendre focus, autofill, erreurs et mots de
  passe identiques sur tous les formulaires.
- Afficher les erreurs sous le champ concerné, puis un résumé accessible si
  plusieurs champs échouent.
- Sur l'inscription, ajouter une checklist de mot de passe qui évolue sans
  secouer le formulaire.
- Garder un seul appel à l'action dominant.

**Animation**

- indicateur connexion/inscription qui glisse en 180 ms ;
- halo de focus discret en 120 ms ;
- transition de hauteur par layout quand un message apparaît ;
- carte « vérifie ton e-mail » en fondu après succès ;
- haptic de succès ou d'erreur, jamais à chaque frappe.

**Technologie :** patterns `rn-animated-components` reconstruits avec
Reanimated ; API de formulaire inspirée de gluestack-ui.

**Priorité : P1.**

### 4.3 Callback, mot de passe oublié et nouveau mot de passe

**Routes :** `mobile/app/auth/callback.tsx`,
`mobile/app/auth/forgot-password.tsx`, `mobile/app/auth/update-password.tsx`

**À modifier**

- Unifier les trois parcours dans un patron `AuthState` : traitement, succès,
  erreur récupérable, lien expiré et retour à la connexion.
- Remplacer le spinner indéfini du callback par une trace en trois états : lien
  lu, session créée, redirection.
- Dessiner la coche de succès en 240–300 ms, puis stabiliser l'écran.
- Préserver le message d'erreur et son action ; ne pas rediriger trop vite.

**Technologie :** SVG/Reanimated et `StatePanel`.

**Priorité : P2**, après validation complète des liens natifs en **P0**.

### 4.4 Onboarding — jeux et faction

**Route :** `mobile/app/onboarding.tsx`

**À conserver**

- les deux étapes actuelles ;
- la sélection des jeux puis de la faction ;
- les illustrations qui posent immédiatement l'univers.

**À modifier**

- Ne pas ajouter une troisième page explicative. Expliquer le premier Call par
  des coach marks contextuels lors de la première arrivée sur le Hub.
- Renforcer l'état sélectionné des cartes avec un check, une bordure unique et
  une différence de surface qui reste perceptible sans couleur.
- Montrer la faction choisie sous forme d'une carte qui s'ouvre légèrement et
  laisse apparaître sa relique miniature.
- Ajouter une barre de progression simple, lisible par VoiceOver/TalkBack.

**Animation**

- pression des cartes à `0.985`, puis apparition du check ;
- glissement horizontal ou wipe fragmenté de 240–320 ms entre étapes ;
- parallaxe d'illustration de très faible amplitude uniquement sous le geste ;
- aucune vidéo ou scène 3D au premier lancement.

**Technologie :** Reanimated et `PressableSurface`.

**Priorité : P1.**

### 4.5 Hub

**Route :** `mobile/app/(tabs)/index.tsx`

**À conserver**

- une action principale au-dessus de la ligne de flottaison ;
- la confrontation comme objet visuel central ;
- le dernier verdict, la saison, la mission et la récompense possédée comme
  preuves du parcours personnel.

**À modifier**

- Faire varier le hero selon un vocabulaire d'états stable : Call ouvert,
  verrouillé, match en direct, verdict disponible, prochain match.
- Ajouter sous la progression de saison une information immédiatement utile :
  `124 Frags vers Élite` ou `3 placements restants`.
- Afficher le dernier delta de Frags près de Rank, sans recréer une seconde
  carte de résultat.
- Transformer les aides du premier Call en coach marks ancrés sur la carte et
  le CTA ; les supprimer définitivement après usage.
- Réduire les bordures des cartes secondaires pour redonner la priorité au
  prochain Call.

**Animation**

- illusion de continuité vers Match Center : confrontation et couleurs
  d'équipes conservent leur position pendant la transition ;
- `AnimatedMetric` sur un solde seulement après retour d'un verdict ou d'une
  transaction ;
- progression de mission animée quand le joueur vient de contribuer ;
- entrées échelonnées uniquement à la toute première visite, pas à chaque
  rafraîchissement.

**Technologie :** Reanimated, `AnimatedMetric`, `StatePanel`.

**Priorité : P1.**

### 4.6 Matchs — arène, calendrier et Mes Calls

**Route :** `mobile/app/(tabs)/matches.tsx`

**À conserver**

- les trois entrées À venir, Résultats et Mes Calls ;
- l'information jeu, compétition, format et verrouillage sur les cartes ;
- la pagination bornée côté données.

**À modifier**

- Réduire le hero quand le joueur commence à faire défiler, afin que le
  calendrier et le filtre restent accessibles.
- Employer un `SegmentedControl` partagé pour les trois périmètres.
- Unifier les badges Ouvert, Verrouillé, Réussi, Manqué et Annulé.
- Faire correspondre les skeletons à la géométrie des cartes réelles.
- N'introduire `FlatList` ou `SectionList` que si l'historique devient réellement
  non borné ; éviter une migration mécanique de toutes les ScrollView.

**Animation**

- indicateur d'onglet qui glisse en 180–220 ms ;
- mise à jour ou insertion d'une carte par transition de layout ;
- point live à pulsation très lente et désactivé en mouvement réduit ;
- aucun stagger sur l'intégralité du calendrier.

**Technologie :** Reanimated et primitives internes.

**Priorité : P2.**

### 4.7 Match Center — poser et verrouiller un Call

**Route :** `mobile/app/match/[id].tsx`

Cet écran est la priorité d'interaction la plus élevée : il transforme une
intention en engagement compris.

**À modifier**

- Standardiser les termes autour de **Call**, puis afficher explicitement
  `si juste`, `si faux` et `variation possible`. Éviter de mélanger pronostic,
  risque, gain et perte.
- Rendre le choix d'équipe plus tactile : surface pressée, entaille intérieure,
  contraste renforcé et état `selected` accessible.
- Faire apparaître le ticket récapitulatif dès que le choix existe, sans
  déplacer brutalement le bouton.
- Conserver une confirmation en deux temps pour le verrouillage. À terme,
  remplacer l'alerte native par `GriffSheet`, à condition qu'elle gère
  correctement focus, lecteur d'écran et bouton retour Android.
- Ne révéler la distribution des autres joueurs qu'après verrouillage.
- Afficher un reçu persistant : équipe, heure de verrouillage, règle de
  résolution et variation figée.

**Animation**

1. pression du choix à `0.985` et haptic léger ;
2. entaille ou trace qui désigne l'équipe en 180 ms ;
3. ticket qui s'ouvre par layout en 220–260 ms ;
4. après confirmation serveur, les deux côtés se resserrent et le sceau
   « verrouillé » se ferme en 300–360 ms ;
5. haptic moyen seulement quand le serveur a réellement accepté le Call.

Une erreur réseau doit interrompre la séquence, restaurer le bouton et garder
le choix. Elle ne doit jamais produire un faux verrouillage optimiste.

**Technologie :** Reanimated, `PressableSurface`, `GriffSheet`, haptics
centralisés. Skia n'est pas nécessaire.

**Priorité : P1 — première tranche motion.**

### 4.8 Révélation de résultat

**Route :** `mobile/app/result/[id].tsx`

**À conserver**

- le score officiel, la source, le choix et le verdict ;
- la lecture avant/après des Frags et du classement ;
- le lien direct vers le prochain Call ;
- le caractère exceptionnel de cet écran.

**À modifier**

- Corriger le halo de page qui déborde horizontalement dans l'aperçu web. Le
  document de 390 px atteint environ 459 px après l'animation actuelle ; il
  faut clipper le décor à la surface, puis vérifier le rendu natif.
- Donner une séquence différente à la promotion, la rétrogradation, la victoire
  sans changement de grade et la défaite.
- Garder la défaite digne : rouge contenu, entaille et information claire, sans
  secousse ni punition sonore.
- Faire apparaître le CTA vers le prochain Call dès que l'information de
  progression est comprise.

**Séquence proposée**

1. `0–250 ms` : statut officiel et score ;
2. `250–450 ms` : choix du joueur et verdict ;
3. `450–1 000 ms` : `AnimatedMetric` de `Frags avant` vers `Frags après` ;
4. `850–1 300 ms` : grade ou position se met à jour ;
5. `1 200 ms+` : prochain Call et consultation détaillée.

Pour une victoire, un petit nombre de fragments Skia peut converger vers le
compteur. Pour une défaite, la trace se coupe et le delta descend sans particule
explosive. Une promotion peut composer le nouvel emblème ; une rétrogradation
ne doit pas masquer la valeur exacte.

En mouvement réduit, tous les états finaux sont présents immédiatement et
enchaînés par de simples fondus.

**Technologie :** `AnimatedMetric`, Reanimated, haptics ; Skia optionnel derrière
un renderer expérimental et un fallback SVG.

**Priorité : P1 — écran signature.**

### 4.9 Navigation Social

**Routes :** `mobile/app/(tabs)/social/_layout.tsx`,
`mobile/src/features/social/components/SocialSectionNav.tsx`

**À modifier**

- Clarifier les trois territoires : Faction, Cercle et Défis.
- Remplacer les glyphes par des SVG cohérents avec la navigation principale.
- Utiliser une seule trace mobile sous la section active au lieu d'ajouter un
  halo à chaque contrôle.
- Préserver la séparation technique des domaines `faction`, `friends`,
  `missions`, `duels` et `leagues`.

**Animation :** transition de trace en 180–220 ms et fondu du contenu ; pas de
carousel spectaculaire entre des domaines fonctionnellement distincts.

**Priorité : P2.**

### 4.10 Faction et relique collective

**Routes :** `mobile/app/(tabs)/community.tsx`,
`mobile/app/(tabs)/social/index.tsx`, `mobile/app/(tabs)/social/faction.tsx`

**À conserver**

- la relique comme objet social permanent ;
- la lecture progression, contributeurs et prochain seuil ;
- la direction visuelle organique déjà très distinctive.

**À modifier**

- Renommer `RALLIER 99 SUPPORTERS` en `INVITER DES SUPPORTERS`, puisque l'action
  ouvre un partage. Afficher séparément `99 avant la prochaine Fiole`.
- Séparer le contrôleur de données et le renderer de la relique avant toute
  sophistication graphique. Le composant actuel est trop volumineux pour
  accueillir plusieurs moteurs de rendu sereinement.
- Réduire les bordures autour de la relique pour qu'elle redevienne le point de
  contraste principal.
- Montrer la contribution personnelle et le prochain palier sans promettre la
  guerre de factions tant qu'elle n'est pas livrée.

**Animation**

- lors d'une contribution réellement nouvelle, agréger `+N` puis faire voyager
  un fragment de l'identité du joueur vers le liquide ;
- employer `AnimatedMetric` pour le total de supporters ou la charge, seulement
  sur changement ;
- ajouter un indice ponctuel `Maintiens pour faire résonner` plutôt qu'une
  pulsation permanente ;
- réserver la mutation complète à un événement rare de 1,8–2,9 s, avec impact
  haptique et état final stable.

**Technologie :** Reanimated aujourd'hui. Après la bêta, prototype Skia pour le
liquide, les racines, la réfraction et les particules, avec :

- fallback SVG/Reanimated ;
- overlay accessible séparé du canvas ;
- mode mouvement réduit ;
- benchmark Android milieu de gamme ;
- arrêt du renderer hors focus.

**Priorité : P2** pour la clarté et le découpage ; **P3** pour Skia.

### 4.11 Cercle — amis et demandes

**Routes :** `mobile/app/(tabs)/social/friends.tsx`,
`mobile/app/(tabs)/social/requests.tsx`

**À modifier**

- Utiliser une recherche compacte qui s'étend au focus, puis restitue sa place
  à la liste.
- Mettre la ligne du joueur en évidence dans le classement hebdomadaire.
- Standardiser les cartes ami, demande entrante et résultat de recherche via
  `ListRow`.
- Renommer les métadonnées résiduelles en Calls quand elles parlent du même
  concept.
- Conserver la suppression explicite ; ne pas cacher une action sensible
  uniquement derrière un swipe.

**Animation**

- accepter une demande : succès haptique, ligne qui se replie, puis insertion
  dans la liste d'amis ;
- refuser : disparition courte et calme, sans rouge spectaculaire ;
- classement : animer une position seulement si elle a changé depuis la
  dernière observation ;
- états vide/erreur qui gardent exactement la même zone de contenu.

**Technologie :** `GriffTextField`, `ListRow`, `StatePanel`, transitions de
layout.

**Priorité : P2.**

### 4.12 Défis et missions

**Route :** `mobile/app/(tabs)/social/missions.tsx`

**À modifier**

- Donner le rôle de hero à une seule mission active, avec progression,
  contribution restante et échéance.
- Relier le CTA au bon contexte : match éligible, faction ou invitation, plutôt
  qu'un `JOUER` générique.
- Distinguer clairement mission personnelle, duo et faction.
- Garder l'historique stable et compact ; il n'a pas besoin d'animation.

**Animation**

- le progrès s'étend seulement après une contribution nouvelle ;
- une mission duo peut relier brièvement les deux avatars par une trace ;
- à complétion, un sceau se ferme et les Volts montent avec `AnimatedMetric` ;
- aucune pluie de monnaie ni boucle de récompense.

**Technologie :** Reanimated, SVG et `AnimatedMetric`.

**Priorité : P2.**

### 4.13 Duels — liste

**Route :** `mobile/app/(tabs)/social/duels.tsx`

**À modifier**

- Construire les cartes comme une confrontation en deux moitiés, avec statut,
  heure de verrouillage et prochaine action.
- Rendre la chronologie explicite : invitation, deux Calls verrouillés, match,
  verdict.
- N'afficher un compte à rebours animé que lorsque l'expiration est proche.
- Replier les duels résolus dans un historique plus calme.

**Animation**

- acceptation/refus par transition de layout et haptic sémantique ;
- trace de compte à rebours lente, jamais une pulsation anxiogène continue ;
- duel terminé : score qui se stabilise, puis carte qui rejoint l'historique.

**Priorité : P2.**

### 4.14 Invitation de duel et liens profonds

**Routes :** `mobile/app/c/[token].tsx`, `mobile/app/duel/[token].tsx`

**À modifier**

- Concevoir l'écran comme une entrée directe : l'adversaire, le match, les
  règles et la prochaine action doivent être compris sans avoir vu le profil.
- Afficher l'état du lien : valide, déjà accepté, expiré, bloqué ou connexion
  requise.
- Réutiliser exactement le même choix/verrouillage que Match Center pour éviter
  deux grammaires concurrentes.
- Après authentification, restituer le contexte initial sans écran mort.

**Animation :** transition douce depuis un profil si l'entrée est interne ;
aucune dépendance visuelle à cette transition pour un lien externe.

**Priorité : P2**, avec validation des app links en **P0**.

### 4.15 Ligues privées

**Route :** `mobile/app/(tabs)/social/leagues.tsx`

**À modifier**

- Placer la ligue active, la position personnelle et la prochaine échéance
  avant la liste complète.
- Garder la ligne du joueur visible ou épinglée lorsque le classement est long.
- Déplacer création, code d'invitation et rejoindre dans un `GriffSheet` plutôt
  que dans un long formulaire permanent.
- Proposer une action utile dans l'état vide : rejoindre par code ou inviter le
  Cercle.

**Animation :** déplacement de rang une seule fois après mise à jour ; compteur
qui roule uniquement si la position change. Pas de particules.

**Priorité : P3**, après mesure de l'usage du Cercle.

### 4.16 Rank — Ma saison

**Route :** `mobile/app/(tabs)/rank.tsx`, onglet Ma saison

**À conserver**

- les cinq grades, les placements, le rating Frags et le meilleur rang ;
- la qualité graphique des emblèmes et de la montée de saison.

**À modifier**

- Placer le résumé personnel — Frags, grade, rang, précision et CTA — avant
  l'échelle décorative complète. Aujourd'hui, la grande échelle repousse
  l'information décisive sous la ligne de flottaison.
- Rendre l'échelle repliable ou fournir `Voir le parcours`, puis faire défiler
  directement vers le grade courant.
- Expliquer le prochain seuil avec une phrase, pas seulement une jauge.
- Pendant les placements, remplacer tout pseudo-rang par le nombre de verdicts
  restant.

**Animation**

- `AnimatedMetric` sur Frags et rang après un verdict consulté ;
- trace qui progresse vers le prochain grade ;
- seul le palier courant respire très légèrement ; tous les piédestaux ne
  doivent pas être animés simultanément ;
- promotion : composition de l'emblème une fois, puis état statique.

**Technologie :** Reanimated, SVG, `AnimatedMetric`.

**Priorité : P1.**

### 4.17 Rank — Classements

**Route :** `mobile/app/(tabs)/rank.tsx`, onglet Classements

**À modifier**

- Unifier Global, Cercle et Faction via `SegmentedControl`.
- Épingler une carte `Ta position` lorsque la ligne personnelle sort de la zone
  visible.
- Faire ressortir le percentile et l'écart au joueur précédent, sans transformer
  chaque ligne en carte décorative.
- Prévoir skeleton, vide de Cercle et indisponibilité de faction.

**Animation :** indicateur de scope, variation du rang personnel et quelques
transitions de lignes réellement déplacées. Aucun stagger au chargement.

**Priorité : P2.**

### 4.18 Rank — Récompenses de saison

**Route :** `mobile/app/(tabs)/rank.tsx`, onglet Récompenses

**À modifier**

- Ne montrer que les récompenses produites, garanties ou explicitement
  conditionnelles. Une silhouette doit dire comment elle sera obtenue.
- Distinguer `aperçu`, `débloqué` et `attribué`.
- Réserver une révélation animée au moment exact où l'objet est attribué, puis
  proposer `Équiper dans Moi`.
- Préparer un vrai récapitulatif de fin de saison après la bêta : grade final,
  meilleur rang, précision, moment fort et récompense.

**Animation :** objet qui se compose une fois lorsqu'il est attribué ; aucune
roulette ou coffre aléatoire.

**Priorité : P2** pour le contrat visuel ; **P3** pour le récapitulatif complet.

### 4.19 Moi — profil personnel

**Route :** `mobile/app/(tabs)/profile.tsx`

**À conserver**

- la carte d'identité, la signature, la Vitrine et les raccourcis ;
- la sensation de profil comme conclusion visible du parcours.

**À modifier**

- Ajouter au retour une zone discrète `Depuis ta dernière visite` : delta de
  Frags, mission terminée ou objet obtenu. Ne l'afficher que s'il existe un vrai
  changement.
- Faire remonter l'action de profil la plus utile : équiper une nouvelle
  récompense, voir le dernier verdict ou compléter les informations manquantes.
- Alléger les cartes d'outils du bas en supprimant des bordures imbriquées.
- Faire réagir la signature ou la Vitrine seulement quand l'équipement change,
  pas à chaque ouverture de l'onglet.

**Animation**

- morph court lors de l'équipement d'un cadre, titre ou Core ;
- `AnimatedMetric` sur les statistiques modifiées depuis le dernier verdict ;
- highlight unique de la récompense nouvellement obtenue ;
- pas de mouvement ambiant simultané sur toutes les cartes.

**Priorité : P2.**

### 4.20 Profil public et carte partageable

**Routes :** `mobile/app/player/[pseudo].tsx`, `mobile/app/u/[pseudo].tsx`

**À modifier**

- Ordonner identité, preuve de saison, statistiques, relation sociale puis
  actions de sécurité.
- Donner un libellé explicite à ajouter, défier, partager, bloquer et signaler.
- Permettre un aperçu de la carte partageable avant l'ouverture de la feuille
  système.
- Garder blocage et signalement accessibles par bouton ; ne pas les cacher
  derrière un geste.

**Animation :** construction rapide de la carte de partage et haptic léger sur
copie réussie. Aucun décor lourd automatique sur un profil parcouru en série.

**Priorité : P2.**

### 4.21 Vitrine 2.5D

**Route :** `mobile/app/showcase.tsx`

**À conserver**

- le rendu 2.5D actuel, déjà convaincant ;
- la composition par plans et les objets physiques ;
- la Vitrine comme extension conditionnelle du profil.

**À modifier en premier**

- Corriger les textes de contrôle actuellement proches de 5,5–7,5 px et les
  cibles de 31–40 px. Ce sont des défauts bloquants avant toute sophistication.
- Déplacer la personnalisation dans un rail ou une feuille basse avec cibles de
  44 px minimum et libellés lisibles.
- Charger les grands assets à la taille réellement affichée. Les familles
  Social et Showcase représentent l'essentiel du poids graphique actuel.
- Mettre en pause lumière et parallaxe hors focus.

**Animation**

- parallaxe caméra limitée à environ 3–5 degrés ;
- balayage lumineux lent et très peu contrasté ;
- focus d'un objet par zoom de 180–240 ms ;
- transition d'équipement courte et réversible.

**Technologie :** images compositées, Reanimated et éventuels shaders simples
si mesurés. **Pas Filament** : la 3D temps réel augmenterait le coût, la taille,
les risques thermiques et l'accessibilité sans résoudre un besoin V1.

**Priorité : P1** pour lisibilité/performance ; **P3** pour toute expansion.

### 4.22 Locker et boutique

**Route :** `mobile/app/shop.tsx`

**À conserver**

- l'absence d'avantage compétitif ;
- l'aperçu avant achat et la confirmation explicite ;
- les catégories de Loadout existantes.

**À modifier**

- Déplacer `Mes objets / Catalogue` avant les grands blocs Nova et Fondateur.
  L'intention du joueur doit précéder la promotion.
- Transformer les promotions en rail éditorial compact, masqué par feature flag
  lorsque l'offre n'est pas disponible.
- Employer un `SegmentedControl` éventuellement sticky pour inventaire et
  catalogue.
- Ouvrir le détail d'un objet dans `GriffSheet` : rendu, compatibilité, statut,
  prix et action.
- Garder prix et objet connus avant confirmation ; aucun reveal de loot.

**Animation**

- carte pressée avec profondeur courte ;
- preview d'équipement qui morph en 180–260 ms ;
- après achat confirmé, Volts mis à jour par `AnimatedMetric`, objet marqué
  possédé et haptic de succès ;
- aucune roulette, aucun compteur qui tourne avant l'autorité serveur.

**Technologie :** primitives internes inspirées de PanelUI/gluestack, Reanimated.

**Priorité : P1** pour la hiérarchie et le gating.

### 4.23 Volts et historique économique

**Route :** `mobile/app/economy.tsx`

**À modifier**

- Garder le solde fixe au chargement, puis l'animer seulement après une
  transaction comprise.
- Surligner brièvement la nouvelle ligne de ledger et la relier au changement
  de solde.
- Ne pas coder entrée/sortie uniquement par vert/rouge : ajouter signe, libellé
  et type d'opération.
- Passer à `FlatList` lorsque les pages accumulées deviennent longues, pas avant
  d'avoir mesuré le besoin.
- Offrir un reçu détaillé pour achat, attribution et remboursement.

**Animation :** `AnimatedMetric` sur le delta, puis highlight de la ligne
correspondante ; aucune animation permanente de monnaie.

**Priorité : P2.**

### 4.24 Pack Fondateur

**Route :** `mobile/app/founder-pack.tsx`

**Garde-fou**

L'écran doit rester sous feature flag tant que RevenueCat, restauration,
suppression de compte et recette sandbox ne sont pas signés.

**À modifier avant ouverture**

- Réduire la longueur du hero et rendre contenu, prix, restauration et CTA
  visibles sans traverser un long tunnel marketing.
- Garder une zone récapitulative sticky sur les petites hauteurs.
- Présenter les quatre objets dans un rail inspectable, avec aperçu individuel.
- Distinguer achat, restauration, déjà possédé et erreur store.

**Animation**

- après confirmation store et serveur, les quatre objets se déploient une seule
  fois puis deviennent inspectables ;
- animation identique mais plus courte lors d'une restauration ;
- aucun coffre, rareté aléatoire ou pression temporelle fictive.

**Priorité : P0** pour le gating et le parcours réel ; **P3** pour le polish
commercial.

### 4.25 Campagne partenaire

**Route :** `mobile/app/campaign/[key].tsx`

**À modifier**

- Garder toute campagne non contractualisée derrière configuration serveur.
- Réduire le hero et placer la progression personnelle et la prochaine tâche
  au-dessus de la ligne de flottaison.
- Montrer récompenses, conditions et dates sans faux état live.
- Réutiliser les cartes de mission plutôt que créer une deuxième logique de
  progression.

**Animation :** trace de tâche terminée et reveal fixe de récompense ; aucune
animation de rareté aléatoire.

**Priorité : P3**, avec gating en **P0**.

### 4.26 Rapport de campagne partenaire

**Route :** `mobile/app/admin/campaigns/[key].tsx`

**À modifier**

- Traiter l'écran comme un outil d'analyse, pas comme une page marketing : moins
  de capitales, moins de cartes et davantage de comparaisons lisibles.
- Structurer le funnel exposition → ouverture → participation → complétion.
- Ajouter les états de fraîcheur des données, filtre temporel et export.
- Afficher les définitions des métriques pour éviter les interprétations
  différentes entre produit et partenaire.

**Animation :** count-up initial facultatif, une seule fois ; transitions de
filtre sobres. Les graphiques peuvent être construits en Views/SVG, sans Skia.

**Priorité : P3.**

### 4.27 Réglages du profil et notifications

**Route :** `mobile/app/settings/profile.tsx`

**À modifier**

- Séparer identité visible, préférences esport et notifications.
- Afficher une barre de sauvegarde seulement quand le formulaire est modifié.
- Réutiliser un switch et une ligne de réglage partagés avec rôle, état et aide
  accessibles.
- Expliquer les notifications par événement concret : verrouillage imminent,
  début du match, verdict, promotion, mutation et duel.

**Animation :** layout très court lorsque des options dépendantes apparaissent,
haptic léger sur switch, coche de sauvegarde. Rien d'expressif.

**Priorité : P2**, après recette native des notifications en **P0**.

### 4.28 Compte et suppression

**Route :** `mobile/app/settings/account.tsx`

**À modifier**

- Séparer session, récupération, export éventuel et zone destructive.
- Transformer la suppression en parcours explicite : réauthentification,
  saisie de `SUPPRIMER`, traitement serveur, puis reçu.
- Rendre la restauration après erreur réseau sûre et compréhensible.
- Ne jamais laisser entendre que l'app a supprimé le compte avant confirmation
  du backend.

**Animation :** progression d'état et fondu uniquement. Aucun ressort, aucune
célébration, aucune disparition théâtrale.

**Priorité : P0.**

### 4.29 Confidentialité, sécurité, légal et support

**Routes :** `mobile/app/settings/safety.tsx`,
`mobile/app/legal/privacy.tsx`, `mobile/app/legal/terms.tsx`,
`mobile/app/support.tsx`

**À modifier**

- Adopter un registre visuel calme et utilitaire. Space Grotesk doit porter la
  lecture longue ; Barlow Condensed ne sert qu'à de courts repères de marque.
- Garantir corps 15–17 px, interlignage confortable, liens explicites et
  navigation par sections sur les textes longs.
- Donner un reçu immédiat aux changements de consentement ou confidentialité.
- Rendre la liste des comptes bloqués explicite, avec confirmation avant
  déblocage.
- Fournir au support un état envoyé, un moyen de réessayer et les informations
  d'escalade prévues par la release.

**Animation :** uniquement transitions d'état et focus. Aucun décor esport qui
réduise la lisibilité.

**Priorité : P0** pour contenu, juridique, contraste et matrice native.

### 4.30 Administration des matchs

**Route :** `mobile/app/admin/matches.tsx`

**À modifier**

- Concevoir pour un opérateur : filtres sticky par statut, densité contrôlée,
  recherche rapide et actions proches du contexte.
- Remplacer les grands blocs décoratifs par des lignes ou cartes condensées.
- Ouvrir résolution, report, annulation et correction dans un panneau dédié,
  avec résumé avant confirmation.
- Afficher le reçu d'audit après chaque écriture et conserver l'identifiant de
  source.
- Employer une liste virtualisée si le volume simultané dépasse réellement les
  lots bornés actuels.

**Animation :** 160–220 ms sur ouverture d'un panneau ou changement d'état ;
aucun count-up, particule ou transition de marque.

**Priorité : P2** pour l'efficacité, en préservant les invariants backend.

### 4.31 Room

**Route :** `mobile/app/(tabs)/room.tsx`

**Décision : ne pas refondre.**

- Conserver le placeholder et masquer Room de la navigation publique.
- Garder une atmosphère statique ou presque statique.
- Ne pas intégrer Filament, une caméra 3D ou des assets supplémentaires.
- Ne pas afficher de teaser laissant croire à une sortie imminente.

**Priorité : P0 — préserver le gel produit.**

### 4.32 Previews et laboratoire de QA visuelle

**Routes :** les entrées `*-preview.tsx`

Ces routes ne sont pas des écrans produit, mais elles peuvent devenir un vrai
outil de livraison visuelle.

**À modifier**

- Garantir des données, une heure et des animations déterministes.
- Conserver un paramètre `clean` et ajouter des scénarios victoire, défaite,
  promotion, erreur, vide et mouvement réduit.
- Faire échouer la vérification sur erreur de page ou erreur console.
- Corriger les avertissements web de styles dépréciés, easing non pris en charge
  et haptic automatique qui appelle `navigator.vibrate` dans le navigateur.
- Capturer au minimum 390 px, 432 px, un petit Android et un scénario de grande
  taille de texte.
- Ajouter sur natif un parcours automatisé : ouverture Match Center, choix,
  confirmation, résultat, Rank et profil.

**Priorité : P1.**

## 5. Ordre d'implémentation recommandé

### Tranche A — fermeture et sûreté

1. Valider achat/restauration/suppression, liens natifs, notifications,
   juridique et accessibilité conformément à la roadmap.
2. Gater Pack Fondateur, Nova et campagnes non prêtes.
3. Corriger la Vitrine : tailles de texte, cibles tactiles, pause hors focus.
4. Corriger le débordement décoratif du résultat.

### Tranche B — primitives et première motion

1. Créer `PressableSurface`, `SegmentedControl`, `AnimatedMetric`,
   `StatePanel` et la sémantique haptique.
2. Appliquer ces primitives à Login, Onboarding et navigation.
3. Refaire la sélection et le verrouillage de Match Center.
4. Orchestrer la révélation de résultat.
5. Replacer l'information personnelle au-dessus de l'échelle Rank.

### Tranche C — cohérence du cœur produit

1. Hub et Mes Calls.
2. Social navigation, Cercle, missions et duels.
3. Profil, profil public et réglages.
4. Locker/boutique et ledger Volts.
5. QA visuelle déterministe et parcours natif automatisé.

### Tranche D — expériences conditionnelles

1. Mesurer premier Call, retour au verdict, Rank, Cercle, Vitrine et Collection.
2. Si la relique prouve son usage, prototyper son renderer Skia avec fallback.
3. Si la Vitrine devient une destination fréquente et que la 2.5D limite une
   fonctionnalité validée, réévaluer seulement alors la 3D temps réel.
4. Construire le récapitulatif de fin de saison avant toute nouvelle grande
   surface sociale ou commerciale.

## 6. Critères d'acceptation communs

Une animation n'est livrable que si :

- l'action reste compréhensible sans mouvement ;
- le mode mouvement réduit possède un rendu intentionnel ;
- VoiceOver et TalkBack annoncent l'état final, pas chaque frame ;
- le composant ne lance pas une animation à chaque rerender ;
- les listes restent fluides sur Android milieu de gamme ;
- les surfaces tactiles respectent 44 × 44 points ;
- le serveur reste l'autorité pour Call, achat, récompense et suppression ;
- les previews sont déterministes et sans erreur console ;
- l'événement produit associé est mesuré quand il répond à une vraie question.

Avant tout handoff de code mobile, exécuter depuis la racine :

```bash
npm run mobile:architecture
npm run mobile:typecheck
```

## 7. Résultat attendu

Cette direction doit produire une application moins chargée sans la rendre
générique : le quotidien devient rapide, calme et cohérent ; le Call devient
tactile ; le verdict devient le moment signature ; Rank explique clairement la
progression ; les récompenses terminent leur trajet dans le profil. Skia et la
3D restent des multiplicateurs réservés à un besoin prouvé, pas le point de
départ de la refonte.
