import { useCallback, useEffect, useRef, useState } from 'react';

import type { ShowcasePedestalAssignmentIds } from '../components/showcase/roomEditor';
import {
  loadShowcasePedestalEquipment,
  saveShowcasePedestalEquipment,
  subscribeShowcasePedestalEquipment,
} from './equipment';

export function useShowcasePedestalEquipment(ownerKey: string) {
  const [assignments, setAssignments] = useState<ShowcasePedestalAssignmentIds>({});
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    void loadShowcasePedestalEquipment(ownerKey)
      .then((stored) => {
        if (requestRef.current === requestId) setAssignments(stored);
      })
      .catch(() => {
        if (requestRef.current === requestId) setAssignments({});
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [ownerKey]);

  useEffect(() => subscribeShowcasePedestalEquipment((updatedOwner, updatedAssignments) => {
    if (updatedOwner === ownerKey) setAssignments(updatedAssignments);
  }), [ownerKey]);

  const equip = useCallback(async (next: ShowcasePedestalAssignmentIds) => {
    const previous = assignments;
    setAssignments(next);
    try {
      await saveShowcasePedestalEquipment(ownerKey, next);
    } catch (error) {
      setAssignments(previous);
      throw error;
    }
  }, [assignments, ownerKey]);

  return { assignments, equip, loading };
}
