/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useProfileLevel } from '../../hooks/useProfileLevel';
import { levelFromXp } from '../../progression';
import ProfileHeaderButton from '../ProfileHeaderButton';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../hooks/useProfileLevel', () => ({ useProfileLevel: jest.fn() }));
jest.mock('@/src/features/shop/components/CosmeticRenderer', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    CosmeticAvatar: (props: { size: number }) => React.createElement(ReactNative.View, {
      ...props,
      testID: 'profile-header-avatar',
    }),
  };
});
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { pseudo: 'FabTheTap' }, session: null }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ equipped: {} }),
}));

describe('ProfileHeaderButton', () => {
  beforeEach(() => {
    jest.mocked(useProfileLevel).mockReturnValue(null);
  });

  it('matches the wallet height and keeps a proportionate avatar', async () => {
    const screen = await render(<ProfileHeaderButton />);
    const buttonStyle = StyleSheet.flatten(screen.getByTestId('profile-header-button').props.style);

    expect(buttonStyle.minHeight).toBe(52);
    expect(screen.getByTestId('profile-header-avatar', { includeHiddenElements: true }).props.size).toBe(52);
  });

  it('shows progress within the current level underneath the pseudo', async () => {
    const level = levelFromXp(200);
    jest.mocked(useProfileLevel).mockReturnValue(level);

    const screen = await render(<ProfileHeaderButton />);

    expect(screen.queryByText('PROFIL')).toBeNull();
    expect(screen.getByText('FabTheTap')).toBeTruthy();
    expect(screen.getByText('NIV. 2')).toBeTruthy();
    const progress = screen.getByLabelText(/Niveau 2, 53 % vers le niveau 3/);
    expect(progress.props.accessibilityValue).toEqual({
      min: 0, max: 1, now: 80 / 150,
    });
    expect(screen.getByRole('button').props.accessibilityHint).toContain('70 XP restantes');
  });

  it('does not invent a level before the real progression is available', async () => {
    const screen = await render(<ProfileHeaderButton />);

    expect(screen.getByText('NIV. —')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityHint).toContain('attente de synchronisation');
  });
});
