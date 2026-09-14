# Contrat de travail — élixir du réacteur

Ce contrat complète `docs/relic-animation-workflow.md` pour toute modification
du liquide dans le réacteur collectif actuel.

## Source géométrique

La vérité est la machine rendue par `ReactorScene.tsx`. Utiliser les cavités et
coordonnées de `reactor/artwork.ts`, puis vérifier le résultat dans
`/social-relic-lab-preview`. Ne jamais reprendre un masque ou un niveau de
l’ancienne relique organique.

- Chaque cavité suit sa propre largeur et son propre plancher.
- Les pièces métalliques restent devant l’élixir.
- Le remplissage, le ménisque, la vague et les bulles utilisent le même ratio.
- Le liquide ne porte aucune graduation, grille, séparation ni chiffre.

## Comportement

- Le niveau est continu et strictement monotone entre le seuil de la forme et
  son prochain objectif.
- Deux nombres de supporters consécutifs produisent deux niveaux mathématiques
  différents, sans arrondi par palier.
- Au repos, le liquide est immobile. L’arrivée d’un supporter peut être amortie
  brièvement.
- Pendant une mutation, l’ancienne forme atteint son niveau final ; la nouvelle
  repart au niveau exact de sa propre progression.
- La réduction des animations utilise une transition courte sans mouvement
  secondaire ni son.

## Direction visuelle

L’élixir actuel est bleu profond, dense au fond et plus lumineux près du
ménisque. Ses reflets restent contenus dans le verre. Au toucher seulement, la
surface peut se déformer et des bulles irrégulières peuvent remonter. La matière
ne masque ni la structure, ni le noyau, ni les reflets du verre.

## Validation

1. Comparer plusieurs ratios sur chacune des cinq formes.
2. Vérifier que deux valeurs consécutives donnent des niveaux différents.
3. Contrôler l’absence de graduations dans les rendus web et natif.
4. Observer le repos, le toucher et la mutation complète.
5. Vérifier l’occlusion par les pièces métalliques et les cavités secondaires.
6. Exécuter les contrôles d’architecture, de typage et les tests ciblés du
   réacteur.

Un résultat qui passe les tests mais dont le masque, le cadrage ou la matière
est faux n’est pas terminé.
