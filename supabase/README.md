# Base de données Clutch

Ce dossier utilise désormais le workflow officiel de migrations Supabase. La
source de vérité exécutable se trouve dans `migrations/`; les anciens fichiers
numérotés à la racine de `supabase/` sont conservés uniquement comme archives
lisibles de l'évolution du produit.

## Structure

- `config.toml` configure la stack locale sur PostgreSQL 17, comme le projet distant.
- `migrations/20260820075558_legacy_public_baseline.sql` reconstruit le schéma public final issu des anciens scripts.
- Les petits fichiers antérieurs à la baseline sont des marqueurs sans SQL. Ils alignent les versions déjà présentes dans l'historique distant sans publier les migrations privées ni rejouer leurs backfills de production.
- `migrations/20260820080332_restore_mobile_schema_contracts.sql` rétablit les colonnes, droits Data API et RPC nécessaires au mobile.
- Les migrations suivantes durcissent les privilèges existants sans élargir la surface Data API.
- `seed.sql` contient uniquement les données de démonstration locales issues de l'ancien `04_donnees.sql`.
- `11_verification.sql` reste un diagnostic manuel et n'est pas une migration.

La baseline n'assigne volontairement aucun fondateur : `est_fondateur` vaut
`false` par défaut. Les attributions réelles relèvent des données de production
et ne doivent jamais être inscrites dans une migration publique.

## Démarrage local

Prérequis : Supabase CLI 2.115 ou plus récent et un moteur compatible Docker.

```bash
supabase start
supabase db reset
supabase db lint --local --schema public --level warning --fail-on error
supabase db query --local --file supabase/tests/p0_mobile_contracts.sql
supabase db query --local --file supabase/tests/security_hardening_contracts.sql
supabase db advisors --local --type all --level warn --fail-on error
```

`db reset` doit pouvoir repartir d'une base vide, appliquer les marqueurs,
rejouer la baseline, appliquer les migrations suivantes, puis charger le seed.
Le bloc de vérification de la migration P0 fait échouer le reset si les colonnes
mobiles ou les permissions Amis ne correspondent pas au contrat attendu.
Le test séparé vérifie également les vues `security_invoker`, la RLS et les
privilèges de colonnes de `profils`.
Le contrat de durcissement vérifie les RPC anonymes, les fonctions de trigger,
les `search_path` fixes et les privilèges par défaut du propriétaire de migration.

## Nouvelle modification de schéma

Toujours créer le fichier avec le CLI :

```bash
supabase migration new description_courte
```

Puis :

1. écrire une migration qui avance uniquement ;
2. déclarer explicitement les `GRANT` Data API et activer la RLS pour toute nouvelle table exposée ;
3. exécuter `supabase db reset` ;
4. exécuter le lint et les advisors ;
5. relire le diff avant tout déploiement.

Ne plus modifier les scripts historiques ni la baseline après leur adoption.

## Adoption unique par le projet distant existant

Le projet de production possède déjà les 40 versions représentées par les
marqueurs. Son schéma contient également le contenu de la baseline. Il ne faut
donc surtout pas exécuter cette dernière sur cette base.

Après validation sur une base locale ou une branche Supabase de test :

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration list --linked
supabase migration repair 20260820075558 --status applied
supabase db push --dry-run
```

Le dry-run doit proposer uniquement les migrations postérieures à la baseline,
notamment `20260820080332_restore_mobile_schema_contracts.sql`. Examiner ce
résultat avant d'exécuter séparément `supabase db push`.

Cette réparation d'historique et le push modifient le projet distant : ils ne
doivent être lancés qu'après autorisation explicite. Ne jamais utiliser
`--include-seed` en production.

## Règles de sécurité

- Une clé publishable/anon peut être embarquée dans le web ou le mobile ; une clé `service_role` ou secrète ne le peut jamais.
- RLS et `GRANT` sont deux couches distinctes et doivent être revues ensemble.
- Les fonctions `SECURITY DEFINER` exposées sont des API privilégiées : elles doivent dériver l'identité de `auth.uid()`, fixer leur `search_path` et recevoir une liste de rôles explicite.
- Les changements directs via le SQL Editor distant sont interdits après l'adoption de cet historique.
