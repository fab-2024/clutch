import { supabase } from '@/src/lib/supabase';
import { deviceTimeZone, getActiveLocale, resolveLocale } from '@/src/lib/i18n';

import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import type { NotificationPreferences, NotificationRecommendation, NotificationRecommendationCategory } from './types';

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  let { data, error } = await supabase.rpc('clutch_mes_preferences_notification_v3');
  if (error && ['PGRST202', '42883'].includes(error.code)) {
    ({ data, error } = await supabase.rpc('clutch_mes_preferences_notification_v2'));
  }
  if (error && ['PGRST202', '42883'].includes(error.code)) {
    ({ data, error } = await supabase.rpc('clutch_mes_preferences_notification_v1'));
  }
  if (error) throw error;
  return normalizePreferences(data);
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const version = preferences.expansionAvailable
    ? 3
    : preferences.retentionAvailable ? 2 : 1;
  const { data, error } = await supabase.rpc(`clutch_enregistrer_preferences_notification_v${version}`, {
    p_fuseau: preferences.timezone,
    p_verrouillage_imminent: preferences.lockImminent,
    p_debut_match: preferences.matchStart,
    p_verdict: preferences.verdict,
    p_promotion: preferences.promotion,
    p_mutation: preferences.mutation,
    p_duel_recu: preferences.duelReceived,
    ...(version >= 2 ? {
      p_serie_en_danger: preferences.streakRisk,
      p_serie_protegee: preferences.streakProtected,
      p_silence_actif: preferences.quietHoursEnabled,
      p_silence_debut: preferences.quietHoursStart,
      p_silence_fin: preferences.quietHoursEnd,
    } : {}),
    ...(version >= 3 ? { p_locale: preferences.locale } : {}),
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

export async function deactivateNotificationDevice(deviceId: string) {
  const { data, error } = await supabase.rpc('clutch_desactiver_mon_appareil_notification_v1', {
    p_appareil_id: deviceId,
  });
  if (error) throw error;
  return Math.max(0, Number(data ?? 0));
}

export async function deactivateAllNotificationTokens() {
  const { data, error } = await supabase.rpc('clutch_desactiver_mes_jetons_notification_v1');
  if (error) throw error;
  return Math.max(0, Number(data ?? 0));
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    locale: resolveLocale(typeof row.locale === 'string' ? row.locale : getActiveLocale()),
    timezone: typeof row.fuseau === 'string' && row.fuseau ? row.fuseau : detectedTimezone(),
    lockImminent: booleanOrDefault(row.verrouillage_imminent, DEFAULT_NOTIFICATION_PREFERENCES.lockImminent),
    matchStart: booleanOrDefault(row.debut_match, DEFAULT_NOTIFICATION_PREFERENCES.matchStart),
    verdict: booleanOrDefault(row.verdict, DEFAULT_NOTIFICATION_PREFERENCES.verdict),
    promotion: booleanOrDefault(row.promotion, DEFAULT_NOTIFICATION_PREFERENCES.promotion),
    mutation: booleanOrDefault(row.mutation, DEFAULT_NOTIFICATION_PREFERENCES.mutation),
    duelReceived: booleanOrDefault(row.duel_recu, DEFAULT_NOTIFICATION_PREFERENCES.duelReceived),
    streakRisk: booleanOrDefault(row.serie_en_danger, DEFAULT_NOTIFICATION_PREFERENCES.streakRisk),
    streakProtected: booleanOrDefault(row.serie_protegee, DEFAULT_NOTIFICATION_PREFERENCES.streakProtected),
    quietHoursEnabled: booleanOrDefault(row.silence_actif, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled),
    quietHoursStart: validMinute(row.silence_debut, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart),
    quietHoursEnd: validMinute(row.silence_fin, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd),
    retentionAvailable: row.retention_disponible === true,
    expansionAvailable: row.expansion_disponible === true,
    recommendation: parseRecommendation(row.recommandation),
    activeDevices: Math.max(0, Number(row.appareils_actifs ?? 0)),
  };
}

const RECOMMENDATION_CATEGORIES: NotificationRecommendationCategory[] = ['streakRisk', 'matchStart', 'duelReceived'];

function parseRecommendation(value: unknown): NotificationRecommendation | null {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  if (!row) return null;
  const source = row.source === 'activity' || row.source === 'defaults' ? row.source : null;
  const generatedAt = typeof row.genere_le === 'string' && Number.isFinite(Date.parse(row.genere_le)) ? row.genere_le : null;
  const quietHoursStart = validMinute(row.silence_debut, -1);
  const quietHoursEnd = validMinute(row.silence_fin, -1);
  const sampleSize = Number(row.echantillon);
  const categories = Array.isArray(row.categories)
    ? row.categories.filter((item): item is NotificationRecommendationCategory => RECOMMENDATION_CATEGORIES.includes(item as NotificationRecommendationCategory))
    : [];
  if (!source || !generatedAt || !Number.isFinite(sampleSize) || sampleSize < 0
    || quietHoursStart < 0 || quietHoursEnd < 0 || quietHoursStart === quietHoursEnd) return null;
  return {
    source,
    sampleSize: Math.round(sampleSize),
    quietHoursStart,
    quietHoursEnd,
    categories: [...new Set(categories)],
    generatedAt,
  };
}

function validMinute(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1440 ? value : fallback;
}

export async function recordNotificationOpened(notificationId: string) {
  // Opening an alert must not leave navigation waiting indefinitely offline.
  // The bridge still checks the current account before using its safe route.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const { data, error } = await supabase.rpc('clutch_ouvrir_notification_v2', { p_notification_id: notificationId })
      .abortSignal(controller.signal);
    if (error) throw error;
    return data === true;
  } finally {
    clearTimeout(timeout);
  }
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export function detectedTimezone() {
  return deviceTimeZone();
}
