/// <reference types="jest" />

import {
  SHOWCASE_ROOM_CATALOG,
  showcaseRoomById,
} from '../../showcaseRoomCatalog';

describe('showcase room catalogue', () => {
  it('exposes the three cabinet references with unique identifiers and presets', () => {
    expect(SHOWCASE_ROOM_CATALOG).toHaveLength(3);
    expect(SHOWCASE_ROOM_CATALOG.map(room => room.storePriceCents ?? 0)).toEqual([0, 399, 399]);
    expect(new Set(SHOWCASE_ROOM_CATALOG.map((room) => room.id)).size).toBe(3);
    SHOWCASE_ROOM_CATALOG.forEach((room) => {
      expect(room.image).toBeTruthy();
      expect(room.name).toBeTruthy();
      expect(room.description).toBeTruthy();
      expect(room.theme).toBeTruthy();
      expect(room.lighting).toBeTruthy();
      expect(room.pedestal).toBeTruthy();
      expect(room.productId).toBeTruthy();
      expect(room.sceneFrame).toEqual({ width: 1536, height: 1024, top: 0, bottom: 1024 });
      expect(room.slots).toHaveLength(8);
      expect(new Set(room.slots.map((slot) => slot.id)).size).toBe(8);
      room.slots.forEach((slot) => {
        expect(slot.artworkLift).toBeGreaterThanOrEqual(0);
        expect(Number.parseFloat(slot.top) + Number.parseFloat(slot.height)).toBeLessThanOrEqual(90);
      });
    });
    expect(new Set(SHOWCASE_ROOM_CATALOG.map((room) => room.productId)).size).toBe(3);
  });

  it('resolves known rooms without inventing a fallback', () => {
    expect(showcaseRoomById('volcanic-forge')?.name).toBe('Classique');
    expect(showcaseRoomById('missing-room')).toBeNull();
  });
});
