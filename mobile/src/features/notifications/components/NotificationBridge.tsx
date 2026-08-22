import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { trackAnalyticsEvent } from '@/src/features/analytics/api';

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
    void syncPushTokenIfGranted();

    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      openNotification(response);
      void Notifications.clearLastNotificationResponseAsync();
    });
    return () => subscription.remove();
  }, [userId]);

  return null;
}

function openNotification(response: Notifications.NotificationResponse) {
  const notificationId = response.notification.request.identifier;
  void trackAnalyticsEvent({
    type: 'notification_ouverte',
    idempotencyKey: notificationId ? `notification:${notificationId}` : null,
  }).catch(() => undefined);
  const path = response.notification.request.content.data?.path;
  if (typeof path !== 'string' || !allowedNotificationPath(path)) return;
  router.push(path as never);
}

function allowedNotificationPath(path: string) {
  if (path.length > 300 || !path.startsWith('/') || path.startsWith('//')) return false;
  return path.startsWith('/match/')
    || path.startsWith('/result/')
    || path.startsWith('/duel/')
    || path === '/(tabs)/social';
}
