export type VisualConsumableType = 'showcase_spotlight' | 'profile_pulse';
export type ConsumableAction = 'purchase' | 'activation';

export type VisualConsumable = {
  type: VisualConsumableType;
  stock: number;
  maxStock: number;
  priceVolts: number;
  activeUntil: string | null;
};

export type ConsumableHistoryItem = {
  id: string;
  operationId: string;
  type: VisualConsumableType;
  action: ConsumableAction;
  createdAt: string;
};

export type VisualConsumablesState = {
  ownerId: string;
  balanceVolts: number;
  items: VisualConsumable[];
  history: ConsumableHistoryItem[];
  affectsRanking: false;
  convertsToFrags: false;
  receivedAt: number;
};

export type ConsumableOperationReceipt = {
  operationId: string;
  applied: boolean;
  action: ConsumableAction;
  movementId: string | null;
  state: VisualConsumablesState;
};

export type PendingConsumableOperation = {
  operationId: string;
  type: VisualConsumableType;
  action: ConsumableAction;
};

export type PublicVisualEffect = {
  type: VisualConsumableType;
  activeUntil: string;
};
