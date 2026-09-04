import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';

import { isConsumableAction, isUuid, isVisualConsumableType } from './model';
import type { PendingConsumableOperation } from './types';

const operationKey = (ownerId: string) => `@clutch/visual-consumable-operation/p3/${ownerId}`;

export function newConsumableOperationId() {
  return uuid.v4();
}

export async function loadPendingConsumableOperation(ownerId: string): Promise<PendingConsumableOperation | null> {
  const raw = await AsyncStorage.getItem(operationKey(ownerId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return isUuid(value.operationId) && isVisualConsumableType(value.type) && isConsumableAction(value.action)
      ? { operationId: value.operationId, type: value.type, action: value.action }
      : null;
  } catch {
    return null;
  }
}

export async function rememberPendingConsumableOperation(ownerId: string, operation: PendingConsumableOperation) {
  await AsyncStorage.setItem(operationKey(ownerId), JSON.stringify(operation));
}

export async function forgetPendingConsumableOperation(ownerId: string, operationId: string) {
  const current = await loadPendingConsumableOperation(ownerId);
  if (current?.operationId === operationId) await AsyncStorage.removeItem(operationKey(ownerId));
}
