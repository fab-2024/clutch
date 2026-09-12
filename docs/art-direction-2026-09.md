# Direction artistique — septembre 2026

Statut : cadrage issu des onze références fournies le 12 septembre 2026 et de l’inspection du code. Les cinq formes sont intégrées au laboratoire `reactor-lab-preview`, avec quatre transitions successives. La relique de faction en service et les autres chantiers ne sont pas encore remplacés. Les suggestions présentes dans les captures de conversation sont des pistes de conception, pas des décisions de produit supplémentaires.

## Direction demandée

Remplacer la relique actuelle par une machine collective évolutive, remplacer la salle de collection actuelle par une vitrine et créer des packs d’identité cohérents avec les références.

Langage visuel : graphite mat, métal brossé, verre, ivoire, finitions champagne, éclairage localisé. Réserver le jaune citron aux actions importantes. Donner de la profondeur aux objets et laisser les textes et commandes nets et lisibles sur mobile. Conserver le nom GRIFF dans le produit ; les logos CLUTCH des références ne constituent pas une demande de changement de marque.

## 1. Réacteur collectif

Références : captures 09.06.57, 09.07.05 et proposition d’animation 09.07.16.

Cinq silhouettes : Module, Réacteur, Cœur d’arène, Citadelle, Nexus. Réservoir central en verre, liquide bleu, structure métallique qui s’enrichit. Compteur et invitation restent des composants natifs alimentés par les données réelles.

Produire des assets sans titres, chiffres, boutons ni logo incorporés. Préparer sur un même artboard : décor, structure arrière, réservoir, masque intérieur, panneaux gauche et droit, conduits, pièces avant et reflets. Les silhouettes doivent partager un axe et un réservoir central compatibles avec une transformation mécanique.

Storyboard proposé à partir des références :

- Au repos : scène immobile.
- Arrivée d’un supporter : impulsion locale et interpolation continue du niveau.
- Au toucher : noyau, conduits, puis bulles ; retour complet au repos.
- Évolution : remplissage, pression, déploiement des pièces, stabilisation, annonce de la nouvelle forme en 3 à 4 secondes.
- Réduction des animations : transition courte sans vibrations ni déplacement important.

Le bleu et les pièces mécaniques remplacent les prescriptions anciennes de violet, cœur organique et racines. Les exigences d’alignement, de remplissage continu, d’occlusion, d’absence de graduations et de validation visuelle restent pertinentes.

Intégration : `social/faction/relicArtwork.ts`, `constants.ts`, `components/CollectiveRelicRenderer.tsx`, `StaticRelicVial.tsx` et `InteractiveRelicVial.tsx`. Recalibrer les masques sur les nouveaux assets ; ne pas appliquer les anciens chemins au nouveau réservoir.

Compatibilité à résoudre : le code possède cinq récipients, un état dormant et un état terminal à 10 000 supporters. Il faut conserver les événements et récompenses déjà acquis. Proposition : associer les cinq nouvelles silhouettes aux cinq niveaux existants, et représenter l’état terminal par un Nexus accompli. Ne pas modifier les seuils ou récompenses depuis les seuls chiffres illustratifs des captures.

## 2. Vitrine de collection

Références : captures 09.05.41 et 09.06.36.

Remplacer la salle panoramique par un meuble frontal en verre : deux rangées de quatre emplacements, objets sur socles, éclairages et reflets contrôlés. Un emplacement vide reste interactif et ouvre le choix d’un objet possédé.

Distinguer deux personnalisations présentes dans les références :

- Le meuble : graphite et verre clair, ivoire, noyer et verre fumé.
- L’ambiance : Classique, Galerie, Midnight ; fond, socles, couleur et intensité de la lumière.

Le décor ne doit pas contenir les figurines ou les socles interchangeables de manière irréversible. Préparer séparément fond, châssis, étagères, portes/reflets, éclairages et socles. Les objets sont composés à partir de l’inventaire réel. Les figurines des maquettes sont des références de présentation, pas des possessions à attribuer aux joueurs.

Intégration : `profile/components/ShowcaseScreen.tsx`, `profile/components/showcase/`, `profile/showcase/roomEditor.ts`, `shop/showcaseRoomCatalog.ts`. L’éditeur possède déjà huit emplacements, mais leurs positions actuelles sont celles d’une salle panoramique. Prévoir une correspondance stable vers les huit nouvelles positions. Les socles interchangeables sont actuellement désactivés car incorporés aux images de salles : leur réactivation nécessite des assets séparés.

## 3. Carte joueur et packs d’identité

Références : captures 09.09.02, 09.09.09, 09.09.17, 09.09.26 et 09.09.51.

Construire une identité partagée par le profil, le classement et les aperçus de personnalisation : avatar, cadre, fond de carte et signature compacte. Pseudo, équipe, rang et statistiques restent dynamiques. Le style équipé doit se retrouver dans toutes ces présentations.

Catalogue visuel envisagé : style de départ GRIFF, Graphite, Ivoire, Grenat, Indigo et Racing. Distinguer ce qui est inclus, gagné par progression ou vendu directement. Les prix et nouveaux produits de boutique restent à définir ; les valeurs des anciens packs ne sont pas automatiquement celles des nouveaux.

La signature est une composition compacte de l’identité. Ne pas la confondre avec la famille existante `signature_relique`, qui désigne un effet de faction. Commencer par une signature dérivée du cadre et du fond équipés ; un emplacement acheté et équipé séparément demanderait une extension explicite du modèle.

Intégration : `shop/teamPackCatalog.ts`, `shop/originalPackCatalog.ts`, `shop/packs/`, `shop/types.ts`, `purchases/cosmeticPacks.ts`, composants de profil et classement. Préserver les identifiants et droits des anciens achats. Ajouter les nouveaux produits séparément ; retirer un produit de la mise en avant ne doit pas supprimer son acquisition.

Décision en attente : avatars illustrés (planche Graphite/Ivoire/Grenat/Indigo) ou réalistes (Racing). Les références présentent les deux directions.

## 4. Cartes collector

Référence : capture 09.06.08.

Prévoir un système distinct de la carte d’identité : illustration verticale, série, numéro, titre et rareté. La planche Karmine Corp illustre une série de dix cartes. Elle ne définit ni prix, ni distribution, ni probabilités, ni attribution à un compte. Préparer un aperçu de collection avant toute intégration au catalogue commercial.

## Ordre de réalisation proposé

1. Produire et vérifier le Module et le Réacteur avec leurs calques ; valider une transformation complète dans le laboratoire avant de décliner les trois autres silhouettes.
2. Produire la vitrine graphite vide ; intégrer huit objets indépendants et vérifier les interactions. Décliner ensuite meubles et ambiances.
3. Construire la carte joueur et la signature partagées ; décliner les packs et l’essai de styles.
4. Construire la collection de cartes et ses règles de catalogue lorsqu’elles sont définies.

Chaque lot doit fournir un rendu vérifié sur simulateur, une vérification des états vides et des données réelles, puis les contrôles d’architecture, TypeScript et les tests de comportement concernés. Le réacteur exige en plus une vérification visuelle du repos, de la réaction et de l’évolution avec réduction des animations.

Les captures sont des références de rendu, pas des images d’écran à placer telles quelles dans l’application. L’intégration cible reste l’application Expo/React Native exécutée dans Xcode ; cette direction artistique ne nécessite pas à elle seule une migration vers SwiftUI.

## Premier prototype réalisé

- Route réservée aux previews : `griff:///reactor-lab-preview`.
- Trois PNG avec alpha dans `mobile/assets/social/reactor/` : Module, tour latérale et base. Prompts exacts et calibration dans le README de ce dossier. Génération intégrée, sans CLI externe ; variantes opaques écartées.
- Réservoir conservé pendant le déploiement des tours et de la base. Remplissage en 800 ms, déploiement à partir de 1 250 ms, stabilisation jusqu’à 3 600 ms. Transition réduite en 300 ms.
- Niveau continu, surface et bulles découpées dans la cavité. Aucune boucle au repos. Réinitialiser interrompt les animations en démontant la scène précédente.
- Démonstration locale de 63/100 à 100/500 ; aucune mutation ou récompense de faction réelle n’est envoyée.
- Vérification iPhone 17 : rendu au repos, réaction, transformation et état final, puis transition réduite. Architecture, TypeScript et 18 tests ciblés passent.

Limites du premier lot : tours symétriques issues d’un même asset ; réaction initiale limitée au noyau lumineux et aux bulles. La propagation détaillée dans les conduits, la pression mécanique et le raccordement aux événements réels restent à réaliser. Ce prototype ne vaut pas livraison de la refonte complète.

## Deuxième lot — cinq formes

- Cœur d’arène : deux réservoirs auxiliaires ; Citadelle : piliers blindés ; Nexus : quatre réservoirs auxiliaires, armature et couronne supérieure.
- Deux nouveaux PNG avec alpha réel : `armor-pillar.png` et `nexus-crown.png`. Sources et prompts dans le README des assets.
- `ReactorVessel` partage la géométrie du verre et le remplissage entre tous les réservoirs. `ReactorStructure` compose les pièces de chaque forme. `ReactorScene` conserve le réservoir central pendant la transition.
- Les seuils sont lus depuis les constantes de faction existantes. L’état à 10 000 supporters reste un Nexus accompli, sans sixième silhouette.
- Le laboratoire enchaîne les quatre mutations. Réinitialiser revient au Module ; le paramètre de preview `supporters` permet aussi d’inspecter un niveau précis. Aucune modification de compte ou de faction réelle.
- Vérification iPhone 17 : trois nouvelles silhouettes à mi-remplissage et transitions Réacteur → Cœur d’arène → Citadelle → Nexus. Architecture, TypeScript et 22 tests ciblés passent.

## Troisième lot — chorégraphie mécanique

- Séquence de 3 900 ms, détaillée dans `docs/reactor-mechanical-storyboard.md` : remplissage, pression des bagues, déploiement des supports, arrivée séparée des panneaux/réservoirs/couronne, raccordement des tuyaux, stabilisation et annonce.
- Le réservoir central et les pièces communes restent montés pendant les quatre évolutions. Le changement de forme ne recharge plus leurs images. Un test de régression protège cette continuité.
- Les impulsions suivent les conduits ; les bulles montent dans le liquide. Les groupes SVG natifs reçoivent une matrice de transformation, et les connexions une valeur dérivée de l'horloge, pour que ces mouvements s'exécutent effectivement sur iOS.
- Son mécanique original de 3,9 s, reproductible depuis `mobile/scripts/generate-reactor-audio.py`. Ajout d'Expo Audio et installation du module natif. Aucun accès microphone ni lecture en arrière-plan.
- Réduction des animations en 300 ms ; reset, départ de l'écran et arrière-plan annulent son et évolution sans valider le palier interrompu.
- Validation iPhone 17 / iOS 26.5 : quatre transformations, continuité des images inspectée sur vidéo, reset immédiat pendant la charge, arrière-plan puis reprise, transition réduite. Architecture, TypeScript et 29 tests ciblés passent ; compilation Xcode réussie.

Périmètre restant : raccordement aux événements de faction réels, proposition de revoir une évolution survenue hors ligne, remplacement de la relique sur les écrans produit. La vitrine et les packs restent des lots distincts de la refonte. Le laboratoire continue à utiliser uniquement des données de démonstration.

## Révision des cinq silhouettes — 12 septembre

Le laboratoire utilise désormais cinq reconstructions propres à la planche : petit Module, Réacteur asymétrique, trois réservoirs ouverts, cage blindée et Nexus à cinq réservoirs. Les anciens éléments génériques ont été retirés. Les proportions, cavités, silhouettes et courbes des tuyaux sont définies par forme dans `reactor/artwork.ts` ; `ReactorMachine.tsx` compose les pièces au rendu et conserve le réservoir logique pendant l’assemblage.

Les PNG générés étant opaques, leur damier est retiré par les masques SVG d’exécution ; ce ne sont pas des sprites transparents utilisables seuls. Les limites et les prompts sont documentés dans le dossier des assets. L’animation demeure en 2,5D et l’aperçu conserve des données de démonstration.
