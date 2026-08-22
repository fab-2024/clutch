export const CLIENT_ANALYTICS_EVENTS = [
  'application_active',
  'collection_affichee',
  'objet_consulte',
  'founder_pack_affiche',
  'founder_pack_achat_demarre',
  'founder_pack_restauration_demandee',
  'founder_pack_achat_annule',
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
