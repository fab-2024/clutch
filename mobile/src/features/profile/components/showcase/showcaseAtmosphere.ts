import type { EquippedCosmetic, EquippedCosmetics } from '@/src/features/shop/types';
import { teamHue } from '@/src/utils/teams';

import type { ProfileTeam } from '../../types';

export const SHOWCASE_ATMOSPHERE_RELEASE_TARGET_FPS = 60;
// The short runtime sample allows slight measurement jitter; release approval
// still requires the sustained target above on a physical mid-range device.
export const SHOWCASE_ATMOSPHERE_FPS_FLOOR = 56;
export const SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT = 0.1;
export const SHOWCASE_ATMOSPHERE_SAMPLE_WARMUP_MS = 600;
export const SHOWCASE_ATMOSPHERE_SAMPLE_DURATION_MS = 2_200;

export type ShowcaseAtmosphereQuality = 'auto' | 'animated' | 'static';
export type ShowcaseAtmospherePerformanceStatus = 'untested' | 'passed' | 'failed';
export type ShowcaseAtmosphereStaticReason =
  | 'device'
  | 'inactive'
  | 'preview'
  | 'reduced-motion'
  | 'requested'
  | 'web';

export type ShowcaseAtmosphereMode =
  | { kind: 'animated' }
  | { kind: 'static'; reason: ShowcaseAtmosphereStaticReason };

export type ShowcaseAtmosphere = {
  cosmeticColor: string;
  driftDurationMs: number;
  dustCount: number;
  effect: 'ambient' | 'embers';
  intensity: number;
  lightingColor: string;
  rankColor: string;
  teamColor: string;
};

export type ShowcaseAtmospherePerformanceReport = {
  droppedFrameRatio: number;
  fps: number;
  passed: boolean;
  sampleDurationMs: number;
};

export function resolveShowcaseAtmosphere({
  cosmetics,
  favoriteTeam,
  lightingAccent,
  rankAccent,
  rankOrder,
}: {
  cosmetics?: EquippedCosmetics | null;
  favoriteTeam?: ProfileTeam | null;
  lightingAccent: string;
  rankAccent: string;
  rankOrder?: number | null;
}): ShowcaseAtmosphere {
  const safeRankOrder = clamp(Math.floor(Number(rankOrder) || 0), 0, 5);
  const signatureCosmetic = strongestEquippedCosmetic(cosmetics);
  const rarityWeight = rarityScore(signatureCosmetic);
  const embers = cosmetics?.factionEffect?.id === 'fnatic-embers'
    || cosmetics?.factionEffect?.styleKey === 'fnatic-embers';
  const intensity = embers
    ? 0.39
    : clamp(0.22 + safeRankOrder * 0.022 + rarityWeight * 0.018, 0.22, 0.39);

  return {
    cosmeticColor: embers
      ? '#FF5900'
      : normalizeHex(signatureCosmetic?.accent, normalizeHex(cosmetics?.core?.accent, rankAccent)),
    driftDurationMs: embers
      ? 12_000
      : clamp(17_000 - safeRankOrder * 480 - rarityWeight * 420, 12_200, 17_000),
    dustCount: embers
      ? 11
      : clamp(6 + Math.floor(safeRankOrder / 2) + rarityWeight, 6, 11),
    effect: embers ? 'embers' : 'ambient',
    intensity,
    lightingColor: normalizeHex(lightingAccent, '#31D7E2'),
    rankColor: normalizeHex(rankAccent, '#E8FF3D'),
    teamColor: favoriteTeam
      ? hslToHex(teamHue(favoriteTeam.tag, favoriteTeam.nom), 66, 57)
      : normalizeHex(cosmetics?.factionEffect?.accent, '#71808B'),
  };
}

export function resolveShowcaseAtmosphereMode({
  active,
  fullScreen,
  performanceStatus,
  platform,
  quality,
  reduceMotion,
}: {
  active: boolean;
  fullScreen: boolean;
  performanceStatus: ShowcaseAtmospherePerformanceStatus;
  platform: string;
  quality: ShowcaseAtmosphereQuality;
  reduceMotion: boolean;
}): ShowcaseAtmosphereMode {
  if (!fullScreen) return { kind: 'static', reason: 'preview' };
  if (platform === 'web') return { kind: 'static', reason: 'web' };
  if (reduceMotion) return { kind: 'static', reason: 'reduced-motion' };
  if (!active) return { kind: 'static', reason: 'inactive' };
  if (quality === 'static') return { kind: 'static', reason: 'requested' };
  if (performanceStatus === 'failed') return { kind: 'static', reason: 'device' };
  return { kind: 'animated' };
}

export function evaluateShowcaseAtmospherePerformance({
  droppedFrames,
  elapsedMs,
  frames,
}: {
  droppedFrames: number;
  elapsedMs: number;
  frames: number;
}): ShowcaseAtmospherePerformanceReport {
  const safeElapsed = Math.max(1, Number(elapsedMs) || 0);
  const safeFrames = Math.max(0, Math.floor(Number(frames) || 0));
  const safeDropped = clamp(Math.floor(Number(droppedFrames) || 0), 0, safeFrames);
  const fps = safeFrames / (safeElapsed / 1_000);
  const droppedFrameRatio = safeFrames > 0 ? safeDropped / safeFrames : 1;
  const passed = fps >= SHOWCASE_ATMOSPHERE_FPS_FLOOR
    && droppedFrameRatio <= SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT;

  return {
    droppedFrameRatio: round(droppedFrameRatio, 3),
    fps: round(fps, 1),
    passed,
    sampleDurationMs: Math.round(safeElapsed),
  };
}

export function showcaseAtmosphereColor(color: string, opacity: number) {
  const normalized = normalizeHex(color, '#71808B');
  const alpha = clamp(opacity, 0, 1);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${round(alpha, 3)})`;
}

function strongestEquippedCosmetic(cosmetics?: EquippedCosmetics | null) {
  const items = [
    cosmetics?.frame,
    cosmetics?.title,
    cosmetics?.core,
    cosmetics?.factionEffect,
    cosmetics?.profileCard,
    cosmetics?.showcase.material,
    cosmetics?.showcase.lighting,
    cosmetics?.showcase.supports,
    cosmetics?.showcase.rankDisplay,
    cosmetics?.showcase.jersey,
  ].filter((item): item is EquippedCosmetic => Boolean(item));

  return items.reduce<EquippedCosmetic | null>((strongest, item) => {
    if (!strongest) return item;
    return rarityScore(item) > rarityScore(strongest) ? item : strongest;
  }, null);
}

function rarityScore(cosmetic?: EquippedCosmetic | null) {
  if (cosmetic?.rarity === 'legendaire') return 3;
  if (cosmetic?.rarity === 'epique') return 2;
  if (cosmetic?.rarity === 'rare') return 1;
  return 0;
}

function normalizeHex(value: string | null | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? '') ? String(value).toUpperCase() : fallback.toUpperCase();
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] = section < 1
    ? [chroma, x, 0]
    : section < 2
      ? [x, chroma, 0]
      : section < 3
        ? [0, chroma, x]
        : section < 4
          ? [0, x, chroma]
          : section < 5
            ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number, precision: number) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}
