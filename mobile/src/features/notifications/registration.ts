import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { deactivateNotificationDevice, registerNotificationToken } from './api';
import type { PushRegistrationResult } from './types';

const DEVICE_ID_KEY = '@clutch/notification-device-id';

export async function requestAndRegisterPushToken(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') return { status: 'unsupported' };

  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    return await registerCurrentDevice();
  } catch (caught) {
    return {
      status: 'error',
      message: caught instanceof Error ? caught.message : 'Activation des notifications impossible.',
    };
  }
}

export async function syncPushTokenIfGranted(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') return { status: 'unsupported' };

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    await ensureAndroidChannel();
    return await registerCurrentDevice();
  } catch (caught) {
    return {
      status: 'error',
      message: caught instanceof Error ? caught.message : 'Synchronisation du jeton impossible.',
    };
  }
}

export async function deactivateCurrentDevicePushToken() {
  if (Platform.OS === 'web') return 0;
  return deactivateNotificationDevice(await notificationDeviceId());
}

async function registerCurrentDevice(): Promise<PushRegistrationResult> {
  const projectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return { status: 'unconfigured' };

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const activeDevices = await registerNotificationToken({
    token: token.data,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
    deviceId: await notificationDeviceId(),
  });
  return { status: 'registered', activeDevices };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('clutch-events', {
    name: 'Événements GRIFF',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#E8FF3D',
  });
}

async function notificationDeviceId() {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const generated = `clutch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}
