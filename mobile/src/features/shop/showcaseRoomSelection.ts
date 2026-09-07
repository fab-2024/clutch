import { showcasePresenterByRoomId } from './showcasePresenterCatalog';
import { showcaseRoomByProductId } from './showcaseRoomCatalog';
import type { EquippedCosmetics } from './types';

export const DEFAULT_SHOWCASE_LIGHTING_ID = 'lighting_cyan';

// Collection rooms occupy the legacy lighting slot; standard rooms use supports.
export function conflictingCollectionRoom(equipped: EquippedCosmetics | null | undefined, roomId: string) {
  const lightingId = equipped?.showcase.lighting?.id;
  return showcaseRoomByProductId(roomId) && showcasePresenterByRoomId(lightingId)
    ? lightingId ?? null
    : null;
}
