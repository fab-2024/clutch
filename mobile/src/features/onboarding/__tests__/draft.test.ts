/// <reference types="jest" />

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearOnboardingDraft,
  EMPTY_ONBOARDING_DRAFT,
  hasSeenOnboarding,
  readOnboardingDraft,
  writeOnboardingDraft,
} from '../draft';

describe('onboarding draft', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restores the catalog choices collected before authentication', async () => {
    const draft = {
      ...EMPTY_ONBOARDING_DRAFT,
      step: 6,
      favoriteGame: 'valorant' as const,
      missingTeam: 'Une équipe locale',
    };

    await writeOnboardingDraft(draft);

    await expect(readOnboardingDraft()).resolves.toEqual(draft);
  });

  it('recovers from an invalid or out-of-range stored step', async () => {
    await AsyncStorage.setItem('@griff/onboarding-draft/v2', JSON.stringify({ step: 99 }));

    await expect(readOnboardingDraft()).resolves.toMatchObject({ step: 6 });
  });

  it('marks the welcome as seen when the authenticated draft is consumed', async () => {
    await writeOnboardingDraft({ ...EMPTY_ONBOARDING_DRAFT, step: 4, favoriteGame: 'lol' });

    await clearOnboardingDraft();

    await expect(readOnboardingDraft()).resolves.toEqual(EMPTY_ONBOARDING_DRAFT);
    await expect(hasSeenOnboarding()).resolves.toBe(true);
  });
});
