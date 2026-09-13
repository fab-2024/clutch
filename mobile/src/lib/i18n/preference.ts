import AsyncStorage from '@react-native-async-storage/async-storage';

import { FALLBACK_LOCALE, type SupportedLocale } from '.';

export const LOCALE_PREFERENCE_KEY = '@clutch/locale-preference/v1';
export type LocalePreference = 'system' | SupportedLocale;
export const APP_LOCALE: SupportedLocale = FALLBACK_LOCALE;

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || value === APP_LOCALE;
}

export function localeForPreference(_preference: LocalePreference) {
  return APP_LOCALE;
}

export async function loadLocalePreference(): Promise<LocalePreference> {
  const stored = await AsyncStorage.getItem(LOCALE_PREFERENCE_KEY);
  if (stored !== APP_LOCALE) {
    await AsyncStorage.setItem(LOCALE_PREFERENCE_KEY, APP_LOCALE);
  }
  return APP_LOCALE;
}

export async function saveLocalePreference(_preference: LocalePreference) {
  await AsyncStorage.setItem(LOCALE_PREFERENCE_KEY, APP_LOCALE);
}
