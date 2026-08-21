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
    frags: 1000,
    rang: 1,
    pronostics_regles: 0,
    pronostics_gagnes: 0,
    pic_frags: 1000,
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
    title: 'Recrue',
    prestige: 'recrue',
    prestigeLabel: 'Recrue',
    progress: 0.18,
    remaining: 820,
  },
};

export default function ProfilePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ProfileScreen previewData={PREVIEW_PROFILE} />;
}
