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

  it('applies the Fnatic share-card identity when the pack card is equipped', async () => {
    const screen = await render(
      <ProfileShareCard
        accuracy={72}
        cosmetic={{
          accent: '#FF5900',
          description: '',
          id: 'fnatic-share-card',
          level: 11,
          name: 'Carte de partage Fnatic',
          rarity: 'epique',
          slot: 'carte_profil',
          styleKey: 'fnatic-share-card',
        }}
        frags={1247}
        grade="Bronze"
        profileTitle="Always Fnatic"
        pseudo="FabTheTap"
        publicProfile
        rank={381}
        teamTag="FNC"
      />,
    );

    expect(screen.getByText('FNATIC // BLACK & ORANGE')).toBeTruthy();
    expect(screen.getByText('CARTE DE PARTAGE FNATIC')).toBeTruthy();
  });
});
