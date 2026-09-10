import { Platform } from 'react-native';

import type { StorePlatform } from './types';

let configuredUserId: string | null = null;

export class StoreConfigurationError extends Error {
  readonly code = 'configuration_required';

  constructor(message: string) {
    super(message);
    this.name = 'StoreConfigurationError';
  }
}

export function currentStorePlatform(): StorePlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return null;
}

export async function configurePurchases(userId: string, platform: StorePlatform) {
  const apiKey = platform === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (!apiKey) {
    throw new StoreConfigurationError(
      `La clé RevenueCat ${platform === 'ios' ? 'iOS' : 'Android'} manque dans le build.`,
    );
  }

  const { default: Purchases } = await import('react-native-purchases');
  const configured = await Purchases.isConfigured();
  if (!configured) {
    Purchases.configure({
      apiKey,
      appUserID: userId,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
    configuredUserId = userId;
    return Purchases;
  }

  if (configuredUserId !== userId) {
    try {
      await Purchases.logOut();
    } catch {
      // The current RevenueCat identity can already be anonymous after reload.
    }
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
  return Purchases;
}
