import AsyncStorage from '@react-native-async-storage/async-storage';

import { isUuid } from './model';

const operationKey = (ownerId: string) => `@clutch/streak-protector-purchase/v1/${ownerId}`;

export async function loadPendingProtectorPurchase(ownerId: string) {
  const operation = await AsyncStorage.getItem(operationKey(ownerId));
  return isUuid(operation) ? operation : null;
}

export async function rememberProtectorPurchase(ownerId: string, operationId: string) {
  // Storage must succeed BEFORE the debit request. If a response is lost or
  // the app is killed, the next attempt reuses this same, account-bound key.
  await AsyncStorage.setItem(operationKey(ownerId), operationId);
}

export async function forgetProtectorPurchase(ownerId: string, operationId: string) {
  if (await loadPendingProtectorPurchase(ownerId) === operationId) {
    await AsyncStorage.removeItem(operationKey(ownerId));
  }
}
