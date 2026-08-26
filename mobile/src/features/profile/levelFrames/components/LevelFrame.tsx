import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { fonts } from '@/src/theme';

import { LEVEL_FRAME_CATALOG } from '../catalog';
import { getSignalAscendantStage } from '../progression';
import type { LevelFrameProps, LevelFrameVariant } from '../types';

type FrameIds = {
  accent: string;
  core: string;
  gem: string;
  metal: string;
  shadow: string;
};

export default function LevelFrame({
  disabled = false,
  level,
  selected = false,
  size = 64,
  variant,
}: LevelFrameProps) {
  const definition = LEVEL_FRAME_CATALOG[variant];
  const stage = variant === 'signalAscendant' ? getSignalAscendantStage(level) : 6;
  const prefix = `level-frame-${useId().replace(/:/g, '')}`;
  const ids: FrameIds = {
    accent: `${prefix}-accent`,
    core: `${prefix}-core`,
    gem: `${prefix}-gem`,
    metal: `${prefix}-metal`,
    shadow: `${prefix}-shadow`,
  };
  const displayLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : '—';

  return (
    <View
      accessibilityLabel={`Niveau ${displayLevel}, cadre ${definition.name}${selected ? ', équipé' : ''}`}
      accessible
      style={[
        styles.root,
        { height: size, opacity: disabled ? 0.42 : 1, width: size },
        selected && { boxShadow: `0 0 ${Math.max(8, Math.round(size * 0.16))}px ${alpha(definition.accent, '42')}` },
      ]}
      testID={`level-frame-${variant}`}
    >
      <Svg height={size} pointerEvents="none" viewBox="0 0 120 120" width={size}>
        <FrameDefs accent={definition.accent} ids={ids} variant={variant} />
        <Circle cx="60" cy="64" fill={`url(#${ids.shadow})`} opacity=".78" r="50" />
        <FrameArtwork accent={definition.accent} ids={ids} stage={stage} variant={variant} />
        <Rect fill="#03070A" height="66" rx="18" stroke="#182128" strokeWidth="1.5" width="66" x="27" y="27" />
        <Rect fill={`url(#${ids.core})`} height="58" rx="15" stroke="#364149" strokeOpacity=".58" strokeWidth="1" width="58" x="31" y="31" />
        <Path d="M37 35 Q60 27 83 35" fill="none" opacity=".26" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.2" />
        <FrameFrontArtwork accent={definition.accent} ids={ids} stage={stage} variant={variant} />
      </Svg>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        pointerEvents="none"
        style={[styles.level, { fontSize: Math.max(12, Math.round(size * 0.32)), lineHeight: Math.max(14, Math.round(size * 0.37)) }]}
      >
        {displayLevel}
      </Text>
      {selected ? <View pointerEvents="none" style={[styles.selectedDot, { backgroundColor: definition.accent }]} /> : null}
    </View>
  );
}

function FrameDefs({ accent, ids, variant }: { accent: string; ids: FrameIds; variant: LevelFrameVariant }) {
  const secondary = secondaryAccent(variant);
  return (
    <Defs>
      <LinearGradient id={ids.metal} x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#EEF1EF" />
        <Stop offset={0.18} stopColor="#68727A" />
        <Stop offset={0.42} stopColor="#14191D" />
        <Stop offset={0.7} stopColor="#3E464C" />
        <Stop offset="1" stopColor="#070A0C" />
      </LinearGradient>
      <LinearGradient id={ids.accent} x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity=".82" />
        <Stop offset={0.18} stopColor={accent} />
        <Stop offset={0.68} stopColor={secondary} />
        <Stop offset="1" stopColor="#080B0E" />
      </LinearGradient>
      <RadialGradient cx="42%" cy="34%" id={ids.gem} r="68%">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset={0.18} stopColor={accent} />
        <Stop offset={0.66} stopColor={secondary} />
        <Stop offset="1" stopColor="#05070A" />
      </RadialGradient>
      <LinearGradient id={ids.core} x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#1B2228" />
        <Stop offset={0.46} stopColor="#090D11" />
        <Stop offset="1" stopColor="#10161B" />
      </LinearGradient>
      <RadialGradient id={ids.shadow} r="60%">
        <Stop offset="0" stopColor={accent} stopOpacity=".13" />
        <Stop offset={0.72} stopColor="#020405" stopOpacity=".4" />
        <Stop offset="1" stopColor="#000000" stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
}

function FrameArtwork({
  accent,
  ids,
  stage,
  variant,
}: {
  accent: string;
  ids: FrameIds;
  stage: number;
  variant: LevelFrameVariant;
}) {
  if (variant === 'signalAscendant') return <SignalAscendantBack accent={accent} ids={ids} stage={stage} />;
  if (variant === 'voltRift') return <VoltRiftBack accent={accent} ids={ids} />;
  if (variant === 'azurOrbit') return <AzurOrbitBack accent={accent} ids={ids} />;
  if (variant === 'founderForge') return <FounderForgeBack accent={accent} ids={ids} />;
  if (variant === 'violetSovereign') return <VioletSovereignBack accent={accent} ids={ids} />;
  if (variant === 'obsidianFracture') return <ObsidianFractureBack accent={accent} ids={ids} />;
  return <NovaPrismBack accent={accent} ids={ids} />;
}

function FrameFrontArtwork({
  accent,
  ids,
  stage,
  variant,
}: {
  accent: string;
  ids: FrameIds;
  stage: number;
  variant: LevelFrameVariant;
}) {
  if (variant === 'signalAscendant') return <SignalAscendantFront accent={accent} ids={ids} stage={stage} />;
  if (variant === 'voltRift') return <VoltRiftFront accent={accent} ids={ids} />;
  if (variant === 'azurOrbit') return <AzurOrbitFront accent={accent} ids={ids} />;
  if (variant === 'founderForge') return <FounderForgeFront accent={accent} ids={ids} />;
  if (variant === 'violetSovereign') return <VioletSovereignFront accent={accent} ids={ids} />;
  if (variant === 'obsidianFracture') return <ObsidianFractureFront accent={accent} ids={ids} />;
  return <NovaPrismFront accent={accent} ids={ids} />;
}

function SignalAscendantBack({ accent, ids, stage }: { accent: string; ids: FrameIds; stage: number }) {
  return (
    <G>
      <CornerShell ids={ids} inset={stage < 2 ? 19 : 16} />
      {stage >= 2 ? <Path d="M34 15 H86 L105 34 V86 L86 105 H34 L15 86 V34 Z" fill="none" opacity=".72" stroke={`url(#${ids.metal})`} strokeWidth="4" /> : null}
      {stage >= 3 ? <Path d="M39 20 H81 L100 39 V81 L81 100 H39 L20 81 V39 Z" fill="none" opacity=".6" stroke={accent} strokeWidth="1.7" /> : null}
      {stage >= 4 ? <G opacity=".72"><Line stroke={accent} strokeWidth="3" x1="15" x2="15" y1="43" y2="77" /><Line stroke={accent} strokeWidth="3" x1="105" x2="105" y1="43" y2="77" /></G> : null}
      {stage >= 5 ? <G opacity=".62"><Path d="M22 30 L31 22 M89 98 L98 89" stroke="#A982FF" strokeWidth="2.5" /><Path d="M89 22 L98 31 M22 89 L31 98" stroke="#31D7E2" strokeWidth="2" /></G> : null}
      {stage >= 6 ? <G><Path d="M30 9 H48 L54 14 L66 14 L72 9 H90" fill="none" stroke={`url(#${ids.metal})`} strokeWidth="4" /><Path d="M30 111 H48 L54 106 L66 106 L72 111 H90" fill="none" stroke={`url(#${ids.metal})`} strokeWidth="4" /></G> : null}
    </G>
  );
}

function SignalAscendantFront({ accent, ids, stage }: { accent: string; ids: FrameIds; stage: number }) {
  return (
    <G>
      <CornerHighlights accent={accent} stage={stage} />
      {stage >= 3 ? <><Gem ids={ids} points="12,60 18,53 24,60 18,67" /><Gem ids={ids} points="96,60 102,53 108,60 102,67" /></> : null}
      {stage >= 4 ? <><Gem ids={ids} points="60,7 67,16 60,25 53,16" /><Polygon fill={accent} opacity=".7" points="55,101 65,101 60,108" /></> : null}
      {stage >= 5 ? <><Gem ids={ids} points="31,101 36,95 41,101 36,107" /><Gem ids={ids} points="79,101 84,95 89,101 84,107" /></> : null}
      {stage >= 6 ? <><Gem ids={ids} points="60,4 69,16 60,28 51,16" /><Gem ids={ids} points="55,106 60,100 65,106 60,114" /></> : null}
    </G>
  );
}

function VoltRiftBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M16 33 L29 18 H48 L45 27 H34 L25 39 V78 L35 91 H49 L45 102 H27 L15 86 Z" fill={`url(#${ids.metal})`} stroke="#050709" strokeWidth="2" />
      <Path d="M104 32 L91 18 H72 L75 28 H86 L96 39 V78 L86 92 H71 L75 102 H94 L106 85 Z" fill={`url(#${ids.metal})`} stroke="#050709" strokeWidth="2" />
      <Path d="M17 73 L10 82 L25 86 M103 43 L111 34 L96 31" fill="none" stroke={accent} strokeWidth="4" />
      <Path d="M29 14 L35 8 L41 18 M78 101 L89 109 L91 96" fill="none" opacity=".8" stroke={accent} strokeWidth="3" />
    </G>
  );
}

function VoltRiftFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M35 25 L25 42 M86 91 L98 75" stroke={accent} strokeLinecap="round" strokeWidth="2" />
      <Polygon fill={`url(#${ids.gem})`} points="15,49 25,55 17,64 9,58" />
      <Polygon fill={`url(#${ids.gem})`} points="96,29 108,35 100,45 91,38" />
      <Path d="M88 23 L81 38 L87 35 L83 49" fill="none" stroke="#E8FF3D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </G>
  );
}

function AzurOrbitBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Circle cx="60" cy="60" fill="none" r="48" stroke={`url(#${ids.metal})`} strokeDasharray="22 7" strokeWidth="5" />
      <Path d="M8 62 C23 20 89 6 111 48 C127 77 90 112 45 109 C10 106 -6 78 8 62 Z" fill="none" opacity=".75" stroke="#77858F" strokeWidth="2.5" />
      <Path d="M13 45 C37 112 91 114 108 55" fill="none" opacity=".75" stroke={accent} strokeWidth="2" />
      <Circle cx="16" cy="48" fill={accent} r="3" /><Circle cx="105" cy="83" fill={accent} r="2.5" />
    </G>
  );
}

function AzurOrbitFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Gem ids={ids} points="60,5 66,15 60,25 54,15" />
      <Gem ids={ids} points="20,24 25,31 20,38 15,31" />
      <Gem ids={ids} points="100,82 105,89 100,96 95,89" />
      <Path d="M37 24 Q60 14 83 25" fill="none" opacity=".8" stroke={accent} strokeWidth="2" />
    </G>
  );
}

function FounderForgeBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M29 12 H91 L108 29 V91 L91 108 H29 L12 91 V29 Z" fill="#080706" stroke={`url(#${ids.accent})`} strokeWidth="5" />
      <Path d="M34 18 H86 L102 34 V86 L86 102 H34 L18 86 V34 Z" fill="none" stroke="#5C3A20" strokeWidth="4" />
      {[25, 95].map((x) => <Line key={x} opacity=".74" stroke={accent} strokeWidth="5" x1={x} x2={x} y1="47" y2="73" />)}
      <Path d="M19 30 H33 L39 23 M101 90 H87 L81 97" fill="none" stroke="#F4C27B" strokeWidth="1.4" />
    </G>
  );
}

function FounderForgeFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Gem ids={ids} points="60,94 69,103 60,114 51,103" />
      <Path d="M38 27 H82" opacity=".76" stroke={accent} strokeWidth="2" />
      <Circle cx="20" cy="20" fill="#C88948" r="2" /><Circle cx="100" cy="20" fill="#C88948" r="2" />
    </G>
  );
}

function VioletSovereignBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M26 19 H45 L51 12 L60 20 L69 12 L75 19 H94 L105 32 V88 L93 101 H27 L15 88 V32 Z" fill="#06070A" stroke={`url(#${ids.metal})`} strokeWidth="4" />
      <Path d="M20 39 L10 51 L16 60 L10 69 L20 81 M100 39 L110 51 L104 60 L110 69 L100 81" fill="none" stroke={accent} strokeWidth="3" />
      <Path d="M30 101 H90" stroke="#5B2D86" strokeWidth="5" />
    </G>
  );
}

function VioletSovereignFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Gem ids={ids} points="60,2 70,19 60,29 50,19" />
      <Gem ids={ids} points="10,60 17,51 24,60 17,69" />
      <Gem ids={ids} points="96,60 103,51 110,60 103,69" />
      <Gem ids={ids} points="55,105 60,99 65,105 60,112" />
      <Path d="M32 27 L39 20 M81 20 L88 27" stroke="#D5B8FF" strokeWidth="1.4" />
    </G>
  );
}

function ObsidianFractureBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Polygon fill={`url(#${ids.metal})`} points="15,31 31,13 52,18 47,27 32,24 23,38 25,53 14,58" />
      <Polygon fill={`url(#${ids.metal})`} points="105,29 88,14 68,18 73,28 88,24 98,38 95,54 107,60" />
      <Polygon fill="#12171A" points="16,68 27,72 23,86 36,98 51,94 47,107 29,104 13,87" stroke="#444D52" />
      <Polygon fill="#151310" points="104,68 94,73 98,87 85,98 70,94 74,107 92,104 108,87" stroke="#6B4728" />
      <Path d="M22 31 L30 40 L25 51 M98 70 L89 78 L95 88" fill="none" stroke={accent} strokeWidth="2" />
      <Path d="M88 27 L82 37 L88 45" fill="none" stroke="#D39B5B" strokeWidth="2" />
    </G>
  );
}

function ObsidianFractureFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M30 27 L35 36 L31 45" fill="none" opacity=".7" stroke={accent} strokeWidth="1.5" />
      <Path d="M87 77 L82 84 L87 92" fill="none" opacity=".7" stroke="#D39B5B" strokeWidth="1.5" />
      <Gem ids={ids} points="90,94 96,101 90,108 84,101" />
    </G>
  );
}

function NovaPrismBack({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Path d="M27 10 H93 L110 27 V93 L93 110 H27 L10 93 V27 Z" fill="#05080B" stroke={`url(#${ids.metal})`} strokeWidth="5" />
      <Path d="M32 16 H88 L104 32 V88 L88 104 H32 L16 88 V32 Z" fill="none" stroke={accent} strokeWidth="3" />
      <Path d="M38 20 H82 M20 38 V82 M100 38 V82 M38 100 H82" opacity=".72" stroke="#A982FF" strokeWidth="2" />
      <Path d="M25 25 L34 16 M95 25 L86 16 M25 95 L34 104 M95 95 L86 104" stroke="#EAF0F4" strokeWidth="1.5" />
    </G>
  );
}

function NovaPrismFront({ accent, ids }: { accent: string; ids: FrameIds }) {
  return (
    <G>
      <Gem ids={ids} points="60,2 69,16 60,28 51,16" />
      <Gem ids={ids} points="7,60 16,49 25,60 16,71" />
      <Gem ids={ids} points="95,60 104,49 113,60 104,71" />
      <Gem ids={ids} points="52,105 60,97 68,105 60,115" />
      <Circle cx="26" cy="26" fill={accent} opacity=".85" r="2.5" /><Circle cx="94" cy="94" fill="#A982FF" opacity=".85" r="2.5" />
    </G>
  );
}

function CornerShell({ ids, inset }: { ids: FrameIds; inset: number }) {
  const far = 120 - inset;
  return (
    <G>
      <Path d={`M48 ${inset} H31 Q${inset} ${inset} ${inset} 31 V48`} fill="none" stroke={`url(#${ids.metal})`} strokeLinecap="round" strokeWidth="6" />
      <Path d={`M72 ${inset} H89 Q${far} ${inset} ${far} 31 V48`} fill="none" stroke={`url(#${ids.metal})`} strokeLinecap="round" strokeWidth="6" />
      <Path d={`M48 ${far} H31 Q${inset} ${far} ${inset} 89 V72`} fill="none" stroke={`url(#${ids.metal})`} strokeLinecap="round" strokeWidth="6" />
      <Path d={`M72 ${far} H89 Q${far} ${far} ${far} 89 V72`} fill="none" stroke={`url(#${ids.metal})`} strokeLinecap="round" strokeWidth="6" />
    </G>
  );
}

function CornerHighlights({ accent, stage }: { accent: string; stage: number }) {
  const opacity = stage >= 5 ? .88 : stage >= 2 ? .62 : .28;
  return (
    <G opacity={opacity}>
      <Path d="M25 43 V32 Q25 25 32 25 H43" fill="none" stroke={accent} strokeLinecap="round" strokeWidth={stage >= 3 ? 2 : 1.2} />
      <Path d="M77 25 H88 Q95 25 95 32 V43" fill="none" stroke={accent} strokeLinecap="round" strokeWidth={stage >= 3 ? 2 : 1.2} />
      <Path d="M25 77 V88 Q25 95 32 95 H43" fill="none" stroke="#DCE4E8" strokeLinecap="round" strokeWidth="1.2" />
      <Path d="M77 95 H88 Q95 95 95 88 V77" fill="none" stroke="#DCE4E8" strokeLinecap="round" strokeWidth="1.2" />
    </G>
  );
}

function Gem({ ids, points }: { ids: FrameIds; points: string }) {
  return (
    <G>
      <Polygon fill="#020405" points={points} stroke="#9CA5AA" strokeWidth="1.4" />
      <Polygon fill={`url(#${ids.gem})`} opacity=".96" points={points} transform="scale(.76) translate(18.95 18.95)" />
    </G>
  );
}

function secondaryAccent(variant: LevelFrameVariant) {
  if (variant === 'voltRift') return '#5A780D';
  if (variant === 'founderForge') return '#6F3C1C';
  if (variant === 'violetSovereign') return '#5D24A5';
  if (variant === 'novaPrism') return '#A982FF';
  if (variant === 'obsidianFracture') return '#B7783B';
  return '#184E9B';
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  root: { position: 'relative', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  level: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    color: '#E8ECEE',
    fontFamily: fonts.display,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.8)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 2,
  },
  selectedDot: {
    position: 'absolute',
    right: '7%',
    bottom: '7%',
    width: '9%',
    height: '9%',
    minWidth: 4,
    minHeight: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#071014',
  },
});
