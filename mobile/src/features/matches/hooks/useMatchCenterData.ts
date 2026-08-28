import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCachedMatchCenter, peekMatchCenterData } from '../matchCenterCache';
import type { MatchCenterData } from '../types';

type Options = {
  matchId?: string;
  onResolved?: () => void | Promise<void>;
  previewData?: MatchCenterData;
  userId?: string;
};

export function useMatchCenterData({ matchId, onResolved, previewData, userId }: Options) {
  const initialCachedData = !previewData && matchId && userId
    ? peekMatchCenterData({ matchId, userId })
    : null;
  const [data, setData] = useState<MatchCenterData | null>(previewData ?? initialCachedData);
  const [loading, setLoading] = useState(!previewData && !initialCachedData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!matchId || !userId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const requestId = ++requestRef.current;
    const cachedData = refresh ? null : peekMatchCenterData({ matchId, userId });
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const nextData = await loadCachedMatchCenter(
        { matchId, userId },
        { force: refresh },
      );
      if (requestId !== requestRef.current) return;
      setData(nextData);
      if (nextData.prediction?.statut === 'gagne' || nextData.prediction?.statut === 'perdu') {
        void onResolved?.();
      }
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Match Center.');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [matchId, onResolved, previewData, userId]);

  useEffect(() => {
    const cachedData = !previewData && matchId && userId
      ? peekMatchCenterData({ matchId, userId })
      : null;
    setData(previewData ?? cachedData);
    setLoading(!previewData && !cachedData);
    void load();
    return () => { requestRef.current += 1; };
  }, [load, matchId, previewData, userId]);

  return { data, error, load, loading, refreshing };
}
