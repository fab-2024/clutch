/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import ShowcaseRingCollection from '../components/ShowcaseRingCollection';
import { resolveAllShowcaseRings } from '../progression';
import type { ShowcaseRingStats } from '../types';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));

const STATS: ShowcaseRingStats = {
  ascension: { source: 'profile', value: 4 },
  clean_sweep: { source: 'profile', value: 10 },
  countercurrent: { source: 'profile', value: 15 },
  duelist: { source: 'profile', value: 50 },
  echo: { source: 'profile', value: 100 },
  faction: { source: 'profile', value: 20 },
  major: { source: 'profile', value: 100 },
  metamorphosis: { source: 'profile', value: 7 },
  pact: { source: 'profile', value: 15 },
  rank: { source: 'profile', value: 99 },
  ritual: { source: 'profile', value: 100 },
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

    expect(screen.getAllByTestId(/showcase-ring-family-/)).toHaveLength(13);
    expect(screen.getByLabelText(/Élite, Apogée, 5 paliers sur 5/)).toBeTruthy();
    expect(screen.getByLabelText(/Trace, Germe, 0 paliers sur 5/)).toBeTruthy();
    expect(screen.getByLabelText(/Cercle, Manifestation, 3 paliers sur 5, équipé/)).toBeTruthy();
    expect(screen.getByTestId('showcase-ring-core-lock-streak')).toBeTruthy();
    expect(screen.getByTestId('showcase-ring-streak-next-stage')).toBeTruthy();
    expect(screen.queryByText('?')).toBeNull();
    expect(screen.getAllByText('VERROUILLÉ')).toHaveLength(1);
    expect(screen.getAllByText('ÉQUIPÉ')).toHaveLength(1);

    await fireEvent.press(screen.getByLabelText(/Regard, Manifestation, 3 paliers sur 5/));
    await fireEvent.press(screen.getByText('ÉQUIPER DANS LA VITRINE'));
    expect(onEquip).toHaveBeenCalledWith('major');
  }, 30_000);
});
