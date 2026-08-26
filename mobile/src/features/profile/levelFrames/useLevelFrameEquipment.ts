import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  isLevelFrameVariant,
  loadLevelFrameEquipment,
  resolveLevelFrameEquip,
  saveLevelFrameEquipment,
  subscribeLevelFrameEquipment,
} from './equipment';
import type { LevelFrameVariant } from './types';

export function useLevelFrameEquipment(
  ownerKey: string,
  owned: readonly LevelFrameVariant[],
  fallback: LevelFrameVariant = 'signalAscendant',
) {
  const ownedKey = owned.join('|');
  const normalizedOwned = useMemo<readonly LevelFrameVariant[]>(
    () => Array.from(new Set<LevelFrameVariant>([
      'signalAscendant',
      ...ownedKey.split('|').filter(isLevelFrameVariant),
    ])),
    [ownedKey],
  );
  const [variant, setVariant] = useState<LevelFrameVariant>(fallback);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    void loadLevelFrameEquipment(ownerKey)
      .then((stored) => {
        if (requestRef.current !== requestId) return;
        setVariant(resolveLevelFrameEquip(fallback, stored ?? fallback, normalizedOwned));
      })
      .catch(() => {
        if (requestRef.current === requestId) setVariant(fallback);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [fallback, normalizedOwned, ownerKey]);

  useEffect(() => subscribeLevelFrameEquipment((updatedOwner, next) => {
    if (updatedOwner === ownerKey) {
      setVariant((current) => resolveLevelFrameEquip(current, next, normalizedOwned));
    }
  }), [normalizedOwned, ownerKey]);

  const equip = useCallback(async (next: LevelFrameVariant) => {
    const resolved = resolveLevelFrameEquip(variant, next, normalizedOwned);
    if (resolved !== next) throw new Error('Ce cadre de niveau est verrouillé.');
    const previous = variant;
    setVariant(next);
    try {
      await saveLevelFrameEquipment(ownerKey, next);
    } catch (error) {
      setVariant(previous);
      throw error;
    }
  }, [normalizedOwned, ownerKey, variant]);

  return { equip, loading, owned: normalizedOwned, variant };
}
