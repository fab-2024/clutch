# Figurines — catalogue et règles validées

24 figurines : 15 en Volts, 9 en achat direct. Voltige en Volts a été
confirmée par l’utilisateur. Les planches originales sont conservées dans
`mobile/assets/shop/figurines/`. La route `/figurines` présente le catalogue
sans déclencher d’achat ni distribuer de récompense.

## Prix en Volts validés, non activés

La politique actuelle prévoit 300 Volts à l’inscription, 10 par bonus
quotidien, une mission de référence à 25 et des objets individuels à
100 / 200 / 300. Garder cette échelle permet de comparer les dépenses.

| Prix | Figurines |
| --- | --- |
| 100 | Écho, Grelot, Dash, Piston |
| 200 | Brumousse, Sentinelle, Comète, Nivéa, Cendre, Voltige |
| 300 | Rocorne, Mycélune, Spectre, Oréa, Obsidien |

Le choix gratuit initial est unique : Brumousse, Écho ou Grelot. Il ne
consomme pas les Volts d’inscription. Les autres choix restent achetables.

## Prix payants validés

- 3,99 € : Lumiflor, Boréal, Vega, Porte-Serment, Auréon.
- 5,99 € : Veyr, Bastion, Falcon, Kairos-6.

Ces prix ont été validés par l’utilisateur. L’interface d’achat devra utiliser le prix
localisé renvoyé par le store, avec attribution après vérification serveur.

## Progression validée, non activée

Trois formes par figurine, les visuels restent à produire et valider :

1. Forme initiale à l’acquisition.
2. Évolution à 10 calls réglés et 5 jours de jeu distincts.
3. Évolution finale à 50 calls réglés et 20 jours de jeu distincts.

Seuls les calls éligibles dont le verdict est réglé comptent, gagnés ou
perdus ; les calls annulés ne comptent pas. Un jour actif comporte au moins
un call éligible. Les seuils sont cumulatifs, jamais une série obligatoire.
La progression serait commune aux figurines possédées, depuis leur acquisition,
permanente et non remise à zéro à la fin d’une saison. Aucun accélérateur payant.
Chaque forme obtenue reste sélectionnable, gratuitement.

## Conservation et travail restant

Ne pas réutiliser ou supprimer les identifiants des anciennes figurines.
Conserver leur inventaire et leur placement dans la vitrine. Les nouvelles
acquisitions devront être atomiques côté serveur : attribution unique du
cadeau de départ, débit des Volts et attribution, validation des achats réels,
progression et sélection d’une forme effectivement débloquée.

Avant activation : visuels individuels détourés
et évolutions, intégration de la vitrine, persistance sécurisée et produits store.
