import type { ImageSourcePropType } from 'react-native';
import type { ShowcaseRoomSlotId } from '@/src/features/profile/showcase/roomEditor';

type CentralPedestalBackdrop = {
  floor: ImageSourcePropType;
  slotId: ShowcaseRoomSlotId;
  /** Full-image percentages, including the pedestal's contact shadow. */
  outline: string;
};

const OBSIDIAN: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-obsidian-gallery-floor.jpg'),
  slotId: 'rank', outline: '44,53 56,53 58,64 59,70 41,70 42,64',
};
const BRONZE: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-bronze-sanctum-floor.jpg'),
  slotId: 'rank', outline: '43,57 57,57 58,72 42,72',
};
const AZURE: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-azure-horizon-floor.jpg'),
  slotId: 'rank', outline: '43,57 57,57 59,71 41,71',
};
const ORBITAL: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-orbital-station-floor.jpg'),
  slotId: 'rank', outline: '44,56 56,56 59,75 41,75',
};
const HANGAR: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-neon-hangar-floor.jpg'),
  slotId: 'rank', outline: '44,55 57,55 59,71 42,71',
};
const VOLCANIC: CentralPedestalBackdrop = {
  floor: require('../../../assets/shop/rooms/room-volcanic-forge-floor.jpg'),
  slotId: 'rank', outline: '43,52 57,52 58,70 42,70',
};

// The clean floors already exist. Reveal only the central pedestal footprint;
// the original room remains visible everywhere else, including all side seats.
const CENTRAL_PEDESTALS: Readonly<Record<string, CentralPedestalBackdrop>> = {
  'obsidian-gallery': OBSIDIAN, supports_gallery: OBSIDIAN,
  'bronze-sanctum': BRONZE, supports_forge: BRONZE,
  'azure-horizon': AZURE, supports_halo: AZURE,
  'orbital-station': ORBITAL, supports_crystal: ORBITAL,
  'neon-hangar': HANGAR, supports_vault: HANGAR,
  'volcanic-forge': VOLCANIC, supports_champagne: VOLCANIC,
  'sang-des-titans-monolith-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-sang-des-titans-floor.jpg'),
    slotId: 'rank', outline: '40,64 60,64 64,75 64,83 36,83 36,75',
  },
  'chute-libre-drop-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-chute-libre-floor.jpg'),
    slotId: 'rank', outline: '42,59 57,59 60,70 60,74 39,74 39,70',
  },
  'serment-du-givre-ice-sheet-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-serment-du-givre-floor.jpg'),
    slotId: 'rank', outline: '43,55 57,55 60,65 60,74 39,74 39,65',
  },
  'conclave-arcanique-rosette-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-conclave-arcanique-frontal-no-center.png'),
    slotId: 'rank', outline: '42,50 58,50 58,58 58,64 42,64 42,58',
  },
  'turbo-arena-kickoff-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-turbo-arena-floor.jpg'),
    slotId: 'rank', outline: '40,55 60,55 64,64 64,74 35,74 35,64',
  },
  'dernier-round-extraction-pedestal': {
    floor: require('../../../assets/shop/rooms/pack-dernier-round-frontal-no-center.png'),
    slotId: 'rank', outline: '37,66 63,66 64,75 64,82 36,82 36,75',
  },
  'neon-protocol-vector-pedestals': {
    floor: require('../../../assets/shop/packs/neon-protocol/neon-protocol-room-floor.jpg'),
    slotId: 'right-extra', outline: '44,63 56,63 60,72 60,78 40,78 40,72',
  },
  'mythes-forge-magma-pedestals': {
    floor: require('../../../assets/shop/packs/mythes-forge/mythes-forge-room-floor.jpg'),
    slotId: 'jersey', outline: '42,75 58,75 64,86 64,98 36,98 36,86',
  },
  'circuit-zero-aero-pedestals': {
    floor: require('../../../assets/shop/packs/circuit-zero/circuit-zero-room-floor.jpg'),
    slotId: 'jersey', outline: '38,59 62,59 70,74 70,77 30,77 30,74',
  },
  'fnatic-pedestals': {
    floor: require('../../../assets/shop/team-packs/fnatic/fnatic-black-orange-room-floor.jpg'),
    slotId: 'rank', outline: '41,59 58,59 61,67 61,73 65,77 65,84 34,84 34,77 38,73 38,67',
  },
  'kc-pedestals': {
    floor: require('../../../assets/shop/team-packs/kc/kc-blue-wall-room-floor.jpg'),
    slotId: 'rank', outline: '42,58 58,58 61,65 61,70 64,75 64,82 36,82 36,75 39,70 39,65',
  },
  'm8-pedestals': {
    floor: require('../../../assets/shop/team-packs/m8/m8-gentle-mates-room-floor.jpg'),
    slotId: 'rank', outline: '41,58 59,58 62,66 62,72 65,77 65,82 35,82 35,77 38,72 38,66',
  },
  'lol-jinx-fishbones-gallery': {
    floor: require('../../../assets/shop/collections/league-of-legends/league-of-legends-collection-room-floor.jpg'),
    slotId: 'trophy', outline: '42,66 58,66 60,80 64,88 64,96 36,96 36,88 40,80',
  },
  'valorant-jett-gallery': {
    floor: require('../../../assets/shop/collections/valorant/valorant-collection-room-floor.jpg'),
    slotId: 'trophy', outline: '42,65 58,65 61,77 61,86 38,86 38,77',
  },
  'rocket-league-octane-gallery': {
    floor: require('../../../assets/shop/collections/rocket-league/rocket-league-collection-room-floor.jpg'),
    slotId: 'trophy', outline: '40,65 59,65 62,78 62,84 36,84 36,78',
  },
};

export function showcaseCentralPedestalBackdrop(roomId: string) {
  return CENTRAL_PEDESTALS[roomId] ?? null;
}
