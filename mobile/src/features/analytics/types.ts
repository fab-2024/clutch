export const CLIENT_ANALYTICS_EVENTS = [
  'app_opened',
  'application_active',
  'collection_affichee',
  'objet_consulte',
  'onboarding_commence',
  'onboarding_termine',
  'match_consulte',
  'call_commence',
  'call_verrouille',
  'resultat_consulte',
  'rank_consulte',
  'profil_public_consulte',
  'achat_commence',
  'notification_ouverte',
] as const;

export type ClientAnalyticsEvent = (typeof CLIENT_ANALYTICS_EVENTS)[number];

export type AnalyticsEventInput = {
  type: ClientAnalyticsEvent;
  itemId?: string | null;
  campaignKey?: string | null;
  idempotencyKey?: string | null;
};

export type AnalyticsReceipt = {
  accepted: boolean;
  isNew: boolean;
  type: ClientAnalyticsEvent;
  scope: 'first_party_aggregate_only';
  reason: 'consentement_requis' | null;
};
