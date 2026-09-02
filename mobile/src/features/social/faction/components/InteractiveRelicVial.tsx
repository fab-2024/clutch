import {
  BlurMask,
  Canvas,
  Circle,
  FitBox,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RadialGradient,
  rect,
  type SkImage,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
} from 'react';
import { type ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  ClipPath as SvgClipPath,
  Defs as SvgDefs,
  G as SvgGroup,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  RadialGradient as SvgRadialGradient,
  Stop as SvgStop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  RELIC_STAGE_ARTWORK,
  relicLiquidDynamicSurfacePathForLevel,
  relicLiquidDynamicVolumePathForLevel,
  relicLiquidLevelForRatio,
  relicLiquidSurfaceForLevel,
  relicLiquidVolumePathForLevel,
} from '@/src/features/social/faction/relicArtwork';
import {
  RELIC_MUTATION_RELEASE_MS,
  RELIC_MUTATION_RUPTURE_MS,
  RELIC_MUTATION_RUPTURE_PROGRESS,
  relicMutationBoilEnergy,
  relicMutationBurstPhase,
  relicMutationCharge,
  relicMutationCrackOpacity,
  relicMutationCrackProgress,
  relicMutationFlashOpacity,
  relicMutationHeartScale,
  relicMutationMaterialization,
  relicMutationOldVesselOpacity,
  relicMutationOverheatEnergy,
  relicMutationShardGlintOpacity,
  relicMutationShardOpacity,
  relicMutationShockwaveOpacity,
  relicMutationShockwavePhase,
  relicMutationSplashDryProgress,
  relicMutationSplashEdgeOpacity,
  relicMutationSplashFillOpacity,
  relicMutationSplashSheenOpacity,
} from '@/src/features/social/faction/relicMutationMotion';
import type { RelicContainer } from '@/src/features/social/faction/types';

import StaticRelicVial from './StaticRelicVial';
import { RelicVesselForegroundArtwork } from './RelicEnergyArtwork';

const ARTBOARD_SIZE = 1_000;
const REACTION_DURATION_MS = 1_650;
const REDUCED_MUTATION_CHARGE_MS = 160;
const REDUCED_MUTATION_RELEASE_MS = 260;

// Generated deterministically from the scene's warm pixels. It contains the
// exact antialiased heart and roots on transparency, with no invented drawing.
const AMPOULE_ANATOMY_ASSET = require('../../../../../assets/social/relic-evolution/relic-scene-ampoule-anatomy.png') as number;
const AMPOULE_DORMANT_ANATOMY_ASSET = require('../../../../../assets/social/relic-evolution/relic-scene-ampoule-anatomy-dormant.png') as number;
const AMPOULE_ROOT_REGION = 'M445 430 H555 V625 H445 Z';
const AMPOULE_HEART_REGION = 'M465 585 H535 V705 H465 Z';
const AMPOULE_ROOT_BANDS = {
  lower: 'M445 555 H555 V625 H445 Z',
  middle: 'M445 495 H555 V565 H445 Z',
  upper: 'M445 430 H555 V505 H445 Z',
} as const;

const BUBBLES = [
  { duration: .4, horizontalPosition: -.72, radius: 5, sourceLift: 12, start: .08, sway: -10 },
  { duration: .48, horizontalPosition: -.35, radius: 7, sourceLift: 34, start: .13, sway: 13 },
  { duration: .36, horizontalPosition: .18, radius: 4, sourceLift: 18, start: .2, sway: -8 },
  { duration: .45, horizontalPosition: .64, radius: 6, sourceLift: 48, start: .24, sway: 11 },
  { duration: .34, horizontalPosition: -.58, radius: 3.5, sourceLift: 54, start: .34, sway: 7 },
  { duration: .4, horizontalPosition: .48, radius: 4.5, sourceLift: 26, start: .38, sway: -12 },
  { duration: .3, horizontalPosition: -.04, radius: 3, sourceLift: 8, start: .48, sway: 6 },
] as const;

const MUTATION_BUBBLES = [
  { duration: .31, horizontalPosition: -.82, radius: 6, sourceLift: 4, start: .02, sway: -14 },
  { duration: .23, horizontalPosition: -.64, radius: 10, sourceLift: 28, start: .09, sway: 18 },
  { duration: .36, horizontalPosition: -.46, radius: 7, sourceLift: 13, start: .17, sway: -11 },
  { duration: .2, horizontalPosition: -.25, radius: 13, sourceLift: 42, start: .24, sway: 15 },
  { duration: .28, horizontalPosition: -.08, radius: 8, sourceLift: 6, start: .31, sway: -17 },
  { duration: .18, horizontalPosition: .12, radius: 11, sourceLift: 22, start: .39, sway: 12 },
  { duration: .33, horizontalPosition: .3, radius: 6.5, sourceLift: 52, start: .47, sway: -10 },
  { duration: .22, horizontalPosition: .48, radius: 14, sourceLift: 33, start: .55, sway: 19 },
  { duration: .3, horizontalPosition: .67, radius: 8, sourceLift: 10, start: .64, sway: -16 },
  { duration: .25, horizontalPosition: .84, radius: 5.5, sourceLift: 46, start: .72, sway: 9 },
  { duration: .19, horizontalPosition: -.55, radius: 5, sourceLift: 64, start: .81, sway: 13 },
  { duration: .27, horizontalPosition: .56, radius: 7, sourceLift: 61, start: .9, sway: -12 },
] as const;

const MUTATION_CRACKS = [
  { length: 152, path: 'M500 636 L493 626 L497 615 L486 604 L489 590 L478 581 L483 568 L470 557 L473 543 L462 532' },
  { length: 148, path: 'M501 635 L508 623 L504 612 L516 601 L511 587 L523 576 L518 562 L532 549 L529 535 L541 521' },
  { length: 112, path: 'M486 604 L474 600 L467 590 L453 588 L446 576 L433 572 L426 559' },
  { length: 116, path: 'M516 601 L528 596 L535 585 L548 582 L556 569 L570 565 L578 550' },
  { length: 138, path: 'M497 615 L505 606 L501 594 L509 583 L505 570 L513 558 L508 545 L516 532 L511 518 L519 503' },
  { length: 102, path: 'M470 557 L459 552 L454 541 L442 537 L437 525 L426 520' },
  { length: 106, path: 'M532 549 L544 544 L549 532 L562 527 L566 514 L578 508' },
  { length: 92, path: 'M500 636 L489 645 L491 657 L479 666 L480 680 L468 690' },
  { length: 96, path: 'M501 635 L512 644 L510 657 L522 667 L520 681 L532 691' },
  { length: 118, path: 'M462 532 L451 519 L454 505 L440 491 L443 475 L429 462 L431 449' },
  { length: 122, path: 'M541 521 L553 507 L549 492 L563 477 L559 461 L573 447' },
  { length: 86, path: 'M468 690 L457 699 L443 696 L432 707 L418 704' },
] as const;

const MUTATION_SHARDS = [
  { centerX: 477, centerY: 486, delay: 0, dx: -92, dy: -192, path: 'M481 447 L500 447 L494 506 L462 523 L441 492 Z', rotation: -34 },
  { centerX: 523, centerY: 486, delay: .008, dx: 176, dy: -146, path: 'M500 447 L519 447 L559 492 L538 523 L506 506 Z', rotation: 38 },
  { centerX: 441, centerY: 552, delay: .012, dx: -240, dy: -42, path: 'M441 492 L462 523 L478 570 L437 600 L414 578 L420 535 Z', rotation: -52 },
  { centerX: 478, centerY: 550, delay: .018, dx: -76, dy: -162, path: 'M462 523 L494 506 L500 548 L478 590 L437 600 L478 570 Z', rotation: -28 },
  { centerX: 522, centerY: 550, delay: .014, dx: 144, dy: -88, path: 'M506 506 L538 523 L522 570 L563 600 L522 590 L500 548 Z', rotation: 31 },
  { centerX: 559, centerY: 552, delay: .021, dx: 206, dy: -118, path: 'M538 523 L559 492 L580 535 L586 578 L563 600 L522 570 Z', rotation: 54 },
  { centerX: 442, centerY: 626, delay: .026, dx: -258, dy: 68, path: 'M414 578 L437 600 L474 624 L456 664 L425 650 L410 614 Z', rotation: -66 },
  { centerX: 479, centerY: 625, delay: .032, dx: -83, dy: 84, path: 'M437 600 L478 590 L500 617 L486 663 L456 664 L474 624 Z', rotation: -41 },
  { centerX: 521, centerY: 625, delay: .028, dx: 154, dy: 58, path: 'M522 590 L563 600 L526 624 L544 664 L514 663 L500 617 Z', rotation: 44 },
  { centerX: 558, centerY: 626, delay: .036, dx: 226, dy: 6, path: 'M563 600 L586 578 L590 614 L575 650 L544 664 L526 624 Z', rotation: 69 },
  { centerX: 470, centerY: 678, delay: .041, dx: -186, dy: 152, path: 'M456 664 L486 663 L500 700 L467 703 L438 684 Z', rotation: -58 },
  { centerX: 530, centerY: 678, delay: .045, dx: 116, dy: 138, path: 'M514 663 L544 664 L562 684 L533 703 L500 700 Z', rotation: 61 },
] as const;

const MUTATION_SPLASHES = [
  {
    centerX: 78,
    centerY: 242,
    delay: 0,
    driftX: -16,
    driftY: 18,
    highlightPath: 'M34 222 C50 207 70 210 81 225 M48 251 C60 260 73 260 82 252',
    path: 'M15 220 C27 197 51 191 70 204 C83 213 86 229 98 234 C114 240 132 231 140 247 C149 266 130 281 108 276 C90 272 84 289 64 285 C43 281 41 262 27 254 C11 246 7 232 15 220 Z M110 190 C118 181 131 185 133 196 C134 207 121 212 114 205 C110 201 108 195 110 190 Z',
    startScale: .62,
  },
  {
    centerX: 915,
    centerY: 230,
    delay: .016,
    driftX: 18,
    driftY: 14,
    highlightPath: 'M877 215 C891 202 910 205 920 221 M916 253 C927 260 940 257 946 247',
    path: 'M857 204 C873 184 896 188 909 205 C919 218 917 232 932 236 C951 240 970 226 981 243 C992 262 974 280 951 274 C936 270 928 287 908 282 C890 278 887 260 872 255 C852 248 844 222 857 204 Z M963 190 C971 181 984 186 984 197 C984 206 974 212 967 206 C962 202 960 196 963 190 Z',
    startScale: .66,
  },
  {
    centerX: 47,
    centerY: 520,
    delay: .034,
    driftX: -13,
    driftY: 27,
    highlightPath: 'M16 493 C27 484 43 487 50 500 M62 523 C71 532 72 545 66 554',
    path: 'M-8 484 C8 467 32 470 45 486 C55 499 50 514 64 521 C79 529 101 520 108 539 C115 559 93 573 75 565 C61 559 53 570 39 565 C22 559 24 542 8 535 C-11 527 -20 500 -8 484 Z M69 571 C78 561 91 566 91 578 C90 590 76 594 70 585 C67 581 66 575 69 571 Z',
    startScale: .58,
  },
  {
    centerX: 956,
    centerY: 532,
    delay: .026,
    driftX: 15,
    driftY: 24,
    highlightPath: 'M918 509 C930 497 947 502 953 516 M966 544 C973 552 975 563 970 570',
    path: 'M900 500 C915 482 939 487 951 504 C960 517 956 532 970 538 C987 545 1004 537 1013 554 C1023 573 1003 590 983 583 C968 578 961 592 944 587 C927 582 927 566 913 558 C893 547 886 517 900 500 Z M939 601 C947 592 960 596 961 607 C961 618 949 623 942 616 C938 612 937 606 939 601 Z',
    startScale: .61,
  },
  {
    centerX: 205,
    centerY: 842,
    delay: .048,
    driftX: -11,
    driftY: 20,
    highlightPath: 'M168 822 C181 808 203 811 213 827 M213 852 C222 860 232 860 239 853',
    path: 'M145 814 C163 790 190 794 207 812 C220 825 215 842 230 849 C247 857 267 848 276 865 C286 884 266 900 245 894 C229 889 218 904 198 900 C180 896 178 878 162 871 C142 862 132 833 145 814 Z M278 824 C286 815 299 819 301 830 C302 841 290 847 282 841 C277 837 276 829 278 824 Z',
    startScale: .67,
  },
  {
    centerX: 797,
    centerY: 850,
    delay: .043,
    driftX: 12,
    driftY: 23,
    highlightPath: 'M754 829 C769 815 791 818 801 835 M805 858 C814 866 826 866 833 858',
    path: 'M733 819 C750 796 779 800 795 818 C807 831 803 848 818 855 C835 863 855 854 865 872 C874 890 855 907 834 901 C817 896 808 910 788 906 C770 902 768 884 752 877 C731 868 721 838 733 819 Z M699 852 C708 843 721 847 722 859 C722 870 709 875 702 868 C698 864 697 857 699 852 Z',
    startScale: .64,
  },
  {
    centerX: 238,
    centerY: 402,
    delay: .06,
    driftX: -9,
    driftY: 31,
    highlightPath: 'M211 384 C220 376 233 379 238 389',
    path: 'M190 374 C203 358 224 361 235 375 C244 386 240 399 251 404 C264 410 274 422 267 434 C259 448 242 442 233 433 C223 424 212 434 201 426 C189 417 193 403 185 394 C180 388 183 381 190 374 Z M250 451 C257 443 268 447 268 457 C267 467 256 470 251 463 C248 459 248 455 250 451 Z',
    startScale: .55,
  },
  {
    centerX: 776,
    centerY: 420,
    delay: .055,
    driftX: 8,
    driftY: 29,
    highlightPath: 'M752 401 C761 393 774 396 779 406',
    path: 'M733 392 C746 376 767 379 778 394 C786 405 782 417 794 423 C806 429 817 441 809 453 C801 466 784 460 776 451 C766 442 755 451 744 444 C731 435 735 420 727 412 C721 405 726 398 733 392 Z M731 466 C739 458 750 462 750 472 C749 482 738 485 732 478 C729 475 729 470 731 466 Z',
    startScale: .57,
  },
  {
    centerX: 356,
    centerY: 520,
    delay: .021,
    driftX: -7,
    driftY: 36,
    highlightPath: 'M341 477 C348 487 349 497 343 503 M374 516 C380 526 379 536 373 542',
    path: 'M337 454 C351 469 354 486 344 495 C334 503 321 495 323 482 C325 471 331 461 337 454 Z M373 499 C387 514 390 531 379 540 C369 548 356 539 359 526 C361 516 367 506 373 499 Z M409 548 C421 560 424 575 414 583 C404 590 392 582 394 571 C396 561 402 553 409 548 Z',
    startScale: .73,
  },
  {
    centerX: 681,
    centerY: 505,
    delay: .03,
    driftX: 6,
    driftY: 34,
    highlightPath: 'M658 471 C668 462 682 464 690 475 M689 503 C699 509 707 518 706 528',
    path: 'M641 456 C654 441 675 443 687 457 C697 469 693 481 706 487 C719 493 735 489 743 503 C752 519 737 534 719 531 C704 528 700 542 684 539 C669 536 668 521 655 516 C638 509 629 471 641 456 Z M715 548 C724 538 738 543 738 555 C737 566 724 571 717 563 C713 559 712 553 715 548 Z',
    startScale: .7,
  },
] as const;

type MutationShard = (typeof MUTATION_SHARDS)[number];
type MutationSplash = (typeof MUTATION_SPLASHES)[number];

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const AnimatedSvgGroup = Animated.createAnimatedComponent(SvgGroup);
const AnimatedSvgPath = Animated.createAnimatedComponent(SvgPath);

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function stagedEnvelope(
  progress: number,
  attackStart: number,
  attackEnd: number,
  releaseStart: number,
) {
  'worklet';
  if (progress <= attackStart) return 0;
  if (progress <= attackEnd) {
    return clamp01((progress - attackStart) / Math.max(.000_1, attackEnd - attackStart));
  }
  if (progress <= releaseStart) return 1;
  return 1 - clamp01((progress - releaseStart) / Math.max(.000_1, 1 - releaseStart));
}

function rootBandEnergy(
  reactionProgress: number,
  mutationProgress: number,
  reactionStart: number,
  reactionEnd: number,
  mutationStart: number,
  mutationEnd: number,
) {
  'worklet';
  const activation = Math.max(
    stagedEnvelope(reactionProgress, reactionStart, reactionEnd, .76),
    stagedEnvelope(mutationProgress, mutationStart, mutationEnd, .54),
  );
  const pulse = .78 + Math.pow(Math.sin(
    (reactionProgress * 2.2 + mutationProgress * 3.8) * Math.PI,
  ), 2) * .22;
  return activation * pulse;
}

function liquidActivationEnergy(reactionProgress: number, mutationProgress: number) {
  'worklet';
  return Math.max(
    stagedEnvelope(reactionProgress, .045, .14, .82),
    relicMutationBoilEnergy(mutationProgress),
  );
}

function heartActivationEnergy(reactionProgress: number, mutationProgress: number) {
  'worklet';
  const reactionActivation = stagedEnvelope(reactionProgress, .036, .11, .76);
  const reactionPulse = .68 + Math.pow(Math.sin(reactionProgress * 3 * Math.PI), 2) * .32;

  return Math.max(
    reactionActivation * reactionPulse,
    relicMutationOverheatEnergy(mutationProgress),
  );
}

function positiveModulo(value: number, modulus: number) {
  'worklet';
  return ((value % modulus) + modulus) % modulus;
}

function relicBubblePhase(
  reactionProgress: number,
  mutationProgress: number,
  start: number,
  duration: number,
) {
  'worklet';
  if (reactionProgress < 1) {
    return clamp01((reactionProgress - start) / Math.max(.01, duration));
  }
  const cycleCount = 1.65 + clamp01((.38 - duration) / .22) * 1.55;
  return positiveModulo(
    relicMutationCharge(mutationProgress) * cycleCount + start * 1.37,
    1,
  );
}

function relicBubbleBodyOpacity(phase: number, energy: number, rise: number) {
  'worklet';
  const appear = clamp01(phase / .1);
  const collapse = 1 - clamp01((phase - .9) / .08);
  return energy * appear * collapse * .68 * clamp01(rise / 12);
}

function relicBubbleBurstPhase(phase: number) {
  'worklet';
  return clamp01((phase - .88) / .12);
}

function relicBubbleBurstOpacity(phase: number, energy: number, rise: number) {
  'worklet';
  const burst = relicBubbleBurstPhase(phase);
  return energy * Math.sin(burst * Math.PI) * .58 * clamp01(rise / 12);
}

function relicBubbleEnergy(
  enabled: boolean,
  mutationOnly: boolean,
  reactionProgress: number,
  mutationProgress: number,
) {
  'worklet';
  if (!enabled) return 0;
  return mutationOnly
    ? relicMutationBoilEnergy(mutationProgress)
    : liquidActivationEnergy(reactionProgress, mutationProgress);
}

function relicBubbleHorizontalOffset(phase: number, start: number, sway: number) {
  'worklet';
  return Math.sin((phase * 1.7 + start) * Math.PI) * sway * (.25 + phase * .75);
}

function relicBubbleBodyPath(
  cx: number,
  cy: number,
  radius: number,
  phase: number,
  start: number,
) {
  'worklet';
  const rx = radius * (.72 + phase * .44);
  const ry = radius * (.92 + phase * .7);
  const asymmetry = Math.sin((phase * 2.7 + start) * Math.PI) * .14;
  return [
    `M${cx} ${cy - ry}`,
    `C${cx + rx * (.62 + asymmetry)} ${cy - ry * .88} ${cx + rx} ${cy - ry * .28} ${cx + rx * (.92 - asymmetry * .18)} ${cy}`,
    `C${cx + rx * .78} ${cy + ry * .68} ${cx + rx * .26} ${cy + ry} ${cx} ${cy + ry * .92}`,
    `C${cx - rx * (.34 - asymmetry)} ${cy + ry} ${cx - rx * .9} ${cy + ry * .56} ${cx - rx * (.88 + asymmetry * .16)} ${cy}`,
    `C${cx - rx} ${cy - ry * .38} ${cx - rx * (.54 - asymmetry)} ${cy - ry * .9} ${cx} ${cy - ry}`,
    'Z',
  ].join(' ');
}

function relicBubbleBurstRingPath(
  cx: number,
  cy: number,
  radius: number,
  burst: number,
) {
  'worklet';
  const rx = radius * (.9 + burst * 2.55);
  const ry = Math.max(.8, radius * (.24 - burst * .08));
  const control = .552_3;
  return [
    `M${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - ry * control} ${cx - rx * control} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + rx * control} ${cy - ry} ${cx + rx} ${cy - ry * control} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + ry * control} ${cx + rx * control} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - rx * control} ${cy + ry} ${cx - rx} ${cy + ry * control} ${cx - rx} ${cy}`,
  ].join(' ');
}

function relicLiquidCurrentPath(
  config: (typeof RELIC_STAGE_ARTWORK)[RelicContainer],
  level: number,
) {
  const depth = Math.max(0, config.liquidFloor - level);
  if (depth < 12) return '';

  const upper = relicLiquidSurfaceForLevel(config, level + depth * .22);
  const lower = relicLiquidSurfaceForLevel(config, level + depth * .82);
  return `M${upper.x - upper.width * .22} ${upper.y} C${upper.x + upper.width * .18} ${level + depth * .34} ${lower.x - lower.width * .24} ${level + depth * .62} ${lower.x + lower.width * .16} ${lower.y}`;
}

function relicLiquidSurfaceOffsets(
  reactionProgress: number,
  mutationProgress: number,
) {
  'worklet';
  let left = 0;
  let center = 0;
  let right = 0;

  const reactionActive = reactionProgress < 1;
  const driver = reactionActive ? reactionProgress : relicMutationCharge(mutationProgress);
  const energy = liquidActivationEnergy(reactionProgress, mutationProgress);
  if (energy > 0) {
    const strength = reactionActive ? 1 : 1.78;
    const damping = reactionActive ? 1 - clamp01(driver) * .58 : .72 + energy * .28;
    const sidePhase = clamp01((driver - .065) / .78);
    const frequency = reactionActive ? 5 : 5.4;
    const centerWave = Math.sin(driver * Math.PI * frequency)
      + Math.sin(driver * Math.PI * 9.2 + .73) * (reactionActive ? .08 : .26);
    center += centerWave * 8.2 * damping * energy * strength;
    left += (
      Math.sin(sidePhase * Math.PI * (reactionActive ? 4 : 5.2) + .48)
      + Math.sin(sidePhase * Math.PI * 8.4 + 1.2) * .16
    ) * 4.4 * damping * energy * strength;
    right += (
      Math.sin(sidePhase * Math.PI * (reactionActive ? 4 : 5.2) - .48)
      + Math.sin(sidePhase * Math.PI * 7.7 - .84) * .16
    ) * 4.4 * damping * energy * strength;
  }

  // Simpson weighting keeps the represented surface height—and therefore the
  // fill amount—constant while the three control anchors deform.
  const weightedMean = (left + center * 4 + right) / 6;
  return {
    center: center - weightedMean,
    left: left - weightedMean,
    right: right - weightedMean,
  };
}

export type InteractiveRelicVialHandle = {
  playMutation: () => void;
  playReaction: () => void;
};

type Props = {
  fillRatio?: number;
  fromContainer: RelicContainer;
  height: number;
  onMutationBurst?: () => void;
  onMutationComplete?: () => void;
  testID?: string;
  toContainer?: RelicContainer | null;
  width: number;
};

const InteractiveRelicVial = forwardRef<InteractiveRelicVialHandle, Props>(function InteractiveRelicVial({
  fillRatio = 1,
  fromContainer,
  height,
  onMutationBurst,
  onMutationComplete,
  testID,
  toContainer = null,
  width,
}, ref) {
  const reduceMotion = useReducedMotion();
  const reactionProgress = useSharedValue(1);
  const mutationProgress = useSharedValue(toContainer ? 0 : 1);
  const hasMutationTransition = Boolean(toContainer);

  const finishMutationBurst = useCallback(() => {
    onMutationBurst?.();
  }, [onMutationBurst]);
  const finishMutation = useCallback(() => {
    onMutationComplete?.();
  }, [onMutationComplete]);

  useImperativeHandle(ref, () => ({
    playReaction() {
      cancelAnimation(reactionProgress);
      reactionProgress.value = 0;
      if (reduceMotion) {
        reactionProgress.value = 1;
        return;
      }
      reactionProgress.value = withTiming(1, {
        duration: REACTION_DURATION_MS,
        easing: Easing.linear,
      });
    },
    playMutation() {
      cancelAnimation(mutationProgress);
      mutationProgress.value = 0;
      mutationProgress.value = withSequence(
        withTiming(RELIC_MUTATION_RUPTURE_PROGRESS, {
          duration: reduceMotion ? REDUCED_MUTATION_CHARGE_MS : RELIC_MUTATION_RUPTURE_MS,
          easing: Easing.linear,
        }, (finished) => {
          if (finished) runOnJS(finishMutationBurst)();
        }),
        withTiming(1, {
          duration: reduceMotion ? REDUCED_MUTATION_RELEASE_MS : RELIC_MUTATION_RELEASE_MS,
          easing: Easing.linear,
        }, (finished) => {
          if (finished) runOnJS(finishMutation)();
        }),
      );
    },
  }), [finishMutation, finishMutationBurst, mutationProgress, reactionProgress, reduceMotion]);

  useEffect(() => {
    cancelAnimation(mutationProgress);
    mutationProgress.value = toContainer ? 0 : 1;
  }, [fromContainer, mutationProgress, toContainer]);

  useEffect(() => () => {
    cancelAnimation(reactionProgress);
    cancelAnimation(mutationProgress);
  }, [mutationProgress, reactionProgress]);

  const oldVesselMotion = useAnimatedStyle(() => {
    if (!hasMutationTransition) return { opacity: 1, transform: [{ scale: 1 }] };
    return {
      opacity: reduceMotion
        ? interpolate(mutationProgress.value, [.34, .58], [1, 0], Extrapolation.CLAMP)
        : relicMutationOldVesselOpacity(mutationProgress.value),
      transform: [{ scale: 1 }],
    };
  }, [hasMutationTransition, reduceMotion]);
  const newVesselMotion = useAnimatedStyle(() => {
    const materialization = reduceMotion
      ? clamp01((mutationProgress.value - .38) / .28)
      : relicMutationMaterialization(mutationProgress.value);
    const ambientReveal = reduceMotion
      ? 0
      : clamp01((mutationProgress.value - .67) / .13) * .16;
    const materializedOpacity = interpolate(
      materialization,
      [0, .16, .7, 1],
      [0, .18, .92, 1],
    );
    return {
      // Both scene assets share the same artboard. Keeping their transforms
      // fixed prevents the chamber itself from jumping while the vessel changes.
      opacity: Math.max(ambientReveal, materializedOpacity),
    };
  }, [reduceMotion]);

  return (
    <View pointerEvents="none" style={[styles.viewport, { height, width }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, oldVesselMotion]}>
        <StaticRelicVial
          container={fromContainer}
          fillRatio={fillRatio}
          height={height}
          renderLiquid={false}
          testID={testID ? `${testID}-from` : undefined}
          width={width}
        />
      </Animated.View>

      {toContainer ? (
        <Animated.View style={[StyleSheet.absoluteFill, newVesselMotion]}>
          <StaticRelicVial
            container={toContainer}
            fillRatio={0}
            height={height}
            renderLiquid={false}
            testID={testID ? `${testID}-to` : undefined}
            width={width}
          />
        </Animated.View>
      ) : null}

      <RelicInteractionArtwork
        container={fromContainer}
        fillRatio={fillRatio}
        hasMutationTransition={hasMutationTransition}
        height={height}
        mutationProgress={mutationProgress}
        reactionProgress={reactionProgress}
        reduceMotion={reduceMotion}
        width={width}
      />

      {RELIC_STAGE_ARTWORK[fromContainer].foregroundPaths?.length ? (
        <Animated.View style={[StyleSheet.absoluteFill, oldVesselMotion]}>
          <RelicVesselForegroundArtwork
            config={RELIC_STAGE_ARTWORK[fromContainer]}
            container={fromContainer}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

export default InteractiveRelicVial;

type RelicInteractionArtworkProps = {
  container: RelicContainer;
  fillRatio: number;
  hasMutationTransition: boolean;
  height: number;
  mutationProgress: SharedValue<number>;
  reactionProgress: SharedValue<number>;
  reduceMotion: boolean;
  width: number;
};

function RelicInteractionArtwork(props: RelicInteractionArtworkProps) {
  if (Platform.OS === 'web') return <RelicInteractionSvgArtwork {...props} />;
  return <RelicInteractionSkiaArtwork {...props} />;
}

function RelicInteractionSkiaArtwork({
  container,
  fillRatio,
  hasMutationTransition,
  height,
  mutationProgress,
  reactionProgress,
  reduceMotion,
  width,
}: RelicInteractionArtworkProps) {
  const config = RELIC_STAGE_ARTWORK[container];
  const prototypeEnabled = container === 'ampoule';
  const level = relicLiquidLevelForRatio(config, fillRatio);
  const liquidVolumePath = relicLiquidVolumePathForLevel(config, level, 10);
  const liquidPresent = Boolean(liquidVolumePath);
  const idleCurrentPath = relicLiquidCurrentPath(config, level);
  const bubbleSource = relicLiquidSurfaceForLevel(config, config.liquidFloor);
  const ampouleAnatomy = useImage(AMPOULE_ANATOMY_ASSET);
  const dormantAmpouleAnatomy = useImage(AMPOULE_DORMANT_ANATOMY_ASSET);
  const vesselImage = useImage(config.asset as number);
  const animatedLiquidPath = useDerivedValue(() => {
    const offsets = relicLiquidSurfaceOffsets(
      reactionProgress.value,
      mutationProgress.value,
    );
    return relicLiquidDynamicVolumePathForLevel(config, level, 10, offsets);
  });
  const animatedSurfacePath = useDerivedValue(() => {
    const offsets = relicLiquidSurfaceOffsets(
      reactionProgress.value,
      mutationProgress.value,
    );
    return relicLiquidDynamicSurfacePathForLevel(config, level, 10, offsets);
  });
  const heartEnergy = useDerivedValue(() => prototypeEnabled
    ? heartActivationEnergy(reactionProgress.value, mutationProgress.value)
    : 0);
  const lowerRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .11, .2, .06, .17)
    : 0);
  const middleRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .17, .27, .11, .22)
    : 0);
  const upperRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .24, .34, .17, .3)
    : 0);
  const liquidEnergy = useDerivedValue(() => liquidPresent
    ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
    : 0, [liquidPresent]);
  const mutationLiquidEnergy = useDerivedValue(() => (
    hasMutationTransition && liquidPresent && !reduceMotion
      ? relicMutationBoilEnergy(mutationProgress.value)
      : 0
  ), [hasMutationTransition, liquidPresent, reduceMotion]);
  const oldContentOpacity = useDerivedValue(() => (
    hasMutationTransition
      ? reduceMotion
        ? 1 - clamp01((mutationProgress.value - .34) / .24)
        : relicMutationOldVesselOpacity(mutationProgress.value)
      : 1
  ), [hasMutationTransition, reduceMotion]);
  const overheatOpacity = useDerivedValue(() => (
    hasMutationTransition
      ? relicMutationOverheatEnergy(mutationProgress.value) * (reduceMotion ? .38 : .66)
      : 0
  ), [hasMutationTransition, reduceMotion]);
  const overheatAnatomyOpacity = useDerivedValue(() => (
    hasMutationTransition
      ? relicMutationOverheatEnergy(mutationProgress.value) * (reduceMotion ? .52 : .94)
      : 0
  ), [hasMutationTransition, reduceMotion]);
  const overheatHeartTransform = useDerivedValue(() => ([
    { scale: relicMutationHeartScale(mutationProgress.value) },
  ]));
  const overheatRadius = useDerivedValue(() => (
    30 + relicMutationCharge(mutationProgress.value) * 50
  ));
  const flashPhase = useDerivedValue(() => relicMutationBurstPhase(mutationProgress.value));
  const flashRadius = useDerivedValue(() => 34 + flashPhase.value * 184);
  const flashOpacity = useDerivedValue(() => (
    hasMutationTransition ? relicMutationFlashOpacity(mutationProgress.value) : 0
  ), [hasMutationTransition]);
  const shockwavePhase = useDerivedValue(() => (
    relicMutationShockwavePhase(mutationProgress.value)
  ));
  const shockwaveRadius = useDerivedValue(() => 42 + shockwavePhase.value * 210);
  const shockwaveOpacity = useDerivedValue(() => (
    hasMutationTransition ? relicMutationShockwaveOpacity(mutationProgress.value) : 0
  ), [hasMutationTransition]);
  const shockwaveGlowOpacity = useDerivedValue(() => shockwaveOpacity.value * .28);
  const materialization = useDerivedValue(() => (
    hasMutationTransition && !reduceMotion
      ? relicMutationMaterialization(mutationProgress.value)
      : 0
  ), [hasMutationTransition, reduceMotion]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <FitBox
        dst={rect(0, 0, Math.max(1, width), Math.max(1, height))}
        fit="cover"
        src={rect(0, 0, ARTBOARD_SIZE, ARTBOARD_SIZE)}
      >
        <Group clip={config.interiorPath} opacity={oldContentOpacity}>
          {liquidPresent ? (
            <Path path={animatedLiquidPath}>
              <LinearGradient
                colors={['#431052', '#27042F', '#120018', '#050008']}
                end={vec(500, config.liquidFloor)}
                positions={[0, .34, .72, 1]}
                start={vec(500, level)}
              />
            </Path>
          ) : null}

          {idleCurrentPath && liquidVolumePath ? (
            <Group clip={liquidVolumePath}>
              <Group opacity={.06}>
                <Path
                  color="#B77AC2"
                  path={idleCurrentPath}
                  strokeCap="round"
                  strokeWidth={8}
                  style="stroke"
                >
                  <BlurMask blur={6} style="normal" />
                </Path>
              </Group>
            </Group>
          ) : null}

          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.lower} opacity={lowerRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>
          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.middle} opacity={middleRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>
          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.upper} opacity={upperRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>

          <Group blendMode="screen" clip={AMPOULE_HEART_REGION} opacity={heartEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>

          {prototypeEnabled && liquidPresent ? (
            <Group clip={animatedLiquidPath}>
              <Group clip={AMPOULE_ROOT_REGION}>
                <SkiaImage
                  fit="fill"
                  height={ARTBOARD_SIZE}
                  image={dormantAmpouleAnatomy}
                  width={ARTBOARD_SIZE}
                  x={0}
                  y={0}
                />
              </Group>
              <Group clip={AMPOULE_HEART_REGION}>
                <SkiaImage
                  fit="fill"
                  height={ARTBOARD_SIZE}
                  image={dormantAmpouleAnatomy}
                  width={ARTBOARD_SIZE}
                  x={0}
                  y={0}
                />
              </Group>
            </Group>
          ) : null}

          {liquidPresent ? (
            <Path
              color="#8D4D9C"
              opacity={.68}
              path={animatedSurfacePath}
              strokeCap="round"
              strokeWidth={2}
              style="stroke"
            />
          ) : null}
          {BUBBLES.map((bubble, index) => (
            <RelicBubble
              cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
              duration={bubble.duration}
              energy={liquidEnergy}
              floor={config.liquidFloor}
              key={`relic-bubble-${index}`}
              mutationProgress={mutationProgress}
              radius={bubble.radius}
              reactionProgress={reactionProgress}
              sourceLift={bubble.sourceLift}
              start={bubble.start}
              surfaceLevel={level}
              sway={bubble.sway}
            />
          ))}

          {MUTATION_BUBBLES.map((bubble, index) => (
            <RelicBubble
              cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
              duration={bubble.duration}
              energy={mutationLiquidEnergy}
              floor={config.liquidFloor}
              key={`relic-mutation-bubble-${index}`}
              mutationProgress={mutationProgress}
              radius={bubble.radius}
              reactionProgress={reactionProgress}
              sourceLift={bubble.sourceLift}
              start={bubble.start}
              surfaceLevel={level}
              sway={bubble.sway}
            />
          ))}

          {prototypeEnabled ? (
            <Group
              blendMode="screen"
              clip={AMPOULE_HEART_REGION}
              opacity={overheatAnatomyOpacity}
              origin={vec(500, 638)}
              transform={overheatHeartTransform}
            >
              <SkiaImage
                fit="fill"
                height={ARTBOARD_SIZE}
                image={ampouleAnatomy}
                width={ARTBOARD_SIZE}
                x={0}
                y={0}
              />
            </Group>
          ) : null}
          <Group blendMode="screen" clip={config.interiorPath} opacity={overheatOpacity}>
            <Circle cx={500} cy={638} r={overheatRadius}>
              <RadialGradient
                c={vec(500, 638)}
                colors={['#FFFFFF', '#FFD37A', 'rgba(255,55,0,.9)', 'rgba(119,0,20,0)']}
                positions={[0, .12, .5, 1]}
                r={overheatRadius}
              />
              <BlurMask blur={12} style="normal" />
            </Circle>
          </Group>
        </Group>

        {hasMutationTransition && !reduceMotion ? (
          <Group clip={config.interiorPath}>
            {MUTATION_CRACKS.map((crack, index) => (
              <RelicMutationCrack
                index={index}
                key={`relic-mutation-crack-${index}`}
                path={crack.path}
                progress={mutationProgress}
              />
            ))}
          </Group>
        ) : null}

        {hasMutationTransition && !reduceMotion ? MUTATION_SHARDS.map((shard, index) => (
          <RelicMutationShard
            image={vesselImage}
            key={`relic-mutation-shard-${index}`}
            progress={mutationProgress}
            shard={shard}
          />
        )) : null}

        <Group blendMode="screen">
          <Circle cx={500} cy={630} opacity={flashOpacity} r={flashRadius}>
            <RadialGradient
              c={vec(500, 630)}
              colors={['#FFFFFF', '#F2D8FF', 'rgba(169,74,255,.58)', 'rgba(112,20,184,0)']}
              positions={[0, .16, .5, 1]}
              r={flashRadius}
            />
          </Circle>

          <Circle
            color="#F6DEFF"
            cx={500}
            cy={630}
            opacity={shockwaveGlowOpacity}
            r={shockwaveRadius}
            strokeWidth={9}
            style="stroke"
          >
            <BlurMask blur={9} style="normal" />
          </Circle>
          <Circle
            color="#F3CBFF"
            cx={500}
            cy={630}
            opacity={shockwaveOpacity}
            r={shockwaveRadius}
            strokeWidth={2.2}
            style="stroke"
          />

          {hasMutationTransition && !reduceMotion ? (
            <RelicMutationMaterialization
              phase={materialization}
            />
          ) : null}
        </Group>

        {hasMutationTransition && !reduceMotion ? MUTATION_SPLASHES.map((splash, index) => (
          <RelicMutationSplash
            key={`relic-mutation-splash-${index}`}
            progress={mutationProgress}
            splash={splash}
          />
        )) : null}
      </FitBox>
    </Canvas>
  );
}

function RelicInteractionSvgArtwork({
  container,
  fillRatio,
  hasMutationTransition,
  mutationProgress,
  reactionProgress,
  reduceMotion,
}: RelicInteractionArtworkProps) {
  const config = RELIC_STAGE_ARTWORK[container];
  const uniqueId = useId().replace(/:/g, '');
  const clipId = `interactive-relic-clip-${uniqueId}`;
  const anatomyRegionId = `interactive-relic-anatomy-${uniqueId}`;
  const immersedLiquidClipId = `interactive-relic-immersed-liquid-${uniqueId}`;
  const heartRegionId = `interactive-relic-heart-${uniqueId}`;
  const flashId = `interactive-relic-flash-${uniqueId}`;
  const overheatId = `interactive-relic-overheat-${uniqueId}`;
  const liquidGradientId = `interactive-relic-liquid-depth-${uniqueId}`;
  const prototypeEnabled = container === 'ampoule';
  const level = relicLiquidLevelForRatio(config, fillRatio);
  const liquidVolumePath = relicLiquidVolumePathForLevel(config, level, 10);
  const liquidPresent = Boolean(liquidVolumePath);
  const idleCurrentPath = relicLiquidCurrentPath(config, level);
  const bubbleSource = relicLiquidSurfaceForLevel(config, config.liquidFloor);
  const liquidVolumeProps = useAnimatedProps(() => {
    const offsets = relicLiquidSurfaceOffsets(
      reactionProgress.value,
      mutationProgress.value,
    );
    return {
      d: relicLiquidDynamicVolumePathForLevel(config, level, 10, offsets),
    };
  }, [config, level]);
  const liquidSurfaceProps = useAnimatedProps(() => {
    const offsets = relicLiquidSurfaceOffsets(
      reactionProgress.value,
      mutationProgress.value,
    );
    return {
      d: relicLiquidDynamicSurfacePathForLevel(config, level, 10, offsets),
    };
  }, [config, level]);
  const heartEnergyStyle = useAnimatedStyle(() => {
    return {
      opacity: prototypeEnabled
        ? heartActivationEnergy(reactionProgress.value, mutationProgress.value)
        : 0,
    };
  }, [prototypeEnabled]);
  const oldContentStyle = useAnimatedStyle(() => ({
    opacity: hasMutationTransition
      ? reduceMotion
        ? 1 - clamp01((mutationProgress.value - .34) / .24)
        : relicMutationOldVesselOpacity(mutationProgress.value)
      : 1,
  }), [hasMutationTransition, reduceMotion]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, oldContentStyle]}>
      {liquidPresent ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-liquid-body`}><SvgPath d={config.interiorPath} /></SvgClipPath>
              <SvgLinearGradient id={liquidGradientId} x1="0" x2="0" y1="0" y2="1">
                <SvgStop offset="0" stopColor="#431052" stopOpacity=".94" />
                <SvgStop offset=".34" stopColor="#27042F" stopOpacity=".96" />
                <SvgStop offset=".72" stopColor="#120018" stopOpacity=".98" />
                <SvgStop offset="1" stopColor="#050008" stopOpacity=".99" />
              </SvgLinearGradient>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-liquid-body)`}>
              <AnimatedSvgPath
                animatedProps={liquidVolumeProps}
                fill={`url(#${liquidGradientId})`}
              />
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      {idleCurrentPath && liquidVolumePath ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-idle-current`}><SvgPath d={liquidVolumePath} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-idle-current)`}>
              <SvgPath
                d={idleCurrentPath}
                fill="none"
                stroke="#B77AC2"
                strokeLinecap="round"
                strokeOpacity=".06"
                strokeWidth="8"
              />
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.17}
        mutationProgress={mutationProgress}
        mutationStart={.06}
        reactionEnd={.2}
        reactionProgress={reactionProgress}
        reactionStart={.11}
        regionPath={AMPOULE_ROOT_BANDS.lower}
        uniqueId={`${uniqueId}-lower`}
      />
      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.22}
        mutationProgress={mutationProgress}
        mutationStart={.11}
        reactionEnd={.27}
        reactionProgress={reactionProgress}
        reactionStart={.17}
        regionPath={AMPOULE_ROOT_BANDS.middle}
        uniqueId={`${uniqueId}-middle`}
      />
      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.3}
        mutationProgress={mutationProgress}
        mutationStart={.17}
        reactionEnd={.34}
        reactionProgress={reactionProgress}
        reactionStart={.24}
        regionPath={AMPOULE_ROOT_BANDS.upper}
        uniqueId={`${uniqueId}-upper`}
      />

      <Animated.View style={[StyleSheet.absoluteFill, heartEnergyStyle]}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgClipPath id={`${clipId}-heart`}><SvgPath d={config.interiorPath} /></SvgClipPath>
            <SvgClipPath id={heartRegionId}><SvgPath d={AMPOULE_HEART_REGION} /></SvgClipPath>
          </SvgDefs>
          <SvgGroup clipPath={`url(#${clipId}-heart)`}>
            <SvgGroup clipPath={`url(#${heartRegionId})`}>
              <SvgImage
                height={ARTBOARD_SIZE}
                href={AMPOULE_ANATOMY_ASSET}
                preserveAspectRatio="xMidYMid slice"
                width={ARTBOARD_SIZE}
                x={0}
                y={0}
              />
            </SvgGroup>
          </SvgGroup>
        </Svg>
      </Animated.View>

      {prototypeEnabled && liquidPresent ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-immersed-interior`}>
                <SvgPath d={config.interiorPath} />
              </SvgClipPath>
              <SvgClipPath id={immersedLiquidClipId}>
                <AnimatedSvgPath animatedProps={liquidVolumeProps} />
              </SvgClipPath>
              <SvgClipPath id={anatomyRegionId}>
                <SvgPath d={AMPOULE_ROOT_REGION} />
                <SvgPath d={AMPOULE_HEART_REGION} />
              </SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-immersed-interior)`}>
              <SvgGroup clipPath={`url(#${immersedLiquidClipId})`}>
                <SvgGroup clipPath={`url(#${anatomyRegionId})`}>
                  <SvgImage
                    height={ARTBOARD_SIZE}
                    href={AMPOULE_DORMANT_ANATOMY_ASSET}
                    preserveAspectRatio="xMidYMid slice"
                    width={ARTBOARD_SIZE}
                    x={0}
                    y={0}
                  />
                </SvgGroup>
              </SvgGroup>
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      {liquidPresent ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-liquid-surface`}><SvgPath d={config.interiorPath} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-liquid-surface)`}>
              <AnimatedSvgPath
                animatedProps={liquidSurfaceProps}
                fill="none"
                stroke="#8D4D9C"
                strokeLinecap="round"
                strokeOpacity=".68"
                strokeWidth="2"
              />
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgClipPath id={`${clipId}-bubbles`}><SvgPath d={config.interiorPath} /></SvgClipPath>
          </SvgDefs>
          <SvgGroup clipPath={`url(#${clipId}-bubbles)`}>
            {BUBBLES.map((bubble, index) => (
              <RelicSvgBubble
                cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
                duration={bubble.duration}
                enabled={liquidPresent}
                floor={config.liquidFloor}
                key={`svg-relic-bubble-${index}`}
                mutationProgress={mutationProgress}
                radius={bubble.radius}
                reactionProgress={reactionProgress}
                sourceLift={bubble.sourceLift}
                start={bubble.start}
                surfaceLevel={level}
                sway={bubble.sway}
              />
            ))}
            {MUTATION_BUBBLES.map((bubble, index) => (
              <RelicSvgBubble
                cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
                duration={bubble.duration}
                enabled={hasMutationTransition && liquidPresent && !reduceMotion}
                floor={config.liquidFloor}
                key={`svg-relic-mutation-bubble-${index}`}
                mutationOnly
                mutationProgress={mutationProgress}
                radius={bubble.radius}
                reactionProgress={reactionProgress}
                sourceLift={bubble.sourceLift}
                start={bubble.start}
                surfaceLevel={level}
                sway={bubble.sway}
              />
            ))}
          </SvgGroup>
        </Svg>
      </View>
      </Animated.View>

      {hasMutationTransition ? (
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgRadialGradient cx="50%" cy="50%" id={flashId} r="50%">
              <SvgStop offset="0" stopColor="#FFFFFF" />
              <SvgStop offset=".16" stopColor="#F2D8FF" />
              <SvgStop offset=".5" stopColor="#A94AFF" stopOpacity=".58" />
              <SvgStop offset="1" stopColor="#7014B8" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient cx="50%" cy="50%" id={overheatId} r="50%">
              <SvgStop offset="0" stopColor="#FFFFFF" />
              <SvgStop offset=".12" stopColor="#FFD37A" />
              <SvgStop offset=".5" stopColor="#FF3700" stopOpacity=".9" />
              <SvgStop offset="1" stopColor="#770014" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgClipPath id={`${clipId}-mutation-interior`}><SvgPath d={config.interiorPath} /></SvgClipPath>
            <SvgClipPath id={`${clipId}-mutation-heart`}>
              <SvgPath d={prototypeEnabled ? AMPOULE_HEART_REGION : config.interiorPath} />
            </SvgClipPath>
            {MUTATION_SHARDS.map((shard, index) => (
              <SvgClipPath id={`${clipId}-shard-${index}`} key={`svg-relic-shard-clip-${index}`}>
                <SvgPath d={shard.path} />
              </SvgClipPath>
            ))}
          </SvgDefs>
          <SvgGroup clipPath={`url(#${clipId}-mutation-interior)`}>
            <RelicSvgOverheatGlow
              fill={`url(#${overheatId})`}
              progress={mutationProgress}
              reduceMotion={reduceMotion}
            />
          </SvgGroup>
          {prototypeEnabled ? (
            <SvgGroup clipPath={`url(#${clipId}-mutation-heart)`}>
              <RelicSvgOverheatAnatomy
                progress={mutationProgress}
                reduceMotion={reduceMotion}
              />
            </SvgGroup>
          ) : null}
          {!reduceMotion ? (
            <SvgGroup clipPath={`url(#${clipId}-mutation-interior)`}>
              {MUTATION_CRACKS.map((crack, index) => (
                <RelicSvgMutationCrack
                  index={index}
                  key={`svg-relic-mutation-crack-${index}`}
                  length={crack.length}
                  path={crack.path}
                  progress={mutationProgress}
                />
              ))}
            </SvgGroup>
          ) : null}
          {!reduceMotion ? MUTATION_SHARDS.map((shard, index) => (
            <RelicSvgMutationShard
              asset={config.asset}
              clipId={`${clipId}-shard-${index}`}
              key={`svg-relic-mutation-shard-${index}`}
              progress={mutationProgress}
              shard={shard}
            />
          )) : null}
          <RelicSvgMutationFlash
            fill={`url(#${flashId})`}
            progress={mutationProgress}
          />
          {!reduceMotion ? (
            <RelicSvgMutationMaterialization progress={mutationProgress} />
          ) : null}
          {!reduceMotion ? MUTATION_SPLASHES.map((splash, index) => (
            <RelicSvgMutationSplash
              key={`svg-relic-mutation-splash-${index}`}
              progress={mutationProgress}
              splash={splash}
            />
          )) : null}
        </Svg>
      </View>
      ) : null}
    </View>
  );
}

function RelicSvgRootBand({
  enabled,
  interiorPath,
  mutationEnd,
  mutationProgress,
  mutationStart,
  reactionEnd,
  reactionProgress,
  reactionStart,
  regionPath,
  uniqueId,
}: {
  enabled: boolean;
  interiorPath: string;
  mutationEnd: number;
  mutationProgress: SharedValue<number>;
  mutationStart: number;
  reactionEnd: number;
  reactionProgress: SharedValue<number>;
  reactionStart: number;
  regionPath: string;
  uniqueId: string;
}) {
  const clipId = `interactive-relic-root-clip-${uniqueId}`;
  const regionId = `interactive-relic-root-region-${uniqueId}`;
  const energyStyle = useAnimatedStyle(() => ({
    opacity: enabled
      ? rootBandEnergy(
          reactionProgress.value,
          mutationProgress.value,
          reactionStart,
          reactionEnd,
          mutationStart,
          mutationEnd,
        )
      : 0,
  }), [enabled, mutationEnd, mutationStart, reactionEnd, reactionStart]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, energyStyle]}>
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
        <SvgDefs>
          <SvgClipPath id={clipId}><SvgPath d={interiorPath} /></SvgClipPath>
          <SvgClipPath id={regionId}><SvgPath d={regionPath} /></SvgClipPath>
        </SvgDefs>
        <SvgGroup clipPath={`url(#${clipId})`}>
          <SvgGroup clipPath={`url(#${regionId})`}>
            <SvgImage
              height={ARTBOARD_SIZE}
              href={AMPOULE_ANATOMY_ASSET}
              preserveAspectRatio="xMidYMid slice"
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </SvgGroup>
        </SvgGroup>
      </Svg>
    </Animated.View>
  );
}

function RelicSvgBubble({
  cx,
  duration,
  enabled,
  floor,
  mutationOnly = false,
  mutationProgress,
  radius,
  reactionProgress,
  sourceLift,
  start,
  surfaceLevel,
  sway,
}: {
  cx: number;
  duration: number;
  enabled: boolean;
  floor: number;
  mutationOnly?: boolean;
  mutationProgress: SharedValue<number>;
  radius: number;
  reactionProgress: SharedValue<number>;
  sourceLift: number;
  start: number;
  surfaceLevel: number;
  sway: number;
}) {
  const sourceY = floor - sourceLift;
  const rise = Math.max(0, sourceY - (surfaceLevel + 2));
  const bodyProps = useAnimatedProps(() => {
    const energy = relicBubbleEnergy(
      enabled,
      mutationOnly,
      reactionProgress.value,
      mutationProgress.value,
    );
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const bubbleCx = cx + relicBubbleHorizontalOffset(phase, start, sway);
    const bubbleCy = sourceY - phase * rise;
    return {
      d: relicBubbleBodyPath(bubbleCx, bubbleCy, radius, phase, start),
      opacity: relicBubbleBodyOpacity(phase, energy, rise),
    };
  }, [cx, duration, enabled, mutationOnly, radius, rise, sourceY, start, sway]);

  const ringProps = useAnimatedProps(() => {
    const energy = relicBubbleEnergy(
      enabled,
      mutationOnly,
      reactionProgress.value,
      mutationProgress.value,
    );
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    const surfaceCx = cx + relicBubbleHorizontalOffset(.96, start, sway);
    return {
      d: relicBubbleBurstRingPath(surfaceCx, surfaceLevel + 2, radius, burst),
      opacity: relicBubbleBurstOpacity(phase, energy, rise),
    };
  }, [cx, duration, enabled, mutationOnly, radius, rise, start, surfaceLevel, sway]);

  const leftDropletProps = useAnimatedProps(() => {
    const energy = relicBubbleEnergy(
      enabled,
      mutationOnly,
      reactionProgress.value,
      mutationProgress.value,
    );
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    return {
      cx: cx + relicBubbleHorizontalOffset(.96, start, sway) - (radius + 5) * burst,
      cy: surfaceLevel + 1 - Math.sin(burst * Math.PI) * (5 + radius * .5),
      opacity: relicBubbleBurstOpacity(phase, energy, rise) * .76,
      r: Math.max(1, radius * .22) * (1 - burst * .35),
    };
  }, [cx, duration, enabled, mutationOnly, radius, rise, start, surfaceLevel, sway]);

  const rightDropletProps = useAnimatedProps(() => {
    const energy = relicBubbleEnergy(
      enabled,
      mutationOnly,
      reactionProgress.value,
      mutationProgress.value,
    );
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    return {
      cx: cx + relicBubbleHorizontalOffset(.96, start, sway) + (radius + 5) * burst,
      cy: surfaceLevel + 1 - Math.sin(burst * Math.PI) * (7 + radius * .62),
      opacity: relicBubbleBurstOpacity(phase, energy, rise) * .68,
      r: Math.max(.9, radius * .18) * (1 - burst * .3),
    };
  }, [cx, duration, enabled, mutationOnly, radius, rise, start, surfaceLevel, sway]);

  return (
    <>
      <AnimatedSvgPath
        animatedProps={bodyProps}
        fill="rgba(35,2,45,.72)"
        stroke="#8D4D9C"
        strokeWidth={1.15}
      />
      <AnimatedSvgPath
        animatedProps={ringProps}
        fill="none"
        stroke="#A965B7"
        strokeWidth={1.2}
      />
      <AnimatedSvgCircle animatedProps={leftDropletProps} fill="#864194" />
      <AnimatedSvgCircle animatedProps={rightDropletProps} fill="#A965B7" />
    </>
  );
}

function RelicSvgMutationFlash({
  fill,
  progress,
}: {
  fill: string;
  progress: SharedValue<number>;
}) {
  const flashProps = useAnimatedProps(() => ({
    opacity: relicMutationFlashOpacity(progress.value),
    r: 34 + relicMutationBurstPhase(progress.value) * 184,
  }));
  const shockwaveProps = useAnimatedProps(() => ({
    opacity: relicMutationShockwaveOpacity(progress.value),
    r: 42 + relicMutationShockwavePhase(progress.value) * 210,
  }));
  const shockwaveGlowProps = useAnimatedProps(() => ({
    opacity: relicMutationShockwaveOpacity(progress.value) * .28,
    r: 42 + relicMutationShockwavePhase(progress.value) * 210,
  }));

  return (
    <>
      <AnimatedSvgCircle
        animatedProps={flashProps}
        cx={500}
        cy={630}
        fill={fill}
      />
      <AnimatedSvgCircle
        animatedProps={shockwaveGlowProps}
        cx={500}
        cy={630}
        fill="none"
        stroke="#F6DEFF"
        strokeOpacity=".7"
        strokeWidth="9"
      />
      <AnimatedSvgCircle
        animatedProps={shockwaveProps}
        cx={500}
        cy={630}
        fill="none"
        stroke="#F3CBFF"
        strokeWidth="2.2"
      />
    </>
  );
}

function RelicSvgOverheatGlow({
  fill,
  progress,
  reduceMotion,
}: {
  fill: string;
  progress: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: relicMutationOverheatEnergy(progress.value) * (reduceMotion ? .38 : .66),
    r: 30 + relicMutationCharge(progress.value) * 50,
  }), [reduceMotion]);

  return <AnimatedSvgCircle animatedProps={animatedProps} cx={500} cy={638} fill={fill} />;
}

function RelicSvgOverheatAnatomy({
  progress,
  reduceMotion,
}: {
  progress: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: relicMutationOverheatEnergy(progress.value) * (reduceMotion ? .52 : .94),
    transform: `translate(500 638) scale(${relicMutationHeartScale(progress.value)}) translate(-500 -638)`,
  }), [reduceMotion]);

  return (
    <AnimatedSvgGroup animatedProps={animatedProps}>
      <SvgImage
        height={ARTBOARD_SIZE}
        href={AMPOULE_ANATOMY_ASSET}
        preserveAspectRatio="xMidYMid slice"
        width={ARTBOARD_SIZE}
        x={0}
        y={0}
      />
    </AnimatedSvgGroup>
  );
}

function RelicSvgMutationCrack({
  index,
  length,
  path,
  progress,
}: {
  index: number;
  length: number;
  path: string;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: relicMutationCrackOpacity(progress.value, index),
    strokeDashoffset: length * (1 - relicMutationCrackProgress(progress.value, index)),
  }), [index, length]);

  return (
    <>
      <AnimatedSvgPath
        animatedProps={animatedProps}
        d={path}
        fill="none"
        stroke="#B8D9EE"
        strokeDasharray={`${length} ${length}`}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeOpacity=".38"
        strokeWidth={1.7}
      />
      <AnimatedSvgPath
        animatedProps={animatedProps}
        d={path}
        fill="none"
        stroke="#F4E4FF"
        strokeDasharray={`${length} ${length}`}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth={.62}
      />
    </>
  );
}

function RelicSvgMutationShard({
  asset,
  clipId,
  progress,
  shard,
}: {
  asset: ImageSourcePropType;
  clipId: string;
  progress: SharedValue<number>;
  shard: MutationShard;
}) {
  const animatedProps = useAnimatedProps(() => {
    const phase = relicMutationBurstPhase(progress.value, shard.delay);
    const eased = 1 - Math.pow(1 - phase, 3);
    const translateX = shard.dx * eased;
    const translateY = shard.dy * eased + 164 * phase * phase;
    const rotation = shard.rotation * phase * 1.35;
    return {
      opacity: relicMutationShardOpacity(progress.value, shard.delay),
      transform: `translate(${translateX} ${translateY}) rotate(${rotation} ${shard.centerX} ${shard.centerY})`,
    };
  }, [shard]);
  const glintProps = useAnimatedProps(() => ({
    opacity: relicMutationShardGlintOpacity(progress.value, shard.delay),
  }), [shard.delay]);

  return (
    <AnimatedSvgGroup animatedProps={animatedProps} clipPath={`url(#${clipId})`}>
      <SvgImage
        height={ARTBOARD_SIZE}
        href={asset}
        preserveAspectRatio="xMidYMid slice"
        width={ARTBOARD_SIZE}
        x={0}
        y={0}
      />
      <SvgPath d={shard.path} fill="#31033E" fillOpacity=".22" stroke="#EED9FA" strokeOpacity=".76" strokeWidth="1.5" />
      <AnimatedSvgPath
        animatedProps={glintProps}
        d={shard.path}
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth=".65"
      />
    </AnimatedSvgGroup>
  );
}

function RelicSvgMutationSplash({
  progress,
  splash,
}: {
  progress: SharedValue<number>;
  splash: MutationSplash;
}) {
  const groupProps = useAnimatedProps(() => {
    const phase = relicMutationBurstPhase(progress.value, splash.delay);
    const eased = 1 - Math.pow(1 - phase, 3);
    const dry = relicMutationSplashDryProgress(progress.value, splash.delay);
    const scale = splash.startScale + eased * (1.12 - splash.startScale) - dry * .09;
    const translateX = splash.driftX * eased;
    const translateY = splash.driftY * (.35 * eased + .65 * dry);
    return {
      transform: `translate(${translateX} ${translateY}) translate(${splash.centerX} ${splash.centerY}) scale(${scale}) translate(${-splash.centerX} ${-splash.centerY})`,
    };
  }, [splash]);
  const fillProps = useAnimatedProps(() => ({
    opacity: relicMutationSplashFillOpacity(progress.value, splash.delay),
  }), [splash.delay]);
  const edgeProps = useAnimatedProps(() => ({
    opacity: relicMutationSplashEdgeOpacity(progress.value, splash.delay),
  }), [splash.delay]);
  const sheenProps = useAnimatedProps(() => ({
    opacity: relicMutationSplashSheenOpacity(progress.value, splash.delay),
  }), [splash.delay]);

  return (
    <AnimatedSvgGroup animatedProps={groupProps}>
      <AnimatedSvgPath animatedProps={fillProps} d={splash.path} fill="#30033D" />
      <AnimatedSvgPath
        animatedProps={edgeProps}
        d={splash.path}
        fill="none"
        stroke="#9A58A7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
      />
      <AnimatedSvgPath
        animatedProps={sheenProps}
        d={splash.highlightPath}
        fill="none"
        stroke="#E6B9ED"
        strokeLinecap="round"
        strokeWidth={2.4}
      />
    </AnimatedSvgGroup>
  );
}

function RelicSvgMutationMaterialization({
  progress,
}: {
  progress: SharedValue<number>;
}) {
  const outerRingProps = useAnimatedProps(() => {
    const phase = relicMutationMaterialization(progress.value);
    return {
      opacity: Math.sin(phase * Math.PI) * .52,
      r: 30 + phase * 170,
    };
  });
  const innerRingProps = useAnimatedProps(() => {
    const phase = clamp01((relicMutationMaterialization(progress.value) - .14) / .86);
    return {
      opacity: Math.sin(phase * Math.PI) * .34,
      r: 20 + phase * 120,
    };
  });
  const coreProps = useAnimatedProps(() => {
    const phase = relicMutationMaterialization(progress.value);
    return {
      opacity: Math.sin(phase * Math.PI) * .22,
      r: 14 + phase * 64,
    };
  });
  const streakProps = useAnimatedProps(() => {
    const phase = relicMutationMaterialization(progress.value);
    return { opacity: Math.sin(phase * Math.PI) * .32 };
  });

  return (
    <>
      <AnimatedSvgCircle animatedProps={outerRingProps} cx={500} cy={610} fill="none" stroke="#D5A6FF" strokeWidth={2} />
      <AnimatedSvgCircle animatedProps={innerRingProps} cx={500} cy={610} fill="none" stroke="#7A2DAD" strokeWidth={4} />
      <AnimatedSvgCircle animatedProps={coreProps} cx={500} cy={610} fill="#8A32C2" />
      <AnimatedSvgPath
        animatedProps={streakProps}
        d="M500 300 L500 735 M464 340 L448 700 M536 340 L552 700"
        fill="none"
        stroke="#EBD9FF"
        strokeLinecap="round"
        strokeWidth={1.5}
      />
    </>
  );
}

function RelicMutationCrack({
  index,
  path,
  progress,
}: {
  index: number;
  path: string;
  progress: SharedValue<number>;
}) {
  const drawProgress = useDerivedValue(() => (
    relicMutationCrackProgress(progress.value, index)
  ));
  const opacity = useDerivedValue(() => (
    relicMutationCrackOpacity(progress.value, index)
  ));
  const glowOpacity = useDerivedValue(() => opacity.value * .24);

  return (
    <Group>
      <Path
        color="#B8D9EE"
        end={drawProgress}
        opacity={glowOpacity}
        path={path}
        strokeCap="butt"
        strokeJoin="miter"
        strokeWidth={1.7}
        style="stroke"
      >
        <BlurMask blur={5} style="normal" />
      </Path>
      <Path
        color="#F4E4FF"
        end={drawProgress}
        opacity={opacity}
        path={path}
        strokeCap="butt"
        strokeJoin="miter"
        strokeWidth={.62}
        style="stroke"
      />
    </Group>
  );
}

function RelicMutationShard({
  image,
  progress,
  shard,
}: {
  image: SkImage | null;
  progress: SharedValue<number>;
  shard: MutationShard;
}) {
  const phase = useDerivedValue(() => relicMutationBurstPhase(progress.value, shard.delay));
  const opacity = useDerivedValue(() => (
    relicMutationShardOpacity(progress.value, shard.delay)
  ));
  const glintOpacity = useDerivedValue(() => (
    relicMutationShardGlintOpacity(progress.value, shard.delay)
  ));
  const transform = useDerivedValue(() => {
    const eased = 1 - Math.pow(1 - phase.value, 3);
    return [
      { translateX: shard.dx * eased },
      { translateY: shard.dy * eased + 164 * phase.value * phase.value },
      { rotate: shard.rotation * (Math.PI / 180) * phase.value * 1.35 },
    ];
  });

  return (
    <Group
      clip={shard.path}
      opacity={opacity}
      origin={vec(shard.centerX, shard.centerY)}
      transform={transform}
    >
      <SkiaImage
        fit="fill"
        height={ARTBOARD_SIZE}
        image={image}
        width={ARTBOARD_SIZE}
        x={0}
        y={0}
      />
      <Path color="rgba(49,3,62,.22)" path={shard.path} />
      <Path
        color="rgba(238,217,250,.76)"
        path={shard.path}
        strokeWidth={1.5}
        style="stroke"
      />
      <Path
        color="#FFFFFF"
        opacity={glintOpacity}
        path={shard.path}
        strokeCap="round"
        strokeWidth={.65}
        style="stroke"
      />
    </Group>
  );
}

function RelicMutationSplash({
  progress,
  splash,
}: {
  progress: SharedValue<number>;
  splash: MutationSplash;
}) {
  const phase = useDerivedValue(() => relicMutationBurstPhase(progress.value, splash.delay));
  const transform = useDerivedValue(() => {
    const eased = 1 - Math.pow(1 - phase.value, 3);
    const dry = relicMutationSplashDryProgress(progress.value, splash.delay);
    const scale = splash.startScale + eased * (1.12 - splash.startScale) - dry * .09;
    return [
      { translateX: splash.driftX * eased },
      { translateY: splash.driftY * (.35 * eased + .65 * dry) },
      { scale },
    ];
  });
  const fillOpacity = useDerivedValue(() => (
    relicMutationSplashFillOpacity(progress.value, splash.delay)
  ));
  const edgeOpacity = useDerivedValue(() => (
    relicMutationSplashEdgeOpacity(progress.value, splash.delay)
  ));
  const sheenOpacity = useDerivedValue(() => (
    relicMutationSplashSheenOpacity(progress.value, splash.delay)
  ));

  return (
    <Group
      origin={vec(splash.centerX, splash.centerY)}
      transform={transform}
    >
      <Path color="#30033D" opacity={fillOpacity} path={splash.path} />
      <Path
        color="#9A58A7"
        opacity={edgeOpacity}
        path={splash.path}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={1.75}
        style="stroke"
      />
      <Path
        color="#E6B9ED"
        opacity={sheenOpacity}
        path={splash.highlightPath}
        strokeCap="round"
        strokeWidth={2.4}
        style="stroke"
      />
    </Group>
  );
}

function RelicMutationMaterialization({
  phase,
}: {
  phase: SharedValue<number>;
}) {
  const outerRadius = useDerivedValue(() => 30 + phase.value * 170);
  const outerOpacity = useDerivedValue(() => Math.sin(phase.value * Math.PI) * .52);
  const innerPhase = useDerivedValue(() => clamp01((phase.value - .14) / .86));
  const innerRadius = useDerivedValue(() => 20 + innerPhase.value * 120);
  const innerOpacity = useDerivedValue(() => Math.sin(innerPhase.value * Math.PI) * .34);
  const coreRadius = useDerivedValue(() => 14 + phase.value * 64);
  const coreOpacity = useDerivedValue(() => Math.sin(phase.value * Math.PI) * .22);
  const streakOpacity = useDerivedValue(() => Math.sin(phase.value * Math.PI) * .32);

  return (
    <Group>
      <Circle color="#D5A6FF" cx={500} cy={610} opacity={outerOpacity} r={outerRadius} strokeWidth={2} style="stroke" />
      <Circle color="#7A2DAD" cx={500} cy={610} opacity={innerOpacity} r={innerRadius} strokeWidth={4} style="stroke" />
      <Circle color="#8A32C2" cx={500} cy={610} opacity={coreOpacity} r={coreRadius}>
        <BlurMask blur={14} style="normal" />
      </Circle>
      <Path
        color="#EBD9FF"
        opacity={streakOpacity}
        path="M500 300 L500 735 M464 340 L448 700 M536 340 L552 700"
        strokeCap="round"
        strokeWidth={1.5}
        style="stroke"
      />
    </Group>
  );
}

function RelicBubble({
  cx,
  duration,
  energy,
  floor,
  mutationProgress,
  radius,
  reactionProgress,
  sourceLift,
  start,
  surfaceLevel,
  sway,
}: {
  cx: number;
  duration: number;
  energy: SharedValue<number>;
  floor: number;
  mutationProgress: SharedValue<number>;
  radius: number;
  reactionProgress: SharedValue<number>;
  sourceLift: number;
  start: number;
  surfaceLevel: number;
  sway: number;
}) {
  const sourceY = floor - sourceLift;
  const rise = Math.max(0, sourceY - (surfaceLevel + 2));
  const phase = useDerivedValue(() => relicBubblePhase(
    reactionProgress.value,
    mutationProgress.value,
    start,
    duration,
  ));
  const surfaceCx = cx + relicBubbleHorizontalOffset(.96, start, sway);
  const bubblePath = useDerivedValue(() => relicBubbleBodyPath(
    cx + relicBubbleHorizontalOffset(phase.value, start, sway),
    sourceY - phase.value * rise,
    radius,
    phase.value,
    start,
  ));
  const opacity = useDerivedValue(() => (
    relicBubbleBodyOpacity(phase.value, energy.value, rise)
  ));
  const fillOpacity = useDerivedValue(() => opacity.value * .72);
  const burstPhase = useDerivedValue(() => relicBubbleBurstPhase(phase.value));
  const burstOpacity = useDerivedValue(() => (
    relicBubbleBurstOpacity(phase.value, energy.value, rise)
  ));
  const ringPath = useDerivedValue(() => relicBubbleBurstRingPath(
    surfaceCx,
    surfaceLevel + 2,
    radius,
    burstPhase.value,
  ));
  const leftDropletX = useDerivedValue(() => surfaceCx - (radius + 5) * burstPhase.value);
  const rightDropletX = useDerivedValue(() => surfaceCx + (radius + 5) * burstPhase.value);
  const leftDropletY = useDerivedValue(() => (
    surfaceLevel + 1 - Math.sin(burstPhase.value * Math.PI) * (5 + radius * .5)
  ));
  const rightDropletY = useDerivedValue(() => (
    surfaceLevel + 1 - Math.sin(burstPhase.value * Math.PI) * (7 + radius * .62)
  ));
  const leftDropletOpacity = useDerivedValue(() => burstOpacity.value * .76);
  const rightDropletOpacity = useDerivedValue(() => burstOpacity.value * .68);
  const leftDropletRadius = useDerivedValue(() => (
    Math.max(1, radius * .22) * (1 - burstPhase.value * .35)
  ));
  const rightDropletRadius = useDerivedValue(() => (
    Math.max(.9, radius * .18) * (1 - burstPhase.value * .3)
  ));

  return (
    <Group>
      <Path color="#23022D" opacity={fillOpacity} path={bubblePath} />
      <Path color="#8D4D9C" opacity={opacity} path={bubblePath} style="stroke" strokeWidth={1.15} />
      <Path
        color="#A965B7"
        opacity={burstOpacity}
        path={ringPath}
        style="stroke"
        strokeWidth={1.2}
      />
      <Circle
        color="#864194"
        cx={leftDropletX}
        cy={leftDropletY}
        opacity={leftDropletOpacity}
        r={leftDropletRadius}
      />
      <Circle
        color="#A965B7"
        cx={rightDropletX}
        cy={rightDropletY}
        opacity={rightDropletOpacity}
        r={rightDropletRadius}
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: '#010308',
  },
});
