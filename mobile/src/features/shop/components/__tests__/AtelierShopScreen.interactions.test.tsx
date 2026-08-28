/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createAtelierPreviewItems } from '../../atelierCatalog';
import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticItem,
  type CosmeticShopData,
  type EquippedCosmetic,
} from '../../types';
import AtelierShopScreen from '../AtelierShopScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: identity, inOut: () => identity, out: () => identity, quad: identity },
    FadeIn: { duration: () => undefined },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    SafeAreaView: ReactNative.View,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});
jest.mock('@/src/components/overlays/BaseSheet', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    BaseSheet: ({ children, footer, testID, title, visible }: {
      children: ReactNode;
      footer?: ReactNode;
      testID?: string;
      title: string;
      visible: boolean;
    }) => visible ? (
      <ReactNative.View testID={testID}>
        <ReactNative.Text accessibilityRole="header">{title}</ReactNative.Text>
        {children}
        {footer}
      </ReactNative.View>
    ) : null,
  };
});
jest.mock('@/src/features/profile/components/showcase/ShowcaseRoomScene', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <ReactNative.View {...props} testID="atelier-scene" />,
  };
});
jest.mock('@/src/features/profile/levelFrames/components/LevelFrameGallery', () => ({
  __esModule: true,
  default: 'LevelFrameGallery',
}));
jest.mock('@/src/features/profile/levelFrames/useLevelFrameEquipment', () => ({
  useLevelFrameEquipment: () => ({ equip: jest.fn(), variant: 'signalAscendant' }),
}));
jest.mock('@/src/features/profile/api', () => ({ loadProfileData: jest.fn() }));
jest.mock('@/src/features/shop/api', () => ({
  equipCosmetic: jest.fn(),
  loadCosmeticShop: jest.fn(),
  purchaseCosmetic: jest.fn(),
}));
jest.mock('@/src/lib/feedback', () => ({
  errorFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { pseudo: 'Testeur' }, session: { user: { email: 'test@clutch.app' } } }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ refresh: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: jest.fn().mockResolvedValue(undefined), volts: 1280 }),
}));

describe('AtelierShopScreen interactions', () => {
  it('keeps a structured preview in place while the Atelier loads', async () => {
    const screen = await render(
      <AtelierShopScreen previewData={makeData(1280)} previewState={{ loading: true }} />,
    );

    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Chargement de l’aperçu Atelier');
    expect(screen.getByTestId('atelier-scene-loading')).toBeTruthy();
    expect(screen.queryByTestId('atelier-scene')).toBeNull();
  });

  it('reviews a purchase before debiting and equips it after confirmation', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    fireEvent.press(screen.getByTestId('atelier-product-material_steel'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toBeTruthy());
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => expect(screen.getByTestId('atelier-purchase-sheet')).toBeTruthy());
    expect(screen.getByLabelText(
      'Achat de Acier brossé pour 120 Volts. Ton solde passera de 1 280 à 1 160 Volts.',
    )).toBeTruthy();
    expect(screen.getByLabelText('1 280 Volts disponibles')).toBeTruthy();

    fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));

    await waitFor(() => {
      expect(screen.getByText('Acier brossé rejoint ta collection et équipe maintenant ta Vitrine.')).toBeTruthy();
      expect(screen.getByLabelText('1 160 Volts disponibles')).toBeTruthy();
      expect(screen.getByLabelText('Acier brossé, configuration active')).toBeTruthy();
    });
  });

  it('applies owned equipment immediately to the live scene', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280, true)} />);

    fireEvent.press(screen.getByTestId('atelier-product-material_steel'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toHaveTextContent('ÉQUIPER'));
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => {
      expect(screen.getByTestId('atelier-scene').props.theme).toBe('steel');
      expect(screen.getByText('Acier brossé équipe maintenant ta Vitrine.')).toBeTruthy();
    });
  });

  it('keeps try-on available while making an insufficient balance explicit', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(60)} />);

    fireEvent.press(screen.getByTestId('atelier-product-material_steel'));

    await waitFor(() => {
      expect(screen.getByTestId('atelier-action-primary').props.accessibilityState).toEqual({
        busy: false,
        disabled: true,
      });
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Il manque 60 Volts pour cette finition.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Essayer Acier brossé' })).toBeTruthy();
  });
});

function makeData(balance: number, steelOwned = false): CosmeticShopData {
  const items = createAtelierPreviewItems().map((item) => item.id === 'material_steel'
    ? { ...item, owned: steelOwned }
    : item);

  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: {
      ...EMPTY_EQUIPPED_COSMETICS,
      showcase: {
        jersey: asEquipped(findItem(items, 'jersey_locker')),
        lighting: asEquipped(findItem(items, 'lighting_cyan')),
        material: asEquipped(findItem(items, 'material_graphite')),
        supports: asEquipped(findItem(items, 'supports_gallery')),
      },
    },
    items,
  };
}

function findItem(items: CosmeticItem[], id: string) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing test item ${id}`);
  return item;
}

function asEquipped(item: CosmeticItem): EquippedCosmetic {
  const { accent, description, id, level, name, rarity, slot, styleKey } = item;
  return { accent, description, id, level, name, rarity, slot, styleKey };
}
