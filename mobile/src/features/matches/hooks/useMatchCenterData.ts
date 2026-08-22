import { useCallback, useEffect, useRef, useState } from 'react';

import { loadMatchCenter } from '../api';
import type { MatchCenterData } from '../types';

type Options = {
  matchId?: string;
  onResolved?: () => void | Promise<void>;
  previewData?: MatchCenterData;
  userId?: string;
};

export function useMatchCenterData({ matchId, onResolved, previewData, userId }: Options) {
  const [data, setData] = useState<MatchCenterData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
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
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const nextData = await loadMatchCenter(matchId);
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
    setData(previewData ?? null);
    void load();
    return () => { requestRef.current += 1; };
  }, [load, previewData]);

  return { data, error, load, loading, refreshing };
}
