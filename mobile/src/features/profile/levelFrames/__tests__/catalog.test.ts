/// <reference types="jest" />

import {
  LEVEL_FRAME_CATALOG_ORDER,
  resolveLevelFrameCollection,
  resolveOwnedLevelFrames,
} from '../catalog';

describe('level frame catalog', () => {
  it('keeps level frames in a category distinct from signature cosmetics', () => {
    expect(LEVEL_FRAME_CATALOG_ORDER).toEqual([
      'signalAscendant',
      'voltRift',
      'azurOrbit',
      'founderForge',
      'violetSovereign',
      'obsidianFracture',
      'novaPrism',
    ]);
  });

  it('always owns Signal Ascendant and unlocks Founder Forge for founders', () => {
    expect(resolveOwnedLevelFrames()).toEqual(['signalAscendant']);
    expect(resolveOwnedLevelFrames({ founder: true })).toEqual(['signalAscendant', 'founderForge']);
  });

  it('resolves ownership and equipment without touching a user level', () => {
    const level = 42;
    const collection = resolveLevelFrameCollection('azurOrbit', ['signalAscendant', 'azurOrbit']);

    expect(collection.find((entry) => entry.variant === 'azurOrbit')).toMatchObject({ equipped: true, owned: true });
    expect(collection.find((entry) => entry.variant === 'novaPrism')).toMatchObject({ equipped: false, owned: false });
    expect(level).toBe(42);
  });
});
