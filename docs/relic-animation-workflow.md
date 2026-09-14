# Workflow d’animation du réacteur collectif

Utiliser ce workflow avant toute modification visuelle ou comportementale de la
relique. Une demande explicite de l’utilisateur peut modifier ces choix.

## Contrat visuel actuel

- Au repos, la machine et son liquide restent immobiles.
- Au toucher, le noyau réagit, l’énergie parcourt les conduits puis le liquide
  produit une réaction courte avant de revenir au repos.
- Une mutation ne joue que lorsqu’un événement réel est prêt et remplace la
  forme une seule fois.
- Les images du réacteur sont la vérité géométrique. Les calques d’élixir,
  conduits et effets doivent rester alignés sur leur artboard.
- Web et natif racontent la même séquence et respectent la réduction des
  animations.

## 1. Établir la référence

1. Inspecter les PNG de `mobile/assets/social/reactor/` à leur résolution
   originale.
2. Ouvrir `/social-relic-lab-preview` et capturer le repos, la réaction et la
   mutation.
3. Décrire le défaut observé avec des termes mesurables : alignement, masque,
   cadrage, intensité ou durée.
4. Vérifier les fichiers qui font autorité :
   - `mobile/src/features/social/faction/components/CollectiveRelic.tsx` ;
   - `mobile/src/features/social/faction/reactor/ReactorScene.tsx` ;
   - `mobile/src/features/social/faction/reactor/ReactorMachine.tsx` ;
   - `mobile/src/features/social/faction/reactor/VesselElixir.tsx` ;
   - `mobile/src/features/social/faction/reactor/artwork.ts`.

`StaticRelicVial.tsx` et `relicArtwork.ts` restent utilisés par l’aperçu de
profil. Ils ne définissent pas la géométrie du réacteur collectif.

## 2. Décomposer et rythmer

Lister les calques touchés : machine, cavité, élixir, ménisque, conduits,
bulles, éclats et transition. Pour chacun, définir sa source, son masque, son
déclencheur, sa durée et son état au repos.

Point de départ recommandé pour une réaction simple :

| Temps | État attendu |
| ---: | --- |
| 0 ms | repos complet |
| 60–180 ms | premier battement du noyau |
| 180–550 ms | activation des conduits |
| 300–1 250 ms | oscillation et bulles |
| 1 250–1 650 ms | extinction et retour au repos |

Pour une mutation, distinguer charge, libération, assemblage, remplacement et
stabilisation. Les effets ne doivent jamais effacer la provenance du noyau.

## 3. Implémenter par incréments

1. Valider le noyau seul.
2. Ajouter les conduits sans déplacer la machine.
3. Ajouter l’élixir en respectant chaque cavité de `MACHINE_ART`.
4. Ajouter les éclats et la transition finale.

Conserver le même artboard et les mêmes coordonnées entre l’image, les masques
et les calques. Ne pas appliquer un zoom ou un filtre à toute la scène pour
simuler une réaction locale. Limiter les halos et ne pas animer le parent quand
seul un élément interne doit bouger.

## 4. Validation visuelle obligatoire

Après chaque incrément, recharger le laboratoire, vérifier le repos, observer
le début, le milieu et la fin du toucher, puis jouer une mutation complète.
Contrôler aussi la console et laisser la démo au repos.

Rejeter une piste qui décale les calques, invente une anatomie, transforme le
noyau en masse lumineuse, fait bouger la page ou rend le repos moins lisible.
Le typage et les tests ne remplacent pas cette vérification visuelle.

## 5. Vérifications avant livraison

Depuis la racine :

```bash
npm run mobile:architecture
npm run mobile:typecheck
npm --prefix mobile test -- --runInBand \
  src/features/social/faction/components/__tests__/CollectiveReactor.test.tsx \
  src/features/social/faction/reactor/model.test.ts \
  src/features/social/faction/reactor/motion.test.ts
```

Confirmer que les scripts audio ou visuels modifiés restent reproductibles et
qu’aucune erreur runtime récente n’apparaît dans la prévisualisation.
