/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { loadDuels } from '../../api';
import type { DuelRow } from '../../types';
import DuelsScreen from '../DuelsScreen';
import { FRIEND_MISSIONS_FIXTURE } from '@/src/features/social/missions/testing/fixtures';
import { useFriendMissions } from '@/src/features/social/missions/hooks/useFriendMissions';
import { selectionFeedback } from '@/src/lib/feedback';

const mockReloadMissions = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/flame', () => ({ __esModule: true, default: 'Flame' }));
jest.mock('lucide-react-native/icons/inbox', () => ({ __esModule: true, default: 'Inbox' }));
jest.mock('lucide-react-native/icons/zap', () => ({ __esModule: true, default: 'Zap' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
jest.mock('../../api', () => ({ loadDuels: jest.fn() }));
jest.mock('@/src/features/social/missions/hooks/useFriendMissions', () => ({
  useFriendMissions: jest.fn(),
}));
jest.mock('@/src/lib/feedback', () => ({ selectionFeedback: jest.fn() }));

const loadDuelRows = jest.mocked(loadDuels);
const useMissions = jest.mocked(useFriendMissions);
const playSelectionFeedback = jest.mocked(selectionFeedback);

const DUEL_FIXTURE: DuelRow = {
  token: 'a4d5e6f789ab1234',
  match_id: 'match-1',
  statut: 'accepte',
  moi_role: 'createur',
  createur_pseudo: 'Moi',
  accepteur_pseudo: 'Nova',
  createur_choix: 'a',
  accepteur_choix: 'b',
  equipe_a: 'G2 Esports',
  equipe_b: 'Fnatic',
  tag_a: 'G2',
  tag_b: 'FNC',
  jeu: 'lol',
  evenement: 'LEC',
  debut: '2099-08-28T12:00:00.000Z',
};

describe('DuelsScreen missions integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadDuelRows.mockResolvedValue([DUEL_FIXTURE]);
    useMissions.mockReturnValue({
      data: FRIEND_MISSIONS_FIXTURE,
      error: null,
      loading: false,
      refreshing: false,
      reload: mockReloadMissions,
    });
  });

  it('keeps the duel journey intact and opens missions in context', async () => {
    const screen = await render(
      <DuelsScreen previewData={{ duels: [DUEL_FIXTURE], missions: FRIEND_MISSIONS_FIXTURE }} />,
    );

    expect(screen.getByText('TES RIVALITÉS')).toBeTruthy();
    expect(screen.getByText('Tu as reçu un code ?')).toBeTruthy();
    expect(screen.getByText('DOUBLE CALL')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('duel-missions-entry'));
    });

    await waitFor(() => expect(screen.getByTestId('missions-sheet')).toBeTruthy());
    expect(screen.getByText('SÉRIES DE DUO')).toBeTruthy();
    expect(screen.getByText('DERNIÈRES MISSIONS')).toBeTruthy();
    expect(playSelectionFeedback).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Fermer Missions de duo' }));
    });
    await waitFor(() => expect(screen.queryByTestId('missions-sheet')).toBeNull());
    expect(screen.getByText('Tu as reçu un code ?')).toBeTruthy();
  }, 10_000);

  it('keeps the duel invitation entry working after the mission fusion', async () => {
    const push = jest.requireMock('expo-router').router.push as jest.Mock;
    const screen = await render(
      <DuelsScreen previewData={{ duels: [DUEL_FIXTURE], missions: FRIEND_MISSIONS_FIXTURE }} />,
    );

    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText('Code ou lien d’invitation au duel'),
        'a4d5e6f789ab1234',
      );
    });
    const invitationButton = screen.getByRole('button', { name: 'OUVRIR L’INVITATION' });
    expect(invitationButton.props.disabled).not.toBe(true);
    await act(async () => {
      fireEvent.press(invitationButton);
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/duel/[token]',
      params: { token: 'a4d5e6f789ab1234' },
    });
  }, 10_000);
});
