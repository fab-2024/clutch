import Svg, { Circle, Path } from 'react-native-svg';

import type { GameId } from '../types';

const PATHS: Record<Exclude<GameId, 'rocket_league'>, string> = {
  lol: 'm1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74A9.738 9.738 0 0 1 12 3.2c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.875 3.066c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Z',
  valorant: 'M23.792 2.152a.252.252 0 0 0-.098.083c-3.384 4.23-6.769 8.46-10.15 12.69-.107.093-.025.288.119.265 2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25c.774-.967 1.55-1.934 2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23.016-.11-.1-.206-.204-.167ZM.077 2.166c-.077.038-.074.132-.076.205.002 3.074.001 6.15.001 9.225a.679.679 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247 2.455 0 4.91.003 7.365 0 .142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184Z',
};

export default function GameLogo({ game, color, size }: { game: GameId; color: string; size: number }) {
  if (game === 'rocket_league') {
    return (
      <Svg height={size} viewBox="0 0 24 24" width={size}>
        <Path d="M1.5 7.5h6M.5 12h5.5M2 16.5h5.5" fill="none" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
        <Circle cx="15.2" cy="12" fill="none" r="7.1" stroke={color} strokeWidth="1.8" />
        <Path d="m15.2 7 3.15 2.3-1.2 3.7h-3.9l-1.2-3.7L15.2 7Zm-3.15 2.3-3.7.45m10-.45 3.7.45M13.25 13l-2.2 4.15M17.15 13l2.2 4.15" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      </Svg>
    );
  }

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d={PATHS[game]} fill={color} />
    </Svg>
  );
}
