/// <reference types="jest" />

import {
  heartAssetForContainer,
  RELIC_CONTAINER_LABELS,
  RELIC_CONTAINER_SEQUENCE,
  RELIC_HEART_ASSET,
  RELIC_STAGE_ARTWORK,
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
});
