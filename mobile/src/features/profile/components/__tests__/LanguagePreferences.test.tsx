import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { setActiveLocale } from '@/src/lib/i18n';
import { I18nProvider } from '@/src/lib/i18n/I18nProvider';
import { saveLocalePreference } from '@/src/lib/i18n/preference';

import LanguagePreferences from '../LanguagePreferences';

const mockShowSnackbar = jest.fn();

jest.mock('lucide-react-native/icons/languages', () => ({ __esModule: true, default: 'Languages' }));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

describe('P3 language preferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await saveLocalePreference('fr-FR');
    setActiveLocale('fr-FR');
    mockShowSnackbar.mockClear();
  });

  afterEach(() => setActiveLocale('fr-FR'));

  it('persists and applies English, then synchronizes the notification locale', async () => {
    const onLocaleChange = jest.fn();
    const screen = await render(<I18nProvider><LanguagePreferences onLocaleChange={onLocaleChange} /></I18nProvider>);

    await waitFor(() => expect(screen.getByText('LANGUE DE L’APPLICATION')).toBeTruthy());
    await fireEvent.press(screen.getByRole('radio', { name: 'ENGLISH' }));

    await waitFor(() => expect(screen.getByText('APP LANGUAGE')).toBeTruthy());
    expect(onLocaleChange).toHaveBeenCalledWith('en-US');
    await expect(AsyncStorage.getItem('@clutch/locale-preference/v1')).resolves.toBe('en-US');
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });
});
