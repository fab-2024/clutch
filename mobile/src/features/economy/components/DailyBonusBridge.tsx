import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { deviceTimeZone, formatNumber, t } from '@/src/lib/i18n';
import { notifyCallStreakChanged } from '@/src/features/retention/events';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';

import { claimDailyVoltBonus, loadDailyVoltBonusStatus } from '../api';
import { createDailyBonusSession } from '../dailyBonusSession';
import DailyBonusSheet from './DailyBonusSheet';

export default function DailyBonusBridge() {
  const { session, status } = useAuth();
  const userId = status === 'ready' && !session?.user.is_anonymous ? session?.user.id : undefined;
  return userId ? <AuthenticatedDailyBonus key={userId} userId={userId} /> : null;
}

function AuthenticatedDailyBonus({ userId }: { userId: string }) {
  const { refresh, setConfirmedVolts } = useEconomy();
  const { showSnackbar } = useSnackbar();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const retryStatus = useRef<(() => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    const bonus = createDailyBonusSession({
      check: () => loadDailyVoltBonusStatus(userId, deviceTimeZone()),
      onReceipt: (status) => {
        if (!inFlight.current) setVisible(status.available);
      },
    });
    retryStatus.current = bonus.retry;
    bonus.setActive(AppState.currentState === 'active' || AppState.currentState === null);
    const subscription = AppState.addEventListener('change', (state) => bonus.setActive(state === 'active'));
    const retryOnline = () => bonus.retry();
    if (typeof window !== 'undefined') window.addEventListener?.('online', retryOnline);
    return () => {
      mounted.current = false;
      retryStatus.current = null;
      bonus.dispose();
      subscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener?.('online', retryOnline);
    };
  }, [userId]);

  async function claim() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const receipt = await claimDailyVoltBonus(userId, deviceTimeZone());
      if (!mounted.current) return;
      setConfirmedVolts(receipt.userId, receipt.balance);
      void refresh();
      setVisible(false);
      if (receipt.awarded) {
        notifyCallStreakChanged();
        showSnackbar({ message: t('economy.dailyBonus.awarded', { amount: formatNumber(receipt.amount) }), tone: 'success', duration: 4_500 });
      }
    } catch {
      if (mounted.current) setError(t('economy.dailyBonus.retry'));
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setPending(false);
        retryStatus.current?.();
      }
    }
  }

  return <DailyBonusSheet visible={visible} pending={pending} error={error} onClaim={() => void claim()} onClose={() => setVisible(false)} />;
}
