import { createContext, Fragment, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getActiveLocale, setActiveLocale, type SupportedLocale } from '.';
import {
  loadLocalePreference,
  localeForPreference,
  saveLocalePreference,
  type LocalePreference,
} from './preference';

type I18nContextValue = {
  locale: SupportedLocale;
  preference: LocalePreference;
  ready: boolean;
  changePreference: (next: LocalePreference) => Promise<SupportedLocale>;
};

const fallback: I18nContextValue = {
  locale: getActiveLocale(),
  preference: 'system',
  ready: true,
  changePreference: async (next) => {
    const locale = localeForPreference(next);
    setActiveLocale(locale);
    await saveLocalePreference(next);
    return locale;
  },
};

const I18nContext = createContext<I18nContextValue>(fallback);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LocalePreference>('system');
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    const initial = localeForPreference('system');
    setActiveLocale(initial);
    return initial;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadLocalePreference()
      .then((stored) => {
        if (!active) return;
        const nextLocale = localeForPreference(stored);
        setActiveLocale(nextLocale);
        setPreference(stored);
        setLocale(nextLocale);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    preference,
    ready,
    changePreference: async (next) => {
      const nextLocale = localeForPreference(next);
      await saveLocalePreference(next);
      setActiveLocale(nextLocale);
      setPreference(next);
      setLocale(nextLocale);
      return nextLocale;
    },
  }), [locale, preference, ready]);

  return (
    <I18nContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
