/// <reference types="jest" />

import {
  heartAssetForContainer,
  RELIC_CONTAINER_LABELS,
  RELIC_CONTAINER_SEQUENCE,
  RELIC_HEART_ASSET,
  RELIC_STAGE_ARTWORK,
  SKIA_RELIC_STAGE_ARTWORK,
  relicContainerForPreview,
  rootBranchesForContainer,
} from '../relicArtwork';

describe('relic artwork progression', () => {
  it('uses the exact same heart asset for every vessel', () => {
    const heartAssets = RELIC_CONTAINER_SEQUENCE.map(heartAssetForContainer);

    expect(new Set(heartAssets).size).toBe(1);
    expect(heartAssets.every((asset) => asset === RELIC_HEART_ASSET)).toBe(true);
  });

  it('adds branches cumulatively at every evolution', () => {
    const counts = RELIC_CONTAINER_SEQUENCE.map((container) => (
      rootBranchesForContainer(container).length
    ));

    expect(counts).toEqual([3, 7, 12, 17, 23]);
    counts.slice(1).forEach((count, index) => {
      expect(count).toBeGreaterThan(counts[index]);
    });
  });

  it('never gives an advanced vessel fewer branches than its predecessor', () => {
    RELIC_CONTAINER_SEQUENCE.slice(1).forEach((container, index) => {
      const previous = RELIC_CONTAINER_SEQUENCE[index];
      expect(rootBranchesForContainer(container).length).toBeGreaterThanOrEqual(
        rootBranchesForContainer(previous).length,
      );
    });
  });

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

  it('keeps the five Skia chassis aligned with the same progression', () => {
    expect(RELIC_CONTAINER_SEQUENCE.map((container) => ({
      matte: SKIA_RELIC_STAGE_ARTWORK[container].neutralMatte,
      stage: SKIA_RELIC_STAGE_ARTWORK[container].stage,
    }))).toEqual([
      { matte: true, stage: 1 },
      { matte: true, stage: 2 },
      { matte: true, stage: 3 },
      { matte: true, stage: 4 },
      { matte: true, stage: 5 },
    ]);
  });

  it('keeps the Skia heart proportional to every chamber', () => {
    expect(RELIC_CONTAINER_SEQUENCE.map((container) => (
      SKIA_RELIC_STAGE_ARTWORK[container].heartScale
    ))).toEqual([.5, .59, .66, .68, .68]);

    const renderedHeartSizes = RELIC_CONTAINER_SEQUENCE.map((container) => {
      const config = SKIA_RELIC_STAGE_ARTWORK[container];
      return 56 * config.heartScale * config.layout.height / 330;
    });
    expect(renderedHeartSizes.every((size, index) => index === 0 || size > renderedHeartSizes[index - 1])).toBe(true);
  });

  it('uses the former second vessel for form I and the former first vessel for form II', () => {
    expect({
      formI: {
        contactY: SKIA_RELIC_STAGE_ARTWORK.ampoule.contactY,
        heartY: SKIA_RELIC_STAGE_ARTWORK.ampoule.heartY,
        width: SKIA_RELIC_STAGE_ARTWORK.ampoule.layout.width,
      },
      formII: {
        contactY: SKIA_RELIC_STAGE_ARTWORK.fiole.contactY,
        heartY: SKIA_RELIC_STAGE_ARTWORK.fiole.heartY,
        width: SKIA_RELIC_STAGE_ARTWORK.fiole.layout.width,
      },
    }).toEqual({
      formI: { contactY: 304, heartY: 267, width: 158 },
      formII: { contactY: 248, heartY: 214, width: 300 },
    });
  });
});
