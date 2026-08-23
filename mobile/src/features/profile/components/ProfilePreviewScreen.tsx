import { Redirect } from 'expo-router';

import type { ProfileData } from '../types';
import ProfileScreen from './ProfileScreen';

export const PREVIEW_PROFILE: ProfileData = {
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
      progression: 1,
      cle: 'diamant',
      libelle: 'Diamant',
      ordre: 4,
      minimum: 1450,
      plafond: 1650,
      prochaine_cle: 'mythique',
      prochain_libelle: 'Mythique',
      prochain_minimum: 1650,
      prochain_objectif_pronostics: 30,
      prochains_pronostics_restants: 12,
    },
    percentile: 86.4,
    joueurs_classes: 942,
    meilleur_grade: { cle: 'diamant', libelle: 'Diamant', ordre: 4, minimum: 1450 },
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
  cosmetics: {
    frame: { id: 'cadre-profil-2', slot: 'cadre_profil', level: 2, name: 'Signal Volt', description: '', rarity: 'rare', styleKey: 'frame-volt', accent: '#E8FF3D' },
    title: { id: 'titre-profil-3', slot: 'titre_profil', level: 3, name: 'Instinct GRIFF', description: '', rarity: 'epique', styleKey: 'title-instinct', accent: '#E8FF3D' },
    core: { id: 'apparence-core-3', slot: 'apparence_core', level: 3, name: 'Core Holographique', description: '', rarity: 'epique', styleKey: 'core-holo', accent: '#54D9FF' },
    factionEffect: { id: 'effet-faction-2', slot: 'effet_faction', level: 2, name: 'Veines Volt', description: '', rarity: 'rare', styleKey: 'faction-veins', accent: '#E8FF3D' },
    profileCard: { id: 'carte-profil-2', slot: 'carte_profil', level: 2, name: 'Signal Acide', description: '', rarity: 'rare', styleKey: 'card-signal', accent: '#E8FF3D' },
  },
};

export default function ProfilePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ProfileScreen previewData={PREVIEW_PROFILE} />;
}
