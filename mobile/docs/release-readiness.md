# Préparation de release mobile

Statut au 22 août 2026 : les migrations de confidentialité, du cœur de bêta et
du correctif de jeton Expo sont appliquées au projet Supabase connecté. Les
fonctions Edge RevenueCat, les stores et la recette native restent à valider
explicitement par un responsable de release.

## 1. Barrière de qualité

Depuis la racine du dépôt :

```bash
npm run mobile:architecture
npm run mobile:typecheck
npm run mobile:lint
npm run mobile:test
npm run mobile:public-pages-test
npm run mobile:audit
npm run mobile:release-check
```

La GitHub Action `.github/workflows/quality.yml` reproduit ces contrôles et
teste les migrations sur une base Supabase locale propre. Le contrôle strict
de release exige en plus les valeurs externes :

```bash
node scripts/check-mobile-release.mjs --strict
```

## 2. Variables de publication

Variables publiques injectées dans la build Expo :

| Variable | Rôle |
| --- | --- |
| `EXPO_PUBLIC_APP_ORIGIN` | Origine HTTPS sans chemin, par exemple `https://clutch.example` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Adresse visible de support et d’exercice des droits |
| `EXPO_PUBLIC_LEGAL_ENTITY` | Nom exact de l’éditeur responsable |
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publiable, jamais une clé secrète |

Variables serveur Vercel :

| Variable | Rôle |
| --- | --- |
| `CLUTCH_APPLE_TEAM_ID` | Team ID Apple à dix caractères |
| `CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS` | Empreintes du certificat de signature, séparées par des virgules |
| `CLUTCH_SUPPORT_EMAIL` | Support affiché sur les pages web publiques |
| `CLUTCH_LEGAL_ENTITY` | Éditeur affiché sur les pages web publiques |
| `CLUTCH_IOS_STORE_URL` | Fiche App Store utilisée comme fallback des liens partagés |
| `CLUTCH_ANDROID_STORE_URL` | Fiche Google Play utilisée comme fallback des liens partagés |

Secret réservé à la fonction Edge Supabase :

| Secret | Rôle |
| --- | --- |
| `REVENUECAT_SECRET_API_KEY` | Suppression du client RevenueCat ; ne jamais utiliser de préfixe `EXPO_PUBLIC_` |

Les clés SDK RevenueCat iOS/Android restent des clés publiques distinctes. Le
contrôle strict lit le secret serveur uniquement comme preuve locale de
préparation ; il ne l’intègre pas au binaire.

L’audit npm bloque les vulnérabilités hautes de production. La dépendance
`uuid@7` encore signalée en sévérité modérée est transitive, utilisée par
`xcode` dans l’outillage de build Expo ; le correctif automatique proposé
impose une version cassante d’Expo Splash Screen. Elle est donc suivie comme
risque d’outillage et ne doit pas être « corrigée » avec `--force`.

## 3. Suppression du compte

Le parcours se trouve dans Magasin → Paramètres → Compte et données. Il demande le
mot de passe, une confirmation `SUPPRIMER`, puis la fonction
`clutch-account-delete` :

1. vérifie la session et une reconnexion vieille de moins de cinq minutes ;
2. supprime le client RevenueCat associé à l’UUID Supabase ;
3. révoque les sessions ;
4. supprime l’utilisateur Auth, ce qui déclenche les cascades de données ;
5. efface la session locale seulement après confirmation serveur.

À déployer et tester sur un compte sandbox sans achat puis sur un compte sandbox
avec achat restaurable :

```bash
supabase functions deploy clutch-account-delete
```

Ce déploiement et ceux du Founder Pack transmettent l'UUID Supabase à
RevenueCat comme identifiant de client. Ils exigent une validation explicite de
ce traitement et la présence des secrets serveur avant la recette.

Vérifications obligatoires : profil et données enfants absents, aucun jeton push
actif, client RevenueCat absent, seconde tentative idempotente après un échec
simulé. La suppression RevenueCat ne résilie pas automatiquement un abonnement
store ; ce point doit être expliqué si Clutch ajoute un abonnement.

Une ressource web `/account-deletion` est fournie pour Google Play. Elle doit
être publique, stable et contenir l’adresse de support configurée.

## 4. Liens universels

Les partages utilisent :

- `/c/<token>` pour une invitation de duel ;
- `/u/<pseudo>` pour un profil public.

`app.config.ts` ajoute les domaines associés iOS et les intent filters Android
à partir de `EXPO_PUBLIC_APP_ORIGIN`. `api/app-association.mjs` sert :

- `/.well-known/apple-app-site-association` ;
- `/.well-known/assetlinks.json`.

Après déploiement Vercel, vérifier un statut 200, un JSON sans redirection et
les bons identifiants de signature. Tester ensuite les deux liens depuis Notes,
Messages et un navigateur, application fermée puis ouverte. Une invitation
reçue sans session doit reprendre automatiquement après connexion et onboarding.
Si l’application n’est pas installée, la page publique propose les deux stores
via `/api/download`; aucune route ne renvoie vers l’ancien prototype web.

## 5. E2E et recette native

Le profil `e2e-test` produit un APK Android et une build simulateur iOS. Le label
de pull request `e2e` lance `mobile/.eas/workflows/e2e-tests.yml`, qui vérifie
l’entrée publique et les documents légaux avec Maestro.

Avant soumission, compléter manuellement cette matrice :

| Surface | iPhone 390 px | iPhone 432 px | Android compact | Grande police |
| --- | --- | --- | --- | --- |
| Onboarding et connexion | à faire | à faire | à faire | à faire |
| Hub | à faire | à faire | à faire | à faire |
| Matchs et Match Center | à faire | à faire | à faire | à faire |
| Social : Faction/Cercle/Défis | à faire | à faire | à faire | à faire |
| Rank : saison/classements/récompense | à faire | à faire | à faire | à faire |
| Confidentialité, signalement et blocage | à faire | à faire | à faire | à faire |
| Magasin, compte et suppression sandbox | à faire | à faire | à faire | à faire |
| Achat/restauration sandbox | à faire | à faire | à faire | à faire |
| Notifications réelles | à faire | n/a | à faire | n/a |
| Liens application fermée/ouverte | à faire | n/a | à faire | n/a |

Tester aussi mode sombre, VoiceOver/TalkBack sur les actions critiques,
troncature, clavier, interruption réseau et retour depuis le store.

## 6. Stores et exploitation

Les icônes, l’icône adaptative, le splash et l’icône de notification sont
configurés dans `app.json`. Avant la première candidate :

- confirmer le nom final, le bundle/package, la version marketing et les
  numéros de build ;
- vérifier les captures, catégories, classification d’âge et textes stores ;
- aligner App Privacy et Data safety sur `privacy-analytics.md` ;
- contrôler les privacy manifests réellement intégrés ;
- fournir l’URL de confidentialité, de support et de suppression ;
- tester l’achat et la restauration en sandbox sur les deux stores.

`AppErrorBoundary` empêche un écran blanc et produit un événement console
structuré. Le choix d’un fournisseur de crash reporting distant reste un
blocage de release : il nécessite une décision de prestataire, une revue de la
collecte et une mise à jour des déclarations avant activation.

## 7. Structure et listes à croissance progressive

Matchs, Match Center, Social et Faction restent visuellement identiques, mais
leurs écrans orchestrateurs sont maintenant séparés des hooks de chargement,
des sections de présentation et des feuilles de styles. Le contrôle de release
refuse qu’un de ces quatre orchestrateurs dépasse de nouveau 420 lignes.

L’historique des calls monte huit cartes à la fois et le classement hebdomadaire
du Cercle dix lignes à la fois. Les boutons de suite conservent l’accès à tout
l’historique déjà reçu, sans construire toutes les cartes lors du premier
rendu. Les classements Faction restent volontairement bornés aux premières
positions prévues par leur design.

## 8. Critère Go / No-Go

La release est **No-Go** tant qu’un des éléments suivants manque :

- fonction de suppression déployée et testée avec le secret RevenueCat ;
- migrations de confidentialité et du Bloc B appliquées ;
- protection Auth contre les mots de passe compromis activée ;
- domaine HTTPS et fichiers d’association validés ;
- CI verte, E2E iOS/Android verts et matrice native signée ;
- support et identité légale réels ;
- fournisseur de crash reporting décidé et déclaré, ou décision formelle de ne
  pas publier tant qu’il est absent ;
- formulaires privacy, achats et fiche store alignés sur la build candidate.
