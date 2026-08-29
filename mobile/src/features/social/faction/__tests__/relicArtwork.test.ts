/// <reference types="jest" />

import {
  RELIC_CONTAINER_LABELS,
  RELIC_CONTAINER_SEQUENCE,
  RELIC_STAGE_ARTWORK,
  relicContainerForLevel,
  relicContainerForPreview,
} from '../relicArtwork';

describe('relic artwork progression', () => {
  it('maps the five public forms to the correct internal profiles', () => {
    expect(RELIC_CONTAINER_SEQUENCE.map((container) => ({
      container,
      label: RELIC_CONTAINER_LABELS[container],
      stage: RELIC_STAGE_ARTWORK[container].stage,
    }))).toEqual([
      { container: 'ampoule', label: 'Ampoule', stage: 1 },
      { container: 'fiole', label: 'Fiole', stage: 2 },
      { container: 'flacon', label: 'Flacon', stage: 3 },
      { container: 'reacteur', label: 'Bonbonne', stage: 4 },
      { container: 'reliquaire', label: 'Cuve', stage: 5 },
    ]);

    expect(relicContainerForPreview('ampoule')).toBe('ampoule');
    expect(relicContainerForPreview('fiole')).toBe('fiole');
    expect(relicContainerForPreview('flacon')).toBe('flacon');
    expect(relicContainerForPreview('bonbonne')).toBe('reacteur');
    expect(relicContainerForPreview('cuve')).toBe('reliquaire');
  });

  it('uses five distinct full-scene assets in level order', () => {
    const sceneAssets = RELIC_CONTAINER_SEQUENCE.map((container) => RELIC_STAGE_ARTWORK[container].asset);

    expect(new Set(sceneAssets).size).toBe(5);
    expect([1, 2, 3, 4, 5].map(relicContainerForLevel)).toEqual(RELIC_CONTAINER_SEQUENCE);
  });

  it('defines a valid static elixir cavity for every full scene', () => {
    RELIC_CONTAINER_SEQUENCE.forEach((container) => {
      const config = RELIC_STAGE_ARTWORK[container];

      expect(config.interiorPath).toMatch(/^M/);
      expect(config.liquidLevel).toBeGreaterThan(200);
      expect(config.liquidLevel).toBeLessThan(800);
      expect(config.liquidSurfaceX).toBeGreaterThan(0);
      expect(config.liquidSurfaceX).toBeLessThan(1000);
      expect(config.liquidSurfaceWidth).toBeGreaterThan(0);
      expect(config.stage).toBeGreaterThanOrEqual(1);
      expect(config.stage).toBeLessThanOrEqual(5);
    });
  });
});
