/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { ReactNode } from 'react';

import {
  CIRCUIT_ZERO_PACK,
  CLUTCH_ORIGINALS_TEAM_PACK,
  createTeamPackPreviewItems,
  MYTHS_FORGE_PACK,
  NEON_PROTOCOL_PACK,
  SANG_DES_TITANS_PACK,
  type TeamPackDefinition,
} from '../../teamPackCatalog';
import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticShopData,
} from '../../types';
import TeamPackScreen from '../TeamPackScreen';

const mockShowSnackbar = jest.fn();

jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: 'test-user' } } }) }));
jest.mock('@/src/features/purchases/api', () => ({ isCosmeticPackBillingReady: jest.fn().mockResolvedValue(true), syncCosmeticPacks: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/src/features/purchases/store', () => ({ currentStorePlatform: () => 'ios' }));
jest.mock('@/src/features/purchases/packStore', () => ({
  loadPackStore: jest.fn().mockResolvedValue({ availability: 'ready', localizedPrice: '2,99 €' }),
  purchasePackFromStore: jest.fn().mockResolvedValue('purchased'),
  restorePackPurchases: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{href}</Text>;
  },
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ key: 'sang-des-titans' }),
  useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: (value: number) => value, out: () => (value: number) => value },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    cancelAnimation: jest.fn(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
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
        <ReactNative.Text>{title}</ReactNative.Text>
        {children}
        {footer}
      </ReactNative.View>
    ) : null,
  };
});
jest.mock('@/src/features/shop/api', () => ({
  equipCosmeticPack: jest.fn(),
  loadCosmeticShop: jest.fn(),
  purchaseCosmeticPack: jest.fn(),
}));
jest.mock('@/src/lib/feedback', () => ({
  errorFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ refresh: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

describe('TeamPackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });
  afterEach(() => jest.restoreAllMocks());


  it.each([NEON_PROTOCOL_PACK, MYTHS_FORGE_PACK, CIRCUIT_ZERO_PACK])('redirects former bundle $id to individual sales', async (collection) => {
    const screen = await render(<TeamPackScreen packId={collection.id} previewData={makeData(1280, collection)} />);
    expect(screen.getByText('/shop-preview')).toBeTruthy();
    expect(screen.queryByTestId('team-pack-primary')).toBeNull();
  });

  it('shows the cash price and allows a preview purchase with zero Volts', async () => {
    const screen = await render(<TeamPackScreen packId={SANG_DES_TITANS_PACK.id} previewData={makeData(0, SANG_DES_TITANS_PACK)} />);
    expect(screen.getByText('2,99 €')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('team-pack-primary-action')); });
    expect(screen.getByText('PACK ÉQUIPÉ')).toBeTruthy();
  });

  it('keeps checkout disabled until the backend billing migration is ready', async () => {
    const billing = jest.requireMock('@/src/features/purchases/api');
    billing.isCosmeticPackBillingReady.mockResolvedValueOnce(false);
    jest.requireMock('@/src/features/shop/api').loadCosmeticShop.mockResolvedValue(makeData(0, SANG_DES_TITANS_PACK));
    const screen = await render(<TeamPackScreen packId={SANG_DES_TITANS_PACK.id} />);
    await waitFor(() => expect(screen.getByText('BIENTÔT DISPONIBLE')).toBeTruthy());
    expect(screen.getByTestId('team-pack-primary-action').props.accessibilityState.disabled).toBe(true);
    expect(jest.requireMock('@/src/features/purchases/packStore').purchasePackFromStore).not.toHaveBeenCalled();
  });

  it.each(['cancelled', 'pending'])('never grants a pack after a %s store result', async (outcome) => {
    const shop = jest.requireMock('@/src/features/shop/api');
    const store = jest.requireMock('@/src/features/purchases/packStore');
    shop.loadCosmeticShop.mockResolvedValue(makeData(0, SANG_DES_TITANS_PACK));
    store.purchasePackFromStore.mockResolvedValueOnce(outcome);
    const screen = await render(<TeamPackScreen packId={SANG_DES_TITANS_PACK.id} />);
    await waitFor(() => expect(screen.getByTestId('team-pack-primary-action').props.accessibilityState.disabled).toBe(false));
    await act(async () => { fireEvent.press(screen.getByTestId('team-pack-primary-action')); });
    expect(shop.equipCosmeticPack).not.toHaveBeenCalled();
    expect(shop.purchaseCosmeticPack).not.toHaveBeenCalled();
    expect(jest.requireMock('@/src/features/purchases/api').syncCosmeticPacks).not.toHaveBeenCalled();
    expect(screen.queryByText('PACK ÉQUIPÉ')).toBeNull();
  });

  it('does not grant a paid pack until the server inventory confirms ownership', async () => {
    const shop = jest.requireMock('@/src/features/shop/api');
    shop.loadCosmeticShop.mockResolvedValue(makeData(0, SANG_DES_TITANS_PACK));
    const screen = await render(<TeamPackScreen packId={SANG_DES_TITANS_PACK.id} />);
    await waitFor(() => expect(screen.getByTestId('team-pack-primary-action').props.accessibilityState.disabled).toBe(false));
    await act(async () => { fireEvent.press(screen.getByTestId('team-pack-primary-action')); });
    expect(jest.requireMock('@/src/features/purchases/api').syncCosmeticPacks).toHaveBeenCalled();
    expect(shop.equipCosmeticPack).not.toHaveBeenCalled();
    expect(screen.getByText(/Ton achat est en cours de validation/)).toBeTruthy();
  });

  it('keeps effects out of the pack display while they are deferred', async () => {
    const screen = await render(<TeamPackScreen packId={SANG_DES_TITANS_PACK.id} previewData={makeData(1280, SANG_DES_TITANS_PACK)} />);
    expect(screen.queryByTestId('team-pack-item-sang-des-titans-titan-wave-effect')).toBeNull();
    expect(screen.queryByTestId('titan-wave-preview')).toBeNull();
  });

  it('renders the five current objects available from an original pack', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={SANG_DES_TITANS_PACK.id}
        previewData={makeData(1280, SANG_DES_TITANS_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION // ORIGINALE')).toBeTruthy();
    expect(screen.getAllByText('DERNIER PACTE')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-sang-des-titans-/)).toHaveLength(5);
    expect(screen.queryByText('Jeton du Tribut')).toBeNull();
    expect(screen.queryByText('Carte Dernier Pacte')).toBeNull();
    expect(screen.queryByText('Titre Porte-Serment')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-sang-des-titans-eclipse-axe'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Hache de l’Éclipse').length).toBeGreaterThan(0);
  });



  it('renders the six fictional teams only as an original Boutique collection', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={CLUTCH_ORIGINALS_TEAM_PACK.id}
        previewData={makeData(1_000, CLUTCH_ORIGINALS_TEAM_PACK)}
      />,
    );

    expect(screen.getByText('PACK ÉQUIPES // ORIGINAL')).toBeTruthy();
    expect(screen.getByText('CRÉATION ORIGINALE CLUTCH')).toBeTruthy();
    expect(screen.getAllByTestId(/^team-pack-item-clutch-originals-/)).toHaveLength(6);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-clutch-originals-vanta-six-badge'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Emblème Vanta Six').length).toBeGreaterThan(0);
  });


});

function makeData(balance = 1280, pack: TeamPackDefinition = SANG_DES_TITANS_PACK): CosmeticShopData {
  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: EMPTY_EQUIPPED_COSMETICS,
    items: createTeamPackPreviewItems(pack),
  };
}
