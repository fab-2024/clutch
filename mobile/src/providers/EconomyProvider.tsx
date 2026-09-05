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
import { t } from '@/src/lib/i18n';

import { useAuth } from './AuthProvider';

type EconomyContextValue = PlayerEconomy & {
  error: string | null;
  loading: boolean;
  unlimitedVolts: boolean;
  refresh: () => Promise<void>;
  setConfirmedVolts: (ownerId: string, balance: number) => void;
};

const EMPTY_ECONOMY: PlayerEconomy = {
  frags: null,
  volts: null,
  seasonId: null,
};

const EconomyContext = createContext<EconomyContextValue | null>(null);

export function EconomyProvider({ children }: PropsWithChildren) {
  const { profile, session } = useAuth();
  const userId = session?.user.id;
  const unlimitedVolts = Boolean(
    profile && userId && profile.id === userId && profile.volts_illimites,
  );
  const [economy, setEconomy] = useState<PlayerEconomy>(EMPTY_ECONOMY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const ownerRef = useRef(userId);

  const invalidateRequests = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const setConfirmedVolts = useCallback((ownerId: string, balance: number) => {
    if (ownerId !== ownerRef.current || !Number.isSafeInteger(balance) || balance < 0) return;
    invalidateRequests();
    setEconomy((current) => ({ ...current, volts: balance }));
    setLoading(false);
    setError(null);
  }, [invalidateRequests]);

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
      setError(caught instanceof Error ? caught.message : t('economy.errors.balancesUnavailable'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    ownerRef.current = userId;
    setEconomy(EMPTY_ECONOMY);
    void refresh();
    return () => {
      invalidateRequests();
    };
  }, [invalidateRequests, refresh, userId]);

  const value = useMemo<EconomyContextValue>(
    () => ({ ...economy, error, loading, refresh, setConfirmedVolts, unlimitedVolts }),
    [economy, error, loading, refresh, setConfirmedVolts, unlimitedVolts],
  );

  return <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>;
}

export function useEconomy() {
  const context = useContext(EconomyContext);
  if (!context) throw new Error('useEconomy doit être utilisé dans EconomyProvider.');
  return context;
}
