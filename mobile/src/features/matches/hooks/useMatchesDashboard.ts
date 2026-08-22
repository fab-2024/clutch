import { useCallback, useEffect, useRef, useState } from 'react';

import { loadArenaMatches } from '../api';
import type { ArenaMatch, MyCallsDashboard } from '../types';

export const EMPTY_CALLS_DASHBOARD: MyCallsDashboard = {
  saison_id: null,
  saison_nom: null,
  compteurs: { ouverts: 0, verrouilles: 0, reussis: 0, manques: 0 },
  ouverts: [],
  verrouilles: [],
  reussis: [],
  manques: [],
};

export function useMatchesDashboard(userId?: string) {
  const [upcoming, setUpcoming] = useState<ArenaMatch[]>([]);
  const [finished, setFinished] = useState<ArenaMatch[]>([]);
  const [calls, setCalls] = useState<MyCallsDashboard>(EMPTY_CALLS_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    if (!userId) {
      setUpcoming([]);
      setFinished([]);
      setCalls(EMPTY_CALLS_DASHBOARD);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await loadArenaMatches(userId);
      if (requestId !== requestRef.current) return;
      setUpcoming(data.upcoming);
      setFinished(data.finished);
      setCalls(data.calls);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible de charger les matchs.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  return { calls, error, finished, load, loading, refreshing, upcoming };
}
