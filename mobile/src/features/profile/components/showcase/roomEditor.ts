import type { ImageSourcePropType } from 'react-native';

export const SHOWCASE_ROOM_SLOT_IDS = [
  'left-free',
  'jersey',
  'trophy',
  'left-extra',
  'rank',
  'badge',
  'title',
  'ring',
  'right-extra',
  'right-free',
] as const;

export type ShowcaseRoomSlotId = (typeof SHOWCASE_ROOM_SLOT_IDS)[number];

export type ShowcasePlaceableKind =
  | 'badge'
  | 'banner'
  | 'core'
  | 'frame'
  | 'jersey'
  | 'rank'
  | 'ring'
  | 'title'
  | 'trophy';

export type ShowcasePlaceableItem = {
  accent: string;
  id: string;
  image?: ImageSourcePropType;
  kind: ShowcasePlaceableKind;
  name: string;
};

export type ShowcaseRoomAssignments = Record<ShowcaseRoomSlotId, ShowcasePlaceableItem | null>;

export type ShowcaseRoomSlotDefinition = {
  height: `${number}%`;
  id: ShowcaseRoomSlotId;
  label: string;
  left: `${number}%`;
  preferredKind: ShowcasePlaceableKind;
  top: `${number}%`;
  width: `${number}%`;
};

export const SHOWCASE_ROOM_SLOTS: readonly ShowcaseRoomSlotDefinition[] = [
  { id: 'left-free', label: 'Emplacement gauche', preferredKind: 'frame', left: '2%', top: '40%', width: '8%', height: '36%' },
  { id: 'jersey', label: 'Emplacement maillot', preferredKind: 'jersey', left: '12%', top: '30%', width: '15%', height: '49%' },
  { id: 'trophy', label: 'Emplacement trophée', preferredKind: 'trophy', left: '27%', top: '36%', width: '12%', height: '41%' },
  { id: 'rank', label: 'Emplacement central', preferredKind: 'rank', left: '41%', top: '20%', width: '18%', height: '59%' },
  { id: 'badge', label: 'Emplacement badge', preferredKind: 'badge', left: '60%', top: '36%', width: '12%', height: '41%' },
  { id: 'title', label: 'Emplacement titre', preferredKind: 'title', left: '70%', top: '47%', width: '11%', height: '28%' },
  { id: 'ring', label: 'Emplacement anneau', preferredKind: 'ring', left: '81%', top: '51%', width: '8%', height: '25%' },
  { id: 'right-free', label: 'Emplacement droit', preferredKind: 'core', left: '90%', top: '40%', width: '8%', height: '36%' },
] as const;

export function createEmptyShowcaseRoomAssignments(): ShowcaseRoomAssignments {
  return Object.fromEntries(
    SHOWCASE_ROOM_SLOT_IDS.map((slotId) => [slotId, null]),
  ) as ShowcaseRoomAssignments;
}

export function createDefaultShowcaseRoomAssignments(
  items: readonly ShowcasePlaceableItem[],
  slots: readonly ShowcaseRoomSlotDefinition[] = SHOWCASE_ROOM_SLOTS,
): ShowcaseRoomAssignments {
  const assignments = createEmptyShowcaseRoomAssignments();
  const used = new Set<string>();

  slots.forEach((slot) => {
    const item = items.find((candidate) => (
      candidate.kind === slot.preferredKind && !used.has(candidate.id)
    ));
    if (!item) return;
    assignments[slot.id] = item;
    used.add(item.id);
  });

  return assignments;
}

export function showcasePlaceableKindLabel(kind: ShowcasePlaceableKind) {
  if (kind === 'badge') return 'Badge';
  if (kind === 'banner') return 'Bannière';
  if (kind === 'core') return 'Core';
  if (kind === 'frame') return 'Cadre';
  if (kind === 'jersey') return 'Maillot';
  if (kind === 'rank') return 'Rang';
  if (kind === 'ring') return 'Anneau';
  if (kind === 'title') return 'Titre';
  return 'Trophée';
}

export function showcasePlaceableGlyph(kind: ShowcasePlaceableKind) {
  if (kind === 'badge') return '✦';
  if (kind === 'banner') return '▥';
  if (kind === 'core') return '◈';
  if (kind === 'frame') return '◇';
  if (kind === 'jersey') return '⌁';
  if (kind === 'rank') return '◆';
  if (kind === 'ring') return '◎';
  if (kind === 'title') return '▰';
  return '♛';
}
