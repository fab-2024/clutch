/// <reference types="jest" />

import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  SHOWCASE_PRESENTER_CATALOG,
  showcasePresenterById,
} from '../../showcasePresenterCatalog';

describe('showcase presenter catalog', () => {
  it('keeps the six approved presenters in visual order', () => {
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.id)).toEqual([
      'supports_gallery',
      'supports_forge',
      'supports_halo',
      'supports_crystal',
      'supports_vault',
      'supports_champagne',
    ]);
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.slots.length)).toEqual([
      8,
      8,
      10,
      8,
      10,
      6,
    ]);
  });

  it('keeps every placement independently clickable inside each presenter', () => {
    SHOWCASE_PRESENTER_CATALOG.forEach((presenter) => {
      expect(presenter.image).toBeTruthy();
      expect(new Set(presenter.slots.map((slot) => slot.id)).size).toBe(presenter.slots.length);
      expect(presenter.slots.every((slot) => Number.parseFloat(slot.width) > 0)).toBe(true);
      expect(presenter.slots.every((slot) => Number.parseFloat(slot.height) > 0)).toBe(true);
    });
  });

  it('keeps Cercle Obsidienne as the included compatibility default', () => {
    expect(DEFAULT_SHOWCASE_PRESENTER_ID).toBe('supports_gallery');
    expect(showcasePresenterById(DEFAULT_SHOWCASE_PRESENTER_ID)).toMatchObject({
      name: 'Cercle Obsidienne',
      price: 0,
      rarity: 'commun',
    });
  });
});
