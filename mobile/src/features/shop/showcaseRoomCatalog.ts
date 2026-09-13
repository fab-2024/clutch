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
  storePriceCents?: 399;
  productId: string;
  rarity: CosmeticRarity;
  sceneFrame: ShowcaseSceneFrame;
  slots: readonly ShowcaseRoomSlotDefinition[];
  theme: ShowcaseRoomTheme;
};

const FULL_ROOM_FRAME = { width: 1536, height: 1024, top: 0, bottom: 1024 } as const;
// Stable slot IDs preserve objects already placed by the player.
const SLOTS = [
  ['left-free', 'frame'], ['jersey', 'jersey'], ['trophy', 'trophy'], ['rank', 'rank'],
  ['badge', 'badge'], ['title', 'title'], ['ring', 'ring'], ['right-free', 'core'],
] as const;
const cabinetSlots: readonly ShowcaseRoomSlotDefinition[] = SLOTS.map(([id, preferredKind], index) => ({
  id, preferredKind, label: `Étagère ${index < 4 ? 1 : 2} · Place ${index % 4 + 1}`,
  left: `${7.6 + (index % 4) * 22.9}%`, width: '16%',
  top: index < 4 ? '12%' : '52%', height: '30%', artworkLift: 0,
}));
export const SHOWCASE_ROOM_CATALOG: readonly ShowcaseRoomDefinition[] = [
  { id: 'classique', name: 'Classique', description: 'Graphite · Métal noir · Blanc neutre. Incluse gratuitement.', accent: '#AAB2B8', image: require('../../../assets/shop/rooms/cabinet-classique.png'), lighting: 'white', pedestal: 'obsidian', price: 0, productId: 'supports_gallery', rarity: 'commun', sceneFrame: FULL_ROOM_FRAME, slots: cabinetSlots, theme: 'graphite' },
  { id: 'galerie', name: 'Galerie', description: 'Ivoire · Pierre claire · Blanc chaud.', accent: '#E9D6AD', image: require('../../../assets/shop/rooms/cabinet-galerie.png'), lighting: 'amber', pedestal: 'steel', price: 0, storePriceCents: 399, productId: 'cabinet_galerie', rarity: 'epique', sceneFrame: FULL_ROOM_FRAME, slots: cabinetSlots, theme: 'steel' },
  { id: 'midnight', name: 'Midnight', description: 'Tissu anthracite · Argent brossé · Bleu doux.', accent: '#86BCEF', image: require('../../../assets/shop/rooms/cabinet-midnight.png'), lighting: 'cyan', pedestal: 'steel', price: 0, storePriceCents: 399, productId: 'cabinet_midnight', rarity: 'epique', sceneFrame: FULL_ROOM_FRAME, slots: cabinetSlots, theme: 'carbon' },
];
const legacyIds = ['obsidian-gallery', 'azure-horizon', 'bronze-sanctum', 'orbital-station', 'neon-hangar', 'volcanic-forge'];
const legacyProducts = ['supports_halo', 'supports_forge', 'supports_crystal', 'supports_vault', 'supports_champagne'];
export function showcaseRoomById(id: string | null | undefined) {
  return SHOWCASE_ROOM_CATALOG.find(room => room.id === id)
    ?? (id && legacyIds.includes(id) ? SHOWCASE_ROOM_CATALOG[0] : null);
}
export function showcaseRoomByProductId(id: string | null | undefined) {
  return SHOWCASE_ROOM_CATALOG.find(room => room.productId === id)
    ?? (id && legacyProducts.includes(id) ? SHOWCASE_ROOM_CATALOG[0] : null);
}
