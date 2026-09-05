/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { evaluateAchievementBadges } from '../engine';
import { projectPublicBadgeCollection } from '../publicView';
import AchievementBadgeCollection from '../components/AchievementBadgeCollection';

jest.mock('../components/AchievementBadgeArtwork', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AchievementBadgeCollection public mystery props', () => {
  it('renders only public clues for locked mysteries', async () => {
    const badges = projectPublicBadgeCollection(evaluateAchievementBadges(
      { placementTarget: 5 },
      [],
      { now: '2026-08-26T15:00:00.000Z' },
    ).badges);
    const countercurrent = badges.filter((badge) => badge.id === 'countercurrent');
    const screen = await render(
      <AchievementBadgeCollection
        badges={countercurrent}
        equipment={[null, null, null, null]}
        initialFilter="secret"
        onEquip={async () => undefined}
      />,
    );

    expect(screen.getAllByText('Anneau mystère')).toHaveLength(1);
    expect(screen.queryByText('Contre-courant')).toBeNull();
    expect(screen.queryByText(/10 % des participants/)).toBeNull();

    await fireEvent.press(screen.getByTestId('achievement-badge-card-countercurrent'));
    expect(screen.getByTestId('locked-secret-public-detail')).toBeTruthy();
    expect(screen.getAllByText('La foule regardait ailleurs.').length).toBeGreaterThan(0);
    expect(screen.queryByText('CONTRE-COURANT')).toBeNull();
    expect(screen.queryByText(/10 % des participants/)).toBeNull();
  }, 30_000);

  it('reveals the same mystery after a stored attribution', async () => {
    const badges = projectPublicBadgeCollection(evaluateAchievementBadges(
      { placementTarget: 5 },
      [{ id: 'countercurrent', seasonId: 'saison-a', unlockedAt: '2026-08-11T20:00:00.000Z' }],
      { now: '2026-08-26T15:00:00.000Z' },
    ).badges);
    const countercurrent = badges.filter((badge) => badge.id === 'countercurrent');
    const screen = await render(
      <AchievementBadgeCollection
        badges={countercurrent}
        equipment={['countercurrent', null, null, null]}
        initialFilter="secret"
        initialSelectedId="countercurrent"
        onEquip={async () => undefined}
      />,
    );

    expect(screen.getAllByText('Contre-courant').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Réussir un call choisi par 10 % des participants ou moins\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText('EXPOSÉ').length).toBeGreaterThan(0);
  });
});
