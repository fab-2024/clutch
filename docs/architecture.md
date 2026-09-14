# Architecture GRIFF

## Frontières du dépôt

- `mobile/` : produit principal Expo / React Native.
- `supabase/` : backend partagé et historique de migrations reproductible.
- `api/`, `public/` et `server/` : pages publiques légères et métadonnées de partage.
- `docs/` : contrats, décisions et règles transverses encore applicables.
- `scripts/` : contrôles automatisés du dépôt.

L’ancien prototype web, ses captures et ses exports de conception ont été
retirés. Les règles produit partagées sont définies dans
[`product-contracts.md`](./product-contracts.md) et leur ordre de livraison dans
[`product-roadmap.md`](./product-roadmap.md).

## Architecture mobile

```text
mobile/
├── app/                 routes Expo Router et layouts de navigation
└── src/
    ├── features/        logique produit, écrans et accès aux données
    ├── components/      UI et layout partagés
    ├── lib/             infrastructure, dont le client Supabase
    ├── providers/       contexte applicatif
    ├── theme/           tokens visuels
    └── utils/           utilitaires transverses
```

Le flux de données autorisé est :

```text
route -> écran / feature -> api.ts -> client Supabase
```

Une route, un écran ou un composant ne doit pas importer le client Supabase.
Les fonctions sensibles restent protégées côté PostgreSQL par les privilèges,
les RPC et les politiques RLS.

## Domaines actuels

- `hub`, `matches`, `ranking`, `profile` et `shop` portent les parcours produit.
- `social/missions`, `social/leagues`, `social/faction`, `social/friends` et
  `social/duels` restent des domaines séparés.
- `economy`, `retention`, `consumables` et `purchases` gèrent progression,
  séries, effets et achats.
- `auth`, `account`, `onboarding`, `notifications`, `analytics`, `partners`,
  `safety`, `legal`, `admin`, `developer` et `navigation` sont transverses.
- `room` reste un placeholder masqué tant que ce chantier est en pause.

Les routes `mobile/app/` réexportent normalement un écran de feature. Les hooks
ne sont extraits que lorsqu’ils clarifient un écran ou deviennent réutilisables.

## Boutique et vitrine

```text
features/shop/
├── teamPackCatalog.ts           catalogue public actuel
├── originalPackCatalog.ts       packs originaux GRIFF
├── showcaseRoomCatalog.ts       trois vitrines actuelles
├── showcasePresenterCatalog.ts  scènes et emplacements actuels
└── packs/
    ├── types.ts
    ├── originalTeams.ts
    └── individualCollections.ts
```

Les anciennes collections d’équipes et de jeux ne font plus partie du client.
L’API Boutique ignore leurs identifiants si un backend ancien les renvoie. Les
catalogues et modèles n’importent aucune couche d’interface.

Les achats de packs passent par `purchases/api.ts`, `packStore.ts`, `store.ts`
et `cosmeticPacks.ts`. La disponibilité reste contrôlée côté serveur.

## Routes Social

| Adresse | Écran / comportement |
| --- | --- |
| `/social` | Faction actuelle et réacteur collectif |
| `/social/friends` | Cercle et activité |
| `/social/leagues` | Ligues privées du Cercle |
| `/social/requests` | Demandes d’amis |
| `/social/duels` | Défis |
| `/social/duels?missions=1` | Défis avec le panneau des missions ouvert |

Les aperçus actuels sont `/social-preview`, `/social-circle-preview`,
`/social-challenges-preview` et `/social-relic-lab-preview`. Ils passent par
`PreviewRoute` et sont indisponibles dans une build de production.

## Routes Collection et profil

- `/collection` ouvre la collection.
- `/my-profile` ouvre le profil personnel et ses statistiques.
- `/u/[pseudo]` est le profil public canonique.
- `/shop`, `/showcase` et `/team-pack/[key]` sont les parcours de boutique,
  vitrine et détail d’un pack.

Les destinations partagées sont définies dans
`mobile/src/features/navigation/routes.ts`. Les redirections nécessaires à
l’authentification et aux invitations restent actives.

## Nettoyage et vérification

Le [registre des fonctionnalités en attente](deferred-features.md) protège les
chantiers volontairement masqués. Les migrations Supabase restent exécutables :
elles sont indispensables pour reconstruire la base actuelle et ne constituent
pas des fichiers applicatifs obsolètes.

`npm run mobile:architecture` vérifie les frontières, les imports Supabase et
les dépendances des catalogues. `npm run mobile:typecheck` active aussi
`noUnusedLocals` et `noUnusedParameters`. Le lint, les tests mobiles et les
tests des pages publiques complètent la validation.
