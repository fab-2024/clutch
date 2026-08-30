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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
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

  it.each(['/social/friends', '/social/requests', '/social/leagues'])(
    'keeps Cercle selected on %s without a redundant content rail',
    async (pathname) => {
      mockPathname = pathname;
      const screen = await render(<SocialSectionNav />);

      expect(screen.getByTestId('social-primary-tablist').props.accessibilityRole).toBe('tablist');
      expect(screen.queryByTestId('social-secondary-tablist')).toBeNull();
      expect(screen.getByRole('tab', { name: 'Ouvrir cercle' }).props.accessibilityState).toEqual({ selected: true });
      expect(screen.queryByRole('tab', { name: 'Ouvrir ligue' })).toBeNull();
      expect(screen.getAllByRole('tab')).toHaveLength(3);

      for (const tab of screen.getAllByRole('tab')) {
        expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
      }
    },
  );

  it('supports a deterministic section override for isolated previews', async () => {
    mockPathname = '/social-circle-preview';
    const screen = await render(<SocialSectionNav activeOverride="circle" />);

    expect(screen.getByRole('tab', { name: 'Ouvrir cercle' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
