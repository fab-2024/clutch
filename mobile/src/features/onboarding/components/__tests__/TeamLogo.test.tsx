/// <reference types="jest" />

import { act, render } from '@testing-library/react-native';

import TeamLogo from '../TeamLogo';

jest.mock('@/src/components/ui/RemoteImage', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    RemoteImage: (props: object) => React.createElement(ReactNative.View, {
      ...props,
      testID: 'team-logo-remote',
    }),
  };
});
jest.mock('react-native-svg', () => ({ SvgUri: 'SvgUri' }));

describe('TeamLogo', () => {
  it('keeps the team tag visible until the remote mark is displayed', async () => {
    const screen = await render(
      <TeamLogo accent="#E8FF3D" name="G2 Esports" size={64} tag="G2" />,
    );

    expect(screen.getByText('G2')).toBeTruthy();

    await act(async () => screen.getByTestId('team-logo-remote').props.onDisplay());

    expect(screen.queryByText('G2')).toBeNull();
  });
});
