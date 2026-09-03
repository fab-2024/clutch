# Bonus quotidien — premier lot de la roadmap

Ce lot livre le bonus automatique de **10 Volts** et les premières fondations
communes : calendrier serveur, registre existant, analytics et traductions.
Les séries de calls, protecteurs, consommables, invitations, likes et sélecteur
de langue restent des lots suivants. La Clutch Room reste inchangée.

## Règles livrées

- Première activité au premier plan d’un compte authentifié : +10 Volts.
- Un seul crédit par jour civil, quel que soit le nombre d’appareils ou d’essais.
- Le fuseau IANA du premier appel valide est enregistré côté serveur. À défaut,
  UTC est utilisé. Il reste attaché au compte : voyage, réinstallation et
  modification des préférences de notifications ne le réinitialisent pas.
- Le jour commence à 00:00 et finit au minuit suivant dans ce fuseau. Les jours
  de changement d’heure durent donc 23 ou 25 heures, sans double récompense.
- Aucun rattrapage des jours absents, aucune augmentation du montant avec une
  série. Les comptes anonymes Supabase Auth ne sont pas éligibles.
- Les Volts n’affectent ni Frags, ni résultat de call, ni classement.

Le fuseau est volontairement ancré à la première attribution. Un futur changement
assisté par le support nécessitera une politique de transition anti-doublon ;
il ne faut pas ajouter une simple édition de cette colonne dans le profil.

## Contrat serveur

Migration : `20260903080117_daily_volt_bonus_v1.sql`.

`clutch_reclamer_bonus_quotidien_v1(p_fuseau text)` ne reçoit **ni user ID, ni date,
ni montant, ni clé d’idempotence**. L’identité vient de `auth.uid()`, vérifiée dans
Auth, et l’heure vient de `clock_timestamp()` après acquisition du verrou.

Réponse : `user_id`, `attribue`, `montant` (10 ou 0 au rejeu),
`montant_quotidien` (10), `solde`, `mouvement_id`, `attribue_le`, `jour`, `fuseau`,
`heure_serveur` et `prochain_bonus_le`.

Le crédit réutilise `public.volts_mouvements` avec l’origine/source
`bonus_quotidien`, la référence `YYYY-MM-DD` et la clé
`bonus_quotidien:YYYY-MM-DD`. Les index uniques existants et le verrou transactionnel
`clutch-volts:<user_id>` sont partagés avec les achats et crédits existants.
Le normaliseur conserve le solde après mouvement et interdit un solde négatif.
La primitive générique de crédit refuse cette nouvelle origine réservée.

La routine privilégiée reste dans `private`, avec `search_path` vide ; son
relais public est `SECURITY INVOKER`. Seul `authenticated` peut l’exécuter.
Le corps SQL `BEGIN ATOMIC` résout la routine privée à la création sans accorder
`USAGE` sur tout le schéma privé. La table de fuseaux a RLS activée et aucun droit
client. Le rôle de support conserve seulement le droit de lecture explicite.

Le journal et le solde sont déjà consultables via les RPC existantes. Le support
peut examiner le registre serveur par compte et par référence, sans créer une
seconde comptabilité. Les futurs motifs série/parrainage/consommable devront
réutiliser ce registre et le même verrou, avec leur propre preuve serveur et
contrainte d’idempotence ; ils ne sont pas encore des origines autorisées.

## Application et réseau

`DailyBonusBridge` démarre uniquement pour une session prête, non anonyme et au
premier plan. Il vérifie à nouveau le serveur au retour dans l’application et au
prochain minuit fourni par le serveur. L’horloge du téléphone n’attribue rien.

Une seule requête est en vol par session. Timeout à 15 secondes, puis tentatives
espacées de 1 s, 5 s, 15 s, 1 min, et au maximum toutes les 5 min. La reconnexion
web peut avancer la tentative. Aucun polling en arrière-plan. Les erreurs de
contrat ou d’autorisation ne provoquent pas de boucle de requêtes.

Une réponse perdue après validation laisse le crédit intact ; le nouvel essai
renvoie le même mouvement sans recréditer. Le compte est vérifié dans la réponse.
Les anciens callbacks sont ignorés à la déconnexion ou au changement de compte,
et les anciennes lectures du solde sont invalidées avant sa confirmation.

Le message existant affiche « Bonus quotidien : +10 Volts » pendant 4,5 secondes,
avec fermeture immédiate, animation courte et respect de la réduction des
animations. Pas de nouvel écran bloquant. Le portefeuille affiche source, date,
heure, +10 et solde après mouvement. Le nouvel aperçu est `/economy-preview`,
protégé par le mécanisme de prévisualisation existant et sans attribution réelle.

## Analytics et traductions

Le contrat analytics passe en version 5, sans renommer les événements existants.
Le crédit fonctionne même sans consentement analytics. Les événements facultatifs
réutilisent le consentement, la conservation et les restrictions existants.

| Événement de la roadmap | État de ce lot |
| --- | --- |
| `app_opened` | Envoyé au premier plan, sans identifiant d’appareil ni métadonnées libres |
| `daily_bonus_awarded` | Émis par le serveur, une fois par crédit, jamais accepté depuis le client |
| `call_created` | Lot séries : distinguer création validée serveur de l’actuel `call_verrouille` client |
| `call_streak_extended` | Lot séries de jours de calls |
| `streak_protector_used` | Lot consommables, après consommation serveur |
| `notification_sent` | Lot notifications, à partir d’un envoi confirmé |
| `notification_opened` | Lot notifications ; événement existant `notification_ouverte` conservé |
| `invite_link_created` | Lot invitations |
| `invite_activated` | Lot invitations, après activation vérifiée |
| `showcase_viewed` | Lot vitrine ; ne pas assimiler automatiquement une simple vue du profil |
| `showcase_liked` | Lot vitrine, après mutation validée |

`application_active` reste compatible avec les rapports actuels ; ne pas
l’additionner à `app_opened` pour compter les ouvertures. Les volumes de Volts
distribués viennent du registre économique, non du sous-ensemble ayant accepté
les analytics. Les KPI de rétention restent limités à cette population consentante.

`mobile/src/lib/i18n` centralise le français, l’interpolation, les pluriels,
les nombres, dates et fuseaux. Ce lot migre le nouveau parcours et le portefeuille,
pas toute l’application. Le français est le secours des langues non prises en
charge. Pas encore de sélecteur : chaque nouvelle langue devra couvrir toutes
les clés, puis étendre les formatteurs et la résolution de locale.

Attention : une **série de jours avec au moins un call** n’est pas une **série de
calls gagnants consécutifs**. Les anneaux existants conservent leurs critères.

## Validation et mise en service

Avant le déploiement du client, appliquer la migration et valider sur une base
de test complète. Sans la nouvelle RPC, le client ignore le bonus sans boucler
sur l’erreur « fonction absente » ; il réessaiera à la prochaine ouverture.

Commandes depuis la racine :

```sh
npm run mobile:architecture
npm run mobile:typecheck
npm run mobile:test
npm run db:verify
npm run db:advisors
```

`db:verify` inclut le contrat `supabase/tests/daily_volt_bonus_v1.sql` et un test
à deux connexions (`db:test:daily-bonus-concurrency`) qui observe réellement le
second appel en attente du verrou. Les fixtures sont supprimées ou annulées.

Pendant l’implémentation : 43 tests ciblés (9 suites), architecture mobile,
TypeScript et lint ciblé validés. Le portefeuille a aussi été contrôlé à
390 × 844 dans le navigateur intégré, sans attribution réelle.
Le SQL du registre/analytics a été validé dans PostgreSQL WASM (PGlite), avec
fixtures Auth/catalogue isolées.
Cela ne remplace pas le test de concurrence ni les migrations Supabase complètes :
le moteur Docker local était indisponible. Les advisors locaux échouent également
à se connecter à PostgreSQL sur le port 54322. Aucune migration distante appliquée.

Avant activation, revoir aussi l’impact économique ci-dessous et prévoir le lot
consommables rapidement, conformément à la roadmap.

## Impact économique, sans changement de prix

30 jours éligibles ajoutent 300 Volts (310 sur 31 jours). Les prix et budgets
existants ne sont pas révisés automatiquement. Le simulateur historique reste une
référence **hors bonus** ; il ne valide pas à lui seul cette nouvelle économie.

Avec les hypothèses de 8/20/30 jours actifs pour les profils
occasionnel/engagé/core, les revenus deviennent 530/1 100/1 900 Volts. Les ratios
revenu/budget cible deviennent environ 0,71/0,92/0,86 : les deux derniers dépassent
le garde-fou historique de 0,80. Le scénario additionnel est signalé par
`npm run economy:simulate` et demande une revue produit avant lancement général,
pas une augmentation silencieuse des prix ou des budgets.
