import { useEffect } from 'react';
import { AppState } from 'react-native';

import { trackAnalyticsEvent } from '../api';

let lastActivityKey = '';

export function AnalyticsBridge({ userId }: { userId?: string }) {
  useEffect(() => {
    if (!userId) return undefined;

    const trackDailyActivity = () => {
      const day = new Date().toISOString().slice(0, 10);
      const localKey = `${userId}:${day}`;
      if (lastActivityKey === localKey) return;

      lastActivityKey = localKey;
      void trackAnalyticsEvent({
        type: 'application_active',
        idempotencyKey: `activity:${day}`,
      })
        .then((receipt) => {
          if (!receipt.accepted && lastActivityKey === localKey) lastActivityKey = '';
        })
        .catch(() => {
          if (lastActivityKey === localKey) lastActivityKey = '';
        });
    };

    const trackOpened = () => {
      void trackAnalyticsEvent({ type: 'app_opened' }).catch(() => undefined);
      trackDailyActivity();
    };

    if (AppState.currentState === 'active' || AppState.currentState === null) trackOpened();
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previousState !== 'active') trackOpened();
      previousState = state;
    });

    return () => subscription.remove();
  }, [userId]);

  return null;
}
