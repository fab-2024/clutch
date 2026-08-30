/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { MyCallItem, MyCallsDashboard, MyCallState } from '../../types';
import { MyCallsPanel } from '../MyCallsPanel';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: 'CurrencyIcon' }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: 'TeamLogo' }));
jest.mock('@/src/features/shop/components/CosmeticRenderer', () => ({ SupporterIdentity: 'SupporterIdentity' }));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { pseudo: 'FabTheTap' }, session: null }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ equipped: {} }),
}));
jest.mock('../../matchCenterNavigation', () => ({
  openMatchCenter: jest.fn(),
  openMatchResult: jest.fn(),
  warmMatchCenter: jest.fn(),
}));

describe('MyCallsPanel', () => {
  it('keeps the four recap counters interactive and swaps the visible call', async () => {
    const locked = callItem('verrouille', 'rl-kc-vit', 'Karmine Corp', 'KC', 'Team Vitality', 'VIT');
    const won = callItem('reussi', 'lol-g2-bds', 'G2 Esports', 'G2', 'Team BDS', 'BDS');
    const dashboard: MyCallsDashboard = {
      saison_id: 'season-1',
      saison_nom: 'Saison 1',
      compteurs: { ouverts: 0, verrouilles: 1, reussis: 1, manques: 0 },
      ouverts: [],
      verrouilles: [locked],
      reussis: [won],
      manques: [],
    };
    const screen = await render(
      <MyCallsPanel dashboard={dashboard} followedGames={[]} game="followed" query="" />,
    );

    const lockedTab = screen.getByRole('tab', { name: 'VERROUILLÉS, 1' });
    expect(lockedTab.props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Karmine Corp contre Team Vitality, VERROUILLÉ' })).toBeTruthy();
    expect(screen.getByText('OUVRIR LE MATCH CENTER')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'RÉUSSIS, 1' }));

    expect(screen.getByRole('button', { name: 'G2 Esports contre Team BDS, RÉUSSI' })).toBeTruthy();
    expect(screen.getByText('REVOIR LE VERDICT')).toBeTruthy();
  });
});

function callItem(
  etat: MyCallState,
  id: string,
  equipeA: string,
  tagA: string,
  equipeB: string,
  tagB: string,
): MyCallItem {
  const resolved = etat === 'reussi' || etat === 'manque';
  return {
    id: 'call-' + id,
    pronostic_id: 'prediction-' + id,
    match_id: id,
    saison_id: 'season-1',
    etat,
    jeu: id.startsWith('rl-') ? 'rocket_league' : 'lol',
    evenement: id.startsWith('rl-') ? 'RLCS Major' : 'LEC Summer',
    format: 5,
    debut: '2026-08-30T18:00:00.000Z',
    statut_match: resolved ? 'termine' : 'a_venir',
    equipe_a: equipeA,
    tag_a: tagA,
    equipe_b: equipeB,
    tag_b: tagB,
    score_a: resolved ? 3 : null,
    score_b: resolved ? 1 : null,
    choix: 'a',
    statut: resolved ? 'gagne' : 'en_cours',
    delta_frags: resolved ? 24 : null,
    verrouille_le: '2026-08-29T09:42:00.000Z',
    ferme_le: '2026-08-30T17:55:00.000Z',
    regle_le: resolved ? '2026-08-30T20:00:00.000Z' : null,
    participants: 1,
    distribution: { total: 1, a: 1, b: 0, a_pct: 100, b_pct: 0 },
    regle_resolution: { cle: 'vainqueur_match', libelle: 'Vainqueur de la série', detail: 'BO5' },
    source_resultat: resolved ? 'validation_clutch' : null,
    source_resultat_label: resolved ? 'Validation GRIFF' : null,
    identifiant_resultat_externe: null,
    revision_resultat: 1,
    resultat_corrige: false,
  };
}
