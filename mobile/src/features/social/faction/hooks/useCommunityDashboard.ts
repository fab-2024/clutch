import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCommunityData } from '../api';
import { attachPendingRelicMutation, rememberRelicMutation } from '../mutationPresentation';
import type { CommunityData } from '../types';

const EMPTY_COMMUNITY: CommunityData = { factions: [], moi: null };

export function useCommunityDashboard() {
  const [data, setData] = useState<CommunityData>(EMPTY_COMMUNITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const dataRef = useRef<CommunityData>(EMPTY_COMMUNITY);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const community = await attachPendingRelicMutation(await loadCommunityData());
      if (requestId === requestRef.current) {
        dataRef.current = community;
        setData(community);
      }
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

  const acknowledgeMutation = useCallback(async (eventId: string) => {
    const current = dataRef.current;
    const me = current.moi;
    const mutation = me?.mutation_a_presenter;
    if (!mutation || mutation.id !== eventId) return;

    await rememberRelicMutation(current, mutation);
    const next = { ...current, moi: { ...me, mutation_a_presenter: null } };
    dataRef.current = next;
    setData(next);
  }, []);

  return { acknowledgeMutation, data, error, load, loading, refreshing };
}
