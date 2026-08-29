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
jest.mock('lucide-react-native/icons/expand', () => ({ __esModule: true, default: 'Expand' }));
jest.mock('lucide-react-native/icons/eye', () => ({ __esModule: true, default: 'Eye' }));
jest.mock('lucide-react-native/icons/layers-2', () => ({ __esModule: true, default: 'Layers2' }));
jest.mock('lucide-react-native/icons/shopping-bag', () => ({ __esModule: true, default: 'ShoppingBag' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));
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
  onModify = jest.fn(),
  onOpenActivations = jest.fn(),
  onOpenFaction = jest.fn(),
  onOpenLocker = jest.fn(),
  onOpenRank = jest.fn(),
  onOpenShop = jest.fn(),
  onOpenShowcase = jest.fn(),
  onOpenVisitor = jest.fn(),
}: {
  cosmetics?: EquippedCosmetics;
  data?: ProfileData | null;
  loading?: boolean;
  onModify?: jest.Mock;
  onOpenActivations?: jest.Mock;
  onOpenFaction?: jest.Mock;
  onOpenLocker?: jest.Mock;
  onOpenRank?: jest.Mock;
  onOpenShop?: jest.Mock;
  onOpenShowcase?: jest.Mock;
  onOpenVisitor?: jest.Mock;
} = {}) {
  return await render(
    <OwnProfileOverview
      cosmetics={cosmetics}
      data={data}
      loading={loading}
      levelFrameVariant="signalAscendant"
      onModify={onModify}
      onOpenActivations={onOpenActivations}
      onOpenFaction={onOpenFaction}
      onOpenLocker={onOpenLocker}
      onOpenRank={onOpenRank}
      onOpenShop={onOpenShop}
      onOpenShowcase={onOpenShowcase}
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
    expect(screen.getByLabelText(/Aperçu Vitrine.*rang PLATINE/)).toBeTruthy();
  });

  it('keeps the progression, collection and social actions wired', async () => {
    const onOpenActivations = jest.fn();
    const onOpenLocker = jest.fn();
    const onOpenRank = jest.fn();
    const onOpenShop = jest.fn();
    const screen = await renderHub({
      onOpenActivations,
      onOpenLocker,
      onOpenRank,
      onOpenShop,
    });

    await fireEvent.press(screen.getByTestId('profile-section-progression'));
    await fireEvent.press(screen.getByLabelText('Ouvrir mes objets dans le Locker'));
    await fireEvent.press(screen.getByLabelText('Ouvrir le catalogue de la Boutique'));
    await fireEvent.press(screen.getByLabelText('Ouvrir les activations'));

    expect(onOpenRank).toHaveBeenCalledTimes(1);
    expect(onOpenLocker).toHaveBeenCalledTimes(1);
    expect(onOpenShop).toHaveBeenCalledTimes(1);
    expect(onOpenActivations).toHaveBeenCalledTimes(1);
  });

  it('uses profile settings when no faction is selected', async () => {
    const onModify = jest.fn();
    const screen = await renderHub({ onModify });

    await fireEvent.press(screen.getByLabelText('Choisir mon équipe favorite et rejoindre une faction'));

    expect(onModify).toHaveBeenCalledTimes(1);
  });

  it('uses the Vitrine callback for the landscape CTA', async () => {
    const onOpenShowcase = jest.fn();
    const screen = await renderHub({ onOpenShowcase });

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(onOpenShowcase).toHaveBeenCalledTimes(1);
  });

  it('teases the Vitrine with exactly three fixed artifacts instead of the full room', async () => {
    const screen = await renderHub();

    expect(screen.getByTestId('profile-vitrine-stage')).toBeTruthy();
    expect(screen.getAllByTestId(/^profile-vitrine-artifact-/, { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.getByTestId('profile-vitrine-artifact-badge', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('profile-vitrine-artifact-rank', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('profile-vitrine-artifact-team', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('showcase-room-preview')).toBeNull();
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

  it('renders the level frame separately from four neutral signature slots', async () => {
    const screen = await renderHub();

    expect(screen.getByLabelText('Cadre de niveau, Signal Ascendant')).toBeTruthy();
    expect(screen.getByLabelText('Cadre d’avatar, emplacement vide')).toBeTruthy();
    expect(screen.getByLabelText('Titre, emplacement vide')).toBeTruthy();
    expect(screen.getByLabelText('Bannière de profil, emplacement vide')).toBeTruthy();
    expect(screen.getByLabelText('Relique, emplacement vide')).toBeTruthy();
    expect(screen.queryByText('CADRE')).toBeNull();
    expect(screen.queryByText('TITRE')).toBeNull();
    expect(screen.queryByText('BANNIÈRE')).toBeNull();
    expect(screen.queryByText('RELIQUE')).toBeNull();
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
