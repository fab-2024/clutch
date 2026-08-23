import AsyncStorage from '@react-native-async-storage/async-storage';

import { COMMUNITY_FORMS } from './constants';
import type {
  CommunityArchive,
  CommunityData,
  CommunityMutationPresentation,
} from './types';
import { factionProgress } from './utils';

const STORAGE_NAMESPACE = '@griff/relic-presentation/v2';

export type RelicPresentationMemory = {
  eventId: string;
  level: number;
  presentedAt: string;
};

export async function attachPendingRelicMutation(data: CommunityData): Promise<CommunityData> {
  const context = presentationContext(data);
  if (!context) return data;

  const key = relicPresentationStorageKey(context.userId, context.teamId);
  const memory = await readPresentationMemory(key);
  const pending = derivePendingRelicMutation(data, memory);

  if (!pending && !memory) {
    try {
      await writePresentationMemory(key, {
        eventId: `baseline:${context.teamId}:${context.level}`,
        level: context.level,
        presentedAt: new Date().toISOString(),
      });
    } catch {
      // A storage issue must not prevent the real faction dashboard from loading.
    }
  }

  return data.moi
    ? { ...data, moi: { ...data.moi, mutation_a_presenter: pending } }
    : data;
}

export async function rememberRelicMutation(
  data: CommunityData,
  mutation: CommunityMutationPresentation,
) {
  const context = presentationContext(data);
  if (!context) return;

  await writePresentationMemory(
    relicPresentationStorageKey(context.userId, context.teamId),
    {
      eventId: mutation.id,
      level: mutation.to_level,
      presentedAt: new Date().toISOString(),
    },
  );
}

export function derivePendingRelicMutation(
  data: CommunityData,
  memory: RelicPresentationMemory | null,
): CommunityMutationPresentation | null {
  const context = presentationContext(data);
  if (!context || context.level <= 1) return null;

  const previousLevel = Math.max(1, memory?.level ?? 1);
  if (context.level <= previousLevel) return null;

  const target = context.progress.current;
  const archive = latestMatchingArchive(
    data.moi?.archives ?? [],
    target.threshold,
    data.moi?.membre_depuis,
  );

  return {
    id: archive
      ? `faction-event:${archive.id}:relic-v2:${target.level}`
      : `collective:${context.teamId}:relic-v2:${target.level}`,
    from_level: Math.min(previousLevel, target.level - 1),
    to_level: target.level,
    name: target.name,
    threshold: target.threshold,
    reward: archive?.recompense_volts ?? 0,
    awakened: target.state === 'awakened',
    occurred_at: archive?.cree_le ?? new Date().toISOString(),
  };
}

export function relicPresentationStorageKey(userId: string, teamId: string) {
  return `${STORAGE_NAMESPACE}:${userId}:${teamId}`;
}

function presentationContext(data: CommunityData) {
  if (!data.moi) return null;
  const faction = data.factions.find((candidate) => candidate.equipe_id === data.moi?.equipe_id)
    ?? data.factions.find((candidate) => candidate.moi);
  if (!faction) return null;

  const progress = factionProgress(faction.membres, faction.niveau_atteint);
  return {
    userId: data.moi.user_id,
    teamId: faction.equipe_id,
    level: progress.level,
    progress,
  };
}

function latestMatchingArchive(
  archives: CommunityArchive[],
  threshold: number,
  memberSince?: string,
) {
  const joinedAt = memberSince ? Date.parse(memberSince) : Number.NEGATIVE_INFINITY;
  return archives.reduce<CommunityArchive | null>((latest, archive) => {
    if (archive.seuil !== threshold || Date.parse(archive.cree_le) < joinedAt) return latest;
    if (!latest || Date.parse(archive.cree_le) > Date.parse(latest.cree_le)) return archive;
    return latest;
  }, null);
}

async function readPresentationMemory(key: string): Promise<RelicPresentationMemory | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RelicPresentationMemory>;
    if (!value.eventId || !Number.isFinite(value.level) || !value.presentedAt) return null;
    return {
      eventId: String(value.eventId),
      level: Math.max(0, Math.min(COMMUNITY_FORMS.length - 1, Number(value.level))),
      presentedAt: String(value.presentedAt),
    };
  } catch {
    return null;
  }
}

async function writePresentationMemory(key: string, value: RelicPresentationMemory) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
