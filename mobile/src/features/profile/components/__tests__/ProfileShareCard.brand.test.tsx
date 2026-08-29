/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import ProfileShareCard from '../ProfileShareCard';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

describe('ProfileShareCard branding', () => {
  it('uses the shared GRIFF emblem instead of a legacy letter placeholder', async () => {
    const screen = await render(
      <ProfileShareCard
        accuracy={72}
        cosmetic={null}
        frags={1247}
        grade="Or"
        profileTitle="Rookie du Call"
        pseudo="FabTheTap"
        publicProfile
        rank={381}
        teamTag="FNC"
      />,
    );

    expect(screen.getByLabelText('Logo GRIFF')).toBeTruthy();
    expect(screen.getAllByTestId('griff-mark', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.queryByText('C')).toBeNull();
  });
});
