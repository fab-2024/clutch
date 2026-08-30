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
    });
  });

  it('resolves known rooms without inventing a fallback', () => {
    expect(showcaseRoomById('volcanic-forge')?.name).toBe('Forge Volcanique');
    expect(showcaseRoomById('missing-room')).toBeNull();
  });
});
