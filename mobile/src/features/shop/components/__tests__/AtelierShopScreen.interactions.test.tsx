/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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

const mockShowSnackbar = jest.fn();

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
    Extrapolation: { CLAMP: 'clamp' },
    FadeIn: { duration: () => undefined },
    interpolate: (_value: number, _input: number[], output: number[]) => output.at(-1) ?? 0,
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
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    BaseSheet: ({ children, footer, onClosed, testID, title, visible }: {
      children: ReactNode;
      footer?: ReactNode;
      onClosed?: () => void;
      testID?: string;
      title: string;
      visible: boolean;
    }) => {
      const wasVisible = React.useRef(visible);
      React.useEffect(() => {
        if (wasVisible.current && !visible) onClosed?.();
        wasVisible.current = visible;
      }, [onClosed, visible]);
      return visible ? (
        <ReactNative.View testID={testID}>
          <ReactNative.Text accessibilityRole="header">{title}</ReactNative.Text>
          {children}
          {footer}
        </ReactNative.View>
      ) : null;
    },
  };
});
jest.mock('@/src/features/profile/levelFrames/components/LevelFrame', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ variant }: { variant: string }) => <ReactNative.Text>{variant}</ReactNative.Text>,
  };
});
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
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

describe('AtelierShopScreen interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps a structured catalogue in place while the Atelier loads', async () => {
    const screen = await render(
      <AtelierShopScreen previewData={makeData(1280)} previewState={{ loading: true }} />,
    );

    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Chargement du catalogue Atelier');
    expect(screen.getByTestId('atelier-catalog-loading')).toBeTruthy();
    expect(screen.queryByTestId('atelier-scene')).toBeNull();
  });

  it('stacks one horizontal shelf per collection and removes the live preview', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    expect(screen.getByTestId('atelier-shelf-level-frames')).toBeTruthy();
    expect(screen.getByTestId('atelier-shelf-materials')).toBeTruthy();
    expect(screen.getByTestId('atelier-shelf-lighting')).toBeTruthy();
    expect(screen.getByTestId('atelier-shelf-supports')).toBeTruthy();
    expect(screen.getByTestId('atelier-shelf-jerseys')).toBeTruthy();
    expect(screen.queryByTestId('atelier-category-control')).toBeNull();
    expect(screen.queryByTestId('atelier-scene')).toBeNull();
    expect(screen.queryByText('APERÇU EN DIRECT')).toBeNull();
  });

  it('keeps the Founder Pack inside the Boutique', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    expect(screen.getByTestId('founder-pack-banner')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('founder-pack-banner'));

    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/founder-pack-preview');
  });

  it('reviews a rare purchase before debiting then opens its dedicated reveal', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    fireEvent.press(screen.getByTestId('atelier-product-material_steel'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toBeTruthy());
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => expect(screen.getByTestId('atelier-purchase-sheet')).toBeTruthy());
    expect(screen.getByLabelText(
      'Achat de Acier brossé pour 120 Volts. Ton solde passera de 1 280 à 1 160 Volts.',
    )).toBeTruthy();
    expect(screen.getByLabelText('1 280 Volts disponibles')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('1 160 Volts disponibles')).toBeTruthy();
      expect(screen.getByLabelText('Acier brossé, configuration active')).toBeTruthy();
      expect(screen.getByTestId('rare-acquisition-reveal')).toBeTruthy();
      expect(screen.getByText('SIGNAL RARE')).toBeTruthy();
    });
    expect(mockShowSnackbar).not.toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' }));
    expect(jest.requireMock('@/src/lib/feedback').successFeedback).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('rare-acquisition-showcase'));
    });
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/showcase-preview');
    await waitFor(() => expect(screen.queryByTestId('rare-acquisition-reveal')).toBeNull());
  });

  it('returns from a preview reveal to the preserved Atelier context', async () => {
    const screen = await render(
      <AtelierShopScreen
        previewData={makeData(1280)}
        previewState={{ acquisitionProductId: 'material_carbon' }}
      />,
    );

    await waitFor(() => expect(screen.getByText('PIÈCE ÉPIQUE')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('rare-acquisition-continue'));
    });

    await waitFor(() => expect(screen.queryByTestId('rare-acquisition-reveal')).toBeNull());
    expect(screen.getByText('COMPOSE TON ESPACE.')).toBeTruthy();
  });

  it('applies owned equipment immediately to the selected collection', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280, true)} />);

    fireEvent.press(screen.getByTestId('atelier-product-material_steel'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toHaveTextContent('ÉQUIPER'));
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => {
      expect(screen.getByLabelText('Acier brossé, équipé')).toBeTruthy();
    });

    const success = mockShowSnackbar.mock.calls.at(-1)?.[0];
    expect(success).toMatchObject({
      action: {
        accessibilityLabel: 'Rétablir Graphite mat',
        label: 'ANNULER',
      },
      message: 'Acier brossé équipe ta Vitrine.',
      tone: 'success',
    });

    await act(async () => success.action.onPress());

    await waitFor(() => {
      expect(screen.getByLabelText('Graphite mat, équipé')).toBeTruthy();
      expect(mockShowSnackbar).toHaveBeenLastCalledWith({
        message: 'Graphite mat restauré sur ta Vitrine.',
        tone: 'success',
      });
    });
  });

  it('makes an insufficient balance explicit without keeping a hidden preview action', async () => {
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
    expect(screen.queryByRole('button', { name: 'Essayer Acier brossé' })).toBeNull();
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
