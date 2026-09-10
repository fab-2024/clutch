import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import DuelsScreen from './DuelsScreen';

export default function DuelsMissionsEntryScreen() {
  const { missions } = useLocalSearchParams<{ missions?: string | string[] }>();
  const missionsRequested = (Array.isArray(missions) ? missions[0] : missions) === '1';

  const clearMissionsRequest = useCallback(() => {
    if (missionsRequested) router.setParams({ missions: undefined });
  }, [missionsRequested]);

  return (
    <DuelsScreen
      initialMissionsOpen={missionsRequested}
      onMissionsClosed={clearMissionsRequest}
    />
  );
}
