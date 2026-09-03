/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { ProfileSettingsPreviewState } from '../ProfileSettingsScreen';
import ProfileSettingsScreen from '../ProfileSettingsScreen';

const mockShowSnackbar = jest.fn();

jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/cloud-upload', () => ({ __esModule: true, default: 'CloudUpload' }));
jest.mock('lucide-react-native/icons/save', () => ({ __esModule: true, default: 'Save' }));
jest.mock('lucide-react-native/icons/triangle-alert', () => ({ __esModule: true, default: 'TriangleAlert' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/src/features/auth/api', () => ({ signOut: jest.fn() }));
jest.mock('@/src/features/onboarding/api', () => ({ loadTeamOrganizations: jest.fn() }));
jest.mock('@/src/features/notifications', () => ({
  deactivateCurrentDevicePushToken: jest.fn(),
  detectedTimezone: () => 'Europe/Paris',
  loadNotificationPreferences: jest.fn(),
  requestAndRegisterPushToken: jest.fn(),
  saveNotificationPreferences: jest.fn(),
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: null, refreshProfile: jest.fn(), session: null }),
}));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));
jest.mock('@/src/lib/feedback', () => ({ errorFeedback: jest.fn(), successFeedback: jest.fn() }));
jest.mock('@/src/features/profile/api', () => ({ saveFavoriteTeam: jest.fn(), saveProfileAvatar: jest.fn(), saveProfilePreferences: jest.fn() }));
jest.mock('../FavoriteTeamConfirmationSheet', () => ({
  FavoriteTeamConfirmationSheet: ({ onClose, onConfirm, organization }: {
    onClose: () => void;
    onConfirm: () => void;
    organization: { name: string } | null;
  }) => {
    const React = jest.requireActual('react');
    const { Pressable, Text, View } = jest.requireActual('react-native');
    if (!organization) return null;
    return React.createElement(
      View,
      { testID: 'favorite-team-confirmation' },
      React.createElement(Text, null, `Confirmer ${organization.name}`),
      React.createElement(
        Pressable,
        { accessibilityRole: 'button', onPress: onConfirm },
        React.createElement(Text, null, 'CONFIRMER LE CHANGEMENT'),
      ),
      React.createElement(
        Pressable,
        { accessibilityRole: 'button', onPress: onClose },
        React.createElement(Text, null, 'ANNULER'),
      ),
    );
  },
}));

const previewState: ProfileSettingsPreviewState = {
  profile: {
    id: 'preview-user',
    pseudo: 'Nova',
    email: null,
    est_admin: false,
    equipe_favorite_id: 'fnc-lol',
    jeux_suivis: ['lol', 'valorant'],
    profil_public: true,
  },
  organizations: [
    {
      key: 'fnatic',
      name: 'Fnatic',
      tag: 'FNC',
      games: ['lol'],
      teams: [{ id: 'fnc-lol', jeu: 'lol', nom: 'Fnatic', tag: 'FNC' }],
    },
    {
      key: 'g2',
      name: 'G2 Esports',
      tag: 'G2',
      games: ['lol'],
      teams: [{ id: 'g2-lol', jeu: 'lol', nom: 'G2 Esports', tag: 'G2' }],
    },
  ],
  notifications: {
    timezone: 'Europe/Paris',
    lockImminent: true,
    matchStart: true,
    verdict: true,
    promotion: true,
    mutation: false,
    duelReceived: true,
    streakRisk: true,
    streakProtected: true,
    quietHoursEnabled: false,
    quietHoursStart: 1320,
    quietHoursEnd: 480,
    retentionAvailable: true,
    activeDevices: 1,
  },
  saveDelayMs: 40,
};

describe('ProfileSettingsScreen', () => {
  beforeEach(() => mockShowSnackbar.mockClear());

  it('autosaves reversible preferences without a manual save footer', async () => {
    const screen = await render(<ProfileSettingsScreen previewState={previewState} />);

    expect(screen.queryByText('ENREGISTRER LES PARAMÈTRES')).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: 'Profil public' }));
    await waitFor(() => expect(screen.getByText('ENREGISTRÉ')).toBeTruthy());
    expect(screen.getByRole('switch', { name: 'Profil public' }).props.accessibilityState.checked).toBe(false);
  });

  it('keeps the cooldown-bound faction behind explicit confirmation', async () => {
    const screen = await render(<ProfileSettingsScreen previewState={previewState} />);

    await fireEvent.press(screen.getByRole('radio', { name: /G2 Esports/ }));
    expect(screen.getByText('Confirmer G2 Esports')).toBeTruthy();
    expect(mockShowSnackbar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'CONFIRMER LE CHANGEMENT' }));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith({
      message: 'G2 Esports devient ta faction pour les 7 prochains jours.',
      tone: 'success',
    }));
    expect(screen.getByRole('radio', { name: /G2 Esports/ }).props.accessibilityState.checked).toBe(true);
  });

  it('lets the player choose an avatar and autosaves the selection', async () => {
    const screen = await render(<ProfileSettingsScreen previewState={previewState} />);
    const avatar = screen.getByRole('radio', { name: 'Choisir l’avatar Drone pulsar' });

    expect(avatar.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(avatar);

    expect(avatar.props.accessibilityState.checked).toBe(true);
    await waitFor(() => expect(screen.getByText('ENREGISTRÉ')).toBeTruthy());
  });
});
