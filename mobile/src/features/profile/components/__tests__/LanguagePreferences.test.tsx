import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';

import { setActiveLocale } from '@/src/lib/i18n';
import { I18nProvider } from '@/src/lib/i18n/I18nProvider';

import LanguagePreferences from '../LanguagePreferences';

jest.mock('lucide-react-native/icons/languages', () => ({ __esModule: true, default: 'Languages' }));

describe('P3 language preferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setActiveLocale('fr-FR');
  });

  afterEach(() => setActiveLocale('fr-FR'));

  it('shows French as the only application language and migrates an old English preference', async () => {
    await AsyncStorage.setItem('@clutch/locale-preference/v1', 'en-US');
    const screen = await render(<I18nProvider><LanguagePreferences /></I18nProvider>);

    await waitFor(() => expect(screen.getByText('LANGUE DE L’APPLICATION')).toBeTruthy());
    expect(screen.getByText('FRANÇAIS')).toBeTruthy();
    expect(screen.queryByText('ANGLAIS')).toBeNull();
    expect(screen.queryByText('AUTOMATIQUE')).toBeNull();
    await waitFor(() => expect(AsyncStorage.getItem('@clutch/locale-preference/v1')).resolves.toBe('fr-FR'));
  });
});
