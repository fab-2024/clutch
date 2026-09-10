import type { ImageSourcePropType } from 'react-native';

import type { ShowcasePlaceableKind, ShowcaseRoomSlotId } from '@/src/features/profile/showcase/roomEditor';
import type { CosmeticRarity, CosmeticSlot } from '../types';

export type TeamPackItemDefinition = {
  accent: string;
  description: string;
  equipByDefault: boolean;
  id: string;
  image: ImageSourcePropType;
  name: string;
  number: number;
  rarity: CosmeticRarity;
  roomKind?: ShowcasePlaceableKind;
  roomSlot?: ShowcaseRoomSlotId;
  slot: CosmeticSlot;
};

export type CosmeticPackKind = 'game_collection' | 'original' | 'team';

export type TeamPackDefinition = {
  accent: string;
  brandKey: string;
  description: string;
  hero: ImageSourcePropType;
  id: string;
  items: readonly TeamPackItemDefinition[];
  kind: CosmeticPackKind;
  licenseHolder: string;
  name: string;
  price: number;
  subtitle: string;
  title: string;
};

export type TeamPackPrimaryAction =
  | 'buy'
  | 'equip'
  | 'equipped'
  | 'insufficient'
  | 'unavailable';
