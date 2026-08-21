import { Redirect } from 'expo-router';

import type { ProfileData } from '../types';
import ProfileScreen from './ProfileScreen';

const PREVIEW_PROFILE: ProfileData = {
  pseudo: 'Pierre-Louis',
  createdAt: new Date().toISOString(),
  profileTitle: null,
  founder: false,
  publicProfile: true,
  ranking: {
    saison_id: 'preview-season',
    saison_nom: 'Saison Zéro',
    frags: 1842,
    rang: 128,
    pronostics_regles: 18,
    pronostics_gagnes: 12,
    pic_frags: 1910,
    placements_restants: 0,
    provisoire: false,
    grade: {
      classe: true,
      objectif_placements: 5,
      placements_restants: 0,
      progression: 0.605,
      cle: 'elite',
      libelle: 'Élite',
      ordre: 2,
      minimum: 1600,
      plafond: 2000,
      prochaine_cle: 'master',
      prochain_libelle: 'Master',
      prochain_minimum: 2000,
    },
    percentile: 86.4,
    joueurs_classes: 942,
    meilleur_grade: { cle: 'elite', libelle: 'Élite', ordre: 2, minimum: 1600 },
    meilleur_rang: 96,
  },
  recap: {},
  currentStreak: 0,
  favoriteTeam: {
    id: 'kc',
    nom: 'Karmine Corp',
    tag: 'KC',
    jeu: 'lol',
    logo: null,
    supporters: 218,
    relique: 'Calice',
    relique_niveau: 4,
  },
  bestGame: null,
  recent: [],
  badges: [
    { key: 'premier_pas', name: 'Premier pas', family: 'social', rarity: 'rare', obtained: true },
  ],
  pinnedBadges: [
    { key: 'premier_pas', name: 'Premier pas', family: 'social', rarity: 'rare', obtained: true },
  ],
  arsenalBadges: [],
  level: {
    xp: 180,
    level: 1,
    title: 'Nouveau talent',
    prestige: 'starter',
    prestigeLabel: 'Starter',
    progress: 0.18,
    remaining: 820,
  },
};

export default function ProfilePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ProfileScreen previewData={PREVIEW_PROFILE} />;
}
