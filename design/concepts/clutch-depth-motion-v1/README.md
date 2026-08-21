# Clutch Depth & Motion — direction v1

Ces planches sont des références de direction artistique, pas des écrans à
reproduire pixel pour pixel. Elles doivent guider la matière, la hiérarchie,
le mouvement et les objets signature tout en conservant les parcours produit
et les contrats de données existants.

## Planches

1. `01-entry-onboarding-hub.png` — connexion, onboarding et Hub
2. `02-arena-match-center.png` — Arena, sélection et call verrouillé
3. `03-social-hq-missions-friends.png` — QG Social, missions et amis
4. `04-social-leagues-faction-duels.png` — ligues, faction et duels
5. `05-profile-room-settings.png` — profil, Room en pause et réglages

## Langage visuel

- Base graphite presque noire, texte blanc chaud et Volt comme accent unique.
- Bleu et rouge sont réservés à l'opposition entre deux camps.
- Les cartes de contenu sont mates. Le verre fumé est réservé aux contrôles
  flottants et à la navigation.
- Les titres sont condensés et expressifs ; les données restent dans une sans
  sérif neutre et très lisible.
- La 3D a une fonction produit et ne sert jamais de remplissage décoratif.

## Objets signature

- **Clutch Core** — identité, rating et progression de saison.
- **Call Token** — sélection puis verrouillage d'un call.
- **Faction Relic** — progression collective et paliers débloqués.
- **Duel Coin** — opposition entre deux joueurs et révélation du résultat.
- **Season Trophy** — historique compétitif et collection du profil.

Chaque objet doit prévoir les états `idle`, `focus`, `selected`, `locked`,
`live`, `won`, `lost` et une version statique pour la réduction des animations.

## Grammaire de mouvement

- Micro-interactions : 120–180 ms.
- Transitions de cartes et de navigation : 260–340 ms.
- Moments signature : 500–900 ms.
- Les haptics accompagnent uniquement une cause claire : sélection,
  verrouillage, résultat ou récompense.
- Les compteurs peuvent rouler, les cartes peuvent se transformer et les
  objets peuvent pivoter lentement ; aucun mouvement ne doit réduire la
  lisibilité d'un match ou d'un score.

## Contraintes produit

- Aucun code visuel de casino : pas de jetons d'argent, de cote ou de mise.
- Les Frags restent un rating compétitif qui ne se dépense pas.
- La Room reste un placeholder tant que le produit est en pause.
- Le mode réduction des animations doit préserver toutes les informations et
  toutes les actions.
