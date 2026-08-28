import { loadMatchCenter } from './api';
import type { MatchCenterData } from './types';

type MatchCenterCacheKey = {
  matchId: string;
  userId: string;
};

type CacheEntry = {
  data: MatchCenterData | null;
  expiresAt: number;
  promise: Promise<MatchCenterData>;
};

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 8;
const cache = new Map<string, CacheEntry>();

export function peekMatchCenterData(key: MatchCenterCacheKey) {
  const entry = validEntry(key);
  return entry?.data ?? null;
}

export function loadCachedMatchCenter(
  key: MatchCenterCacheKey,
  options: { force?: boolean } = {},
) {
  const existing = options.force ? null : validEntry(key);
  if (existing) return existing.promise;

  const stringKey = serializeKey(key);
  let entry: CacheEntry;
  const promise = loadMatchCenter(key.matchId)
    .then((data) => {
      entry.data = data;
      entry.expiresAt = Date.now() + CACHE_TTL_MS;
      return data;
    })
    .catch((error) => {
      if (cache.get(stringKey) === entry) cache.delete(stringKey);
      throw error;
    });

  entry = {
    data: null,
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise,
  };

  cache.set(stringKey, entry);
  pruneCache();
  return entry.promise;
}

export function prefetchMatchCenterData(key: MatchCenterCacheKey) {
  return loadCachedMatchCenter(key).then(() => undefined);
}

export function invalidateMatchCenterData(key: MatchCenterCacheKey) {
  cache.delete(serializeKey(key));
}

export function clearMatchCenterCache() {
  cache.clear();
}

function validEntry(key: MatchCenterCacheKey) {
  const stringKey = serializeKey(key);
  const entry = cache.get(stringKey);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) return entry;
  cache.delete(stringKey);
  return null;
}

function serializeKey({ matchId, userId }: MatchCenterCacheKey) {
  return `${userId}:${matchId}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    cache.delete(oldestKey);
  }
}
