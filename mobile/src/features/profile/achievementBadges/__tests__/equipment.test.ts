import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { ACHIEVEMENT_BADGE_CATALOG } from '../catalog';
import {
  assignBadgeToShowcaseSlot,
  emptyAchievementBadgeSlots,
  loadAchievementBadgeEquipment,
  normalizeAchievementBadgeSlots,
  saveAchievementBadgeEquipment,
} from '../equipment';
import { evaluateAchievementBadges } from '../engine';
import { projectPublicBadgeCollection } from '../publicView';

describe('achievement badge showcase equipment', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('rejects a badge that has not been obtained', () => {
    const collection = projectPublicBadgeCollection(evaluateAchievementBadges(
      { placementTarget: 5 },
      [],
      { now: '2026-08-26T15:00:00.000Z' },
    ).badges);

    expect(() => assignBadgeToShowcaseSlot(
      emptyAchievementBadgeSlots(),
      0,
      'griff_legend',
      collection,
    )).toThrow('Un badge non obtenu ne peut pas être exposé.');
  });

  it('assigns only obtained badges, preserves four positions and removes duplicates', () => {
    const collection = projectPublicBadgeCollection(evaluateAchievementBadges(
      { correctOfficialCalls: 25, placementTarget: 5, totalOfficialCalls: 1 },
      [],
      { now: '2026-08-26T15:00:00.000Z' },
    ).badges);
    const first = assignBadgeToShowcaseSlot(emptyAchievementBadgeSlots(), 2, 'sharp_eye', collection);
    const moved = assignBadgeToShowcaseSlot(first, 0, 'sharp_eye', collection);

    expect(first).toEqual([null, null, 'sharp_eye', null]);
    expect(moved).toEqual(['sharp_eye', null, null, null]);
  });

  it('persists the same four-slot selection and rejects stale identifiers', async () => {
    await saveAchievementBadgeEquipment('Fab The Tap', ['first_signal', null, 'sharp_eye', null]);
    await expect(loadAchievementBadgeEquipment('Fab The Tap')).resolves.toEqual([
      'first_signal', null, 'sharp_eye', null,
    ]);
    expect(normalizeAchievementBadgeSlots(['first_signal', 'unknown', 'first_signal'])).toEqual([
      'first_signal', null, null, null,
    ]);
    expect(ACHIEVEMENT_BADGE_CATALOG).toHaveLength(20);
  });
});
