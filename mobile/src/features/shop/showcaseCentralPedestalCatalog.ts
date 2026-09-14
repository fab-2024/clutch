import type { ImageSourcePropType } from 'react-native';
import type { ShowcaseRoomSlotId } from '@/src/features/profile/showcase/roomEditor';

type CentralPedestalBackdrop = {
  floor: ImageSourcePropType;
  slotId: ShowcaseRoomSlotId;
  /** Full-image percentages, including the pedestal's contact shadow. */
  outline: string;
};

// The clean floors already exist. Reveal only the central pedestal footprint;
// the original room remains visible everywhere else, including all side seats.
const CENTRAL_PEDESTALS: Readonly<Record<string, CentralPedestalBackdrop>> = {
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
};

export function showcaseCentralPedestalBackdrop(roomId: string) {
  return CENTRAL_PEDESTALS[roomId] ?? null;
}
