import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

import { loadProfileData } from '../api';
import type { LevelState } from '../types';

type ProfileLevelSnapshot = {
  level: LevelState;
  pseudo: string;
  userId: string;
};

export function useProfileLevel(userId?: string, pseudo?: string) {
  const [snapshot, setSnapshot] = useState<ProfileLevelSnapshot | null>(null);

  useFocusEffect(useCallback(() => {
    if (!userId || !pseudo) return undefined;
    const owner = { pseudo, userId };
    let active = true;
    let requestId = 0;

    async function refresh() {
      const currentRequest = ++requestId;
      try {
        const profile = await loadProfileData(owner.pseudo);
        if (active && currentRequest === requestId) {
          setSnapshot({ ...owner, level: profile.level });
        }
      } catch {
        // Keep the last confirmed level when the connection is unavailable.
      }
    }

    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [pseudo, userId]));

  return snapshot?.userId === userId && snapshot?.pseudo === pseudo
    ? snapshot?.level ?? null
    : null;
}
