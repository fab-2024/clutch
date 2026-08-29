/// <reference types="jest" />

import { render, type RenderResult } from '@testing-library/react-native';

import type { MatchResultReveal } from '../../types';
import ResultRevealScreen from '../ResultRevealScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    id: 'match-1',
    journeyEvent: 'LEC Summer',
    journeyFormat: '5',
    journeyFrom: 'match',
    journeyGame: 'lol',
    journeyScoreA: '2',
    journeyScoreB: '1',
    journeyTagA: 'G2',
    journeyTagB: 'FNC',
    journeyTeamA: 'G2 Esports',
    journeyTeamB: 'Fnatic',
  }),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const transition = { delay: () => transition, duration: () => transition };
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: (value: number) => value, linear: (value: number) => value, out: () => (value: number) => value },
    Extrapolation: { CLAMP: 'clamp' },
    FadeIn: transition,
    FadeInDown: transition,
    interpolate: (_value: number, _input: number[], output: number[]) => output.at(-1) ?? 0,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withDelay: (_delay: number, value: number) => value,
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View };
});
jest.mock('@/src/components/brand/GriffLogo', () => ({ GriffEmblem: () => null, GriffLockup: () => null }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: () => null }));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/features/ranking/components/RankEmblem', () => ({ RankEmblem: () => null }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/src/features/shop/components/CosmeticRenderer', () => ({ SupporterIdentity: () => null }));
jest.mock('@/src/lib/feedback', () => ({ errorFeedback: jest.fn(), impactFeedback: jest.fn(), successFeedback: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ profile: null, session: null }) }));
jest.mock('@/src/providers/CosmeticsProvider', () => ({ useCosmetics: () => ({ equipped: {} }) }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: jest.fn() }) }));
jest.mock('../../api', () => ({
  loadMatchResultReveal: jest.fn(() => new Promise(() => undefined)),
  loadNextUnseenMatchResult: jest.fn(),
  markMatchResultRevealed: jest.fn(),
}));

describe('ResultRevealScreen journey continuity', () => {
  it('keeps the fixture and score visible while the official verdict loads', async () => {
    const screen = await render(<ResultRevealScreen />);

    expect(screen.getByTestId('result-transition-loading').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByLabelText('Chargement du verdict, G2 Esports contre Fnatic')).toBeTruthy();
    expect(screen.getByText('DEPUIS MATCH CENTER')).toBeTruthy();
    expect(screen.getByText('G2')).toBeTruthy();
    expect(screen.getByText('FNC')).toBeTruthy();
    expect(screen.getByText('2 — 1')).toBeTruthy();
  });

  it('reserves the ascension ceremony for a new promotion', async () => {
    const screen = await render(
      <ResultRevealScreen
        previewCeremonyProgress={.82}
        previewData={promotionResult()}
        previewReduceMotion={false}
      />,
    ) as RenderResult;

    expect(screen.getByTestId('promotion-ceremony', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('promotion-ascension-card')).toBeTruthy();
    expect(screen.getByText('VOLTS · Réserve Platine')).toBeTruthy();
  });

  it('shows the final promotion state without replaying its ceremony from history', async () => {
    const screen = await render(
      <ResultRevealScreen
        previewData={{ ...promotionResult(), revele_le: '2026-08-29T10:00:00.000Z' }}
        previewReduceMotion={false}
      />,
    ) as RenderResult;

    expect(screen.queryByTestId('promotion-ceremony')).toBeNull();
    expect(screen.getByTestId('promotion-ascension-card')).toBeTruthy();
    expect(screen.getByLabelText(/Promotion de Or vers Platine/)).toBeTruthy();
  });

  it('keeps a stable grade on the ordinary result treatment', async () => {
    const result = promotionResult();
    const screen = await render(
      <ResultRevealScreen
        previewData={{ ...result, grade_apres: result.grade_avant }}
        previewReduceMotion={false}
      />,
    ) as RenderResult;

    expect(screen.queryByTestId('promotion-ceremony')).toBeNull();
    expect(screen.queryByTestId('promotion-ascension-card')).toBeNull();
    expect(screen.getByText('GRADE MAINTENU')).toBeTruthy();
  });
});

function promotionResult(): MatchResultReveal {
  return {
    id: 'result-promotion',
    match_id: 'match-promotion',
    saison_id: 'season-1',
    statut: 'gagne',
    choix: 'a',
    proba_figee: .55,
    delta_frags: 18,
    frags_avant: 1243,
    frags_apres: 1261,
    rang_avant: 427,
    rang_apres: 381,
    verdicts_avant: 8,
    verdicts_apres: 9,
    grade_avant: {
      classe: true,
      objectif_placements: 0,
      placements_restants: 0,
      progression: .965,
      cle: 'or',
      libelle: 'Or',
      ordre: 2,
      minimum: 1050,
      plafond: 1250,
    },
    grade_apres: {
      classe: true,
      objectif_placements: 0,
      placements_restants: 0,
      progression: .055,
      cle: 'platine',
      libelle: 'Platine',
      ordre: 3,
      minimum: 1250,
      plafond: 1450,
    },
    regle_le: '2026-08-29T09:00:00.000Z',
    revele_le: null,
    equipe_a: 'Karmine Corp',
    equipe_b: 'Fnatic',
    tag_a: 'KC',
    tag_b: 'FNC',
    score_a: 2,
    score_b: 1,
    jeu: 'lol',
    evenement: 'LEC Summer',
    format: 3,
    debut: '2026-08-29T07:00:00.000Z',
    source_resultat: 'validation_clutch',
    source_resultat_label: 'Validation GRIFF',
    identifiant_resultat_externe: 'clutch:match-promotion:2-1',
    revision_resultat: 1,
    resultat_corrige: false,
    regle_resolution: {
      cle: 'vainqueur_match',
      libelle: 'Vainqueur de la série',
      detail: 'Le call est réussi si l’équipe choisie remporte la série.',
    },
    restants: 1,
  };
}
