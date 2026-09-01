import { Redirect, useLocalSearchParams } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import { EMPTY_EQUIPPED_COSMETICS } from '@/src/features/shop/types';

import { evaluateBadges, resolveBadgeSelection } from '../badges';
import type { ProfileData, ProfileRanking } from '../types';
import ProfileScreen from './ProfileScreen';

const PREVIEW_RANKING: ProfileRanking = {
  saison_id: 'preview-season',
  saison_nom: 'Saison Zéro',
  frags: 0,
  rang: 942,
  pronostics_regles: 0,
  pronostics_gagnes: 0,
  pic_frags: 0,
  placements_restants: 0,
  provisoire: false,
  grade: {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression: 0,
    cle: 'bronze',
    libelle: 'Bronze',
    ordre: 0,
    minimum: 0,
    plafond: 850,
    prochaine_cle: 'argent',
    prochain_libelle: 'Argent',
    prochain_minimum: 850,
  },
  percentile: null,
  joueurs_classes: 942,
  meilleur_grade: { cle: 'bronze', libelle: 'Bronze', ordre: 0, minimum: 0 },
  meilleur_rang: 942,
};

const PREVIEW_RECAP: Record<string, unknown> = {
  accomplissements_majeurs: 3,
  calls_corrects_saison: 46,
  calls_saison_courante: 64,
  competitions_gagnees_distinctes: 5,
  contribution_faction: 12,
  derniere_saison_cloturee: {
    activeWeeks: 10,
    closed: true,
    id: 'saison-zero',
    percentile: 8,
    totalWeeks: 12,
  },
  gagnes: 91,
  mission_collectives_100: 1,
  missions_collectives_terminees: 1,
  missions_collectives_victorieuses: 7,
  paris: 128,
  placements_gagnes: 5,
  placements_termines: 5,
  plus_longue_serie_semaines: 5,
  proba_min_gagnee: 0.08,
  resurgence_obtenue: false,
  saisons_terminees: 5,
  supporters_gagnes_faction: 12,
  serie_calls_synchrones_ami: 3,
  serie_correcte_saison_max: 7,
  serie_semaines_faction: 8,
  achievement_call_events: [
    {
      correct: true,
      decidingSeriesTie: true,
      finalizedAt: '2026-08-11T20:00:00.000Z',
      id: 'preview-clutch-call',
      participantPickShare: 0.08,
      seasonId: 'preview-season',
    },
  ],
  badges_accomplissement_obtenus: [
    { id: 'first_signal', obtenu_le: '2026-05-18T12:00:00.000Z', saison_id: 'preview-season' },
    { id: 'sharp_eye', obtenu_le: '2026-06-07T12:00:00.000Z', saison_id: 'preview-season' },
    { id: 'countercurrent', obtenu_le: '2026-08-11T20:00:00.000Z', saison_id: 'preview-season' },
  ],
};

const PREVIEW_BADGES = evaluateBadges({
  now: '2026-08-26T12:00:00.000Z',
  ranking: PREVIEW_RANKING,
  recap: PREVIEW_RECAP,
});

export const PREVIEW_PROFILE: ProfileData = {
  avatarId: 'gale-agent',
  pseudo: 'FabTheTap',
  createdAt: '2025-05-01T12:00:00.000Z',
  profileTitle: null,
  founder: false,
  publicProfile: true,
  ranking: PREVIEW_RANKING,
  recap: PREVIEW_RECAP,
  currentStreak: 9,
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
  badges: PREVIEW_BADGES,
  pinnedBadges: resolveBadgeSelection(['sharp_eye', 'countercurrent', 'season_elite'], PREVIEW_BADGES, 4),
  arsenalBadges: resolveBadgeSelection([], PREVIEW_BADGES, 5, true),
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
      material: { id: 'material_graphite', slot: 'vitrine_materiau', level: 1, name: 'Graphite mat', description: '', rarity: 'commun', styleKey: 'material-graphite', accent: '#7B8791' },
      lighting: { id: 'lighting_cyan', slot: 'vitrine_eclairage', level: 2, name: 'Cryo cyan', description: '', rarity: 'commun', styleKey: 'lighting-cyan', accent: '#31D7E2' },
      supports: { id: 'supports_gallery', slot: 'vitrine_supports', level: 1, name: 'Cercle Obsidienne', description: '', rarity: 'commun', styleKey: 'presenter-circle-obsidian', accent: '#31D7E2' },
      rankDisplay: { id: 'rank_carbon_cradle', slot: 'vitrine_rang', level: 1, name: 'Écrin Mécanique Carbone', description: '', rarity: 'commun', styleKey: 'rank-carbon-cradle', accent: '#31D7E2' },
      jersey: { id: 'jersey_locker', slot: 'vitrine_maillot', level: 1, name: 'Vestiaire', description: '', rarity: 'commun', styleKey: 'jersey-locker', accent: '#7B8791' },
    },
  },
};

export default function ProfilePreviewScreen() {
  const params = useLocalSearchParams<{ variant?: string | string[] }>();
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  return <ProfileScreen previewData={profileForPreview(normalizePreviewVariant(params.variant))} />;
}

type ProfilePreviewVariant = 'default' | 'long' | 'minimal' | 'private';

function normalizePreviewVariant(value?: string | string[]): ProfilePreviewVariant {
  const variant = Array.isArray(value) ? value[0] : value;
  return variant === 'long' || variant === 'minimal' || variant === 'private' ? variant : 'default';
}

function profileForPreview(variant: ProfilePreviewVariant): ProfileData {
  if (variant === 'long') {
    return {
      ...PREVIEW_PROFILE,
      pseudo: 'NorthwindCommander',
      profileTitle: 'Stratège des finales internationales',
      cosmetics: {
        ...PREVIEW_PROFILE.cosmetics,
        title: PREVIEW_PROFILE.cosmetics?.title
          ? { ...PREVIEW_PROFILE.cosmetics.title, name: 'Stratège des finales internationales' }
          : null,
      },
    };
  }
  if (variant === 'private') return { ...PREVIEW_PROFILE, publicProfile: false };
  if (variant === 'minimal') {
    return {
      ...PREVIEW_PROFILE,
      favoriteTeam: null,
      badges: [],
      pinnedBadges: [],
      arsenalBadges: [],
      cosmetics: EMPTY_EQUIPPED_COSMETICS,
    };
  }
  return PREVIEW_PROFILE;
}
