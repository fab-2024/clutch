import type { ImageSourcePropType } from 'react-native';

import type { RelicContainer } from './types';

export type RelicStageArtworkConfig = {
  asset: ImageSourcePropType;
  interiorPath: string;
  liquidLevel: number;
  liquidSurfaceWidth: number;
  liquidSurfaceX: number;
  stage: number;
};

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

export const RELIC_STAGE_ARTWORK: Record<RelicContainer, RelicStageArtworkConfig> = {
  ampoule: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-ampoule.png'),
    interiorPath: 'M480 450 C430 500 410 570 415 625 C420 675 454 705 500 714 C546 705 580 675 585 625 C590 570 570 500 520 450 Z',
    liquidLevel: 510,
    liquidSurfaceWidth: 132,
    liquidSurfaceX: 500,
    stage: 1,
  },
  fiole: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-fiole.png'),
    interiorPath: 'M462 285 C474 278 526 278 538 285 L538 684 C532 704 468 704 462 684 Z',
    liquidLevel: 410,
    liquidSurfaceWidth: 70,
    liquidSurfaceX: 500,
    stage: 2,
  },
  flacon: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-flacon.png'),
    interiorPath: 'M500 390 C402 390 360 445 360 540 C360 630 420 685 500 690 C580 685 640 630 640 540 C640 445 598 390 500 390 Z',
    liquidLevel: 460,
    liquidSurfaceWidth: 238,
    liquidSurfaceX: 500,
    stage: 3,
  },
  reacteur: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-bonbonne.png'),
    interiorPath: 'M440 240 C410 255 395 300 395 350 L395 620 C400 665 440 690 500 690 C560 690 600 665 605 620 L605 350 C605 300 590 255 560 240 Z',
    liquidLevel: 345,
    liquidSurfaceWidth: 188,
    liquidSurfaceX: 500,
    stage: 4,
  },
  reliquaire: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-cuve.png'),
    interiorPath: 'M500 220 C430 220 385 285 390 400 C395 530 445 645 500 700 C555 645 605 530 610 400 C615 285 570 220 500 220 Z',
    liquidLevel: 320,
    liquidSurfaceWidth: 174,
    liquidSurfaceX: 500,
    stage: 5,
  },
};

export function relicContainerForLevel(level: number): RelicContainer {
  const index = Math.max(0, Math.min(RELIC_CONTAINER_SEQUENCE.length - 1, Math.floor(level) - 1));
  return RELIC_CONTAINER_SEQUENCE[index];
}

export function relicContainerForPreview(value: string | undefined): RelicContainer {
  if (value === 'bonbonne') return 'reacteur';
  if (value === 'cuve') return 'reliquaire';
  if (RELIC_CONTAINER_SEQUENCE.includes(value as RelicContainer)) return value as RelicContainer;
  return 'ampoule';
}
