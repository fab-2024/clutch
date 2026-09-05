/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import DeveloperHubScreen from '../DeveloperHubScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
}));
jest.mock('lucide-react-native/icons/chevron-right', () => 'ChevronRight');
jest.mock('lucide-react-native/icons/flask-conical', () => 'FlaskConical');
jest.mock('lucide-react-native/icons/shield-check', () => 'ShieldCheck');
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({
    profile: { est_createur: true, est_developpeur: true },
  }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ frags: 1842, unlimitedVolts: true, volts: 1_000_000_300 }),
}));

describe('DeveloperHubScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the internal surfaces only through the dedicated creator cockpit', async () => {
    const screen = await render(<DeveloperHubScreen />);

    expect(screen.getByText('COCKPIT CRÉATEUR')).toBeTruthy();
    expect(screen.getByText('COMPTE CRÉATEUR')).toBeTruthy();
    expect(screen.getByText('∞')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Relique Lab' }));
    expect(mockPush).toHaveBeenCalledWith('/social-relic-lab-preview');
  });
});
