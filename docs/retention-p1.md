# P1 — séries de jours de calls et protecteurs

Ce lot complète le [bonus quotidien P0](daily-volt-bonus-v1.md) sans changer les
Frags, le scoring ou les critères des anneaux de calls gagnants. Il ajoute la
série de jours actifs, ses jalons, les protecteurs et deux catégories de rappel.
La Room, le parrainage, les likes et le sélecteur de langue restent hors périmètre.

## Règles produit

- Une journée est validée par au moins un nouveau call classé accepté par le
  serveur avant le début d’un match éligible : statut à venir, scoring disponible
  et saison ouverte. Gagner le call n’est pas nécessaire.
- Plusieurs calls le même jour n’ajoutent qu’un jour à la série. Un même match
  ne peut pas fournir un nouveau jour en supprimant puis recréant le call.
- Le calendrier civil et le fuseau IANA sont ceux du bonus quotidien, ancrés à
  la première initialisation serveur. Ni l’horloge du téléphone ni un changement
  du fuseau des notifications ne déplacent ce calendrier. Les journées de 23 ou
  25 heures sont prises en charge.
- Aucun historique antérieur au lot n’est converti en série. Une annulation ou
  une suppression technique ultérieure du match n’enlève pas le jour acquis.
- Les périodes réellement ouvertes aux calls sont conservées côté serveur.
  Une journée sans aucune occasion de call non déjà joué est neutre : elle ne
  casse pas la série et ne consomme rien. Les reports, suspensions de saison et
  annulations ferment les fenêtres correspondantes.
- Un jour protégé ou neutre conserve le compteur, sans l’incrémenter. Aucun call,
  résultat, jour valide ou Frag fictif n’est créé.
- Jalons acquis à 3, 7, 14, 30, 50 et 100 jours validés dans une série. Ils restent
  acquis après sa fin. Un seul jalon peut être sélectionné ; il peut être retiré.
  Une nouvelle acquisition affiche un message bref avec partage facultatif.

### Protecteur de série

| Règle | Valeur P1 |
| --- | --- |
| Prix | 90 Volts |
| Découverte | 1 offert, une seule fois par compte |
| Stock maximal | 2 |
| Utilisation | Automatique à la clôture d’un jour manqué avec une occasion de call |
| Limite | Une protection par série ; pas deux jours manqués consécutifs protégés |
| Achat après minuit | Ne restaure pas rétroactivement la veille |

Le stock est distinct des cosmétiques. Le jour précédent est clôturé **avant**
l’achat : seul le stock disponible avant l’achat peut le protéger. Le protecteur
n’est pas consommé tant qu’aucune série n’a commencé. Une nouvelle série peut
utiliser un protecteur restant.

90 Volts est une hypothèse initiale dans la fourchette de la roadmap, pas une
validation complète de l’économie. Le bonus reste fixé à +10. Aucun crédit
supplémentaire n’est attribué aux jalons et aucun prix de cosmétique n’est modifié.

## Parcours mobile

Le domaine est isolé dans `mobile/src/features/retention/`. Les routes Expo ne
font que réexporter les écrans ; seul `api.ts` accède à Supabase.

- Carte de série dans le Hub et le profil personnel : compteur, record, état du
  jour, stock et éventuel jalon sélectionné.
- `/streak` : historique récent, règles, prochain call éligible, jalons,
  partage, achat et historique des protecteurs.
- Entrée « Protecteur de série » dans le magasin ; confirmation avec prix et
  solde avant/après avant tout débit.
- Petit indicateur dans les commandes de la vitrine personnelle, sans changer
  ses objets, son décor ou les reliques. Ce lot n’expose pas les données privées
  de rétention aux visiteurs d’un profil public.
- Réglages : rappels « série en danger » et « série protégée », plus une plage
  silencieuse facultative, réglable par pas de 30 minutes.
- `/streak-preview`, `/hub-preview` et `/settings-preview` réutilisent les
  composants avec des fixtures locales et le garde d’aperçu existant. Aucun achat
  ou push réel n’est produit par les interactions de prévisualisation.

Le fournisseur de série recharge au premier plan, à la reconnexion, après un
call/bonus et au minuit communiqué par le serveur. Il déduplique les lectures,
ignore les réponses d’un ancien compte et refuse qu’un ancien état serveur
écrase un état plus récent. Il ne crédite ou n’incrémente jamais localement la
série. Pas de requêtes périodiques en arrière-plan.

Avant un achat, son UUID est sauvegardé dans un stockage local versionné et
séparé par compte. Une réponse perdue, un timeout, une fermeture d’écran ou un
changement de compte conserve cette opération pour un rejeu sans second débit.
Elle n’est effacée qu’après confirmation serveur ou refus métier définitif.
Une erreur de stockage empêche l’achat, avec possibilité de réessayer.

## Contrats et sécurité serveur

Migration : `supabase/migrations/20260903091306_call_streak_retention_p1.sql`,
après `20260903080117_daily_volt_bonus_v1.sql`.

| RPC publique | Entrée client |
| --- | --- |
| `clutch_ma_serie_calls_v1` | Fuseau proposé à la première initialisation |
| `clutch_acheter_protecteur_serie_v1` | UUID de l’opération |
| `clutch_selectionner_jalon_serie_v1` | Palier acquis ou `null` |
| `clutch_mes_preferences_notification_v2` | Aucune |
| `clutch_enregistrer_preferences_notification_v2` | Préférences et plage silencieuse |
| `clutch_ouvrir_notification_v2` | UUID d’une notification appartenant au compte |

L’identité provient d’Auth ; les comptes anonymes ne peuvent pas initialiser une
série ou acheter un protecteur. Le client ne choisit ni utilisateur, ni date,
ni prix, ni stock. Les routines privilégiées restent dans `private`, avec un
`search_path` vide. Les relais publics sont `SECURITY INVOKER` à corps SQL
`BEGIN ATOMIC`. Les droits RPC, RLS et Data API sont explicitement bornés, sans
donner `USAGE` sur tout le schéma privé ni de droit client sur les tables.

Les nouvelles tables privées conservent états, jours, preuves de calls, jalons,
fenêtres d’éligibilité et mouvements de protecteurs. Leurs données de compte
sont supprimées en cascade lors de la suppression Auth. Une preuve de jour ne
dépend pas de la conservation de la ligne source du match.

Le débit est écrit dans `public.volts_mouvements`, origine `achat_consommable`,
référence `protecteur-serie:<UUID>`, montant exact de −90. Achat, stock et audit
sont atomiques sous le verrou partagé `clutch-volts:<user_id>`, également utilisé
par le bonus et les autres opérations du portefeuille. La contrainte du registre
interdit le solde négatif et une fausse attribution positive de ce consommable.
Le rejeu d’un achat confirmé reste possible même si le stock est maintenant plein
ou si le solde ne permettrait plus un nouvel achat.

Le trigger de nouveau pronostic classé contrôle l’heure réelle après acquisition
du verrou. Il ne rétrodate pas un jour à partir d’un horodatage fourni par le
client. Une requête classée acceptée par l’ancien contrat à l’extrême limite de
son verrouillage ne valide pas un jour P1 si le match a déjà commencé au moment
du contrôle effectif ; ce lot ne réécrit pas le contrat de placement existant.

La réponse d’état inclut notamment `user_id`, `jour`, `fuseau`, `heure_serveur`,
`fin_journee`, compteurs, match éligible, stock, prix, solde, jalons et historique.
Le client vérifie le propriétaire, la version et les invariants avant affichage.

## Rappels et analytics

La tâche `clutch-retention-minute` s’exécute chaque minute. Elle traite au plus
500 séries actives par passage, par ancienneté de contrôle, avec un verrou
non bloquant par compte. Elle clôture les jours et programme au plus un rappel
de danger par jour, dans les trois dernières heures, uniquement s’il reste un
match éligible non joué et que la journée n’a pas été validée.

La notification de protection ne concerne que la veille, jamais un historique
rattrapé après plusieurs jours d’absence. Avant toute livraison ou nouvelle
tentative, la file existante revérifie consentement de catégorie, plage
silencieuse, propriétaire et validité du jeton, ainsi que la pertinence du rappel.
Un call arrivé depuis sa mise en file annule son intérêt. Les anciens rappels de
verrouillage/début de match ne sont pas rejoués après leur échéance pertinente.

La plage silencieuse est désactivée par défaut afin de préserver les réglages
existants ; ses heures initiales sont 22 h–8 h dans le fuseau des notifications.
Les anciennes RPC de préférences restent compatibles. Le mobile ne retombe sur
la v1 que si la v2 est absente, et indique alors que P1 n’est pas encore activé.

Le client déduplique l’ouverture à froid et le listener de notifications, rejette
les routes externes et vérifie la propriété de la notification lorsque son UUID
est disponible. L’acquittement est interrompu après trois secondes pour ne pas
bloquer la navigation hors ligne. Une réponse tardive d’un compte précédent ne déclenche pas de
navigation dans le compte suivant.

Le contrat analytics passe à 6 et le contrat économique à 3. Les cinq événements
suivants sont produits à partir d’une preuve serveur, uniquement si le compte a
accepté les analytics :

- `call_created` : nouveau call éligible pris en compte par P1 ;
- `call_streak_extended` : premier call validant la journée ;
- `streak_protector_used` : consommation effective du stock ;
- `notification_sent` : premier ticket accepté par Expo pour une notification,
  **pas** une preuve de réception sur l’appareil ;
- `notification_opened` : ouverture acquittée par son propriétaire, une fois.

L’endpoint générique client n’accepte pas ces noms. `notification_ouverte`
historique reste compatible ; ne pas l’additionner au nouvel événement. Les
indicateurs économiques proviennent du registre complet, pas de la seule
population consentante aux analytics.

## Vérification et mise en service

Commandes depuis la racine :

```sh
npm run mobile:architecture
npm run mobile:typecheck
npm run mobile:test
npm run db:verify
npm run db:advisors
```

`db:verify` ajoute `supabase/tests/call_streak_retention_p1.sql` et
`db:test:streak-concurrency`. Le second script lance de vraies sessions PostgreSQL
concurrentes et observe l’attente du verrou pour trois cas : rejeu du même achat,
deux achats distincts confrontés au stock maximal, puis bonus +10/achat −90 sur
un solde initial de 80. Les fixtures identifiées sont nettoyées en fin de test.

Les tests mobiles couvrent parsing, stockage idempotent, changements de compte,
rafraîchissement, achat/annulation/rejeu, stock et solde insuffisants, jalons,
préférences, ouverture des notifications et affichage du débit dans le registre.
La passe ciblée du 3 septembre 2026 valide 20 suites / 147 tests. Le contrôle
complémentaire des notifications valide ensuite 23 tests, dont un nouveau cas de
timeout. Les tests d’intégration Hub et magasin exercent les cartes réelles et
leurs destinations, sans client Supabase importé par leur contexte d’affichage.
Architecture mobile, TypeScript et lint des sources P1 sont validés. Le fichier
de setup Jest conserve ses cinq avertissements préexistants sur `require()`.
Les contrats SQL couvrent aussi les changements d’heure, jours neutres/protégés,
fenêtres de marché, absence de consentement, rappels périmés, propriété des
jetons et suppression de compte.

La suite mobile complète a également été exécutée. Après correction des erreurs
d’intégration P1 puis rejeu ciblé, les échecs hors périmètre identifiés concernent
les fixtures Fnatic archivées de `ShowcaseRoomScene` et `atelierState`, ainsi
que le test `RankScreen.virtualization`, qui importe le client Supabase sans
configuration de test via le bouton de profil. Ces fichiers ne sont pas corrigés
dans P1 et ne constituent pas une validation globale verte.

Pendant l’implémentation, les contrats P0/P1 ont été exécutés dans PostgreSQL
WASM (PGlite), avec les véritables routines économiques, marchés, analytics et
notifications, mais des fixtures Auth/catalogue isolées et un stub de
`cron.schedule`. Cela ne valide pas toutes les migrations Supabase, la concurrence
entre connexions, les extensions natives ou la livraison APNs/FCM.

L’aperçu série a été contrôlé à 390 et 320 pixels : confirmation d’achat,
stock plein, sélection d’un jalon et réglages silencieux. Le retour final vers
l’aperçu Hub après redémarrage du serveur a été interrompu par une erreur de
connexion du navigateur intégré ; il reste à revérifier visuellement.

**Aucune migration distante ni aucun push réel appliqué dans ce lot.** Docker
local étant arrêté, les tests PostgreSQL complets, le test de concurrence et les
advisors restent un verrou de mise en service, pas un résultat validé.

Avant activation :

1. Exécuter l’historique de migrations et les commandes ci-dessus sur une base
   locale complète, puis sur un environnement de test autorisé.
2. Vérifier la tâche cron, le worker de notifications existant et les secrets de
   livraison sur cet environnement, sans élargir les droits de la Data API.
3. Tester sur appareil : premier plan/arrière-plan/application arrêtée, minuit,
   mode hors ligne, double appui, réponse d’achat perdue et changement de compte.
4. Tester un rappel puis un call avant livraison, une plage silencieuse, une
   préférence désactivée et un jeton transféré à un autre compte.
5. Revoir les flux économiques bonus/consommation avec des hypothèses observées
   avant le lancement général ; la seule présence du protecteur ne démontre pas
   que l’inflation de Volts est compensée.
