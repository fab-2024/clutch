/// <reference types="jest" />

import { render } from '@testing-library/react-native';

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
  it.each(['/social/duels', '/social/missions'])('keeps Défis selected on %s without a redundant Duels rail', async (pathname) => {
    mockPathname = pathname;
    const screen = await render(<SocialSectionNav />);

    expect(screen.getByRole('button', { name: 'Ouvrir défis' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.queryByRole('button', { name: 'Ouvrir duels' })).toBeNull();
  });
});
