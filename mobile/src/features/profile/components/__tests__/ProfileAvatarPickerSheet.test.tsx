/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { PLAYER_AVATARS } from '../../avatars/catalog';
import ProfileAvatarPickerSheet from '../ProfileAvatarPickerSheet';

jest.mock('@/src/components/overlays/BaseSheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BaseSheet: ({ children, testID, visible }: {
      children: React.ReactNode;
      testID?: string;
      visible: boolean;
    }) => visible ? React.createElement(View, { testID }, children) : null,
  };
});
jest.mock('@/src/features/profile/avatars/PlayerAvatar', () => ({
  __esModule: true,
  default: 'PlayerAvatar',
}));

describe('ProfileAvatarPickerSheet', () => {
  it('offers the avatar catalog and exposes the current selection', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <ProfileAvatarPickerSheet
        error={null}
        onClose={jest.fn()}
        onSelect={onSelect}
        savingAvatarId={null}
        selectedAvatarId="gale-agent"
        visible
      />,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(PLAYER_AVATARS.length);
    expect(screen.getByRole('radio', { name: 'Choisir l’avatar Drone pulsar' }).props.accessibilityState.checked).toBe(true);

    await fireEvent.press(screen.getByRole('radio', { name: 'Choisir l’avatar Oracle neurale' }));
    expect(onSelect).toHaveBeenCalledWith('void-dragon');
  });

  it('disables every choice while an avatar is being saved', async () => {
    const screen = await render(
      <ProfileAvatarPickerSheet
        error={null}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        savingAvatarId="void-dragon"
        selectedAvatarId="gale-agent"
        visible
      />,
    );

    expect(screen.getAllByRole('radio').every((choice) => choice.props.accessibilityState.disabled)).toBe(true);
  });
});
