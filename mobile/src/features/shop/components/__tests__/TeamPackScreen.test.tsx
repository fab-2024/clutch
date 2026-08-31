/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  type TeamPackDefinition,
} from '../../teamPackCatalog';
import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticShopData,
} from '../../types';
import TeamPackScreen from '../TeamPackScreen';

const mockShowSnackbar = jest.fn();

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ key: 'fnatic-black-orange' }),
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
  beforeEach(() => jest.clearAllMocks());

  it('renders the Fnatic hero and twelve inspectable objects', async () => {
    const screen = await render(<TeamPackScreen packId={FNATIC_TEAM_PACK.id} previewData={makeData()} />);

    expect(screen.getByTestId('team-pack-hero')).toBeTruthy();
    expect(screen.getAllByText('BLACK & ORANGE')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-fnatic-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-fnatic-jersey'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Maillot Fnatic').length).toBeGreaterThan(0);
    expect(screen.getByText('Le maillot noir Fnatic, relevé de l’orange iconique de l’équipe.')).toBeTruthy();
  });

  it('buys and equips the complete pack from its primary action', async () => {
    const screen = await render(<TeamPackScreen packId={FNATIC_TEAM_PACK.id} previewData={makeData()} />);

    expect(screen.getByTestId('team-pack-primary-action')).toHaveTextContent('ACHETER LE PACK');

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-primary-action'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('team-pack-primary-action')).toHaveTextContent('PACK ÉQUIPÉ');
      expect(screen.getByLabelText('Maillot Fnatic, objet 2 sur 12, possédé')).toBeTruthy();
    });
    expect(mockShowSnackbar).toHaveBeenCalledWith({
      message: 'Pack Fnatic débloqué et équipé dans ta Vitrine.',
      tone: 'success',
    });
  });

  it('renders the KC Blue Wall hero and twelve inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen packId={KC_TEAM_PACK.id} previewData={makeData(1280, KC_TEAM_PACK)} />,
    );

    expect(screen.getAllByText('BLUE WALL')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-kc-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-kc-jersey'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Maillot KC').length).toBeGreaterThan(0);
    expect(screen.getByText('Le maillot noir et bleu de la Karmine Corp, frappé du monogramme blanc.')).toBeTruthy();
    expect(screen.getByText('KARMINE CORP × CLUTCH')).toBeTruthy();
  });

  it('makes an insufficient Volt balance explicit', async () => {
    const screen = await render(<TeamPackScreen packId={FNATIC_TEAM_PACK.id} previewData={makeData(1199)} />);

    expect(screen.getByTestId('team-pack-primary-action')).toHaveTextContent('SOLDE INSUFFISANT');
    expect(screen.getByTestId('team-pack-primary-action').props.accessibilityState).toEqual({
      busy: false,
      disabled: true,
    });
    expect(screen.getByLabelText('Solde insuffisant. Il manque 1 Volts')).toBeTruthy();
  });
});

function makeData(balance = 1280, pack: TeamPackDefinition = FNATIC_TEAM_PACK): CosmeticShopData {
  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: EMPTY_EQUIPPED_COSMETICS,
    items: createTeamPackPreviewItems(pack),
  };
}
