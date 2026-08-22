import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCommunityData } from '../api';
import type { CommunityData } from '../types';

const EMPTY_COMMUNITY: CommunityData = { factions: [], moi: null };

export function useCommunityDashboard() {
  const [data, setData] = useState<CommunityData>(EMPTY_COMMUNITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const community = await loadCommunityData();
      if (requestId === requestRef.current) setData(community);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible de charger les factions.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  return { data, error, load, loading, refreshing };
}
