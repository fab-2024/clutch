/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import ProfileScreen from '../ProfileScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
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
    equipped: { frame: null, title: null, core: null, factionEffect: null, profileCard: null },
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

    fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase-preview');
  });

  it('opens the production Vitrine route from Moi', async () => {
    const screen = await render(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(push).toHaveBeenCalledWith('/showcase');
  });

  it('opens the preview Shop directly on the catalogue scope', async () => {
    const screen = await render(<ProfileScreen previewData={PREVIEW_PROFILE} />);

    fireEvent.press(screen.getByLabelText('Ouvrir le catalogue de la Boutique'));

    expect(push).toHaveBeenCalledWith({ pathname: '/shop-preview', params: { scope: 'catalog' } });
  });

  it('keeps the visitor action disabled for a private profile', async () => {
    const screen = await render(
      <ProfileScreen previewData={{ ...PREVIEW_PROFILE, publicProfile: false }} />,
    );
    const visitorAction = screen.getByLabelText('Voir comme visiteur, indisponible pour un profil privé');

    expect(visitorAction.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(visitorAction);
    expect(push).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/u/[pseudo]' }));
  });
});
