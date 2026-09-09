# Onde Titanide

Objet `sang-des-titans-titan-wave-effect`, Pack Sang des Titans.

## Surfaces

- Grille du pack : illustration originale statique, inchangée.
- Détail dans `TeamPackScreen` : `TitanWavePreview`, lecture unique à l’ouverture,
  toucher pour rejouer. Les touches pendant la lecture sont ignorées.
- Laboratoire : `/titan-wave-preview` (protégé par `PreviewRoute`). Les boutons de
  poses et la réduction forcée sont exclusivement des commandes de développement.
- Aucun changement aux achats, à l’équipement, à la relique ou à la Clutch Room.

## Sources et génération

Original préservé : `mobile/assets/shop/packs/sang-des-titans/items/titan-wave-effect.png`
(768 × 512 RGBA). Il représente déjà le pic, donc il n’est **jamais** utilisé en fond
animé. Seule la vignette continue à l’utiliser.

`rest-master.png` (1536 × 1024 RGB) est une reconstruction générée du socle au repos,
à partir de l’original : retirer l’explosion, les roches suspendues, les étincelles,
la fumée et le halo cyan ; conserver le basalte, les marches circulaires, les
fissures orange et la vue elliptique. Cette reconstruction n’est pas une extraction
pixel à pixel de la base originale. L’image générée avait un damier opaque : elle
n’est pas chargée dans l’application.

Reconstruction des assets livrés, depuis la racine, avec Python 3 + Pillow :

```
python3 mobile/scripts/prepare-titan-wave.py
```

Le script conserve les deux sources et produit des PNG RGBA :

- `rest.png` : extraction du socle sombre/chaud, retrait du damier neutre clair,
  silhouette limitée au socle et léger anticrénelage ;
- `fissures.png` : masque des pixels orange du même socle, y compris les arêtes
  minérales chaudes, strictement au même emplacement ;
- `rock-1.png` à `rock-4.png` : découpes polygonales de quatre roches de l’original,
  alpha d’origine conservé ; les rectangles de découpe ne sont jamais opaques.

`rest.png` et `fissures.png` partagent l’artboard 768 × 512. Les coordonnées des
roches sont dans `timeline.ts`, dans ce même artboard. Le cadrage de tous les
calques reste commun. Le socle n’a aucune transformation animée. Le transform
statique du groupe adapte uniquement le cadrage à l’espace disponible.

## Séquence (Reanimated)

| Temps | Calques |
|---|---|
| 0–280 ms | Illumination des fissures extraites et concentration orange localisée |
| 250–770 ms | Expansion du seul anneau cyan ; rapport elliptique 0,4375 ; centre glissant vers le plan inférieur du socle |
| 390–1210 ms | Quatre roches : trajectoires paraboliques, faible rotation, retombée et disparition près de la base |
| 300–1330 ms | Six petites particules orange/cyan |
| 900–1600 ms | Dissipation ; fissures éteintes à 1480 ms ; retour au socle seul |

Le cœur est un petit gradient radial elliptique. L’anneau est un contour séparé,
non une nouvelle explosion. Aucun flash plein écran, zoom global ou vibration.

## Cycle de vie et accessibilité

Une seule horloge Reanimated, 1600 ms, sans boucle. Garde synchrone contre les
touches répétées et bouton désactivé pendant la lecture. Annulation au démontage,
à la perte de focus de l’écran et au passage de l’app en arrière-plan. Retour au
repos à la désactivation ; pas de reprise intempestive au premier plan.

La préférence système de réduction des animations est lue à l’ouverture et ses
changements sont écoutés : socle statique, sans lecture automatique. Les calques
sont cachés des lecteurs d’écran ; le contrôle porte un libellé et un état occupé.

## Validation

Voir le compte rendu dans `validation.md`. Une validation web ne remplace pas une
observation sur appareil/simulateur natif.
