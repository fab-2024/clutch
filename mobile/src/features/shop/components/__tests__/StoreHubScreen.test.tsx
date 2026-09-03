/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import StoreHubScreen from '../StoreHubScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/expand', () => ({ __esModule: true, default: 'Expand' }));
jest.mock('lucide-react-native/icons/settings-2', () => ({ __esModule: true, default: 'Settings2' }));
jest.mock('lucide-react-native/icons/shopping-bag', () => ({ __esModule: true, default: 'ShoppingBag' }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
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

  it('keeps the Magasin focused on Vitrine and Boutique', async () => {
    const screen = await render(<StoreHubScreen />);

    expect(screen.getByText('MAGASIN')).toBeTruthy();
    expect(screen.getByTestId('store-hub-showcase')).toBeTruthy();
    expect(screen.getByTestId('store-hub-shop')).toBeTruthy();
    expect(screen.getByTestId('store-hub-profile')).toBeTruthy();
    expect(screen.getAllByText('TesteurGRIFF')).toHaveLength(2);
    expect(screen.getByText('ROOKIE DU CALL')).toBeTruthy();
    expect(screen.getByText('PUBLIC')).toBeTruthy();
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered.indexOf('store-hub-intro')).toBeLessThan(rendered.indexOf('store-hub-profile'));
    expect(screen.queryByText('PROGRESSION')).toBeNull();
    expect(screen.queryByText('FACTION')).toBeNull();
    expect(screen.queryByText('ACTIVATIONS')).toBeNull();
  });

  it('opens the two production destinations and profile settings', async () => {
    const screen = await render(<StoreHubScreen />);

    await fireEvent.press(screen.getByTestId('profile-header-button'));
    await fireEvent.press(screen.getByTestId('store-hub-profile'));
    await fireEvent.press(screen.getByTestId('store-hub-showcase'));
    await fireEvent.press(screen.getByTestId('store-hub-shop'));
    await fireEvent.press(screen.getByTestId('store-hub-settings'));

    expect(push).toHaveBeenNthCalledWith(1, '/my-profile');
    expect(push).toHaveBeenNthCalledWith(2, '/my-profile');
    expect(push).toHaveBeenNthCalledWith(3, '/showcase');
    expect(push).toHaveBeenNthCalledWith(4, {
      pathname: '/shop',
      params: { scope: 'catalog' },
    });
    expect(push).toHaveBeenNthCalledWith(5, '/settings/profile');
  });

  it('keeps preview navigation inside preview routes', async () => {
    const screen = await render(<StoreHubScreen preview />);

    await fireEvent.press(screen.getByTestId('profile-header-button'));
    await fireEvent.press(screen.getByTestId('store-hub-profile'));
    await fireEvent.press(screen.getByTestId('store-hub-showcase'));
    await fireEvent.press(screen.getByTestId('store-hub-shop'));
    await fireEvent.press(screen.getByTestId('store-hub-settings'));

    expect(push).toHaveBeenNthCalledWith(1, '/profile-preview');
    expect(push).toHaveBeenNthCalledWith(2, '/profile-preview');
    expect(push).toHaveBeenNthCalledWith(3, '/showcase-preview');
    expect(push).toHaveBeenNthCalledWith(4, {
      pathname: '/shop-preview',
      params: { scope: 'catalog' },
    });
    expect(push).toHaveBeenNthCalledWith(5, '/settings-preview');
  });
});
