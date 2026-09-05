# Détourage des objets de packs

## Périmètre

Les PNG d’objets sous `mobile/assets/shop/packs/*/items/` sont les sources
partagées par la boutique, le sélecteur d’objets et la vitrine. Ils sont remplacés
sur place, sans changer les identifiants du catalogue ni les objets possédés.
Les héros de packs, arrière-plans de salle et collections archivées sont exclus.

L’inventaire des deux catalogues comporte 93 images dans 10 packs : 87 sources
avaient un fond opaque. Parmi les 6 images ayant déjà un canal alpha, le cadre
`circuit-zero/items/wake-frame.png` avait encore un fond partiellement opaque ;
il est repris aussi. Les 5 emblèmes réellement transparents sont conservés.
Les sources avant détourage restent disponibles dans Git au commit `fe2418d`.

### Exception à terminer

`dernier-round/items/squad-banner.png` est conservé à l’identique : le service
d’image a refusé cette extraction (filtre de sortie). Il faut fournir une autre
version de la bannière ou un PNG déjà détouré. L’audit doit continuer de signaler
ce fichier, sans masquer l’exception.

Résultat de cette passe : **87 PNG remplacés, 92 objets sur 93 avec un fond
réellement transparent**. Les planches des 10 packs ont été inspectées sur deux
fonds. Les previews Serment du Givre et Conclave Arcanique ont été vérifiées
dans la vitrine sans erreur console. `mobile:architecture`, `mobile:typecheck`
et `git diff --check` passent ; l’audit des images échoue uniquement sur la
bannière conservée ci-dessus.

## Production

Outil : génération d’image intégrée à Codex, compétence `imagegen`.
Mode : **édition**, une image de référence par objet, extraction du fond.
Les résultats RGBA sont validés avant remplacement. Un damier dessiné dans
une image opaque n’est pas accepté comme transparence.

Prompt de détourage détaillé :

```text
Use case: background-extraction. Edit the supplied collectible image into a clean isolated game sprite on a genuinely transparent RGBA background. Preserve the object exactly: same design, silhouette, pose, perspective, materials, colours, ornamentation and integral stand/plinth. Remove ALL dark background, floor, cast background shadow and outer thin shop-card border, including the background inside holes, between separate pieces, and inside an empty decorative frame. A pictured miniature architectural diorama is itself the object: retain its architecture and platform. Retain semi-transparent luminous details if present. Reconstruct only a tiny clipped outer edge if needed to show the full object. Center full object with 6% transparent padding. No redesign, no added objects, no text labels, no printed checkerboard. One transparent PNG, high-quality crisp edges.
```

Prompt simplifié utilisé pour les extractions suivantes et certaines reprises :

```text
Remove the background from this image. Keep only the collectible object and its existing stand, unchanged. Deliver the cutout on a transparent background.
```

Pour les cadres, ajout :

```text
The empty area inside the frame must also be transparent.
```

Pour les effets, remplacement par :

```text
Remove the dark background from this image. Keep only the luminous effect and its particles, unchanged, on a transparent background.
```

Pour les cartes illustrées, conserver l’image à l’intérieur du cadre :

```text
Remove the background from this image. Keep the complete framed illustrated card and its stand unchanged, including the illustration inside. Deliver the cutout on a transparent background.
```

Le conditionnement avec Sharp se limite à réduire les sorties dans une boîte
de 768 × 768 px, sans agrandissement et en conservant le ratio et le canal alpha.
Il ne réalise pas le détourage. Les détails lumineux peuvent rester semi-transparents.

Deux adaptations spécifiques du prompt simplifié : pour `armor-vega.png`,
« Keep only the armour, unchanged » ; pour `wake-frame.png`,
« Keep only the decorative frame and its luminous accents, unchanged ».
Pour `afterimage-effect.png`, le sujet conservé est « the racing car afterimage
effect, its three coloured silhouettes and luminous trails ».

## Validation reproductible

Depuis la racine :

```sh
node scripts/pack-artwork.mjs audit
node scripts/pack-artwork.mjs proof /private/tmp/clutch-pack-cutout-proofs
npm run mobile:architecture
npm run mobile:typecheck
```

Les planches montrent chaque objet sur fond bleu sombre et gris clair pour
contrôler contours, trous, socles et particules. Vérifier ensuite le rendu réel
dans `/showcase-preview?packId=serment-du-givre&reduced=1` (serveur Expo de dev).

Pour conditionner une nouvelle sortie, utiliser un manifeste JSON composé de
`{ "file": "mobile/assets/shop/packs/…/items/….png", "generated": "/chemin/absolu/sortie.png" }`,
puis `node scripts/pack-artwork.mjs import /chemin/manifest.json`.
L’import refuse les destinations hors catalogue et les sorties vides ou opaques.
