import { ATELIER_CATEGORIES, ATELIER_CATALOG, PACK_ROOM_ATELIER_PRODUCTS, atelierProductById } from '../../atelierCatalog';
import { isShopItemAvailable } from '../../effectAvailability';

describe('replacement cabinet shop', () => {
  it('offers only the three current cabinets among showcase fittings', () => {
    const fittings = ATELIER_CATALOG.filter((item) => item.slot.startsWith('vitrine_'));
    expect(fittings.filter(isShopItemAvailable).map((item) => item.id)).toEqual([
      'supports_gallery', 'cabinet_galerie', 'cabinet_midnight',
    ]);
    expect(PACK_ROOM_ATELIER_PRODUCTS.filter(isShopItemAvailable)).toEqual([]);
  });

  it('keeps the three independently equipped controls visible in the Atelier', () => {
    expect(ATELIER_CATEGORIES).toEqual(['supports', 'lighting', 'pedestals']);
    expect(atelierProductById('lighting_cyan')).not.toBeNull();
    expect(atelierProductById('rank_carbon_cradle')).not.toBeNull();
  });
});
