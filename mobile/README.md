# Clutch Mobile

Application principale de Clutch, construite avec Expo, React Native et Expo
Router. L'ancienne application web reste disponible dans `../web` uniquement
comme référence pendant la migration.

## Démarrage

```bash
cd mobile
npm install
npm run typecheck
npm start
```

La fondation utilise Expo SDK 57. Pour le développement produit sur appareil,
préférer un development build compatible plutôt que de figer l'application sur
un ancien SDK Expo Go.

## Architecture

```text
app/                         routes et layouts Expo Router
src/
  features/                  logique produit, écrans et accès aux données
    auth/
    onboarding/
    hub/
    matches/
    profile/
    social/
      missions/
      leagues/
      faction/
      friends/
      duels/
    room/                     volontairement en attente
  components/
    layout/
    ui/
  lib/supabase/
  providers/
  theme/
  utils/
```

Les routes hors layouts sont volontairement très petites et réexportent leur
écran depuis une feature. La logique de chargement reste dans la feature et les
requêtes Supabase restent dans un fichier `api.ts` :

```text
route -> écran / feature -> api.ts -> client Supabase
```

Exécuter depuis la racine du dépôt :

```bash
npm run mobile:architecture
npm run mobile:typecheck
```

## Règles produit et sécurité

- Hub, Matchs, Social, Room et Moi forment la navigation principale.
- La Clutch Room reste un placeholder jusqu'à demande explicite.
- La direction UI actuelle est validée ; un refactor structurel ne doit pas la
  redessiner.
- Le mobile ne duplique pas les autorisations sensibles. Les soldes,
  pronostics, récompenses et données privées restent protégés par PostgreSQL,
  les RPC, les privilèges Data API et la RLS.
- Aucune nouvelle logique mobile ne doit être ajoutée dans `../web`.
