import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveLocale, systemLocale, type SupportedLocale } from '.';

export const LOCALE_PREFERENCE_KEY = '@clutch/locale-preference/v1';
export type LocalePreference = 'system' | SupportedLocale;

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || value === 'fr-FR' || value === 'en-US';
}

export function localeForPreference(preference: LocalePreference) {
  return resolveLocale(preference === 'system' ? systemLocale() : preference);
}

export async function loadLocalePreference(): Promise<LocalePreference> {
  const stored = await AsyncStorage.getItem(LOCALE_PREFERENCE_KEY);
  return isLocalePreference(stored) ? stored : 'system';
}

export async function saveLocalePreference(preference: LocalePreference) {
  await AsyncStorage.setItem(LOCALE_PREFERENCE_KEY, preference);
}
