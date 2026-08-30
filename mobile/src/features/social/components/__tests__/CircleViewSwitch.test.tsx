/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import CircleViewSwitch from '../CircleViewSwitch';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const replace = router.replace as jest.Mock;

describe('CircleViewSwitch', () => {
  beforeEach(() => replace.mockClear());

  it('keeps the private league selected and returns to the merged activity feed', async () => {
    const screen = await render(<CircleViewSwitch value="league" />);

    expect(screen.getByRole('tab', { name: 'LIGUE PRIVÉE' }).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(screen.getByRole('tab', { name: 'ACTIVITÉ' }));
    expect(replace).toHaveBeenCalledWith('/(tabs)/social/friends');
  });
});
