import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadShowcaseRingEquipment,
  saveShowcaseRingEquipment,
  subscribeShowcaseRingEquipment,
} from './equipment';
import type { ShowcaseRingFamily } from './types';

export function useShowcaseRingEquipment(
  ownerKey: string,
  fallback: ShowcaseRingFamily | null = null,
) {
  const [family, setFamily] = useState<ShowcaseRingFamily | null>(fallback);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    void loadShowcaseRingEquipment(ownerKey)
      .then((stored) => {
        if (requestRef.current === requestId) setFamily(stored ?? fallback);
      })
      .catch(() => {
        if (requestRef.current === requestId) setFamily(fallback);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [fallback, ownerKey]);

  useEffect(() => subscribeShowcaseRingEquipment((updatedOwner, updatedFamily) => {
    if (updatedOwner === ownerKey) setFamily(updatedFamily);
  }), [ownerKey]);

  const equip = useCallback(async (next: ShowcaseRingFamily | null) => {
    const previous = family;
    setFamily(next);
    try {
      await saveShowcaseRingEquipment(ownerKey, next);
    } catch (error) {
      setFamily(previous);
      throw error;
    }
  }, [family, ownerKey]);

  return { equip, family, loading };
}
