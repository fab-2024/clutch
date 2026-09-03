import { fr } from './fr';

export const FALLBACK_LOCALE = 'fr-FR';
export const SUPPORTED_LOCALES = [FALLBACK_LOCALE] as const;
export type TranslationKey = keyof typeof fr;
type Variables = Record<string, string | number>;

// This first delivery ships French only. Unsupported system locales deliberately
// fall back to French; adding a language must never leave untranslated keys.
export function resolveLocale(requested?: string | null): typeof FALLBACK_LOCALE {
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === requested?.toLowerCase())
    ?? FALLBACK_LOCALE;
}

const pluralRules = new Intl.PluralRules(FALLBACK_LOCALE);
const numberFormatter = new Intl.NumberFormat(FALLBACK_LOCALE);
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function t(key: TranslationKey, variables: Variables = {}) {
  const entry = fr[key];
  const pattern = typeof entry === 'string'
    ? entry
    : pluralRules.select(Number(variables.count ?? 0)) === 'one' ? entry.one : entry.other;
  return pattern.replace(/\{(\w+)\}/g, (placeholder, name: string) => (
    variables[name] === undefined ? placeholder : String(variables[name])
  ));
}

export function formatNumber(value: number) {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
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
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(FALLBACK_LOCALE, {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone,
      });
    } catch {
      return formatDateTime(date, 'UTC');
    }
    dateFormatters.set(timeZone, formatter);
  }
  return formatter.format(date);
}
