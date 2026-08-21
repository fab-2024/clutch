# Architecture Clutch

## Frontières du dépôt

- `mobile/` : produit principal Expo / React Native.
- `web/` : application historique conservée comme référence.
- `supabase/` : backend partagé et historique de migrations reproductible.
- `docs/` : décisions et règles transverses.
- `scripts/` : contrôles automatisés du dépôt.

Les règles produit partagées sont définies dans
[`product-contracts.md`](./product-contracts.md). Leur ordre de livraison et
leurs critères d'acceptation sont suivis dans
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
    └── utils/           utilitaires réellement transverses
```

Le flux de données autorisé est :

```text
route -> écran / feature -> api.ts -> client Supabase
```

Une route, un écran ou un composant ne doit pas importer le client Supabase.
Les fonctions sensibles restent protégées côté PostgreSQL par les privilèges,
les RPC et les politiques RLS ; la couche `api.ts` ne remplace pas ces contrôles.

## Features actuelles

- `auth`, `onboarding`, `hub`, `matches`, `profile` ;
- `social/missions`, `social/leagues`, `social/faction`, `social/friends`,
  `social/duels` ;
- `room`, documentée mais volontairement en attente.

Les hooks ne sont extraits que lorsqu'ils clarifient un écran ou deviennent
réutilisables. Aucun dossier ou fichier vide n'est créé pour simuler une
architecture future.
