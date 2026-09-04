import { t } from '@/src/lib/i18n';

import type {
  ConsumableAction,
  ConsumableOperationReceipt,
  PublicVisualEffect,
  VisualConsumable,
  VisualConsumablesState,
  VisualConsumableType,
} from './types';

const TYPES: VisualConsumableType[] = ['showcase_spotlight', 'profile_pulse'];
const ACTIONS: ConsumableAction[] = ['purchase', 'activation'];
const CONTRACT: Record<VisualConsumableType, { maxStock: number; priceVolts: number }> = {
  showcase_spotlight: { maxStock: 3, priceVolts: 60 },
  profile_pulse: { maxStock: 3, priceVolts: 45 },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ConsumableError extends Error {
  constructor(public code: string, public definitive = false) {
    super(code);
    this.name = 'ConsumableError';
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function isVisualConsumableType(value: unknown): value is VisualConsumableType {
  return TYPES.includes(value as VisualConsumableType);
}

export function isConsumableAction(value: unknown): value is ConsumableAction {
  return ACTIONS.includes(value as ConsumableAction);
}

export function parseVisualConsumablesState(value: unknown, ownerId: string, now = Date.now()): VisualConsumablesState {
  const raw = record(value);
  if (raw.expansion_disponible !== true || raw.impact_classement !== false || raw.conversion_frags !== false) {
    throw new ConsumableError('invalid_response');
  }
  const items = Array.isArray(raw.consommables) ? raw.consommables.map(parseItem) : [];
  if (items.length !== TYPES.length || TYPES.some((type) => !items.some((item) => item.type === type))) {
    throw new ConsumableError('invalid_response');
  }
  const history = Array.isArray(raw.historique) ? raw.historique.map((entry) => {
    const row = record(entry);
    if (!isUuid(row.id) || !isUuid(row.operation_id) || !isVisualConsumableType(row.type)
      || !isConsumableAction(row.action) || !validDate(row.cree_le)) throw new ConsumableError('invalid_response');
    return { id: row.id, operationId: row.operation_id, type: row.type, action: row.action, createdAt: row.cree_le };
  }) : [];
  return {
    ownerId,
    balanceVolts: nonNegativeInteger(raw.solde_volts),
    items,
    history,
    affectsRanking: false,
    convertsToFrags: false,
    receivedAt: now,
  };
}

function parseItem(value: unknown): VisualConsumable {
  const row = record(value);
  if (!isVisualConsumableType(row.type)) throw new ConsumableError('invalid_response');
  const stock = nonNegativeInteger(row.stock);
  const maxStock = positiveInteger(row.stock_max);
  const priceVolts = positiveInteger(row.prix_volts);
  const contract = CONTRACT[row.type];
  if (stock > maxStock || maxStock !== contract.maxStock || priceVolts !== contract.priceVolts) {
    throw new ConsumableError('invalid_response');
  }
  return {
    type: row.type,
    stock,
    maxStock,
    priceVolts,
    activeUntil: row.actif_jusqua == null ? null : validDate(row.actif_jusqua) ? row.actif_jusqua : invalid(),
  };
}

export function parseConsumableReceipt(value: unknown, ownerId: string, expected: {
  operationId: string;
  action: ConsumableAction;
}) : ConsumableOperationReceipt {
  const raw = record(value);
  if (raw.operation_id !== expected.operationId || raw.action !== expected.action || typeof raw.applique !== 'boolean') {
    throw new ConsumableError('invalid_response');
  }
  const movementId = raw.mouvement_id == null ? null : isUuid(raw.mouvement_id) ? raw.mouvement_id : invalid();
  if ((expected.action === 'purchase') !== Boolean(movementId)) throw new ConsumableError('invalid_response');
  return {
    operationId: expected.operationId,
    action: expected.action,
    applied: raw.applique,
    movementId,
    state: parseVisualConsumablesState(raw.etat, ownerId),
  };
}

export function parsePublicVisualEffects(value: unknown): PublicVisualEffect[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = record(entry);
    if (!isVisualConsumableType(row.type) || !validDate(row.actif_jusqua)) throw new ConsumableError('invalid_response');
    return { type: row.type, activeUntil: row.actif_jusqua };
  });
}

export function consumableErrorMessage(caught: unknown) {
  const code = caught instanceof ConsumableError ? caught.code : '';
  if (code === 'insufficient_volts') return t('consumables.error.insufficient');
  if (code === 'consumable_stock_full') return t('consumables.error.stockFull');
  if (code === 'consumable_stock_empty') return t('consumables.error.noStock');
  if (code === 'effect_already_active') return t('consumables.error.alreadyActive');
  return t('consumables.error.unavailable');
}

export function effectIsActive(item: VisualConsumable, now = Date.now()) {
  return Boolean(item.activeUntil && Date.parse(item.activeUntil) > now);
}

export function remainingEffectLabel(activeUntil: string, now = Date.now()) {
  const totalMinutes = Math.max(0, Math.ceil((Date.parse(activeUntil) - now) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} H ${minutes.toString().padStart(2, '0')}` : `${minutes} MIN`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nonNegativeInteger(value: unknown) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) return invalid();
  return result;
}

function positiveInteger(value: unknown) {
  const result = nonNegativeInteger(value);
  if (result < 1) return invalid();
  return result;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function invalid(): never {
  throw new ConsumableError('invalid_response');
}
