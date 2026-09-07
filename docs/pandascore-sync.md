# Synchronisation PandaScore gratuite

Le connecteur importe les affiches et les résultats PandaScore de League of
Legends, Valorant et Rocket League. Les appels partent uniquement de l'Edge
Function Supabase : le token privé n'entre jamais dans le bundle mobile.

## Périmètre du pilote

- endpoints gratuits `upcoming`, `running` et `past` pour les trois jeux ;
- neuf requêtes de flux par cycle, toutes les dix minutes, plus la vérification
  ciblée des matchs encore ouverts (lots de 100 identifiants par jeu) ;
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

## Statuts et rattrapage des résultats

Chaque cycle relit également les matchs PandaScore déjà stockés dont la date
de début est passée et le statut encore ouvert. Le endpoint de liste de chaque
jeu reçoit `filter[id]` avec au plus 100 identifiants : le résultat d'un match
reste récupérable même lorsqu'il sort de la première page `past`. Les données
de démonstration sans identifiant PandaScore sont exclues de cette relecture.
Un résultat terminal prend priorité sur une copie `running` provenant d'un
autre flux, même si cette copie porte une date de modification plus récente.

La relecture est limitée à 1 000 matchs par cycle, les plus récents d'abord.
Une limite atteinte ou une erreur du fournisseur apparaît dans
`reconciliation_errors` et rend le cycle `ok: false`. Aucun score n'est inventé
en cas d'échec. Les champs `reconciliation_pending` et `reconciliation_fetched`
permettent de surveiller le rattrapage. Les règlements passent toujours par
l'importeur et ses RPC auditées, de manière idempotente.

Le flux de découverte ne classe plus automatiquement un match en direct au
passage de son horaire prévu. Seul `en_cours` avec un début dans les dernières
24 heures apparaît en direct. Un statut ouvert plus ancien est masqué du Hub
et de Matchs ; le détail et les calls existants restent accessibles avec
« Statut à confirmer ». Les vrais résultats terminés restent dans Résultats.

## Elo historique et ouverture des calls (V2)

Le classement des joueurs conserve sa formule : `40 × (résultat − probabilité)`,
avec une probabilité de scoring bornée à 15–85 %. L'Elo des équipes est un modèle
séparé, alimenté par les résultats de série, sans attribuer de Frags ni créer de
matchs jouables lors du rattrapage historique.

- Historique glissant de 90 jours, indépendant des saisons Clutch ; pagination
  par jeu jusqu'au début de la fenêtre, au maximum 30 pages de 100 matchs.
- Une fenêtre tronquée ou en erreur n'active pas le modèle. La réponse de
  synchronisation expose `history_errors` pour diagnostiquer ce cas.
- Rattrapage au premier cycle, puis rafraîchissement après 23 heures. Les
  résultats récents et leurs corrections sont réintégrés à chaque cycle.
- Relecture chronologique déterministe par jeu, initialisation à 1500, K équipe
  de 24 et échelle de 400 ; le résultat observé est la proportion de maps
  gagnées. La distribution BO1/3/5/7 produit la probabilité de gagner la série.
- Au moins cinq séries par équipe et une fenêtre synchronisée depuis moins de
  24 heures sont nécessaires avant d'ouvrir un nouveau call PandaScore.
- Le premier affichage du barème (ou le premier appel direct de placement)
  constitue l'ouverture : verrouillage de la ligne match et enregistrement
  d'une seule estimation commune. Ce barème est ensuite immuable, même si le
  modèle évolue. Les estimations non publiables renvoient `status: preparing`
  et aucun choix jouable. Un match déjà commencé n'obtient pas d'estimation
  rétroactive.
- La migration conserve les snapshots des matchs commencés et de tous les
  matchs ayant un call, y compris annulé. Elle retire seulement les anciens
  snapshots Elo V1 des matchs PandaScore futurs sans call.
- Les Elo historiques résident dans le schéma privé et ne modifient pas
  `equipes.elo`, utilisé par les contrats historiques. Les RPC d'import et de
  diagnostic sont réservées à `service_role`, sans accès client aux tables.

Les diagnostics `clutch_elo_status_v2()` donnent le nombre de matchs et le score
Brier prédit avant chaque résultat, comparé au modèle constant 50/50. Ces
mesures servent à évaluer la calibration par jeu ; cinq matchs constituent un
seuil de disponibilité, pas une preuve de qualité prédictive. Aucun bonus
arbitraire n'est appliqué selon la popularité du match ou les votes.

L'interface distingue **Estimation Clutch** (utilisée pour les Frags) et
**Votes communauté**. Sans votes, elle affiche l'absence de calls.

Validation : `npm run pandascore:test` et
`supabase/tests/historical_elo_call_opening.sql` (transaction annulée).
La migration et l'Edge Function doivent être activées ensemble. Appliquer
uniquement la migration V2 validée, puis déployer `clutch-pandascore-sync` en
conservant la vérification JWT. Déclencher le cycle existant
`private.clutch_cycle_pandascore_v1()` sans extraire ses secrets et contrôler
les diagnostics avant de publier les premiers barèmes.
