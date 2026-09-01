import type { ImageSourcePropType } from 'react-native';

import type { RelicContainer } from './types';

export type RelicStageArtworkConfig = {
  asset: ImageSourcePropType;
  foregroundPaths?: readonly string[];
  interiorPath: string;
  liquidFloor: number;
  liquidLevel: number;
  liquidSurfaceProfile: readonly RelicLiquidSurfacePoint[];
  stage: number;
};

export type RelicLiquidSurfacePoint = {
  left: number;
  right: number;
  y: number;
};

export type RelicLiquidSurface = RelicLiquidSurfacePoint & {
  width: number;
  x: number;
};

export type RelicLiquidSurfaceOffsets = {
  center: number;
  left: number;
  right: number;
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
    foregroundPaths: [
      'M480 443 C456 470 431 512 419 558 C408 603 416 649 449 692 L464 677 C438 642 432 606 438 566 C445 522 463 484 489 454 Z',
      'M520 443 C544 470 569 512 581 558 C592 603 584 649 551 692 L536 677 C562 642 568 606 562 566 C555 522 537 484 511 454 Z',
      'M447 676 C465 688 535 688 553 676 L567 695 C542 710 458 710 433 695 Z',
    ],
    interiorPath: 'M481 447 C462 468 441 492 427 526 C413 560 409 604 418 636 C427 670 451 696 500 705 C549 696 573 670 582 636 C591 604 587 560 573 526 C559 492 538 468 519 447 Z',
    liquidFloor: 690,
    liquidLevel: 464,
    liquidSurfaceProfile: [
      { y: 464, left: 465, right: 535 },
      { y: 500, left: 440, right: 560 },
      { y: 540, left: 422, right: 578 },
      { y: 580, left: 414, right: 586 },
      { y: 620, left: 417, right: 583 },
      { y: 660, left: 433, right: 567 },
      { y: 690, left: 463, right: 537 },
    ],
    stage: 1,
  },
  fiole: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-fiole.png'),
    foregroundPaths: [
      'M449 472 C463 465 537 465 551 472 L551 526 C537 533 463 533 449 526 Z',
    ],
    interiorPath: 'M468 282 C476 278 524 278 532 282 L532 686 C526 695 474 695 468 686 Z',
    liquidFloor: 686,
    liquidLevel: 318,
    liquidSurfaceProfile: [
      { y: 318, left: 474, right: 526 },
      { y: 410, left: 471, right: 529 },
      { y: 500, left: 471, right: 529 },
      { y: 590, left: 471, right: 529 },
      { y: 686, left: 474, right: 526 },
    ],
    stage: 2,
  },
  flacon: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-flacon.png'),
    interiorPath: 'M500 421 C422 421 371 468 359 535 C346 605 392 666 458 684 C480 690 520 690 542 684 C608 666 654 605 641 535 C629 468 578 421 500 421 Z',
    liquidFloor: 676,
    liquidLevel: 438,
    liquidSurfaceProfile: [
      { y: 438, left: 427, right: 573 },
      { y: 470, left: 395, right: 605 },
      { y: 510, left: 370, right: 630 },
      { y: 550, left: 359, right: 641 },
      { y: 590, left: 365, right: 635 },
      { y: 630, left: 386, right: 614 },
      { y: 660, left: 421, right: 579 },
      { y: 676, left: 458, right: 542 },
    ],
    stage: 3,
  },
  reacteur: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-bonbonne.png'),
    interiorPath: 'M500 269 C446 269 417 307 411 357 L411 610 C411 650 447 674 500 674 C553 674 589 650 589 610 L589 357 C583 307 554 269 500 269 Z',
    liquidFloor: 660,
    liquidLevel: 292,
    liquidSurfaceProfile: [
      { y: 292, left: 456, right: 544 },
      { y: 320, left: 428, right: 572 },
      { y: 360, left: 415, right: 585 },
      { y: 420, left: 412, right: 588 },
      { y: 500, left: 412, right: 588 },
      { y: 600, left: 415, right: 585 },
      { y: 640, left: 440, right: 560 },
      { y: 660, left: 472, right: 528 },
    ],
    stage: 4,
  },
  reliquaire: {
    asset: require('../../../../assets/social/relic-evolution/relic-scene-cuve.png'),
    interiorPath: 'M500 238 C449 250 411 297 397 369 C380 457 411 565 456 642 C475 675 488 691 500 705 C512 691 525 675 544 642 C589 565 620 457 603 369 C589 297 551 250 500 238 Z',
    liquidFloor: 680,
    liquidLevel: 278,
    liquidSurfaceProfile: [
      { y: 278, left: 458, right: 542 },
      { y: 320, left: 425, right: 575 },
      { y: 380, left: 397, right: 603 },
      { y: 450, left: 390, right: 610 },
      { y: 520, left: 407, right: 593 },
      { y: 590, left: 435, right: 565 },
      { y: 650, left: 466, right: 534 },
      { y: 680, left: 486, right: 514 },
    ],
    stage: 5,
  },
};

export function relicLiquidLevelForRatio(
  config: RelicStageArtworkConfig,
  fillRatio: number,
) {
  const ratio = Math.max(0, Math.min(1, fillRatio));
  return config.liquidFloor - (config.liquidFloor - config.liquidLevel) * ratio;
}

export function relicLiquidSurfaceForLevel(
  config: RelicStageArtworkConfig,
  level: number,
): RelicLiquidSurface {
  'worklet';
  const profile = config.liquidSurfaceProfile;
  const clampedLevel = Math.max(profile[0].y, Math.min(profile[profile.length - 1].y, level));
  let lower = profile[0];
  let upper = profile[profile.length - 1];

  for (let index = 1; index < profile.length; index += 1) {
    if (clampedLevel <= profile[index].y) {
      lower = profile[index - 1];
      upper = profile[index];
      break;
    }
  }

  const span = Math.max(.000_1, upper.y - lower.y);
  const ratio = (clampedLevel - lower.y) / span;
  const left = lower.left + (upper.left - lower.left) * ratio;
  const right = lower.right + (upper.right - lower.right) * ratio;

  return {
    left,
    right,
    width: right - left,
    x: (left + right) / 2,
    y: clampedLevel,
  };
}

function formatRelicCoordinate(value: number) {
  'worklet';
  return Number(value.toFixed(2)).toString();
}

/**
 * Builds the one visible surface used by the interactive liquid. The three
 * offsets are expected to preserve their weighted mean, so motion deforms the
 * surface without changing the represented fill amount.
 */
export function relicLiquidDynamicSurfacePathForLevel(
  config: RelicStageArtworkConfig,
  level: number,
  inset: number,
  offsets: RelicLiquidSurfaceOffsets,
) {
  'worklet';
  const surface = relicLiquidSurfaceForLevel(config, level);
  if (surface.y >= config.liquidFloor - .01) return '';

  const safeInset = Math.min(Math.max(0, inset), surface.width * .18);
  const left = surface.left + safeInset;
  const right = surface.right - safeInset;
  const width = right - left;
  const center = (left + right) / 2;
  const meniscusDepth = Math.max(2, Math.min(4.5, width * .025));
  const leftY = surface.y - meniscusDepth * (2 / 3) + offsets.left;
  const centerY = surface.y + meniscusDepth / 3 + offsets.center;
  const rightY = surface.y - meniscusDepth * (2 / 3) + offsets.right;

  return [
    `M${formatRelicCoordinate(left)} ${formatRelicCoordinate(leftY)}`,
    `C${formatRelicCoordinate(left + width * .18)} ${formatRelicCoordinate(leftY + (centerY - leftY) * .44)}`,
    `${formatRelicCoordinate(left + width * .37)} ${formatRelicCoordinate(centerY)}`,
    `${formatRelicCoordinate(center)} ${formatRelicCoordinate(centerY)}`,
    `C${formatRelicCoordinate(right - width * .37)} ${formatRelicCoordinate(centerY)}`,
    `${formatRelicCoordinate(right - width * .18)} ${formatRelicCoordinate(rightY + (centerY - rightY) * .44)}`,
    `${formatRelicCoordinate(right)} ${formatRelicCoordinate(rightY)}`,
  ].join(' ');
}

/**
 * Closes the animated surface against the fixed cavity profile. Only the top
 * boundary changes; the floor and side volume stay anchored to the vessel.
 */
export function relicLiquidDynamicVolumePathForLevel(
  config: RelicStageArtworkConfig,
  level: number,
  inset: number,
  offsets: RelicLiquidSurfaceOffsets,
) {
  'worklet';
  const surfacePath = relicLiquidDynamicSurfacePathForLevel(config, level, inset, offsets);
  if (!surfacePath) return '';

  const safeInset = Math.max(0, inset);
  const lowerBoundary = config.liquidSurfaceProfile.filter((point) => point.y > level);
  const rightBoundary = lowerBoundary.map((point) => (
    `${formatRelicCoordinate(point.right - Math.min(safeInset, (point.right - point.left) * .18))} ${formatRelicCoordinate(point.y)}`
  ));
  const leftBoundary = [...lowerBoundary].reverse().map((point) => (
    `${formatRelicCoordinate(point.left + Math.min(safeInset, (point.right - point.left) * .18))} ${formatRelicCoordinate(point.y)}`
  ));

  return [
    surfacePath,
    rightBoundary.length ? `L${rightBoundary.join(' L')}` : '',
    leftBoundary.length ? `L${leftBoundary.join(' L')}` : '',
    'Z',
  ].filter(Boolean).join(' ');
}

/**
 * Builds the liquid itself as a closed silhouette instead of painting a
 * viewport-wide rectangle and hoping that a renderer clips it correctly.
 * The vessel clip remains a final antialiasing guard, while this path makes
 * the visible volume intrinsically unable to leave the cavity profile.
 */
export function relicLiquidVolumePathForLevel(
  config: RelicStageArtworkConfig,
  level: number,
  inset = 4,
) {
  const surface = relicLiquidSurfaceForLevel(config, level);
  if (surface.y >= config.liquidFloor - .01) return '';

  const boundary = [
    surface,
    ...config.liquidSurfaceProfile.filter((point) => point.y > surface.y),
  ];
  const safeInset = Math.max(0, inset);
  const rightBoundary = boundary.map((point) => (
    `${formatRelicCoordinate(point.right - Math.min(safeInset, (point.right - point.left) * .18))} ${formatRelicCoordinate(point.y)}`
  ));
  const leftBoundary = [...boundary].reverse().map((point) => (
    `${formatRelicCoordinate(point.left + Math.min(safeInset, (point.right - point.left) * .18))} ${formatRelicCoordinate(point.y)}`
  ));

  return [
    `M${leftBoundary.at(-1)}`,
    `L${rightBoundary.join(' L')}`,
    `L${leftBoundary.join(' L')}`,
    'Z',
  ].join(' ');
}

export function relicLiquidMeniscusPathForLevel(
  config: RelicStageArtworkConfig,
  level: number,
  inset = 6,
) {
  const surface = relicLiquidSurfaceForLevel(config, level);
  if (surface.y >= config.liquidFloor - .01) return '';

  const safeInset = Math.min(Math.max(0, inset), surface.width * .18);
  const left = surface.left + safeInset;
  const right = surface.right - safeInset;
  const width = right - left;
  const depth = Math.max(4, Math.min(10, surface.width * .055));

  return [
    `M${formatRelicCoordinate(left)} ${formatRelicCoordinate(surface.y)}`,
    `C${formatRelicCoordinate(left + width * .24)} ${formatRelicCoordinate(surface.y + depth)}`,
    `${formatRelicCoordinate(right - width * .24)} ${formatRelicCoordinate(surface.y + depth)}`,
    `${formatRelicCoordinate(right)} ${formatRelicCoordinate(surface.y)}`,
    `C${formatRelicCoordinate(right - width * .28)} ${formatRelicCoordinate(surface.y - depth * .45)}`,
    `${formatRelicCoordinate(left + width * .28)} ${formatRelicCoordinate(surface.y - depth * .45)}`,
    `${formatRelicCoordinate(left)} ${formatRelicCoordinate(surface.y)}`,
    'Z',
  ].join(' ');
}

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
