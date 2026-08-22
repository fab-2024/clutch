import { supabase } from '@/src/lib/supabase';

import type {
  BlockedUser,
  PrivacyPreferences,
  ProfileSafetyState,
  ReportReason,
} from './types';

export async function loadPrivacyPreferences(): Promise<PrivacyPreferences> {
  const { data, error } = await supabase.rpc('clutch_mes_preferences_confidentialite_v1');
  if (error) throw error;
  return normalizePreferences(data);
}

export async function savePrivacyPreferences({
  analyticsAllowed,
  minimumAgeConfirmed,
}: Pick<PrivacyPreferences, 'analyticsAllowed' | 'minimumAgeConfirmed'>): Promise<PrivacyPreferences> {
  const { data, error } = await supabase.rpc('clutch_enregistrer_preferences_confidentialite_v1', {
    p_analytics_autorise: analyticsAllowed,
    p_age_minimum_confirme: minimumAgeConfirmed,
  });
  if (error) throw error;
  return normalizePreferences(data);
}

export async function loadBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('clutch_mes_utilisateurs_bloques_v1');
  if (error) throw error;
  return Array.isArray(data)
    ? data.map((value) => {
        const row = asRecord(value);
        return {
          id: String(row.id ?? ''),
          pseudo: String(row.pseudo ?? 'Joueur'),
          blockedAt: String(row.bloque_le ?? ''),
        };
      }).filter((row) => Boolean(row.id))
    : [];
}

export async function loadProfileSafetyState(pseudo: string): Promise<ProfileSafetyState | null> {
  const { data, error } = await supabase.rpc('clutch_etat_securite_profil_v1', {
    p_pseudo: pseudo.trim(),
  });
  if (error) throw error;
  if (!data) return null;
  const row = asRecord(data);
  return {
    isMe: row.est_moi === true,
    iBlock: row.je_bloque === true,
    blocksMe: row.me_bloque === true,
  };
}

export async function blockUser(pseudo: string): Promise<ProfileSafetyState> {
  const { data, error } = await supabase.rpc('clutch_bloquer_utilisateur_v1', {
    p_pseudo: pseudo.trim(),
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    isMe: row.est_moi === true,
    iBlock: row.je_bloque === true,
    blocksMe: row.me_bloque === true,
  };
}

export async function unblockUser(pseudo: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('clutch_debloquer_utilisateur_v1', {
    p_pseudo: pseudo.trim(),
  });
  if (error) throw error;
  return data === true;
}

export async function reportUser(pseudo: string, reason: ReportReason) {
  const { data, error } = await supabase.rpc('clutch_signaler_utilisateur_v1', {
    p_pseudo: pseudo.trim(),
    p_motif: reason,
    p_detail: null,
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    accepted: row.accepte === true,
    reportId: String(row.signalement_id ?? ''),
  };
}

function normalizePreferences(value: unknown): PrivacyPreferences {
  const row = asRecord(value);
  return {
    analyticsAllowed: row.analytics_autorise === true,
    analyticsUpdatedAt: nullableString(row.analytics_maj_le),
    minimumAge: Math.max(15, Number(row.age_minimum ?? 15)),
    minimumAgeConfirmed: row.age_minimum_confirme === true,
    ageUpdatedAt: nullableString(row.age_maj_le),
    privacyVersion: String(row.version_confidentialite ?? '2026-08-22'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}
