export const LEVEL_FRAME_VARIANTS = [
  'signalAscendant',
  'voltRift',
  'azurOrbit',
  'founderForge',
  'violetSovereign',
  'obsidianFracture',
  'novaPrism',
] as const;

export type LevelFrameVariant = typeof LEVEL_FRAME_VARIANTS[number];

export type LevelFrameRarity = 'included' | 'rare' | 'epic' | 'legendary';

export type LevelFrameSource = 'included' | 'volts' | 'founder_pack';

export type LevelFrameDefinition = {
  accent: string;
  description: string;
  name: string;
  price: number | null;
  rarity: LevelFrameRarity;
  source: LevelFrameSource;
  variant: LevelFrameVariant;
};

export type LevelFrameCollectionEntry = LevelFrameDefinition & {
  equipped: boolean;
  owned: boolean;
};

export type LevelFrameProps = {
  level: number;
  variant: LevelFrameVariant;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
};
