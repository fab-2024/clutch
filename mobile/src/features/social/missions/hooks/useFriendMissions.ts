import { useCallback, useEffect, useRef, useState } from 'react';

import { loadFriendQuests } from '../api';
import type { FriendQuestsData } from '../types';

export const EMPTY_FRIEND_MISSIONS: FriendQuestsData = {
  actives: [],
  historique: [],
  duos: [],
  a_reveler: null,
};

type UseFriendMissionsOptions = {
  enabled?: boolean;
  initialData?: FriendQuestsData;
};

export function useFriendMissions({
  enabled = true,
  initialData,
}: UseFriendMissionsOptions = {}) {
  const [data, setData] = useState<FriendQuestsData>(initialData ?? EMPTY_FRIEND_MISSIONS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled && !initialData);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const reload = useCallback(async (refresh = false) => {
    if (!enabled) return;
    const currentRequest = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const nextData = await loadFriendQuests();
      if (requestId.current === currentRequest) setData(nextData);
    } catch (caught) {
      if (requestId.current !== currentRequest) return;
      setError(caught instanceof Error ? caught.message : 'Impossible de charger tes missions.');
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void reload();
    return () => {
      requestId.current += 1;
    };
  }, [enabled, reload]);

  return { data, error, loading, refreshing, reload };
}
