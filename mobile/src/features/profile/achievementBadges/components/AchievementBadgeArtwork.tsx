import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { BadgeVisualFamily, PublicAchievementBadge } from '../types';

type AchievementBadgeArtworkProps = {
  badge: PublicAchievementBadge;
  muted?: boolean;
  showStand?: boolean;
  size?: number;
  testID?: string;
};

export default function AchievementBadgeArtwork({
  badge,
  muted = false,
  showStand = true,
  size = 72,
  testID,
}: AchievementBadgeArtworkProps) {
  const accent = muted ? '#56616A' : badge.accent;
  const height = size * 1.12;
  const ids = gradientIds(badge.id);

  return (
    <View
      accessibilityLabel={`${badge.obtained ? 'Anneau débloqué' : 'Anneau verrouillé'}, ${badge.name}`}
      accessible
      style={{ height, width: size }}
      testID={testID ?? `achievement-badge-artwork-${badge.id}`}
    >
      <Svg height={height} pointerEvents="none" viewBox="0 0 100 112" width={size}>
        <BadgeDefs accent={accent} ids={ids} />
        <Ellipse cx="50" cy="103" fill="rgba(0,0,0,.68)" rx="34" ry="4" />
        {showStand ? <BadgeStand ids={ids} /> : null}
        <G opacity={muted ? 0.58 : 1}>
          <BadgeShell accent={accent} family={badge.visualFamily} ids={ids} />
          <BadgeSymbol accent={accent} family={badge.visualFamily} ids={ids} />
          <Path d="M25 27 Q50 12 75 27" fill="none" opacity=".34" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.25" />
        </G>
      </Svg>
    </View>
  );
}

type GradientIds = ReturnType<typeof gradientIds>;

function BadgeDefs({ accent, ids }: { accent: string; ids: GradientIds }) {
  return (
    <Defs>
      <LinearGradient id={ids.metal} x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#E7E9E7" />
        <Stop offset={0.16} stopColor="#626970" />
        <Stop offset={0.42} stopColor="#171B1E" />
        <Stop offset={0.72} stopColor="#444A4F" />
        <Stop offset="1" stopColor="#0A0D0F" />
      </LinearGradient>
      <LinearGradient id={ids.dark} x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#252B30" />
        <Stop offset={0.48} stopColor="#080B0E" />
        <Stop offset="1" stopColor="#12171B" />
      </LinearGradient>
      <LinearGradient id={ids.accent} x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity=".82" />
        <Stop offset={0.18} stopColor={accent} />
        <Stop offset={0.72} stopColor={accent} stopOpacity=".72" />
        <Stop offset="1" stopColor="#050709" />
      </LinearGradient>
      <RadialGradient cx="50%" cy="38%" id={ids.core} r="60%">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset={0.18} stopColor={accent} />
        <Stop offset={0.72} stopColor={accent} stopOpacity=".5" />
        <Stop offset="1" stopColor="#050709" />
      </RadialGradient>
    </Defs>
  );
}

function BadgeStand({ ids }: { ids: GradientIds }) {
  return (
    <G>
      <Path d="M39 88 L61 88 L65 99 L35 99 Z" fill={`url(#${ids.dark})`} stroke="#454B50" strokeWidth="1" />
      <Rect fill="#07090B" height="6" rx="2" stroke="#33383C" strokeWidth="1" width="48" x="26" y="96" />
      <Line opacity=".46" stroke="#A8AFB3" strokeWidth=".8" x1="31" x2="69" y1="97" y2="97" />
    </G>
  );
}

function BadgeShell({ accent, family, ids }: { accent: string; family: BadgeVisualFamily; ids: GradientIds }) {
  if (family.startsWith('sealed-') || family.startsWith('revealed-')) {
    return <SecretShell accent={accent} family={family} ids={ids} />;
  }
  if (family.includes('shield') || family === 'standard-bronze' || family === 'reinforced-bronze') {
    return (
      <G>
        <Polygon fill="#020405" opacity=".9" points="50,8 82,21 78,69 50,90 22,69 18,21" transform="translate(0 3)" />
        <Polygon fill={`url(#${ids.metal})`} points="50,8 82,21 78,69 50,90 22,69 18,21" stroke="#111518" strokeWidth="2" />
        <Polygon fill={`url(#${ids.dark})`} points="50,14 75,25 71,64 50,81 29,64 25,25" stroke={accent} strokeOpacity=".45" strokeWidth="1.2" />
      </G>
    );
  }
  if (family === 'split-diamond-amber') {
    return (
      <G>
        <Polygon fill="#020405" points="50,6 83,45 65,88 35,88 17,45" transform="translate(0 3)" />
        <Polygon fill={`url(#${ids.metal})`} points="50,6 83,45 65,88 35,88 17,45" stroke="#090B0D" strokeWidth="2" />
        <Polygon fill={`url(#${ids.dark})`} points="50,14 74,45 59,79 41,79 26,45" stroke={accent} strokeOpacity=".45" strokeWidth="1" />
      </G>
    );
  }
  if (family === 'linked-nodes-amber' || family === 'linked-nodes-volt') {
    return (
      <G>
        <Path d="M50 8 Q62 8 82 53 Q86 65 76 76 Q67 86 54 82 L46 82 Q33 86 24 76 Q14 65 18 53 Q38 8 50 8 Z" fill="#020405" transform="translate(0 3)" />
        <Path d="M50 8 Q62 8 82 53 Q86 65 76 76 Q67 86 54 82 L46 82 Q33 86 24 76 Q14 65 18 53 Q38 8 50 8 Z" fill={`url(#${ids.metal})`} stroke="#111416" strokeWidth="2" />
        <Path d="M50 16 Q59 16 74 54 Q77 63 70 70 Q63 77 54 74 L46 74 Q37 77 30 70 Q23 63 26 54 Q41 16 50 16 Z" fill={`url(#${ids.dark})`} stroke={accent} strokeOpacity=".42" />
      </G>
    );
  }
  if (family === 'crystal-hourglass') {
    return (
      <G>
        <Polygon fill="#020405" points="31,7 69,7 78,22 62,48 78,74 68,89 32,89 22,74 38,48 22,22" transform="translate(0 3)" />
        <Polygon fill={`url(#${ids.metal})`} points="31,7 69,7 78,22 62,48 78,74 68,89 32,89 22,74 38,48 22,22" stroke="#101316" strokeWidth="2" />
        <Path d="M30 17 L70 17 L56 47 L70 79 L30 79 L44 47 Z" fill={`url(#${ids.dark})`} stroke={accent} strokeOpacity=".58" strokeWidth="1.2" />
      </G>
    );
  }
  if (family === 'legend-medallion') {
    return (
      <G>
        <Polygon fill="#020405" points="50,4 60,18 78,12 76,31 94,38 80,50 92,66 73,69 70,88 53,80 40,94 31,77 12,80 18,61 4,50 20,39 16,20 35,22" transform="translate(0 2)" />
        <Polygon fill={`url(#${ids.metal})`} points="50,4 60,18 78,12 76,31 94,38 80,50 92,66 73,69 70,88 53,80 40,94 31,77 12,80 18,61 4,50 20,39 16,20 35,22" stroke="#111416" strokeWidth="2" />
        <Circle cx="50" cy="49" fill={`url(#${ids.dark})`} r="27" stroke={accent} strokeOpacity=".56" strokeWidth="1.4" />
      </G>
    );
  }
  return (
    <G>
      <Circle cx="50" cy="49" fill="#020405" r="41" transform="translate(0 3)" />
      <Circle cx="50" cy="49" fill={`url(#${ids.metal})`} r="41" stroke="#111416" strokeWidth="2" />
      <Circle cx="50" cy="49" fill={`url(#${ids.dark})`} r="33" stroke={accent} strokeOpacity=".52" strokeWidth="1.3" />
    </G>
  );
}

function BadgeSymbol({ accent, family, ids }: { accent: string; family: BadgeVisualFamily; ids: GradientIds }) {
  if (family.startsWith('sealed-') || family.startsWith('revealed-')) {
    return <SecretSymbol accent={accent} family={family} ids={ids} />;
  }
  if (family.startsWith('circular-target')) {
    return (
      <G>
        <Circle cx="50" cy="49" fill="none" r="23" stroke={accent} strokeOpacity=".72" strokeWidth="3" />
        <Circle cx="50" cy="49" fill="none" r="16" stroke="#C9D1D6" strokeOpacity=".55" />
        <Crystal accent={accent} ids={ids} points="50,29 60,49 50,69 40,49" />
        {[0, 90, 180, 270].map((rotation) => <Rect fill={accent} height="7" key={rotation} transform={`rotate(${rotation} 50 49)`} width="2" x="49" y="9" />)}
      </G>
    );
  }
  if (family.includes('chevron-shield')) {
    return (
      <G>
        {[0, 1, 2].map((index) => (
          <Polygon fill={index === 0 ? `url(#${ids.accent})` : accent} key={index} opacity={1 - index * .16} points={`${32},${30 + index * 14} 50,${41 + index * 14} 68,${30 + index * 14} 68,${39 + index * 14} 50,${50 + index * 14} 32,${39 + index * 14}`} />
        ))}
      </G>
    );
  }
  if (family === 'split-diamond-amber') {
    return (
      <G>
        <Polygon fill="#30363B" points="48,18 48,73 26,48" stroke="#828A90" />
        <Polygon fill="#111519" points="52,18 74,48 52,73" stroke="#4B5359" />
        <Crystal accent={accent} ids={ids} points="50,35 59,49 50,64 41,49" />
        <Line stroke={accent} strokeOpacity=".45" strokeWidth="2" x1="25" x2="40" y1="72" y2="60" />
      </G>
    );
  }
  if (family === 'mechanism-cyan' || family === 'segmented-mechanism') {
    return (
      <G>
        <Circle cx="50" cy="49" fill="none" r="24" stroke="#717A81" strokeDasharray={family === 'segmented-mechanism' ? '8 5' : '3 3'} strokeWidth="4" />
        <Circle cx="50" cy="49" fill="none" r="15" stroke={accent} strokeOpacity=".72" strokeWidth="2" />
        <Crystal accent={accent} ids={ids} points="50,35 59,49 50,63 41,49" />
      </G>
    );
  }
  if (family.startsWith('compass')) {
    const five = family === 'compass-five';
    return (
      <G>
        <Circle cx="50" cy="49" fill="none" r="25" stroke="#68727A" strokeWidth="2" />
        <Polygon fill={`url(#${ids.metal})`} points="50,17 57,42 83,49 57,56 50,81 43,56 17,49 43,42" stroke="#B5BDC2" strokeWidth="1" />
        {five ? [18, 34, 50, 66, 82].map((x) => <Circle cx={x} cy={x === 50 ? 20 : 49} fill={accent} key={x} r="2.3" />) : null}
        <Circle cx="50" cy="49" fill={`url(#${ids.core})`} r="9" stroke="#E7EEF2" />
      </G>
    );
  }
  if (family.startsWith('linked-nodes')) {
    return (
      <G>
        <Path d="M50 28 L31 63 L69 63 Z" fill="none" stroke="#777F85" strokeWidth="5" />
        {[[50, 27], [29, 65], [71, 65]].map(([x, y]) => <Circle cx={x} cy={y} fill={`url(#${ids.metal})`} key={`${x}-${y}`} r="9" stroke={accent} strokeOpacity=".7" />)}
        <Crystal accent={accent} ids={ids} points="50,39 58,50 50,62 42,50" />
      </G>
    );
  }
  if (family === 'standard-bronze' || family === 'reinforced-bronze') {
    return (
      <G>
        <Path d="M33 25 L33 69 M67 25 L67 69 M33 34 L50 22 L67 34" fill="none" stroke="#B17747" strokeWidth={family === 'reinforced-bronze' ? 4 : 2.4} />
        {family === 'reinforced-bronze' ? <Path d="M26 47 H74 M30 60 H70" stroke="#5C3B26" strokeWidth="3" /> : null}
        <Crystal accent={accent} ids={ids} points="50,29 59,49 50,70 41,49" />
      </G>
    );
  }
  if (family === 'crystal-hourglass') {
    return (
      <G>
        <Crystal accent={accent} ids={ids} points="50,20 65,37 50,50 35,37" />
        <Crystal accent={accent} ids={ids} points="50,48 65,67 50,79 35,67" />
        <Circle cx="50" cy="49" fill="#E9EDF0" r="5" stroke={accent} />
      </G>
    );
  }
  return (
    <G>
      {[0, 45, 90, 135].map((rotation) => <Polygon fill="#B88D55" key={rotation} points="50,8 56,29 50,36 44,29" transform={`rotate(${rotation} 50 49)`} />)}
      <Circle cx="50" cy="49" fill="#080B0D" r="19" stroke={accent} strokeWidth="2" />
      <Crystal accent={accent} ids={ids} points="50,31 64,49 50,68 36,49" />
    </G>
  );
}

function SecretShell({ accent, family, ids }: { accent: string; family: BadgeVisualFamily; ids: GradientIds }) {
  if (family.includes('eclipse')) {
    return (
      <G>
        <Circle cx="50" cy="49" fill="#020405" r="41" transform="translate(0 3)" />
        <Circle cx="50" cy="49" fill={`url(#${ids.metal})`} r="41" stroke="#0B0E10" strokeWidth="2" />
        <Circle cx="50" cy="49" fill={`url(#${ids.dark})`} r="33" stroke={accent} strokeOpacity=".34" />
      </G>
    );
  }
  if (family.includes('countercurrent')) {
    return (
      <G>
        <Polygon fill="#020405" points="50,6 82,24 82,69 50,88 18,69 18,24" transform="translate(0 3)" />
        <Polygon fill={`url(#${ids.metal})`} points="50,6 82,24 82,69 50,88 18,69 18,24" stroke="#0B0E10" strokeWidth="2" />
        <Polygon fill={`url(#${ids.dark})`} points="50,14 74,28 74,64 50,78 26,64 26,28" stroke={accent} strokeOpacity=".3" />
      </G>
    );
  }
  if (family.includes('resurgence')) {
    return (
      <G>
        <Polygon fill="#020405" points="20,18 45,10 50,20 55,10 80,18 76,68 50,89 24,68" transform="translate(0 3)" />
        <Polygon fill={`url(#${ids.metal})`} points="20,18 45,10 50,20 55,10 80,18 76,68 50,89 24,68" stroke="#0B0E10" strokeWidth="2" />
        <Polygon fill={`url(#${ids.dark})`} points="28,25 45,20 50,29 56,20 72,25 68,63 50,78 32,63" stroke={accent} strokeOpacity=".3" />
      </G>
    );
  }
  if (family.includes('synchrony')) {
    return (
      <G transform="rotate(45 50 49)">
        <Rect fill="#020405" height="62" rx="13" transform="translate(0 3)" width="62" x="19" y="18" />
        <Rect fill={`url(#${ids.metal})`} height="62" rx="13" stroke="#0B0E10" strokeWidth="2" width="62" x="19" y="18" />
        <Rect fill={`url(#${ids.dark})`} height="48" rx="9" stroke={accent} strokeOpacity=".3" width="48" x="26" y="25" />
      </G>
    );
  }
  return (
    <G>
      <Polygon fill="#020405" points="38,6 62,6 84,27 84,68 63,88 37,88 16,68 16,27" transform="translate(0 3)" />
      <Polygon fill={`url(#${ids.metal})`} points="38,6 62,6 84,27 84,68 63,88 37,88 16,68 16,27" stroke="#0B0E10" strokeWidth="2" />
      <Polygon fill={`url(#${ids.dark})`} points="40,14 60,14 76,31 76,64 59,79 41,79 24,64 24,31" stroke={accent} strokeOpacity=".3" />
    </G>
  );
}

function SecretSymbol({ accent, family, ids }: { accent: string; family: BadgeVisualFamily; ids: GradientIds }) {
  const revealed = family.startsWith('revealed-');
  if (family.includes('eclipse')) {
    return (
      <G>
        <Path d="M47 18 A31 31 0 0 0 47 80 A24 31 0 0 1 47 18" fill="#080B0D" stroke="#949BA0" strokeWidth="2" />
        <Path d="M53 18 A31 31 0 0 1 53 80 A24 31 0 0 0 53 18" fill="#111519" stroke="#6A7177" strokeWidth="2" />
        {revealed ? <Crystal accent={accent} ids={ids} points="50,27 63,49 50,72 37,49" /> : <Path d="M48 20 C58 39 42 58 52 78" fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="2" />}
      </G>
    );
  }
  if (family.includes('countercurrent')) {
    return revealed ? (
      <G>
        <Crystal accent={accent} ids={ids} points="47,25 62,49 47,73 32,49" />
        {[0, 1, 2].map((index) => <Path d={`M57 ${34 + index * 13} H72 L67 ${29 + index * 13}`} fill="none" key={index} stroke="#AAB2B7" strokeWidth="2" />)}
      </G>
    ) : <Path d="M31 27 L50 18 L70 30 L55 44 L66 65 L43 77 L29 61 L40 48 Z" fill="#111519" stroke={accent} strokeOpacity=".5" strokeWidth="2" />;
  }
  if (family.includes('resurgence')) {
    return revealed ? (
      <G>
        <Path d="M29 29 L43 40 L38 53 L50 66 L59 54 L70 64" fill="none" stroke={accent} strokeLinecap="round" strokeWidth="4" />
        <Crystal accent={accent} ids={ids} points="50,32 61,49 50,67 39,49" />
      </G>
    ) : <Path d="M30 30 L43 40 L38 53 L50 66 L59 54 L70 65" fill="none" stroke="#2A3035" strokeWidth="5" />;
  }
  if (family.includes('synchrony')) {
    return revealed ? (
      <G>
        <Ellipse cx="42" cy="49" fill="none" rx="24" ry="14" stroke="#2F78FF" strokeWidth="3" transform="rotate(48 42 49)" />
        <Ellipse cx="58" cy="49" fill="none" rx="24" ry="14" stroke="#9A6BFF" strokeWidth="3" transform="rotate(-48 58 49)" />
        <Crystal accent={accent} ids={ids} points="50,39 58,49 50,59 42,49" />
      </G>
    ) : <Path d="M28 30 Q50 46 72 30 M28 68 Q50 52 72 68" fill="none" stroke="#31383D" strokeWidth="4" />;
  }
  return revealed ? (
    <G>
      <Circle cx="50" cy="49" fill="none" r="25" stroke={accent} strokeDasharray="5 3" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, index) => <Line key={index} stroke="#D7DEE2" strokeOpacity=".7" strokeWidth="2" transform={`rotate(${index * 30} 50 49)`} x1="50" x2="50" y1="17" y2="25" />)}
      <Crystal accent={accent} ids={ids} points="50,31 61,49 50,68 39,49" />
    </G>
  ) : (
    <G>
      <Circle cx="50" cy="49" fill="#0A0D0F" r="25" stroke="#3A4146" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, index) => <Line key={index} stroke="#4D555B" strokeWidth="2" transform={`rotate(${index * 30} 50 49)`} x1="50" x2="50" y1="19" y2="27" />)}
    </G>
  );
}

function Crystal({ accent, ids, points }: { accent: string; ids: GradientIds; points: string }) {
  return (
    <G>
      <Polygon fill={`url(#${ids.core})`} points={points} stroke="#E7EDF0" strokeOpacity=".78" strokeWidth="1" />
      <Line opacity=".68" stroke="#FFFFFF" strokeWidth=".8" x1="50" x2="50" y1="34" y2="62" />
      <Circle cx="50" cy="49" fill={accent} opacity=".34" r="3" />
    </G>
  );
}

function gradientIds(id: string) {
  const safe = id.replace(/[^a-z0-9_-]/gi, '-');
  return {
    accent: `badge-accent-${safe}`,
    core: `badge-core-${safe}`,
    dark: `badge-dark-${safe}`,
    metal: `badge-metal-${safe}`,
  };
}

export function badgeArtworkDescription(badge: PublicAchievementBadge) {
  return `${badge.name}, ${badge.obtained ? 'débloqué' : 'verrouillé'}`;
}

export type BadgeArtworkNode = ReactNode;
