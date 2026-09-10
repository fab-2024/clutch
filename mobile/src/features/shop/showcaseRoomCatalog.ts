import type { ImageSourcePropType } from 'react-native';

import type {
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
} from '@/src/features/profile/components/showcase/types';
import type { ShowcaseRoomSlotDefinition } from '@/src/features/profile/showcase/roomEditor';
import type { ShowcaseSceneFrame } from '@/src/features/profile/components/showcase/showcaseSceneLayout';

import type { CosmeticRarity } from './types';

export type ShowcaseRoomDefinition = {
  accent: string;
  description: string;
  id: string;
  image: ImageSourcePropType;
  lighting: ShowcaseLighting;
  name: string;
  pedestal: ShowcasePedestalSkin;
  price: number;
  productId: string;
  rarity: CosmeticRarity;
  sceneFrame: ShowcaseSceneFrame;
  slots: readonly ShowcaseRoomSlotDefinition[];
  theme: ShowcaseRoomTheme;
};

const FULL_ROOM_FRAME = { width: 1844, height: 853, top: 0, bottom: 853 } as const;

const ROOM_SLOT_BLUEPRINT = [
  { id: 'left-free', label: 'Emplacement gauche', preferredKind: 'frame', left: '1.8%', top: 38, width: '9.4%', artworkLift: 3.5 },
  { id: 'jersey', label: 'Emplacement maillot', preferredKind: 'jersey', left: '12.2%', top: 28, width: '13%', artworkLift: 4 },
  { id: 'trophy', label: 'Emplacement trophée', preferredKind: 'trophy', left: '26.2%', top: 31, width: '10.5%', artworkLift: 4 },
  { id: 'rank', label: 'Emplacement central', preferredKind: 'rank', left: '43%', top: 20, width: '14%', artworkLift: 2 },
  { id: 'badge', label: 'Emplacement badge', preferredKind: 'badge', left: '59.8%', top: 31, width: '10.5%', artworkLift: 4 },
  { id: 'title', label: 'Emplacement titre', preferredKind: 'title', left: '70%', top: 38, width: '10.5%', artworkLift: 3.5 },
  { id: 'ring', label: 'Emplacement anneau', preferredKind: 'ring', left: '80.5%', top: 42, width: '8%', artworkLift: 3.5 },
  { id: 'right-free', label: 'Emplacement droit', preferredKind: 'core', left: '90%', top: 38, width: '8%', artworkLift: 3.5 },
] as const;

type RoomSlotBottoms = readonly [number, number, number, number, number, number, number, number];

function createRoomSlots(bottoms: RoomSlotBottoms): readonly ShowcaseRoomSlotDefinition[] {
  return ROOM_SLOT_BLUEPRINT.map((slot, index) => ({
    ...slot,
    height: percent(bottoms[index] - slot.top),
    top: percent(slot.top),
  }));
}

function percent(value: number): `${number}%` {
  return `${value}%`;
}

export const SHOWCASE_ROOM_CATALOG: readonly ShowcaseRoomDefinition[] = [
  {
    id: 'obsidian-gallery',
    name: 'Galerie Obsidienne',
    description: 'Une galerie noire aux lignes bronze, pensée pour une collection dense.',
    accent: '#C58B55',
    image: require('../../../assets/shop/rooms/room-obsidian-gallery.png'),
    lighting: 'amber',
    pedestal: 'obsidian',
    price: 0,
    productId: 'supports_gallery',
    rarity: 'commun',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([68, 66, 64.5, 60.5, 64.5, 66, 68, 68]),
    theme: 'graphite',
  },
  {
    id: 'azure-horizon',
    name: 'Horizon Azur',
    description: 'Une salle panoramique ouverte sur la mer et baignée de lumière froide.',
    accent: '#69C6FF',
    image: require('../../../assets/shop/rooms/room-azure-horizon.png'),
    lighting: 'cyan',
    pedestal: 'steel',
    price: 280,
    productId: 'supports_halo',
    rarity: 'epique',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([67, 65.5, 64, 63, 64, 65.5, 67, 67]),
    theme: 'azure',
  },
  {
    id: 'bronze-sanctum',
    name: 'Sanctuaire Bronze',
    description: 'Des arches cérémonielles et une lumière chaude pour les pièces majeures.',
    accent: '#E2A451',
    image: require('../../../assets/shop/rooms/room-bronze-sanctum.png'),
    lighting: 'amber',
    pedestal: 'bronze',
    price: 220,
    productId: 'supports_forge',
    rarity: 'rare',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([68, 66, 65, 62, 65, 66, 68, 68]),
    theme: 'museum',
  },
  {
    id: 'orbital-station',
    name: 'Station Orbitale',
    description: 'Une vitrine blanche en orbite, cadrée par la courbe de la planète.',
    accent: '#B9DDFF',
    image: require('../../../assets/shop/rooms/room-orbital-station.png'),
    lighting: 'white',
    pedestal: 'steel',
    price: 300,
    productId: 'supports_crystal',
    rarity: 'epique',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([70, 68.5, 67, 63, 67, 68.5, 70, 70]),
    theme: 'steel',
  },
  {
    id: 'neon-hangar',
    name: 'Hangar Nocturne',
    description: 'Un atelier industriel surplombant la ville et ses signaux néon.',
    accent: '#A56DFF',
    image: require('../../../assets/shop/rooms/room-neon-hangar.png'),
    lighting: 'violet',
    pedestal: 'obsidian',
    price: 320,
    productId: 'supports_vault',
    rarity: 'epique',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([69, 67, 65, 62, 65, 67, 69, 69]),
    theme: 'carbon',
  },
  {
    id: 'volcanic-forge',
    name: 'Forge Volcanique',
    description: 'Une chambre de basalte traversée par les reflets d’une forge en fusion.',
    accent: '#FF7A2F',
    image: require('../../../assets/shop/rooms/room-volcanic-forge.png'),
    lighting: 'amber',
    pedestal: 'bronze',
    price: 240,
    productId: 'supports_champagne',
    rarity: 'rare',
    sceneFrame: FULL_ROOM_FRAME,
    slots: createRoomSlots([65, 63, 62, 59, 62, 63, 65, 65]),
    theme: 'carbon',
  },
] as const;

export function showcaseRoomById(id: string | null | undefined) {
  return SHOWCASE_ROOM_CATALOG.find((room) => room.id === id) ?? null;
}

export function showcaseRoomByProductId(id: string | null | undefined) {
  return SHOWCASE_ROOM_CATALOG.find((room) => room.productId === id) ?? null;
}
