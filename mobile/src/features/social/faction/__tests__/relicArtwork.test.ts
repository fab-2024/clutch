/// <reference types="jest" />

import {
  RELIC_CONTAINER_LABELS,
  RELIC_CONTAINER_SEQUENCE,
  RELIC_RUPTURE_TEMPLATE_BOUNDS,
  RELIC_STAGE_ARTWORK,
  relicContainerForLevel,
  relicContainerForPreview,
  relicLiquidDynamicSurfacePathForLevel,
  relicLiquidDynamicVolumePathForLevel,
  relicLiquidLevelForRatio,
  relicLiquidMeniscusPathForLevel,
  relicLiquidSurfaceForLevel,
  relicLiquidVolumePathForLevel,
  relicTransformArtworkPath,
  relicTransformArtworkPoint,
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

  it('gives every vessel its own complete anatomy and motion geometry', () => {
    const activeAssets = new Set<unknown>();
    const dormantAssets = new Set<unknown>();

    RELIC_CONTAINER_SEQUENCE.forEach((container) => {
      const { anatomy, motion } = RELIC_STAGE_ARTWORK[container];

      activeAssets.add(anatomy.activeAsset);
      dormantAssets.add(anatomy.dormantAsset);
      expect(anatomy.rootRegion).toMatch(/^M/);
      expect(anatomy.heartRegion).toMatch(/^M/);
      expect(Object.values(anatomy.rootBands)).toHaveLength(3);
      Object.values(anatomy.rootBands).forEach((band) => expect(band).toMatch(/^M/));
      expect(anatomy.heartCenter.x).toBeGreaterThan(motion.ruptureBounds.left);
      expect(anatomy.heartCenter.x).toBeLessThan(motion.ruptureBounds.right);
      expect(anatomy.heartCenter.y).toBeGreaterThan(motion.ruptureBounds.top);
      expect(anatomy.heartCenter.y).toBeLessThan(motion.ruptureBounds.bottom);
      expect(motion.glassBounds.right).toBeGreaterThan(motion.glassBounds.left);
      expect(motion.glassBounds.bottom).toBeGreaterThan(motion.glassBounds.top);
      expect(motion.ruptureBounds.right).toBeGreaterThan(motion.ruptureBounds.left);
      expect(motion.ruptureBounds.bottom).toBeGreaterThan(motion.ruptureBounds.top);
    });

    expect(activeAssets.size).toBe(RELIC_CONTAINER_SEQUENCE.length);
    expect(dormantAssets.size).toBe(RELIC_CONTAINER_SEQUENCE.length);
  });

  it('maps the shared rupture choreography onto each vessel without moving the Ampoule baseline', () => {
    const referencePath = 'M410 447 L500 577 L590 707 Z';
    const ampouleBounds = RELIC_STAGE_ARTWORK.ampoule.motion.ruptureBounds;
    const fioleBounds = RELIC_STAGE_ARTWORK.fiole.motion.ruptureBounds;

    expect(relicTransformArtworkPath(
      referencePath,
      RELIC_RUPTURE_TEMPLATE_BOUNDS,
      ampouleBounds,
    )).toBe(referencePath);
    expect(relicTransformArtworkPath(
      referencePath,
      RELIC_RUPTURE_TEMPLATE_BOUNDS,
      fioleBounds,
    )).toBe('M468 282 L500 488.5 L532 695 Z');
    expect(relicTransformArtworkPoint(
      { x: 500, y: 577 },
      RELIC_RUPTURE_TEMPLATE_BOUNDS,
      fioleBounds,
    )).toEqual({ x: 500, y: 488.5 });
  });

  it('defines a valid static elixir cavity for every full scene', () => {
    RELIC_CONTAINER_SEQUENCE.forEach((container) => {
      const config = RELIC_STAGE_ARTWORK[container];

      expect(config.interiorPath).toMatch(/^M/);
      expect(config.liquidLevel).toBeGreaterThan(200);
      expect(config.liquidLevel).toBeLessThan(800);
      expect(config.liquidFloor).toBeGreaterThan(config.liquidLevel);
      expect(config.liquidFloor).toBeLessThan(800);
      expect(config.liquidSurfaceProfile[0].y).toBe(config.liquidLevel);
      expect(config.liquidSurfaceProfile.at(-1)?.y).toBe(config.liquidFloor);
      config.liquidSurfaceProfile.forEach((point, index) => {
        expect(point.left).toBeGreaterThan(0);
        expect(point.right).toBeLessThan(1000);
        expect(point.right).toBeGreaterThan(point.left);
        if (index > 0) expect(point.y).toBeGreaterThan(config.liquidSurfaceProfile[index - 1].y);
      });
      expect(config.stage).toBeGreaterThanOrEqual(1);
      expect(config.stage).toBeLessThanOrEqual(5);
    });
  });

  it('interpolates the meniscus against each current vessel silhouette', () => {
    const config = RELIC_STAGE_ARTWORK.ampoule;
    const ceiling = relicLiquidSurfaceForLevel(config, config.liquidLevel);
    const belly = relicLiquidSurfaceForLevel(config, 580);
    const interpolated = relicLiquidSurfaceForLevel(config, 520);
    const floor = relicLiquidSurfaceForLevel(config, config.liquidFloor);

    expect(ceiling).toMatchObject({ left: 465, right: 535, width: 70, x: 500 });
    expect(belly).toMatchObject({ left: 414, right: 586, width: 172, x: 500 });
    expect(interpolated).toMatchObject({ left: 431, right: 569, width: 138, x: 500 });
    expect(floor).toMatchObject({ left: 463, right: 537, width: 74, x: 500 });
    expect(relicLiquidSurfaceForLevel(config, 0)).toEqual(ceiling);
    expect(relicLiquidSurfaceForLevel(config, 1_000)).toEqual(floor);
  });

  it('interpolates every continuous elixir ratio between floor and ceiling', () => {
    const config = RELIC_STAGE_ARTWORK.ampoule;
    const level19 = relicLiquidLevelForRatio(config, (19 - 1) / 99);
    const level20 = relicLiquidLevelForRatio(config, (20 - 1) / 99);
    const level50 = relicLiquidLevelForRatio(config, (50 - 1) / 99);
    const level51 = relicLiquidLevelForRatio(config, (51 - 1) / 99);

    expect(relicLiquidLevelForRatio(config, 0)).toBe(config.liquidFloor);
    expect(relicLiquidLevelForRatio(config, 1)).toBe(config.liquidLevel);
    expect(level20).toBeLessThan(level19);
    expect(level51).toBeLessThan(level50);
    expect(level19 - level20).toBeCloseTo((config.liquidFloor - config.liquidLevel) / 99);
    expect(level50 - level51).toBeCloseTo((config.liquidFloor - config.liquidLevel) / 99);
    expect(relicLiquidLevelForRatio(config, -1)).toBe(config.liquidFloor);
    expect(relicLiquidLevelForRatio(config, 2)).toBe(config.liquidLevel);
  });

  it('builds the elixir as a closed vessel-shaped volume instead of a viewport rectangle', () => {
    const config = RELIC_STAGE_ARTWORK.ampoule;

    expect(relicLiquidVolumePathForLevel(config, 580, 10)).toBe(
      'M424 580 L576 580 L573 620 L557 660 L527 690 L473 690 L443 660 L427 620 L424 580 Z',
    );
    expect(relicLiquidVolumePathForLevel(config, config.liquidFloor, 10)).toBe('');
    expect(relicLiquidVolumePathForLevel(config, config.liquidLevel, 10)).not.toContain('H1000');
  });

  it('keeps every generated liquid boundary inside every current vessel profile', () => {
    RELIC_CONTAINER_SEQUENCE.forEach((container) => {
      const config = RELIC_STAGE_ARTWORK[container];

      [.25, .5, .75, 1].forEach((ratio) => {
        const level = relicLiquidLevelForRatio(config, ratio);
        const path = relicLiquidVolumePathForLevel(config, level, 10);
        const boundaryPoints = [...path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)];

        expect(path).toMatch(/^M/);
        expect(path).toMatch(/Z$/);
        boundaryPoints.forEach((match) => {
          const x = Number(match[1]);
          const y = Number(match[2]);
          const surface = relicLiquidSurfaceForLevel(config, y);

          expect(x).toBeGreaterThanOrEqual(surface.left);
          expect(x).toBeLessThanOrEqual(surface.right);
        });
      });
    });
  });

  it('draws a contained meniscus and omits it for an empty vessel', () => {
    const config = RELIC_STAGE_ARTWORK.ampoule;
    const level = relicLiquidLevelForRatio(config, .5);
    const surface = relicLiquidSurfaceForLevel(config, level);
    const meniscus = relicLiquidMeniscusPathForLevel(config, level, 12);

    expect(meniscus).toMatch(new RegExp(`^M${surface.left + 12} ${surface.y}`));
    expect(meniscus).toMatch(/Z$/);
    expect(relicLiquidMeniscusPathForLevel(config, config.liquidFloor, 12)).toBe('');
  });

  it('deforms one closed liquid volume from the same surface geometry', () => {
    const config = RELIC_STAGE_ARTWORK.ampoule;
    const level = relicLiquidLevelForRatio(config, .5);
    const offsets = { center: 3, left: -6, right: -6 };
    const surface = relicLiquidDynamicSurfacePathForLevel(config, level, 10, offsets);
    const volume = relicLiquidDynamicVolumePathForLevel(config, level, 10, offsets);

    expect(surface).toMatch(/^M/);
    expect(surface).toContain(' C');
    expect(surface).not.toContain('Z');
    expect(volume.startsWith(surface)).toBe(true);
    expect(volume).toMatch(/Z$/);
    expect((volume.match(/M/g) ?? [])).toHaveLength(1);
    expect(relicLiquidDynamicVolumePathForLevel(
      config,
      config.liquidFloor,
      10,
      offsets,
    )).toBe('');
  });
});
