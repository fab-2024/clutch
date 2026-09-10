# Économie GRIFF — 10 septembre 2026

Périmètre corrigé par l’utilisateur : modifier uniquement les valeurs économiques ; conserver les écrans et les défis du jour existants. Cadence : petite personnalisation en environ une semaine ou belle pièce en deux à trois semaines pour un joueur régulier.

## Audit des moyens de gagner

Vérification des migrations et des fonctions du projet Supabase `ipmswubihditoulfgivw`, le 10 septembre. Le registre disponible contient surtout des opérations de développement : il ne permet pas de mesurer un revenu joueur représentatif.

| Origine | Montant | Récupération / fréquence |
| --- | ---: | --- |
| Profil de départ terminé | 300 | Automatique, une fois par compte |
| Bonus quotidien | 10 | Bouton Récupérer, un jour civil serveur, sans rattrapage |
| Série de calls de 7 / 14 jours | 50 / 100 | Automatique, chaque palier une fois par compte, pas chaque semaine |
| Missions sociales | 25 / 30 / 40 | Automatique à la réussite validée ; montant propre à chaque mission |
| Parrainage | 30 | Premier call classé éligible de l’ami ; 5/jour, 20/mois |
| Progression, faction, campagnes, récompenses exceptionnelles | Variables | Dépendent d’événements et de conditions ; hors revenu mensuel de référence |
| Publicités, cartes cadeaux | Inactives | Aucune attribution et aucune conversion activées |

Les trois cartes du Hub promettaient des gains fictifs de 30/20/25 Volts, sans progression reliée au serveur. L’utilisateur a demandé de conserver leur présentation et leur fonctionnement. Elles ne sont donc pas comptées comme des revenus réellement distribués dans la simulation. Les missions effectivement disponibles restent dans Social.

## Prix

| Dépense | Prix en Volts |
| --- | ---: |
| Cosmétiques individuels rares / épiques / légendaires | 100 / 200 / 300 |
| Lumières | 80–120 |
| Salles autonomes | 220–320 |
| Écrins | 180–360 |
| Protecteur de série | 90, stock maximum 2 |
| Effet de profil / vitrine à la une | 45 / 60, durées indiquées avant achat |
| Packs | 2,99 € en achat intégré, séparés des Volts |

La migration aligne exactement 15 anciens cosmétiques (titres, cadres, cartes, apparences, effets de faction), auparavant à 250–2 200 Volts, sur l’échelle 100/200/300 déjà utilisée pour les objets individuels. Les récompenses existantes et les achats passés sont conservés. Les plafonds et les contrôles d’achat restent côté serveur.

## Simulation reproductible

`npm run economy:simulate` utilise `mobile/src/features/economy/balancePolicy.json`. Ce fichier alimente également le montant de bonus attendu par le client et les prix des aperçus d’objets individuels. Les achats réels utilisent toujours les prix du catalogue serveur.

| Hypothèse sur 30 jours | Bonus récupérés | Missions à 25 Volts | Revenu récurrent | Épargne pour 100 / 200 / 300 |
| --- | ---: | ---: | ---: | --- |
| Occasionnel | 8 | 2 | 130 | 24 / 47 / 70 jours |
| Régulier | 20 | 8 | 400 | 8 / 15 / 23 jours |
| Assidu | 30 | 16 | 700 | 5 / 9 / 13 jours |

Ces délais arrondis sont des hypothèses d’épargne pour **un achat à la fois**, pas des promesses. Acheter une petite pièce chaque semaine laisse peu de budget pour une grosse pièce : il faut choisir entre achats fréquents et épargne. Un protecteur à 90 fait passer le délai régulier d’une pièce à 200 de 15 à 20 jours. Le budget de bienvenue de 300 et les 150 de série ne sont pas comptés comme revenus renouvelables.

Sensibilité : 30 bonus et 16 missions à 40 rapporteraient 940/mois. Le parrainage peut ajouter jusqu’à 600/mois, mais dépend d’amis réellement activés. Il est exclu de la base et ne constitue pas un revenu quotidien garanti. Les récompenses d’événements sont également exclues.

## Interface conservée

Les essais de réorganisation du Hub et du portefeuille ont été annulés à la demande de l’utilisateur. Aucun changement de navigation ou d’écran ne fait partie de cette refonte économique. Les aperçus des anciens cosmétiques affichent seulement les nouveaux prix.

## Suivi après lancement

Mesurer les crédits par origine hors ajustements développeur, le nombre de missions achevées, le délai du premier achat, les soldes non dépensés et les achats par famille. Les objectifs 600/900/360 et le ratio de dépense de 0,80 du simulateur v1 étaient des hypothèses historiques, pas des plafonds appliqués. Ne pas les présenter comme des garanties. Revoir les prix sur des usages représentatifs sans réduire les récompenses déjà annoncées.

## Validation de cette révision

- Migration `20260910123507_align_volt_cosmetic_prices` appliquée directement sur Supabase, sans Docker : cinq articles à chacun des prix 100/200/300.
- Registre inchangé avant/après migration : 14 mouvements, total de 93 990 Volts (compte de développement).
- Test transactionnel `volts_economy_ledger_v2.sql` passé sur Supabase, avec rollback : prix débité, onboarding et crédit idempotents, journal immuable, refus du découvert et séparation compétitive.
- Architecture mobile, TypeScript et simulation validés après restauration des écrans. Le diff du Hub, du portefeuille et des traductions est vide.
- Les tests historiques supplémentaires de boutique/catalogue ne sont pas considérés validés : des assertions sur le catalogue initial et les anciens équipements attendus échouent avec la configuration actuelle. Seules leurs attentes de prix et soldes ont été mises à jour ; leur refonte sort du périmètre demandé.
- Audit sécurité avant/après identique : aucune modification des permissions par cette migration de prix.
