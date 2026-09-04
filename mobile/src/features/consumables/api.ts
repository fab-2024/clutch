import { supabase } from '@/src/lib/supabase';

import { ConsumableError, isConsumableAction, isUuid, isVisualConsumableType, parseConsumableReceipt, parseVisualConsumablesState } from './model';
import type { ConsumableAction, VisualConsumableType } from './types';

async function request(rpc: string, args: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const { data, error } = await supabase.rpc(rpc, args).abortSignal(controller.signal);
    if (error) {
      const reason = [
        'insufficient_volts',
        'consumable_stock_full',
        'consumable_stock_empty',
        'effect_already_active',
        'operation_conflict',
        'invalid_consumable_type',
        'purchase_operation_required',
        'activation_operation_required',
      ]
        .find((message) => error.message === message);
      throw new ConsumableError(reason ?? error.code ?? 'network', Boolean(reason));
    }
    return data;
  } catch (error) {
    if (error instanceof ConsumableError) throw error;
    throw new ConsumableError('network');
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadVisualConsumables(ownerId: string) {
  return parseVisualConsumablesState(await request('clutch_mes_consommables_visuels_p3', {}), ownerId);
}

export async function runConsumableOperation(ownerId: string, type: VisualConsumableType, action: ConsumableAction, operationId: string) {
  if (!isUuid(operationId) || !isVisualConsumableType(type) || !isConsumableAction(action)) {
    throw new ConsumableError('invalid_operation', true);
  }
  const rpc = action === 'purchase' ? 'clutch_acheter_consommable_visuel_p3' : 'clutch_activer_consommable_visuel_p3';
  const raw = await request(rpc, { p_type: type, p_operation: operationId });
  return parseConsumableReceipt(raw, ownerId, { operationId, action });
}
