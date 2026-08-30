/// <reference types="jest" />

import { EMPTY_EQUIPPED_COSMETICS } from '@/src/features/shop/types';
import type { ProfileTeam } from '@/src/features/profile/types';

import {
  evaluateShowcaseAtmospherePerformance,
  resolveShowcaseAtmosphere,
  resolveShowcaseAtmosphereMode,
  SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT,
  SHOWCASE_ATMOSPHERE_FPS_FLOOR,
  showcaseAtmosphereColor,
} from '../showcase/showcaseAtmosphere';

const TEST_TEAM: ProfileTeam = {
  id: 'fnc',
  jeu: 'lol',
  logo: null,
  nom: 'Fnatic',
  relique: 'Ampoule',
  relique_niveau: 1,
  supporters: 1,
  tag: 'FNC',
};

const TEST_COSMETICS = {
  ...EMPTY_EQUIPPED_COSMETICS,
  frame: {
    accent: '#AAB4BE',
    description: '',
    id: 'frame-raw',
    level: 1,
    name: 'Cadre Brut',
    rarity: 'commun' as const,
    slot: 'cadre_profil' as const,
    styleKey: 'frame-raw',
  },
  core: {
    accent: '#E8FF3D',
    description: '',
    id: 'core-origin',
    level: 1,
    name: 'Core Origine',
    rarity: 'commun' as const,
    slot: 'apparence_core' as const,
    styleKey: 'core-origin',
  },
};

describe('showcase adaptive atmosphere', () => {
  it('derives distinct restrained tones from rank, team and equipped cosmetics', () => {
    const atmosphere = resolveShowcaseAtmosphere({
      cosmetics: TEST_COSMETICS,
      favoriteTeam: TEST_TEAM,
      lightingAccent: '#31D7E2',
      rankAccent: '#B87845',
      rankOrder: 0,
    });

    expect(atmosphere.rankColor).toBe('#B87845');
    expect(atmosphere.teamColor).toBe('#DAB649');
    expect(atmosphere.cosmeticColor).toBe('#AAB4BE');
    expect(atmosphere.lightingColor).toBe('#31D7E2');
    expect(atmosphere.intensity).toBeLessThanOrEqual(0.39);
    expect(atmosphere.dustCount).toBeLessThanOrEqual(11);
    expect(atmosphere.effect).toBe('ambient');
  });

  it('uses the Fnatic ember impulse profile before settling into idle', () => {
    const atmosphere = resolveShowcaseAtmosphere({
      cosmetics: {
        ...EMPTY_EQUIPPED_COSMETICS,
        factionEffect: {
          accent: '#FF5900',
          description: '',
          id: 'fnatic-embers',
          level: 1,
          name: 'Effet Braises',
          rarity: 'legendaire',
          slot: 'effet_faction',
          styleKey: 'fnatic-embers',
        },
      },
      favoriteTeam: null,
      lightingAccent: '#FF5900',
      rankAccent: '#B87845',
      rankOrder: 0,
    });

    expect(atmosphere).toMatchObject({
      cosmeticColor: '#FF5900',
      driftDurationMs: 12_000,
      dustCount: 11,
      effect: 'embers',
      intensity: 0.39,
    });
  });

  it('raises density modestly for a mythic rank and legendary object', () => {
    const atmosphere = resolveShowcaseAtmosphere({
      cosmetics: {
        ...EMPTY_EQUIPPED_COSMETICS,
        core: {
          accent: '#E8FF3D',
          description: '',
          id: 'mythic-core',
          level: 6,
          name: 'Cœur Mythique',
          rarity: 'legendaire',
          slot: 'apparence_core',
          styleKey: 'core-mythic',
        },
      },
      favoriteTeam: null,
      lightingAccent: '#9A6BFF',
      rankAccent: '#E8FF3D',
      rankOrder: 5,
    });

    expect(atmosphere.cosmeticColor).toBe('#E8FF3D');
    expect(atmosphere.dustCount).toBe(11);
    expect(atmosphere.intensity).toBeCloseTo(0.384, 3);
    expect(atmosphere.driftDurationMs).toBe(13_340);
  });

  it('lets an equipped rank display drive the cosmetic atmosphere', () => {
    const atmosphere = resolveShowcaseAtmosphere({
      cosmetics: {
        ...EMPTY_EQUIPPED_COSMETICS,
        showcase: {
          ...EMPTY_EQUIPPED_COSMETICS.showcase,
          rankDisplay: {
            accent: '#F5792A',
            description: '',
            id: 'rank_volcanic_forge',
            level: 5,
            name: 'Forge Volcanique',
            rarity: 'epique',
            slot: 'vitrine_rang',
            styleKey: 'rank-volcanic-forge',
          },
        },
      },
      favoriteTeam: null,
      lightingAccent: '#31D7E2',
      rankAccent: '#B87845',
      rankOrder: 0,
    });

    expect(atmosphere.cosmeticColor).toBe('#F5792A');
    expect(atmosphere.dustCount).toBe(8);
  });

  it.each([
    [{ fullScreen: false }, 'preview'],
    [{ platform: 'web' }, 'web'],
    [{ reduceMotion: true }, 'reduced-motion'],
    [{ active: false }, 'inactive'],
    [{ quality: 'static' as const }, 'requested'],
    [{ performanceStatus: 'failed' as const }, 'device'],
  ])('uses a static fallback for %o', (override, reason) => {
    expect(resolveShowcaseAtmosphereMode({
      active: true,
      fullScreen: true,
      performanceStatus: 'passed',
      platform: 'ios',
      quality: 'auto',
      reduceMotion: false,
      ...override,
    })).toEqual({ kind: 'static', reason });
  });

  it('animates only the active native full-screen scene', () => {
    expect(resolveShowcaseAtmosphereMode({
      active: true,
      fullScreen: true,
      performanceStatus: 'untested',
      platform: 'android',
      quality: 'auto',
      reduceMotion: false,
    })).toEqual({ kind: 'animated' });
  });

  it('enforces the native performance gate', () => {
    const passing = evaluateShowcaseAtmospherePerformance({
      droppedFrames: 10,
      elapsedMs: 2_200,
      frames: 126,
    });
    const failing = evaluateShowcaseAtmospherePerformance({
      droppedFrames: 30,
      elapsedMs: 2_200,
      frames: 105,
    });

    expect(passing.fps).toBeGreaterThanOrEqual(SHOWCASE_ATMOSPHERE_FPS_FLOOR);
    expect(passing.droppedFrameRatio).toBeLessThanOrEqual(SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT);
    expect(passing.passed).toBe(true);
    expect(failing.passed).toBe(false);
  });

  it('creates stable translucent colors for both renderers', () => {
    expect(showcaseAtmosphereColor('#31D7E2', 0.125)).toBe('rgba(49,215,226,0.125)');
  });
});
