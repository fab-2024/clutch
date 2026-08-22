# Checklist d'écart — Blueprint GRIFF

Date de l'audit : 22 août 2026

Périmètre : application mobile, dépôt Git, base Supabase distante et fonctions
Edge actuellement déployées.

## Légende

- ✅ **Fait** : présent dans le produit et, lorsque nécessaire, appliqué sur
  l'environnement distant.
- 🟡 **Partiel** : socle présent, mais contrat, interface, déploiement ou recette
  encore incomplet.
- ⬜ **À faire** : absent du produit actuel.
- 🛑 **Conflit** : le fonctionnement actuel contredit le blueprint et demande une
  décision ou une migration explicite.
- 🔒 **Décidé** : écart au blueprint initial explicitement arbitré et désormais
  intégré au contrat produit.
- 🌐 **Externe** : vérification juridique, commerciale, store ou partenaire qui
  ne peut pas être validée par le dépôt seul.

## Verdict exécutif

GRIFF ne repart pas de zéro. La boucle Match → Call → Verdict, la progression
saisonnière, le Social, la Collection, les Volts, le Pack Fondateur et un
prototype partenaire existent déjà à des niveaux avancés.

Le blueprint est désormais traduit en contrat produit versionné. Deux écarts
ont été volontairement adoptés : Rank conserve le rating actuel et le Loadout
conserve son cinquième emplacement Core. Les écarts prioritaires restants sont :

1. le nom GRIFF reste au statut AMBRE après le pré-contrôle et le produit reste
   volontairement Clutch tant que la clearance n'est pas terminée ;
2. Rank n'existe pas comme cinquième onglet ;
3. l'instrumentation couvre surtout Collection, campagnes et achat, pas encore
   la boucle Match → Call → Résultat → Rank ;
4. plusieurs garanties de release existent dans le dépôt, mais ne sont pas
   encore déployées ou validées sur les environnements distants.

---

# 1. Positionnement et décisions produit

## Promesse

- ✅ Calls gratuits, sans dépôt, retrait ou récompense financière.
- ✅ Séparation fonctionnelle entre Frags, XP et Volts.
- ✅ Les achats cosmétiques n'affectent pas les résultats ni le classement.
- 🟡 Le vocabulaire produit privilégie déjà « call », « Frags » et
  « progression », mais quelques formulations visibles utilisent encore
  « mise », « portefeuille » ou « prédiction ».
- ⬜ La promesse `GRIFF. — LAISSE TA MARQUE.` n'est pas intégrée.

## Navigation définitive

- ✅ Hub présent.
- ✅ Matchs présent.
- ✅ Social présent.
- ⬜ Rank absent de la navigation et sans écran dédié.
- ✅ Moi présent.
- ✅ Room retirée de la navigation principale avec `href: null`.
- 🟡 La navigation visible possède donc quatre onglets au lieu des cinq du
  blueprint.

## Room et Vitrine

- ✅ Développement de Room gelé et règle documentée.
- ✅ Route Room masquée et placeholder conservé uniquement pour le
  développement.
- ✅ Les anciens objets ne sont pas supprimés : 25 entrées du catalogue distant
  restent classées dans `legacy-room`.
- ⬜ Remplacer visuellement Room par Rank.
- 🟡 Collection accessible depuis Moi via le Locker, mais encore comme route
  secondaire et non comme section clairement nommée « Collection ».
- ⬜ Inscrire formellement la Vitrine 2.5D conditionnelle dans la roadmap
  exécutable du dépôt.
- ✅ Aucune reprise de Room ne figure dans le périmètre V1 actuel.

## Migration Clutch → GRIFF

- 🌐 Recherche juridique française, européenne et internationale encore à
  terminer.
- 🟡 App Store, Google Play et domaines pré-contrôlés : `Griff` existe sur les
  deux stores, `GRUFFL` opère déjà dans le gaming/esport, et `griff.app`,
  `griff.gg` et `griff.fr` sont enregistrés.
- 🌐 Identifiants sociaux à vérifier manuellement.
- 🌐 Valider la prononciation et la perception en français et en anglais.
- ✅ Registre Go/No-Go créé avec un statut AMBRE dans
  [`griff-name-clearance.md`](./griff-name-clearance.md).
- ✅ Matrice de renommage préparée : nom visible, slug, scheme, bundle,
  package, domaine, variables, RPC, produits IAP, textes légaux et assets.
- ⬜ Renommer l'application après validation seulement.
- 🔒 Le dépôt conserve volontairement la marque Clutch dans 122 fichiers hors ancien
  prototype web ; `app.json` utilise `Clutch`, `clutch-mobile`, le scheme
  `clutch` et les identifiants `com.fabthetap.clutch` jusqu'au Go.

---

# 2. Boucle produit et écrans

## Boucle principale

- ✅ Match → Call → Verdict → variation de Frags fonctionne.
- ✅ Le verdict est consultable une fois en révélation puis dans l'historique.
- ✅ Le résultat montre score, source, choix, delta, rang et grade avant/après.
- ✅ Un prochain call est proposé après la révélation.
- 🟡 Récompense cosmétique et profil ne sont pas encore une conclusion
  systématique de chaque boucle.
- 🔒 La boucle peut retirer des Frags : ce rating bidirectionnel est désormais
  la doctrine Rank officielle.

## Hub

- ✅ Match du moment avec état ouvert, verrouillé ou live.
- ✅ Prochains matchs et raccourci vers Matchs.
- ✅ Progression de saison, Frags, grade, rang, précision et percentile.
- 🟡 Mission quotidienne de calls présente, mais ce n'est pas encore la mission
  collective de faction demandée.
- ⬜ Résultats récents prioritaires.
- ⬜ Raccourci vers la dernière récompense obtenue.
- 🟡 Le Hub reste relativement focalisé, mais il devra pointer vers Rank au lieu
  d'envoyer la progression vers Moi.

## Matchs

- ✅ Trois entrées fonctionnelles : À venir, Résultats et Mes calls.
- ✅ Calendrier, filtres de jeux, recherche et directs.
- ✅ Une fiche montre jeu, compétition, équipes, heure, BO et état du call.
- ✅ Mes calls sépare Ouverts, Verrouillés, Réussis et Manqués.
- ✅ Le verrouillage, les participants, la règle, la source et les Frags sont
  explicités.
- ✅ Listes progressives pour ne pas rendre tout l'historique immédiatement.
- 🟡 La catégorie Mes calls est un mode secondaire plutôt qu'un onglet de même
  niveau ; à valider en test utilisateur.

## Social

- ✅ Faction, relique et classement collectif.
- ✅ Cercle avec amis, demandes et classement hebdomadaire.
- ✅ Duels reliés au call classé existant.
- ✅ Missions entre amis et missions de campagne.
- ✅ Ligues privées accessibles dans le domaine Cercle.
- ✅ Aucun fil public, chat généraliste ou salons publics.
- ⬜ Signalement et blocage d'un utilisateur.
- ⬜ Outils et règles de modération opérationnels.
- 🟡 La « guerre des factions » visible repose encore sur les métriques de
  communauté existantes ; la vraie charge temporaire, son calendrier et sa
  remise à zéro restent à construire.

## Rank

- ⬜ Créer la route et l'onglet Rank.
- 🟡 Les données nécessaires à « Ma saison » existent déjà : Frags, placements,
  grade, rang, percentile, record et précision.
- 🟡 Les RPC de classement global, Cercle, ligue et faction existent, mais ne
  sont pas orchestrées dans un écran Rank unique.
- ⬜ Section « Ma saison ».
- ⬜ Section « Classements » avec amis, faction et global.
- ⬜ Section « Récompenses » avec récompense de saison.
- ⬜ Analytics `rank_viewed`.

## Moi

- ✅ Identité, pseudo, équipe favorite et profil public.
- ✅ XP, niveau permanent et titre.
- ✅ Frags, grade, rang, précision, série et historique récent.
- ✅ Jeux et équipe suivis modifiables dans les paramètres.
- ✅ Identité cosmétique équipée visible.
- ✅ Collection complète accessible par le Locker.
- ✅ Paramètres, visibilité, documents légaux, accès aux données et suppression
  de compte dans le code.
- 🟡 Le mot « Loadout » et ses cinq emplacements cibles ne sont pas présentés
  comme un bloc produit autonome.

---

# 3. Économie et rang

## XP

- ✅ XP séparée des Frags et des Volts.
- ✅ XP permanente, non achetable et traduite en niveau.
- 🟡 Le calcul est encore dérivé côté mobile à partir du récapitulatif et des
  badges ; le serveur n'est pas l'autorité canonique du solde.
- 🟡 Calls réglés, calls réussis, saisons, badges et quêtes contribuent déjà.
- ⬜ Crédit explicite pour onboarding commencé/terminé.
- ⬜ Crédit explicite pour consultation du résultat.
- ⬜ Matrice complète et idempotente pour toutes les activités sociales du
  blueprint.

## Frags

- ✅ Non achetables, non dépensables et non convertibles.
- ✅ Séparés par saison et tri direct du classement.
- ✅ Placements et meilleur résultat historique présents.
- 🔒 Pas de sélection hebdomadaire commune en V1 : chaque match éligible peut
  porter le marché classé `match_winner`.
- ⬜ Calls secondaires sans impact Frags mais avec statistiques/XP.
- 🔒 Le barème additif et le bonus Combo du blueprint ne font pas partie de la
  V1 classée.
- ✅ Le rating démarre à 1 000 Frags.
- ✅ Le système utilise une probabilité figée et un coefficient K ; il
  produit des deltas positifs ou négatifs.
- ✅ La probabilité et les impacts positifs ou négatifs sont montrés avant le
  verrouillage pour rendre le rating explicable.
- 🟡 Remplacer le mot « risque » par « perte possible » ou « impact si manqué »
  afin de conserver la transparence sans vocabulaire de pari.
- ✅ Promotions et rétrogradations sont conservées.

## Décision Frags et Rank actée

Le contrat retenu est celui du produit actuel :

| Sujet | Décision GRIFF V1 |
|---|---|
| Valeur initiale | 1 000 à chaque saison |
| Résultat raté | perte de Frags calculée |
| Calcul | probabilité figée + `K=60` en placement puis `K=40` |
| Progression V1 | montée et descente |
| Calls classés | marché vainqueur sur chaque match éligible |
| Paliers | Recrue, Challenger, Élite, Master, Clutch |
| Placement | grade et classement révélés après cinq verdicts |

Rank peut maintenant être conçu sur ce contrat sans migration de l'économie
compétitive.

## Volts

- ✅ Monnaie cosmétique séparée et sans conversion vers Frags.
- ✅ Journal serveur append-only, idempotent et sans solde négatif.
- ✅ Sources onboarding, mission, événement, mutation et activation partenaire.
- ✅ Dépense directe et transparente pour un objet connu.
- ✅ Aucune loot box.
- ✅ Journal des mouvements visible dans Moi.
- ⬜ Packs de Volts achetables dans les stores ; ils sont volontairement
  désactivés tant que le Pack Fondateur n'est pas validé.
- ⬜ Mesurer inflation, vitesse d'acquisition et frustration sur une cohorte
  réelle.

## Rang et saisons

- ✅ Placements après cinq verdicts.
- ✅ Seuils fixes centralisés côté serveur.
- ✅ Rang exact, percentile, meilleur grade et meilleur rang enregistrés.
- 🟡 Deux saisons existent dans Supabase, mais la fin de saison n'a pas de
  parcours mobile complet.
- 🔒 Les cinq grades et leurs seuils actuels sont conservés ; Diamant n'est pas
  ajouté en V1.
- ⬜ Révélation de placement propre à Rank.
- ⬜ Récompense cosmétique de fin de saison.
- ⬜ Écran de récapitulatif de fin de saison.
- ✅ Le grade peut monter ou descendre avec le rating.

---

# 4. Loadout et Collection

## Modèle et expérience

- ✅ Catalogue, inventaire permanent et équipement serveur.
- ✅ Propriété, verrouillage, rareté, saison, source, collection, équipe,
  campagne et licence présents dans le modèle.
- ✅ Aperçu avant achat et double confirmation de dépense.
- ✅ Filtres par famille, rareté, équipe et collection.
- ✅ Objets visibles sur profil, profil public, Social, Mes calls, verdict et Hub.
- ✅ Cinq emplacements actifs : cadre, titre, bannière, relique et apparence du
  Core.
- 🔒 `apparence_core` est conservé comme cinquième emplacement identitaire du
  Loadout V1.
- 🟡 La fiche de duel n'expose pas encore toute la signature équipée de façon
  cohérente avec les autres surfaces.

## Collection de lancement

- 🟡 Le catalogue distant contient 52 objets au total : 25 hérités de Room et
  27 objets répartis dans les familles actives ou les collections spéciales.
- 🟡 Familles actives distantes : 6 cadres, 5 bannières, 6 titres, 6 reliques et
  4 apparences du Core.
- ✅ Collection Fondateur de quatre objets présente.
- ✅ Collection partenaire fictive Nova Week de trois objets présente.
- ⬜ Sélectionner une offre de lancement éditoriale limitée à 3 cadres,
  3 bannières, 3 titres et 3 reliques.
- ⬜ Produire ou renommer l'ensemble Fondateur GRIFF.
- ⬜ Masquer les objets hors sélection de lancement sans supprimer les acquis ni
  les assets Room.

## Future Vitrine

- ✅ Assets historiques préservés.
- ⬜ Mesurer l'utilisation du Loadout.
- ⬜ Mesurer les visites des profils publics.
- ⬜ Atteindre 20 à 30 objets réellement désirables.
- ⬜ Obtenir idéalement un financement partenaire.
- ✅ Ne pas lancer la Vitrine avant ces preuves.

---

# 5. Monétisation et collaborations

## Pack Fondateur

- ✅ Produit non consommable prévu à 4,99 € localisé par le store.
- ✅ RevenueCat intégré côté mobile.
- ✅ Attribution, restauration, remboursement et transfert modélisés de façon
  idempotente côté serveur.
- ✅ Quatre objets Fondateur existent.
- ✅ Aucun avantage compétitif.
- 🟡 La migration Founder Pack est appliquée sur Supabase.
- ⬜ Les fonctions `clutch-founder-sync` et `clutch-founder-webhook` ne sont pas
  déployées sur le projet distant.
- ⬜ Produits et recette sandbox App Store/Google Play non validés.
- 🛑 Le pack actuel contient 0 Volt, tandis que le blueprint prévoit une
  allocation de Volts. Trancher avant de renommer le produit IAP.
- ⬜ Migrer les identifiants et textes Clutch vers GRIFF seulement après
  validation du nom et stratégie de compatibilité des achats.

## Vente de Volts et boutique

- ✅ Boutique cosmétique légère fonctionnelle avec achat direct d'objets.
- ✅ Prix connus, confirmation explicite, aucune mécanique aléatoire.
- ⬜ Packs de Volts IAP.
- ⬜ Tests de prix réels.
- ⬜ Mesure complète de conversion et restauration.

## Collections officielles

- ✅ Modèle de licence et rattachement partenaire/équipe prévus en base.
- ✅ Collection partenaire fictive implémentée.
- 🌐 Aucune licence réelle d'équipe, compétition, joueur ou marque n'est
  démontrée par le dépôt.
- ⬜ Modèle contractuel fixe + partage de revenus + bonus de campagne.

## Activations sponsorisées

- ✅ Prototype Nova Week avec page, trois tâches, suivi de matchs, mission de
  faction, récompenses et rapport agrégé.
- ✅ La récompense dépend de la participation, jamais de l'exactitude du call.
- ✅ Rapport sans données individuelles et masquage des petites cohortes.
- 🟡 Trois objets sont prévus au lieu des quatre du pack partenaire cible.
- ⬜ Mise en avant dans le Hub.
- ⬜ Notification de campagne validée sur appareil réel.
- ⬜ Mention sponsorisée et règlement de campagne validés juridiquement.

## Niveaux futurs

- ⬜ Abonnement ; correctement différé.
- ⬜ Affiliation de produits physiques ; correctement différée.
- ⬜ Offre professionnelle complète pour équipes.
- ⬜ Document commercial GRIFF.
- ⬜ Prospection et pilote réel.

---

# 6. Design et identité GRIFF

## Nom, logo et territoire

- ⬜ Validation finale du nom.
- ⬜ Logo G fragmenté avec entaille et mot-symbole `GRIFF.`.
- ⬜ Variantes noire/verte/blanche et icône store testée en petite taille.
- ⬜ Signature `LAISSE TA MARQUE.`.
- ⬜ Système visuel de fragments, traces, entailles et surfaces gravées.
- ⬜ Application du territoire aux rangs, reliques, transitions et collections.
- ✅ Aucun rebranding prématuré n'a été effectué avant validation externe.

## Interface existante

- ✅ Fond presque noir et vert acide déjà structurants.
- ✅ Grandes cartes événementielles et direction esport premium.
- ✅ Space Grotesk pour la lecture et Barlow Condensed pour les accroches et
  métriques.
- ✅ Tokens typographiques et minimums de taille améliorés sur les parcours
  principaux.
- 🟡 Le vert et les bordures restent très fréquents dans plusieurs écrans.
- 🟡 Contraste, taille dynamique, troncature et accessibilité doivent encore être
  validés sur cinq onglets réels, Rank inclus.
- ⬜ Motion language GRIFF fondé sur la trace, l'entaille et la progression.

---

# 7. Analytics avant bêta

## Socle déjà présent

- ✅ Registre first-party privé, sans identifiant publicitaire, appareil, IP
  applicative ou métadonnée libre.
- ✅ Événements Collection, équipement, campagnes et Founder Pack.
- ✅ Rapports partenaires agrégés et seuil minimum de confidentialité.
- 🟡 La migration de purge automatique à 13 mois existe dans le dépôt, mais
  n'est pas appliquée sur Supabase distant.
- 🟡 Le projet distant contient actuellement seulement quatre événements bruts :
  activité quotidienne, affichage de Collection et affichage Founder Pack.

## Événements du blueprint

- ⬜ Onboarding commencé.
- ⬜ Onboarding terminé.
- ⬜ Match consulté.
- ⬜ Call commencé ou option sélectionnée.
- ⬜ Call verrouillé.
- ⬜ Résultat consulté ou révélé.
- ⬜ Frags attribués.
- ⬜ Rank consulté.
- ✅ Objet obtenu, équipé et retiré via événements serveur.
- ⬜ Profil public consulté.
- 🟡 Mission/campagne rejointe et terminée couvertes pour le prototype partenaire,
  pas encore pour toutes les missions sociales.
- 🟡 Achat commencé couvert pour le Founder Pack.
- ✅ Achat Founder Pack attribué/révoqué couvert côté serveur.
- ⬜ Notification ouverte.

## Indicateurs

- 🟡 Rétention J7/J30 disponible pour les campagnes partenaires.
- ⬜ Rétention produit générale J1/J7/J30.
- ⬜ Calls par utilisateur actif.
- ⬜ Taux de retour au résultat.
- ⬜ Visites de Rank.
- ⬜ Utilisation du Loadout.
- ⬜ Visites des profils publics.
- ⬜ Activité des factions selon la nouvelle charge.
- 🟡 Conversion Founder Pack partiellement modélisée, mais sans données d'achat
  réelles.
- ✅ Taux de complétion de campagne disponible dans le rapport pilote.

## Consentement et gouvernance

- ⬜ Préférence de consentement analytique ou base légale documentée dans le
  parcours utilisateur.
- ⬜ Interface permettant de modifier ce choix.
- ✅ Contrat de données et déclarations stores documentés.
- 🟡 La purge 13 mois et la suppression coordonnée doivent être déployées puis
  testées avant la bêta publique.

---

# 8. Sécurité, droits et conformité

## Juridique et données

- 🟡 Politique de confidentialité présente dans l'app et sur le web, mais sans
  validation juridique ni identité légale réelle vérifiée.
- 🟡 Conditions d'utilisation présentes, mais sans validation juridique.
- 🟡 Suppression du compte implémentée dans le dépôt.
- ⬜ Fonction Edge de suppression non déployée sur Supabase distant.
- ⬜ Recette de suppression avec et sans achat RevenueCat.
- ⬜ Gestion explicite du consentement analytique.
- ⬜ Âge minimum défini dans l'onboarding et les conditions.
- ⬜ Règles de modération publiées.
- ⬜ Signalement et blocage dans Social ; aucune table distante dédiée n'existe.
- 🌐 Droits effectifs sur logos, photos et données de matchs à documenter.
- 🟡 Le catalogue stocke une licence et son titulaire, mais ce champ ne remplace
  pas une autorisation contractuelle.
- ⬜ Mentions sponsorisées normalisées.
- ⬜ Règles officielles par concours ou campagne.
- 🟡 Conformité IAP conçue, mais recette stores non réalisée.

## État Supabase distant

- ✅ Projet actif et sain.
- ✅ 65 migrations appliquées jusqu'au durcissement analytics du Founder Pack.
- ⬜ Migration `20260822134313_release_readiness_privacy.sql` non appliquée.
- 🟡 Une seule fonction Edge est active : `clutch-notifications`.
- ⬜ `clutch-account-delete`, `clutch-founder-sync` et
  `clutch-founder-webhook` absentes du distant.
- 🟡 Les advisors signalent une protection contre les mots de passe compromis à
  activer.
- 🟡 Les advisors signalent 11 RPC `SECURITY DEFINER` exécutables par `anon` et
  92 par `authenticated`. Plusieurs sont intentionnelles et contrôlent
  `auth.uid()` ou l'administration dans leur corps, mais une revue fonction par
  fonction est nécessaire avant release ; le nombre ne doit pas être ignoré ni
  traité aveuglément.
- 🟡 Dette performance signalée : clés étrangères non indexées, policies RLS non
  optimisées et policies permissives multiples.

Références Supabase :

- [Fonctions SECURITY DEFINER exposées](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Protection des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Clés étrangères non indexées](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

## Vocabulaire à nettoyer

- 🟡 Les nouveaux parcours utilisent majoritairement « call », « choisir »,
  « débloquer » et « progresser ».
- ⬜ Remplacer les formulations visibles « Sans mise », « pas ton portefeuille »
  et « gain/risque » par un vocabulaire purement score et progression.
- ⬜ Renommer les références historiques visibles « Validation Clutch » lors du
  rebranding.
- ✅ Les termes historiques en base peuvent rester temporairement pour la
  compatibilité s'ils ne sont pas exposés aux utilisateurs.

---

# 9. État de la roadmap GRIFF

## Phase 0 — Cadrage

- ✅ Positionnement adopté dans le contrat produit GRIFF V1.1.
- 🌐 Nom GRIFF au statut AMBRE, non validé définitivement.
- 🌐 Domaines et identifiants non réservés.
- 🟡 Navigation décidée sur le papier, Rank absent du produit.
- ✅ Room gelée et masquée.
- ✅ XP, Frags et Volts documentés ; le rating actuel est confirmé.
- ✅ Grades et règles saisonnières V1 confirmés avant construction de Rank.
- 🟡 Fonctionnalités non essentielles déjà largement gelées.
- ✅ Plan de migration Clutch → GRIFF documenté sans renommage prématuré.

## Phase 1 — Bêta du cœur produit

- 🟡 Onboarding fonctionnel, recette native finale à faire.
- ✅ Matchs et Match Center avancés.
- ✅ Création et verrouillage du call classé.
- ✅ Résultats et révélation avancés.
- ✅ Mes calls présent.
- ✅ Doctrine Frags confirmée.
- ⬜ Analytics de la boucle principale.
- ⬜ Bêta fermée formellement lancée et mesurée.

## Phase 2 — Progression

- ⬜ Écran Rank.
- ✅ Divisions actuelles conservées.
- 🟡 Classements existants mais dispersés.
- ⬜ Fin de saison mobile.
- ⬜ Récompenses saisonnières.
- ✅ Meilleur grade et meilleur rang déjà disponibles sur le profil.

## Phase 3 — Collection

- ✅ Catalogue.
- ✅ Propriété des objets.
- ✅ Cinq emplacements Loadout confirmés, Core inclus.
- ✅ Objets sur le profil public.
- ✅ Objets visibles dans plusieurs surfaces Matchs et Social.
- 🟡 Collection de lancement à réduire et éditorialiser.
- 🟡 Pack Fondateur à aligner et renommer.

## Phase 4 — Monétisation

- ✅ Volts gratuits et dépenses cosmétiques.
- 🟡 IAP Founder Pack implémenté mais non opérationnel de bout en bout.
- ✅ Boutique cosmétique légère.
- 🟡 Mesure du premier achat modélisée, sans cohorte réelle.
- ⬜ Tests de prix.
- ✅ Contrats techniques interdisant l'avantage compétitif.

## Phase 5 — Collaborations

- ✅ Collection partenaire fictive Nova Week.
- ✅ Prototype de campagne et reporting.
- ⬜ Document commercial GRIFF.
- ✅ Tableau de reporting interne/prototype.
- ⬜ Prospection d'équipes.
- ⬜ Activation pilote réelle.
- ⬜ Mesure réelle et offre reproductible.

## Phase 6 — Vitrine 2.5D

- ✅ Correctement différée.
- ⬜ Tous les critères de preuve restent à obtenir avant démarrage.

---

# 10. Ordre d'exécution recommandé

## Bloc A — Décisions irréversibles

1. 🟡 GRIFF pré-contrôlé et classé AMBRE ; recherche juridique et réservations
   externes encore requises.
2. ✅ Blueprint adopté comme contrat produit GRIFF V1.1.
3. ✅ Rating actuel confirmé comme modèle Frags.
4. ✅ Grades actuels et cinquième emplacement `apparence_core` confirmés.
5. ✅ Matrice de migration écrite sans renommer les identifiants techniques.

## Bloc B — Cœur de bêta

6. Instrumenter onboarding, match, call, résultat et Rank.
7. Construire Rank sur le contrat Frags validé.
8. Compléter Hub avec résultat récent, mission de faction réelle et dernière
   récompense.
9. Ajouter consentement analytique, âge minimum, blocage, signalement et règles
   de modération.
10. Appliquer la migration de confidentialité et déployer les fonctions Edge
    manquantes.
11. Fermer les alertes Supabase réellement actionnables.
12. Exécuter la recette native, achats, suppression, notifications et liens.

## Bloc C — Validation marché

13. Lancer la bêta fermée et mesurer J1/J7, calls, retour au verdict, Rank,
    Loadout et profils.
14. Réduire le catalogue à une collection de lancement désirable.
15. Tester le Pack Fondateur seulement après stabilité et mesure.
16. Utiliser le prototype Nova Week pour préparer un pilote partenaire réel.
17. Reconsidérer la Vitrine uniquement après preuve d'usage et financement.

## Prochaine tranche recommandée

Le travail interne du bloc A est terminé. La clearance du nom peut continuer en
parallèle sans bloquer le cœur produit. La prochaine tranche devrait produire :

1. **l'architecture fonctionnelle et visuelle de Rank sur le rating actuel** ;
2. **le plan d'analytics de la boucle cœur** ;
3. **la fermeture des critères externes de validation du nom GRIFF** ;
4. **l'instrumentation puis la construction de Rank**.

Le rebranding du code et des stores reste interdit jusqu'au Go, mais Rank ne
dépend plus de cette décision de marque.
