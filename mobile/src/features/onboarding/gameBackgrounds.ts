import type { ImageSourcePropType } from 'react-native';

import type { GameId } from './types';

export const GAME_BACKGROUNDS: Record<GameId, ImageSourcePropType> = {
  lol: require('../../../assets/onboarding/lol-characters.jpg'),
  valorant: require('../../../assets/onboarding/valorant-characters.jpg'),
  cs2: require('../../../assets/onboarding/cs2-operators.jpg'),
};
