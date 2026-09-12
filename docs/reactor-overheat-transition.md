# Transition de surchauffe du réacteur

Direction validée par l’utilisateur le 12 septembre 2026 : étendre l’essai
Module → Réacteur aux quatre évolutions. Cette direction industrielle bleue,
avec activation orange/rouge, remplace les anciennes indications violettes
pour les cinq machines actuelles.

## Moteur commun

`ReactorScene` utilise la même séquence dans Social, le laboratoire, le film
et la démo `griff:///reactor-lab-preview?forge=1` :

- 0–1 750 ms : montée en température, bleu → orange → rouge ;
- vers 2 000 ms : rupture latérale, vapeur et étincelles ;
- 2 000–3 700 ms : conservation/recomposition du réservoir central,
  assemblage du socle, des côtés puis des pièces arrière ;
- 3 500–4 250 ms : retour au bleu ;
- 4 350–5 000 ms : stabilisation au ratio réel de la nouvelle étape.

`overheatMotion.ts` porte les horloges et le calcul du niveau. Les légendes
facultatives de l’atelier suivent l’horloge native ; elles ne déclenchent pas
l’animation. Un délai de préparation de 300 ms précède la séquence.

Le Nexus peut jouer une charge terminale sans créer une sixième forme.
Un saut de plusieurs étapes vise directement la forme demandée et conserve
son ratio. Le niveau n’est pas arrondi par dizaine. Une cuve déjà pleine ne
redescend pas pendant la charge ; sinon une réserve de dilatation de 4 %
laisse de la place au bouillonnement.

## Rendu

`ThermalLiquid` recolore la matière photographique avec Skia, strictement
dans les cavités mesurées. Les cuves latérales utilisent la même matière et
la même température. Ne pas réintroduire le filtre SVG FeColorMatrix ou un
rectangle opaque : les essais précédents produisaient des gels et des aplats.

`OverheatEffects` reprend les tracés de conduits de `MACHINE_ART` et transforme
les points de sortie depuis les coordonnées de chaque illustration.
`forgeMotion` pilote l’assemblage, avec une arrivée différée des pièces arrière
du Nexus. Le rendu léger au repos reprend après la transition.

## Accessibilité et interruption

Avec réduction des animations : fondu et interpolation du niveau en 300 ms,
sans surchauffe, particules ni son. Quitter l’écran ou passer l’application en
arrière-plan annule la séquence, arrête le son et prévient le composant parent.
La progression n’est acquittée que par le callback de fin.

## Vérification

L’atelier déroule les quatre évolutions puis la charge terminale du Nexus,
avec un bouton de replay. Vérifier les cuves latérales, le bouillonnement,
la rupture, le retour au bleu et le niveau final. Exécuter les contrôles
`mobile:typecheck`, `mobile:architecture` et les tests `overheatMotion`,
`forgeMotion`, `relicInteraction` et `CollectiveReactor`.
