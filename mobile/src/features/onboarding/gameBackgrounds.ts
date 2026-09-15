import type { ImageSourcePropType } from 'react-native';

import type { GameId } from './types';

export const GAME_BACKGROUNDS: Record<GameId, ImageSourcePropType> = {
  lol: require('../../../assets/onboarding/lol-crystal-crown-v2.png'),
  valorant: require('../../../assets/onboarding/valorant-monoliths-v2.png'),
  rocket_league: require('../../../assets/onboarding/rocket-league-action-v2.png'),
};
