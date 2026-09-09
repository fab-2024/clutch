# Qualification AdMob et Tremendous — 9 septembre 2026

## État

**En pause à la demande de l'utilisateur.** Le programme est reporté à une future mise à jour. La piste à reprendre est celle de points cadeaux gagnés uniquement par un bon classement, décrite dans [la décision produit](rewarded-ads-gift-cards-proposal.md). Les messages ci-dessous sont des archives de travail et devront être réécrits selon le modèle finalement retenu avant tout envoi. La demande de connexion Google n'est plus nécessaire pour cette tâche.

Demande AdMob préparée, non envoyée. Le formulaire officiel a été ouvert dans le navigateur intégré ; il redirige vers la connexion Google. L'accès au compte éditeur est nécessaire pour connaître les options de contact disponibles. Aucun numéro de dossier ni accord reçu. Tremendous a été étudié sur documentation publique uniquement ; aucun compte créé, aucun paiement ni commande effectué.

## Demande prête à transmettre au support AdMob

Canal : [Contacter l'assistance AdMob](https://support.google.com/admob/gethelp). Utiliser le compte éditeur du projet. Le [guide officiel](https://support.google.com/admob/answer/9948073?hl=en) décrit le parcours et les options de contact proposées. Une réponse communautaire ne doit pas être consignée comme un accord de l'équipe Google.

Objet : Clarification avant intégration — vidéos récompensées, monnaie virtuelle et cartes cadeaux

Bonjour,

Nous développons Clutch, une application mobile de communauté gaming/esport, avec des fonctions de pronostics, de progression et de collection. Notre identifiant iOS est com.fabthetap.clutch. Le programme publicitaire et les échanges décrits ci-dessous sont à l'étude et ne sont pas activés. Nous souhaitons votre avis écrit avant intégration pour un lancement envisagé en France sur iOS et Android.

Notre idée initiale est la suivante :

- L'utilisateur choisit de regarder une vidéo récompensée AdMob. La récompense annoncée serait de 10 Volts, avec au maximum trois récompenses par jour et par compte.
- Les Volts servent aux objets virtuels de la collection. Nous envisageons de permettre aussi leur échange contre des cartes cadeaux de marques gaming ou de merchandising, fournies par Tremendous et financées par notre société.
- Les Volts issus des publicités contribueraient donc directement au seuil d'échange. Le seuil de 10 000 Volts est indicatif ; les marques et valeurs faciales ne sont pas encore fixées.

Nous avons lu https://support.google.com/admob/answer/7313578?hl=en et comprenons que les cartes cadeaux sont des récompenses monétaires directes interdites, et que les récompenses virtuelles doivent respecter les conditions d'usage et de non-transférabilité. Pouvez-vous confirmer que notre circuit initial est incompatible avec ces règles ?

Nous souhaitons également faire évaluer une variante, sans supposer qu'elle serait autorisée : la publicité donnerait uniquement des crédits de jeu non transférables et non directement échangeables ; ces crédits seraient engagés dans un pronostic ; un pronostic correct attribuerait une seconde monnaie, échangeable contre des cartes cadeaux. Un pronostic incorrect ferait perdre les crédits engagés. Il existerait donc bien un lien indirect entre publicité et récompense ayant une valeur réelle.

1. Cette variante reste-t-elle interdite du fait de ce lien indirect, ou peut-elle être acceptée ? Merci de préciser les dispositions applicables, y compris celles relatives aux jeux et pronostics.
2. Si elle peut être acceptée, quelles conditions exactes s'appliquent aux sources de crédits, aux éventuels achats intégrés, aux soldes déjà distribués, aux âges et aux territoires ? Ces paramètres ne sont pas encore fixés pour le programme de récompenses.
3. Une évaluation du compte ou de l'application est-elle nécessaire avant diffusion ? Quels éléments devons-nous fournir et existe-t-il une procédure d'examen préalable ?

Nous pouvons transmettre les écrans et le schéma des flux envisagés. Nous ne considérons pas la présence d'autres applications sur l'App Store comme une preuve d'autorisation AdMob. Merci de nous répondre séparément sur les deux parcours et, si nécessaire, de transmettre cette demande à l'équipe compétente pour les règles éditeurs.

Merci.

## Ce que Tremendous permet de préparer

| Sujet | Résultat de l'étude | Source |
| --- | --- | --- |
| Tests | Sandbox gratuite, distincte de la production ; utilisable pour tester des commandes sans financer des cartes réelles. | [Introduction](https://developers.tremendous.com/docs/introduction) |
| Livraison | Commande API avec valeur, devise, destinataire et produits autorisés ; livraison par e-mail possible et asynchrone. | [Créer une commande](https://developers.tremendous.com/reference/create-order) |
| Doubles commandes | `external_id` rend les nouvelles tentatives idempotentes ; conserver le même identifiant et les mêmes paramètres. | [Créer une commande](https://developers.tremendous.com/reference/create-order) |
| France | Récompenses en EUR possibles ; Amazon.fr figure dans l'exemple français. Vérifier pays, devise et dénominations de chaque produit. Aucune disponibilité PlayStation, Steam, VALORANT ou merch d'équipe en France n'est confirmée à ce stade. | [Devises](https://developers.tremendous.com/docs/handling-currencies), [Europe](https://help.tremendous.com/hc/en-us/articles/42223235213459-Reward-options-in-Europe-and-the-United-Kingdom) |
| Financement | Modèle standard API : compte préfinancé, alimentable notamment par virement SEPA. Clutch paie les cartes ; Tremendous ne fournit pas le revenu publicitaire. | [Financement](https://developers.tremendous.com/docs/paying-for-orders) |
| Frais | Tarification publique : pas d'abonnement ni frais de plateforme/API ; cartes facturées à leur valeur faciale. Le financement par carte bancaire peut ajouter 3 %. Vérifier les devises et les conditions du compte. | [Tarifs](https://www.tremendous.com/pricing/) |
| Accès réel | Validation du compte et documents d'entreprise nécessaires ; demande depuis Team settings → Developers. Les activités de gambling figurent parmi les exclusions : faire qualifier explicitement toute variante avec pronostics et gains réels. | [Accès production](https://developers.tremendous.com/docs/production-api-access) |

L'acceptation Tremendous ne vaut pas acceptation AdMob, et inversement. Le statut du projet auprès des deux fournisseurs reste à établir.

## Questions Tremendous préparées — non envoyées

Canal de qualification : help@tremendous.com, indiqué dans leur [aide API](https://help.tremendous.com/hc/en-us/articles/41472382853523-Requesting-API-access).

Objet : Éligibilité et catalogue France — programme de récompenses Clutch

Bonjour,

Nous étudions un programme de fidélité pour notre application gaming/esport Clutch : des utilisateurs pourraient échanger des points contre des cartes cadeaux numériques, financées par notre société et livrées en France par e-mail. Le modèle initial inclurait des points gagnés en regardant des vidéos publicitaires facultatives. Une variante étudiée ferait passer les crédits publicitaires par des pronostics, dont les résultats corrects donneraient des points échangeables ; aucun de ces parcours n'est activé ni accepté par une régie à ce stade.

Pouvez-vous qualifier séparément l'éligibilité de ces deux modèles, notamment au regard de vos exclusions relatives aux jeux d'argent ? Quels détails sur les règles de gain, les achats éventuels, les âges et les territoires exigez-vous ?

Pour les utilisateurs en France, quelles cartes gaming sont effectivement disponibles via API en EUR (PlayStation, Steam, Xbox, Nintendo, VALORANT notamment), avec quels montants minimums et restrictions ? Proposez-vous des cartes de boutiques de merchandising d'équipes esport ? Ces marques sont des souhaits, pas des partenariats annoncés.

Merci de préciser les documents nécessaires pour une entreprise française, les conditions de préfinancement SEPA, les frais applicables et les possibilités de test avant accès production.

## Suite technique après qualification du modèle

1. Arrêter le parcours exact à partir des réponses, sans transformer automatiquement les Volts existants en créance sur une carte cadeau.
2. Ouvrir une sandbox Tremendous et récupérer le catalogue FR/EUR ; choisir une marque et une valeur réellement disponibles. La clé reste côté serveur.
3. Tester réservation du solde, commande idempotente et réconciliation, puis suivi de livraison. Une commande acceptée n'est pas encore une carte reçue.
4. Intégrer les annonces en mode test et vérifier côté serveur les récompenses et le quota de trois par jour. Les identifiants de test ne déclenchent aucune récompense réelle.
5. Autoriser le lancement après validation du modèle, financement et vérification des parcours complets. L'aperçu actuel reste inactif jusque-là.

## Référence concurrente

Clutch: Predict the News de Rodger Studio est distincte de notre application. Sa [politique de confidentialité](https://clutch.vip/privacy) mentionne AdMob pour les crédits et Tremendous pour les cartes. Son [règlement](https://clutch.vip/rules) décrit l'étape pronostic → points. Ces documents décrivent son fonctionnement déclaré ; aucun accord Google ou Tremendous propre à cette application n'a été consulté.
