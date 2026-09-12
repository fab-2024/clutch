# GRIFF Mobile

Application principale de GRIFF, construite avec Expo, React Native et Expo
Router. L'ancienne application web reste disponible dans `../web` uniquement
comme référence pendant la migration.

La branche mobile de travail est `codex/mobile-architecture-feature`.
`mobile-foundation` correspond à une ancienne version de l'application.

## Développement iOS local avec Xcode

Depuis `mobile/`, installer les dépendances avec `npm ci`, puis lancer
`npm run ios` pour générer si nécessaire le projet natif, compiler et ouvrir
l'application dans le simulateur. Xcode et CocoaPods doivent être installés.
Pour ouvrir le projet dans Xcode, utiliser `ios/GRIFF.xcworkspace` après sa
génération, afin d'inclure les dépendances CocoaPods.

Pour relancer uniquement le serveur JavaScript d'une application déjà compilée :

```bash
npx expo start --dev-client
```

Le serveur Expo et le projet Xcode doivent provenir de la même copie de travail.
Sur ce Mac, si `--localhost` n'écoute que sur `::1` alors que le client demande
`127.0.0.1`, lancer le serveur ainsi :

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start --dev-client --port 8081
```

`node_modules/`, `ios/Pods/` et `ios/build/` sont régénérables. Ne pas supprimer
les sources, le fichier `.env` ou les fichiers de verrouillage pour nettoyer
une ancienne installation. Conserver `expo-dev-client`, `react-native-screens`
et `react-native-worklets` même sans import direct : ils servent au client de
développement, à la navigation et aux animations. `react-dom` et
`react-native-web` restent nécessaires aux prévisualisations web.

## Démarrage

```bash
cd mobile
npm install
cp .env.example .env
npm run typecheck
npm start
```

Renseigner l'URL et la clé publique du projet dans `.env`. Pour que les emails
de confirmation et de récupération reviennent dans l'application, ajouter dans
**Supabase > Authentication > URL Configuration > Redirect URLs** :

```text
http://localhost:8081/**
griff://**
clutch://**
```

Pour une version web déployée, ajouter également son origine à la liste et la
définir dans `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN` (sans slash final). Les liens
PKCE doivent être ouverts sur le même appareil et dans le même navigateur que
celui depuis lequel l'email a été demandé.

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
    purchases/                Founder Pack et achats natifs
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
npm run mobile:lint
npm run mobile:test
npm run mobile:audit
npm run mobile:release-check
```

Les routes de prévisualisation sont disponibles uniquement en développement ;
elles redirigent vers l’application dans une build de production. Le paiement
du Founder Pack doit toujours être testé dans une nouvelle build native. La
configuration complète des stores, de RevenueCat et de Supabase est décrite
dans [`docs/founder-pack-testing.md`](docs/founder-pack-testing.md).

Le domaine HTTPS, la suppression de compte, les liens universels, les E2E et la
matrice de soumission sont suivis dans
[`docs/release-readiness.md`](docs/release-readiness.md).

## Règles produit et sécurité

- Hub, Matchs, Social, Rank et Magasin forment la navigation publique actuelle.
- La Room reste un placeholder masqué jusqu'à demande explicite.
- La direction UI actuelle est validée ; un refactor structurel ne doit pas la
  redessiner.
- Le mobile ne duplique pas les autorisations sensibles. Les soldes,
  pronostics, récompenses et données privées restent protégés par PostgreSQL,
  les RPC, les privilèges Data API et la RLS.
- Aucune nouvelle logique mobile ne doit être ajoutée dans `../web`.
