import {
  createDefaultShowcaseRoomAssignments,
  type ShowcasePlaceableItem,
  type ShowcaseRoomAssignments,
} from '@/src/features/profile/components/showcase/roomEditor';

import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  showcasePresenterById,
} from './showcasePresenterCatalog';
import { cosmeticPackById } from './teamPackCatalog';

export function createPresenterRoomAssignments(
  items: readonly ShowcasePlaceableItem[],
  presenterId: string,
): ShowcaseRoomAssignments {
  const presenter = showcasePresenterById(presenterId)
    ?? showcasePresenterById(DEFAULT_SHOWCASE_PRESENTER_ID)!;
  const assignments = createDefaultShowcaseRoomAssignments(items, presenter.slots);
  const pack = cosmeticPackById(presenter.packId);
  if (!pack) return assignments;

  const itemById = new Map(items.map((item) => [item.id, item]));
  pack.items.forEach((definition) => {
    if (!definition.roomSlot) return;
    const item = itemById.get(`cosmetic:${definition.id}`);
    if (item) assignments[definition.roomSlot] = item;
  });
  return assignments;
}
