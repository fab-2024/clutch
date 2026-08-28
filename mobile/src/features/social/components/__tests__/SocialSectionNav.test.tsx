/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { layout } from '@/src/theme';

import SocialSectionNav from '../SocialSectionNav';

let mockPathname = '/social/duels';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  usePathname: () => mockPathname,
}));
jest.mock('lucide-react-native/icons/shield', () => ({ __esModule: true, default: 'Shield' }));
jest.mock('lucide-react-native/icons/swords', () => ({ __esModule: true, default: 'Swords' }));
jest.mock('lucide-react-native/icons/users-round', () => ({ __esModule: true, default: 'UsersRound' }));

describe('SocialSectionNav', () => {
  beforeEach(() => {
    mockPathname = '/social/duels';
  });

  it.each(['/social/duels', '/social/missions'])('keeps Défis selected on %s without a redundant Duels rail', async (pathname) => {
    mockPathname = pathname;
    const screen = await render(<SocialSectionNav />);

    expect(screen.getByRole('tab', { name: 'Ouvrir défis' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.queryByRole('tab', { name: 'Ouvrir duels' })).toBeNull();
  });

  it('exposes both navigation levels as tablists with 44 point targets', async () => {
    mockPathname = '/social/leagues';
    const screen = await render(<SocialSectionNav />);

    expect(screen.getByTestId('social-primary-tablist').props.accessibilityRole).toBe('tablist');
    expect(screen.getByTestId('social-secondary-tablist').props.accessibilityRole).toBe('tablist');
    expect(screen.getByRole('tab', { name: 'Ouvrir cercle' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByRole('tab', { name: 'Ouvrir ligue' }).props.accessibilityState).toEqual({ selected: true });

    for (const tab of screen.getAllByRole('tab')) {
      expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
    }
  });

  it('supports a deterministic subsection override for isolated previews', async () => {
    mockPathname = '/social-circle-preview';
    const screen = await render(
      <SocialSectionNav activeOverride="circle" activeSubsectionOverride="friends" />,
    );

    expect(screen.getByRole('tab', { name: 'Ouvrir cercle' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByRole('tab', { name: 'Ouvrir amis' }).props.accessibilityState).toEqual({ selected: true });
  });
});
