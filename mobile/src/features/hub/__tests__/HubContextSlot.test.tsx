/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { HubContextItem } from '../hubContext';
import { HubContextSkeleton, HubContextSlot } from '../components/HubContextSlot';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));
jest.mock('lucide-react-native/icons/target', () => ({ __esModule: true, default: 'Target' }));
jest.mock('lucide-react-native/icons/trophy', () => ({ __esModule: true, default: 'Trophy' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { inOut: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

const NOW = Date.parse('2026-08-28T12:00:00.000Z');

const RESULT_CONTEXT: HubContextItem = {
  kind: 'result',
  result: {
    id: 'prediction-1',
    matchId: 'match-1',
    status: 'gagne',
    choice: 'a',
    deltaFrags: 34,
    resolvedAt: '2026-08-28T11:15:00.000Z',
    game: 'lol',
    event: 'LEC',
    teamA: 'G2 Esports',
    tagA: 'G2',
    teamB: 'Fnatic',
    tagB: 'FNC',
    scoreA: 2,
    scoreB: 1,
  },
};

const MISSION_CONTEXT: HubContextItem = {
  kind: 'mission',
  mission: {
    id: 'mission-1',
    title: 'Verrouiller 12 calls en faction',
    goal: 12,
    progress: 8,
    personalContribution: 3,
    startsAt: '2026-08-27T12:00:00.000Z',
    endsAt: '2026-08-28T18:00:00.000Z',
    completed: false,
    participants: 6,
    team: { id: 'kc', name: 'Karmine Corp', tag: 'KC', logo: null },
  },
};

const REWARD_CONTEXT: HubContextItem = {
  kind: 'reward',
  reward: {
    id: 'reward-1',
    name: 'Trace électrique',
    family: 'cadre',
    slot: 'cadre_profil',
    rarity: 'rare',
    styleKey: 'electric-trace',
    accent: '#E8FF3D',
    source: 'mission',
    acquiredAt: '2026-08-28T10:00:00.000Z',
  },
};

describe('HubContextSlot', () => {
  beforeEach(() => jest.clearAllMocks());

  it('summarizes and opens a recent verdict', async () => {
    const screen = await render(<HubContextSlot context={RESULT_CONTEXT} now={NOW} />);
    const slot = screen.getByTestId('hub-context-result');

    expect(slot.props.accessibilityLabel).toContain('Verdict gagné');
    expect(screen.getByText('+34')).toBeTruthy();
    fireEvent.press(slot);

    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith({
      pathname: '/result/[id]',
      params: { id: 'match-1' },
    });
  });

  it('exposes mission progress and opens the missions surface in Défis', async () => {
    const screen = await render(<HubContextSlot context={MISSION_CONTEXT} now={NOW} />);
    const slot = screen.getByTestId('hub-context-mission');

    expect(slot.props.accessibilityLabel).toContain('Progression 8 sur 12');
    expect(screen.getByText('8/12')).toBeTruthy();
    fireEvent.press(slot);

    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/(tabs)/social/missions');
  });

  it('opens the owned collection for a new reward', async () => {
    const screen = await render(<HubContextSlot context={REWARD_CONTEXT} now={NOW} />);
    const slot = screen.getByTestId('hub-context-reward');

    expect(slot.props.accessibilityLabel).toContain('Nouvelle récompense Trace électrique');
    fireEvent.press(slot);

    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith({
      pathname: '/shop',
      params: { scope: 'owned' },
    });
  });

  it('announces the contextual skeleton as busy', async () => {
    const screen = await render(<HubContextSkeleton />);

    expect(screen.getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByLabelText('Chargement du contexte du Hub')).toBeTruthy();
  });
});
