import type {
  HubData,
  HubFactionMission,
  HubRecentResult,
  HubReward,
} from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const FRESH_RESULT_WINDOW = 6 * HOUR_MS;
const RECENT_RESULT_WINDOW = 48 * HOUR_MS;
const FRESH_REWARD_WINDOW = DAY_MS;
const RECENT_REWARD_WINDOW = 7 * DAY_MS;
const URGENT_MISSION_WINDOW = 6 * HOUR_MS;
const URGENT_MISSION_PROGRESS = 0.8;

export type HubContextItem =
  | { kind: 'mission'; mission: HubFactionMission }
  | { kind: 'result'; result: HubRecentResult }
  | { kind: 'reward'; reward: HubReward };

type HubContextData = Pick<HubData, 'factionMission' | 'latestReward' | 'recentResult'>;

/**
 * Keeps the Hub editorial rather than additive: only one signal is surfaced.
 * Immediate outcomes close the prediction loop, expiring missions stay
 * actionable, and newly acquired rewards get a short acknowledgement window.
 */
export function selectHubContext(data: HubContextData, now = Date.now()): HubContextItem | null {
  const result = data.recentResult;
  const mission = activeMission(data.factionMission, now);
  const reward = data.latestReward;

  if (result && isWithinPastWindow(result.resolvedAt, FRESH_RESULT_WINDOW, now)) {
    return { kind: 'result', result };
  }

  if (mission && isUrgentMission(mission, now)) {
    return { kind: 'mission', mission };
  }

  if (reward && isWithinPastWindow(reward.acquiredAt, FRESH_REWARD_WINDOW, now)) {
    return { kind: 'reward', reward };
  }

  if (mission) return { kind: 'mission', mission };

  if (result && isWithinPastWindow(result.resolvedAt, RECENT_RESULT_WINDOW, now)) {
    return { kind: 'result', result };
  }

  if (reward && isWithinPastWindow(reward.acquiredAt, RECENT_REWARD_WINDOW, now)) {
    return { kind: 'reward', reward };
  }

  return null;
}

function activeMission(mission: HubFactionMission | null, now: number) {
  if (!mission || mission.completed || mission.progress >= mission.goal) return null;

  const startsAt = timestamp(mission.startsAt);
  if (startsAt !== null && startsAt > now) return null;

  const endsAt = timestamp(mission.endsAt);
  if (endsAt !== null && endsAt <= now) return null;

  return mission;
}

function isUrgentMission(mission: HubFactionMission, now: number) {
  const progress = Math.max(0, mission.progress) / Math.max(1, mission.goal);
  const endsAt = timestamp(mission.endsAt);
  const remaining = endsAt === null ? Number.POSITIVE_INFINITY : endsAt - now;
  return progress >= URGENT_MISSION_PROGRESS || remaining <= URGENT_MISSION_WINDOW;
}

function isWithinPastWindow(value: string, window: number, now: number) {
  const date = timestamp(value);
  if (date === null) return false;
  const age = Math.max(0, now - date);
  return age <= window;
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
