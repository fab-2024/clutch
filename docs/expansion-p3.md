# Expansion P3

P3 ajoute une première langue complète, deux consommables strictement visuels
et des conseils de notifications fondés sur une activité agrégée. La Clutch
Room et tous les calculs compétitifs restent inchangés.

## Langues

- `fr-FR` reste la langue de secours.
- `en-US` est disponible dans Profil > Paramètres > Langue.
- Le mode « système » choisit le français ou l’anglais à partir de la locale de
  l’appareil et retombe sur le français pour toute autre langue.
- Le choix est conservé localement et recopié dans les préférences de
  notifications afin que les messages soient traduits au moment de leur
  livraison, y compris s’ils avaient déjà été mis en file.
- Dates, nombres et pluriels utilisent la locale active.

## Conseils de notifications

Le serveur observe uniquement les événements internes `app_opened` et
`application_active` des 28 derniers jours. À partir de sept événements, il
cherche la plage de dix heures la moins active, par pas de trente minutes. En
dessous de ce seuil, il recommande 22 h–8 h.

La réponse publique contient seulement la source, le nombre d’événements, la
plage proposée, les catégories pertinentes et la date de génération. Elle ne
contient aucun événement brut, horaire individuel ou identifiant. Le joueur
doit appuyer explicitement sur « Appliquer les conseils » : le serveur ne
modifie jamais ses préférences automatiquement.

## Consommables visuels

| Type | Prix | Stock maximal | Durée | Effet |
| --- | ---: | ---: | ---: | --- |
| Mise en lumière | 60 Volts | 3 | 24 h | Halo cyan sur la vitrine publique |
| Pulsation de profil | 45 Volts | 3 | 24 h | Animation magenta de la carte profil |

Chaque achat et chaque activation utilise un UUID d’opération durable. Le
serveur décide du prix, du stock et de la durée, verrouille le portefeuille et
rejoue sans effet une opération déjà confirmée. Une opération incertaine reste
enregistrée sur l’appareil jusqu’à vérification. L’achat et l’activation sont
deux confirmations distinctes.

Ces consommables ne créditent aucun Frag, ne créent aucun call et ne modifient
ni rang, ni série, ni faction. Les tables internes ont la RLS active et les
clients passent uniquement par les RPC publiques minimales.

## Validation

Depuis la racine du dépôt :

```sh
npm run mobile:architecture
npm run mobile:typecheck
npm --prefix mobile test -- --runInBand
npm run db:reset
npm run db:lint
npm run db:verify
```

Le contrat transactionnel P3 se trouve dans
`supabase/tests/expansion_p3.sql`. Il couvre notamment la localisation à la
livraison, la confidentialité des recommandations, l’idempotence, le solde,
les plafonds de stock, la durée de 24 heures et l’absence d’effet compétitif.
