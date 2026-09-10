import { useLocalSearchParams } from 'expo-router';

import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import { SHOWCASE_ROOM_CATALOG } from '@/src/features/shop/showcaseRoomCatalog';
import { showcasePresenterById } from '@/src/features/shop/showcasePresenterCatalog';
import {
  COSMETIC_PACK_CATALOG,
  INDIVIDUAL_COLLECTION_CATALOG,
  currentCosmeticPackItemById,
} from '@/src/features/shop/teamPackCatalog';

import ShowcaseRoomEditorScene from './showcase/ShowcaseRoomEditorScene';
import { createEmptyShowcaseRoomAssignments, type ShowcaseRoomSlotId } from '@/src/features/profile/showcase/roomEditor';

const mixedItems: [ShowcaseRoomSlotId, string][] = [
  ['left-free', 'conclave-arcanique-guardian-badge'],
  ['jersey', 'sang-des-titans-eclipse-axe'],
  ['trophy', 'conclave-arcanique-bud-totem'],
  ['rank', 'serment-du-givre-summit-egg'],
  ['badge', 'conclave-arcanique-guardian-badge'],
  ['title', 'dernier-round-scout-drone'],
  ['ring', 'sang-des-titans-three-voices-totem'],
  ['right-free', 'conclave-arcanique-conclave-seal'],
];
const reviewSlots: ShowcaseRoomSlotId[] = ['jersey', 'rank', 'trophy', 'badge', 'title', 'ring'];
const forgeItems: [ShowcaseRoomSlotId, string][] = [
  ['left-free', 'dernier-round-scout-drone'],
  ['left-extra', 'serment-du-givre-veyr-dragon'],
  ['ring', 'serment-du-givre-summit-egg'],
  ['jersey', 'conclave-arcanique-brumousse'],
  ['trophy', 'conclave-arcanique-bud-totem'],
  ['badge', 'conclave-arcanique-guardian-badge'],
  ['right-free', 'conclave-arcanique-conclave-seal'],
];

export default function ShowcaseAlignmentPreviewScreen() {
  const { pack, scene } = useLocalSearchParams<{ pack?: string; scene?: string }>();
  const presenter = showcasePresenterById(scene);
  const room = presenter ?? SHOWCASE_ROOM_CATALOG.find((item) => item.id === 'obsidian-gallery')!;
  const collection = [...COSMETIC_PACK_CATALOG, ...INDIVIDUAL_COLLECTION_CATALOG]
    .find((item) => item.id === pack);
  const selected: [ShowcaseRoomSlotId, string][] = collection
    ? collection.items.filter((item) => item.roomKind).slice(0, reviewSlots.length)
      .map((item, index) => [reviewSlots[index], item.id])
    : presenter?.id === 'mythes-forge-magma-pedestals' ? forgeItems : mixedItems;
  const assignments = createEmptyShowcaseRoomAssignments();
  for (const [slot, id] of selected) {
    const item = currentCosmeticPackItemById(id);
    if (item?.roomKind) assignments[slot] = {
      id: `cosmetic:${id}`, kind: item.roomKind, name: item.name,
      accent: item.accent, image: item.image,
    };
  }
  return (
    <PreviewRoute>
      <ShowcaseRoomEditorScene
        assignments={assignments}
        atmosphereActive={false}
        lighting="white"
        onSlotPress={() => undefined}
        room={room}
        slots={room.slots}
      />
    </PreviewRoute>
  );
}
