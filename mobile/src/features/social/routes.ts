/** Current Social destinations shared by the product screens. */
export const SOCIAL_ROUTES = {
  home: '/(tabs)/social',
  friends: '/(tabs)/social/friends',
  leagues: '/(tabs)/social/leagues',
  requests: '/(tabs)/social/requests',
  duels: '/(tabs)/social/duels',
} as const;

export const SOCIAL_MISSIONS_ROUTE = {
  pathname: SOCIAL_ROUTES.duels,
  params: { missions: '1' },
} as const;
