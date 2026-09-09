# Publicités récompensées et cartes cadeaux — 9 septembre 2026

## Décision actuelle — report à une future mise à jour

Le système de cartes cadeaux est mis de côté à la demande de l'utilisateur. Aucune intégration ni démarche fournisseur ne doit être poursuivie pour ce programme avant sa reprise explicite.

Idée retenue pour étude ultérieure : une monnaie distincte, les **points cadeaux**, gagnée uniquement grâce à un bon classement, puis échangeable contre des cartes cadeaux. Un classement mensuel avec dotations annoncées est une proposition, pas une règle validée. La périodicité, les places récompensées, les montants, la valeur des points, le budget et les règles d'égalité restent à décider. Les pubs, achats et Volts ne devraient pas donner d'avantage dans le classement récompensé ; ce principe et le modèle complet seront à vérifier lors de la reprise.

Le circuit initial Volts → cartes cadeaux n'est plus la direction retenue pour cette future étude. L'aperçu inactif reste un prototype historique ; ses seuils et ses cartes ne constituent pas des engagements produit. Cette décision n'active pas non plus les publicités à +10 Volts.

Les sections suivantes conservent les recherches et propositions antérieures à titre de référence.

## Proposition initiale — historique

- Une publicité regardée intégralement donne 10 Volts, au maximum trois fois par jour et par compte.
- Conserver le circuit Volts → cartes cadeaux. Ne pas séparer une nouvelle monnaie publicitaire non échangeable.
- Collection comporte Vitrine, Magasin et Cartes cadeaux.
- 10 000 Volts est un seuil d'exemple, sans montant en euros ni marque encore confirmé.
- Le système de pubs reste facultatif. Aucun crédit après une simple ouverture, un clic, une publicité interrompue ou une demande sans publicité disponible.

## État livré

Un aperçu du troisième onglet est accessible depuis `/store-preview`. Le bouton publicité est désactivé et les cartes sont des catégories génériques. Aucun SDK publicitaire, crédit de portefeuille, échange ou annonce de partenariat n'est activé. L'onglet n'est pas proposé aux utilisateurs de production.

## Partenaire publicitaire

**Qualification AdMob + Tremendous — en pause.** L'utilisateur avait demandé d'étudier ce montage après examen de Clutch: Predict the News (Rodger Studio, application distincte de ce projet). Une demande de clarification non envoyée et l'étude du fournisseur sont disponibles dans [le dossier AdMob / Tremendous](admob-tremendous-qualification.md). Aucun accord fournisseur n'a été reçu. La variante passant par des pronostics et une seconde monnaie était une question de qualification, pas une décision d'implémentation.

**Piste de repli étudiée : Adscend Media**, sous réserve d'acceptation du compte, des territoires et du format exact. Sa documentation décrit un programme de points échangeables contre des cartes cadeaux. Elle précise que l'éditeur fournit lui-même les récompenses : [modèle et intégration](https://helpcenter.adscendmedia.com/hc/en-us/articles/4407782066836-Configuring-Adscend-Solutions-for-Websites).

La documentation iOS décrit un postback de vidéo terminée et une récompense fixe choisie par l'éditeur : [configuration vidéo](https://developer.adscendmedia.com/ios/setup-rewarded-video.php). Ce document public ne garantit pas que ce format soit encore proposé au compte Clutch avec un inventaire français. L'activation vidéo nécessite le gestionnaire de compte : [activation des offres](https://developer.adscendmedia.com/api/common/integration-issues.php).

**Autres pistes étudiées :** ayeT dispose d'un format vidéo et de quotas configurables, mais je n'ai pas trouvé d'autorisation publique aussi explicite liant ce format précis aux cartes cadeaux : [réglages](https://docs.ayetstudios.com/v/product-docs/dashboard-setup/adslots/currency-settings). Lootably expose une catégorie vidéo dans son API, sans preuve suffisante du parcours une publicité → une récompense fixe : [API](https://documentation.lootably.com/docs/offers-api-guide).

**AdMob : clarification demandée avant activation.** Les règles publiques interdisent les cartes cadeaux comme récompenses et imposent des restrictions sur les récompenses virtuelles, notamment leur conversion directe. Elles ne constituent pas une autorisation du parcours indirect déclaré par l'autre application. Le circuit initial Volts directement échangeables reste en conflit avec ces restrictions ; une étape de jeu ou une seconde monnaie ne prouve pas à elle seule l'acceptation d'un autre circuit : [politique](https://support.google.com/admob/answer/7313578?hl=en).

## Message de repli Adscend — non envoyé

> Bonjour,
>
> Nous développons Clutch, une application mobile de communauté gaming/esport. Nous recherchons un placement vidéo facultatif dans lequel une publicité intégralement regardée crédite 10 points internes appelés Volts, au maximum trois fois par jour et par utilisateur. Ces Volts pourront être échangés contre des cartes cadeaux gaming ou du merchandising d'équipes, fournis et financés par Clutch ou ses partenaires.
>
> Pouvez-vous confirmer par écrit que votre inventaire accepte ce modèle, y compris l'échange en cartes cadeaux, pour iOS et Android en France ? Nous souhaitons une vidéo seule, sans installation, achat ou sondage obligatoire.
>
> Quels sont le format actuellement disponible, les pays et âges autorisés, les seuils d'audience, les conditions de consentement, les rémunérations réellement constatées en France, les annulations et les délais de paiement ?
>
> Disposez-vous de postbacks authentifiables, d'un identifiant unique par vue terminée, d'un identifiant de session fourni par notre serveur et d'un environnement de test ? Peut-on arrêter la diffusion après trois vues par jour sans que l'utilisateur continue une session vidéo sur un site externe ?
>
> Merci de fournir les documents techniques actuels et les conditions contractuelles applicables à ce placement précis.

## Architecture à réaliser après qualification

Le serveur crée une session à usage unique liée au compte authentifié, à la régie, au placement et au jour de quota. Il réserve une des trois places avant d'autoriser la lecture. Plusieurs téléphones ou requêtes concurrentes ne doivent jamais ouvrir une quatrième place.

La confirmation authentifiée de la régie valide le placement, la session, l'utilisateur, le statut de fin et l'identifiant unique de transaction. Le montant de 10 est fixé côté serveur. Le crédit du journal, la consommation du quota et le statut de session sont atomiques et idempotents. Le client affiche « Validation en cours » jusqu'au crédit confirmé ; il ne peut pas créer ce crédit lui-même.

Il faut définir avec la régie les délais de confirmation et d'expiration pour qu'une réservation expirée puis confirmée tardivement n'entraîne ni quatrième récompense, ni perte d'une récompense promise. Le jour est fixé côté serveur (proposition : Europe/Paris pour un lancement France). Changer l'horloge ou le fuseau du téléphone ne réinitialise rien.

Pour les cartes, le serveur fournit le catalogue, le coût, la valeur faciale, la devise, le pays, les restrictions et le stock. Un échange réserve le stock et les Volts dans une transaction, appelle le fournisseur avec une clé d'idempotence, puis confirme la livraison ou restitue les fonds après un échec définitif. Un timeout ambigu entraîne une réconciliation, pas une seconde commande. Les codes doivent être chiffrés, consultables uniquement par leur bénéficiaire et absents des journaux et analytics.

RLS et privilèges explicites sur toutes les nouvelles tables et RPC. Seul le serveur de validation peut créditer une publicité. Les comptes de démonstration et les soldes développeur illimités ne doivent jamais générer de cartes réelles. La provenance des Volts et les remboursements d'achats doivent être pris en compte avant d'autoriser un échange.

## Économie à décider

- Fournisseur, marques autorisées, valeur faciale et coût réel des cartes.
- Sources de Volts échangeables, dont le stock déjà distribué, les achats et les bonus gratuits. Garder une monnaie unique ne dispense pas de tracer les provenances.
- Budget de récompenses financé et conditions de disponibilité annoncées avant acquisition.
- Un objectif de 10 000 Volts demande 1 000 vues, soit 334 jours à trois vues quotidiennes, sans autres gains ni dépenses.
- Une carte coûtant C euros attribuée pour 10 000 Volts représente C/1 000 euros de coût par publicité de 10 Volts. Comparer ce coût aux revenus nets constatés, aux frais, à la fraude et aux Volts gagnés autrement. Aucun revenu publicitaire n'est garanti par cet exemple.

Les conditions actuelles décrivent les Volts comme une monnaie interne sans conversion monétaire (`mobile/src/features/legal/documents.ts`). Le programme d'échange devra avoir des conditions adaptées avant lancement. Les règles de la boutique d'applications restent distinctes de l'accord de la régie : [Apple](https://developer.apple.com/app-store/review/guidelines/).

## Validation attendue pour le système réel

Une confirmation valide crédite exactement 10 ; un doublon ne recrédite pas ; une signature invalide ou une session appartenant à un autre compte échoue ; trois vues saturent le quota ; les requêtes concurrentes et callbacks tardifs préservent le plafond ; un abandon ne crédite rien. Un échange concurrent ne dépasse ni stock ni solde ; les retries ne créent pas deux cartes ; les échecs définitifs remboursent une seule fois ; aucun code ne fuit à un autre compte. Ces vérifications requièrent les contrats et callbacks réels, et ne sont pas simulées comme des validations de production dans l'aperçu.
