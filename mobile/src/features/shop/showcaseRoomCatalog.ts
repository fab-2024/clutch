import type { ImageSourcePropType } from 'react-native';

import type {
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
} from '@/src/features/profile/components/showcase/types';

export type ShowcaseRoomDefinition = {
  accent: string;
  description: string;
  id: string;
  image: ImageSourcePropType;
  lighting: ShowcaseLighting;
  name: string;
  pedestal: ShowcasePedestalSkin;
  theme: ShowcaseRoomTheme;
};

export const SHOWCASE_ROOM_CATALOG: readonly ShowcaseRoomDefinition[] = [
  {
    id: 'obsidian-gallery',
    name: 'Galerie Obsidienne',
    description: 'Une galerie noire aux lignes bronze, pensée pour une collection dense.',
    accent: '#C58B55',
    image: require('../../../assets/shop/rooms/room-obsidian-gallery.png'),
    lighting: 'amber',
    pedestal: 'obsidian',
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
    theme: 'carbon',
  },
] as const;

export function showcaseRoomById(id: string | null | undefined) {
  return SHOWCASE_ROOM_CATALOG.find((room) => room.id === id) ?? null;
}
