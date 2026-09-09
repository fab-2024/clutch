/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import StoreHubScreen from '../StoreHubScreen';

jest.mock('lucide-react-native/icons/door-open', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/frame', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/gem', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/layout-grid', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/orbit', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/trophy', () => ({ __esModule: true, default: 'Icon' }));

jest.mock('lucide-react-native/icons/arrow-right', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/chevron-down', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/globe', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/plus', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/shopping-cart', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/arrow-left', () => ({ __esModule: true, default: 'ArrowLeft' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/expand', () => ({ __esModule: true, default: 'Expand' }));
jest.mock('lucide-react-native/icons/settings-2', () => ({ __esModule: true, default: 'Settings2' }));
jest.mock('lucide-react-native/icons/shopping-bag', () => ({ __esModule: true, default: 'ShoppingBag' }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('../AtelierShopScreen', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ headerContent, embedded }: { headerContent: ReactNode; embedded: boolean }) => (
    <View testID={embedded ? 'embedded-shop' : 'standalone-shop'}>{headerContent}</View>
  ) };
});
jest.mock('@/src/features/profile/hooks/useProfileLevel', () => ({ useProfileLevel: () => null }));
jest.mock('@/src/components/layout/GriffHeader', () => ({
  GriffHeader: ({ accessory, leading }: { accessory?: ReactNode; leading?: ReactNode }) => <>{leading}{accessory}</>,
}));
jest.mock('@/src/features/profile/levelFrames/components/LevelFrame', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({
    loading: false,
    profile: { profil_public: true, pseudo: 'TesteurGRIFF' },
  }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({
    equipped: { title: { name: 'Rookie du Call' } },
  }),
}));

const push = router.push as jest.Mock;

describe('StoreHubScreen', () => {
  beforeEach(() => push.mockClear());

  it('shows the catalogue directly in Magasin while preserving the profile header', async () => {
    const screen = await render(<StoreHubScreen />);
    expect(screen.getByTestId('store-hub-showcase')).toBeTruthy();
    expect(screen.getByText('Ton espace. Ton empreinte.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Magasin' }));
    expect(screen.getByTestId('embedded-shop')).toBeTruthy();
    expect(screen.queryByTestId('store-hub-shop')).toBeNull();
    expect(screen.queryByTestId('store-hub-showcase')).toBeNull();
    expect(screen.getByTestId('profile-header-button')).toBeTruthy();
    expect(screen.queryByTestId('store-hub-intro')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: 'Vitrine' }));
    expect(screen.getByTestId('store-hub-showcase')).toBeTruthy();
  });

  it.each([false, true])('opens the personalization shortcuts (preview=%s)', async (preview) => {
    const screen = await render(<StoreHubScreen preview={preview} />);
    await fireEvent.press(screen.getByTestId('store-hub-lights'));
    expect(push).toHaveBeenLastCalledWith({ pathname: preview ? '/showcase-preview' : '/showcase', params: { atelier: 'lighting' } });
    await fireEvent.press(screen.getByTestId('store-hub-frame'));
    expect(push).toHaveBeenLastCalledWith({ pathname: preview ? '/shop-preview' : '/shop', params: { scope: 'owned', tab: 'cadre_profil' } });
    await fireEvent.press(screen.getByTestId('store-hub-visibility'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/settings-preview' : '/settings/profile');
    await fireEvent.press(screen.getByTestId('store-hub-objects'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/showcase-preview' : '/showcase');
    await fireEvent.press(screen.getByTestId('store-hub-discover'));
    expect(screen.getByTestId('embedded-shop')).toBeTruthy();
  });

  it.each([false, true])('preserves profile, showcase and settings navigation (preview=%s)', async (preview) => {
    const screen = await render(<StoreHubScreen preview={preview} />);
    await fireEvent.press(screen.getByTestId('store-hub-profile'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/profile-preview' : '/my-profile');
    await fireEvent.press(screen.getByTestId('store-hub-showcase'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/showcase-preview' : '/showcase');
    await fireEvent.press(screen.getByRole('tab', { name: 'Magasin' }));
    await fireEvent.press(screen.getByTestId('store-hub-settings'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/settings-preview' : '/settings/profile');
    await fireEvent.press(screen.getByTestId('profile-header-button'));
    expect(push).toHaveBeenLastCalledWith(preview ? '/profile-preview' : '/my-profile');
  });
});
