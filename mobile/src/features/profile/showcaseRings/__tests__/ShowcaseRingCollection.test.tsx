/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import ShowcaseRingCollection from '../components/ShowcaseRingCollection';
import { resolveAllShowcaseRings } from '../progression';
import type { ShowcaseRingStats } from '../types';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

const STATS: ShowcaseRingStats = {
  faction: { source: 'profile', value: 148 },
  major: { source: 'profile', value: 3 },
  rank: { source: 'profile', value: 5 },
  seniority: { source: 'profile', value: 4 },
  streak: { source: 'profile', value: 0 },
};

describe('ShowcaseRingCollection', () => {
  it('renders one evolving object per family with locked, unlocked and equipped states', async () => {
    const onEquip = jest.fn();
    const screen = await render(
      <ShowcaseRingCollection
        onEquip={onEquip}
        progressions={resolveAllShowcaseRings(STATS, 'faction')}
        stats={STATS}
      />,
    );

    expect(screen.getAllByTestId(/showcase-ring-family-/)).toHaveLength(5);
    expect(screen.getByLabelText(/Rang, Légende, 5 paliers sur 5/)).toBeTruthy();
    expect(screen.getByLabelText(/Série, Amorçage, 0 paliers sur 5/)).toBeTruthy();
    expect(screen.getByLabelText(/Faction, Pilier, 3 paliers sur 5, équipé/)).toBeTruthy();
    expect(screen.getAllByText('VERROUILLÉ')).toHaveLength(1);
    expect(screen.getAllByText('ÉQUIPÉ')).toHaveLength(1);

    await fireEvent.press(screen.getByLabelText(/Majeur, Vainqueur, 3 paliers sur 5/));
    await fireEvent.press(screen.getByText('ÉQUIPER DANS LA VITRINE'));
    expect(onEquip).toHaveBeenCalledWith('major');
  }, 30_000);
});
