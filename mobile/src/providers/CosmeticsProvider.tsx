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

import { loadMyCosmetics } from '@/src/features/shop/api';
import {
  EMPTY_EQUIPPED_COSMETICS,
  type EquippedCosmetics,
} from '@/src/features/shop/types';

import { useAuth } from './AuthProvider';

type CosmeticsContextValue = {
  equipped: EquippedCosmetics;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CosmeticsContext = createContext<CosmeticsContextValue | null>(null);

export function CosmeticsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [equipped, setEquipped] = useState<EquippedCosmetics>(EMPTY_EQUIPPED_COSMETICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!userId) {
      setEquipped(EMPTY_EQUIPPED_COSMETICS);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await loadMyCosmetics();
      if (requestId === requestIdRef.current) setEquipped(next);
    } catch (caught) {
      if (requestId === requestIdRef.current) {
        setError(caught instanceof Error ? caught.message : 'Cosmétiques indisponibles.');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setEquipped(EMPTY_EQUIPPED_COSMETICS);
    void refresh();
    return () => { requestIdRef.current += 1; };
  }, [refresh]);

  const value = useMemo<CosmeticsContextValue>(
    () => ({ equipped, error, loading, refresh }),
    [equipped, error, loading, refresh],
  );

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}

export function useCosmetics() {
  const context = useContext(CosmeticsContext);
  if (!context) throw new Error('useCosmetics doit être utilisé dans CosmeticsProvider.');
  return context;
}
