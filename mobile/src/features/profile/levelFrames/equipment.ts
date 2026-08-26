import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEVEL_FRAME_VARIANTS, type LevelFrameVariant } from './types';

const STORAGE_PREFIX = '@griff/level-frame/v1';
const listeners = new Set<(ownerKey: string, variant: LevelFrameVariant) => void>();

export async function loadLevelFrameEquipment(ownerKey: string) {
  const value = await AsyncStorage.getItem(storageKey(ownerKey));
  return isLevelFrameVariant(value) ? value : null;
}

export async function saveLevelFrameEquipment(ownerKey: string, variant: LevelFrameVariant) {
  await AsyncStorage.setItem(storageKey(ownerKey), variant);
  listeners.forEach((listener) => listener(ownerKey, variant));
}

export function subscribeLevelFrameEquipment(
  listener: (ownerKey: string, variant: LevelFrameVariant) => void,
) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function resolveLevelFrameEquip(
  current: LevelFrameVariant,
  next: LevelFrameVariant,
  owned: readonly LevelFrameVariant[],
) {
  if (next === 'signalAscendant' || owned.includes(next)) return next;
  return current;
}

export function isLevelFrameVariant(value: unknown): value is LevelFrameVariant {
  return typeof value === 'string'
    && LEVEL_FRAME_VARIANTS.includes(value as LevelFrameVariant);
}

function storageKey(ownerKey: string) {
  const normalized = ownerKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return `${STORAGE_PREFIX}:${normalized || 'local'}`;
}
