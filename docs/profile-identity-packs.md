# Personnalisation du profil — collection de lancement

Décisions utilisateur du 12 septembre 2026. Les douze planches de référence
se trouvent dans `magasin/Image Codex 12 sept. 2026, … .png`.
Le catalogue typé est `mobile/src/features/profile/identity/catalog.ts`.

## Répartition approuvée

| Accès | Packs | Prix / progression |
| --- | --- | --- |
| Inscription | Clutch Original | Inclus, avec les 15 avatars gratuits |
| Volts, rapide | Graphite, Tactique | Montants à calibrer sur l’économie actuelle |
| Volts, intermédiaire | Racing, Tribune | Montants à calibrer |
| Volts, long | Underground, Néon nocturne | Montants à calibrer |
| Achat intégré | Ivoire | Hypothèse : 3,99 € |
| Achat intégré | Maillot | Hypothèse : 4,99 € |
| Achat intégré | Éditorial | Hypothèse : 4,99 € |
| Achat intégré | Holographique | Hypothèse : 6,99 € |
| Participation | Mémoire de saison | Éléments gagnés progressivement pendant la saison |

Chaque habillage contient cadre, fond et signature. Les avatars restent
indépendants : équiper ou acheter un habillage ne change jamais le personnage.
Les 15 avatars de la planche du 12 septembre sont tous gratuits : Spectre, Nova,
Vector, Glitch, Bulwark, Ember, Ronin, Nyx, Orion, Sylva, K.O., Boost, Byte, Fang et Ace.
Ils remplacent les anciens visuels en conservant les identifiants enregistrés sur les profils.
Badges d’accomplissement, grades et titres de performance sont exclusivement
liés au jeu. Aucun achat ne change les Frags ou la progression compétitive.
Les achats sont directs, avec contenu visible avant acquisition.

## Adaptation à l’équipe favorite — décision confirmée

FNATIC est un exemple de rendu, pas une restriction de collection.
Le logo et les mentions d’équipe doivent être injectés depuis l’équipe favorite
réelle. Les éléments textiles, drapeaux et écussons suivent ses couleurs ; les
matériaux et la palette caractéristique de chaque style restent reconnaissables.
Un changement d’équipe ne nécessite pas de racheter un pack. Sans équipe favorite,
le rendu utilise la marque Clutch, sans attribuer une faction fictive au joueur.

Les planches ne sont pas des assets de production directement utilisables :
plusieurs incluent FNATIC dans les drapeaux, le textile et les fonds. Préparer
les textures sans marque, puis des emplacements distincts pour les logos. Ne
pas simplement afficher ces planches derrière des données utilisateur, ni
recouvrir grossièrement un logo FNATIC par le logo d’une autre équipe.

## Composants de rendu

- Cadre : contour indépendant et centre transparent, même géométrie sur profil
  et classement, sans avatar peint dans l’asset.
- Fond : texture et décor sans pseudo, grade, portrait ou équipe incrustés.
- Signature : décor indépendant ; pseudo rendu dynamiquement, avec gestion des
  pseudos longs, de l’accessibilité et du contraste.
- Portrait : même avatar dans tous les styles. Éditorial et Underground changent
  sa composition visuelle, jamais son identité.
- Maillot : numéro personnalisable de 0 à 99, zéros initiaux conservés.
- Holographique : un reflet bref à l’ouverture, pas une animation permanente ;
  rendu statique lorsque la réduction des animations est activée.
- Mémoire de saison : millésime et saison issus des données. Déblocage progressif
  du cadre, du fond et de la signature, conservés une fois obtenus. Conditions
  exactes à définir avant publication ; aucun déblocage arbitraire côté client.

## Intégration restante

L’application dispose déjà d’un inventaire, d’achats de packs, de cadres et de
fonds, ainsi que de la validation des achats intégrés. Il faut étendre ce système,
pas créer un second portefeuille ni stocker la propriété payante uniquement sur
le téléphone. La signature de joueur n’est pas le slot historique `effet_faction`.

1. Produire et vérifier les composants graphiques indépendants des équipes.
2. Ajouter carte de joueur et atelier : aperçu, comparaison dans le classement,
   choix du pack et sélection indépendante de l’avatar.
3. Étendre le catalogue serveur et l’équipement pour les signatures et le numéro.
4. Calibrer les six coûts en Volts à partir des gains réels, puis vérifier les
   achats atomiques et idempotents ; ne jamais débiter sur simple essai de style.
5. Configurer les quatre produits natifs et la validation des droits ; afficher
   le prix localisé fourni par le store lors de l’achat, pas l’hypothèse éditoriale.
6. Définir et implémenter les conditions de participation à la saison côté serveur.
7. Vérifier profil, classement, changement d’équipe, changement d’avatar,
   restauration des achats et réduction des animations.

Le catalogue local décrit la direction et les hypothèses. Il ne publie pas les
packs, n’accorde pas de propriété et n’active aucun paiement.
