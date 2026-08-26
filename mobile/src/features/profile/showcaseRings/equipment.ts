import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SHOWCASE_RING_FAMILIES,
  type ShowcaseRingFamily,
} from './types';

const STORAGE_PREFIX = '@griff/showcase-ring/v1';
const listeners = new Set<(ownerKey: string, family: ShowcaseRingFamily | null) => void>();

export async function loadShowcaseRingEquipment(ownerKey: string) {
  const value = await AsyncStorage.getItem(storageKey(ownerKey));
  return isShowcaseRingFamily(value) ? value : null;
}

export async function saveShowcaseRingEquipment(
  ownerKey: string,
  family: ShowcaseRingFamily | null,
) {
  const key = storageKey(ownerKey);
  if (!family) {
    await AsyncStorage.removeItem(key);
    notify(ownerKey, null);
    return;
  }
  await AsyncStorage.setItem(key, family);
  notify(ownerKey, family);
}

export function subscribeShowcaseRingEquipment(
  listener: (ownerKey: string, family: ShowcaseRingFamily | null) => void,
) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isShowcaseRingFamily(value: unknown): value is ShowcaseRingFamily {
  return typeof value === 'string'
    && SHOWCASE_RING_FAMILIES.includes(value as ShowcaseRingFamily);
}

function storageKey(ownerKey: string) {
  const normalized = ownerKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return `${STORAGE_PREFIX}:${normalized || 'local'}`;
}

function notify(ownerKey: string, family: ShowcaseRingFamily | null) {
  listeners.forEach((listener) => listener(ownerKey, family));
}
