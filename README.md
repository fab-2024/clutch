<div align="center">

# CLUTCH

**Le prono esport entre potes.** Pronostique les matchs LoL, CS2 et Valorant,
mise des Frags — une monnaie fictive — et grimpe dans le classement de ta ligue.

Application web · Extension Chrome · Zéro dépendance · Zéro build

</div>

---

## Ce que c'est

Un jeu de pronostics esport gratuit. On choisit un match, on mise des **Frags**
à la cote proposée, et on gagne des points si on a vu juste. Le classement se
joue dans des ligues privées créées entre amis.

**Ce n'est pas un site de paris.** Aucun argent réel n'entre ni ne sort :
les Frags ne s'achètent pas, ne se convertissent pas, et ne valent rien.
Voir [la section juridique](#cadre-juridique).

## Ce qui est dedans

| Fonctionnalité | État |
|---|---|
| Calendrier multi-jeux (LoL, CS2, Valorant) | ✅ |
| Cotes calculées par un modèle Elo maison | ✅ |
| Trois marchés : vainqueur, score exact, nombre de maps | ✅ |
| Mise avec cote figée à la validation | ✅ |
| Ligues privées avec code d'invitation | ✅ |
| Classement de ligue et classement général | ✅ |
| Prime quotidienne et filet anti-faillite | ✅ |
| Console d'administration pour saisir les résultats | ✅ |
| Extension Chrome : overlay sur Twitch et YouTube | ✅ |
| Mode démo complet, sans serveur | ✅ |
| Récupération automatique des résultats via API | ⏳ v2 |
| Notifications push | ⏳ v2 |

## Aperçu

| Le calendrier | Le bulletin de pari |
|---|---|
| ![Matchs](captures/01-matchs.png) | ![Pari](captures/02-pari.png) |

| Le classement | La console d'administration |
|---|---|
| ![Classement](captures/03-classement.png) | ![Admin](captures/04-admin.png) |

## Démarrer en 30 secondes

Aucune installation, aucun compte :

```bash
cd web
python3 -m http.server 8123
```

Puis ouvre <http://localhost:8123>. L'application démarre en **mode démo** :
calendrier pré-rempli, adversaires fictifs, progression stockée dans ton
navigateur. Tu peux miser, créer une ligue et régler des matchs depuis la page
Admin pour voir le moteur tourner.

Pour passer en production (vrais comptes, vraie base de données),
suis [DEPLOIEMENT.md](DEPLOIEMENT.md) — environ 30 minutes, sans écrire une
ligne de code.

## Comment sont calculées les cotes

Chaque équipe porte un **Elo** par jeu. La probabilité que l'équipe A gagne une
map se déduit de l'écart d'Elo :

```
p = 1 / (1 + 10^((eloB - eloA) / 400))
```

Cette probabilité de map est ensuite agrégée en probabilité de série selon le
format (BO1, BO3, BO5), ce qui donne d'un coup **toute la distribution des
scores possibles** — et donc les trois marchés. La cote servie est :

```
cote = 1 / (p × (1 + marge))
```

avec une marge de 6 %. C'est elle qui rend le jeu perdant à long terme si on
mise au hasard, exactement comme chez un vrai opérateur : sans elle, le
classement finirait dominé par celui qui mise le plus, pas par celui qui voit
le mieux.

Après chaque match, les Elo sont mis à jour, pondérés par l'écart de maps :
gagner 2-0 déplace plus le classement que gagner 2-1.

Tout est dans [`web/js/core.js`](web/js/core.js), commenté, et couvert par les
tests.

## Architecture

```
web/                 Application (HTML + CSS + JavaScript natif, aucun build)
  js/core.js         Moteur de cotes et règles du jeu
  js/api.js          Couche d'accès : bascule démo <-> Supabase
  js/store.js        Backend de démonstration (localStorage)
  js/views/          Une vue par écran
supabase/            Base de données : schéma, fonctions SQL, sécurité, données
extension/           Extension Chrome MV3 (overlay Twitch / YouTube)
tests/               Tests, sans dépendance : node --test tests/*.mjs
```

Deux principes structurent le tout :

1. **Le serveur ne fait jamais confiance au navigateur.** La cote est
   recalculée dans Postgres au moment de valider un pari, et le solde n'est
   modifiable que par des fonctions `SECURITY DEFINER`. Le code du navigateur
   peut être trafiqué : ça ne donne aucun Frag de plus.
2. **Une seule logique, deux implémentations volontairement jumelles.**
   `web/js/core.js` (affichage) et `supabase/02_fonctions.sql` (autorité)
   appliquent les mêmes formules. Si tu modifies l'une, modifie l'autre.

## Tests

```bash
node --test tests/*.mjs
```

38 tests couvrent le moteur de cotes (distributions, marge, Elo) et le parcours
complet de bout en bout : inscription, mise, règlement, classement, ainsi que
les cas d'erreur (solde insuffisant, score incohérent, double pari, match déjà
réglé).

## Extension Chrome

1. Va sur `chrome://extensions`, active le **mode développeur**
2. « Charger l'extension non empaquetée » → choisis le dossier `extension/`
3. Clique sur l'icône Clutch, colle l'adresse de ton application, enregistre

Sur Twitch ou YouTube, un bouton apparaît en bas à droite (raccourci
**Alt + C**). Le panneau affiche l'application dans une iframe : une seule base
de code à maintenir, et la session de connexion est partagée.

## Cadre juridique

Les paris esport en argent réel sont **interdits en France** : le jeu vidéo
n'étant pas reconnu comme sport, il ne bénéficie pas de l'agrément ANJ ouvert
aux paris sportifs.

Clutch reste hors de ce champ parce qu'il ne réunit pas les trois critères
cumulatifs de l'article L320-1 du Code de la sécurité intérieure — espérance de
gain convertible en argent, offre au public, **sacrifice financier**. Trois
règles à ne jamais enfreindre si tu fais évoluer le projet :

- **Aucun paiement pour jouer.** Pas de frais d'entrée, pas de Frags achetables.
- **Aucun lot convertible en argent.** Pas de cash prize, pas de crypto, pas de
  skins revendables.
- **Aucune cote de bookmaker affichée.** Les cotes de Clutch sortent de son
  propre modèle Elo, elles ne viennent d'aucun opérateur.

Monétisation compatible si le besoin s'en présente : publicité, ou options
cosmétiques n'apportant **aucun avantage de jeu**.

> Ceci n'est pas un conseil juridique. Au-delà d'un usage entre proches, fais
> valider le projet par un avocat spécialisé.

## Licence

MIT — voir [LICENSE](LICENSE).
