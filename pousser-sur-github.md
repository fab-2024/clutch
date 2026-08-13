# Pousser Clutch sur ton GitHub

L'archive contient déjà un dépôt Git complet, avec deux commits propres.
Tu n'as donc rien à initialiser : juste à le relier à ton compte.

## 1. Créer le dépôt

Va sur [github.com/new](https://github.com/new) :

- **Repository name** : `clutch`
- **Public** ou **Private**, comme tu veux
- ⚠️ **Ne coche RIEN** dans « Initialize this repository » (pas de README, pas
  de .gitignore, pas de licence) — ils entreraient en conflit avec ceux déjà
  présents dans l'archive

**Create repository.**

## 2. Décompresser et pousser

Ouvre un terminal (sur Mac : Spotlight → « Terminal »), puis colle ces
commandes en remplaçant `TON-PSEUDO` par ton identifiant GitHub :

```bash
cd ~/Downloads
unzip clutch.zip
cd clutch

git remote add origin https://github.com/TON-PSEUDO/clutch.git
git branch -M main
git push -u origin main
```

GitHub va demander tes identifiants. **Attention** : depuis 2021, le mot de
passe du compte ne fonctionne plus en ligne de commande. Deux options :

- **Le plus simple** — installe [GitHub CLI](https://cli.github.com), puis
  lance `gh auth login` une seule fois. Tout fonctionnera ensuite sans rien
  saisir.
- **Sans rien installer** — crée un jeton sur
  [github.com/settings/tokens](https://github.com/settings/tokens) →
  *Generate new token (classic)* → coche la case **repo** → copie le jeton et
  colle-le à la place du mot de passe.

## 3. Vérifier

Recharge la page de ton dépôt : les 46 fichiers doivent être là, et le README
s'affiche avec les captures d'écran.

Tu peux ensuite enchaîner directement sur `DEPLOIEMENT.md` — Vercel va
justement chercher le code dans ce dépôt.

---

## Si le terminal te rebute

Alternative sans aucune commande : sur la page de ton dépôt vide, clique sur
**uploading an existing file**, puis glisse-dépose tout le contenu du dossier
décompressé. Tu perds l'historique des deux commits, mais le code est bien là
et tout fonctionne pareil.
