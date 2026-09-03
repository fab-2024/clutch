import { act, fireEvent, render } from '@testing-library/react-native';

import InvitationsScreen from '@/src/features/social/friends/referrals/components/InvitationsScreen';
import InvitationLinkScreen from '@/src/features/social/friends/referrals/components/InvitationLinkScreen';

import PublicShowcaseScreen from '../components/PublicShowcaseScreen';
import ShowcaseActivityScreen from '../components/ShowcaseActivityScreen';
import MilestoneLinkScreen from '../components/MilestoneLinkScreen';
import { PREVIEW_INVITATIONS, PREVIEW_SHOWCASE, PREVIEW_SHOWCASE_OWNER } from '../preview';

const mockPush = jest.fn();
const mockShare = jest.fn();
const mockShow = jest.fn();
const mockRefreshEconomy = jest.fn().mockResolvedValue(undefined);
const mockLoad = jest.fn();
const mockLike = jest.fn();
const mockSave = jest.fn();
const mockMilestone = jest.fn();
const mockInvites = jest.fn();
const mockCreate = jest.fn();
const mockRecord = jest.fn();
const mockIncoming = jest.fn();
const mockAccept = jest.fn();
const mockRemember = jest.fn().mockResolvedValue(true);
let mockViewer: string | undefined = 'viewer';
let mockParams = { pseudo: 'Nova', code: PREVIEW_INVITATIONS.code!, milestone: '7' };

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), canGoBack: () => true, back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({
  session: mockViewer ? { user: { id: mockViewer, email_confirmed_at: '2026-09-01' } } : null,
  profile: mockViewer ? { pseudo: 'Nova' } : null,
}) }));
jest.mock('@/src/providers/SnackbarProvider', () => ({ useSnackbar: () => ({ showSnackbar: mockShow }) }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: mockRefreshEconomy }) }));
jest.mock('@/src/config/release', () => ({ publicAppOrigin: 'https://clutch.example', publicAppUrl: (path: string) => `https://clutch.example${path}` }));
jest.mock('@/src/lib/share', () => ({ sharePublicLink: (...args: unknown[]) => mockShare(...args) }));
jest.mock('@/src/features/auth/pendingRoute', () => ({ rememberPendingRoute: (...args: unknown[]) => mockRemember(...args) }));
jest.mock('../api', () => ({ loadPublicShowcase: (...args: unknown[]) => mockLoad(...args),
  setShowcaseLike: (...args: unknown[]) => mockLike(...args), saveShowcasePreferences: (...args: unknown[]) => mockSave(...args),
  loadPublicMilestone: (...args: unknown[]) => mockMilestone(...args) }));
jest.mock('@/src/features/social/friends/referrals/api', () => ({ loadInvitations: (...args: unknown[]) => mockInvites(...args),
  createInvitation: (...args: unknown[]) => mockCreate(...args), recordInvitationShare: (...args: unknown[]) => mockRecord(...args),
  loadInvitation: (...args: unknown[]) => mockIncoming(...args), acceptInvitation: (...args: unknown[]) => mockAccept(...args) }));
jest.mock('@/src/features/social/friends/referrals/installation', () => ({ newShareOperation: () => 'fixture-operation' }));
jest.mock('@/src/components/layout/Screen', () => ({ Screen: jest.requireActual('react-native').View }));
jest.mock('@/src/features/profile/avatars/PlayerAvatar', () => ({ __esModule: true, default: 'PlayerAvatar' }));
jest.mock('@/src/features/safety/components/ProfileSafetyActions', () => ({ __esModule: true, default: 'ProfileSafetyActions' }));
jest.mock('@/src/components/ui/Button', () => ({ Button: (props: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void; testID?: string }) => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: props.label, testID: props.testID,
    disabled: props.disabled || props.loading, onPress: props.onPress }, React.createElement(Text, null, props.label));
} }));
jest.mock('lucide-react-native/icons/arrow-left', () => 'ArrowLeft');
jest.mock('lucide-react-native/icons/share-2', () => 'Share2');
jest.mock('lucide-react-native/icons/users', () => 'Users');

beforeEach(() => {
  jest.clearAllMocks(); mockViewer = 'viewer'; mockParams = { pseudo: 'Nova', code: PREVIEW_INVITATIONS.code!, milestone: '7' };
  mockLoad.mockResolvedValue(PREVIEW_SHOWCASE);
  mockLike.mockResolvedValue({ ...PREVIEW_SHOWCASE, liked: true, likes: 13 });
  mockInvites.mockResolvedValue(PREVIEW_INVITATIONS);
  mockShare.mockResolvedValue('shared'); mockRecord.mockResolvedValue(true);
  mockIncoming.mockResolvedValue({ inviter: 'Nova', reward: 30, dailyCap: 5, monthlyCap: 20 });
  mockAccept.mockResolvedValue({ newReferral: true });
  mockMilestone.mockResolvedValue({ pseudo: 'Nova', milestone: 7, earnedAt: '2026-09-03T09:00:00Z' });
  mockSave.mockImplementation(async (preferences) => ({ ...PREVIEW_SHOWCASE_OWNER, preferences }));
});

describe('verified milestone links', () => {
  it('shows an earned proof and opens its public showcase', async () => {
    const screen = await render(<MilestoneLinkScreen />);
    expect(screen.getByText('JALON OBTENU · VÉRIFIÉ PAR CLUTCH')).toBeTruthy();
    expect(screen.getByText('7 JOURS DE CALLS')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'VOIR LA VITRINE' }));
    expect(mockPush).toHaveBeenCalledWith('/v/Nova');
  });
  it('never claims verification for a loading, private or unearned milestone', async () => {
    let resolve!: (value: unknown) => void;
    mockMilestone.mockReturnValue(new Promise((done) => { resolve = done; }));
    const screen = await render(<MilestoneLinkScreen />);
    expect(screen.queryByText('JALON OBTENU · VÉRIFIÉ PAR CLUTCH')).toBeNull();
    await act(async () => resolve(null));
    expect(screen.queryByText('JALON OBTENU · VÉRIFIÉ PAR CLUTCH')).toBeNull();
    expect(screen.getByText('Ce jalon est privé, masqué ou n’a pas encore été obtenu.')).toBeTruthy();
  });
  it('rejects unsupported milestone URLs without reaching the backend', async () => {
    mockParams.milestone = '999';
    const screen = await render(<MilestoneLinkScreen />);
    expect(mockMilestone).not.toHaveBeenCalled();
    expect(screen.queryByText('999 JOURS DE CALLS')).toBeNull();
  });
});

describe('showcase interaction', () => {
  it('optimistically likes once and blocks rapid duplicate taps', async () => {
    let resolve!: (value: unknown) => void;
    mockLike.mockReturnValue(new Promise((done) => { resolve = done; }));
    const screen = await render(<PublicShowcaseScreen />);
    expect(screen.getByText('12 LIKES')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-like'));
    expect(screen.getByText('13 LIKES')).toBeTruthy();
    expect(screen.getByTestId('showcase-like')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('showcase-like'));
    expect(mockLike).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ...PREVIEW_SHOWCASE, liked: true, likes: 13 }));
    expect(screen.getByTestId('showcase-like')).not.toBeDisabled();
    expect(screen.getByTestId('showcase-like')).toBeChecked();
  });
  it('rolls back a failed like, but clears the page when access was revoked', async () => {
    mockLike.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null);
    const screen = await render(<PublicShowcaseScreen />);
    await fireEvent.press(screen.getByTestId('showcase-like'));
    expect(screen.getByText('12 LIKES')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-like'));
    expect(screen.queryByText('12 LIKES')).toBeNull();
    expect(screen.getByText('Cette vitrine est privée, inaccessible ou introuvable.')).toBeTruthy();
  });
  it('discards an old account response after switching accounts', async () => {
    let oldResponse!: (value: unknown) => void;
    mockLoad.mockReturnValueOnce(new Promise((done) => { oldResponse = done; }));
    const screen = await render(<PublicShowcaseScreen />);
    mockViewer = 'another-account'; mockLoad.mockResolvedValueOnce({ ...PREVIEW_SHOWCASE, likes: 4 });
    await screen.rerender(<PublicShowcaseScreen />);
    await act(async () => oldResponse({ ...PREVIEW_SHOWCASE, likes: 99 }));
    expect(screen.getByText('4 LIKES')).toBeTruthy();
    expect(screen.queryByText('99 LIKES')).toBeNull();
  });
  it('preview likes never call the backend or publish links', async () => {
    const screen = await render(<PublicShowcaseScreen previewData={PREVIEW_SHOWCASE} />);
    await fireEvent.press(screen.getByTestId('showcase-like'));
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER LE LIEN' }));
    expect(mockLoad).not.toHaveBeenCalled(); expect(mockLike).not.toHaveBeenCalled(); expect(mockShare).not.toHaveBeenCalled();
  });
  it('saves owner visibility deliberately, without modifying ranked stats', async () => {
    mockLoad.mockResolvedValue(PREVIEW_SHOWCASE_OWNER);
    const screen = await render(<ShowcaseActivityScreen />);
    expect(screen.getByText('+8 vues par rapport aux 7 jours précédents.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'MES AMIS' }));
    expect(screen.getByRole('radio', { name: 'MES AMIS' })).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'ENREGISTRER' }));
    expect(mockSave).toHaveBeenCalledWith({ ...PREVIEW_SHOWCASE_OWNER.preferences, visibility: 'cercle' }, 'viewer');
  });
});

describe('invitation journey', () => {
  it('uses the native share link and does not count a cancelled share', async () => {
    mockShare.mockResolvedValueOnce('dismissed');
    const screen = await render(<InvitationsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER LE LIEN' }));
    expect(mockRecord).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER LE LIEN' }));
    expect(mockShare).toHaveBeenCalledWith(expect.any(String), expect.any(String), `https://clutch.example/i/${PREVIEW_INVITATIONS.code}`);
    expect(mockRecord).toHaveBeenCalledWith('fixture-operation', 'viewer');
  });
  it('shares a personalized message without sending its text to the backend', async () => {
    const screen = await render(<InvitationsScreen />);
    const input = screen.getByTestId('invitation-share-message');
    expect(input.props.maxLength).toBe(280);
    await fireEvent.changeText(input, '  Rejoins mon Cercle !  ');
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER LE LIEN' }));
    expect(mockShare).toHaveBeenLastCalledWith(expect.any(String), 'Rejoins mon Cercle !', `https://clutch.example/i/${PREVIEW_INVITATIONS.code}`);
    expect(mockRecord).toHaveBeenLastCalledWith('fixture-operation', 'viewer');
    await fireEvent.changeText(input, '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER LE LIEN' }));
    expect(mockShare.mock.calls.at(-1)?.[1]).toMatch(/^Rejoins-moi sur Clutch/);
  });
  it('preserves the incoming link before requesting signup, then requires explicit acceptance', async () => {
    mockViewer = undefined;
    const screen = await render(<InvitationLinkScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'SE CONNECTER / CRÉER UN COMPTE' }));
    expect(mockRemember).toHaveBeenCalledWith(`/i/${PREVIEW_INVITATIONS.code}`);
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockAccept).not.toHaveBeenCalled();
    mockViewer = 'new-user';
    await screen.rerender(<InvitationLinkScreen />);
    expect(mockAccept).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'ACCEPTER L’INVITATION' }));
    expect(mockAccept).toHaveBeenCalledWith(PREVIEW_INVITATIONS.code, 'new-user');
    expect(screen.getByText('Invitation enregistrée. Ton premier call classé éligible activera le parrainage.')).toBeTruthy();
  });
  it('recovers a pasted code and rejects an unrelated URL', async () => {
    const screen = await render(<InvitationsScreen />);
    await fireEvent.changeText(screen.getByTestId('invitation-code-input'), `https://evil.test/i/${PREVIEW_INVITATIONS.code}`);
    await fireEvent.press(screen.getByRole('button', { name: 'OUVRIR L’INVITATION' }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Cette invitation est introuvable ou invalide.');
    await fireEvent.changeText(screen.getByTestId('invitation-code-input'), PREVIEW_INVITATIONS.code ?? '');
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'OUVRIR L’INVITATION' }));
    expect(mockPush).toHaveBeenCalledWith(`/i/${PREVIEW_INVITATIONS.code}`);
  });
  it('links to the inviter showcase only when their identity is public', async () => {
    const screen = await render(<InvitationLinkScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'VOIR LA VITRINE' }));
    expect(mockPush).toHaveBeenCalledWith('/v/Nova');
    mockIncoming.mockResolvedValue({ inviter: null, reward: 30, dailyCap: 5, monthlyCap: 20 });
    mockViewer = 'another-account';
    await screen.rerender(<InvitationLinkScreen />);
    expect(screen.queryByRole('button', { name: 'VOIR LA VITRINE' })).toBeNull();
  });
});
