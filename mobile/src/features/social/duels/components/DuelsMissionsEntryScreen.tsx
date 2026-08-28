import { router, usePathname } from 'expo-router';
import { useCallback } from 'react';

import DuelsScreen from './DuelsScreen';

export default function DuelsMissionsEntryScreen() {
  const pathname = usePathname();
  const missionsAlias = isMissionsAliasPath(pathname);

  const returnToCanonicalRoute = useCallback(() => {
    if (missionsAlias) router.replace('/(tabs)/social/duels');
  }, [missionsAlias]);

  return (
    <DuelsScreen
      initialMissionsOpen={missionsAlias}
      onMissionsClosed={returnToCanonicalRoute}
    />
  );
}

export function isMissionsAliasPath(pathname: string) {
  return pathname.includes('/social/missions');
}
