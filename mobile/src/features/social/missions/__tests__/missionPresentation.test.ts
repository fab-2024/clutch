/// <reference types="jest" />

import { FRIEND_MISSIONS_FIXTURE } from '../testing/fixtures';
import {
  missionDescription,
  missionProgress,
  missionRewardLabel,
  missionStatusLabel,
  missionTimeLeft,
} from '../missionPresentation';

describe('mission presentation', () => {
  const mission = FRIEND_MISSIONS_FIXTURE.actives[0];

  it('formats progress, reward and partner context consistently', () => {
    expect(missionProgress(mission)).toEqual({ current: 2, objective: 4, percentage: 50 });
    expect(missionRewardLabel(mission)).toBe('+100 XP · +25 Volts');
    expect(missionDescription(mission)).toContain('Nova');
  });

  it('localizes terminal states and handles invalid dates', () => {
    expect(missionStatusLabel('terminee')).toBe('TERMINÉE');
    expect(missionStatusLabel('ratee')).toBe('RATÉE');
    expect(missionTimeLeft('not-a-date')).toBe('Échéance inconnue');
  });

  it('caps progress at the mission objective', () => {
    expect(missionProgress({ ...mission, progression: 8 })).toEqual({
      current: 4,
      objective: 4,
      percentage: 100,
    });
  });
});
