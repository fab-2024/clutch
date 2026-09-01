/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  CIRCUIT_ZERO_PACK,
  CLUTCH_ORIGINALS_TEAM_PACK,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  M8_TEAM_PACK,
  MYTHS_FORGE_PACK,
  NEON_PROTOCOL_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
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

  it('renders the original Protocole Néon pack and its twelve inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={NEON_PROTOCOL_PACK.id}
        previewData={makeData(1280, NEON_PROTOCOL_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION // ORIGINALE')).toBeTruthy();
    expect(screen.getByText('CRÉATION ORIGINALE')).toBeTruthy();
    expect(screen.getByText('CRÉATION ORIGINALE CLUTCH')).toBeTruthy();
    expect(screen.getAllByTestId(/^team-pack-item-neon-protocol-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-neon-protocol-armor-vega'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Armure Vega').length).toBeGreaterThan(0);
  });

  it('renders Mythes de la Forge and its twelve inspectable original objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={MYTHS_FORGE_PACK.id}
        previewData={makeData(1280, MYTHS_FORGE_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION // ORIGINALE')).toBeTruthy();
    expect(screen.getAllByText('ORÉA // MAÎTRE-FORGE')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-mythes-forge-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-mythes-forge-armor-orea'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Armure Oréa').length).toBeGreaterThan(0);
  });

  it('renders Circuit Zéro and its twelve inspectable original objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={CIRCUIT_ZERO_PACK.id}
        previewData={makeData(1280, CIRCUIT_ZERO_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION // ORIGINALE')).toBeTruthy();
    expect(screen.getAllByText('KAIROS-6 // CHRONONAUTE')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-circuit-zero-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-circuit-zero-kairos-6'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Kairos-6').length).toBeGreaterThan(0);
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

  it('renders the M8 Gentle Mates Paris hero and twelve inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen packId={M8_TEAM_PACK.id} previewData={makeData(1280, M8_TEAM_PACK)} />,
    );

    expect(screen.getAllByText('GENTLE MATES PARIS')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-m8-/)).toHaveLength(12);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-m8-jersey'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Maillot M8 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('Le maillot 2026 blanc et bleu de Gentle Mates, inspiré par Paris.')).toBeTruthy();
    expect(screen.getByText('GENTLE MATES × CLUTCH')).toBeTruthy();
  });

  it('renders the League of Legends game collection and its five inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={LEAGUE_OF_LEGENDS_COLLECTION_PACK.id}
        previewData={makeData(1_000, LEAGUE_OF_LEGENDS_COLLECTION_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION JEU // OFFICIELLE')).toBeTruthy();
    expect(screen.getAllByText('ICÔNES DE RUNETERRA')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-lol-/)).toHaveLength(5);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-lol-baron-nashor'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Baron Nashor').length).toBeGreaterThan(0);
    expect(screen.getByText('RIOT GAMES × CLUTCH')).toBeTruthy();
  });

  it('renders the Valorant game collection and its five inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={VALORANT_COLLECTION_PACK.id}
        previewData={makeData(1_000, VALORANT_COLLECTION_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION JEU // OFFICIELLE')).toBeTruthy();
    expect(screen.getAllByText('PROTOCOLE RADIANT')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-valorant-/)).toHaveLength(5);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-valorant-omen'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Omen').length).toBeGreaterThan(0);
    expect(screen.getByText('RIOT GAMES × CLUTCH')).toBeTruthy();
  });

  it('renders the Rocket League game collection and its five inspectable objects', async () => {
    const screen = await render(
      <TeamPackScreen
        packId={ROCKET_LEAGUE_COLLECTION_PACK.id}
        previewData={makeData(1_000, ROCKET_LEAGUE_COLLECTION_PACK)}
      />,
    );

    expect(screen.getByText('COLLECTION JEU // OFFICIELLE')).toBeTruthy();
    expect(screen.getAllByText('BLUE & ORANGE ARENA')).toHaveLength(2);
    expect(screen.getAllByTestId(/^team-pack-item-rocket-league-/)).toHaveLength(5);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-pack-item-rocket-league-arena-ball'));
    });

    await waitFor(() => expect(screen.getByTestId('team-pack-item-sheet')).toBeTruthy());
    expect(screen.getAllByText('Ballon d’arène').length).toBeGreaterThan(0);
    expect(screen.getByText('PSYONIX × CLUTCH')).toBeTruthy();
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
