/// <reference types="jest" />

import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  SHOWCASE_PRESENTER_CATALOG,
  showcasePresenterById,
} from '../../showcasePresenterCatalog';
import {
  CHUTE_LIBRE_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  DERNIER_ROUND_PACK,
  SANG_DES_TITANS_PACK,
  SERMENT_DU_GIVRE_PACK,
  TURBO_ARENA_PACK,
} from '../../teamPackCatalog';

describe('current showcase presenter catalog', () => {
  it('contains the current cabinet and collection rooms only', () => {
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.id)).toEqual([
      'supports_gallery',
      'neon-protocol-vector-pedestals',
      'mythes-forge-magma-pedestals',
      'circuit-zero-aero-pedestals',
      'sang-des-titans-monolith-pedestal',
      'chute-libre-drop-pedestal',
      'serment-du-givre-ice-sheet-pedestal',
      'conclave-arcanique-rosette-pedestal',
      'turbo-arena-kickoff-pedestal',
      'dernier-round-extraction-pedestal',
    ]);
    expect(showcasePresenterById('fnatic-pedestals')).toBeNull();
    expect(showcasePresenterById('valorant-jett-gallery')).toBeNull();
  });

  it.each([
    [SANG_DES_TITANS_PACK, 'sang-des-titans-monolith-pedestal'],
    [CHUTE_LIBRE_PACK, 'chute-libre-drop-pedestal'],
    [SERMENT_DU_GIVRE_PACK, 'serment-du-givre-ice-sheet-pedestal'],
    [CONCLAVE_ARCANIQUE_PACK, 'conclave-arcanique-rosette-pedestal'],
    [TURBO_ARENA_PACK, 'turbo-arena-kickoff-pedestal'],
    [DERNIER_ROUND_PACK, 'dernier-round-extraction-pedestal'],
  ] as const)('links $name to its current room', (pack, presenterId) => {
    expect(showcasePresenterById(presenterId)).toMatchObject({
      packId: pack.id,
      packOnly: true,
      showRankDisplay: false,
    });
  });

  it('keeps every placement independently selectable', () => {
    SHOWCASE_PRESENTER_CATALOG.forEach((presenter) => {
      expect(presenter.image).toBeTruthy();
      expect(new Set(presenter.slots.map((slot) => slot.id)).size).toBe(presenter.slots.length);
    });
    expect(DEFAULT_SHOWCASE_PRESENTER_ID).toBe('supports_gallery');
    expect(showcasePresenterById(DEFAULT_SHOWCASE_PRESENTER_ID)?.name).toBe('Classique');
  });
});
