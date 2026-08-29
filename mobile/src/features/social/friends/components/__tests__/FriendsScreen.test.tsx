/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FriendsData } from '../../types';
import { CirclePeopleScreen } from '../FriendsScreen';

const mockShowSnackbar = jest.fn();

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
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
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/ellipsis', () => ({ __esModule: true, default: 'Ellipsis' }));
jest.mock('lucide-react-native/icons/inbox', () => ({ __esModule: true, default: 'Inbox' }));
jest.mock('lucide-react-native/icons/search', () => ({ __esModule: true, default: 'Search' }));
jest.mock('lucide-react-native/icons/swords', () => ({ __esModule: true, default: 'Swords' }));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({
    equipped: {
      core: null,
      factionEffect: null,
      frame: null,
      profileCard: null,
      showcase: { jersey: null, lighting: null, material: null, supports: null },
      title: null,
    },
  }),
}));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));
jest.mock('../../api', () => ({
  answerFriendRequest: jest.fn(),
  loadFriends: jest.fn(),
  removeFriend: jest.fn(),
  requestFriend: jest.fn(),
  searchPlayers: jest.fn(),
}));

const push = router.push as jest.Mock;
const previewData: FriendsData = {
  amis: [
    { id: 'nova', pseudo: 'Nova', solde: 2840, paris: 38, gagnes: 25, tag_favori: 'KC' },
  ],
  recues: [
    { id: 'lyra', pseudo: 'Lyra' },
    { id: 'orion', pseudo: 'Orion' },
  ],
  envoyees: [{ id: 'atlas', pseudo: 'Atlas' }],
  weekly: {
    saison_id: 'preview-season',
    semaine: 'S34',
    debut: '2026-08-24T00:00:00.000Z',
    fin: '2026-08-30T23:59:59.000Z',
    moi: {
      id: 'me',
      pseudo: 'Testeur',
      rang: 1,
      calls: 8,
      victoires: 6,
      precision_pct: 75,
      frags_hebdo: 240,
      meilleur_call: 100,
      frags: 1240,
      participants: 2,
    },
    classement: [
      {
        id: 'me',
        pseudo: 'Testeur',
        rang: 1,
        calls: 8,
        victoires: 6,
        precision_pct: 75,
        frags_hebdo: 240,
        meilleur_call: 100,
        frags: 1240,
        grade: null,
        moi: true,
      },
      {
        id: 'nova',
        pseudo: 'Nova',
        rang: 2,
        calls: 7,
        victoires: 4,
        precision_pct: 57,
        frags_hebdo: 120,
        meilleur_call: 70,
        frags: 1120,
        grade: null,
        moi: false,
      },
    ],
  },
};
const previewState = { data: previewData };

describe('CirclePeopleScreen', () => {
  beforeEach(() => {
    push.mockClear();
    mockShowSnackbar.mockClear();
  });

  it('opens on a focused activity hierarchy with requests and weekly performance', async () => {
    const screen = await render(<CirclePeopleScreen previewState={previewState} />);

    expect(screen.getByText('L’ACTIVITÉ DU CERCLE.')).toBeTruthy();
    expect(screen.getByTestId('circle-performance-card')).toBeTruthy();
    expect(screen.getByTestId('circle-requests-section')).toBeTruthy();
    expect(screen.getByTestId('circle-weekly-ranking')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'ACTIVITÉ, 3' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('integrates the private league as a contextual Circle destination', async () => {
    const screen = await render(<CirclePeopleScreen previewState={previewState} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir la ligue du Cercle' }));
    expect(push).toHaveBeenCalledWith('/(tabs)/social/leagues');
  });

  it('turns the requests route into an explicit request-first state', async () => {
    const screen = await render(<CirclePeopleScreen focusRequests previewState={previewState} />);

    expect(screen.getByText('TES DEMANDES.')).toBeTruthy();
    expect(screen.getByText('Réponds aux invitations avant de reprendre le fil de la semaine.')).toBeTruthy();
    expect(screen.getByTestId('circle-requests-section')).toBeTruthy();
  });

  it('switches to a virtualized friend directory and opens canonical profiles', async () => {
    const screen = await render(<CirclePeopleScreen previewState={previewState} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'AMIS' }));
    expect(screen.getByTestId('circle-directory-view')).toBeTruthy();
    expect(screen.getByText('TOUS TES AMIS')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/^Nova,/));
    expect(push).toHaveBeenCalledWith({ pathname: '/u/[pseudo]', params: { pseudo: 'Nova' } });
  });

  it('moves secondary friend actions into a contextual sheet', async () => {
    const screen = await render(
      <CirclePeopleScreen initialView="friends" previewState={previewState} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Actions pour Nova' }));
    expect(screen.getByTestId('circle-friend-actions-sheet')).toBeTruthy();
    expect(screen.getByRole('header')).toHaveTextContent('Nova');

    await fireEvent.press(screen.getByRole('button', { name: 'DÉFIER SUR UN MATCH' }));
    expect(push).toHaveBeenCalledWith({
      pathname: '/(tabs)/matches',
      params: { duelRivalId: 'nova', duelRivalPseudo: 'Nova' },
    });
  });

  it('keeps friend removal behind an explicit confirmation', async () => {
    const screen = await render(
      <CirclePeopleScreen initialView="friends" previewState={previewState} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Actions pour Nova' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer Nova de mon Cercle' }));

    expect(screen.getByText('Nova ne figurera plus dans tes classements privés.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmer le retrait de Nova' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmer le retrait de Nova' }));
    expect(screen.queryByRole('button', { name: 'Actions pour Nova' })).toBeNull();
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith({
      message: 'Nova a été retiré de ton Cercle.',
      tone: 'success',
    }));
  });
});
