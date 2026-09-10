# Fonctionnalités conservées en attente

Ce registre distingue les fonctionnalités volontairement mises de côté du code remplacé et devenu inutilisé. Il n’autorise aucune réactivation. Les décisions produit existantes restent prioritaires.

| Élément | Référence et code conservés | État |
| --- | --- | --- |
| Clutch Room | `mobile/src/features/room/` ; `AGENTS.md` | Placeholder conservé, produit en pause |
| Effets des packs et effets temporaires | `mobile/src/features/shop/effects/DEFERRED.md`, `effectAvailability.ts`, `mobile/src/features/consumables/` | Visibilité désactivée ; catalogues, achats et identifiants conservés |
| Onde Titanide | `mobile/src/features/shop/effects/titanWave/` et route `/titan-wave-preview` | Prototype et tests conservés pour une future validation visuelle |
| Cartes cadeaux / points cadeaux | `mobile/docs/rewarded-ads-gift-cards-proposal.md`, `admob-tremendous-qualification.md`, `GiftCardsPreviewSection.tsx` | Étude reportée ; aucune intégration ni conversion activées |
| Collections historiques d’équipes | `mobile/src/features/shop/packs/archivedTeamPacks.ts` | Fnatic, KC et M8 conservés, dont les identifiants des objets possédés |
| Collections historiques de jeux | `mobile/src/features/shop/packs/archivedGameCollections.ts` | LoL, Valorant et Rocket League conservés |
| Socles interchangeables | `INTERCHANGEABLE_SHOWCASE_PEDESTALS_ENABLED` dans `ShowcaseScreen.tsx`, catalogues et `profile/showcasePedestals/` | Fonctionnalité masquée ; composants et données conservés |
| Aperçu Social de référence | `/social-preview`, `SocialHomePreviewScreen` et variante `current` | Référence visuelle conservée dans les outils développeur ; le produit utilise la variante V2 via `/social` |
| Laboratoire de relique | `docs/relic-animation-workflow.md` et composants du laboratoire dans `social/faction/` | Workflow de validation dédié ; aucun nettoyage d’assets ou d’animations dans ce lot |
| Achats intégrés des packs | `mobile/src/features/purchases/` et `mobile/docs/cosmetic-pack-purchases.md` | Préparation RevenueCat conservée ; disponibilité toujours vérifiée côté serveur |

Les variantes originales d’images, sources de génération et dossiers de validation visuelle restent conservés. Une recherche d’imports statiques ne suffit pas à décider leur suppression : certains servent de sources aux scripts ou à une reprise future.

## Offre retirée

Le Founder Pack a été supprimé à la demande de l’utilisateur, et ne fait pas partie des fonctionnalités en attente. Les anciennes routes `/founder-pack` et `/founder-pack-preview`, ainsi que leurs redirections, ont été supprimées. Les anciens handlers d’achat mobiles et la bannière vide ont été retirés. Les migrations et contrats serveur historiques sont conservés ; le SDK d’achat partagé reste utilisé pour les packs actuels.

## Avant un prochain nettoyage

Vérifier les routes Expo Router, les variantes `.web` / natives, les imports dynamiques, les tests, les scripts d’assets et ce registre. Une fonctionnalité masquée n’est pas automatiquement du code mort. Ne pas retirer un identifiant de catalogue encore nécessaire pour afficher une possession existante.
