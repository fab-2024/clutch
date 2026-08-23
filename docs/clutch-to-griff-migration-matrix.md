# Matrice de migration Clutch vers GRIFF

Statut : bascule visible implémentée dans la branche, publication externe en attente

Date : 23 août 2026

## Principe

Le rebranding sera **visible d'abord, technique ensuite et uniquement si
nécessaire**. Les identifiants qui portent des données, des achats ou une
compatibilité externe ne doivent pas être renommés pour des raisons purement
cosmétiques.

## Phases

1. **Avant Go** : état historique terminé.
2. **Préparation privée** : assets, textes et configuration intégrés dans la
   branche de migration.
3. **Bascule visible** : nom, logo, signature, textes légaux et pages publiques
   configurés en GRIFF ; publication store encore externe.
4. **Compatibilité** : anciens liens, produits, événements et RPC restent
   fonctionnels.
5. **Nettoyage différé** : seulement ce qui est sans données, sans client et
   sans intégration externe.

## Matrice

| Surface | État Clutch | Cible GRIFF | Décision de migration |
| --- | --- | --- | --- |
| Nom visible Expo | `Clutch` | `GRIFF.` | Changer à la bascule visible. |
| Nom store | Clutch ou non réservé | `GRIFF — Esport, calls, scores` | Réserver après clearance ; respecter la limite de 30 caractères. |
| Logo et icône | Assets Clutch | symbole G fragmenté + mot-symbole `GRIFF.` | Remplacer en une version ; conserver les sources historiques. |
| Signature | Promesse Clutch | `LAISSE TA MARQUE.` | Ajouter aux surfaces de marque, pas aux écrans fonctionnels répétitifs. |
| Slug Expo | `clutch-mobile` | à décider | Conserver jusqu'à vérification de l'impact EAS ; aucune valeur utilisateur à renommer d'urgence. |
| Scheme mobile | `clutch` | `griff` | Ajouter `griff` et maintenir `clutch` comme alias pendant au moins une version. |
| Bundle iOS | `com.fabthetap.clutch` | identique par défaut | Conserver pour maintenir l'identité de l'application et ses achats. |
| Package Android | `com.fabthetap.clutch` | identique par défaut | Conserver pour maintenir la fiche et les mises à jour. |
| Routes Expo | chemins actuels | chemins actuels | Aucun renommage de route sans bénéfice utilisateur. |
| Liens HTTPS | domaine actuel à finaliser | domaine GRIFF retenu | Ajouter le nouveau domaine puis conserver les redirections anciennes. |
| Supabase RPC | fonctions `clutch_*` | API compatible | Conserver les noms V1 ; créer des alias `griff_*` uniquement si une API publique l'exige. |
| Fonctions Edge | `clutch-*` | noms internes compatibles | Conserver tant que les clients les appellent ; ne pas dupliquer sans plan de retrait. |
| Tables et clés | termes historiques Clutch | données inchangées | Ne jamais renommer les clés primaires, historiques ou idempotentes pour le branding. |
| Catalogue | licences et libellés Clutch | libellés GRIFF | Migrer les valeurs visibles et les métadonnées de titulaire par migration SQL auditée. |
| Analytics | événements historiques | continuité des séries | Conserver les clés ; ajouter une dimension `brand_version` si nécessaire. |
| IAP | `clutch_founder_pack_v1` | affichage Pack Fondateur GRIFF | Conserver l'identifiant produit ; changer seulement le nom et les assets visibles. |
| RevenueCat | entitlement `founder_pack`, offering `founder_launch` | identiques | Conserver pour éviter de casser les droits et restaurations. |
| Notifications | fonctions et catégories actuelles | textes GRIFF | Changer les contenus, conserver les identifiants techniques. |
| E-mails | textes Clutch | textes et domaine GRIFF | Basculer après validation SPF, DKIM, DMARC et liens légaux. |
| Documents légaux | Clutch | GRIFF + entité légale | Mettre à jour avant publication du rebranding. |
| Support | coordonnées temporaires | domaine et e-mail GRIFF | Créer avant soumission store. |
| Assets 3D/Room | conservés hors navigation | archives réutilisables | Ne pas renommer en masse ; indexer par collection et provenance. |

## Compatibilités obligatoires

- une mise à jour d'application doit retrouver le même compte Supabase ;
- les achats Founder existants doivent rester restaurables ;
- les appels profonds `clutch://` déjà distribués doivent rester valides ;
- les événements analytics antérieurs doivent rester comparables ;
- les objets possédés, équipements, Volts, XP, Frags et historiques ne changent
  pas d'identifiant ;
- les anciennes notifications encore en file doivent rester ouvrables ;
- chaque renommage de base doit être une migration additive avec RLS, grants et
  privilèges RPC explicites.

## Recette de bascule

- [ ] Go juridique et commercial signé.
- [ ] Domaine, e-mail support et identifiants sociaux réservés.
- [ ] Nom App Store Connect réservé.
- [ ] Nom Google Play vérifié.
- [x] Logo, icône, splash et assets embarqués validés dans la branche.
- [x] Inventaire des chaînes visibles des surfaces actives terminé.
- [x] Textes légaux et consentements mis à jour.
- [ ] Liens universels et app links validés sur les deux marques.
- [ ] Achat et restauration Founder testés avant et après mise à jour.
- [ ] Connexion, mot de passe oublié et suppression de compte testés.
- [ ] Notifications anciennes et nouvelles testées.
- [ ] Analytics comparés avant et après bascule.
- [ ] Plan de retour à l'ancien habillage disponible sans rollback de données.

## Ce qui ne doit pas être fait

- changer le bundle ID ou le package uniquement pour afficher GRIFF ;
- supprimer les identifiants `clutch_*` encore appelés par une build publiée ;
- recréer les comptes, objets ou achats sous de nouveaux identifiants ;
- renommer les migrations historiques ;
- publier le logo avant la clearance du nom ;
- mélanger le rebranding avec une refonte fonctionnelle de Rank.
