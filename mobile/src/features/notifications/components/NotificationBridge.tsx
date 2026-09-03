import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { recordNotificationOpened } from '../api';

import { syncPushTokenIfGranted } from '../registration';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function NotificationBridge({ userId }: { userId?: string }) {
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return undefined;
    void syncPushTokenIfGranted().catch(() => undefined);
    let active = true;
    const opened = new Set<string>();
    const open = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (!active || opened.has(id)) return;
      opened.add(id);
      void openNotification(response, () => active);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      open(response);
    }).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  }, [userId]);

  return null;
}

async function openNotification(response: Notifications.NotificationResponse, isCurrent: () => boolean) {
  const notificationId = response.notification.request.identifier;
  const eventId = response.notification.request.content.data?.notification_id;
  if (typeof eventId === 'string' && /^[0-9a-f-]{36}$/i.test(eventId)) {
    // A confirmed ownership mismatch must not open another account's old alert.
    // Offline/older servers still permit a safe, authorization-checked route.
    const owned = await recordNotificationOpened(eventId).catch(() => null);
    if (owned === false || !isCurrent()) return;
  }
  if (!isCurrent()) return;
  void trackAnalyticsEvent({
    type: 'notification_ouverte',
    idempotencyKey: notificationId ? `notification:${notificationId}` : null,
  }).catch(() => undefined);
  const path = response.notification.request.content.data?.path;
  if (typeof path !== 'string' || !allowedNotificationPath(path)) return;
  router.push(path as never);
}

export function allowedNotificationPath(path: string) {
  if (path.length > 300 || !path.startsWith('/') || path.startsWith('//')) return false;
  return (/^\/(match|result|duel)\/[A-Za-z0-9_~-][A-Za-z0-9._~-]*$/.test(path) && !path.includes('/..'))
    || path === '/(tabs)/social'
    || path === '/streak';
}
