/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { acceptDuel, cancelDuel, loadDuelInvitation, loadDuelResult } from '../../api';
import type { DuelInvitation, DuelMutation } from '../../types';
import DuelInvitationScreen from '../DuelInvitationScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ token: 'a4d5e6f789ab1234' }),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
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
jest.mock('@/src/components/brand/GriffLogo', () => ({ GriffLockup: () => null }));
jest.mock('@/src/config/release', () => ({
  publicAppUrl: (path: string) => `https://clutch.test${path}`,
}));
jest.mock('../../api', () => ({
  acceptDuel: jest.fn(),
  cancelDuel: jest.fn(),
  loadDuelInvitation: jest.fn(),
  loadDuelResult: jest.fn(),
}));

const loadInvitation = jest.mocked(loadDuelInvitation);
const loadResult = jest.mocked(loadDuelResult);
const acceptInvitation = jest.mocked(acceptDuel);
const cancelInvitation = jest.mocked(cancelDuel);

const INVITATION: DuelInvitation = {
  token: 'a4d5e6f789ab1234',
  statut: 'en_attente',
  match_id: 'match-1',
  jeu: 'lol',
  evenement: 'LEC',
  format: 5,
  debut: '2099-08-28T12:00:00.000Z',
  score_a: null,
  score_b: null,
  equipe_a: 'G2 Esports',
  equipe_b: 'Fnatic',
  tag_a: 'G2',
  tag_b: 'FNC',
  createur_pseudo: 'Nova',
  createur_choix: 'a',
  createur_conviction: null,
  createur_multiplicateur: null,
  marche: 'match_winner',
  marche_libelle: 'Vainqueur de la série',
  marche_classe: true,
  ciblee: false,
  cible_pseudo: null,
  choix_oppose: 'b',
  equipe_opposee: 'Fnatic',
  tag_oppose: 'FNC',
  accepteur_pseudo: null,
  accepteur_choix: null,
  accepteur_conviction: null,
  moi_role: 'visiteur',
  mon_prono: {
    id: 'prediction-1',
    choix: 'b',
    conviction: null,
    statut: 'en_cours',
  },
};

describe('DuelInvitationScreen accessibility states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadInvitation.mockResolvedValue(INVITATION);
    loadResult.mockResolvedValue(null);
    cancelInvitation.mockResolvedValue({ token: INVITATION.token, statut: 'annule' });
  });

  it('opens the real challenger showcase without inventing a profile for a free slot', async () => {
    const screen = await render(<DuelInvitationScreen />);
    await fireEvent.press(screen.getByRole('link', { name: 'Voir la vitrine de Nova' }));
    expect(router.push).toHaveBeenCalledWith('/v/Nova');
    expect(screen.queryByRole('link', { name: 'Voir la vitrine de PLACE LIBRE' })).toBeNull();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('announces a deep-link loading failure and retries without losing the route', async () => {
    loadInvitation
      .mockRejectedValueOnce(new Error('Invitation introuvable'))
      .mockResolvedValueOnce(INVITATION);
    const screen = await render(<DuelInvitationScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invitation introuvable'));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }));
    });

    await waitFor(() => {
      expect(loadInvitation).toHaveBeenCalledTimes(2);
      expect(screen.getByText('CAMP OPPOSÉ VALIDÉ')).toBeTruthy();
    });
  });

  it('announces the accepting action as busy and disabled until it resolves', async () => {
    let resolveAccept!: (value: DuelMutation) => void;
    const pending = new Promise<DuelMutation>((resolve) => {
      resolveAccept = resolve;
    });
    acceptInvitation.mockReturnValueOnce(pending);
    const screen = await render(<DuelInvitationScreen />);
    const accept = await screen.findByRole('button', { name: 'ACCEPTER LE DUEL' });

    await act(async () => {
      fireEvent.press(accept);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'VERROUILLAGE…' }).props.accessibilityState).toEqual({
        busy: true,
        disabled: true,
      });
    });

    await act(async () => {
      resolveAccept({ token: INVITATION.token, statut: 'accepte' });
      await pending;
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(loadInvitation).toHaveBeenCalledTimes(2));
  });
});
