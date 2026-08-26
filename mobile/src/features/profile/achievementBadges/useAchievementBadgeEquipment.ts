import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  assignBadgeToShowcaseSlot,
  emptyAchievementBadgeSlots,
  loadAchievementBadgeEquipment,
  normalizeAchievementBadgeSlots,
  saveAchievementBadgeEquipment,
  subscribeAchievementBadgeEquipment,
  type AchievementBadgeSlots,
} from './equipment';
import type { BadgeId, PublicAchievementBadge } from './types';

export function useAchievementBadgeEquipment(
  ownerKey: string,
  fallback: readonly (BadgeId | null)[] = emptyAchievementBadgeSlots(),
) {
  const fallbackKey = fallback.join('|');
  const normalizedFallback = useMemo(
    () => normalizeAchievementBadgeSlots(fallback),
    [fallbackKey],
  );
  const [slots, setSlots] = useState<AchievementBadgeSlots>(() => normalizedFallback);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    void loadAchievementBadgeEquipment(ownerKey)
      .then((stored) => {
        if (requestRef.current === requestId) {
          setSlots(stored ?? normalizedFallback);
        }
      })
      .catch(() => {
        if (requestRef.current === requestId) setSlots(normalizedFallback);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [normalizedFallback, ownerKey]);

  useEffect(() => subscribeAchievementBadgeEquipment((updatedOwner, nextSlots) => {
    if (updatedOwner === ownerKey) setSlots(nextSlots);
  }), [ownerKey]);

  const equip = useCallback(async (
    slotIndex: number,
    badgeId: BadgeId | null,
    collection: readonly PublicAchievementBadge[],
  ) => {
    const previous = slots;
    const next = assignBadgeToShowcaseSlot(previous, slotIndex, badgeId, collection);
    setSlots(next);
    try {
      await saveAchievementBadgeEquipment(ownerKey, next);
    } catch (error) {
      setSlots(previous);
      throw error;
    }
  }, [ownerKey, slots]);

  return { equip, loading, slots };
}
