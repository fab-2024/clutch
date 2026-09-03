import { useEffect } from 'react';
import { AppState } from 'react-native';

import { deviceTimeZone, formatNumber, t } from '@/src/lib/i18n';
import { notifyCallStreakChanged } from '@/src/features/retention/events';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';

import { claimDailyVoltBonus } from '../api';
import { createDailyBonusSession } from '../dailyBonusSession';

export default function DailyBonusBridge() {
  const { session, status } = useAuth();
  const { refresh, setConfirmedVolts } = useEconomy();
  const { showSnackbar, dismissSnackbar } = useSnackbar();
  const userId = status === 'ready' && !session?.user.is_anonymous ? session?.user.id : undefined;

  useEffect(() => {
    if (!userId) return undefined;
    let snackbarId: string | undefined;
    const bonus = createDailyBonusSession({
      claim: () => claimDailyVoltBonus(userId, deviceTimeZone()),
      onReceipt: (receipt) => {
        setConfirmedVolts(receipt.userId, receipt.balance);
        void refresh();
        if (receipt.awarded) {
          notifyCallStreakChanged();
          snackbarId = showSnackbar({
            message: t('economy.dailyBonus.awarded', { amount: formatNumber(receipt.amount) }),
            tone: 'success',
            duration: 4_500,
            testID: 'daily-volt-bonus',
          });
        }
      },
    });
    bonus.setActive(AppState.currentState === 'active' || AppState.currentState === null);
    const subscription = AppState.addEventListener('change', (state) => bonus.setActive(state === 'active'));
    const retryOnline = () => bonus.retry();
    if (typeof window !== 'undefined') window.addEventListener?.('online', retryOnline);

    return () => {
      bonus.dispose();
      subscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener?.('online', retryOnline);
      if (snackbarId) dismissSnackbar(snackbarId);
    };
  }, [dismissSnackbar, refresh, setConfirmedVolts, showSnackbar, userId]);

  return null;
}
