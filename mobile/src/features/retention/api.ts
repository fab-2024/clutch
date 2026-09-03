import { supabase } from '@/src/lib/supabase';

import { CallStreakError, isUuid, parseCallStreakState } from './model';
import type { ProtectorPurchaseReceipt, StreakMilestone } from './types';

async function request(rpc: string, args: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const { data, error } = await supabase.rpc(rpc, args).abortSignal(controller.signal);
    if (error) {
      const reason = ['protector_stock_full', 'insufficient_volts', 'streak_milestone_locked'].find((message) => error.message === message);
      throw new CallStreakError(reason ?? error.code ?? 'network', Boolean(reason));
    }
    return data;
  } catch (error) {
    if (error instanceof CallStreakError) throw error;
    throw new CallStreakError('network');
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadCallStreak(ownerId: string, timeZone: string) {
  return parseCallStreakState(await request('clutch_ma_serie_calls_v1', { p_fuseau: timeZone }), ownerId);
}

export async function purchaseStreakProtector(ownerId: string, operationId: string): Promise<ProtectorPurchaseReceipt> {
  if (!isUuid(operationId)) throw new CallStreakError('invalid_operation', true);
  const raw = await request('clutch_acheter_protecteur_serie_v1', { p_operation: operationId });
  if (!raw || raw.operation_id !== operationId || typeof raw.achete !== 'boolean' || !isUuid(raw.mouvement_id)) {
    throw new CallStreakError('invalid_response');
  }
  return { operationId, purchased: raw.achete, movementId: raw.mouvement_id, state: parseCallStreakState(raw.etat, ownerId) };
}

export async function selectStreakMilestone(ownerId: string, days: StreakMilestone | null) {
  return parseCallStreakState(await request('clutch_selectionner_jalon_serie_v1', { p_palier: days }), ownerId);
}
