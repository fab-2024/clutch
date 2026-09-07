/// <reference types="jest" />

import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createAtelierPreviewItems, INDIVIDUAL_PROFILE_FRAMES } from '../../atelierCatalog';
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
jest.mock('@/src/components/layout/AppAtmosphere', () => ({ AppAtmosphere: () => null }));
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

    expect(screen.queryByTestId('atelier-shelf-rooms')).toBeNull();
    expect(screen.getAllByText('SALLES')).toHaveLength(1);
    expect(screen.queryByTestId('atelier-shelf-level-frames')).toBeNull();
    expect(screen.queryByText('Signal Ascendant')).toBeNull();
    expect(screen.queryByText('Faille Volt')).toBeNull();
    const frameShelf = within(screen.getByTestId('atelier-shelf-profile-frames'));
    expect(frameShelf.getAllByRole('button')).toHaveLength(3);
    for (const frame of INDIVIDUAL_PROFILE_FRAMES) {
      expect(screen.getAllByTestId(`atelier-product-${frame.id}`)).toHaveLength(1);
      expect(frameShelf.getByText(frame.name)).toBeTruthy();
    }
    expect(screen.queryByTestId('atelier-shelf-materials')).toBeNull();
    expect(screen.getByTestId('atelier-shelf-lighting')).toBeTruthy();
    expect(screen.getAllByTestId(/atelier-lighting-preview-/)).toHaveLength(6);
    expect(screen.getByText('Compétition rouge / cyan')).toBeTruthy();
    expect(screen.getByText('Émeraude vert / or')).toBeTruthy();
    expect(screen.getByText('Victoire Clutch')).toBeTruthy();
    expect(screen.getByTestId('atelier-shelf-supports')).toBeTruthy();
    expect(screen.getAllByTestId(/atelier-supports-preview-/)).toHaveLength(6);
    expect(screen.getAllByText('Galerie Obsidienne')).toHaveLength(1);
    expect(screen.getAllByText('Hangar Nocturne').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Forge Volcanique').length).toBeGreaterThan(0);
    expect(screen.getByTestId('atelier-shelf-ranks')).toBeTruthy();
    expect(screen.getAllByTestId(/atelier-ranks-preview-/)).toHaveLength(6);
    expect(screen.getByText('Écrin Mécanique Carbone')).toBeTruthy();
    expect(screen.getByText('Noyau Orbital')).toBeTruthy();
    expect(screen.getByText('Révélation Clutch')).toBeTruthy();
    expect(screen.queryByTestId('atelier-shelf-jerseys')).toBeNull();
    expect(screen.queryByTestId('atelier-category-control')).toBeNull();
    expect(screen.queryByTestId('atelier-scene')).toBeNull();
    expect(screen.queryByText('APERÇU EN DIRECT')).toBeNull();
  });

  it('keeps room purchases accessible from the single room shelf', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    await fireEvent.press(screen.getByTestId('atelier-product-supports_crystal'));

    expect(screen.getByTestId('atelier-product-supports_crystal').props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Débloquer Station Orbitale pour 300 Volts' })).toBeTruthy();
  });

  it('does not offer the Founder Pack in the Boutique', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    expect(screen.queryByTestId('founder-pack-banner')).toBeNull();
  });

  it('shows original packs without the original teams section', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    expect(screen.getByTestId('atelier-shelf-original-packs')).toBeTruthy();
    expect(screen.queryByTestId('atelier-shelf-team-packs')).toBeNull();
    expect(screen.queryByText('ÉQUIPES ORIGINALES')).toBeNull();
    expect(screen.queryByTestId('atelier-shelf-game-collections')).toBeNull();
    expect(screen.queryByTestId('atelier-team-pack-fnatic-black-orange')).toBeNull();
    expect(screen.queryByTestId('atelier-team-pack-kc-blue-wall')).toBeNull();
    expect(screen.queryByTestId('atelier-team-pack-m8-gentle-mates')).toBeNull();
    expect(screen.queryByTestId('atelier-team-pack-clutch-originals-teams')).toBeNull();
    expect(screen.queryByTestId('atelier-game-collection-league-of-legends-collection')).toBeNull();
    expect(screen.queryByTestId('atelier-game-collection-valorant-collection')).toBeNull();
    expect(screen.queryByTestId('atelier-game-collection-rocket-league-collection')).toBeNull();

    expect(screen.queryByTestId('atelier-original-pack-circuit-zero')).toBeNull();
    expect(screen.getByTestId('atelier-shelf-circuit-zero')).toBeTruthy();
    expect(screen.queryByTestId('atelier-original-pack-mythes-forge')).toBeNull();
    expect(screen.getByTestId('atelier-shelf-mythes-forge')).toBeTruthy();
    expect(screen.queryByTestId('atelier-original-pack-neon-protocol')).toBeNull();
    expect(screen.getByTestId('atelier-shelf-neon-protocol')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-sang-des-titans')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-chute-libre')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-serment-du-givre')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-conclave-arcanique')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-turbo-arena')).toBeTruthy();
    expect(screen.getByTestId('atelier-original-pack-dernier-round')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('atelier-original-pack-sang-des-titans'));
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith({
      pathname: '/team-pack-preview',
      params: { packId: 'sang-des-titans' },
    });
  }, 15_000);

  it('buys an individual profile frame and opens the equipped profile', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} previewState={{ forceReduceMotion: true }} />);
    await fireEvent.press(screen.getByTestId('atelier-product-circuit-zero-wake-frame'));
    await fireEvent.press(screen.getByTestId('atelier-action-primary'));
    expect(screen.getByLabelText('Achat de Cadre Sillage pour 200 Volts. Ton solde passera de 1 280 à 1 080 Volts.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));
    await waitFor(() => expect(screen.getByLabelText('Cadre Sillage, configuration active')).toBeTruthy());
    expect(screen.getByLabelText('1 080 Volts disponibles')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'VOIR MON PROFIL' }));
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/profile-preview?frameId=circuit-zero-wake-frame');
  }, 30_000);

  it('buys a single collection object without acquiring its former pack', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);
    expect(screen.queryByText('Jeton Chrono')).toBeNull();
    await fireEvent.press(screen.getByTestId('atelier-product-circuit-zero-kairos-6'));
    await fireEvent.press(screen.getByTestId('atelier-action-primary'));
    expect(screen.getByLabelText('Achat de Kairos-6 pour 200 Volts. Ton solde passera de 1 280 à 1 080 Volts.')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('atelier-purchase-confirm')); });
    expect(screen.getByLabelText('1 080 Volts disponibles')).toBeTruthy();
    expect(screen.getByLabelText('Kairos-6, équipé')).toBeTruthy();
    expect(screen.getByLabelText('Glyphe Zéro, 200 Volts')).toBeTruthy();
  });

  it('reviews a rare purchase before debiting then opens its dedicated reveal', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(1280)} />);

    fireEvent.press(screen.getByTestId('atelier-product-lighting_emerald'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toBeTruthy());
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => expect(screen.getByTestId('atelier-purchase-sheet')).toBeTruthy());
    expect(screen.getByLabelText(
      'Achat de Émeraude vert / or pour 120 Volts. Ton solde passera de 1 280 à 1 160 Volts.',
    )).toBeTruthy();
    expect(screen.getByLabelText('1 280 Volts disponibles')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('1 160 Volts disponibles')).toBeTruthy();
      expect(screen.getByLabelText('Émeraude vert / or, configuration active')).toBeTruthy();
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
  }, 30_000);

  it('returns from a preview reveal to the preserved Atelier context', async () => {
    const screen = await render(
      <AtelierShopScreen
        previewData={makeData(1280)}
        previewState={{ acquisitionProductId: 'rank_orbital_core' }}
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

    fireEvent.press(screen.getByTestId('atelier-product-lighting_emerald'));
    await waitFor(() => expect(screen.getByTestId('atelier-action-primary')).toHaveTextContent('ÉQUIPER'));
    fireEvent.press(screen.getByTestId('atelier-action-primary'));

    await waitFor(() => {
      expect(screen.getByLabelText('Émeraude vert / or, équipé')).toBeTruthy();
    });

    const success = mockShowSnackbar.mock.calls.at(-1)?.[0];
    expect(success).toMatchObject({
      action: {
        accessibilityLabel: 'Rétablir Sobre cyan',
        label: 'ANNULER',
      },
      message: 'Émeraude vert / or est équipé.',
      tone: 'success',
    });

    await act(async () => success.action.onPress());

    await waitFor(() => {
      expect(screen.getByLabelText('Sobre cyan, équipé')).toBeTruthy();
      expect(mockShowSnackbar).toHaveBeenLastCalledWith({
        message: 'Sobre cyan restauré sur ta Vitrine.',
        tone: 'success',
      });
    });
  });

  it('makes an insufficient balance explicit without keeping a hidden preview action', async () => {
    const screen = await render(<AtelierShopScreen previewData={makeData(60)} />);

    fireEvent.press(screen.getByTestId('atelier-product-lighting_emerald'));

    await waitFor(() => {
      expect(screen.getByTestId('atelier-action-primary').props.accessibilityState).toEqual({
        busy: false,
        disabled: true,
      });
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Il manque 60 Volts pour cette finition.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Essayer Émeraude vert / or' })).toBeNull();
  });
});

function makeData(balance: number, emeraldOwned = false): CosmeticShopData {
  const items = createAtelierPreviewItems().map((item) => item.id === 'lighting_emerald'
    ? { ...item, owned: emeraldOwned }
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
        rankDisplay: asEquipped(findItem(items, 'rank_carbon_cradle')),
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
