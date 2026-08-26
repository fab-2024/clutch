/// <reference types="jest" />

import { collectionScopeFromParam, shopSurfaceFromParam } from '../../scope';

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

  it('opens the Atelier by default while keeping the Locker explicit', () => {
    expect(shopSurfaceFromParam(undefined)).toBe('atelier');
    expect(shopSurfaceFromParam('catalog')).toBe('atelier');
    expect(shopSurfaceFromParam(['catalog'])).toBe('atelier');
    expect(shopSurfaceFromParam('owned')).toBe('locker');
  });
});
