import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SHOWCASE_ROOM_SLOT_IDS,
  type ShowcasePedestalAssignmentIds,
  type ShowcaseRoomSlotId,
} from '../components/showcase/roomEditor';

const STORAGE_PREFIX = '@griff/showcase-pedestals/v1';
const listeners = new Set<(
  ownerKey: string,
  assignments: ShowcasePedestalAssignmentIds,
) => void>();

export async function loadShowcasePedestalEquipment(
  ownerKey: string,
): Promise<ShowcasePedestalAssignmentIds> {
  const raw = await AsyncStorage.getItem(storageKey(ownerKey));
  if (!raw) return {};
  try {
    return normalizeAssignments(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveShowcasePedestalEquipment(
  ownerKey: string,
  assignments: ShowcasePedestalAssignmentIds,
) {
  const normalized = normalizeAssignments(assignments);
  const key = storageKey(ownerKey);
  if (Object.keys(normalized).length === 0) await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, JSON.stringify(normalized));
  notify(ownerKey, normalized);
}

export function subscribeShowcasePedestalEquipment(
  listener: (
    ownerKey: string,
    assignments: ShowcasePedestalAssignmentIds,
  ) => void,
) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function normalizeAssignments(value: unknown): ShowcasePedestalAssignmentIds {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const normalized: ShowcasePedestalAssignmentIds = {};

  SHOWCASE_ROOM_SLOT_IDS.forEach((slotId) => {
    const pedestalId = record[slotId];
    if (typeof pedestalId === 'string' && pedestalId.trim()) {
      normalized[slotId as ShowcaseRoomSlotId] = pedestalId;
    }
  });

  return normalized;
}

function storageKey(ownerKey: string) {
  const normalized = ownerKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return `${STORAGE_PREFIX}:${normalized || 'local'}`;
}

function notify(ownerKey: string, assignments: ShowcasePedestalAssignmentIds) {
  listeners.forEach((listener) => listener(ownerKey, assignments));
}
