import type { TranslationKey } from '@/src/lib/i18n';

import type { VisualConsumableType } from './types';

export type VisualConsumableCatalogItem = {
  type: VisualConsumableType;
  accent: string;
  secondaryAccent: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export const VISUAL_CONSUMABLE_CATALOG: readonly VisualConsumableCatalogItem[] = [
  {
    type: 'showcase_spotlight',
    accent: '#DFFF1F',
    secondaryAccent: '#22D3EE',
    nameKey: 'consumables.spotlight.name',
    descriptionKey: 'consumables.spotlight.description',
  },
  {
    type: 'profile_pulse',
    accent: '#E879F9',
    secondaryAccent: '#8B5CF6',
    nameKey: 'consumables.profilePulse.name',
    descriptionKey: 'consumables.profilePulse.description',
  },
] as const;

export function visualConsumableCatalogItem(type: VisualConsumableType) {
  return VISUAL_CONSUMABLE_CATALOG.find((item) => item.type === type)!;
}
