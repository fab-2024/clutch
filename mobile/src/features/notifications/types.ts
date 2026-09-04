import type { SupportedLocale } from '@/src/lib/i18n';

export type NotificationRecommendationCategory = 'streakRisk' | 'matchStart' | 'duelReceived';

export type NotificationRecommendation = {
  source: 'activity' | 'defaults';
  sampleSize: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  categories: NotificationRecommendationCategory[];
  generatedAt: string;
};

export type NotificationPreferences = {
  locale: SupportedLocale;
  timezone: string;
  lockImminent: boolean;
  matchStart: boolean;
  verdict: boolean;
  promotion: boolean;
  mutation: boolean;
  duelReceived: boolean;
  streakRisk: boolean;
  streakProtected: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  retentionAvailable: boolean;
  expansionAvailable: boolean;
  recommendation: NotificationRecommendation | null;
  activeDevices: number;
};

export type PushRegistrationResult =
  | { status: 'registered'; activeDevices: number }
  | { status: 'denied' }
  | { status: 'unconfigured' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  locale: 'fr-FR',
  timezone: 'UTC',
  lockImminent: true,
  matchStart: true,
  verdict: true,
  promotion: true,
  mutation: true,
  duelReceived: true,
  streakRisk: true,
  streakProtected: true,
  quietHoursEnabled: false,
  quietHoursStart: 1320,
  quietHoursEnd: 480,
  retentionAvailable: true,
  expansionAvailable: true,
  recommendation: null,
  activeDevices: 0,
};

export function applyNotificationRecommendation(preferences: NotificationPreferences): NotificationPreferences {
  const recommendation = preferences.recommendation;
  if (!recommendation) return preferences;
  const next = {
    ...preferences,
    quietHoursEnabled: true,
    quietHoursStart: recommendation.quietHoursStart,
    quietHoursEnd: recommendation.quietHoursEnd,
  };
  for (const category of recommendation.categories) next[category] = true;
  return next;
}

export function notificationRecommendationIsApplied(preferences: NotificationPreferences) {
  const recommendation = preferences.recommendation;
  return Boolean(recommendation
    && preferences.quietHoursEnabled
    && preferences.quietHoursStart === recommendation.quietHoursStart
    && preferences.quietHoursEnd === recommendation.quietHoursEnd
    && recommendation.categories.every((category) => preferences[category]));
}
