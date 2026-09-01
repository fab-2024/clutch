# Prompt de travail — améliorer l’élixir de la relique

Utilise ce prompt pour la prochaine itération de l’élixir. Il complète `docs/relic-animation-workflow.md` et remplace les choix de paliers visibles décrits dans l’ancienne itération.

## Prompt

Tu travailles sur l’élixir de la relique Clutch dans la preview `http://localhost:8088/social-relic-lab-preview`.

### Source géométrique obligatoire — page Social V2

La seule source de vérité est le récipient effectivement rendu par la dernière page Social V2. Commence par identifier l’asset `relic-scene-*` utilisé pour chaque forme et observe son cadrage réel dans `StaticRelicVial`. Ne réutilise aucun `interiorPath`, niveau, plancher ou largeur provenant des anciens assets `ampoule.png`, `fiole.png`, des anciens cutouts ou d’une version Skia sans l’avoir recalibré sur la scène actuelle.

- Extrais ou mesure la cavité intérieure sur chaque asset actuel.
- Décris sa largeur à plusieurs hauteurs : le ménisque doit suivre ce profil et ne peut pas conserver une largeur fixe lorsque la forme s’élargit ou se resserre.
- Identifie les pièces métalliques placées devant le liquide. Elles doivent être recomposées depuis la scène source dans un calque d’occlusion, jamais recouvertes par l’élixir.
- Le même profil de cavité pilote le remplissage statique, le ménisque actif, la vague et l’origine des bulles.
- Conserve la composition, les informations et la navigation de la page V2.

Ton objectif est de créer un élixir violet très sombre qui possède une vraie consistance visuelle et dont le niveau monte progressivement en fonction du nombre exact de supporters. Le verre ne doit afficher aucune graduation : aucun trait horizontal, aucun cran, aucune grille, aucune séparation en dix parties et aucun chiffre superposé dans la relique.

Commence par relire `docs/relic-animation-workflow.md`, inspecter la preview actuelle au repos et au toucher, puis formuler précisément les défauts observés avant de modifier le code.

### Comportement attendu

- Le niveau est continu et strictement monotone : chaque supporter supplémentaire fait monter légèrement l’élixir.
- Calcule un ratio réel entre le seuil de début de la forme et son prochain objectif, puis interpole le niveau entre le fond et le plafond de la cavité sans `Math.floor`, arrondi par dizaine ou palier discret.
- Deux nombres de supporters consécutifs, par exemple 19 et 20 ou 50 et 51, doivent produire deux niveaux mathématiquement différents, même si l’écart visuel reste subtil.
- Au repos, le liquide est parfaitement immobile. Une variation de niveau peut être amortie brièvement lors de l’arrivée d’un nouveau supporter, mais aucune animation permanente ne doit tourner.
- Pendant une mutation, l’ancien récipient atteint son niveau final avant l’explosion ; le nouveau récipient repart au niveau correspondant à sa propre progression.
- La surface statique, la vague au toucher et les bulles utilisent une seule fonction de calcul du niveau afin de ne jamais se désaligner.

### Direction visuelle

- Utilise un violet profond, presque noir dans les zones denses, avec une légère remontée de violet dans la lumière.
- Donne de la matière avec plusieurs profondeurs : densité plus forte vers le fond, volume central diffus, ménisque légèrement épais et reflet réfracté très discret.
- L’élixir doit évoquer une substance visqueuse ou alchimique, pas un simple rectangle transparent ni une lumière plate.
- Le cœur et les racines doivent rester visibles à travers le liquide. La matière peut les teinter ou les réfracter légèrement, jamais les masquer.
- Au toucher seulement, la surface peut se déformer avec une inertie lourde et les bulles peuvent monter plus lentement, avec des tailles irrégulières, pour renforcer la viscosité.
- Conserve le violet au repos. L’orange appartient à l’activation du cœur, des racines et aux réactions déclenchées.
- Tous les calques restent strictement découpés par `interiorPath` et alignés sur l’artboard source.

### Interdictions absolues

- Aucun trait ou repère de graduation visible sur ou dans le récipient.
- Aucun découpage visuel en dix bandes.
- Aucun remplissage qui saute par tranches de dix supporters.
- Aucun mouvement continu au repos.
- Aucun aplat opaque qui efface le cœur, les racines ou le verre.
- Aucun zoom, filtre colorimétrique ou animation appliqué à toute la scène pour simuler le liquide.

### Implémentation à viser

- Remplace la notion de `elixirStep` par un `fillRatio` continu borné entre `0` et `1`.
- Remplace `relicLiquidLevelForStep` par une fonction pure de niveau continu, partagée par le rendu statique et le rendu interactif.
- Supprime les séparateurs actuellement produits par `segmentBoundaries` dans `RelicEnergyArtwork.tsx`.
- Recalibre les chemins de cavité sur les scènes actuelles et ajoute un profil de largeur interpolé selon la hauteur.
- Recompose au-dessus du liquide les éléments de structure qui traversent la cavité, en réutilisant les pixels de l’asset source.
- Préserve la parité entre SVG Web et Skia natif.
- Respecte la réduction des animations.
- N’ajoute aucun bouton au laboratoire de développement.

### Validation obligatoire

1. Compare visuellement les niveaux à 1, 10, 50, 90, 99 et 100 supporters sur l’Ampoule actuelle.
2. Mesure les niveaux à 19 et 20, puis à 50 et 51 : ils doivent être différents et suivre la même interpolation.
3. Vérifie qu’aucune ligne horizontale de graduation n’est rendue dans le SVG.
4. Vérifie le repos, le début, le milieu et la fin du toucher à mi-remplissage.
5. Vérifie que vague et bulles restent sous la surface calculée.
6. Joue la mutation complète et vérifie l’ancien puis la Fiole actuelle, notamment l’occlusion de sa bague métallique centrale.
7. Contrôle les erreurs runtime récentes dans la preview.
8. Exécute `npm run mobile:architecture`, `npm run mobile:typecheck` et les tests ciblés de la relique.

Ne considère pas le travail terminé uniquement parce que les tests passent. Le résultat final doit donner l’impression d’un liquide sombre, dense et vivant, sans aucune apparence de jauge graduée.
