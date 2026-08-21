# Exploitation des résultats de match

Ce document est le runbook du lot 1.4. Il décrit les seules transitions
autorisées pour un match Clutch et les garanties attendues du backend.

## Provenance obligatoire

Un résultat final doit toujours contenir :

- un code source stable, par exemple `grid`, `pandascore`, `liquipedia` ou
  `validation_clutch` ;
- un libellé lisible de cette source ;
- l'identifiant du résultat chez cette source ;
- l'heure de réception, l'heure du premier règlement et l'heure de dernière
  modification ;
- une révision, égale à `1` pour le premier résultat puis incrémentée à chaque
  correction.

Le couple `(source, identifiant externe)` est unique. Les anciens résultats
sont explicitement marqués `legacy_clutch` avec une référence `legacy:<match>`.

## Transitions opérationnelles

| Opération | État de départ | Résultat | Règle |
| --- | --- | --- | --- |
| Démarrer | `a_venir` | `en_cours` | Un second appel identique est sans effet. |
| Reporter | `a_venir` | `a_venir` | La nouvelle date doit être future. Le call reste valide et se verrouille à la nouvelle date. |
| Annuler | `a_venir` ou `en_cours` | `annule` | Les calls classés passent à `annule`, avec zéro Frag. Les anciens paris éventuels sont remboursés. |
| Régler | `en_cours` | `termine` | Score, source et référence externe sont obligatoires. |
| Corriger | `termine` | `termine` | Seule la RPC dédiée est autorisée. Motif, source et référence sont obligatoires. |

Un match annulé ne peut pas être rouvert. Un résultat final ne peut pas être
annulé ni modifié directement : il doit recevoir une nouvelle révision via la
correction administrative.

## Score invalide et égalité

Le marché V1 porte sur le vainqueur de la série. Une égalité ne permet donc pas
de déterminer le verdict et est toujours rejetée. Pour un BO1, BO3 ou BO5, le
vainqueur doit respectivement atteindre 1, 2 ou 3 maps, sans score négatif.

Un score invalide annule toute la transaction : aucun match, call, classement,
Elo ou journal d'audit ne doit être modifié.

## Correction administrative

Une correction :

1. verrouille la saison et le match ;
2. valide la nouvelle provenance et le nouveau score ;
3. incrémente la révision du résultat ;
4. recalcule les verdicts et les deltas concernés ;
5. reconstruit chronologiquement les Frags, pics, placements, grades et meilleurs
   rangs de la saison ;
6. remet le résultat corrigé dans la file de révélation des joueurs concernés ;
7. ajuste le delta Elo associé au snapshot du match ;
8. écrit l'avant, l'après, l'administrateur et le motif dans le journal immuable.

La correction ne réécrit jamais l'entrée d'audit précédente. Le journal est
stocké dans le schéma privé, sans droit direct Data API, et n'est consultable
que par la RPC administrateur `clutch_admin_historique_match_v1`.

## Rejeu et concurrence

- Le rejeu du même score avec la même source et la même référence retourne
  `rejoue: true` sans recréditer les conséquences ni créer un second audit.
- Un rejeu différent d'un résultat final est rejeté et doit passer par la
  correction administrative.
- Les règlements sont sérialisés par saison avec un verrou transactionnel
  Postgres. Deux matchs touchant le même classement ne peuvent donc pas perdre
  une mise à jour ou capturer des rangs incompatibles.
- Le match et les deux équipes sont ensuite verrouillés dans un ordre stable
  afin d'éviter les interblocages.
- Toute erreur provoque un rollback atomique.

## Vérification avant mise en production

Exécuter les contrats après les migrations :

```bash
npm run db:verify
```

`db:verify` lance aussi deux connexions simultanées sur la même saison. Une
connexion doit attendre le verrou transactionnel détenu par l'autre. Le même
test peut viser le projet lié, sans écrire de donnée, avec :

```bash
npm run db:test:concurrency -- --linked
```

Puis vérifier les advisors Supabase. Trois alertes génériques
`authenticated_security_definer_function_executable` sont attendues pour les
RPC administrateur de règlement, correction et lecture du journal : elles sont
exposées aux comptes connectés pour traverser la Data API, mais chacune appelle
`private.clutch_exiger_admin_v1`, fixe son `search_path` et refuse `anon`.

L'information `rls_enabled_no_policy` sur
`private.clutch_match_operations_audit` est également intentionnelle : le
journal est en lecture refusée par défaut et ne possède aucun droit direct,
même pour `service_role`. Les index du lot peuvent enfin être signalés comme
inutilisés immédiatement après leur création ; cette information doit être
réévaluée après du trafic réel.
