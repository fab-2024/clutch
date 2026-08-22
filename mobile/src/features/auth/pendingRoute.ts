import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_ROUTE_KEY = '@clutch/pending-route';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredRoute = { path: string; savedAt: number };

export function safePendingRoute(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  if (/^\/duel\/[A-Za-z0-9_-]{8,180}$/.test(value)) return value;
  return null;
}

export async function rememberPendingRoute(value: unknown) {
  const path = safePendingRoute(value);
  if (!path) return false;
  await AsyncStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify({ path, savedAt: Date.now() } satisfies StoredRoute));
  return true;
}

export async function consumePendingRoute() {
  const raw = await AsyncStorage.getItem(PENDING_ROUTE_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_ROUTE_KEY);
  try {
    const stored = JSON.parse(raw) as Partial<StoredRoute>;
    if (typeof stored.savedAt !== 'number' || Date.now() - stored.savedAt > MAX_AGE_MS) return null;
    return safePendingRoute(stored.path);
  } catch {
    return null;
  }
}
