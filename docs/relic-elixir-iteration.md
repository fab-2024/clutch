# Itération active — élixir à dix paliers

> **Historique remplacé.** La demande la plus récente supprime les paliers et toutes les graduations visibles. Pour la prochaine implémentation, suivre `docs/relic-elixir-improvement-prompt.md` et ne pas réutiliser le contrat ci-dessous.

Ce document applique `docs/relic-animation-workflow.md` au remplissage de l’Ampoule entre 1 et 100 supporters.

## Référence observée

- À **50 supporters**, l’élixir actuel reste trop transparent et son niveau continu est presque impossible à lire.
- Aucun repère ne permet de comprendre que la première mutation arrive à 100 supporters.
- La surface animée du bouillonnement utilise un niveau fixe et ne suit pas précisément le niveau statique.

## Contrat visuel

- L’élixir est violet très sombre, avec une surface violette lisible mais sans halo cyan.
- La cavité est divisée par neuf séparateurs horizontaux, soit dix volumes égaux.
- Entre 1 et 99 supporters, le remplissage n’évolue qu’à 10, 20, 30… 90 supporters.
- À 100 supporters, l’Ampoule est montrée pleine pendant la mutation, puis la nouvelle Fiole repart vide.
- Le remplissage, la surface animée et les bulles partagent exactement le même niveau.

## Inventaire des calques

| Calque | Source | Déclencheur | Repos | Web / natif |
|---|---|---|---|---|
| Volume d’élixir | dégradé violet sombre, découpé par `interiorPath` | palier supporter | oui | SVG |
| Surface | ellipse au niveau du palier | palier supporter | oui | SVG |
| Séparateurs | neuf traits horizontaux découpés par `interiorPath` | toujours | oui | SVG |
| Bouillonnement | vague et bulles existantes | toucher | non | SVG / Skia |
| Transition | Ampoule pleine → Fiole vide | mutation | non | Reanimated |

## Table de progression — Ampoule

| Supporters | Palier | Niveau attendu |
|---:|---:|---|
| 1–9 | 0/10 | fond uniquement |
| 10–19 | 1/10 | premier volume |
| 20–29 | 2/10 | deuxième volume |
| 30–39 | 3/10 | troisième volume |
| 40–49 | 4/10 | quatrième volume |
| 50–59 | 5/10 | moitié |
| 60–69 | 6/10 | sixième volume |
| 70–79 | 7/10 | septième volume |
| 80–89 | 8/10 | huitième volume |
| 90–99 | 9/10 | neuvième volume |
| 100 | 10/10 | plein, mutation prête |

## Critères de rejet

- aucun niveau intermédiaire entre deux multiples de dix ;
- aucun séparateur hors de la cavité ;
- aucune teinte cyan dans l’élixir statique ;
- aucun liquide assez opaque pour masquer le cœur ou les racines ;
- aucune vague ou bulle décalée par rapport à la surface visible.

## Validation finale

- **10 / 19 / 20 supporters :** niveaux mesurés à `668 / 668 / 646`, donc aucun mouvement avant le multiple de dix suivant.
- **50 supporters :** niveau `580`, cinquième séparation atteinte et volume violet sombre translucide.
- **100 supporters :** niveau `470`, Ampoule pleine pendant la mutation.
- **Après mutation :** nouvelle Fiole au niveau plancher `678`, soit 0/10.
- **Toucher à 50 :** vague à `580`, bulles mesurées entre `580.5` et `681.7`, puis opacité revenue à zéro.
- **Runtime Web :** la surface statique, la vague et les bulles utilisent la même fonction de niveau.
