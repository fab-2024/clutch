import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BADGE_IDS,
  type BadgeId,
  type PublicAchievementBadge,
} from './types';

export const BADGE_SHOWCASE_SLOT_COUNT = 4;
export type AchievementBadgeSlots = [BadgeId | null, BadgeId | null, BadgeId | null, BadgeId | null];

const STORAGE_PREFIX = '@griff/showcase-achievement-badges/v1';
const BADGE_ID_SET = new Set<string>(BADGE_IDS);
const listeners = new Set<(ownerKey: string, slots: AchievementBadgeSlots) => void>();

export function emptyAchievementBadgeSlots(): AchievementBadgeSlots {
  return [null, null, null, null];
}

export async function loadAchievementBadgeEquipment(ownerKey: string) {
  const raw = await AsyncStorage.getItem(storageKey(ownerKey));
  if (!raw) return null;
  try {
    return normalizeAchievementBadgeSlots(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveAchievementBadgeEquipment(
  ownerKey: string,
  slots: AchievementBadgeSlots,
) {
  const normalized = normalizeAchievementBadgeSlots(slots);
  await AsyncStorage.setItem(storageKey(ownerKey), JSON.stringify(normalized));
  listeners.forEach((listener) => listener(ownerKey, normalized));
}

export function subscribeAchievementBadgeEquipment(
  listener: (ownerKey: string, slots: AchievementBadgeSlots) => void,
) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function normalizeAchievementBadgeSlots(value: unknown): AchievementBadgeSlots {
  const source = Array.isArray(value) ? value : [];
  const unique = new Set<BadgeId>();
  return Array.from({ length: BADGE_SHOWCASE_SLOT_COUNT }, (_, index) => {
    const candidate = source[index];
    if (!isBadgeId(candidate) || unique.has(candidate)) return null;
    unique.add(candidate);
    return candidate;
  }) as AchievementBadgeSlots;
}

export function assignBadgeToShowcaseSlot(
  current: AchievementBadgeSlots,
  slotIndex: number,
  badgeId: BadgeId | null,
  collection: readonly PublicAchievementBadge[],
): AchievementBadgeSlots {
  if (slotIndex < 0 || slotIndex >= BADGE_SHOWCASE_SLOT_COUNT) {
    throw new Error('Emplacement de vitrine invalide.');
  }
  if (badgeId) {
    const badge = collection.find((candidate) => candidate.id === badgeId);
    if (!badge?.obtained) throw new Error('Un badge non obtenu ne peut pas être exposé.');
  }

  const next = current.map((candidate) => candidate === badgeId ? null : candidate) as AchievementBadgeSlots;
  next[slotIndex] = badgeId;
  return next;
}

export function resolveEquippedAchievementBadges(
  collection: readonly PublicAchievementBadge[],
  slots: AchievementBadgeSlots,
) {
  const byId = new Map(collection.filter((badge) => badge.obtained).map((badge) => [badge.id, badge]));
  return slots.map((id) => id ? byId.get(id) ?? null : null);
}

function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === 'string' && BADGE_ID_SET.has(value);
}

function storageKey(ownerKey: string) {
  const normalized = ownerKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return `${STORAGE_PREFIX}:${normalized || 'local'}`;
}
