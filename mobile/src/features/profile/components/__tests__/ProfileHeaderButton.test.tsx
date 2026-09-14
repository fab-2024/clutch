/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import ProfileHeaderButton from '../ProfileHeaderButton';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
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
  it('matches the wallet height and keeps a proportionate avatar', async () => {
    const screen = await render(<ProfileHeaderButton />);
    const buttonStyle = StyleSheet.flatten(screen.getByTestId('profile-header-button').props.style);

    expect(buttonStyle.minHeight).toBe(52);
    const avatar = screen.getByTestId('profile-header-avatar', { includeHiddenElements: true });
    expect(avatar.props.size).toBe(52);
    expect(avatar.props.cosmetics).toBeUndefined();
  });

  it.each([false, true])('shows only the profile name beside the avatar (preview: %s)', async (preview) => {
    const screen = await render(<ProfileHeaderButton preview={preview} />);

    expect(screen.getByText('FabTheTap')).toBeTruthy();
    expect(screen.queryByText(/NIV\./)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button').props.accessibilityHint).not.toMatch(/XP|niveau|synchronisation/i);
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Ouvrir mon profil, FabTheTap');
  });

  it('keeps the pseudo at its intended size in the compact collection header', async () => {
    const screen = await render(<ProfileHeaderButton compact preview />);
    const avatar = screen.getByTestId('profile-header-avatar', { includeHiddenElements: true });
    const pseudo = screen.getByText('FabTheTap');

    expect(avatar.props.size).toBe(44);
    expect(pseudo.props.adjustsFontSizeToFit).toBeUndefined();
    expect(StyleSheet.flatten(pseudo.props.style).fontSize).toBe(17);
  });
});
