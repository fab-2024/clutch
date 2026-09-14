# Fonctionnalités conservées en attente

Ce registre distingue les chantiers volontairement masqués du code remplacé.
Il n’autorise aucune réactivation et les décisions produit restent prioritaires.

| Élément | Référence conservée | État |
| --- | --- | --- |
| Clutch Room | `mobile/src/features/room/` ; `AGENTS.md` | Placeholder conservé, produit en pause |
| Effets et consommables visuels | `mobile/src/features/shop/effects/DEFERRED.md`, `effectAvailability.ts`, `mobile/src/features/consumables/` | Visibilité contrôlée ; contrats et opérations conservés |
| Onde Titanide | `mobile/src/features/shop/effects/titanWave/` et `/titan-wave-preview` | Prototype isolé en attente de validation visuelle |
| Cartes cadeaux | `mobile/docs/rewarded-ads-gift-cards-proposal.md`, `admob-tremendous-qualification.md`, `GiftCardsPreviewSection.tsx` | Étude reportée ; aucune conversion activée |
| Laboratoire du réacteur | `docs/relic-animation-workflow.md`, `/social-relic-lab-preview` et `social/faction/reactor/` | Outil de validation du réacteur actuel |
| Achats intégrés des packs | `mobile/src/features/purchases/` et `mobile/docs/cosmetic-pack-purchases.md` | Préparation RevenueCat conservée ; disponibilité vérifiée côté serveur |

Les sources de génération et fichiers de validation ne sont gardés que
lorsqu’ils documentent un asset actuel ou rendent sa génération reproductible.

## Avant un prochain nettoyage

Vérifier les routes Expo Router, les variantes natives et web, les imports
dynamiques, les tests, les scripts d’assets et ce registre. Une fonctionnalité
masquée n’est pas automatiquement du code mort.
