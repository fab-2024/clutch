import { useAuth } from '@/src/providers/AuthProvider';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCommunityData } from '../api';
import { attachPendingRelicMutation, rememberRelicMutation } from '../mutationPresentation';
import type { CommunityData } from '../types';

const EMPTY_COMMUNITY: CommunityData = { factions: [], moi: null };

export function useCommunityDashboard() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [data, setData] = useState<CommunityData>(EMPTY_COMMUNITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const dataRef = useRef<CommunityData>(EMPTY_COMMUNITY);

  const load = useCallback(async (refresh = false, silent = false) => {
    const requestId = ++requestRef.current;
    if (!silent) {
      if (refresh) setRefreshing(true);
      else setLoading(true);
    }
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
  }, [userId]);

  useEffect(() => {
    dataRef.current = EMPTY_COMMUNITY;
    setData(EMPTY_COMMUNITY);
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useFocusEffect(useCallback(() => {
    void load(false, true);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(false, true); }, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(false, true); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [load]));

  const acknowledgeMutation = useCallback(async (eventId: string) => {
    const current = dataRef.current;
    const me = current.moi;
    const mutation = me?.mutation_a_presenter;
    if (!mutation || mutation.id !== eventId) return;

    await rememberRelicMutation(current, mutation);
    // A refresh may have delivered a newer event while persistence was pending.
    const latest = dataRef.current;
    if (latest.moi?.user_id !== me.user_id || latest.moi?.equipe_id !== me.equipe_id) return;
    const next = { ...latest, moi: { ...latest.moi, mutation_a_presenter: latest.moi.mutation_a_presenter?.id === eventId ? null : latest.moi.mutation_a_presenter, derniere_mutation_presentee: mutation } };
    dataRef.current = next;
    setData(next);
  }, []);

  return { acknowledgeMutation, data, error, load, loading, refreshing };
}
