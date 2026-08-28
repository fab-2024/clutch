/// <reference types="jest" />

import { selectHubContext } from '../hubContext';
import type { HubFactionMission, HubRecentResult, HubReward } from '../types';

const NOW = Date.parse('2026-08-28T12:00:00.000Z');

const RESULT: HubRecentResult = {
  id: 'prediction-1',
  matchId: 'match-1',
  status: 'gagne',
  choice: 'a',
  deltaFrags: 34,
  resolvedAt: '2026-08-28T11:15:00.000Z',
  game: 'lol',
  event: 'LEC',
  teamA: 'G2 Esports',
  tagA: 'G2',
  teamB: 'Fnatic',
  tagB: 'FNC',
  scoreA: 2,
  scoreB: 1,
};

const MISSION: HubFactionMission = {
  id: 'mission-1',
  title: 'Verrouiller 12 calls en faction',
  goal: 12,
  progress: 3,
  personalContribution: 1,
  startsAt: '2026-08-27T12:00:00.000Z',
  endsAt: '2026-08-30T12:00:00.000Z',
  completed: false,
  participants: 6,
  team: { id: 'kc', name: 'Karmine Corp', tag: 'KC', logo: null },
};

const REWARD: HubReward = {
  id: 'reward-1',
  name: 'Trace électrique',
  family: 'cadre',
  slot: 'cadre_profil',
  rarity: 'rare',
  styleKey: 'electric-trace',
  accent: '#E8FF3D',
  source: 'mission',
  acquiredAt: '2026-08-28T10:00:00.000Z',
};

describe('selectHubContext', () => {
  it('closes the prediction loop with a fresh result before other signals', () => {
    expect(selectHubContext({ recentResult: RESULT, factionMission: MISSION, latestReward: REWARD }, NOW)?.kind).toBe('result');
  });

  it('prioritizes an urgent mission once the immediate verdict window has passed', () => {
    const urgentMission = { ...MISSION, progress: 10 };
    const olderResult = { ...RESULT, resolvedAt: '2026-08-28T04:00:00.000Z' };

    expect(selectHubContext({ recentResult: olderResult, factionMission: urgentMission, latestReward: REWARD }, NOW)?.kind).toBe('mission');
  });

  it('acknowledges a fresh reward before a non-urgent mission', () => {
    expect(selectHubContext({ recentResult: null, factionMission: MISSION, latestReward: REWARD }, NOW)?.kind).toBe('reward');
  });

  it('falls back to the active mission when no fresher event is available', () => {
    const olderReward = { ...REWARD, acquiredAt: '2026-08-26T10:00:00.000Z' };

    expect(selectHubContext({ recentResult: null, factionMission: MISSION, latestReward: olderReward }, NOW)?.kind).toBe('mission');
  });

  it('returns no slot for completed, expired and stale signals', () => {
    const expiredMission = { ...MISSION, endsAt: '2026-08-28T11:00:00.000Z' };
    const staleResult = { ...RESULT, resolvedAt: '2026-08-24T11:00:00.000Z' };
    const staleReward = { ...REWARD, acquiredAt: '2026-08-18T10:00:00.000Z' };

    expect(selectHubContext({ recentResult: staleResult, factionMission: expiredMission, latestReward: staleReward }, NOW)).toBeNull();
  });
});
