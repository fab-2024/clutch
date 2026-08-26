import type { ImageSourcePropType } from 'react-native';

import type { RelicContainer } from './types';

export type RootBranch = {
  id: string;
  minStage: number;
  path: string;
  width: number;
};

type RelicArtworkFrame = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type RelicArtworkLayout = {
  height: number;
  top: number;
  width: number;
};

export type RelicStageArtworkConfig = {
  asset: ImageSourcePropType;
  heartScale: number;
  heartX: number;
  heartY: number;
  interiorPath: string;
  liquidLevel: number;
  liquidSurfaceWidth: number;
  stage: number;
  contactWidth: number;
  contactY: number;
  layout: RelicArtworkLayout;
  neutralMatte?: boolean;
  rootsFrame: RelicArtworkFrame;
};

export const RELIC_HEART_ASSET = require('../../../../assets/social/faction-relic-heart-v1.png');

export const RELIC_CONTAINER_SEQUENCE: readonly RelicContainer[] = [
  'ampoule',
  'fiole',
  'flacon',
  'reacteur',
  'reliquaire',
] as const;

export const RELIC_CONTAINER_LABELS: Record<RelicContainer, string> = {
  ampoule: 'Ampoule',
  fiole: 'Fiole',
  flacon: 'Flacon',
  reacteur: 'Bonbonne',
  reliquaire: 'Cuve',
};

export const ROOT_BRANCHES: readonly RootBranch[] = [
  { id: 'trunk-lower', minStage: 1, path: 'M66 108 C65 100 63 89 64 78', width: 1.9 },
  { id: 'first-left', minStage: 1, path: 'M64 94 C59 89 54 82 49 73', width: 1.32 },
  { id: 'first-right', minStage: 1, path: 'M64 91 C71 87 78 78 82 68', width: 1.26 },

  { id: 'trunk-middle', minStage: 2, path: 'M64 78 C63 71 64 64 65 58', width: 1.62 },
  { id: 'second-left', minStage: 2, path: 'M64 75 C59 70 54 64 49 59', width: 1.08 },
  { id: 'second-right', minStage: 2, path: 'M64 72 C72 68 78 62 84 57', width: 1.05 },
  { id: 'outer-left-fork', minStage: 2, path: 'M52 78 C48 73 45 69 42 64', width: .82 },

  { id: 'trunk-upper', minStage: 3, path: 'M65 58 C64 51 62 46 62 40', width: 1.42 },
  { id: 'third-left', minStage: 3, path: 'M59 67 C53 61 47 56 41 50', width: .92 },
  { id: 'third-right', minStage: 3, path: 'M71 67 C78 61 86 55 93 49', width: .9 },
  { id: 'left-secondary', minStage: 3, path: 'M49 59 C44 54 39 49 34 44', width: .68 },
  { id: 'right-secondary', minStage: 3, path: 'M84 57 C90 51 96 46 101 40', width: .66 },

  { id: 'crown-trunk', minStage: 4, path: 'M62 40 C62 34 65 29 67 24', width: 1.18 },
  { id: 'high-left', minStage: 4, path: 'M62 44 C56 39 51 34 46 30', width: .76 },
  { id: 'high-right', minStage: 4, path: 'M64 43 C70 38 77 33 83 28', width: .74 },
  { id: 'far-left', minStage: 4, path: 'M41 50 C35 46 29 41 24 37', width: .56 },
  { id: 'far-right', minStage: 4, path: 'M93 49 C100 44 106 39 112 33', width: .54 },

  { id: 'crown-tip', minStage: 5, path: 'M67 24 C68 19 66 15 64 11', width: .98 },
  { id: 'crown-left', minStage: 5, path: 'M66 22 C61 19 56 16 51 13', width: .6 },
  { id: 'crown-right', minStage: 5, path: 'M68 23 C73 19 78 16 82 12', width: .58 },
  { id: 'mature-left-tip', minStage: 5, path: 'M24 37 C20 32 16 28 12 24', width: .46 },
  { id: 'mature-left-low', minStage: 5, path: 'M34 44 C28 46 23 49 18 52', width: .44 },
  { id: 'mature-right-tip', minStage: 5, path: 'M112 33 C116 29 119 25 122 21', width: .44 },
] as const;

export const RELIC_STAGE_ARTWORK: Record<RelicContainer, RelicStageArtworkConfig> = {
  ampoule: {
    asset: require('../../../../assets/social/faction-relic-v5.png'),
    heartScale: 1,
    heartX: 110,
    heartY: 270,
    interiorPath: 'M76 176 C88 168 132 168 144 176 C151 204 148 246 136 274 C130 288 121 300 110 306 C99 300 90 288 84 274 C72 246 69 204 76 176 Z',
    liquidLevel: 176,
    liquidSurfaceWidth: 68,
    stage: 1,
    contactWidth: 72,
    contactY: 303,
    layout: { height: 330, top: -44, width: 220 },
    rootsFrame: { height: 120, width: 124, x: 48, y: 132 },
  },
  fiole: {
    asset: require('../../../../assets/social/relic-evolution/fiole-cutout-v1.png'),
    heartScale: 1.02,
    heartX: 110,
    heartY: 263,
    interiorPath: 'M78 190 C91 184 128 184 142 190 C144 220 143 259 137 280 C132 298 122 307 110 309 C98 307 88 298 83 280 C77 259 76 220 78 190 Z',
    liquidLevel: 190,
    liquidSurfaceWidth: 64,
    stage: 2,
    contactWidth: 52,
    contactY: 295,
    layout: { height: 295, top: -5, width: 220 },
    rootsFrame: { height: 90, width: 80, x: 70, y: 153 },
  },
  flacon: {
    asset: require('../../../../assets/social/relic-evolution/flacon-cutout-v1.png'),
    heartScale: 1.04,
    heartX: 110,
    heartY: 273,
    interiorPath: 'M50 190 C70 181 150 181 170 190 C176 217 173 257 162 281 C151 302 132 311 110 312 C88 311 69 302 58 281 C47 257 44 217 50 190 Z',
    liquidLevel: 190,
    liquidSurfaceWidth: 112,
    stage: 3,
    contactWidth: 92,
    contactY: 305,
    layout: { height: 295, top: -14, width: 220 },
    rootsFrame: { height: 90, width: 126, x: 47, y: 170 },
  },
  reacteur: {
    asset: require('../../../../assets/social/relic-evolution/reacteur-cutout-v1.png'),
    heartScale: 1.065,
    heartX: 110,
    heartY: 270,
    interiorPath: 'M62 188 C79 181 141 181 158 188 C163 214 161 255 151 281 C142 301 126 310 110 311 C94 310 78 301 69 281 C59 255 57 214 62 188 Z',
    liquidLevel: 188,
    liquidSurfaceWidth: 92,
    stage: 4,
    contactWidth: 98,
    contactY: 302,
    layout: { height: 295, top: -11, width: 220 },
    rootsFrame: { height: 70, width: 142, x: 39, y: 184 },
  },
  reliquaire: {
    asset: require('../../../../assets/social/relic-evolution/reliquaire-cutout-v1.png'),
    heartScale: 1.09,
    heartX: 110,
    heartY: 272,
    interiorPath: 'M54 201 C72 193 148 193 166 201 C171 225 168 259 157 283 C147 303 130 311 110 313 C90 311 73 303 63 283 C52 259 49 225 54 201 Z',
    liquidLevel: 201,
    liquidSurfaceWidth: 108,
    stage: 5,
    contactWidth: 112,
    contactY: 300,
    layout: { height: 295, top: -8, width: 220 },
    rootsFrame: { height: 50, width: 150, x: 35, y: 207 },
  },
};

export const SKIA_RELIC_STAGE_ARTWORK: Record<RelicContainer, RelicStageArtworkConfig> = {
  ampoule: {
    ...RELIC_STAGE_ARTWORK.ampoule,
    asset: require('../../../../assets/social/relic-evolution/skia-fiole-v2.png'),
    contactWidth: 80,
    contactY: 304,
    heartScale: .5,
    heartY: 267,
    layout: { height: 315, top: -20, width: 158 },
    liquidLevel: 100,
    liquidSurfaceWidth: 23,
    neutralMatte: true,
    rootsFrame: { height: 144, width: 58, x: 81, y: 100 },
  },
  fiole: {
    ...RELIC_STAGE_ARTWORK.fiole,
    asset: require('../../../../assets/social/relic-evolution/skia-ampoule-v2.png'),
    contactWidth: 120,
    contactY: 248,
    heartScale: .59,
    heartY: 214,
    layout: { height: 300, top: -20, width: 300 },
    liquidLevel: 108,
    liquidSurfaceWidth: 65,
    neutralMatte: true,
    rootsFrame: { height: 108, width: 116, x: 52, y: 144 },
  },
  flacon: {
    ...RELIC_STAGE_ARTWORK.flacon,
    asset: require('../../../../assets/social/relic-evolution/skia-flacon-v2.png'),
    contactWidth: 160,
    contactY: 225,
    heartScale: .66,
    heartY: 155,
    layout: { height: 300, top: -8, width: 300 },
    liquidLevel: 90,
    liquidSurfaceWidth: 115,
    neutralMatte: true,
    rootsFrame: { height: 94, width: 132, x: 44, y: 92 },
  },
  reacteur: {
    ...RELIC_STAGE_ARTWORK.reacteur,
    asset: require('../../../../assets/social/relic-evolution/skia-reacteur-v2.png'),
    contactWidth: 172,
    contactY: 300,
    heartScale: .68,
    heartY: 250,
    layout: { height: 330, top: -46, width: 260 },
    liquidLevel: 126,
    liquidSurfaceWidth: 95,
    neutralMatte: true,
    rootsFrame: { height: 136, width: 146, x: 37, y: 122 },
  },
  reliquaire: {
    ...RELIC_STAGE_ARTWORK.reliquaire,
    asset: require('../../../../assets/social/relic-evolution/skia-reliquaire-v2.png'),
    contactWidth: 192,
    contactY: 250,
    heartScale: .68,
    heartY: 190,
    layout: { height: 375, top: -66, width: 300 },
    liquidLevel: 120,
    liquidSurfaceWidth: 90,
    neutralMatte: true,
    rootsFrame: { height: 146, width: 164, x: 28, y: 86 },
  },
};

export function heartAssetForContainer(_container: RelicContainer): ImageSourcePropType {
  return RELIC_HEART_ASSET;
}

export function rootBranchesForContainer(container: RelicContainer): readonly RootBranch[] {
  const stage = RELIC_STAGE_ARTWORK[container].stage;
  return ROOT_BRANCHES.filter((branch) => branch.minStage <= stage);
}

export function relicContainerForPreview(value: string | undefined): RelicContainer {
  if (value === 'bonbonne') return 'reacteur';
  if (value === 'cuve') return 'reliquaire';
  if (RELIC_CONTAINER_SEQUENCE.includes(value as RelicContainer)) return value as RelicContainer;
  return 'ampoule';
}
