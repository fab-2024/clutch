# Les deux polices de Clutch

La feuille de style les cherche ici. Tant qu'elles sont absentes, l'application
retombe sur la police arrondie du système : correct sur Mac et iPhone, plus
banal ailleurs. Avec elles, l'identité est la même partout.

Deux fichiers à déposer dans ce dossier, tels quels :

| Fichier | Rôle | Où le prendre |
|---|---|---|
| `Outfit-Variable.woff2` | Titres, boutons, chiffres mis en avant | https://fonts.google.com/specimen/Outfit → « Get font » → décompresser, ou https://fontsource.org/fonts/outfit |
| `Inter-Variable.woff2` | Texte courant, tableaux, chiffres alignés | https://rsms.me/inter/ → « Download » → le fichier `InterVariable.woff2` |

Renomme-les exactement comme dans la colonne « Fichier ». Les deux sont sous
licence SIL Open Font, libres d'usage commercial, et pèsent moins de 200 ko à
elles deux.

## Pourquoi deux, et pourquoi celles-là

**Outfit** est une grotesque géométrique arrondie : c'est elle qui porte la
personnalité, en gras et en capitales espacées sur les titres de blocs. C'est la
famille la plus proche de ce qui t'a plu chez Destiny Eleven.

**Inter** dessine des chiffres à chasse fixe — un `1` occupe exactement la même
largeur qu'un `8`. Sans ça, les colonnes de soldes et de cotes tremblent d'une
ligne à l'autre. Une police de titre ne sait presque jamais faire ça, d'où le
duo : la personnalité en haut, la précision dans les tableaux.
