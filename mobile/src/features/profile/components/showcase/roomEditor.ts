import type { ImageSourcePropType } from 'react-native';
import type { PublicAchievementBadge } from '../../achievementBadges/types';

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
  badge?: PublicAchievementBadge;
  id: string;
  image?: ImageSourcePropType;
  kind: ShowcasePlaceableKind;
  name: string;
};

export type ShowcaseRoomAssignments = Record<ShowcaseRoomSlotId, ShowcasePlaceableItem | null>;

export type ShowcasePedestalAssignmentIds = Partial<Record<ShowcaseRoomSlotId, string>>;

export type ShowcasePedestalPlacement = {
  accent: string;
  id: string;
  image: ImageSourcePropType;
  name: string;
};

export type ShowcaseRoomPedestalPlacements = Partial<
  Record<ShowcaseRoomSlotId, ShowcasePedestalPlacement>
>;

export type ShowcaseRoomSlotDefinition = {
  artworkLift?: number;
  artworkScale?: number;
  height: `${number}%`;
  id: ShowcaseRoomSlotId;
  label: string;
  left: `${number}%`;
  pedestalGroundOffset?: number;
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

export function applyShowcasePedestalToSlots(
  assignments: ShowcasePedestalAssignmentIds,
  slotIds: readonly ShowcaseRoomSlotId[],
  pedestalId: string,
): ShowcasePedestalAssignmentIds {
  const next = { ...assignments };
  slotIds.forEach((slotId) => {
    next[slotId] = pedestalId;
  });
  return next;
}

export function pedestalAssignmentForSlots(
  assignments: ShowcasePedestalAssignmentIds,
  slotIds: readonly ShowcaseRoomSlotId[],
  fallbackId: string | null = null,
) {
  if (slotIds.length === 0) return null;
  const first = assignments[slotIds[0]] ?? fallbackId;
  if (!first) return null;
  return slotIds.every((slotId) => (assignments[slotId] ?? fallbackId) === first)
    ? first
    : null;
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

/** Keep the collection intact when a room has different or fewer pedestals. */
export function adaptShowcaseRoomAssignments(
  current: ShowcaseRoomAssignments,
  slots: readonly ShowcaseRoomSlotDefinition[],
): ShowcaseRoomAssignments {
  const next = { ...current };
  const visibleIds = new Set(slots.map((slot) => slot.id));
  for (const sourceId of SHOWCASE_ROOM_SLOT_IDS) {
    const item = current[sourceId];
    if (!item || visibleIds.has(sourceId)) continue;
    const available = slots.filter((slot) => !next[slot.id]);
    const target = available.find((slot) => slot.preferredKind === item.kind) ?? available[0];
    // Retain overflow in its existing slot so a larger room can show it again.
    if (!target) continue;
    next[target.id] = item;
    next[sourceId] = null;
  }
  return next;
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
