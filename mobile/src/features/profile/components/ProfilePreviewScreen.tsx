import { Redirect } from 'expo-router';

import type { ProfileData } from '../types';
import ProfileScreen from './ProfileScreen';

export const PREVIEW_PROFILE: ProfileData = {
  pseudo: 'FabTheTap',
  createdAt: new Date().toISOString(),
  profileTitle: null,
  founder: false,
  publicProfile: true,
  ranking: {
    saison_id: 'preview-season',
    saison_nom: 'Saison Zéro',
    frags: 1000,
    rang: null,
    pronostics_regles: 0,
    pronostics_gagnes: 0,
    pic_frags: 1000,
    placements_restants: 5,
    provisoire: false,
    grade: {
      classe: false,
      objectif_placements: 5,
      placements_restants: 5,
      progression: 0,
    },
    percentile: null,
    joueurs_classes: 942,
    meilleur_grade: null,
    meilleur_rang: null,
  },
  recap: {},
  currentStreak: 0,
  favoriteTeam: {
    id: 'fnc',
    nom: 'Fnatic',
    tag: 'FNC',
    jeu: 'lol',
    logo: null,
    supporters: 1,
    relique: 'Ampoule',
    relique_niveau: 1,
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
    xp: 200,
    level: 2,
    title: 'Rookie du Call',
    prestige: 'starter',
    prestigeLabel: 'Starter',
    progress: 0.52,
    remaining: 800,
  },
  cosmetics: {
    frame: { id: 'cadre-profil-1', slot: 'cadre_profil', level: 1, name: 'Cadre Brut', description: '', rarity: 'commun', styleKey: 'frame-raw', accent: '#AAB4BE' },
    title: { id: 'titre-profil-1', slot: 'titre_profil', level: 1, name: 'Rookie du Call', description: '', rarity: 'commun', styleKey: 'title-rookie', accent: '#AAB4BE' },
    core: { id: 'apparence-core-1', slot: 'apparence_core', level: 1, name: 'Core Origine', description: '', rarity: 'commun', styleKey: 'core-origin', accent: '#E8FF3D' },
    factionEffect: { id: 'effet-faction-1', slot: 'effet_faction', level: 1, name: 'Aura Discrète', description: '', rarity: 'commun', styleKey: 'faction-aura', accent: '#C6A34A' },
    profileCard: { id: 'carte-profil-1', slot: 'carte_profil', level: 1, name: 'Carte Noire', description: '', rarity: 'commun', styleKey: 'card-black', accent: '#AAB4BE' },
    showcase: {
      material: { id: 'material_graphite', slot: 'vitrine_materiau', level: 1, name: 'Graphite mat', description: '', rarity: 'commun', styleKey: 'material_graphite', accent: '#7B8791' },
      lighting: { id: 'lighting_cyan', slot: 'vitrine_eclairage', level: 2, name: 'Cryo cyan', description: '', rarity: 'commun', styleKey: 'lighting_cyan', accent: '#31D7E2' },
      supports: { id: 'supports_gallery', slot: 'vitrine_supports', level: 2, name: 'Galerie', description: '', rarity: 'commun', styleKey: 'supports_gallery', accent: '#8A959E' },
      jersey: { id: 'jersey_locker', slot: 'vitrine_maillot', level: 1, name: 'Vestiaire', description: '', rarity: 'commun', styleKey: 'jersey_locker', accent: '#7B8791' },
    },
  },
};

export default function ProfilePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ProfileScreen previewData={PREVIEW_PROFILE} />;
}
