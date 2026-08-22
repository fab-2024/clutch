export type PrivacyPreferences = {
  analyticsAllowed: boolean;
  analyticsUpdatedAt: string | null;
  minimumAge: number;
  minimumAgeConfirmed: boolean;
  ageUpdatedAt: string | null;
  privacyVersion: string;
};

export type BlockedUser = {
  id: string;
  pseudo: string;
  blockedAt: string;
};

export type ProfileSafetyState = {
  isMe: boolean;
  iBlock: boolean;
  blocksMe: boolean;
};

export const REPORT_REASONS = [
  'harcelement',
  'haine',
  'spam',
  'usurpation',
  'contenu_inapproprie',
  'autre',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harcelement: 'Harcèlement',
  haine: 'Propos haineux',
  spam: 'Spam',
  usurpation: 'Usurpation',
  contenu_inapproprie: 'Contenu inapproprié',
  autre: 'Autre motif',
};
