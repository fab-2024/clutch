# Synchronisation PandaScore gratuite

Le connecteur importe les affiches et les résultats PandaScore de League of
Legends, Valorant et Rocket League. Les appels partent uniquement de l'Edge
Function Supabase : le token privé n'entre jamais dans le bundle mobile.

## Périmètre du pilote

- endpoints gratuits `upcoming`, `running` et `past` pour les trois jeux ;
- neuf requêtes par cycle, toutes les dix minutes, soit 54 requêtes par heure ;
- équipes, logos HTTPS, événement, horaire et format BO1/BO3/BO5/BO7 ;
- démarrage, annulation, résultat final et correction PandaScore via les RPC
  auditées déjà utilisées par l'administration ;
- attribution automatique à la saison Clutch qui contient l'heure du match.

La limite gratuite publiée par PandaScore est de 1 000 requêtes REST par heure.
La documentation officielle rappelle aussi que le token est privé et ne doit
pas être utilisé côté client :

- <https://developers.pandascore.co/docs/authentication>
- <https://developers.pandascore.co/docs/rate-and-connections-limits>

Le connecteur ignore sans bloquer le cycle les affiches hors saison Clutch, les
participants encore indéterminés, les formats pairs et les résultats de série
incomplets. Un conflit avec un résultat final provenant d'une autre source reste
en validation manuelle ; PandaScore ne l'écrase pas.

## Configuration

1. Créer le compte gratuit sur <https://app.pandascore.co/> et copier le token
   depuis le tableau de bord.
2. Enregistrer le token comme secret de l'Edge Function :

   ```bash
   supabase secrets set PANDASCORE_API_TOKEN=TON_TOKEN
   ```

3. Appliquer la migration puis déployer la fonction sur un environnement de
   test avant la production :

   ```bash
   supabase db push --dry-run
   supabase functions deploy clutch-pandascore-sync
   ```

Le push réel d'une migration et le déploiement distant restent deux opérations
séparées. Examiner le `--dry-run` avant de modifier le projet de production.

La migration planifie `clutch-pandascore-sync-10m`. Elle réutilise les secrets
Vault `clutch_project_url` et `clutch_anon_key` déjà nécessaires aux
notifications, mais possède son propre secret interne de cron. Le token
PandaScore n'est jamais stocké dans Vault ou dans une table.

## Essai sans écriture

Un administrateur connecté peut envoyer son jeton d'accès Supabase à la
fonction et demander un aperçu :

```bash
curl --request POST \
  "$SUPABASE_URL/functions/v1/clutch-pandascore-sync" \
  --header "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"dry_run":true}'
```

La réponse contient les volumes récupérés, les motifs d'exclusion, la limite
restante remontée par PandaScore et un échantillon compact. Retirer `dry_run`
applique l'import ; le cron utilise automatiquement ce mode d'écriture.

## Vérification locale

```bash
npm run pandascore:test
supabase db reset
npm run db:verify
npm run db:advisors
```

Le test JavaScript couvre les trois flux gratuits, la normalisation et le BO7.
Le contrat SQL vérifie création, démarrage, règlement idempotent, correction,
provenance et journal d'audit.
