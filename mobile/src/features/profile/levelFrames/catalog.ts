import type {
  LevelFrameCollectionEntry,
  LevelFrameDefinition,
  LevelFrameVariant,
} from './types';

export const LEVEL_FRAME_CATALOG: Record<LevelFrameVariant, LevelFrameDefinition> = {
  signalAscendant: {
    accent: '#31D7E2',
    description: 'Le cadre inclus qui gagne en matière, en lumière et en cristaux avec ton niveau réel.',
    name: 'Signal Ascendant',
    price: null,
    rarity: 'included',
    source: 'included',
    variant: 'signalAscendant',
  },
  voltRift: {
    accent: '#B8E62E',
    description: 'Une fracture Volt contenue par des éclats de graphite et des rails acides.',
    name: 'Faille Volt',
    price: 420,
    rarity: 'rare',
    source: 'volts',
    variant: 'voltRift',
  },
  azurOrbit: {
    accent: '#35A9FF',
    description: 'Un réseau orbital d’acier froid, ponctué de saphirs et d’un cristal polaire.',
    name: 'Orbite Azur',
    price: 680,
    rarity: 'epic',
    source: 'volts',
    variant: 'azurOrbit',
  },
  founderForge: {
    accent: '#E0A154',
    description: 'Un châssis de cuivre martelé réservé aux premiers bâtisseurs de GRIFF.',
    name: 'Forge Founder',
    price: null,
    rarity: 'legendary',
    source: 'founder_pack',
    variant: 'founderForge',
  },
  violetSovereign: {
    accent: '#A982FF',
    description: 'Une couronne de prismes violets enchâssée dans un alliage sombre et cérémoniel.',
    name: 'Souverain Violet',
    price: 940,
    rarity: 'epic',
    source: 'volts',
    variant: 'violetSovereign',
  },
  obsidianFracture: {
    accent: '#31D7E2',
    description: 'Des plaques d’obsidienne disjointes, traversées de coutures cyan et bronze.',
    name: 'Fracture Obsidienne',
    price: 1_180,
    rarity: 'legendary',
    source: 'volts',
    variant: 'obsidianFracture',
  },
  novaPrism: {
    accent: '#7FA7FF',
    description: 'La finition la plus dense : titane clair, prismes cyan et réfractions violettes.',
    name: 'Prisme Nova',
    price: 1_620,
    rarity: 'legendary',
    source: 'volts',
    variant: 'novaPrism',
  },
};

export const LEVEL_FRAME_CATALOG_ORDER: readonly LevelFrameVariant[] = [
  'signalAscendant',
  'voltRift',
  'azurOrbit',
  'founderForge',
  'violetSovereign',
  'obsidianFracture',
  'novaPrism',
];

export const PREVIEW_OWNED_LEVEL_FRAMES: readonly LevelFrameVariant[] = [
  'signalAscendant',
  'azurOrbit',
  'violetSovereign',
];

export function resolveOwnedLevelFrames({
  founder = false,
  preview = false,
}: {
  founder?: boolean;
  preview?: boolean;
} = {}): LevelFrameVariant[] {
  const owned = new Set<LevelFrameVariant>(['signalAscendant']);
  if (founder) owned.add('founderForge');
  if (preview) PREVIEW_OWNED_LEVEL_FRAMES.forEach((variant) => owned.add(variant));
  return LEVEL_FRAME_CATALOG_ORDER.filter((variant) => owned.has(variant));
}

export function resolveLevelFrameCollection(
  equipped: LevelFrameVariant,
  owned: readonly LevelFrameVariant[],
): LevelFrameCollectionEntry[] {
  const ownedSet = new Set<LevelFrameVariant>(['signalAscendant', ...owned]);
  return LEVEL_FRAME_CATALOG_ORDER.map((variant) => ({
    ...LEVEL_FRAME_CATALOG[variant],
    equipped: variant === equipped,
    owned: ownedSet.has(variant),
  }));
}
