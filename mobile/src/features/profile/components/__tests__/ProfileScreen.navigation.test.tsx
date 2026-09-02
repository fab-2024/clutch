/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import ProfileScreen from '../ProfileScreen';

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
jest.mock('lucide-react-native/icons/expand', () => ({ __esModule: true, default: 'Expand' }));
jest.mock('lucide-react-native/icons/eye', () => ({ __esModule: true, default: 'Eye' }));
jest.mock('lucide-react-native/icons/headphones', () => ({ __esModule: true, default: 'Headphones' }));
jest.mock('lucide-react-native/icons/settings-2', () => ({ __esModule: true, default: 'Settings2' }));
jest.mock('lucide-react-native/icons/share-2', () => ({ __esModule: true, default: 'Share2' }));
jest.mock('lucide-react-native/icons/shield-check', () => ({ __esModule: true, default: 'ShieldCheck' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));
jest.mock('lucide-react-native/icons/swords', () => ({ __esModule: true, default: 'Swords' }));
jest.mock('lucide-react-native/icons/user-round-plus', () => ({ __esModule: true, default: 'UserRoundPlus' }));
jest.mock('lucide-react-native/icons/users-round', () => ({ __esModule: true, default: 'UsersRound' }));
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn(async () => undefined) }));
jest.mock('@/src/features/safety', () => ({ ProfileSafetyActions: () => null }));
jest.mock('@/src/features/safety/api', () => ({ loadProfileSafetyState: jest.fn() }));
jest.mock('../../api', () => ({ loadProfileData: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({
    profile: { pseudo: 'TesteurGRIFF' },
    session: { user: { email: 'testeur@example.invalid' } },
  }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({
    equipped: { frame: null, title: null, core: null, factionEffect: null, profileCard: null, showcase: { material: null, lighting: null, supports: null, rankDisplay: null, jersey: null } },
  }),
}));
jest.mock('@/src/providers/EconomyProvider', () => {
  const refresh = jest.fn(async () => undefined);
  return { useEconomy: () => ({ frags: 1510, volts: 300, refresh }) };
});

const push = router.push as jest.Mock;

describe('ProfileScreen private navigation', () => {
  beforeEach(() => {
    push.mockClear();
    (router.back as jest.Mock).mockClear();
  });

  it('opens the preview Vitrine route from profile-preview', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase-preview');
  }, 15_000); // The first cold render compiles the complete showroom scene.

  it('shows the equipped rank display on the public profile card', async () => {
    const screen = await render(
      <ProfileScreen previewData={PREVIEW_PROFILE} profilePseudo="FabTheTap" publicView />,
    );

    expect(screen.getByTestId('profile-rank-display-rank_carbon_cradle')).toBeTruthy();
  });

  it('opens the production Vitrine route from Moi', async () => {
    const screen = await render(<ProfileScreen />);

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase');
  });

  it('opens the friends surface from the primary profile action', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByLabelText('Ajouter un ami'));

    expect(push).toHaveBeenCalledWith('/(tabs)/social/friends');
  });

  it('keeps the new profile sections connected to their existing destinations', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByTestId('profile-section-progression'));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes badges et anneaux/));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes trophées/));
    await fireEvent.press(screen.getByLabelText(/Ouvrir mes maillots/));

    expect(push).toHaveBeenNthCalledWith(1, '/(tabs)/rank');
    expect(push).toHaveBeenNthCalledWith(2, { pathname: '/shop-preview', params: { scope: 'owned', tab: 'badges-rings' } });
    expect(push).toHaveBeenNthCalledWith(3, { pathname: '/shop-preview', params: { scope: 'owned', tab: 'trophies' } });
    expect(push).toHaveBeenNthCalledWith(4, { pathname: '/shop-preview', params: { scope: 'owned', tab: 'jerseys' } });
  });

  it('returns to the previous tab from the standalone profile', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByLabelText('Revenir à l’onglet précédent'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens profile settings from the private visibility action', async () => {
    const screen = await render(
      <ProfileScreen previewData={{ ...PREVIEW_PROFILE, publicProfile: false }} />,
    );
    const visibilityAction = screen.getByLabelText('Modifier la visibilité de mon profil');

    expect(visibilityAction.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(visibilityAction);
    expect(push).toHaveBeenCalledWith('/settings/profile');
  });
});
