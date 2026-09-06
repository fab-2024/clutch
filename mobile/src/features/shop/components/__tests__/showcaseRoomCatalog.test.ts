/// <reference types="jest" />

import {
  SHOWCASE_ROOM_CATALOG,
  showcaseRoomById,
} from '../../showcaseRoomCatalog';

describe('showcase room catalogue', () => {
  it('exposes the six room references with unique identifiers and presets', () => {
    expect(SHOWCASE_ROOM_CATALOG).toHaveLength(6);
    expect(new Set(SHOWCASE_ROOM_CATALOG.map((room) => room.id)).size).toBe(6);
    SHOWCASE_ROOM_CATALOG.forEach((room) => {
      expect(room.image).toBeTruthy();
      expect(room.name).toBeTruthy();
      expect(room.description).toBeTruthy();
      expect(room.theme).toBeTruthy();
      expect(room.lighting).toBeTruthy();
      expect(room.pedestal).toBeTruthy();
      expect(room.productId).toBeTruthy();
      expect(room.sceneFrame).toEqual({ width: 1844, height: 853, top: 0, bottom: 853 });
      expect(room.slots).toHaveLength(8);
      expect(new Set(room.slots.map((slot) => slot.id)).size).toBe(8);
      room.slots.forEach((slot) => {
        expect(slot.artworkLift).toBeGreaterThan(0);
        expect(Number.parseFloat(slot.top) + Number.parseFloat(slot.height)).toBeLessThanOrEqual(70);
      });
    });
    expect(new Set(SHOWCASE_ROOM_CATALOG.map((room) => room.productId)).size).toBe(6);
  });

  it('resolves known rooms without inventing a fallback', () => {
    expect(showcaseRoomById('volcanic-forge')?.name).toBe('Forge Volcanique');
    expect(showcaseRoomById('missing-room')).toBeNull();
  });
});
