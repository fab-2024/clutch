import AsyncStorage from '@react-native-async-storage/async-storage';

import { publicPseudo, showcasePath } from '@/src/lib/publicLinks';

const PENDING_ROUTE_KEY = '@clutch/pending-route';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredRoute = { path: string; savedAt: number };

// Serialize storage mutations so acknowledging an older navigation can never
// remove a different invitation arriving while AsyncStorage is still reading.
let pendingMutation: Promise<void> = Promise.resolve();
function mutatePendingRoute<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingMutation.then(operation);
  pendingMutation = result.then(() => undefined, () => undefined);
  return result;
}

export function safePendingRoute(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  if (/^\/duel\/[A-Za-z0-9_-]{8,180}$/.test(value)) return value;
  if (/^\/i\/[0-9a-f]{32}$/.test(value)) return value;
  const showcase = value.match(/^\/v\/([^/]+)$/)?.[1];
  if (showcase) {
    try { const pseudo = publicPseudo(decodeURIComponent(showcase)); return pseudo ? showcasePath(pseudo) : null; }
    catch { return null; }
  }
  return null;
}

export async function rememberPendingRoute(value: unknown) {
  const path = safePendingRoute(value);
  if (!path) return false;
  await mutatePendingRoute(() => AsyncStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify({ path, savedAt: Date.now() } satisfies StoredRoute)));
  return true;
}

export async function readPendingRoute() {
  await pendingMutation;
  return readStoredRoute();
}

async function readStoredRoute() {
  const raw = await AsyncStorage.getItem(PENDING_ROUTE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<StoredRoute>;
    const maxAge = stored.path?.startsWith('/i/') ? 7 * MAX_AGE_MS : MAX_AGE_MS;
    if (typeof stored.savedAt !== 'number' || !Number.isFinite(stored.savedAt)
      || stored.savedAt > Date.now() || Date.now() - stored.savedAt > maxAge) return null;
    return safePendingRoute(stored.path);
  } catch {
    return null;
  }
}

export async function clearPendingRoute(expected: string) {
  await mutatePendingRoute(async () => {
    if (await readStoredRoute() === expected) await AsyncStorage.removeItem(PENDING_ROUTE_KEY);
  });
}

export async function consumePendingRoute() {
  const path = await readPendingRoute();
  if (path) await clearPendingRoute(path);
  return path;
}
