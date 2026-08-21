import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { loadPlayerEconomy } from '@/src/features/economy/api';
import type { PlayerEconomy } from '@/src/features/economy/types';

import { useAuth } from './AuthProvider';

type EconomyContextValue = PlayerEconomy & {
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY_ECONOMY: PlayerEconomy = {
  frags: null,
  volts: null,
  seasonId: null,
};

const EconomyContext = createContext<EconomyContextValue | null>(null);

export function EconomyProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [economy, setEconomy] = useState<PlayerEconomy>(EMPTY_ECONOMY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!userId) {
      setEconomy(EMPTY_ECONOMY);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextEconomy = await loadPlayerEconomy(userId);
      if (requestId === requestIdRef.current) setEconomy(nextEconomy);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(caught instanceof Error ? caught.message : 'Soldes indisponibles.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setEconomy(EMPTY_ECONOMY);
    void refresh();
    return () => {
      ++requestIdRef.current;
    };
  }, [refresh]);

  const value = useMemo<EconomyContextValue>(
    () => ({ ...economy, error, loading, refresh }),
    [economy, error, loading, refresh],
  );

  return <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>;
}

export function useEconomy() {
  const context = useContext(EconomyContext);
  if (!context) throw new Error('useEconomy doit être utilisé dans EconomyProvider.');
  return context;
}
