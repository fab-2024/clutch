import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OnboardingDraft } from './types';

const DRAFT_KEY = '@griff/onboarding-draft/v2';
const SEEN_KEY = '@griff/onboarding-seen/v2';

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  step: 0,
  favoriteGame: null,
  favoriteTeamKey: null,
  favoriteTeamId: null,
  missingGame: '',
  missingTeam: '',
};

export async function readOnboardingDraft(): Promise<OnboardingDraft> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return EMPTY_ONBOARDING_DRAFT;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      ...EMPTY_ONBOARDING_DRAFT,
      ...parsed,
      step: Number.isFinite(parsed.step) ? Math.min(6, Math.max(0, Number(parsed.step))) : 0,
    };
  } catch {
    return EMPTY_ONBOARDING_DRAFT;
  }
}

export async function writeOnboardingDraft(draft: OnboardingDraft) {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(SEEN_KEY, 'true');
}

export async function hasSeenOnboarding() {
  return (await AsyncStorage.getItem(SEEN_KEY)) === 'true';
}

export async function clearOnboardingDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
  await markOnboardingSeen();
}
