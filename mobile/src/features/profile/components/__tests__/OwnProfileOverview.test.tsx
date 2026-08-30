/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { EMPTY_EQUIPPED_COSMETICS, type EquippedCosmetics } from '@/src/features/shop/types';

import type { ProfileData } from '../../types';
import OwnProfileOverview from '../OwnProfileOverview';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: identity, inOut: () => identity, out: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/crosshair', () => ({ __esModule: true, default: 'Crosshair' }));
jest.mock('lucide-react-native/icons/headphones', () => ({ __esModule: true, default: 'Headphones' }));
jest.mock('lucide-react-native/icons/share-2', () => ({ __esModule: true, default: 'Share2' }));
jest.mock('lucide-react-native/icons/shield-check', () => ({ __esModule: true, default: 'ShieldCheck' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));
jest.mock('lucide-react-native/icons/swords', () => ({ __esModule: true, default: 'Swords' }));
jest.mock('lucide-react-native/icons/user-round-plus', () => ({ __esModule: true, default: 'UserRoundPlus' }));
jest.mock('lucide-react-native/icons/users-round', () => ({ __esModule: true, default: 'UsersRound' }));

const PROFILE: ProfileData = {
  pseudo: 'TesteurGRIFF',
  createdAt: '2026-08-24T12:00:00.000Z',
  profileTitle: 'Stratège du virage',
  founder: false,
  publicProfile: true,
  ranking: {
    saison_id: 'season-test',
    saison_nom: 'Saison Test',
    frags: 1510,
    rang: 42,
    pronostics_regles: 12,
    pronostics_gagnes: 8,
    pic_frags: 1530,
    placements_restants: 0,
    provisoire: false,
    grade: {
      classe: true,
      objectif_placements: 0,
      placements_restants: 0,
      progression: 0.55,
      cle: 'platine',
      libelle: 'Platine',
      ordre: 3,
      minimum: 1250,
      plafond: 1450,
      prochaine_cle: 'diamant',
      prochain_libelle: 'Diamant',
      prochain_minimum: 1450,
      prochain_objectif_pronostics: 20,
      prochains_pronostics_restants: 8,
    },
    percentile: 72,
    joueurs_classes: 900,
    meilleur_grade: null,
    meilleur_rang: 42,
  },
  recap: {},
  currentStreak: 2,
  favoriteTeam: null,
  bestGame: null,
  recent: [],
  badges: [],
  pinnedBadges: [],
  arsenalBadges: [],
  level: {
    xp: 432,
    level: 7,
    title: 'Progression Test',
    prestige: 'explorateur',
    prestigeLabel: 'Explorateur',
    progress: 0.43,
    remaining: 568,
  },
  cosmetics: EMPTY_EQUIPPED_COSMETICS,
};

async function renderHub({
  cosmetics = EMPTY_EQUIPPED_COSMETICS,
  data = PROFILE,
  loading = false,
  onAddFriend = jest.fn(),
  onModify = jest.fn(),
  onOpenBadges = jest.fn(),
  onOpenJerseys = jest.fn(),
  onOpenRank = jest.fn(),
  onOpenRings = jest.fn(),
  onOpenShowcase = jest.fn(),
  onOpenTrophies = jest.fn(),
  onOpenVisitor = jest.fn(),
}: {
  cosmetics?: EquippedCosmetics;
  data?: ProfileData | null;
  loading?: boolean;
  onAddFriend?: jest.Mock;
  onModify?: jest.Mock;
  onOpenBadges?: jest.Mock;
  onOpenJerseys?: jest.Mock;
  onOpenRank?: jest.Mock;
  onOpenRings?: jest.Mock;
  onOpenShowcase?: jest.Mock;
  onOpenTrophies?: jest.Mock;
  onOpenVisitor?: jest.Mock;
} = {}) {
  return await render(
    <OwnProfileOverview
      cosmetics={cosmetics}
      data={data}
      loading={loading}
      levelFrameVariant="signalAscendant"
      onAddFriend={onAddFriend}
      onModify={onModify}
      onOpenBadges={onOpenBadges}
      onOpenJerseys={onOpenJerseys}
      onOpenRank={onOpenRank}
      onOpenRings={onOpenRings}
      onOpenShowcase={onOpenShowcase}
      onOpenTrophies={onOpenTrophies}
      onOpenVisitor={onOpenVisitor}
      pseudo={data?.pseudo ?? 'TesteurGRIFF'}
      rankAccent="#31D7E2"
      rankLabel={loading ? '—' : 'PLATINE'}
    />,
  );
}

describe('OwnProfileOverview', () => {
  it('does not expose an email address in Moi', async () => {
    const screen = await renderHub();

    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.getByText('TesteurGRIFF')).toBeTruthy();
  });

  it('renders level and rank from profile data', async () => {
    const screen = await renderHub();

    expect(screen.getByLabelText(/Rang PLATINE.*niveau 7.*568 XP/)).toBeTruthy();
    expect(screen.getByTestId('profile-identity-card')).toBeTruthy();
    expect(screen.getByTestId('profile-stats-card')).toBeTruthy();
  });

  it('keeps Ranked and every collection destination wired', async () => {
    const onOpenBadges = jest.fn();
    const onOpenJerseys = jest.fn();
    const onOpenRank = jest.fn();
    const onOpenRings = jest.fn();
    const onOpenTrophies = jest.fn();
    const screen = await renderHub({
      onOpenBadges,
      onOpenJerseys,
      onOpenRank,
      onOpenRings,
      onOpenTrophies,
    });

    await fireEvent.press(screen.getByTestId('profile-section-progression'));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes badges/));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes anneaux/));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes trophées/));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes maillots/));

    expect(onOpenRank).toHaveBeenCalledTimes(1);
    expect(onOpenBadges).toHaveBeenCalledTimes(1);
    expect(onOpenRings).toHaveBeenCalledTimes(1);
    expect(onOpenTrophies).toHaveBeenCalledTimes(1);
    expect(onOpenJerseys).toHaveBeenCalledTimes(1);
  });

  it('uses the Vitrine callback for the landscape CTA', async () => {
    const onOpenShowcase = jest.fn();
    const screen = await renderHub({ onOpenShowcase });

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(onOpenShowcase).toHaveBeenCalledTimes(1);
  });

  it('uses the compact identity, ranked, stats and collection composition', async () => {
    const screen = await renderHub();

    expect(screen.getByTestId('profile-identity-card')).toBeTruthy();
    expect(screen.getByTestId('profile-section-progression')).toBeTruthy();
    expect(screen.getByTestId('profile-stats-card')).toBeTruthy();
    expect(screen.getByTestId('profile-section-collection')).toBeTruthy();
    expect(screen.queryByTestId('profile-vitrine-stage')).toBeNull();
  });

  it('opens the friend surface from the primary identity action', async () => {
    const onAddFriend = jest.fn();
    const screen = await renderHub({ onAddFriend });

    await fireEvent.press(screen.getByLabelText('Ajouter un ami'));

    expect(onAddFriend).toHaveBeenCalledTimes(1);
  });

  it('opens visibility settings from a private profile', async () => {
    const onModify = jest.fn();
    const onOpenVisitor = jest.fn();
    const screen = await renderHub({
      data: { ...PROFILE, publicProfile: false },
      onModify,
      onOpenVisitor,
    });
    const button = screen.getByLabelText('Modifier la visibilité de mon profil');

    expect(button.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(button);
    expect(onModify).toHaveBeenCalledTimes(1);
    expect(onOpenVisitor).not.toHaveBeenCalled();
  });

  it('surfaces the four requested profile collections without the old spaces block', async () => {
    const screen = await renderHub();

    expect(screen.getByText('BADGES')).toBeTruthy();
    expect(screen.getByText('ANNEAUX')).toBeTruthy();
    expect(screen.getByText('TROPHÉES')).toBeTruthy();
    expect(screen.getByText('MAILLOTS')).toBeTruthy();
    expect(screen.getByText('0 DÉBLOQUÉS')).toBeTruthy();
    expect(screen.getByText('2 / 5')).toBeTruthy();
    expect(screen.getByText('0 / 4')).toBeTruthy();
    expect(screen.getByText('AUCUN ÉQUIPÉ')).toBeTruthy();
    expect(screen.queryByText('TES ESPACES')).toBeNull();
    expect(screen.queryByTestId('profile-section-social')).toBeNull();
  });

  it('uses a structured busy state without demonstration values while loading', async () => {
    const screen = await renderHub({ data: null, loading: true });

    expect(screen.queryByText(/NIVEAU 42/)).toBeNull();
    expect(screen.queryByText('DIAMANT')).toBeNull();
    expect(screen.queryByText('5 BADGES')).toBeNull();
    expect(screen.queryByText('4 TROPHÉES')).toBeNull();
    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Chargement du profil');
    expect(screen.getByTestId('profile-overview-loading')).toBeTruthy();
  });
});
