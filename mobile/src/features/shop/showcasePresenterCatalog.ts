import type { ImageSourcePropType } from 'react-native';

import type { ShowcaseRoomSlotDefinition } from '@/src/features/profile/showcase/roomEditor';
import type { ShowcasePedestalSkin } from '@/src/features/profile/components/showcase/types';
import type { ShowcaseSceneFrame } from '@/src/features/profile/components/showcase/showcaseSceneLayout';

import type { CosmeticRarity } from './types';

export type ShowcasePresenterDefinition = {
  accent: string;
  description: string;
  id: string;
  image: ImageSourcePropType;
  editorImage?: ImageSourcePropType;
  sceneFrame?: ShowcaseSceneFrame;
  name: string;
  packId?: string;
  packOnly?: boolean;
  pedestal: ShowcasePedestalSkin;
  price: number;
  rarity: CosmeticRarity;
  showRankDisplay?: boolean;
  slots: readonly ShowcaseRoomSlotDefinition[];
};

const CURRENT_CABINET_SLOTS = [
  { id: 'left-free', label: 'Étagère 1 · Place 1', preferredKind: 'frame', left: '7.6%', top: '12%', width: '16%', height: '30%' },
  { id: 'jersey', label: 'Étagère 1 · Place 2', preferredKind: 'jersey', left: '30.5%', top: '12%', width: '16%', height: '30%' },
  { id: 'trophy', label: 'Étagère 1 · Place 3', preferredKind: 'trophy', left: '53.4%', top: '12%', width: '16%', height: '30%' },
  { id: 'rank', label: 'Étagère 1 · Place 4', preferredKind: 'rank', left: '76.3%', top: '12%', width: '16%', height: '30%' },
  { id: 'badge', label: 'Étagère 2 · Place 1', preferredKind: 'badge', left: '7.6%', top: '52%', width: '16%', height: '30%' },
  { id: 'title', label: 'Étagère 2 · Place 2', preferredKind: 'title', left: '30.5%', top: '52%', width: '16%', height: '30%' },
  { id: 'ring', label: 'Étagère 2 · Place 3', preferredKind: 'ring', left: '53.4%', top: '52%', width: '16%', height: '30%' },
  { id: 'right-free', label: 'Étagère 2 · Place 4', preferredKind: 'core', left: '76.3%', top: '52%', width: '16%', height: '30%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const NEON_PROTOCOL_PACK_SLOTS = [
  { id: 'jersey', label: 'Armure Vega', preferredKind: 'jersey', left: '2%', top: '27%', width: '15%', height: '51%' },
  { id: 'trophy', label: 'Totem Null', preferredKind: 'trophy', left: '18%', top: '38%', width: '9%', height: '40%' },
  { id: 'left-extra', label: 'Bannière Phase', preferredKind: 'banner', left: '28%', top: '29%', width: '10%', height: '49%' },
  { id: 'right-extra', label: 'Glyphe Nœud', preferredKind: 'core', left: '41%', top: '25%', width: '18%', height: '54%' },
  { id: 'badge', label: 'Badge Pionnier', preferredKind: 'badge', left: '60%', top: '35%', width: '10%', height: '43%' },
  { id: 'ring', label: 'Jeton Syn', preferredKind: 'ring', left: '71%', top: '42%', width: '9%', height: '36%' },
  { id: 'title', label: 'Titre Architecte', preferredKind: 'title', left: '80%', top: '48%', width: '9%', height: '29%' },
  { id: 'left-free', label: 'Cadre Phase', preferredKind: 'frame', left: '10%', top: '58%', width: '11%', height: '21%' },
  { id: 'right-free', label: 'Carte de partage', preferredKind: 'banner', left: '88%', top: '56%', width: '11%', height: '23%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const MYTHS_FORGE_PACK_SLOTS = [
  // Centers and bottom contact lines follow the eight baked-in seats in the full image.
  // Keep slot IDs stable so existing collections retain their assignments.
  { id: 'left-free', label: 'Cadre Fissure', preferredKind: 'frame', left: '5.4%', top: '34.2%', width: '16%', height: '27%' },
  { id: 'left-extra', label: 'Bannière Strate', preferredKind: 'banner', left: '13%', top: '44%', width: '17%', height: '31%' },
  { id: 'ring', label: 'Jeton Tellurique', preferredKind: 'ring', left: '25.7%', top: '26%', width: '11%', height: '29%' },
  { id: 'jersey', label: 'Armure Oréa', preferredKind: 'jersey', left: '38.7%', top: '46.5%', width: '22%', height: '35%' },
  { id: 'right-extra', label: 'Sigil de Braise', preferredKind: 'core', left: '44%', top: '24.3%', width: '11%', height: '30%' },
  { id: 'trophy', label: 'Totem Basalte', preferredKind: 'trophy', left: '62.4%', top: '25%', width: '11%', height: '30%' },
  { id: 'badge', label: 'Badge Artisan', preferredKind: 'badge', left: '68.8%', top: '44%', width: '17%', height: '31%' },
  { id: 'right-free', label: 'Carte de partage', preferredKind: 'banner', left: '77.5%', top: '34.2%', width: '16%', height: '27%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const CIRCUIT_ZERO_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Sillage', preferredKind: 'frame', left: '2%', top: '45%', width: '11%', height: '33%' },
  { id: 'left-extra', label: 'Bannière Secteur', preferredKind: 'banner', left: '14%', top: '34%', width: '11%', height: '44%' },
  { id: 'ring', label: 'Jeton Chrono', preferredKind: 'ring', left: '26%', top: '42%', width: '10%', height: '36%' },
  { id: 'jersey', label: 'Kairos-6', preferredKind: 'jersey', left: '36%', top: '33%', width: '28%', height: '45%' },
  { id: 'right-extra', label: 'Glyphe Zéro', preferredKind: 'core', left: '65%', top: '36%', width: '11%', height: '42%' },
  { id: 'trophy', label: 'Totem Delta', preferredKind: 'trophy', left: '77%', top: '38%', width: '10%', height: '40%' },
  { id: 'badge', label: 'Badge Pilote', preferredKind: 'badge', left: '88%', top: '43%', width: '10%', height: '35%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const TITANS_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre des Colosses', preferredKind: 'frame', left: '6%', top: '33%', width: '14%', height: '33%', artworkLift: 2 },
  { id: 'jersey', label: 'Cuirasse des Serments', preferredKind: 'jersey', left: '19.5%', top: '25%', width: '14%', height: '37%', artworkLift: 0.8, artworkScale: 0.78 },
  { id: 'trophy', label: 'Totem des Trois Voix', preferredKind: 'trophy', left: '31.2%', top: '30%', width: '12%', height: '30%', artworkLift: 0.7, artworkScale: 0.85 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '20%', width: '18%', height: '49%', artworkLift: -2.2, artworkScale: 1.25 },
  { id: 'badge', label: 'Badge Porte-Faille', preferredKind: 'badge', left: '56.8%', top: '33%', width: '12%', height: '28%', artworkLift: 2, artworkScale: 0.85 },
  { id: 'right-extra', label: 'Hache de l’Éclipse', preferredKind: 'core', left: '67.05%', top: '29%', width: '13%', height: '33%', artworkLift: 0.8, artworkScale: 0.8 },
  { id: 'left-extra', label: 'Bannière du Pacte', preferredKind: 'banner', left: '79.5%', top: '30%', width: '13%', height: '37%', artworkLift: 2.7, artworkScale: 0.85 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const FREEFALL_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Altitude', preferredKind: 'frame', left: '9%', top: '34%', width: '13%', height: '29%', artworkLift: 2 },
  { id: 'jersey', label: 'Aéropack Falcon', preferredKind: 'jersey', left: '22%', top: '35%', width: '14%', height: '43%', artworkLift: 2 },
  { id: 'trophy', label: 'Balise Sommet', preferredKind: 'trophy', left: '32%', top: '31%', width: '12%', height: '31%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '18%', width: '18%', height: '45%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Éclaireur', preferredKind: 'badge', left: '57%', top: '31%', width: '12%', height: '31%', artworkLift: 2 },
  { id: 'right-extra', label: 'Capsule de Butin', preferredKind: 'core', left: '64%', top: '35%', width: '14%', height: '43%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Escalade', preferredKind: 'banner', left: '78%', top: '34%', width: '13%', height: '29%', artworkLift: 2 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const FROST_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Rempart', preferredKind: 'frame', left: '2%', top: '34%', width: '16%', height: '33%', artworkLift: 3 },
  { id: 'jersey', label: 'Dragon Veyr', preferredKind: 'jersey', left: '12.2%', top: '24%', width: '16%', height: '38%', artworkLift: 2.2, artworkScale: 0.85 },
  { id: 'trophy', label: 'Œuf des Cimes', preferredKind: 'trophy', left: '26.5%', top: '28%', width: '13%', height: '30%', artworkLift: 3, artworkScale: 0.85 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '39.75%', top: '17%', width: '20%', height: '46%', artworkLift: -1, artworkScale: 1 },
  { id: 'badge', label: 'Badge Veilleur', preferredKind: 'badge', left: '60%', top: '30%', width: '13%', height: '28%', artworkLift: 1.8, artworkScale: 0.85 },
  { id: 'right-extra', label: 'Boussole des Neiges', preferredKind: 'core', left: '71.9%', top: '24%', width: '16%', height: '38%', artworkLift: 1.4, artworkScale: 0.72 },
  { id: 'left-extra', label: 'Bannière du Serment', preferredKind: 'banner', left: '83.8%', top: '34%', width: '16%', height: '33%', artworkLift: 0.4, artworkScale: 0.88 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const ARCANE_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Treille', preferredKind: 'frame', left: '0.5%', top: '32.5%', width: '13%', height: '29%', artworkLift: 2 },
  { id: 'jersey', label: 'Brumousse', preferredKind: 'jersey', left: '9.9%', top: '25%', width: '15%', height: '34%', artworkLift: 2 },
  { id: 'trophy', label: 'Totem Bourgeon', preferredKind: 'trophy', left: '20.5%', top: '28.7%', width: '13%', height: '28%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '40%', top: '19.2%', width: '20%', height: '35%', artworkLift: 1 },
  { id: 'badge', label: 'Badge Gardien', preferredKind: 'badge', left: '56.9%', top: '27.4%', width: '13%', height: '28%', artworkLift: 2 },
  { id: 'right-extra', label: 'Sceau du Conclave', preferredKind: 'core', left: '74.8%', top: '25%', width: '15%', height: '34%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Floraison', preferredKind: 'banner', left: '86.5%', top: '32.5%', width: '13%', height: '29%', artworkLift: 2 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const TURBO_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Boost', preferredKind: 'frame', left: '2%', top: '33%', width: '15%', height: '27%', artworkLift: 2 },
  { id: 'jersey', label: 'Bolide Comète', preferredKind: 'jersey', left: '15%', top: '23%', width: '16%', height: '32%', artworkLift: 2 },
  { id: 'trophy', label: 'Trophée Aérien', preferredKind: 'trophy', left: '28%', top: '26%', width: '13%', height: '26%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '40%', top: '16%', width: '20%', height: '45%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Striker', preferredKind: 'badge', left: '59%', top: '26%', width: '13%', height: '26%', artworkLift: 2 },
  { id: 'right-extra', label: 'Ballon Orbital', preferredKind: 'core', left: '70%', top: '23%', width: '16%', height: '32%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Overtime', preferredKind: 'banner', left: '83%', top: '33%', width: '15%', height: '27%', artworkLift: 2 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const LAST_ROUND_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Balistique', preferredKind: 'frame', left: '0.6%', top: '34.5%', width: '17%', height: '40%', artworkLift: 2 },
  { id: 'jersey', label: 'Casque Sentinelle', preferredKind: 'jersey', left: '11.5%', top: '30.5%', width: '17%', height: '38%', artworkLift: 2 },
  { id: 'trophy', label: 'Drone Éclaireur', preferredKind: 'trophy', left: '26%', top: '34.8%', width: '14%', height: '31%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '39%', top: '20.5%', width: '22%', height: '51%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Opérateur', preferredKind: 'badge', left: '60%', top: '34.8%', width: '14%', height: '31%', artworkLift: 2 },
  { id: 'right-extra', label: 'Carabine Vector', preferredKind: 'core', left: '71.5%', top: '30.5%', width: '17%', height: '38%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Escouade', preferredKind: 'banner', left: '82%', top: '34.5%', width: '17%', height: '40%', artworkLift: 2 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

export const SHOWCASE_PRESENTER_CATALOG: readonly ShowcasePresenterDefinition[] = [
  {
    id: 'supports_gallery',
    name: 'Classique',
    description: 'La vitrine classique actuelle avec huit emplacements indépendants.',
    accent: '#31D7E2',
    image: require('../../../assets/shop/rooms/cabinet-classique.png'),
    editorImage: require('../../../assets/shop/rooms/cabinet-classique.png'),
    sceneFrame: { width: 1536, height: 1024, top: 0, bottom: 1024 },
    pedestal: 'obsidian',
    price: 0,
    rarity: 'commun',
    slots: CURRENT_CABINET_SLOTS,
  },
  {
    id: 'neon-protocol-vector-pedestals',
    name: 'Socle Vectoriel',
    description: 'Neuf stations graphite en sustentation dans la chambre orbitale Synapse.',
    accent: '#58DFFF',
    image: require('../../../assets/shop/packs/neon-protocol/neon-protocol-room-empty.png'),
    packId: 'neon-protocol',
    packOnly: false,
    pedestal: 'obsidian',
    price: 300,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: NEON_PROTOCOL_PACK_SLOTS,
  },
  {
    id: 'mythes-forge-magma-pedestals',
    name: 'Socle Magmatique',
    description: 'Huit stations de basalte et de cuivre dressées dans la Forge des Failles.',
    accent: '#F06A3A',
    image: require('../../../assets/shop/packs/mythes-forge/mythes-forge-room-empty.png'),
    sceneFrame: { width: 1672, height: 941, top: 0, bottom: 941 },
    packId: 'mythes-forge',
    packOnly: false,
    pedestal: 'bronze',
    price: 300,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: MYTHS_FORGE_PACK_SLOTS,
  },
  {
    id: 'circuit-zero-aero-pedestals',
    name: 'Socle Aéro',
    description: 'Sept stations aérodynamiques distribuées dans le tunnel d’essai Circuit Zéro.',
    accent: '#C7F000',
    image: require('../../../assets/shop/packs/circuit-zero/circuit-zero-room-empty.png'),
    packId: 'circuit-zero',
    packOnly: false,
    pedestal: 'steel',
    price: 300,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: CIRCUIT_ZERO_PACK_SLOTS,
  },
  {
    id: 'sang-des-titans-monolith-pedestal',
    name: 'Salle du Dernier Pacte',
    description: 'Un sanctuaire monumental de pierre et de bronze ouvert sur les montagnes des Titans.',
    accent: '#B98957',
    image: require('../../../assets/shop/rooms/pack-sang-des-titans.png'),
    sceneFrame: { width: 1842, height: 854, top: 0, bottom: 854 },
    packId: 'sang-des-titans',
    packOnly: true,
    pedestal: 'bronze',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: TITANS_PACK_SLOTS,
  },
  {
    id: 'chute-libre-drop-pedestal',
    name: 'Belvédère Nomade',
    description: 'Une plateforme d’altitude ouverte sur les canyons et les routes aériennes.',
    accent: '#FF6A55',
    image: require('../../../assets/shop/rooms/pack-chute-libre.png'),
    sceneFrame: { width: 1842, height: 854, top: 0, bottom: 854 },
    packId: 'chute-libre',
    packOnly: true,
    pedestal: 'steel',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: FREEFALL_PACK_SLOTS,
  },
  {
    id: 'serment-du-givre-ice-sheet-pedestal',
    name: 'Bastion des Cimes',
    description: 'Une forteresse glacée ouverte sur les sommets gardés par le dragon Veyr.',
    accent: '#9BCFFF',
    image: require('../../../assets/shop/rooms/pack-serment-du-givre.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    packId: 'serment-du-givre',
    packOnly: true,
    pedestal: 'steel',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: FROST_PACK_SLOTS,
  },
  {
    id: 'conclave-arcanique-rosette-pedestal',
    name: 'Clairière du Conclave',
    description: 'Une rotonde de pierre claire suspendue entre fleurs, arches et cascades.',
    accent: '#BE8BE8',
    image: require('../../../assets/shop/rooms/pack-conclave-arcanique-frontal.png'),
    sceneFrame: { width: 1846, height: 852, top: 0, bottom: 852 },
    packId: 'conclave-arcanique',
    packOnly: true,
    pedestal: 'bronze',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: ARCANE_PACK_SLOTS,
  },
  {
    id: 'turbo-arena-kickoff-pedestal',
    name: 'Dôme Turbo',
    description: 'Un garage panoramique bleu nuit ouvert sur une arène en prolongation.',
    accent: '#FF8A24',
    image: require('../../../assets/shop/rooms/pack-turbo-arena.png'),
    sceneFrame: { width: 1846, height: 852, top: 0, bottom: 852 },
    packId: 'turbo-arena',
    packOnly: true,
    pedestal: 'steel',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: TURBO_PACK_SLOTS,
  },
  {
    id: 'dernier-round-extraction-pedestal',
    name: 'Base Avancée',
    description: 'Une armurerie tactique aux signaux rouges ouverte sur le quartier d’entraînement.',
    accent: '#FF5D4D',
    image: require('../../../assets/shop/rooms/pack-dernier-round-frontal.png'),
    sceneFrame: { width: 1846, height: 852, top: 0, bottom: 852 },
    packId: 'dernier-round',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: LAST_ROUND_PACK_SLOTS,
  },
] as const;

export const DEFAULT_SHOWCASE_PRESENTER_ID = SHOWCASE_PRESENTER_CATALOG[0].id;

export function showcasePresenterById(id: string | null | undefined) {
  return SHOWCASE_PRESENTER_CATALOG.find((presenter) => presenter.id === id) ?? null;
}

// Keep scene layouts independent from the pedestal objects retired from sale.
export function showcasePresenterByRoomId(id: string | null | undefined) {
  return SHOWCASE_PRESENTER_CATALOG.find((presenter) => (
    presenter.packId && id === `${presenter.packId}-room`
  )) ?? null;
}
