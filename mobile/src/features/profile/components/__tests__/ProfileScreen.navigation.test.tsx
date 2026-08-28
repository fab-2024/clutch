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
jest.mock('lucide-react-native/icons/expand', () => ({ __esModule: true, default: 'Expand' }));
jest.mock('lucide-react-native/icons/eye', () => ({ __esModule: true, default: 'Eye' }));
jest.mock('lucide-react-native/icons/layers-2', () => ({ __esModule: true, default: 'Layers2' }));
jest.mock('lucide-react-native/icons/shopping-bag', () => ({ __esModule: true, default: 'ShoppingBag' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));
jest.mock('lucide-react-native/icons/users-round', () => ({ __esModule: true, default: 'UsersRound' }));
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
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
    equipped: { frame: null, title: null, core: null, factionEffect: null, profileCard: null, showcase: { material: null, lighting: null, supports: null, jersey: null } },
  }),
}));
jest.mock('@/src/providers/EconomyProvider', () => {
  const refresh = jest.fn(async () => undefined);
  return { useEconomy: () => ({ frags: 1510, volts: 300, refresh }) };
});

const push = router.push as jest.Mock;

describe('ProfileScreen private navigation', () => {
  beforeEach(() => push.mockClear());

  it('opens the preview Vitrine route from profile-preview', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase-preview');
  }, 15_000); // The first cold render compiles the complete showroom scene.

  it('opens the production Vitrine route from Moi', async () => {
    const screen = await render(<ProfileScreen />);

    await fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase');
  });

  it('opens the preview Shop directly on the catalogue scope', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByLabelText('Ouvrir le catalogue de la Boutique'));

    expect(push).toHaveBeenCalledWith({ pathname: '/shop-preview', params: { scope: 'catalog' } });
  });

  it('keeps the new profile sections connected to their existing destinations', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    await fireEvent.press(screen.getByTestId('profile-section-progression'));
    await fireEvent.press(screen.getByLabelText(/Ouvrir ma faction Fnatic/));
    await fireEvent.press(screen.getByLabelText('Ouvrir mes objets dans le Locker'));
    await fireEvent.press(screen.getByLabelText('Ouvrir les activations'));

    expect(push).toHaveBeenNthCalledWith(1, '/(tabs)/rank');
    expect(push).toHaveBeenNthCalledWith(2, '/(tabs)/social/faction');
    expect(push).toHaveBeenNthCalledWith(3, { pathname: '/shop-preview', params: { scope: 'owned' } });
    expect(push).toHaveBeenNthCalledWith(4, '/campaign-preview');
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
