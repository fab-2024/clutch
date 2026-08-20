import { supabase } from '@/src/lib/supabase';

import type { FriendQuest, FriendQuestsData } from './types';

export async function loadFriendQuests(): Promise<FriendQuestsData> {
  const { data, error } = await supabase.rpc('clutch_friend_quests_dashboard_v1');
  if (error) throw error;
  const payload = (data ?? {}) as Partial<FriendQuestsData>;
  return {
    actives: normalizeQuests(payload.actives),
    historique: normalizeQuests(payload.historique),
    duos: Array.isArray(payload.duos) ? payload.duos : [],
    a_reveler: payload.a_reveler ? normalizeQuest(payload.a_reveler) : null,
  };
}

function normalizeQuests(value: FriendQuest[] | undefined) {
  return Array.isArray(value) ? value.map(normalizeQuest) : [];
}

function normalizeQuest(value: FriendQuest): FriendQuest {
  return {
    ...value,
    progression: Number(value.progression ?? 0),
    objectif: Math.max(1, Number(value.objectif ?? 1)),
    recompense_xp: Number(value.recompense_xp ?? 0),
    recompense_volts: Number(value.recompense_volts ?? 0),
  };
}
