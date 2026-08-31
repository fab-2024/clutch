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

  it('applies the Karmine Corp Blue Wall identity when its share card is equipped', async () => {
    const screen = await render(
      <ProfileShareCard
        accuracy={72}
        cosmetic={{
          accent: '#168DFF',
          description: '',
          id: 'kc-share-card',
          level: 11,
          name: 'Carte de partage KC',
          rarity: 'epique',
          slot: 'carte_profil',
          styleKey: 'kc-share-card',
        }}
        frags={1247}
        grade="Bronze"
        profileTitle="Blue Wall"
        pseudo="FabTheTap"
        publicProfile
        rank={381}
        teamTag="KC"
      />,
    );

    expect(screen.getByText('KARMINE CORP // BLUE WALL')).toBeTruthy();
    expect(screen.getByText('CARTE DE PARTAGE KC')).toBeTruthy();
  });

  it('applies the M8 Gentle Mates Paris identity when its share card is equipped', async () => {
    const screen = await render(
      <ProfileShareCard
        accuracy={72}
        cosmetic={{
          accent: '#B9DCFF',
          description: '',
          id: 'm8-share-card',
          level: 11,
          name: 'Carte de partage',
          rarity: 'epique',
          slot: 'carte_profil',
          styleKey: 'm8-share-card',
        }}
        frags={1247}
        grade="Bronze"
        profileTitle="Gentle Mates Paris"
        pseudo="FabTheTap"
        publicProfile
        rank={381}
        teamTag="M8"
      />,
    );

    expect(screen.getByText('M8 // GENTLE MATES PARIS')).toBeTruthy();
    expect(screen.getByText('CARTE DE PARTAGE')).toBeTruthy();
  });
});
