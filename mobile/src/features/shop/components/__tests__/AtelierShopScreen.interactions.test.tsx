/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import AtelierShopScreen from '../AtelierShopScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/layers', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/layout-grid', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/package-open', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/trophy', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('lucide-react-native/icons/x', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('@/src/components/layout/AppAtmosphere', () => ({ AppAtmosphere: () => null }));
jest.mock('@/src/components/ui/Skeleton', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    Skeleton: () => <ReactNative.View />,
    SkeletonGroup: ({ children, label, testID }: { children: React.ReactNode; label: string; testID: string }) => (
      <ReactNative.View accessibilityLabel={label} accessibilityRole="progressbar" testID={testID}>{children}</ReactNative.View>
    ),
  };
});
jest.mock('@/src/features/consumables/components/ConsumablesShopSection', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ unlimitedVolts: false, volts: 1280 }),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

describe('AtelierShopScreen catalogue', () => {
  it('shows a stable catalogue skeleton while preview data loads', async () => {
    const screen = await render(<AtelierShopScreen previewState={{ loading: true }} />);
    expect(screen.getByTestId('atelier-catalog-loading').props.accessibilityLabel).toBe('Chargement du catalogue');
  });

  it('limits the shop navigation to profile packs, figurines and recharges', async () => {
    const screen = await render(<AtelierShopScreen />);
    expect(screen.getByRole('tab', { name: 'PROFIL' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'FIGURINES' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'RECHARGES' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'VITRINES' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'CADRES' })).toBeNull();
  });

  it('switches from profile collections to the five figurine universes', async () => {
    const screen = await render(<AtelierShopScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'PROFIL' }));
    expect(screen.getAllByTestId(/^identity-shop-/)).toHaveLength(12);
    expect(screen.queryAllByTestId(/^figurine-universe-/)).toHaveLength(0);
    await fireEvent.press(screen.getByRole('tab', { name: 'FIGURINES' }));
    expect(screen.getAllByTestId(/^figurine-universe-/)).toHaveLength(5);
    expect(screen.queryAllByTestId(/^identity-shop-/)).toHaveLength(0);
  });
});
