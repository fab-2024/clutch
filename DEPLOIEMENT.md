# Mettre Clutch en ligne

Guide pas à pas, écrit pour quelqu'un qui ne code pas. Compte environ
**30 minutes**. Tout est gratuit à ce stade.

Trois étapes :

1. La base de données (Supabase) — où vivent les comptes, les paris, les scores
2. Le site (Vercel) — l'adresse publique de ton application
3. L'extension Chrome — optionnelle

---

## Avant de commencer

Tu n'as **rien à installer**. Il te faut seulement :

- une adresse e-mail
- un compte GitHub (gratuit) — c'est là que vit le code
- 30 minutes au calme

> **Tu veux juste montrer le produit ?** Ce n'est pas la peine de faire tout ça.
> Le mode démo tourne sans serveur : voir le README. Ce guide sert quand tu veux
> de **vrais comptes** et que tes potes jouent depuis leur téléphone.

---

## Étape 1 — La base de données (Supabase)

### 1.1 Créer le projet

1. Va sur [supabase.com](https://supabase.com) → **Start your project** → connecte-toi avec GitHub
2. **New project**
   - *Name* : `clutch`
   - *Database Password* : clique sur « Generate a password » et **garde-le quelque part**
   - *Region* : `West EU (Ireland)` ou `Central EU (Frankfurt)` — le plus proche de tes joueurs
3. **Create new project**, puis patiente 2 minutes le temps de la mise en route

### 1.2 Créer les tables

Dans le menu de gauche : **SQL Editor** → **New query**.

Tu vas exécuter huit fichiers, **dans cet ordre**. Pour chacun : ouvre le
fichier, copie tout son contenu, colle-le dans l'éditeur, clique sur **Run**.
Attends le message vert avant de passer au suivant.

| Ordre | Fichier | Ce qu'il fait |
|---|---|---|
| 1 | `supabase/01_schema.sql` | Crée les tables : profils, équipes, matchs, paris, ligues |
| 2 | `supabase/02_fonctions.sql` | Installe le moteur de cotes et la logique des paris |
| 3 | `supabase/03_securite.sql` | Verrouille tout : personne ne peut se créditer des Frags |
| 4 | `supabase/04_donnees.sql` | Remplit les équipes et un calendrier de départ |
| 5 | `supabase/05_xs.sql` | Ajoute la prime en série, l'équipe préférée, le call de la saison et la rivalité |
| 6 | `supabase/06_analyse.sql` | Ajoute le prono par défaut, le défi de ligue et le profil d'analyste |
| 7 | `supabase/07_correctif_rls.sql` | **Indispensable** : corrige une récursion dans les règles de sécurité qui rendait toute la base illisible |
| 8 | `supabase/08_palier2.sql` | Ajoute la note à vie, les classements enrichis et le récapitulatif des badges |

> `05_xs.sql` et `06_analyse.sql` sont **rejouables** : les relancer ne casse
> rien. Ce sont les fichiers à réexécuter après chaque mise à jour du dépôt qui
> touche à ces mécaniques.

> Si une erreur rouge apparaît, ne passe pas au fichier suivant. Copie le message
> d'erreur et cherche à quelle ligne il correspond — le plus souvent, c'est qu'un
> fichier précédent n'a pas été exécuté en entier.

### 1.3 Activer la connexion par e-mail

Menu **Authentication** → **Providers** → **Email** :

- **Enable Email provider** : activé
- **Confirm email** : activé
- **Enable email OTP / Magic Link** : activé

Menu **Authentication** → **URL Configuration** : tu reviendras y mettre
l'adresse de ton site à l'étape 2.6. Laisse pour l'instant.

### 1.4 Récupérer tes deux clés

Menu **Project Settings** (l'engrenage) → **API**. Note :

- **Project URL** — ressemble à `https://abcdefgh.supabase.co`
- **anon public** — une longue chaîne qui commence par `eyJ...`

> ⚠️ Il y a une deuxième clé nommée **service_role**. Ne la copie jamais dans le
> code du site : elle donne tous les droits. La clé `anon` est faite pour être
> publique, c'est le fichier `03_securite.sql` qui protège les données.

---

## Étape 2 — Le site (Vercel)

### 2.1 Mettre le code sur GitHub

Si ce n'est pas déjà fait :

1. Va sur [github.com/new](https://github.com/new)
2. *Repository name* : `clutch` · *Private* si tu préfères · **Create repository**
3. Sur la page qui s'affiche, suis la section « …or push an existing repository »,
   ou glisse simplement les fichiers via **uploading an existing file**

### 2.2 Renseigner tes clés Supabase

Ouvre le fichier `web/js/config.js` (sur GitHub : clique dessus, puis sur le
crayon ✏️) et remplis les deux premières lignes :

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Ajoute aussi ton e-mail dans la liste des administrateurs, c'est ce qui te
donnera accès à la page de saisie des scores :

```js
export const ADMINS = ['toi@exemple.fr'];
```

Enregistre (**Commit changes**).

### 2.3 Déployer

1. Va sur [vercel.com](https://vercel.com) → connecte-toi avec GitHub
2. **Add New… → Project** → sélectionne ton dépôt `clutch` → **Import**
3. *Framework Preset* : **Other**
4. Laisse le reste tel quel — le fichier `vercel.json` du dépôt indique déjà que
   le site se trouve dans le dossier `web`
5. **Deploy**, puis attends une minute

Tu obtiens une adresse du type `https://clutch-xxxx.vercel.app`. Ouvre-la : le
bandeau « mode démo » doit avoir **disparu**. S'il est encore là, c'est que les
clés de l'étape 2.2 ne sont pas prises en compte.

### 2.4 Créer ton compte

Sur ton site : **Jouer** → saisis ton e-mail → tu reçois un lien de connexion →
clique dessus. Ton profil est créé automatiquement avec 1 000 Frags.

### 2.5 Te déclarer administrateur

Retourne dans Supabase → **SQL Editor** → nouvelle requête, en remplaçant par
ton e-mail :

```sql
update profils set est_admin = true where email = 'toi@exemple.fr';
```

**Run**. Recharge ton site : l'onglet **Admin** apparaît. C'est là que tu
saisiras les scores après chaque match.

### 2.6 Autoriser les liens de connexion

Dans Supabase → **Authentication** → **URL Configuration** :

- *Site URL* : `https://clutch-xxxx.vercel.app`
- *Redirect URLs* : ajoute `https://clutch-xxxx.vercel.app/**`

Sans ça, les liens envoyés par e-mail renverront vers `localhost` et ne
fonctionneront pas.

---

## Étape 3 — L'extension Chrome (optionnel)

1. `chrome://extensions` → active le **Mode développeur** en haut à droite
2. **Charger l'extension non empaquetée** → sélectionne le dossier `extension/`
3. Clique sur l'icône Clutch dans la barre d'outils, colle l'adresse de ton site,
   **Enregistrer**
4. Ouvre un stream Twitch : le bouton apparaît en bas à droite (ou **Alt + C**)

> Pour publier l'extension sur le Chrome Web Store, il faut un compte développeur
> à 5 $ (paiement unique) et une validation de quelques jours. Tant que vous êtes
> entre potes, le chargement manuel suffit largement.

---

## Le quotidien : faire vivre le jeu

### Après chaque match

Onglet **Admin** → saisis le score → **Régler ce match**. En un clic :

- les paris gagnants sont crédités, les perdants soldés
- les Elo des deux équipes sont recalculés
- les cotes des prochains matchs s'ajustent automatiquement

### Ouvrir une nouvelle saison

C'est ce qui remet tout le monde à égalité — à faire au début de chaque grand
tournoi. Supabase → **SQL Editor** :

```sql
insert into saisons (id, nom, debut, fin, solde_initial)
values ('saison-hiver-2027', 'Saison 3 — Hiver 2027',
        '2027-01-05 00:00+01', '2027-03-30 23:59+02', 1000);
```

Les matchs de cette période devront porter `saison_id = 'saison-hiver-2027'`.
Le statut de la saison (à venir / en cours / terminée) se déduit tout seul des
dates : tu n'as rien d'autre à faire, et le classement de la saison précédente
bascule automatiquement dans le palmarès.

### Ajouter des matchs

Pour l'instant, par SQL. Supabase → **SQL Editor** :

```sql
insert into matchs (event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut)
values ('lec-summer', 'saison-ete-2026', 'lol', 'lol-g2', 'lol-kc', 3, '2026-09-14 18:00+02');
```

Les identifiants d'équipes et d'événements sont ceux du fichier
`supabase/04_donnees.sql`. Pour ajouter une équipe absente :

```sql
insert into equipes (id, jeu, nom, tag, elo)
values ('lol-nouvelle', 'lol', 'Nouvelle Team', 'NEW', 1500);
```

Un Elo de départ de 1500 signifie « équipe moyenne ». Mets 1650 pour une grosse
écurie, 1400 pour un petit poucet — le modèle corrigera tout seul après quelques
matchs.

### Quand ça deviendra pénible

Saisir les matchs à la main tient tant que tu couvres un tournoi. Au-delà,
l'étape suivante est de brancher l'API PandaScore (plan gratuit : calendriers,
1 000 requêtes/heure) sur une fonction planifiée Supabase. C'est le chantier v2 —
inutile de s'y attaquer avant d'avoir des joueurs.

---

## En cas de pépin

| Symptôme | Cause la plus probable |
|---|---|
| Le bandeau « mode démo » reste affiché | `config.js` n'a pas les deux clés, ou le déploiement n'a pas été relancé |
| « Erreur 401 » en misant | Session expirée : déconnecte-toi et reconnecte-toi |
| Le lien de connexion renvoie vers localhost | Étape 2.6 non faite |
| L'onglet Admin n'apparaît pas | Étape 2.5 non faite, ou e-mail absent de `ADMINS` dans `config.js` |
| « Réservé aux administrateurs » au règlement | `est_admin` n'est pas à `true` sur ton profil |
| Le calendrier est vide | `04_donnees.sql` n'a pas été exécuté, ou la saison sélectionnée en haut à droite n'est pas la bonne |
| « Cette saison n'est pas ouverte aux mises » | Tu consultes une saison passée ou future : change-la dans le sélecteur de l'entête |

---

## Ce que ça coûtera plus tard

Tant que vous êtes quelques dizaines, tout reste gratuit. Les seuils à connaître :

- **Supabase gratuit** : 500 Mo de base, projet mis en pause après une semaine
  sans activité (une simple visite le réveille). Au-delà : 25 $/mois.
- **Vercel gratuit** : 100 Go de trafic par mois. Très loin devant vos besoins.
- **Nom de domaine** : environ 12 €/an si tu veux `clutch.gg` plutôt que
  `clutch-xxxx.vercel.app`. Se branche depuis Vercel en deux minutes.
