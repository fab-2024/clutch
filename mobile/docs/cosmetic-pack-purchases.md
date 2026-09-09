# Six packs cosmétiques — achat unique à 2,99 €

Le périmètre est limité aux six packs originaux ci-dessous. La collection
« Clutch Originals » n’est pas un septième produit payant. Le Founder Pack
est retiré des écrans de vente ; ses anciennes routes renvoient à la boutique.
Les droits historiques sont conservés.

| Pack | Identifiant Apple / Google | Entitlement RevenueCat |
| --- | --- | --- |
| Sang des Titans | `clutch_pack_sang_des_titans_v1` | `pack_sang_des_titans` |
| Chute Libre | `clutch_pack_chute_libre_v1` | `pack_chute_libre` |
| Serment du Givre | `clutch_pack_serment_du_givre_v1` | `pack_serment_du_givre` |
| Conclave Arcanique | `clutch_pack_conclave_arcanique_v1` | `pack_conclave_arcanique` |
| Turbo Arena | `clutch_pack_turbo_arena_v1` | `pack_turbo_arena` |
| Dernier Round | `clutch_pack_dernier_round_v1` | `pack_dernier_round` |

## Configuration nécessaire avant vente

État RevenueCat vérifié le 9 septembre 2026 : le projet **GRIFF**
(`4f6cf01a`) est disponible dans le compte connecté. Les six entitlements de la
table sont créés et vérifiés ; aucun produit store ne leur est encore associé.
Les noms publics utilisent GRIFF. Les identifiants techniques `clutch_pack_*`
et le bundle `com.fabthetap.clutch` restent ceux attendus par l’application.

Le compte Apple affiche « Votre compte Apple n’est pas activé pour App Store
Connect » ; le propriétaire confirme ne pas encore avoir d’adhésion Apple
Developer. La création de la configuration App Store dans RevenueCat exige une
clé d’achat `.p8`, donc elle n’a pas été enregistrée. Après activation Apple,
reprendre avec cette clé puis créer/importer les six produits. Aucun produit
Test Store n’a été substitué aux achats réels. Les métadonnées prêtes à saisir
figurent dans `cosmetic-pack-store-products.json`.

1. Dans App Store Connect, créer les six produits **non consommables**, renseigner
   les captures de revue et sélectionner un prix de **2,99 € en France**.
2. Dans Google Play Console, créer les six produits ponctuels équivalents.
3. Importer chaque produit dans RevenueCat et le relier uniquement à son
   entitlement de la table. Aucun abonnement ni monnaie virtuelle n’est inclus.
4. Utiliser l’UUID Supabase comme App User ID. Configurer le transfert explicite
   lors de la restauration et les notifications serveur Apple/Google.
5. Configurer les clés SDK publiques du build : `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   et `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
6. Configurer les secrets Supabase `REVENUECAT_SECRET_API_KEY` et
   `REVENUECAT_WEBHOOK_AUTH`. Aucune clé secrète ne doit être ajoutée au mobile.
7. Après approbation de la migration, appliquer
   `20260909142426_cosmetic_packs_store_purchases.sql`, exécuter le contrat SQL,
   puis déployer `clutch-pack-sync` et `clutch-pack-webhook`. Les deux fonctions
   authentifient elles-mêmes leur appelant (JWT utilisateur / secret webhook).
8. Relier RevenueCat au webhook
   `https://ipmswubihditoulfgivw.supabase.co/functions/v1/clutch-pack-webhook` avec
   le header Authorization correspondant au secret. Ne pas créer le Founder Pack.

Le prix affiché sur le bouton actif vient du store. Sans produit disponible ou sans migration serveur prête,
la fiche affiche le prix cible et « Bientôt disponible » ; aucun paiement factice.
Le web sert à consulter les packs. Les achats réels nécessitent une build native.

## Comportement serveur

Clutch ne propose aucun bouton ni processus de remboursement volontaire.
Les fonctions n’effectuent aucun remboursement : elles réagissent uniquement
à l’état d’achat confirmé par le store. Apple et Google peuvent accorder un
remboursement selon leurs conditions ; l’application ne peut pas l’interdire.
« Restaurer mes achats » redonne accès aux achats existants et ne rembourse rien.

- Attribution uniquement après lecture de RevenueCat par la fonction serveur.
- Une transaction ne peut pas accorder deux comptes en même temps.
- Aucun débit de Volts pour les six produits. L’ancienne RPC en Volts refuse ces packs.
- Remboursement : retrait des droits et des objets créés par cet achat, ainsi que
  de leur équipement. Les objets détenus auparavant et les achats historiques
  en Volts sont conservés. Les objets sont réattribués lors d’une restauration valide.
- Les notifications périmées sont ignorées. Un transfert traite d’abord l’ancien
  compte, puis le nouveau. Les alias seuls ne dupliquent pas les droits.

Migration appliquée et fonctions `clutch-pack-sync` / `clutch-pack-webhook` déployées
le 9 septembre 2026 après approbation explicite. Le contrat SQL a été exécuté
sur Supabase avec rollback : attribution, répétitions, remboursement, transfert
et conservation des achats en Volts validés. Aucun achat réel n’a encore été testé ;
les six produits restent à créer dans les stores et à relier à RevenueCat.
La sonde non authentifiée de synchronisation retourne 401. Le webhook retourne
503 tant que `REVENUECAT_WEBHOOK_AUTH` n’est pas configuré. Le bouton d’achat
vérifie aussi la présence des secrets serveur avant d’autoriser un paiement.

## Validation

- Tests mobiles : annulation, paiement en attente, attente de confirmation serveur,
  affichage du prix à zéro Volt, parcours d’équipement et anciens packs.
- `node --experimental-strip-types --test scripts/test-cosmetic-pack-proofs.ts`
  vérifie les preuves, les remboursements et les identités RevenueCat.
- `supabase/tests/cosmetic_packs_store.sql` : contrat transactionnel avec rollback,
  exécuté avec succès après déploiement. Il couvre l’attribution, les répétitions,
  le refus d’un achat en Volts, les collisions de compte, la révocation,
  le transfert, les droits historiques et les privilèges.
- Recette native à réaliser une fois les produits créés : achat sandbox, annulation,
  paiement différé, réinstallation/restauration, remboursement, changement de compte
  et interruption réseau après paiement. Aucun vrai paiement n’a encore été testé.

Références : [Apple — achats non consommables](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/)
et [RevenueCat — achats ponctuels](https://www.revenuecat.com/docs/platform-resources/non-subscriptions).
