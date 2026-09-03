import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';

import { GrowthError } from '@/src/lib/growthErrors';

const KEY = '@clutch/growth-installation-v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let pending: Promise<string> | null = null;

export function newShareOperation() { return uuid.v4(); }

/** Random per installation, not an advertising ID or a device fingerprint. */
export function installationId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved && UUID.test(saved)) return saved;
        const generated = uuid.v4();
        await AsyncStorage.setItem(KEY, generated);
        return generated;
      } catch { throw new GrowthError('storage_unavailable'); }
    })().finally(() => { pending = null; });
  }
  return pending;
}
