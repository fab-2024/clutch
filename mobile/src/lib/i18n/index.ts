import { en } from './en';
import { fr } from './fr';

export const FALLBACK_LOCALE = 'fr-FR';
export const SUPPORTED_LOCALES = [FALLBACK_LOCALE, 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof fr;
type Variables = Record<string, string | number>;
type TranslationValue = string | { one: string; other: string };

const dictionaries: Record<SupportedLocale, Record<TranslationKey, TranslationValue>> = {
  'fr-FR': fr,
  'en-US': en,
};
let activeLocale: SupportedLocale = FALLBACK_LOCALE;

export function resolveLocale(requested?: string | null): SupportedLocale {
  const normalized = requested?.trim().replace('_', '-').toLowerCase();
  if (!normalized) return FALLBACK_LOCALE;
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized)
    ?? SUPPORTED_LOCALES.find((locale) => locale.slice(0, 2).toLowerCase() === normalized.slice(0, 2))
    ?? FALLBACK_LOCALE;
}

export function setActiveLocale(locale: SupportedLocale) {
  activeLocale = locale;
}

export function getActiveLocale() {
  return activeLocale;
}

export function systemLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

const pluralRules = new Map<SupportedLocale, Intl.PluralRules>();
const numberFormatters = new Map<SupportedLocale, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function t(key: TranslationKey, variables: Variables = {}) {
  const entry = dictionaries[activeLocale][key] ?? fr[key];
  let rules = pluralRules.get(activeLocale);
  if (!rules) {
    rules = new Intl.PluralRules(activeLocale);
    pluralRules.set(activeLocale, rules);
  }
  const pattern = typeof entry === 'string'
    ? entry
    : rules.select(Number(variables.count ?? 0)) === 'one' ? entry.one : entry.other;
  return pattern.replace(/\{(\w+)\}/g, (placeholder, name: string) => (
    variables[name] === undefined ? placeholder : String(variables[name])
  ));
}

export function formatNumber(value: number) {
  let formatter = numberFormatters.get(activeLocale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(activeLocale);
    numberFormatters.set(activeLocale, formatter);
  }
  return formatter.format(Number.isFinite(value) ? value : 0);
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatDateTime(value: string | Date, timeZone = deviceTimeZone()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return t('common.unknownDate');
  const cacheKey = `${activeLocale}:${timeZone}`;
  let formatter = dateFormatters.get(cacheKey);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(activeLocale, {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone,
      });
    } catch {
      return formatDateTime(date, 'UTC');
    }
    dateFormatters.set(cacheKey, formatter);
  }
  return formatter.format(date);
}
