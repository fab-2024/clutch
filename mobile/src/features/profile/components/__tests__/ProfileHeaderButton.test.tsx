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
    expect(screen.getByTestId('profile-header-avatar', { includeHiddenElements: true }).props.size).toBe(36);
  });
});
