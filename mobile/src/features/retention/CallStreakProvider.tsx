import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Share } from 'react-native';

import { deviceTimeZone, t } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';

import { loadCallStreak, purchaseStreakProtector, selectStreakMilestone } from './api';
import { CallStreakContext, monotonicNow, type StreakContextValue } from './context';
import { subscribeCallStreakChanges } from './events';
import { CallStreakError, remainingStreakMs } from './model';
import type { CallStreakState, StreakMilestone } from './types';

export function CallStreakProvider({ children }: PropsWithChildren) {
  const { session, status } = useAuth();
  const { setConfirmedVolts, refresh: refreshEconomy } = useEconomy();
  const { showSnackbar, dismissSnackbar } = useSnackbar();
  const userId = status === 'ready' && !session?.user.is_anonymous ? session?.user.id : undefined;
  const [state, setState] = useState<CallStreakState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [receivedAt, setReceivedAt] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const ownerRef = useRef(userId);
  const stateRef = useRef<CallStreakState | null>(null);
  const requestRef = useRef(0);
  const inFlight = useRef<{ owner: string; id: number; promise: Promise<void> } | null>(null);
  const snackbarRef = useRef<string | undefined>(undefined);

  const accept = useCallback((next: CallStreakState) => {
    if (next.userId !== ownerRef.current) return;
    const previous = stateRef.current;
    if (previous?.userId === next.userId && Date.parse(next.serverNow) < Date.parse(previous.serverNow)) return;
    stateRef.current = next;
    setState(next);
    setReceivedAt(monotonicNow());
    setError(null);
    if (previous && previous.userId === next.userId && next.current > previous.current) {
      const milestone = next.milestones.find((item) => !previous.milestones.some((old) => old.days === item.days));
      if (milestone) {
        snackbarRef.current = showSnackbar({
          message: t('streak.milestone.celebration', { count: milestone.days }),
          tone: 'success', duration: 4_500,
          action: { label: t('streak.share'), onPress: () => { void Share.share({ message: t('streak.milestone.share', { count: milestone.days }) }).catch(() => undefined); } },
        });
      }
    }
  }, [showSnackbar]);

  const refresh = useCallback((force = false): Promise<void> => {
    if (!userId || AppState.currentState === 'background' || AppState.currentState === 'inactive') return Promise.resolve();
    if (!force && inFlight.current?.owner === userId) return inFlight.current.promise;
    const requestId = ++requestRef.current;
    setLoading(true);
    const promise = (async () => {
      try {
        const next = await loadCallStreak(userId, deviceTimeZone());
        if (requestId === requestRef.current && ownerRef.current === userId) accept(next);
      } catch (caught) {
        if (requestId === requestRef.current && ownerRef.current === userId) {
          setError(caught instanceof Error ? caught.message : t('streak.error.unavailable'));
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false);
        if (inFlight.current?.id === requestId) inFlight.current = null;
      }
    })();
    inFlight.current = { owner: userId, id: requestId, promise };
    return promise;
  }, [accept, userId]);

  useEffect(() => {
    ownerRef.current = userId;
    stateRef.current = null;
    requestRef.current += 1;
    inFlight.current = null;
    setState(null);
    setError(null);
    setLoading(false);
    void refresh();
    const changes = subscribeCallStreakChanges(() => { void refresh(true); });
    const appState = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active');
      if (next === 'active') void refresh(true);
      else requestRef.current += 1;
    });
    const online = () => { void refresh(true); };
    if (typeof window !== 'undefined') window.addEventListener?.('online', online);
    return () => {
      ownerRef.current = undefined;
      requestRef.current += 1;
      changes();
      appState.remove();
      if (typeof window !== 'undefined') window.removeEventListener?.('online', online);
      if (snackbarRef.current) dismissSnackbar(snackbarRef.current);
    };
  }, [dismissSnackbar, refresh, userId]);

  useEffect(() => {
    if (!foreground || !state || state.userId !== userId || error) return;
    const timer = setTimeout(() => { void refresh(true); }, Math.max(1_000, remainingStreakMs(state, monotonicNow() - receivedAt)));
    return () => clearTimeout(timer);
  }, [error, foreground, receivedAt, refresh, state, userId]);

  const purchase = useCallback(async (operationId: string) => {
    if (!userId || ownerRef.current !== userId) throw new CallStreakError('authentication_required');
    requestRef.current += 1; // Any earlier reads cannot overwrite a confirmed debit.
    inFlight.current = null;
    try {
      const receipt = await purchaseStreakProtector(userId, operationId);
      if (ownerRef.current !== userId) throw new CallStreakError('account_changed');
      requestRef.current += 1;
      inFlight.current = null;
      accept(receipt.state);
      setConfirmedVolts(userId, stateRef.current?.volts ?? receipt.state.volts);
      void refreshEconomy();
      return receipt;
    } finally {
      if (ownerRef.current === userId) setLoading(false);
    }
  }, [accept, refreshEconomy, setConfirmedVolts, userId]);

  const selectMilestone = useCallback(async (days: StreakMilestone | null) => {
    if (!userId || ownerRef.current !== userId) throw new CallStreakError('authentication_required');
    requestRef.current += 1;
    inFlight.current = null;
    try {
      const next = await selectStreakMilestone(userId, days);
      if (ownerRef.current !== userId) throw new CallStreakError('account_changed');
      requestRef.current += 1;
      inFlight.current = null;
      accept(next);
    } finally {
      if (ownerRef.current === userId) setLoading(false);
    }
  }, [accept, userId]);

  const value = useMemo<StreakContextValue>(() => ({
    state: state?.userId === userId ? state : null,
    error, loading, receivedAt, refresh, purchase, selectMilestone,
  }), [error, loading, purchase, receivedAt, refresh, selectMilestone, state, userId]);
  return <CallStreakContext.Provider value={value}>{children}</CallStreakContext.Provider>;
}
