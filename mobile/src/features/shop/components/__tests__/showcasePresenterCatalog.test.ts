/// <reference types="jest" />

import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  SHOWCASE_PRESENTER_CATALOG,
  showcasePresenterById,
} from '../../showcasePresenterCatalog';

describe('showcase presenter catalog', () => {
  it('keeps the approved presenters and team-pack scenes in visual order', () => {
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.id)).toEqual([
      'supports_gallery',
      'supports_forge',
      'supports_halo',
      'supports_crystal',
      'supports_vault',
      'supports_champagne',
      'fnatic-pedestals',
      'kc-pedestals',
      'm8-pedestals',
    ]);
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.slots.length)).toEqual([
      8,
      8,
      10,
      8,
      10,
      6,
      10,
      10,
      10,
    ]);
  });

  it('exposes ten clickable slots linked to the KC Blue Wall pack', () => {
    expect(showcasePresenterById('kc-pedestals')).toMatchObject({
      accent: '#168DFF',
      name: 'Karmine Corp Blue Wall',
      packId: 'kc-blue-wall',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('kc-pedestals')?.slots).toHaveLength(10);
  });

  it('exposes ten clickable slots for the Fnatic Black & Orange room', () => {
    expect(showcasePresenterById('fnatic-pedestals')).toMatchObject({
      accent: '#FF5900',
      name: 'Fnatic Black & Orange',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('fnatic-pedestals')?.slots).toHaveLength(10);
  });

  it('exposes ten clickable slots linked to the M8 Gentle Mates Paris pack', () => {
    expect(showcasePresenterById('m8-pedestals')).toMatchObject({
      accent: '#B9DCFF',
      name: 'M8 Gentle Mates Paris',
      packId: 'm8-gentle-mates',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('m8-pedestals')?.slots).toHaveLength(10);
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
