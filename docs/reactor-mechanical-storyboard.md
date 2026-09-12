# Chorégraphie mécanique du réacteur

Révision du 12 septembre 2026, après correction des silhouettes d’après la planche de référence. Durée : 3 900 ms. Les cinq machines sont reconstruites séparément. Le décor et les textes restent fixes ; le noyau adapte localement son diamètre et sa position pour rejoindre le réservoir de la forme suivante.

| Temps | Action | Calques |
|---|---|---|
| 0–760 ms | Remplissage complet et activation du noyau | Liquide et voyant local |
| 760–1 260 ms | Mise sous pression | Vibration locale, bulles et son |
| 1 180–1 720 ms | Déploiement du nouveau socle | Moitiés gauche et droite décalées de 100 ms |
| 1 260–1 800 ms | Retrait des pièces sortantes | Côtés et ancien socle |
| 1 260–1 740 ms | Adaptation du réservoir central | Transformation locale et raccord de son habillage |
| 1 620–2 520 ms | Emboîtement des panneaux | Gauche asymétrique et montant droit, ou cage blindée |
| 1 880–2 750 ms | Montée des satellites | Deux côtés, chacun avec un ou deux réservoirs selon la forme |
| 2 020–2 880 ms | Descente de l’armature arrière du Nexus | Deux sections courbes avec ventilateurs |
| 2 600–3 150 ms | Raccordement des conduits | Pixels des tuyaux originaux et impulsion suivant leurs courbes |
| 3 150–3 900 ms | Stabilisation au nouveau niveau | Même interpolation continue pour surface et liquide |
| 3 900 ms | Nouvelle forme et fin du verrou d’interaction | Annonce accessible, vues de destination conservées |

## Réactions et interruption

Toucher : voyant 0–280 ms, conduits 180–650 ms, surface et bulles 450–1 450 ms, extinction à 1 650 ms. L’arrivée d’une contribution augmente continuellement le niveau. La préparation du laboratoire ne simule pas un vrai événement serveur.

Réduction des animations : fondu de 300 ms sans déplacement ni son. Réinitialisation, départ ou arrière-plan : annuler les animations et le son sans valider l’évolution. Au repos : aucun mouvement automatique.

## Géométrie et limites

Les masques, cavités et trajets sont dans `mobile/src/features/social/faction/reactor/artwork.ts`. Ils retirent au rendu le damier opaque des sources générées. Les calques se recomposent depuis une image propre à chaque étape, sans tours copiées ni cylindre unique réutilisé. Les images prémontées au-delà de la destination restent invisibles pendant l’évolution.

C’est une animation 2,5D : découpe des faces visibles et assemblage, avec adaptation locale du noyau ; les volumes cachés et charnières internes d’un modèle 3D ne sont pas disponibles. Les proportions sont fidèles à la lecture de la planche, pas garanties pixel pour pixel.

Cet aperçu reste une démo indépendante. Le branchement aux événements réels de faction, la proposition de rejouer une évolution survenue en absence et le remplacement dans Social ne sont pas réalisés par ce laboratoire.

## Vérification

Contrôler les cinq formes au repos, les quatre évolutions avant/pendant/après, le toucher, le reset pendant la charge, le retour d’arrière-plan et la réduction des animations. Les captures natives complètent les tests du niveau continu, de l’ordre des pièces, de l’unicité de validation et de la persistance de la scène. Avant livraison : architecture, typage et tests ciblés de la relique.

## Matière de l’élixir — seconde passe

Les cuves utilisent un volume bleu à plusieurs profondeurs : absorption sur les bords, assombrissement vers le fond et lumière interne diffuse. Les dégradés principaux sont ancrés dans les coordonnées de chaque cavité pour rester stables pendant la variation de hauteur. Le ménisque est fin, sombre à l’arrière et légèrement éclairé sur sa lèvre avant. Des microparticules déterministes restent immobiles au repos et strictement sous la surface. Les reflets verticaux s’atténuent dans la hauteur ; au toucher, la surface oscille plus lentement et les bulles parcourent une distance plus courte. La géométrie des machines et le calcul continu des supporters restent identiques.

## Raccordement Social et replay — 12 septembre 2026

`CollectiveRelic` utilise maintenant `ReactorScene` sur les deux variantes de Social. Le compteur provient de `useCommunityDashboard` et de l’API de faction existante ; les seuils et les identifiants historiques sont conservés. Les noms affichés et les miniatures suivent Module, Réacteur, Cœur d’arène, Citadelle, Nexus ; 10 000 supporters correspond à la pleine puissance du Nexus, sans sixième récipient.

Au retour sur Social et toutes les 30 secondes au premier plan, une lecture silencieuse actualise les données. Une hausse du compteur joue la réaction locale, y compris la première contribution ; le niveau reste continu. Un nouveau palier propose « Voir l’évolution ». La lecture peut condenser plusieurs niveaux et retrouve le ratio réel à l’arrivée. Elle ne modifie pas le nombre de supporters ni les récompenses.

La dernière évolution terminée est conservée dans la mémoire locale existante, par utilisateur et faction, puis proposée par « Revoir la transformation », y compris après rechargement. Une interruption ne marque rien comme présenté ; un échec de stockage laisse l’événement réessayable. L’acquittement ne remplace pas une réponse de chargement plus récente. La mémoire reste locale à l’appareil.

La réaction légère inclut désormais le battement local du noyau avant les conduits et les bulles sur les cinq formes, Module compris. La charge de mutation comporte une impulsion dans les conduits. Les pièces restent des découpes 2,5D des illustrations : le noyau est raccordé par déplacement et fondu local, et les tuyaux par révélation, sans simulation d’emboîtement 3D.

Validation : typecheck et architecture réussis ; 95 tests de faction réussis, couvrant la lecture, le replay, les paliers sautés, l’annulation, les erreurs de stockage, la persistance et la progression continue. Vérification native du parcours Voir → message d’évolution → Revoir dans `/social-v2-preview`, puis du réacteur sur `/social` avec la faction réelle Fnatic à 1 supporter. Aucun compteur serveur n’a été modifié pour ces essais. Son WAV vérifié à 3,9 s, PCM mono 22 050 Hz et non silencieux ; qualité à l’écoute non confirmée. Les sources et animations visuelles restent celles de la passe matière validée.

## Vidéo de démonstration

La route de développement `/reactor-lab-preview?film=1` joue automatiquement `ReactorFilmScreen`, avec le vrai moteur de rendu : contribution, toucher, remplissage, puis mutation pour les cinq formes et pleine puissance finale. Les données sont explicitement simulées. Le MP4 d’environ une minute est une capture native du simulateur, recoupée au début et sonorisée après capture avec le WAV de l’application. Les sons sont alignés sur les changements de phase visibles de la vidéo ; ce montage ne constitue pas une capture audio native.

### Correction de fluidité et démonstration progressive — 12 septembre

- Les photographies des pièces et leurs conduits utilisent des racines SVG
  statiques séparées, mises en cache par la vue native. La chorégraphie déplace
  ces vues via Reanimated ; les effets liquides ne redessinent plus leurs masques.
- Le rendu de repos préchargé reste dormant pendant la transformation.
- Six bulles de tailles différentes remontent depuis le fond, avec des départs
  décalés et une découpe au niveau réel du liquide. Elles disparaissent au repos
  et avec la réduction des animations.
- Le film démarre chaque forme vide et montre 0, 10, 20…100 % avec une pause à
  mi-remplissage pour la réaction au toucher. Pour le Module, les légendes sont
  0, 10, 20…100 supporters ; les autres formes utilisent leurs seuils existants.
  Ces étapes sont uniquement le scénario de démonstration : la progression
  réelle reste continue, sans quantification par dizaine.
- Comparaison des captures natives avant/après la séparation des couches :
  intervalles médians des quatre transitions de 282/302/303/417 ms à
  17/18/18/25 ms. Mesure des timestamps vidéo du simulateur, pas un benchmark
  d'un iPhone physique ; les queues de distribution restent plus lentes.

### Étude Forge — Module vers Réacteur

Démo isolée derrière `reactor-lab-preview?forge=1`, sans activation dans Social.
Durée : 4,2 s, puis repos avec relecture possible.

- 0–780 ms : charge du réservoir ; 800–1120 ms : retenue sonore.
- 1120 ms : libération locale de l'énergie, conservation du cœur visible.
- 1200–1780 ms : deux demi-socles, approche courte et verrouillages décalés.
- 1660–2510 ms : panneaux articulés près de leurs attaches, léger dépassement
  amorti et retour exact à la pose de l'illustration.
- 2600–3350 ms : raccordement des conduits ; éclats ponctuels aux attaches.
- 3340–4020 ms : reflet de révélation découpé sur la silhouette du Réacteur.
- 3450–4200 ms : retour du liquide au plancher de la nouvelle progression.

Les pièces restent les découpes photographiques existantes, pivotées dans des
vues natives ; il s'agit d'une étude 2,5D, pas de nouveaux modèles articulés 3D.
Audio original reproductible : `mobile/scripts/generate-forge-audio.py`.
Réduction des animations : fondu court, sans effets supplémentaires ni son.

### Variante Surchauffe — Module vers Réacteur

La démo `forge=1` présente désormais la variante demandée : 5 secondes, chauffe
sur 0–1750 ms, ébullition, ruptures à 2000/2140 ms, châssis de remplacement,
refroidissement 3500–4250 ms, puis remise à zéro de la nouvelle progression.
Le liquide thermique utilise Skia (fenêtres dans la photographie, matrice de
couleur GPU, dix bulles) pour éviter de recalculer des filtres SVG sur les photos.
Les conduits latéraux partent vers l'extérieur avec une rotation ; vapeur douce
et étincelles restent latérales. Le réservoir central demeure visible.
Le rendu standard bleu reste celui de Social ; cette variante est isolée à
l'atelier. Bande sonore originale : `generate-overheat-audio.py`.
