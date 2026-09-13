/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import type { CommunityFaction } from '../../faction/types';
import { factionProgress } from '../../faction/utils';
import FactionRelicHeroV2, { relicHudAccent, relicSceneHeightForWidth } from '../FactionRelicHeroV2';
import { colors } from '@/src/theme';

let mockCollectiveProps: Record<string, unknown> = {};

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/triangle', () => 'Triangle');
jest.mock('lucide-react-native/icons/users-round', () => 'UsersRound');
jest.mock('@/src/features/onboarding/components/TeamLogo', () => function MockTeamLogo(props: { name: string; tag: string; uri?: string | null }) {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return React.createElement(View, {
    accessibilityLabel: `${props.name}-${props.tag}-${props.uri ?? 'fallback'}`,
    testID: 'team-logo',
  });
});
jest.mock('@/src/features/social/faction/components/CollectiveRelic', () => function MockCollectiveRelic(props: Record<string, unknown>) {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  mockCollectiveProps = props;
  return React.createElement(View, { testID: 'collective-relic' });
});
jest.mock('@/src/features/social/faction/components/FactionEvolutionRail', () => 'FactionEvolutionRail');

const faction: CommunityFaction = {
  equipe_id: 'fnc',
  nom: 'Fnatic',
  tag: 'FNC',
  jeu: 'lol',
  logo: 'https://cdn.example/fnatic.svg',
  membres: 68,
  niveau_atteint: 1,
  croissance_24h: 4,
  croissance_7j: 21,
  moi: true,
  dernier_evenement_id: null,
  dernier_evenement_niveau: null,
  dernier_evenement_nom: null,
  dernier_evenement_le: null,
  dernier_evenement_recompense_volts: 0,
};

describe('FactionRelicHeroV2', () => {
  beforeEach(() => { mockCollectiveProps = {}; });

  it('renders the dynamic faction identity and keeps a tag fallback when the remote logo is absent', async () => {
    const screen = await render(<FactionRelicHeroV2 faction={faction} me={null} relicProgressOverride={factionProgress(68)} />);

    expect(screen.getByLabelText('Fnatic-FNC-https://cdn.example/fnatic.svg')).toBeTruthy();
    expect(mockCollectiveProps.faction).toBe(faction);

    await screen.rerender(<FactionRelicHeroV2 faction={{ ...faction, logo: null }} me={null} relicProgressOverride={factionProgress(68)} />);
    expect(screen.getByLabelText('Fnatic-FNC-fallback')).toBeTruthy();
  });

  it('keeps the three compact HUD statistics next to the scene', async () => {
    const screen = await render(<FactionRelicHeroV2 faction={faction} me={null} relicProgressOverride={factionProgress(68)} />);

    expect(screen.getByTestId('relic-hud')).toBeTruthy();
    expect(screen.getByTestId('relic-metric-progress')).toBeTruthy();
    expect(screen.getByTestId('relic-metric-growth')).toBeTruthy();
    expect(screen.getByTestId('relic-metric-members')).toBeTruthy();
    expect(screen.getByLabelText('Progression de l’étape, 68 pour cent')).toBeTruthy();
    expect(screen.getByLabelText('Gain récent, +4 points sur 24 heures')).toBeTruthy();
    expect(screen.getByLabelText('68 membres de la faction')).toBeTruthy();
  });

  it('uses the acid accent for Fnatic without overriding other faction colors', () => {
    expect(relicHudAccent(faction, '#FF5900')).toBe(colors.volt);
    expect(relicHudAccent({ nom: 'Karmine Corp', tag: 'KC' }, '#2FA7FF')).toBe('#2FA7FF');
  });

  it('caps the cinematic scene on phone and web widths without overflowing a 390 px viewport', () => {
    expect(relicSceneHeightForWidth(320)).toBe(286);
    expect(relicSceneHeightForWidth(390)).toBe(324);
    expect(relicSceneHeightForWidth(432)).toBe(324);
    expect(relicSceneHeightForWidth(1_280)).toBe(324);
  });
});
