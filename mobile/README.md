# Clutch Mobile

Fondation native de Clutch construite avec Expo + React Native + Expo Router.

## Objectif

La web app existante reste dans `../web`. Ce dossier est une application mobile séparée qui réutilisera progressivement le backend Supabase et la logique métier de Clutch.

## Lancer le projet

```bash
cd mobile
npm install
npx expo start
```

La fondation utilise Expo SDK 57. Pendant la transition SDK 57, Expo Go peut avoir une contrainte de version sur téléphone physique ; pour le développement produit, nous passerons à un development build Expo plutôt que de figer Clutch sur un ancien SDK.

## Structure

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    matches.tsx
    community.tsx
    room.tsx
    profile.tsx
components/
src/theme/
```

## Ordre de migration

1. Fondation + navigation native
2. Connexion Supabase / session
3. Accueil alimenté par les vraies données
4. Match + pronostic
5. Résultat + XP / Frags
6. Profil
7. Onboarding
8. Communauté / Ligues / Boutique
9. Clutch Room 3D

## Règle d'architecture

Le mobile ne doit jamais dupliquer la logique sensible côté client. Les opérations qui modifient un solde, valident un pronostic ou attribuent une récompense doivent continuer à être autorisées par Supabase/Postgres et les politiques RLS.
