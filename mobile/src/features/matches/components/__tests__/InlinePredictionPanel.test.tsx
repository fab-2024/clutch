/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createDuel } from '@/src/features/social/duels/api';
import { submitRankedPrediction } from '../../api';
import type { ArenaMatch, MatchCenterData } from '../../types';
import { InlinePredictionPanel } from '../InlinePredictionPanel';

const mockLoad = jest.fn(async () => undefined);
const mockRefreshEconomy = jest.fn(async () => undefined);

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native/icons/check', () => ({ __esModule: true, default: 'Check' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: 'CurrencyIcon' }));
jest.mock('@/src/components/ui/Skeleton', () => ({ Skeleton: 'Skeleton', SkeletonGroup: 'SkeletonGroup' }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: 'TeamLogo' }));
jest.mock('@/src/features/social/duels/api', () => ({ createDuel: jest.fn() }));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn(async () => undefined) }));
jest.mock('@/src/lib/feedback', () => ({
  errorFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: mockRefreshEconomy }),
}));
jest.mock('../../api', () => ({ submitRankedPrediction: jest.fn() }));
jest.mock('../../hooks/useMatchCenterData', () => ({
  useMatchCenterData: () => ({
    data: mockMatchCenterData,
    error: null,
    load: mockLoad,
    loading: false,
  }),
}));
jest.mock('../PredictionConfirmationSheet', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    PredictionConfirmationSheet: ({ onConfirm, visible }: { onConfirm: () => void; visible: boolean }) => visible
      ? React.createElement(
        ReactNative.View,
        { testID: 'inline-confirmation-sheet' },
        React.createElement(ReactNative.Pressable, { onPress: onConfirm, testID: 'inline-confirm-choice' }),
      )
      : null,
  };
});

const MATCH: ArenaMatch = {
  id: 'match-alpha-beta',
  saison_id: 'season-1',
  debut: '2099-09-05T16:00:00.000Z',
  jeu: 'lol',
  equipe_a: 'Alpha Team',
  tag_a: 'ALP',
  logo_a: null,
  equipe_b: 'Beta Esports',
  tag_b: 'BET',
  logo_b: null,
  evenement: 'Hitpoint Masters',
  format: 3,
  statut: 'a_venir',
  score_a: null,
  score_b: null,
  prediction: null,
};

const mockMatchCenterData: MatchCenterData = {
  match: MATCH,
  projection: {
    match_id: MATCH.id,
    choix: [
      { cle: 'a', proba: .62, gain: 18, perte: 14 },
      { cle: 'b', proba: .38, gain: 29, perte: 9 },
    ],
    k: 60,
    source: 'clutch_model',
    figee_le: '2099-09-05T10:00:00.000Z',
  },
  prediction: null,
  callContext: {
    match_id: MATCH.id,
    participants: 0,
    ferme_le: MATCH.debut,
    verrouille_le: null,
    distribution: null,
    regle_resolution: {
      cle: 'vainqueur_match',
      libelle: 'Vainqueur de la série',
      detail: 'Le call est réussi si l’équipe choisie gagne la série.',
    },
    prediction: null,
    source_resultat: null,
    source_resultat_label: null,
    identifiant_resultat_externe: null,
    revision_resultat: 0,
    resultat_corrige: false,
  },
  related: [],
};

const submitPrediction = submitRankedPrediction as jest.MockedFunction<typeof submitRankedPrediction>;
const createTargetedDuel = createDuel as jest.MockedFunction<typeof createDuel>;

describe('InlinePredictionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitPrediction.mockResolvedValue(null);
    createTargetedDuel.mockResolvedValue({ token: 'duel-1' } as Awaited<ReturnType<typeof createDuel>>);
  });

  it('selects, reviews and locks a call without leaving the matches tab', async () => {
    const onPredictionLocked = jest.fn(async () => undefined);
    const screen = await render(
      <InlinePredictionPanel
        match={MATCH}
        onClose={jest.fn()}
        onPredictionLocked={onPredictionLocked}
        userId="user-1"
      />,
    );

    expect(screen.getByText('QUI GAGNE CE BO3 ?')).toBeTruthy();
    expect(screen.getByTestId('inline-prediction-review').props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /Choisir Alpha Team/ }));
    });

    await waitFor(() => {
      expect(screen.getByText('TON CALL · ALP')).toBeTruthy();
      expect(screen.getByText('+18')).toBeTruthy();
      expect(screen.getByText('−14')).toBeTruthy();
      expect(screen.getByTestId('inline-prediction-review').props.accessibilityState.disabled).toBe(false);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('inline-prediction-review'));
    });
    await waitFor(() => expect(screen.getByTestId('inline-confirmation-sheet')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('inline-confirm-choice'));
    });

    await waitFor(() => {
      expect(submitPrediction).toHaveBeenCalledWith(MATCH.id, 'a');
      expect(onPredictionLocked).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('inline-prediction-locked')).toBeTruthy();
    });
    expect(mockLoad).toHaveBeenCalledWith(true);
    expect(mockRefreshEconomy).toHaveBeenCalledTimes(1);
  });

  it('keeps the targeted-duel continuation available after an inline lock', async () => {
    const lockedMatch: ArenaMatch = {
      ...MATCH,
      prediction: { match_id: MATCH.id, choix: 'a', statut: 'en_attente', delta_frags: null },
    };
    const screen = await render(
      <InlinePredictionPanel
        match={lockedMatch}
        onClose={jest.fn()}
        rivalId="rival-1"
        rivalPseudo="Nova"
        userId="user-1"
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'DÉFIER NOVA' }));
    });

    await waitFor(() => {
      expect(createTargetedDuel).toHaveBeenCalledWith(MATCH.id, 'rival-1');
      expect(router.push).toHaveBeenCalledWith({ pathname: '/duel/[token]', params: { token: 'duel-1' } });
    });
  });
});
