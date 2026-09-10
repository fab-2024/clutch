# Architecture GRIFF

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

## Organisation des domaines

- `hub`, `matches`, `ranking`, `profile`, `shop` : parcours et présentations du produit.
- `social/missions`, `social/leagues`, `social/faction`, `social/friends`, `social/duels` : domaines sociaux distincts.
- `economy`, `retention`, `consumables`, `purchases` : monnaies, séries, consommables et achats.
- `auth`, `account`, `onboarding`, `notifications`, `analytics`, `partners`, `safety`, `legal`, `admin`, `developer`, `navigation` : services et parcours transverses.
- `room` : placeholder conservé, produit en pause.

Les hooks ne sont extraits que lorsqu’ils clarifient un écran ou deviennent réutilisables. Aucun dossier vide n’est créé pour simuler une architecture future.

## Catalogues et vitrine

```text
features/shop/
├── teamPackCatalog.ts           assemblage public, recherches et actions
├── originalPackCatalog.ts       définitions des six packs originaux
└── packs/
    ├── types.ts                contrat partagé des packs
    ├── originalTeams.ts        collection des équipes originales
    ├── individualCollections.ts
    ├── archivedTeamPacks.ts
    └── archivedGameCollections.ts

features/profile/
├── showcase/roomEditor.ts       modèle d’emplacements et affectations
└── components/showcase/        rendu et interactions des écrans
```

`teamPackCatalog.ts` conserve ses exports pour les consommateurs existants. Les définitions ne dépendent pas de ce module d’assemblage : elles importent leurs types dans `packs/types.ts`. La logique d’affectation de la vitrine se trouve hors des composants ; les catalogues peuvent utiliser ce contrat sans importer une couche d’interface.

Les listes actives et archivées restent explicites. Le catalogue complet garde les objets historiques nécessaires à l’affichage des possessions. Une collection archivée n’est pas supprimée parce qu’elle n’est plus commercialisée.

## Achats

- `purchases/api.ts` : validation serveur des packs, via Supabase.
- `purchases/store.ts` : plateforme et configuration partagée du SDK RevenueCat.
- `purchases/packStore.ts` : lecture des produits, achat et restauration des packs.
- `purchases/cosmeticPacks.ts` : identifiants commerciaux et prix indicatif.

La configuration partagée n’est plus nommée d’après l’ancienne offre Founder. Les routes de cette offre, leurs redirections et ses handlers mobiles sans appel ont été retirés. Aucun contrat serveur historique n’a été supprimé.

## Nettoyage et vérification

Le [registre des fonctionnalités en attente](deferred-features.md) fait partie de la revue avant suppression. Les variantes web/natives, imports dynamiques, routes Expo et scripts de génération doivent aussi être vérifiés : une recherche de nom isolée ne prouve pas qu’un fichier est inutilisé.

`npm run mobile:architecture` vérifie les frontières existantes, les imports relatifs du client Supabase et l’absence de dépendance des nouveaux catalogues/modèles vers les composants. Ses règles de résolution ont leurs propres tests.

`npm run mobile:typecheck` active également `noUnusedLocals` et `noUnusedParameters`. Les exports intentionnels et fonctionnalités en attente restent autorisés ; les variables locales et paramètres abandonnés sont signalés.

Le nettoyage du 10 septembre conserve les mêmes données, identifiants, ordre et chemins d’illustrations pour les 16 packs et leurs 129 objets. Les anciennes cartes de vitrine et l’ancien moteur de confrontation sans import ont été retirés, avec leurs dépendances exclusivement utilisées par ces variantes. Les assets, prototypes reportés, migrations et application web historique restent conservés.

## Routes Social actuelles

Les destinations internes sont centralisées dans `mobile/src/features/social/routes.ts`.

| Adresse publique | Écran / comportement |
| --- | --- |
| `/social` | Faction actuelle, via `SocialHomeScreen` (rendu auparavant nommé V2) |
| `/social/friends` | Cercle / activité |
| `/social/leagues` | Ligues privées du Cercle |
| `/social/requests` | Demandes d’amis |
| `/social/duels` | Défis |
| `/social/duels?missions=1` | Défis avec le panneau des missions ouvert |

Seules les adresses actuelles du tableau sont disponibles. Les anciennes routes
Social et leurs composants de redirection ont été supprimés.
Le panneau des missions efface son paramètre après fermeture, sans remplacer l’écran Défis.

L’ancien écran Community (`FactionScreen`, son wrapper `SocialFactionScreen`,
ses sections et ses styles exclusifs) a été retiré. Les modèles, API, hooks,
illustrations et composants de faction utilisés par l’écran actuel sont conservés.

Les aperçus sont distincts des routes produit : `/social-v2-preview` reproduit
l’écran actuel, `/social-preview` conserve la référence visuelle précédente,
`/social-circle-preview` et `/social-challenges-preview` isolent les deux autres
sections. `/social-relic-lab-preview` reste le laboratoire requis pour travailler
sur la relique. Tous passent par `PreviewRoute` et sont référencés dans les outils
développeur.

Les tests de navigation utilisent Expo Router pour vérifier les routes actuelles,
l’ouverture et la fermeture des missions, et le retour au Hub.

## Routes Collection et profil

- `/collection` est la route de l’onglet Collection. Le nom Expo et l’aperçu de
  navigation utilisent aussi `collection` ; l’ordre et le rendu des cinq onglets
  restent identiques.
- `/my-profile` ouvre le profil personnel et son historique. Les retours depuis
  les résultats qui visaient auparavant l’ancien onglet `profile` utilisent
  désormais cette adresse.
- `/u/[pseudo]` est le profil public canonique, déjà utilisé par les liens de
  partage ; il est le seul point d’entrée vers un profil public.
- `/shop` (atelier ou collection possédée selon ses paramètres), `/showcase`
  (vitrine) et `/team-pack/[key]` (détail d’un pack) sont des parcours distincts.
  Les anciennes routes Founder ont été supprimées.

Les destinations Collection et profil personnel sont définies dans
`mobile/src/features/navigation/routes.ts`. `shopNavigation.ts` conserve un
retour par l’historique quand il existe et utilise `/collection` comme repli.

`/growth-preview` passe maintenant par le même `PreviewRoute` que les autres
aperçus. Le lien développeur « Activité de la vitrine » précise `section=activity`
pour ouvrir la section annoncée.

Les routes d’aperçu utiles, le laboratoire de rang, le laboratoire de relique et
le placeholder Room restent conservés. L’audit des routes n’a pas identifié de
doublon produit à retirer pour Hub, Matchs ou Rank.

Les anciennes adresses de compatibilité ne sont plus prises en charge. Aucun
composant de redirection vers les écrans actuels n’est conservé pour ces adresses.
Les redirections nécessaires à l’authentification et aux invitations restent actives.
