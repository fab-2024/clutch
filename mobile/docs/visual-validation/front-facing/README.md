# Vues frontales des objets — 9 septembre 2026

Les 60 visuels de collection des catalogues actifs ont été contrôlés. Trente objets en volume ont été recréés avec une caméra plus basse, puis détourés en PNG RGBA. Les trente cadres, emblèmes, bannières suspendues et pièces déjà frontales conservent leur image originale. Les salles, effets et anciennes collections archivées sont hors de ce lot.

Les catalogues `originalPackCatalog.ts` et `teamPackCatalog.ts` référencent maintenant les variantes dans `assets/shop/front-facing/`. Cela couvre la boutique et les objets résolus dans la vitrine. Les images originales sont conservées dans `assets/shop/packs/`.

## Méthode

- Génération avec l’outil imagegen, à partir de chaque original et de la vue de l’œuf validée par l’utilisateur comme référence d’élévation. Le prompt commun est conservé dans [generation-prompt.txt](generation-prompt.txt).
- L’œuf reprend la vue approuvée avec remplacement du damier peint par un fond vert. Le drone, le Totem des Trois Voix et la voiture ont été repris pour abaisser davantage la caméra.
- Détourage automatique explicitement autorisé par l’utilisateur : extraction du fond vert, nettoyage des contours, redimensionnement **uniforme**, centrage et conservation du point de contact inférieur de l’original. Aucun étirement vertical, découpage déformant du socle ou `rotateX` du sprite.
- Le redimensionnement tient dans les dimensions opaques de l’original et conserve les proportions de la nouvelle vue. Le cadrage et certains microdétails peuvent varier, car il s’agit de nouvelles images générées, sans modèle 3D source.
- Les marges transparentes inférieures des trente variantes sont mesurées dans `ShowcaseRoomEditorScene.tsx` pour placer leur base sur le support.

Le [manifest.json](manifest.json) associe chaque identifiant à son original, son rendu source et sa variante. `python3 mobile/scripts/prepare-front-facing.py` reproduit le détourage avec Pillow, NumPy et SciPy, si les rendus source locaux du manifeste sont disponibles.

## Contrôle visuel

Les trente PNG finaux ont été revus sur fond sombre : [planche 1](review-1.jpg), [planche 2](review-2.jpg). Les coins sont réellement transparents, les dimensions du canevas correspondent aux originaux et le point de contact alpha inférieur est conservé à un pixel près.

L’aperçu `/showcase-alignment-preview` utilise le catalogue réel. Il accepte `?pack=circuit-zero` ou tout identifiant de collection active pour vérifier chaque famille dans la galerie. La route respecte la protection `PreviewRoute` existante.

Validation dans le navigateur intégré : composition mixte avec œuf, hache, totems et drone ; collection Circuit Zéro avec lumières vertes et espaces évidés. Aucun message d’erreur console observé. L’outil agent-browser CLI n’était pas installé ; les contrôles ont utilisé le navigateur intégré.

## Vérifications du projet

- `npm run mobile:architecture`
- `npm run mobile:typecheck`
- Tests ciblés `showcaseRoomPerspective.test.ts` et `ShowcaseRoomScene.test.tsx` : 29 tests.

Les tests utilisent une URL Supabase locale factice et une clé publique factice uniquement pour satisfaire la configuration d’import ; aucun accès distant n’est nécessaire.
