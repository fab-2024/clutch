import type { ImageSourcePropType } from 'react-native';

import type { ShowcaseRoomSlotDefinition } from '@/src/features/profile/components/showcase/roomEditor';
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

const OBSIDIAN_GALLERY_SLOTS = [
  { id: 'left-free', label: 'Emplacement gauche', preferredKind: 'frame', left: '1.8%', top: '35%', width: '9.2%', height: '28%' },
  { id: 'jersey', label: 'Emplacement maillot', preferredKind: 'jersey', left: '12.3%', top: '29%', width: '13%', height: '32%' },
  { id: 'trophy', label: 'Emplacement trophée', preferredKind: 'trophy', left: '25.1%', top: '31%', width: '13%', height: '29%' },
  { id: 'rank', label: 'Emplacement central', preferredKind: 'rank', left: '41%', top: '24%', width: '18%', height: '38%' },
  { id: 'badge', label: 'Emplacement badge', preferredKind: 'badge', left: '59.7%', top: '33%', width: '10%', height: '27%' },
  { id: 'title', label: 'Emplacement titre', preferredKind: 'title', left: '70.5%', top: '42%', width: '9%', height: '19%' },
  { id: 'ring', label: 'Emplacement anneau', preferredKind: 'ring', left: '80.1%', top: '40%', width: '8%', height: '23%' },
  { id: 'right-free', label: 'Emplacement droit', preferredKind: 'core', left: '89.5%', top: '36%', width: '8.5%', height: '27.5%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const BRONZE_GALLERY_SLOTS = [
  { id: 'trophy', label: 'Emplacement trophée', preferredKind: 'trophy', left: '2%', top: '37%', width: '11%', height: '40%' },
  { id: 'jersey', label: 'Emplacement maillot', preferredKind: 'jersey', left: '14%', top: '29%', width: '11%', height: '49%' },
  { id: 'left-free', label: 'Emplacement gauche', preferredKind: 'frame', left: '26%', top: '39%', width: '9%', height: '38%' },
  { id: 'rank', label: 'Emplacement central', preferredKind: 'rank', left: '40%', top: '19%', width: '20%', height: '60%' },
  { id: 'badge', label: 'Emplacement badge', preferredKind: 'badge', left: '61%', top: '31%', width: '10%', height: '47%' },
  { id: 'title', label: 'Emplacement titre', preferredKind: 'title', left: '71%', top: '44%', width: '10%', height: '32%' },
  { id: 'ring', label: 'Emplacement anneau', preferredKind: 'ring', left: '82%', top: '47%', width: '8%', height: '29%' },
  { id: 'right-free', label: 'Emplacement droit', preferredKind: 'core', left: '90%', top: '38%', width: '8%', height: '39%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const MECHANICAL_CARBON_SLOTS = [
  { id: 'left-free', label: 'Emplacement gauche extérieur', preferredKind: 'frame', left: '1%', top: '45%', width: '7%', height: '32%' },
  { id: 'jersey', label: 'Emplacement maillot', preferredKind: 'jersey', left: '10%', top: '27%', width: '13%', height: '51%' },
  { id: 'trophy', label: 'Emplacement trophée', preferredKind: 'trophy', left: '24%', top: '36%', width: '10%', height: '41%' },
  { id: 'left-extra', label: 'Emplacement gauche intérieur', preferredKind: 'banner', left: '35%', top: '45%', width: '7%', height: '31%' },
  { id: 'rank', label: 'Emplacement central', preferredKind: 'rank', left: '42%', top: '19%', width: '17%', height: '60%' },
  { id: 'badge', label: 'Emplacement badge', preferredKind: 'badge', left: '60%', top: '36%', width: '10%', height: '41%' },
  { id: 'title', label: 'Emplacement titre', preferredKind: 'title', left: '70%', top: '45%', width: '10%', height: '31%' },
  { id: 'ring', label: 'Emplacement anneau', preferredKind: 'ring', left: '80%', top: '48%', width: '7%', height: '29%' },
  { id: 'right-extra', label: 'Emplacement droit intérieur', preferredKind: 'core', left: '87%', top: '46%', width: '6%', height: '30%' },
  { id: 'right-free', label: 'Emplacement droit extérieur', preferredKind: 'frame', left: '93%', top: '44%', width: '6%', height: '33%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const CRYSTAL_CAPSULE_SLOTS = [
  { id: 'left-free', label: 'Capsule gauche', preferredKind: 'frame', left: '2%', top: '28%', width: '9%', height: '50%' },
  { id: 'jersey', label: 'Capsule maillot', preferredKind: 'jersey', left: '13%', top: '29%', width: '11%', height: '49%' },
  { id: 'trophy', label: 'Capsule trophée', preferredKind: 'trophy', left: '26%', top: '29%', width: '11%', height: '49%' },
  { id: 'rank', label: 'Capsule centrale', preferredKind: 'rank', left: '41%', top: '18%', width: '18%', height: '61%' },
  { id: 'badge', label: 'Capsule badge', preferredKind: 'badge', left: '61%', top: '30%', width: '9%', height: '48%' },
  { id: 'title', label: 'Capsule titre', preferredKind: 'title', left: '71%', top: '34%', width: '8%', height: '44%' },
  { id: 'ring', label: 'Capsule anneau', preferredKind: 'ring', left: '81%', top: '31%', width: '8%', height: '47%' },
  { id: 'right-free', label: 'Capsule droite', preferredKind: 'core', left: '90%', top: '28%', width: '8%', height: '50%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const STEEL_VAULT_SLOTS = [
  { id: 'jersey', label: 'Niche maillot', preferredKind: 'jersey', left: '5%', top: '30%', width: '12%', height: '47%' },
  { id: 'trophy', label: 'Niche trophée', preferredKind: 'trophy', left: '18%', top: '32%', width: '11%', height: '45%' },
  { id: 'left-free', label: 'Niche gauche haute', preferredKind: 'frame', left: '30%', top: '31%', width: '9%', height: '22%' },
  { id: 'left-extra', label: 'Niche gauche basse', preferredKind: 'banner', left: '30%', top: '55%', width: '9%', height: '21%' },
  { id: 'rank', label: 'Niche centrale', preferredKind: 'rank', left: '40%', top: '25%', width: '20%', height: '53%' },
  { id: 'badge', label: 'Niche badge', preferredKind: 'badge', left: '61%', top: '31%', width: '10%', height: '46%' },
  { id: 'title', label: 'Niche titre', preferredKind: 'title', left: '72%', top: '39%', width: '9%', height: '37%' },
  { id: 'right-extra', label: 'Niche droite haute', preferredKind: 'core', left: '82%', top: '30%', width: '8%', height: '23%' },
  { id: 'ring', label: 'Niche anneau', preferredKind: 'ring', left: '82%', top: '55%', width: '8%', height: '21%' },
  { id: 'right-free', label: 'Niche droite extérieure', preferredKind: 'frame', left: '91%', top: '30%', width: '8%', height: '47%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const CHAMPAGNE_PODIUM_SLOTS = [
  { id: 'badge', label: 'Podium badge', preferredKind: 'badge', left: '12%', top: '41%', width: '12%', height: '36%' },
  { id: 'jersey', label: 'Podium maillot', preferredKind: 'jersey', left: '26%', top: '27%', width: '15%', height: '50%' },
  { id: 'rank', label: 'Podium central', preferredKind: 'rank', left: '42%', top: '17%', width: '18%', height: '61%' },
  { id: 'trophy', label: 'Podium trophée', preferredKind: 'trophy', left: '61%', top: '27%', width: '15%', height: '31%' },
  { id: 'title', label: 'Podium titre', preferredKind: 'title', left: '61%', top: '59%', width: '15%', height: '19%' },
  { id: 'ring', label: 'Podium anneau', preferredKind: 'ring', left: '79%', top: '43%', width: '11%', height: '35%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const FNATIC_TEAM_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Fnatic', preferredKind: 'frame', left: '2%', top: '39%', width: '8%', height: '39%' },
  { id: 'jersey', label: 'Maillot Fnatic', preferredKind: 'jersey', left: '11%', top: '27%', width: '13%', height: '51%' },
  { id: 'trophy', label: 'Totem Fnatic', preferredKind: 'trophy', left: '25%', top: '38%', width: '9%', height: '40%' },
  { id: 'left-extra', label: 'Bannière Fnatic', preferredKind: 'banner', left: '34%', top: '39%', width: '8%', height: '39%' },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '18%', width: '18%', height: '61%' },
  { id: 'badge', label: 'Badge Fnatic', preferredKind: 'badge', left: '60%', top: '35%', width: '10%', height: '43%' },
  { id: 'title', label: 'Titre Fnatic', preferredKind: 'title', left: '70%', top: '44%', width: '10%', height: '34%' },
  { id: 'ring', label: 'Jeton Fnatic', preferredKind: 'ring', left: '80%', top: '48%', width: '8%', height: '30%' },
  { id: 'right-extra', label: 'Logo 3D Fnatic', preferredKind: 'core', left: '88%', top: '41%', width: '6%', height: '37%' },
  { id: 'right-free', label: 'Carte de partage Fnatic', preferredKind: 'banner', left: '94%', top: '41%', width: '6%', height: '37%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const KC_TEAM_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre KC', preferredKind: 'frame', left: '2%', top: '39%', width: '8%', height: '39%' },
  { id: 'jersey', label: 'Maillot KC', preferredKind: 'jersey', left: '11%', top: '27%', width: '13%', height: '51%' },
  { id: 'trophy', label: 'Totem KC', preferredKind: 'trophy', left: '25%', top: '38%', width: '9%', height: '40%' },
  { id: 'left-extra', label: 'Bannière Blue Wall', preferredKind: 'banner', left: '34%', top: '39%', width: '8%', height: '39%' },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '18%', width: '18%', height: '61%' },
  { id: 'badge', label: 'Badge KC', preferredKind: 'badge', left: '60%', top: '35%', width: '10%', height: '43%' },
  { id: 'title', label: 'Titre Blue Wall', preferredKind: 'title', left: '70%', top: '44%', width: '10%', height: '34%' },
  { id: 'ring', label: 'Jeton KC', preferredKind: 'ring', left: '80%', top: '48%', width: '8%', height: '30%' },
  { id: 'right-extra', label: 'Logo 3D KC', preferredKind: 'core', left: '88%', top: '41%', width: '6%', height: '37%' },
  { id: 'right-free', label: 'Carte de partage KC', preferredKind: 'banner', left: '94%', top: '41%', width: '6%', height: '37%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const M8_TEAM_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre M8', preferredKind: 'frame', left: '2%', top: '39%', width: '8%', height: '39%' },
  { id: 'jersey', label: 'Maillot M8 2026', preferredKind: 'jersey', left: '11%', top: '27%', width: '13%', height: '51%' },
  { id: 'trophy', label: 'Figurine blason M8', preferredKind: 'trophy', left: '25%', top: '38%', width: '9%', height: '40%' },
  { id: 'left-extra', label: 'Bannière Paris', preferredKind: 'banner', left: '34%', top: '39%', width: '8%', height: '39%' },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '18%', width: '18%', height: '61%' },
  { id: 'badge', label: 'Badge M8 supporter', preferredKind: 'badge', left: '60%', top: '35%', width: '10%', height: '43%' },
  { id: 'title', label: 'Titre Gentle Mates Paris', preferredKind: 'title', left: '70%', top: '44%', width: '10%', height: '34%' },
  { id: 'ring', label: 'Jeton M8 supporter', preferredKind: 'ring', left: '80%', top: '48%', width: '8%', height: '30%' },
  { id: 'right-extra', label: 'Blason 3D M8', preferredKind: 'core', left: '88%', top: '41%', width: '6%', height: '37%' },
  { id: 'right-free', label: 'Carte de partage M8', preferredKind: 'banner', left: '94%', top: '41%', width: '6%', height: '37%' },
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
  { id: 'left-free', label: 'Cadre Fissure', preferredKind: 'frame', left: '2%', top: '43%', width: '11%', height: '35%' },
  { id: 'left-extra', label: 'Bannière Strate', preferredKind: 'banner', left: '14%', top: '34%', width: '11%', height: '44%' },
  { id: 'ring', label: 'Jeton Tellurique', preferredKind: 'ring', left: '26%', top: '42%', width: '10%', height: '36%' },
  { id: 'jersey', label: 'Armure Oréa', preferredKind: 'jersey', left: '37%', top: '18%', width: '21%', height: '60%' },
  { id: 'right-extra', label: 'Sigil de Braise', preferredKind: 'core', left: '59%', top: '31%', width: '11%', height: '47%' },
  { id: 'trophy', label: 'Totem Basalte', preferredKind: 'trophy', left: '71%', top: '35%', width: '10%', height: '43%' },
  { id: 'badge', label: 'Badge Artisan', preferredKind: 'badge', left: '82%', top: '40%', width: '8%', height: '38%' },
  { id: 'right-free', label: 'Carte de partage', preferredKind: 'banner', left: '91%', top: '44%', width: '8%', height: '34%' },
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
  { id: 'jersey', label: 'Cuirasse des Serments', preferredKind: 'jersey', left: '19%', top: '25%', width: '14%', height: '37%', artworkLift: 2 },
  { id: 'trophy', label: 'Totem des Trois Voix', preferredKind: 'trophy', left: '31%', top: '30%', width: '12%', height: '30%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '41%', top: '20%', width: '18%', height: '49%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Porte-Faille', preferredKind: 'badge', left: '58%', top: '33%', width: '12%', height: '28%', artworkLift: 3 },
  { id: 'right-extra', label: 'Hache de l’Éclipse', preferredKind: 'core', left: '69%', top: '29%', width: '13%', height: '33%', artworkLift: 3 },
  { id: 'left-extra', label: 'Bannière du Pacte', preferredKind: 'banner', left: '81%', top: '30%', width: '13%', height: '37%', artworkLift: 3 },
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
  { id: 'jersey', label: 'Dragon Veyr', preferredKind: 'jersey', left: '14%', top: '24%', width: '16%', height: '38%', artworkLift: 3 },
  { id: 'trophy', label: 'Œuf des Cimes', preferredKind: 'trophy', left: '27%', top: '28%', width: '13%', height: '30%', artworkLift: 3 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '40%', top: '17%', width: '20%', height: '46%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Veilleur', preferredKind: 'badge', left: '60%', top: '30%', width: '13%', height: '28%', artworkLift: 3 },
  { id: 'right-extra', label: 'Boussole des Neiges', preferredKind: 'core', left: '70%', top: '24%', width: '16%', height: '38%', artworkLift: 3 },
  { id: 'left-extra', label: 'Bannière du Serment', preferredKind: 'banner', left: '82%', top: '34%', width: '16%', height: '33%', artworkLift: 3 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const ARCANE_PACK_SLOTS = [
  { id: 'left-free', label: 'Cadre Treille', preferredKind: 'frame', left: '2%', top: '31%', width: '13%', height: '29%', artworkLift: 2 },
  { id: 'jersey', label: 'Brumousse', preferredKind: 'jersey', left: '11%', top: '20%', width: '15%', height: '34%', artworkLift: 2 },
  { id: 'trophy', label: 'Totem Bourgeon', preferredKind: 'trophy', left: '25%', top: '22%', width: '13%', height: '28%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '40%', top: '35%', width: '20%', height: '50%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Gardien', preferredKind: 'badge', left: '61%', top: '22%', width: '13%', height: '28%', artworkLift: 2 },
  { id: 'right-extra', label: 'Sceau du Conclave', preferredKind: 'core', left: '74%', top: '20%', width: '15%', height: '34%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Floraison', preferredKind: 'banner', left: '85%', top: '31%', width: '13%', height: '29%', artworkLift: 2 },
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
  { id: 'left-free', label: 'Cadre Balistique', preferredKind: 'frame', left: '1%', top: '38%', width: '17%', height: '40%', artworkLift: 2 },
  { id: 'jersey', label: 'Casque Sentinelle', preferredKind: 'jersey', left: '13%', top: '27%', width: '17%', height: '38%', artworkLift: 2 },
  { id: 'trophy', label: 'Drone Éclaireur', preferredKind: 'trophy', left: '27%', top: '30%', width: '14%', height: '31%', artworkLift: 2 },
  { id: 'rank', label: 'Rang central', preferredKind: 'rank', left: '39%', top: '17%', width: '22%', height: '51%', artworkLift: -1 },
  { id: 'badge', label: 'Badge Opérateur', preferredKind: 'badge', left: '59%', top: '30%', width: '14%', height: '31%', artworkLift: 2 },
  { id: 'right-extra', label: 'Carabine Vector', preferredKind: 'core', left: '70%', top: '27%', width: '17%', height: '38%', artworkLift: 2 },
  { id: 'left-extra', label: 'Bannière Escouade', preferredKind: 'banner', left: '82%', top: '38%', width: '17%', height: '40%', artworkLift: 2 },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const LEAGUE_OF_LEGENDS_COLLECTION_SLOTS = [
  { id: 'left-free', label: 'Lame d’Infini', preferredKind: 'core', left: '3%', top: '39%', width: '19%', height: '40%' },
  { id: 'left-extra', label: 'Fragment du Nexus', preferredKind: 'core', left: '23%', top: '27%', width: '16%', height: '52%' },
  { id: 'trophy', label: 'Jinx & Fishbones', preferredKind: 'trophy', left: '39%', top: '13%', width: '22%', height: '66%' },
  { id: 'right-extra', label: 'Baron Nashor', preferredKind: 'trophy', left: '61%', top: '23%', width: '20%', height: '56%' },
  { id: 'right-free', label: 'Balise de vision', preferredKind: 'ring', left: '82%', top: '34%', width: '15%', height: '45%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const VALORANT_COLLECTION_SLOTS = [
  { id: 'left-free', label: 'Vandal', preferredKind: 'core', left: '3%', top: '39%', width: '19%', height: '40%' },
  { id: 'left-extra', label: 'Spike', preferredKind: 'core', left: '23%', top: '27%', width: '16%', height: '52%' },
  { id: 'trophy', label: 'Jett', preferredKind: 'trophy', left: '39%', top: '13%', width: '22%', height: '66%' },
  { id: 'right-extra', label: 'Omen', preferredKind: 'trophy', left: '61%', top: '23%', width: '20%', height: '56%' },
  { id: 'right-free', label: 'Wingman', preferredKind: 'ring', left: '82%', top: '34%', width: '15%', height: '45%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

const ROCKET_LEAGUE_COLLECTION_SLOTS = [
  { id: 'left-free', label: 'Roue Zomba', preferredKind: 'ring', left: '3%', top: '28%', width: '19%', height: '51%' },
  { id: 'left-extra', label: 'Boost 100', preferredKind: 'core', left: '23%', top: '30%', width: '16%', height: '49%' },
  { id: 'trophy', label: 'Octane', preferredKind: 'trophy', left: '39%', top: '18%', width: '22%', height: '61%' },
  { id: 'right-extra', label: 'Ballon d’arène', preferredKind: 'trophy', left: '61%', top: '24%', width: '20%', height: '55%' },
  { id: 'right-free', label: 'Explosion de but', preferredKind: 'core', left: '82%', top: '33%', width: '15%', height: '46%' },
] as const satisfies readonly ShowcaseRoomSlotDefinition[];

export const SHOWCASE_PRESENTER_CATALOG: readonly ShowcasePresenterDefinition[] = [
  {
    id: 'supports_gallery',
    name: 'Cercle Obsidienne',
    description: 'Huit socles circulaires noirs organisés autour du rang central.',
    accent: '#31D7E2',
    image: require('../../../assets/shop/rooms/room-obsidian-gallery.png'),
    editorImage: require('../../../assets/shop/rooms/room-obsidian-gallery.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'obsidian',
    price: 0,
    rarity: 'commun',
    slots: OBSIDIAN_GALLERY_SLOTS,
  },
  {
    id: 'supports_forge',
    name: 'Galerie Bronze',
    description: 'Huit vitrines de musée bordées de bronze pour les pièces emblématiques.',
    accent: '#B4774E',
    image: require('../../../assets/shop/rooms/room-bronze-sanctum.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'bronze',
    price: 220,
    rarity: 'rare',
    slots: BRONZE_GALLERY_SLOTS,
  },
  {
    id: 'supports_halo',
    name: 'Carbone Mécanique',
    description: 'Dix stations techniques en carbone, serrées autour d’un noyau central.',
    accent: '#6D8492',
    image: require('../../../assets/shop/rooms/room-azure-horizon.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'steel',
    price: 280,
    rarity: 'epique',
    slots: MECHANICAL_CARBON_SLOTS,
  },
  {
    id: 'supports_crystal',
    name: 'Capsules Cristal',
    description: 'Huit capsules transparentes, lumineuses et parfaitement isolées.',
    accent: '#B9E8FF',
    image: require('../../../assets/shop/rooms/room-orbital-station.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'steel',
    price: 300,
    rarity: 'epique',
    slots: CRYSTAL_CAPSULE_SLOTS,
  },
  {
    id: 'supports_vault',
    name: 'Coffre-fort Acier',
    description: 'Dix niches blindées pour une collection dense et parfaitement cadrée.',
    accent: '#AEB9C1',
    image: require('../../../assets/shop/rooms/room-neon-hangar.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'steel',
    price: 320,
    rarity: 'epique',
    slots: STEEL_VAULT_SLOTS,
  },
  {
    id: 'supports_champagne',
    name: 'Podium Champagne',
    description: 'Six grandes scènes champagne qui donnent plus d’espace aux pièces fortes.',
    accent: '#D7B77A',
    image: require('../../../assets/shop/rooms/room-volcanic-forge.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
    pedestal: 'bronze',
    price: 240,
    rarity: 'rare',
    slots: CHAMPAGNE_PODIUM_SLOTS,
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
    image: require('../../../assets/shop/rooms/pack-conclave-arcanique.png'),
    sceneFrame: { width: 1844, height: 853, top: 0, bottom: 853 },
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
    image: require('../../../assets/shop/rooms/pack-dernier-round.png'),
    sceneFrame: { width: 1846, height: 852, top: 0, bottom: 852 },
    packId: 'dernier-round',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: LAST_ROUND_PACK_SLOTS,
  },
  {
    id: 'fnatic-pedestals',
    name: 'Fnatic Black & Orange',
    description: 'Dix emplacements noirs et orange conçus pour le pack officiel Fnatic.',
    accent: '#FF5900',
    image: require('../../../assets/shop/team-packs/fnatic/fnatic-black-orange-room-empty.png'),
    packId: 'fnatic-black-orange',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    slots: FNATIC_TEAM_PACK_SLOTS,
  },
  {
    id: 'kc-pedestals',
    name: 'Karmine Corp Blue Wall',
    description: 'Dix emplacements noir et bleu conçus pour le pack officiel Karmine Corp.',
    accent: '#168DFF',
    image: require('../../../assets/shop/team-packs/kc/kc-blue-wall-room-empty.png'),
    packId: 'kc-blue-wall',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    slots: KC_TEAM_PACK_SLOTS,
  },
  {
    id: 'm8-pedestals',
    name: 'M8 Gentle Mates Paris',
    description: 'Dix emplacements bleu nuit et argent conçus pour le pack officiel M8.',
    accent: '#B9DCFF',
    image: require('../../../assets/shop/team-packs/m8/m8-gentle-mates-room-empty.png'),
    packId: 'm8-gentle-mates',
    packOnly: true,
    pedestal: 'steel',
    price: 0,
    rarity: 'legendaire',
    slots: M8_TEAM_PACK_SLOTS,
  },
  {
    id: 'lol-jinx-fishbones-gallery',
    name: 'Collection League of Legends',
    description: 'Cinq socles noir et or dans une galerie de pierre claire aux accents cyan.',
    accent: '#D6B56A',
    image: require('../../../assets/shop/collections/league-of-legends/league-of-legends-collection-room-empty.png'),
    packId: 'league-of-legends-collection',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: LEAGUE_OF_LEGENDS_COLLECTION_SLOTS,
  },
  {
    id: 'valorant-jett-gallery',
    name: 'Collection Valorant',
    description: 'Cinq socles obsidienne dans une galerie de pierre claire aux accents corail.',
    accent: '#FF4655',
    image: require('../../../assets/shop/collections/valorant/valorant-collection-room-empty.png'),
    packId: 'valorant-collection',
    packOnly: true,
    pedestal: 'obsidian',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: VALORANT_COLLECTION_SLOTS,
  },
  {
    id: 'rocket-league-octane-gallery',
    name: 'Collection Rocket League',
    description: 'Cinq socles champagne dans une arène de pierre traversée de bleu et d’orange.',
    accent: '#FF8A24',
    image: require('../../../assets/shop/collections/rocket-league/rocket-league-collection-room-empty.png'),
    packId: 'rocket-league-collection',
    packOnly: true,
    pedestal: 'bronze',
    price: 0,
    rarity: 'legendaire',
    showRankDisplay: false,
    slots: ROCKET_LEAGUE_COLLECTION_SLOTS,
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
