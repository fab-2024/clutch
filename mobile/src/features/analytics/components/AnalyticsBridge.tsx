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
      }).catch(() => {
        if (lastActivityKey === localKey) lastActivityKey = '';
      });
    };

    trackDailyActivity();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') trackDailyActivity();
    });

    return () => subscription.remove();
  }, [userId]);

  return null;
}
