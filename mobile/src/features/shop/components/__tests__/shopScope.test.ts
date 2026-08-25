/// <reference types="jest" />

import { collectionScopeFromParam } from '../../scope';

describe('ShopScreen collection scope', () => {
  it('opens the catalogue for scope=catalog', () => {
    expect(collectionScopeFromParam('catalog')).toBe('catalog');
    expect(collectionScopeFromParam(['catalog'])).toBe('catalog');
  });

  it('falls back to owned objects for any other value', () => {
    expect(collectionScopeFromParam('owned')).toBe('owned');
    expect(collectionScopeFromParam('unknown')).toBe('owned');
    expect(collectionScopeFromParam(undefined)).toBe('owned');
  });
});
