import { legalEntity, supportEmail } from '@/src/config/release';

import type { LegalDocument } from './types';

const contact = supportEmail
  ? `Contact : ${supportEmail}.`
  : 'Le contact de support doit être configuré avant la publication publique.';

export const privacyDocument: LegalDocument = {
  eyebrow: 'CLUTCH // DONNÉES',
  title: 'POLITIQUE DE CONFIDENTIALITÉ.',
  updatedAt: '22 août 2026',
  introduction: `${legalEntity} conçoit Clutch avec une collecte limitée aux données nécessaires au fonctionnement du produit. Cette politique explique les données traitées, leurs usages et tes droits.`,
  sections: [
    {
      title: 'Données traitées',
      paragraphs: [
        'Compte : adresse e-mail, identifiant interne, pseudo, jeux suivis, équipe favorite et préférences de visibilité.',
        'Activité : calls, verdicts, classement, progression, relations sociales, duels, ligues, missions, inventaire cosmétique, préférences de notification, blocages et signalements nécessaires à la sécurité du service.',
        'Achat : Clutch conserve uniquement un statut et des références techniques validées côté serveur. Les données de paiement restent gérées par Apple, Google et RevenueCat.',
        'Mesure d’usage facultative : si tu l’acceptes, Clutch conserve des événements produit strictement prédéfinis, sans identifiant publicitaire, sans identifiant d’appareil et sans métadonnée libre.',
      ],
    },
    {
      title: 'Finalités',
      paragraphs: [
        'Ces données servent à authentifier le compte, afficher les matchs, régler les calls, calculer la progression, faire fonctionner les fonctions sociales, livrer les achats et améliorer la fiabilité de Clutch.',
        'La mesure d’usage repose sur ton consentement. La refuser ne bloque aucune fonction et tu peux changer d’avis à tout moment dans Moi → Paramètres → Confidentialité et sécurité.',
        'Clutch ne vend pas les données personnelles et ne les utilise pas pour suivre une personne entre plusieurs applications ou sites.',
      ],
    },
    {
      title: 'Prestataires',
      paragraphs: [
        'Supabase héberge l’authentification, la base de données et les fonctions serveur. Expo fournit le service de notification push. RevenueCat vérifie les achats intégrés lorsque cette fonction est utilisée.',
        'Chaque prestataire ne reçoit que les informations nécessaires à sa mission. La suppression du compte déclenche aussi la suppression du profil RevenueCat associé.',
      ],
    },
    {
      title: 'Conservation',
      paragraphs: [
        'Les données du compte sont conservées pendant la durée d’utilisation du service puis supprimées avec le compte, sauf obligation légale contraire clairement applicable.',
        'Les événements bruts de mesure d’usage sont automatiquement supprimés au plus tard après 13 mois. Les agrégats sans identifiant peuvent être conservés plus longtemps pour suivre la qualité du produit.',
        'Les blocages et signalements sont conservés aussi longtemps qu’ils sont nécessaires à la sécurité, à la modération et à la défense des droits, puis supprimés ou anonymisés selon leur statut et les obligations applicables.',
      ],
    },
    {
      title: 'Âge minimum',
      paragraphs: [
        'Clutch est réservé aux personnes âgées de 15 ans ou plus. L’application conserve uniquement la confirmation de cette condition, jamais une date de naissance.',
      ],
    },
    {
      title: 'Tes droits',
      paragraphs: [
        `Tu peux modifier ton consentement analytique, gérer tes comptes bloqués, demander l’accès ou la rectification de tes données et supprimer définitivement ton compte directement dans l’application. ${contact}`,
      ],
    },
  ],
};

export const termsDocument: LegalDocument = {
  eyebrow: 'CLUTCH // RÈGLES',
  title: 'CONDITIONS D’UTILISATION.',
  updatedAt: '22 août 2026',
  introduction: `En créant un compte Clutch, tu acceptes les présentes conditions proposées par ${legalEntity}. Clutch est un jeu social de prédiction e-sport, sans mise d’argent réel.`,
  sections: [
    {
      title: 'Compte',
      paragraphs: [
        'Tu dois avoir au moins 15 ans pour utiliser Clutch. Si cette condition n’est pas remplie, tu ne dois pas créer ou conserver de compte.',
        'Tu dois fournir des informations exactes, protéger ton mot de passe et utiliser un seul compte personnel. Tu restes responsable des actions effectuées depuis ta session.',
        'Les pseudos ou comportements illicites, trompeurs, haineux, menaçants ou portant atteinte aux droits d’autrui sont interdits.',
      ],
    },
    {
      title: 'Social et modération',
      paragraphs: [
        'Tu peux bloquer un compte ou le signaler depuis son profil public. Un blocage coupe les demandes d’amis et les duels directs entre les deux comptes.',
        'Clutch peut masquer un contenu, limiter une fonction sociale, suspendre ou fermer un compte en cas de harcèlement, haine, menace, usurpation, spam, triche, contenu illégal ou atteinte aux droits d’autrui. Les signalements sont examinés selon leur gravité et leur contexte.',
      ],
    },
    {
      title: 'Compétition',
      paragraphs: [
        'Les Frags mesurent le classement compétitif, l’XP la progression permanente et les Volts l’accès aux cosmétiques. Aucun de ces éléments n’est une monnaie réelle, retirable ou échangeable contre de l’argent.',
        'Les résultats sont réglés à partir des sources indiquées dans le Match Center. En cas d’erreur manifeste ou de match annulé, Clutch peut corriger ou annuler un verdict de manière traçable.',
      ],
    },
    {
      title: 'Achats',
      paragraphs: [
        'Les achats intégrés sont facturés et remboursés selon les règles du store utilisé. Le Founder Pack est un achat unique de contenus visuels et ne procure aucun avantage compétitif.',
      ],
    },
    {
      title: 'Disponibilité',
      paragraphs: [
        'Le service peut évoluer, être interrompu pour maintenance ou retirer une fonction devenue risquée ou non conforme. Nous cherchons à préserver les éléments acquis et à informer les utilisateurs des changements importants.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [contact],
    },
  ],
};
