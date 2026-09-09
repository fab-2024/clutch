# Validation — 8 septembre 2026

## Observé dans le navigateur

Prévisualisation Expo web locale, viewport 390 × 844 :

- illustration originale inspectée à 768 × 512 avant le travail ;
- socle de repos sans explosion, sans fond opaque, sans roche suspendue ;
- poses 200 ms, 500 ms, 850 ms, 1600 ms examinées ;
- cadrage agrandi après première observation ; anneau cyan épaissi pour rester
  lisible à taille mobile, sans transformation du socle ;
- quatre roches conservées opaques pendant la montée et la chute, puis fondu
  local près de leur point de retombée ;
- lecture réelle observée dans la fiche du pack, horloge de l’anneau échantillonnée
  pendant une relecture : croissance puis extinction, pas de boucle ;
- touches rapprochées durant la lecture : pas de cumul ;
- fermeture pendant une relecture : aucun composant `titan-wave-preview` restant ;
- réouverture de l’objet : nouvelle lecture automatique ;
- préférence système réduite activée **avant** l’ouverture : aucune énergie
  ni anneau visible (opacités 0), libellé « Animations réduites » ;
- correction d’une valeur initiale Reanimated périmée : interrogation
  `AccessibilityInfo.isReduceMotionEnabled()` à chaque montage ;
- aucune erreur runtime dans la console du navigateur.

Captures : `mobile/docs/visual-validation/titan-wave-2026-09-08/`.

L’export vidéo tenté via agent-browser a échoué au niveau du FFmpeg local : aucun
fichier vidéo n’est présenté comme preuve. Les captures, les échantillons de
styles pendant la lecture et l’aperçu interactif sont disponibles.

## Tests et contrôles

- `npm run mobile:architecture` : OK.
- `npm run mobile:typecheck` : OK.
- ESLint ciblé sur les composants, la séquence et les tests : OK.
- 25 tests, 4 suites : `TeamPackScreen`, `TeamPackPreviewScreen`, chronologie
  Titan Wave et cycle de vie de `TitanWavePreview`.
- Les tests de cycle de vie vérifient la lecture unique, les touches répétées,
  la relecture après terminaison, l’annulation en arrière-plan, l’absence de
  redémarrage automatique au premier plan, le démontage et le rendu réduit.
- PNG dérivés contrôlés : RGBA, alpha compris entre 0 et 255. Originaux conservés.

## Limite native

**Rendu iOS/Android non vérifié visuellement.** Aucun outil XcodeBuildMCP n’est
exposé ; `xcrun simctl list devices booted` échoue car `simctl` n’est pas installé.
Aucun projet natif `mobile/ios` n’est présent. Les tests React Native et le typage
ne remplacent pas une lecture sur simulateur ou appareil.

À exécuter sur appareil : ouvrir le Pack Sang des Titans, toucher Onde Titanide,
rejouer plusieurs fois, fermer pendant la lecture, passer l’application en
arrière-plan et activer Réduire les animations. Vérifier en particulier les
contours elliptiques et les gradients SVG.

## Accès

- Storyboard interactif : `http://localhost:8085/titan-wave-preview`.
- Intégration réelle sans achat :
  `http://localhost:8085/team-pack-preview?packId=sang-des-titans` puis objet 8.

Routes limitées au développement par `PreviewRoute`.
