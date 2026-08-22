import { supabase } from '@/src/lib/supabase';

import type { AnalyticsEventInput, AnalyticsReceipt } from './types';

export async function trackAnalyticsEvent(input: AnalyticsEventInput): Promise<AnalyticsReceipt> {
  const { data, error } = await supabase.rpc('clutch_enregistrer_evenement_analytics_v1', {
    p_type: input.type,
    p_objet_id: input.itemId?.trim() || null,
    p_campagne_key: input.campaignKey?.trim() || null,
    p_cle_idempotence: input.idempotencyKey?.trim() || null,
  });

  if (error) throw error;

  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return {
    accepted: payload.accepte === true,
    isNew: payload.nouveau === true,
    type: input.type,
    scope: 'first_party_aggregate_only',
  };
}
