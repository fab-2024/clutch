# Contrat de confidentialité analytics et achats — Clutch v2

Ce document décrit la mesure produit introduite pour les activations partenaires. Il sert de référence avant chaque soumission App Store Connect ou Play Console. La déclaration finale doit rester alignée sur le binaire réellement soumis et sur tous ses SDK.

## Données mesurées

Clutch enregistre uniquement des interactions produit first-party, associées au compte interne pour dédupliquer les impressions et calculer la rétention :

- application active ;
- collection affichée et objet consulté ;
- objet obtenu, équipé ou retiré ;
- campagne rejointe, tâche terminée et récompense réclamée.
- Founder Pack affiché, achat démarré ou annulé et restauration demandée.

Le schéma interdit les identifiants publicitaires, identifiants d’appareil, adresses IP applicatives et métadonnées libres. Les événements bruts restent dans `private.analytics_evenements`, hors Data API et sans droit de lecture direct pour les rôles mobiles.

## Données d’achat

Le Founder Pack est traité par Apple ou Google et validé par RevenueCat.
RevenueCat reçoit l’UUID interne du compte comme App User ID ainsi que les
informations nécessaires au traitement de l’achat. Clutch ne conserve dans
Supabase qu’un registre normalisé et privé : identifiant de produit,
identifiants de transaction, store, environnement, date et statut. Le reçu
brut, le payload complet du webhook et les attributs client ne sont pas
stockés dans la base Clutch.

La collecte automatique des identifiants d’attribution RevenueCat est
désactivée dans le SDK et aucune intégration publicitaire n’est configurée. La
clé RevenueCat secrète reste exclusivement dans les secrets des fonctions
Supabase ; seules les clés SDK publiques sont intégrées au binaire.

## Usage et partage

- Finalité : analytics produit et mesure d’une activation.
- Les données ne servent ni à la publicité ciblée, ni au courtage, ni au suivi entre apps ou sites.
- Un partenaire ne reçoit que des indicateurs agrégés : audience éligible, impressions uniques, participation, complétion, récompenses réclamées, objets équipés et rétention J+7/J+30.
- L’export partenaire est masqué sous cinq utilisateurs éligibles.
- Les rapports n’exposent jamais d’UUID, d’email ou de pseudo.

## App Store Connect

Déclaration recommandée pour cette version :

| Champ | Valeur |
| --- | --- |
| Type de donnée | Usage Data → Product Interaction |
| Collectée | Oui |
| Liée à l’identité | Oui, via l’identifiant de compte interne |
| Finalité | Analytics |
| Tracking | Non |
| ATT | Non requis pour ce traitement, car aucun suivi inter-apps/sites |

Pour une version contenant le Founder Pack, ajouter également **Purchases →
Purchase History**, liée à l’identifiant de compte et utilisée pour App
Functionality. Vérifier la privacy manifest du SDK RevenueCat réellement
embarqué avant chaque soumission.

## Google Play Data safety

Déclaration recommandée pour cette version :

| Champ | Valeur |
| --- | --- |
| Catégorie | App activity → App interactions |
| Collectée | Oui |
| Partagée avec un tiers | Non pour les événements bruts ; rapports partenaires agrégés uniquement |
| Finalité | Analytics |
| Traitement | Chiffré en transit ; suppression avec le compte selon la politique Clutch |

Pour une version contenant le Founder Pack, déclarer aussi l’historique
d’achat comme donnée collectée pour le fonctionnement de l’app. RevenueCat
doit être traité conformément à son rôle contractuel de prestataire ; la
réponse exacte au champ « partagé » doit être validée contre le contrat et le
formulaire Play Console en vigueur.

## Contrôles avant publication

1. Refaire l’inventaire de tous les SDK présents dans le binaire.
2. Vérifier que la politique de confidentialité publique décrit cette mesure et la suppression du compte.
3. Comparer les formulaires App Store Connect et Play Console au contrat machine `clutch_contrat_analytics_v1()`.
4. Ne jamais ajouter un SDK publicitaire, une empreinte appareil ou un export individuel sans nouvelle revue produit, juridique et technique.
5. Tester la suppression du client RevenueCat dans le parcours de suppression
   de compte avant publication ; le `ON DELETE CASCADE` Supabase ne supprime
   pas à lui seul le client chez le prestataire.
