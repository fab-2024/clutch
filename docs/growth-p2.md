# P2 — Croissance et statut social

P2 prolonge P0 et P1 sans modifier les Frags, les classements ni la Room.

## Parcours

- Profil / Cercle → Inviter un ami → lien personnel `/i/:code` → connexion ou
  inscription et onboarding → acceptation explicite → premier call classé
  éligible → récompense. Le message de partage est personnalisable, sans
  sauvegarde de son contenu sur le serveur.
- Profil social → vitrine en lecture seule → visite unique et like réversible.
  Les classements et amis conservent leurs liens vers le profil social ;
  celui-ci ouvre maintenant `/v/:pseudo`. Toucher un participant d’un duel ouvre
  sa vitrine. Une invitation publique ouvre aussi celle du parrain, sous réserve
  de ses réglages de visibilité.
- Série → jalon obtenu → partage natif d’un lien vérifié avec aperçu social.
  Les paliers partageables sont 3, 7, 14, 30, 50 et 100 jours ; aucune date ni
  performance fournie par le client ne vaut preuve.

## Règles MVP

- Parrain : 30 Volts par nouveau compte activé ; plafonds de 5 par jour et 20
  par mois dans le calendrier serveur P0. Aucun crédit à l’installation.
- Filleul : le protecteur de bienvenue P1, une seule fois, jamais un second crédit.
- Un compte ne peut être rattaché qu’à un parrain, avant son premier call et
  pendant les sept premiers jours. Le parrain doit être un compte plus ancien.
- Activation observée depuis les preuves P1, jamais depuis un événement client.
  Le traitement idempotent des crédits utilise la file serveur et le registre
  des Volts ; il ne bloque pas la validation du call avec un verrou intercompte.
- Un identifiant aléatoire d’installation, haché côté serveur, aide à retenir les
  cas suspects. Ce signal n’est pas une attestation matérielle ni une empreinte
  publicitaire. Les cas suspects n’obtiennent pas de récompense automatiquement.
- Vues : visiteurs authentifiés uniques par vitrine et jour UTC, propriétaire
  exclu. Compteurs de vues privés ; pas de liste de visiteurs. Détails purgés
  après 90 jours, total agrégé conservé.
- Likes : un par compte et vitrine, retrait possible, total visible uniquement
  aux personnes autorisées à voir la vitrine. Aucun effet sur les classements.
- Vitrine : publique, Cercle ou privée. Un profil privé et les blocages priment
  toujours sur ce réglage. Les éléments de progression exposés sont configurables.
- Notifications sociales regroupées, avec préférence dédiée et plage silencieuse.
  Les blocages, la visibilité, les likes encore actifs et le propriétaire du
  jeton push sont revérifiés au moment de réclamer une livraison.
- Analytics serveur avec consentement ; pas de pseudonymes, liens ou appareils
  dans les événements analytics.
- Comptes anonymes, non confirmés, bannis ou supprimés exclus des mutations de
  croissance. Les suppressions logiques Auth rendent également les contenus
  publics indisponibles. Les crédits au-delà du plafond restent « plafonnés » :
  ils ne sont pas reportés au jour ou au mois suivant.

## Liens et installation

Les domaines associés et App Links utilisent la configuration HTTPS existante.
Le code reste stocké pendant l’authentification et l’onboarding, jusqu’au retour
confirmé sur l’écran d’invitation (durée maximale : sept jours). L’acceptation
reste une action explicite. Une installation neuve ne partage pas le stockage du
navigateur : rouvrir le lien après installation ou saisir son code reste possible.
La reprise différée entièrement automatique nécessite un prestataire/configuration
native supplémentaire ; elle n’est pas simulée par du fingerprinting.

Les pages `/i`, `/v` et `/s`, et leurs aperçus PNG 1200 × 630, relisent les RPC
publiques sans cache. Elles n’utilisent jamais une clé `service_role`. Aucun
compteur privé de vues ni détail d’invité n’entre dans les métadonnées sociales.
Les plateformes tierces peuvent conserver leurs propres aperçus déjà générés.

## Validation locale

- Contrôles `npm run mobile:architecture` et `npm run mobile:typecheck` réussis.
- 92 tests mobiles ciblés réussis (13 suites) : invitations, transport lié au compte, reprise des liens,
  visites/likes/préférences, jalons vérifiés, notifications, journal des Volts et
  points d’entrée Profil/Cercle. Les mocks ne se substituent pas à une recette
  sur appareils natifs.
- `npm run mobile:public-pages-test` réussi : pages existantes et 10 tests P2,
  dont un rendu PNG réel, les métadonnées privées, les erreurs et les méthodes HTTP.
- Contrats SQL P0/P1/P2 réussis dans PostgreSQL WASM (PGlite), avec les migrations
  réelles du registre, du calendrier, des notifications et des appels classés,
  et des fixtures isolées Auth/catalogue/profil. Sont couverts notamment les
  plafonds, le changement de mois, les relectures idempotentes, les préférences,
  les comptes désactivés et la réévaluation des notifications déjà en file.
- Vérification navigateur effectuée en mode aperçu, notamment à 390 et 320 px :
  invitations, préférences et likes réversibles. Aucun partage réel ni crédit
  de récompense n’a été déclenché par ces aperçus.

## Mise en service restante

La migration `20260903111653_growth_social_p2.sql` n’est pas appliquée à une base
distante par cette implémentation. La publication du code ne remplace pas
l’application de cette migration ni la recette native.

1. Appliquer la migration dans l’environnement local/staging, après P0 et P1.
2. Avec Docker démarré, exécuter `npm run db:test:growth-concurrency`, puis les
   contrats complets et les advisors avant production. Le script utilise
   uniquement la base Supabase locale et supprime ses fixtures générées.
   Il vérifie acceptations concurrentes, attribution unique du parrain,
   idempotence du protecteur, plafond des crédits et likes/vues simultanés.
   Ce test natif est resté bloqué car le daemon Docker était arrêté ; PGlite
   ne valide pas les transactions sur plusieurs connexions.
3. Déployer les pages publiques avec `CLUTCH_APP_ORIGIN` (ou
   `EXPO_PUBLIC_APP_ORIGIN`), `SUPABASE_URL` et une clé publique Supabase
   (`SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY` ; alias Expo acceptés).
4. Configurer les URL des stores, `CLUTCH_APPLE_TEAM_ID` et
   `CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS`, puis reconstruire l’application
   avec le même domaine `EXPO_PUBLIC_APP_ORIGIN`.
5. Vérifier sur iOS/Android : lien à froid et à chaud, inscription/onboarding,
   partage natif, retour depuis le store via lien/code et livraison push réelle.
   Une attribution automatique après première installation et les KPI
   d’installation correspondants nécessitent encore le choix d’un prestataire.

Les évolutions parallèles du thème, des classements, des anneaux et de l’éditeur
de vitrine sont préservées ; elles ne font pas partie du lot P2.
