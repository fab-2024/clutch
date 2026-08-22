export const CLIENT_ANALYTICS_EVENTS = [
  'application_active',
  'collection_affichee',
  'objet_consulte',
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
};
