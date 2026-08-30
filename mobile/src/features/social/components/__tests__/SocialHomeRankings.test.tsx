/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import type { CommunityFaction, CommunityMe } from '../../faction/types';
import { FactionMemberRanking, FactionWar } from '../SocialHomeSections';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Defs: 'Defs',
  LinearGradient: 'SvgLinearGradient',
  Path: 'Path',
  Stop: 'Stop',
}));
jest.mock('@/src/components/ui/FeatureStateView', () => ({
  FEATURE_STATE_COPY: { social: { loading: { title: 'Chargement' } } },
  FeatureStateView: 'FeatureStateView',
}));
jest.mock('@/src/components/ui/Skeleton', () => ({
  Skeleton: 'Skeleton',
  SkeletonGroup: 'SkeletonGroup',
}));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => 'TeamLogo');
jest.mock('@/src/features/social/faction/components/CollectiveRelic', () => 'CollectiveRelic');
jest.mock('@/src/features/social/faction/components/FactionEvolutionRail', () => 'FactionEvolutionRail');

const factions: CommunityFaction[] = [
  faction('fnc', 'Fnatic', 'FNC', 12, true),
  faction('vit', 'Team Vitality', 'VIT', 9),
  faction('kc', 'Karmine Corp', 'KC', 7),
  faction('g2', 'G2 Esports', 'G2', 5),
];

const me: CommunityMe = {
  user_id: 'me',
  pseudo: 'FabTheTap',
  equipe_id: 'fnc',
  membre_depuis: '2026-08-01T00:00:00.000Z',
  pronos_depuis: 12,
  mutations_vecues: 1,
  pronos_7j: 4,
  gagnes_7j: 3,
  delta_frags_7j: 28,
  rang_activite: 2,
  total_activite: 8,
  top_activite: [
    { user_id: 'me', pseudo: 'FabTheTap', pronos_7j: 4, gagnes_7j: 3, rang: 2 },
  ],
  archives: [],
  mutation_a_presenter: null,
};

describe('Social faction rankings', () => {
  it('renders the faction ranking as the three-row reference table', async () => {
    const screen = await render(<FactionWar factions={factions} mine={factions[0]} />);

    expect(screen.getByTestId('faction-ranking-board')).toBeTruthy();
    expect(screen.getByText('RANG', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('FACTION', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByText('SUPPORTERS', { includeHiddenElements: true })).toHaveLength(4);
    expect(screen.getByLabelText('1. Fnatic, 12 supporters, ma faction')).toBeTruthy();
    expect(screen.getByLabelText('2. Team Vitality, 9 supporters')).toBeTruthy();
    expect(screen.getByLabelText('3. Karmine Corp, 7 supporters')).toBeTruthy();
    expect(screen.queryByText('G2 Esports')).toBeNull();
  });

  it('keeps the member rank and seven-day metrics in separate cards', async () => {
    const screen = await render(<FactionMemberRanking faction={factions[0]} me={me} />);

    expect(screen.getByText('TON CLASSEMENT FNC')).toBeTruthy();
    expect(screen.getByText('#2/8')).toBeTruthy();
    expect(screen.getByLabelText('Rang 2, FabTheTap, toi')).toBeTruthy();
    expect(screen.getByTestId('faction-member-identity')).toBeTruthy();
    expect(screen.getByTestId('faction-member-stats')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('+28')).toBeTruthy();
  });
});

function faction(
  id: string,
  nom: string,
  tag: string,
  membres: number,
  moi = false,
): CommunityFaction {
  return {
    equipe_id: id,
    nom,
    tag,
    jeu: 'lol',
    logo: null,
    membres,
    niveau_atteint: 1,
    croissance_24h: 0,
    croissance_7j: 0,
    moi,
    dernier_evenement_id: null,
    dernier_evenement_niveau: null,
    dernier_evenement_nom: null,
    dernier_evenement_le: null,
    dernier_evenement_recompense_volts: 0,
  };
}
