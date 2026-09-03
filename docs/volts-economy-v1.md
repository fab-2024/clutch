# Économie des Volts v1

Les Volts financent uniquement l’identité visuelle du supporter. Ils ne sont ni convertibles en Frags, ni utilisables dans le classement.

## Sources gratuites

| Source | Récompense cible | Limite de conception |
| --- | ---: | --- |
| Onboarding | 300 une seule fois | Clé idempotente par joueur |
| Bonus quotidien | 10 par jour éligible | Jour civil serveur, fuseau ancré au compte, aucun rattrapage |
| Progression | 40–120 | Environ 600 par mois |
| Missions | 60–150 | Environ 900 par mois |
| Activations | 100–180 | Participation uniquement, environ 360 par mois |
| Exceptionnelles | 50–500 | Hors revenu récurrent simulé |

## Dépenses

Le registre autorise uniquement les achats cosmétiques validés par le catalogue : cadres, bannières, titres, variations de relique et collections limitées. Les objets sont connus avant l’achat et restent acquis définitivement.

Les paliers actuels sont :

- entrée : 250–500 Volts ;
- signature : 600–1 200 Volts ;
- prestige : 1 500–2 400 Volts ;
- collector : jusqu’à 4 200 Volts pour de futures collections très limitées.

## Simulation de référence

La simulation historique exclut les 300 Volts d’onboarding, les récompenses exceptionnelles **et le nouveau bonus quotidien**. Elle ne valide donc pas à elle seule l’économie après ajout du bonus.

| Profil | Revenu mensuel | Premier objet | Objet médian | Objet prestige | Revenu / dépense cible |
| --- | ---: | ---: | ---: | ---: | ---: |
| Occasionnel | 450 | 17 jours | 2 mois | 3,33 mois | 0,60 |
| Engagé | 900 | 9 jours | 1 mois | 1,67 mois | 0,75 |
| Core | 1 600 | 5 jours | 0,56 mois | 0,94 mois | 0,73 |

Deux garde-fous rendent la simulation bloquante : le premier objet doit rester accessible en 21 jours maximum et le revenu mensuel ne doit pas dépasser 80 % du budget de dépenses cosmétiques cible. Exécuter `npm run economy:simulate` pour les vérifier.

Le simulateur affiche aussi un scénario additionnel avec le bonus de 10 Volts.
Pour 8/20/30 jours actifs, les ratios passent à 0,71/0,92/0,86 : une revue produit
est nécessaire avant activation générale, sans modifier arbitrairement les prix.
Voir [le contrat et les validations du bonus quotidien](daily-volt-bonus-v1.md).
