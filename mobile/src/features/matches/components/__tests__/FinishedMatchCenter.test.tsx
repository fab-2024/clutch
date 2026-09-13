/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native';

import type { MatchCenterData } from '../../types';
import { FinishedMatchCenter } from '../FinishedMatchCenter';

jest.mock('lucide-react-native/icons/chevron-down', () => ({ __esModule: true, default: 'chevron-down' }));
jest.mock('lucide-react-native/icons/chevron-up', () => ({ __esModule: true, default: 'chevron-up' }));
jest.mock('lucide-react-native/icons/crown', () => ({ __esModule: true, default: 'crown' }));
jest.mock('lucide-react-native/icons/info', () => ({ __esModule: true, default: 'info' }));
jest.mock('lucide-react-native/icons/ticket', () => ({ __esModule: true, default: 'ticket' }));
jest.mock('lucide-react-native/icons/trophy', () => ({ __esModule: true, default: 'trophy' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: 'CurrencyIcon' }));
jest.mock('@/src/features/onboarding/components/GameLogo', () => ({ __esModule: true, default: 'GameLogo' }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: 'TeamLogo' }));
function fixture(): MatchCenterData {
  return {
    match: { id: 'finished', saison_id: 'season', debut: '2026-09-06T16:04:00Z', jeu: 'lol', equipe_a: 'FURIA', tag_a: 'FUR', equipe_b: 'RED Canids', tag_b: 'RED', evenement: 'CBLOL · Playoffs', format: 5, statut: 'termine', score_a: 3, score_b: 0, prediction: null },
    prediction: null,
    projection: null,
    related: [],
    callContext: { match_id: 'finished', participants: 10, ferme_le: '2026-09-06T16:04:00Z', verrouille_le: null, distribution: null, regle_resolution: { cle: 'vainqueur_match', libelle: 'Vainqueur de la série', detail: 'Le vainqueur remporte la série.' }, prediction: null, source_resultat: null, source_resultat_label: null, identifiant_resultat_externe: null, revision_resultat: 0, resultat_corrige: false },
  };
}

describe('FinishedMatchCenter', () => {
  it('shows the final winner and no participation, with details initially expanded', async () => {
    const screen = await render(<FinishedMatchCenter data={fixture()} />);
    expect(screen.getByText('3 - 0')).toBeTruthy();
    expect(screen.getByText('FURIA remporte la série')).toBeTruthy();
    expect(screen.getByText('Tu n’as pas participé')).toBeTruthy();
    expect(screen.getByText('Aucun changement de Frags.')).toBeTruthy();
    expect(screen.getByTestId('finished-call-no-participation')).toBeTruthy();
    expect(screen.getByText('AUCUN CALL')).toBeTruthy();
    expect(screen.getByText('Vainqueur de la série')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Détails du call' }).props.accessibilityState.expanded).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Détails du call' }));
    expect(screen.queryByText('Vainqueur de la série')).toBeNull();
  });

  it.each([
    ['gagne', 17, 'CALL RÉUSSI', '+17'],
    ['perdu', -23, 'CALL MANQUÉ', '−23'],
    ['gagne', null, 'CALL RÉUSSI', '—'],
    ['verrouille', null, 'VERDICT EN ATTENTE', '—'],
    ['annule', 0, 'CALL ANNULÉ', '0'],
  ] as const)('uses the recorded %s outcome and delta', async (statut, delta, label, impact) => {
    const data = fixture();
    data.prediction = { id: 'call', match_id: 'finished', choix: 'b', statut, delta_frags: delta, proba_figee: .5, proba_scoring: .5, k_frags: 40 };
    const screen = await render(<FinishedMatchCenter data={data} />);
    expect(screen.getByTestId('finished-call-participation')).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(impact)).toBeTruthy();
  });

  it('does not invent a winner or a zero score when results are missing', async () => {
    const data = fixture();
    data.match.score_a = null;
    data.match.score_b = null;
    const screen = await render(<FinishedMatchCenter data={data} />);
    expect(screen.getByText('— - —')).toBeTruthy();
    expect(screen.getByText('Score final en attente')).toBeTruthy();
    expect(screen.queryByText(/remporte la série/)).toBeNull();
  });
});
