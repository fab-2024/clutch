import { useLocalSearchParams } from 'expo-router';

import { PreviewRoute } from '@/src/components/dev/PreviewRoute';

import { PREVIEW_STREAK } from '../preview';
import { STREAK_MILESTONES } from '../types';
import CallStreakScreen from './CallStreakScreen';

export default function CallStreakPreviewScreen() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const pending = state === 'pending' || state === 'no-opportunity';
  const preview = {
    ...PREVIEW_STREAK,
    ...(pending ? {
      todayValidated: false,
      lastValidatedDay: '2026-09-05',
      eligibleMatchId: state === 'no-opportunity' ? null : 'preview-only',
      hadOpportunityToday: state !== 'no-opportunity',
      history: PREVIEW_STREAK.history.map((day) => day.day === PREVIEW_STREAK.day
        ? { ...day, status: state === 'no-opportunity' ? 'neutre' as const : 'a_faire' as const, calls: 0 } : day),
    } : {}),
    ...(state === 'full' ? { protectors: 2 } : {}),
    ...(state === 'long' ? {
      current: 128, best: 128, totalValidatedDays: 188,
      milestones: STREAK_MILESTONES.map((days) => ({ days, earnedAt: '2026-09-07T11:00:00+02:00' })),
    } : {}),
  };
  return <PreviewRoute><CallStreakScreen key={state ?? 'validated'} previewState={preview} /></PreviewRoute>;
}
