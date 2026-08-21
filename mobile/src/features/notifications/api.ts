import { supabase } from '@/src/lib/supabase';

import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import type { NotificationPreferences } from './types';

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase.rpc('clutch_mes_preferences_notification_v1');
  if (error) throw error;
  return normalizePreferences(data);
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const { data, error } = await supabase.rpc('clutch_enregistrer_preferences_notification_v1', {
    p_fuseau: preferences.timezone,
    p_verrouillage_imminent: preferences.lockImminent,
    p_debut_match: preferences.matchStart,
    p_verdict: preferences.verdict,
    p_promotion: preferences.promotion,
    p_mutation: preferences.mutation,
    p_duel_recu: preferences.duelReceived,
  });
  if (error) throw error;
  return normalizePreferences(data);
}

export async function registerNotificationToken({
  token,
  platform,
  deviceId,
}: {
  token: string;
  platform: 'ios' | 'android' | 'unknown';
  deviceId: string;
}) {
  const { data, error } = await supabase.rpc('clutch_enregistrer_jeton_notification_v1', {
    p_jeton_expo: token,
    p_plateforme: platform,
    p_appareil_id: deviceId,
  });
  if (error) throw error;
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return Number(payload.appareils_actifs ?? 0);
}

export async function deactivateNotificationToken(token: string) {
  const { data, error } = await supabase.rpc('clutch_desactiver_mon_jeton_notification_v1', {
    p_jeton_expo: token,
  });
  if (error) throw error;
  return data === true;
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    timezone: typeof row.fuseau === 'string' && row.fuseau ? row.fuseau : detectedTimezone(),
    lockImminent: booleanOrDefault(row.verrouillage_imminent, DEFAULT_NOTIFICATION_PREFERENCES.lockImminent),
    matchStart: booleanOrDefault(row.debut_match, DEFAULT_NOTIFICATION_PREFERENCES.matchStart),
    verdict: booleanOrDefault(row.verdict, DEFAULT_NOTIFICATION_PREFERENCES.verdict),
    promotion: booleanOrDefault(row.promotion, DEFAULT_NOTIFICATION_PREFERENCES.promotion),
    mutation: booleanOrDefault(row.mutation, DEFAULT_NOTIFICATION_PREFERENCES.mutation),
    duelReceived: booleanOrDefault(row.duel_recu, DEFAULT_NOTIFICATION_PREFERENCES.duelReceived),
    activeDevices: Math.max(0, Number(row.appareils_actifs ?? 0)),
  };
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export function detectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
