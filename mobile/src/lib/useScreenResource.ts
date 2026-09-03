import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { growthError } from './growthErrors';

/** Mount this inside an account-keyed screen. Blur invalidates stale reads. */
export function useScreenResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(null); setData(null);
    try { const value = await load(); if (mounted.current && request === generation.current) setData(value); }
    catch (caught) { if (mounted.current && request === generation.current) setError(growthError(caught)); }
    finally { if (mounted.current && request === generation.current) setLoading(false); }
  }, [load]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]));
  return { data, setData, error, setError, loading, refresh, mounted };
}
