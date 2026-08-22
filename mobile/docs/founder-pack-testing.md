# Founder Pack — configuration et recette native

La phase 5.1 valide une seule hypothèse : des supporters veulent-ils payer une
fois pour une identité visuelle Clutch forte ? Le produit est donc un achat
non consommable, sans abonnement, sans Frags et sans Volts.

## Contrat immuable du lancement

| Élément | Valeur exacte |
| --- | --- |
| Produit Apple / Google | `clutch_founder_pack_v1` |
| Entitlement RevenueCat | `founder_pack` |
| Offering RevenueCat | `founder_launch` |
| Prix cible France | 4,99 € ; l’app affiche toujours le prix local du store |
| Contenu | Cadre Pionnier, titre Fondateur Clutch, Relique Originelle, Bannière Première Vague |
| Avantage compétitif | Aucun |
| Monnaie incluse | 0 Volt, 0 Frag |

Les packs de Volts de la phase 5.2 restent désactivés dans le contrat serveur.
Ils ne doivent pas être créés dans les stores avant validation du Founder Pack.

## 1. Configurer les stores

### App Store Connect

1. Ouvrir l’app `com.fabthetap.clutch` et accepter les accords Paid Apps.
2. Créer un achat intégré **Non-Consumable** avec l’identifiant
   `clutch_founder_pack_v1`.
3. Renseigner le nom, la description, la capture de revue et un prix donnant
   4,99 € en France. Ne jamais écrire ce prix en dur comme prix contractuel.
4. Vérifier la disponibilité du produit pour la version TestFlight utilisée.
5. Configurer App Store Server Notifications V2 dans RevenueCat afin que les
   remboursements et transferts déclenchent le webhook Clutch.

### Google Play Console

1. Ouvrir l’app `com.fabthetap.clutch`.
2. Créer un **one-time product** non consommable avec l’identifiant
   `clutch_founder_pack_v1` et le prix local cible de 4,99 €.
3. Activer le produit et publier l’AAB sur la piste Internal testing.
4. Ajouter les comptes de test aux license testers et à la piste interne.
5. Relier les credentials Google Play et les Real-time Developer Notifications
   à RevenueCat pour recevoir achats, remboursements et transferts.

## 2. Configurer RevenueCat

1. Ajouter les applications iOS et Android au même projet RevenueCat.
2. Importer `clutch_founder_pack_v1` pour chaque store en type non consommable.
3. Créer l’entitlement `founder_pack`, puis y attacher les deux produits.
4. Créer l’offering `founder_launch` et un package contenant ce produit.
5. Choisir **Transfer to new App User ID** comme Restore Behavior. Clutch
   utilise l’UUID Supabase comme App User ID et le serveur révoque l’ancien
   propriétaire lors d’un vrai événement `TRANSFER` ; il ne partage jamais un
   achat entre plusieurs alias.
6. Créer une clé API secrète RevenueCat limitée à ce projet pour la
   contre-vérification serveur. Elle ne doit jamais commencer par
   `EXPO_PUBLIC_` ni être placée dans l’application.
7. Créer un webhook vers
   `https://<PROJECT_REF>.supabase.co/functions/v1/clutch-founder-webhook` et
   lui ajouter un header `Authorization` long et aléatoire.

## 3. Injecter les variables sans les committer

Le build mobile reçoit uniquement les deux clés SDK publiques :

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

Les fonctions Supabase reçoivent la clé serveur et le secret du webhook :

```bash
supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...
supabase secrets set 'REVENUECAT_WEBHOOK_AUTH=Bearer <secret-aleatoire>'
```

Le header configuré dans RevenueCat doit être strictement identique à la
valeur `REVENUECAT_WEBHOOK_AUTH`.

## 4. Déployer le backend

Après revue de la migration :

```bash
supabase db push
supabase functions deploy clutch-founder-sync --no-verify-jwt
supabase functions deploy clutch-founder-webhook --no-verify-jwt
```

`clutch-founder-sync` vérifie lui-même le JWT Supabase de l’utilisateur.
`clutch-founder-webhook` n’accepte que le secret RevenueCat. Les deux refusent
donc les appels anonymes malgré `--no-verify-jwt` au niveau de la passerelle.

## 5. Construire et tester

Le vrai paiement ne fonctionne pas dans la version web et doit être validé
dans une nouvelle build native après l’installation du SDK :

```bash
cd mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform android
```

Utiliser TestFlight pour iOS et Internal testing pour Android. La page web
`/founder-pack-preview` sert uniquement à valider le design.

### Matrice de recette obligatoire

| Cas | Résultat attendu |
| --- | --- |
| Achat accepté | Une transaction privée, quatre objets, statut Founder, aucun Volt |
| Double clic / retry webhook | Toujours une transaction et quatre objets |
| Annulation du dialogue | Aucun débit et événement d’annulation agrégé |
| Paiement Google en attente | Aucun objet avant confirmation du store |
| Réinstallation puis Restaurer | Les quatre objets reviennent sur le même compte |
| Restauration avec un autre compte Clutch | Transfert explicite ; ancien compte révoqué, nouveau compte attribué |
| Remboursement Apple / Google | Objets et équipement retirés après webhook |
| Fondateur historique remboursé | Badge historique conservé, objets payants retirés |
| Réseau coupé après paiement | Message de synchronisation retardée, puis attribution par webhook/restauration |

## 6. Go / no-go avant les packs de Volts

Ne passer à la phase 5.2 qu’après un échantillon de test suffisant pour juger :

- vues, intentions, achats et annulations uniques ;
- réussite de restauration et délai achat → attribution ;
- remboursements et tickets support ;
- absence de duplication, de perte d’objet et d’impact sur les Frags ;
- compréhension du contenu et satisfaction sur l’identité visuelle.

La décision doit porter sur une cohorte réelle, pas sur les achats sandbox.
