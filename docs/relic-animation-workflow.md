# Workflow d’animation de la relique

Utiliser ce workflow avant toute modification visuelle ou comportementale de la relique. Une demande explicite de l’utilisateur peut modifier ces choix, mais pas être remplacée par eux.

## Contrat visuel par défaut

- Au repos, aucune animation continue. Le cœur et les racines peuvent rester lisibles mais doivent sembler dormants.
- Au toucher, le cœur réagit d’abord, l’énergie se propage ensuite dans les racines, puis le liquide bouillonne. Le retour au repos doit être propre.
- Une mutation ne joue que lorsqu’un événement de mutation est réellement prêt. Elle charge le cœur, libère l’énergie et remplace le récipient une seule fois.
- L’illustration source est la vérité géométrique. Ne jamais redessiner approximativement le cœur ou les racines par-dessus elle.
- Web et natif doivent raconter la même séquence, même si SVG et Skia utilisent des implémentations différentes.

## 1. Établir la référence avant de coder

1. Inspecter les illustrations à leur résolution originale avec un outil visuel.
2. Ouvrir `http://localhost:8088/social-relic-lab-preview` et capturer trois références : repos, réaction simple et mutation.
3. Formuler le défaut observé en termes concrets : mauvais alignement, silhouette déformée, masse lumineuse trop grande, rythme illisible ou hiérarchie d’effets incorrecte.
4. Vérifier les fichiers qui font autorité :
   - `mobile/src/features/social/faction/components/InteractiveRelicVial.tsx`
   - `mobile/src/features/social/faction/components/StaticRelicVial.tsx`
   - `mobile/src/features/social/faction/relicArtwork.ts`
   - `mobile/scripts/generate-relic-anatomy-mask.mjs`

Ne pas commencer par ajouter un nouvel effet tant que le défaut actuel n’est pas identifié.

## 2. Décomposer l’effet en calques

Avant l’implémentation, écrire l’inventaire minimal des calques concernés : scène statique, anatomie dormante, anatomie active, surface du liquide, bulles, flash de mutation, particules et transition de récipient.

Pour chaque calque, décider explicitement :

- sa source visuelle ;
- sa zone de découpe ;
- son déclencheur ;
- son intervalle temporel ;
- s’il doit exister au repos ;
- son équivalent Web et natif.

Pour une forme présente dans une image raster, préférer une extraction déterministe et reproductible avec transparence. Conserver le script de génération avec l’asset. Réserver la génération d’images aux explorations de direction artistique ; ne pas l’utiliser pour une extraction censée être pixel-perfect.

## 3. Écrire le storyboard temporel

Définir les étapes avant de toucher au code. Point de départ recommandé pour la réaction simple :

| Temps | État attendu |
|---:|---|
| 0 ms | repos complet |
| 60–180 ms | premier battement du cœur |
| 180–550 ms | activation progressive des racines |
| 300–1 250 ms | oscillation de surface et bulles |
| 1 250–1 650 ms | extinction et retour au repos |

Pour la mutation, distinguer charge, rupture, explosion, remplacement du récipient et stabilisation. Une explosion importante ne doit pas masquer la provenance du cœur ni transformer toute la scène en tache uniforme.

## 4. Implémenter par incréments visuels

1. Faire fonctionner le cœur seul et le valider.
2. Ajouter les racines sans modifier la silhouette du cœur.
3. Ajouter le liquide sans recolorer tout l’intérieur du récipient.
4. Ajouter enfin l’explosion et la transition de récipient.

Contraintes d’implémentation :

- conserver le même artboard, le même ajustement d’image et les mêmes coordonnées entre la scène et les calques ;
- ne pas appliquer de zoom ou filtre chromatique à l’ensemble de la scène pour simuler une activation locale ;
- ne pas animer le conteneur parent lorsqu’un seul élément interne doit bouger ;
- limiter les halos : ils renforcent une forme, ils ne doivent pas la remplacer ;
- respecter la réduction des animations ;
- garder le laboratoire de développement limité à « Réinitialiser » et « Préparer la mutation ».

## 5. Boucle obligatoire de validation visuelle

Après chaque incrément :

1. recharger la prévisualisation ;
2. réinitialiser l’Ampoule ;
3. vérifier le repos ;
4. toucher la relique et observer au minimum le début, le milieu et la fin de la réaction ;
5. préparer puis jouer la mutation jusqu’au nouveau récipient ;
6. vérifier la console du navigateur ;
7. remettre la démo au repos et la laisser ouverte pour l’utilisateur.

Rejeter immédiatement une piste si elle :

- invente une nouvelle anatomie ;
- décale les calques par rapport à la source ;
- produit une boule ou une nappe lumineuse qui efface le cœur ;
- fait bouger le reste de la page ;
- rend l’état actif moins lisible que l’état de repos.

Ne pas qualifier le résultat de terminé sur la seule base du typage ou des tests : cette fonctionnalité exige une vérification visuelle réelle.

## 6. Vérifications avant livraison

Depuis la racine du dépôt, exécuter :

```bash
npm run mobile:architecture
npm run mobile:typecheck
npm --prefix mobile test -- --runInBand src/features/social/faction/__tests__/relicInteraction.test.ts
```

Confirmer aussi que les assets dérivés ont de l’alpha, que leur script de génération est reproductible et qu’aucune erreur runtime récente n’apparaît dans la prévisualisation.

Dans le compte rendu final, indiquer le changement visuel observable, le lien vers la prévisualisation, les fichiers principaux et les validations exécutées.
