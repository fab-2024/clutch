# Itération active — animation de la relique

Ce document applique `docs/relic-animation-workflow.md` à l’Ampoule actuelle.

## Référence observée

- **Repos :** le cœur est lisible en violet sombre, les racines sont dormantes et la scène reste immobile.
- **Toucher à 100 ms :** le cœur et toutes les racines s’allument déjà ensemble.
- **Toucher à 360 ms :** l’anatomie est correctement alignée, mais les racines apparaissent d’un seul bloc.
- **Toucher à 850 ms :** les bulles sont trop petites et trop statiques pour évoquer un liquide qui bout.
- **Mutation :** la charge ressemble à la réaction simple ; l’origine de l’explosion et le remplacement du récipient ne forment pas encore une séquence assez distincte.

## Inventaire des calques

| Calque | Source et découpe | Déclencheur | Fenêtre cible | Repos | Web / natif |
|---|---|---|---|---|---|
| Scène | `RELIC_STAGE_ARTWORK[container].asset`, artboard 1000 | toujours | permanent | oui | `Image` / `Image` |
| Anatomie dormante | masque raster violet, cœur et trois bandes de racines | Ampoule | permanent | oui | SVG / Skia |
| Cœur actif | masque raster orange, région du cœur | toucher ou mutation | 60–1 650 ms | non | SVG / Skia |
| Racines basses | masque orange, bande 555–625 | toucher ou mutation | 180–1 650 ms | non | SVG / Skia |
| Racines médianes | masque orange, bande 495–565 | toucher ou mutation | 280–1 650 ms | non | SVG / Skia |
| Racines hautes | masque orange, bande 430–505 | toucher ou mutation | 400–1 650 ms | non | SVG / Skia |
| Surface | tracé fin limité à l’intérieur | toucher ou mutation | 300–1 250 ms | non | SVG / Skia |
| Bulles | cercles répartis en trois flux | toucher ou mutation | 300–1 250 ms | non | SVG / Skia |
| Flash | gradient centré sur le cœur | mutation prête | rupture | non | SVG / Skia |
| Particules | gouttes orange issues du cœur | mutation prête | rupture–dissipation | non | SVG / Skia |
| Transition | scènes source et destination | mutation prête | après rupture | non | Reanimated |

## Storyboard — réaction simple

| Temps | État attendu |
|---:|---|
| 0–60 ms | repos, aucune racine active |
| 60–180 ms | battement orange du cœur uniquement |
| 180–330 ms | racines basses |
| 280–450 ms | racines médianes |
| 400–560 ms | racines hautes |
| 300–1 250 ms | surface instable et trois flux de bulles |
| 1 250–1 650 ms | extinction commune et retour exact au repos |

## Storyboard — mutation

| Temps | Phase | État attendu |
|---:|---|---|
| 0–250 ms | Charge du cœur | cœur orange exact, plus dense que lors de la réaction simple |
| 250–620 ms | Propagation | racines basses, médianes puis hautes ; liquide de plus en plus actif |
| 690–830 ms | Rupture | flash compact centré sur le cœur, ancien récipient toujours identifiable |
| 760–1 680 ms | Explosion | gouttes orange, or et violettes projetées depuis le cœur puis attirées vers le bas |
| 990–1 395 ms | Remplacement | apparition de la Fiole après le pic du flash, disparition de l’Ampoule |
| 1 395–2 600 ms | Stabilisation | disparition des particules et nouvel état au repos |

Le flash et les gouttes ont leurs propres coordonnées animées. Aucun zoom global du calque d’effets n’est utilisé, afin que l’explosion reste ancrée au cœur.

## Critères de rejet

- aucune branche inventée ou décalée ;
- aucune activation simultanée de toutes les racines au début du toucher ;
- aucune nappe orange remplissant l’Ampoule ;
- aucune bulle en dehors de l’intérieur du récipient ;
- aucun flash assez large pour effacer l’origine du cœur ;
- aucun mouvement du reste de la page.

## Validation finale

- **Repos :** Ampoule et anatomie dormantes, aucun mouvement continu.
- **Réaction simple :** cœur actif en premier, propagation basse → médiane → haute, puis huit bulles indépendantes et une surface contenue par le masque intérieur.
- **Mutation :** charge plus dense, flash compact centré sur le cœur, Ampoule visible au pic, gouttes projetées individuellement, puis arrivée de la Fiole.
- **Géométrie :** cœur et racines proviennent exclusivement des deux masques raster reproductibles ; aucune branche n’est dessinée à la main.
- **Parité :** mêmes phases et mêmes coordonnées de référence en SVG Web et Skia natif.
- **Runtime Web :** aucune erreur depuis le dernier chargement complet de la preview.
