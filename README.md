# Clutch

Clutch est un compagnon compétitif esport mobile : suivre les matchs, réaliser
des **calls gratuits**, révéler les verdicts, progresser en Frags et en XP, puis
jouer avec son Cercle et sa Faction.

Ce n’est pas une application de pari. Aucun argent réel n’est misé ou gagné,
les Frags sont un rating non dépensable et les achats éventuels restent
strictement cosmétiques.

## Application de référence

[`mobile/`](mobile/) est le produit principal. C’est une application Expo
Router pour iOS, Android et web mobile. Les parcours actifs sont :

- Hub ;
- Matchs et Match Center ;
- Social : Faction, Cercle et Défis ;
- Moi, paramètres et compte ;
- onboarding, authentification et récupération de mot de passe ;
- boutique cosmétique et Founder Pack.

Clutch Room est volontairement masqué et reste en pause. Les routes `*-preview`
servent au développement visuel et redirigent hors des builds de développement.

[`web/`](web/) est l’ancien prototype, conservé uniquement comme référence
historique. Il ne reçoit plus de logique mobile ni de nouveau développement
produit.

## Lancer l’application

```bash
cd mobile
npm install
cp .env.example .env
npm run web
```

Puis ouvrir <http://localhost:8081>. Le navigateur peut être placé en mode
iPhone dans ses outils de développement. Pour un appareil natif :

```bash
npm run ios
# ou
npm run android
```

Le fichier `.env` doit au minimum contenir l’URL et la clé publiable du projet
Supabase. Il reste local et ne doit jamais être commité. Les variables de
publication et leurs contrôles sont détaillés dans
[`mobile/docs/release-readiness.md`](mobile/docs/release-readiness.md).

## Architecture

```text
mobile/
  app/                 Entrées Expo Router très légères
  src/features/        Écrans, composants, hooks et modules api.ts par domaine
  src/providers/       Session et états applicatifs transverses
  assets/              Assets réellement embarqués
supabase/
  migrations/          Schéma versionné, RLS, grants et RPC
  functions/           Fonctions Edge
  tests/               Contrats SQL transactionnels
api/                   Pages publiques et fichiers d’association du domaine
public/                Landing mobile légère déployée sur Vercel
docs/                  Contrats et roadmap produit
web/                   Prototype historique en lecture seule
```

Seuls les modules `api.ts` des features mobiles importent le client Supabase.
Les écritures sensibles sont autoritaires côté serveur ; les migrations gardent
RLS, droits Data API et privilèges RPC explicites.

La branche de référence mobile reste `mobile-foundation` jusqu’à validation de
la migration. `main` n’est pas la base implicite du travail mobile.

## Qualité

Depuis la racine :

```bash
npm run mobile:architecture
npm run mobile:typecheck
npm run mobile:lint
npm run mobile:test
npm run mobile:public-pages-test
npm run mobile:release-check
```

La CI exécute ces contrôles et remet une base Supabase locale à zéro avant de
linter puis vérifier tous les contrats SQL. Les tests E2E publics sont décrits
dans `mobile/.maestro/` et peuvent être exécutés sur EAS avec le label de pull
request `e2e`.

Le contrôle strict de publication est :

```bash
node scripts/check-mobile-release.mjs --strict
```

Il doit être lancé avec les variables de domaine, support, identité légale,
associations stores et suppression RevenueCat configurées.

## Contrats produit et exploitation

- [Contrats produit V1](docs/product-contracts.md)
- [Roadmap exécutable](docs/product-roadmap.md)
- [Fiabilité des résultats](docs/match-result-operations.md)
- [Confidentialité analytics et achats](mobile/docs/privacy-analytics.md)
- [Préparation de release](mobile/docs/release-readiness.md)

## Cadre produit

- aucun paiement pour participer à un call ;
- aucun gain convertible en argent, crypto ou objet revendable ;
- aucun achat de score, de protection ou de multiplicateur ;
- chaque verdict affiche sa règle et sa source ;
- les Volts et achats servent uniquement à l’expression cosmétique ou sociale.

Avant une diffusion publique, le cadre juridique et les déclarations App Store
Connect / Google Play doivent être validés contre le binaire réellement soumis.

## Licence

MIT — voir [LICENSE](LICENSE).
