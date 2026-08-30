import type { ImageSourcePropType } from 'react-native';

import type { GameId } from './types';

export const GAME_BACKGROUNDS: Record<GameId, ImageSourcePropType> = {
  lol: require('../../../assets/onboarding/lol-characters.jpg'),
  valorant: require('../../../assets/onboarding/valorant-characters.jpg'),
  rocket_league: require('../../../assets/onboarding/rocket-league-arena.png'),
};
