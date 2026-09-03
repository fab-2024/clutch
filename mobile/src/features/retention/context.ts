import { createContext, useContext } from 'react';

import { CallStreakError } from './model';
import type { CallStreakState, ProtectorPurchaseReceipt, StreakMilestone } from './types';

export type StreakContextValue = {
  state: CallStreakState | null;
  error: string | null;
  loading: boolean;
  receivedAt: number;
  refresh: (force?: boolean) => Promise<void>;
  purchase: (operationId: string) => Promise<ProtectorPurchaseReceipt>;
  selectMilestone: (days: StreakMilestone | null) => Promise<void>;
};

// Presentational cards can render in previews and isolated screens without
// importing Auth, the economy provider or the API transport at module load.
const emptyContext: StreakContextValue = {
  state: null, error: null, loading: false, receivedAt: 0,
  refresh: async () => undefined,
  purchase: async () => { throw new CallStreakError('unavailable'); },
  selectMilestone: async () => { throw new CallStreakError('unavailable'); },
};

export const CallStreakContext = createContext<StreakContextValue>(emptyContext);
export const monotonicNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
export function useCallStreak() { return useContext(CallStreakContext); }
