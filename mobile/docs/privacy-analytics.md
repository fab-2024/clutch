# Contrat de confidentialité analytics — Clutch v1

Ce document décrit la mesure produit introduite pour les activations partenaires. Il sert de référence avant chaque soumission App Store Connect ou Play Console. La déclaration finale doit rester alignée sur le binaire réellement soumis et sur tous ses SDK.

## Données mesurées

Clutch enregistre uniquement des interactions produit first-party, associées au compte interne pour dédupliquer les impressions et calculer la rétention :

- application active ;
- collection affichée et objet consulté ;
- objet obtenu, équipé ou retiré ;
- campagne rejointe, tâche terminée et récompense réclamée.

Le schéma interdit les identifiants publicitaires, identifiants d’appareil, adresses IP applicatives et métadonnées libres. Les événements bruts restent dans `private.analytics_evenements`, hors Data API et sans droit de lecture direct pour les rôles mobiles.

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

## Google Play Data safety

Déclaration recommandée pour cette version :

| Champ | Valeur |
| --- | --- |
| Catégorie | App activity → App interactions |
| Collectée | Oui |
| Partagée avec un tiers | Non pour les événements bruts ; rapports partenaires agrégés uniquement |
| Finalité | Analytics |
| Traitement | Chiffré en transit ; suppression avec le compte selon la politique Clutch |

## Contrôles avant publication

1. Refaire l’inventaire de tous les SDK présents dans le binaire.
2. Vérifier que la politique de confidentialité publique décrit cette mesure et la suppression du compte.
3. Comparer les formulaires App Store Connect et Play Console au contrat machine `clutch_contrat_analytics_v1()`.
4. Ne jamais ajouter un SDK publicitaire, une empreinte appareil ou un export individuel sans nouvelle revue produit, juridique et technique.
