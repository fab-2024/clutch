import { STREAK_MILESTONES, type CallStreakState } from './types';

export function nextStreakTarget(state: CallStreakState) {
  const reward = state.rewards?.find((item) => !item.rewardedAt);
  const days = reward?.days ?? STREAK_MILESTONES.find((day) => day > state.current)
    ?? Math.max(7, Math.ceil((state.current + 1) / 7) * 7);
  return { days, volts: reward?.volts ?? null, remaining: Math.max(0, days - state.current) };
}

/** Ordinal validated days, not calendar dates: protected/neutral dates never add a tick. */
export function streakProgressDays(state: CallStreakState) {
  const position = Math.max(1, state.current + (state.todayValidated ? 0 : 1));
  const start = Math.floor((position - 1) / 7) * 7 + 1;
  return Array.from({ length: 7 }, (_, index) => {
    const day = start + index;
    return { day, validated: day <= state.current, today: day === position,
      reward: Boolean(state.rewards?.some((item) => item.days === day)) };
  });
}
