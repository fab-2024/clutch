import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export type DailyMissionArtworkVariant = 'call' | 'live' | 'social';

type MissionPalette = {
  accent: string;
  dark: string;
  deep: string;
  mid: string;
  ring: string;
};

const PALETTES: Record<DailyMissionArtworkVariant, MissionPalette> = {
  call: {
    accent: '#44F0B4',
    dark: '#004A3B',
    deep: '#002A27',
    mid: '#008663',
    ring: '#39E6AE',
  },
  live: {
    accent: '#D184FF',
    dark: '#40007D',
    deep: '#23004F',
    mid: '#7919C8',
    ring: '#C172F4',
  },
  social: {
    accent: '#57D3FF',
    dark: '#004F88',
    deep: '#002D5D',
    mid: '#087FC2',
    ring: '#48BFEF',
  },
};

export default function DailyMissionArtwork({ variant }: { variant: DailyMissionArtworkVariant }) {
  const palette = PALETTES[variant];
  const prefix = `daily-mission-${variant}-${useId().replace(/:/g, '')}`;
  const ids = {
    face: `${prefix}-face`,
    glow: `${prefix}-glow`,
    inset: `${prefix}-inset`,
    ring: `${prefix}-ring`,
  };

  return (
    <Svg
      height="100%"
      pointerEvents="none"
      testID={`daily-mission-artwork-${variant}`}
      viewBox="0 0 188 188"
      width="100%"
    >
      <Defs>
        <RadialGradient cx="48%" cy="45%" id={ids.glow} r="54%">
          <Stop offset="0" stopColor={palette.accent} stopOpacity=".34" />
          <Stop offset={0.58} stopColor={palette.mid} stopOpacity=".16" />
          <Stop offset="1" stopColor={palette.deep} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={ids.ring} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity=".54" />
          <Stop offset={0.24} stopColor={palette.ring} stopOpacity=".72" />
          <Stop offset={0.7} stopColor={palette.dark} stopOpacity=".64" />
          <Stop offset="1" stopColor={palette.deep} stopOpacity=".22" />
        </LinearGradient>
        <LinearGradient id={ids.face} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor={palette.accent} stopOpacity=".66" />
          <Stop offset={0.28} stopColor={palette.mid} stopOpacity=".96" />
          <Stop offset={0.72} stopColor={palette.dark} />
          <Stop offset="1" stopColor={palette.deep} />
        </LinearGradient>
        <LinearGradient id={ids.inset} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={palette.dark} />
          <Stop offset="1" stopColor={palette.deep} />
        </LinearGradient>
      </Defs>

      <Circle cx="94" cy="94" fill={`url(#${ids.glow})`} r="88" />
      <Circle cx="94" cy="94" fill="none" opacity=".72" r="79" stroke={`url(#${ids.ring})`} strokeWidth="3.5" />
      <Circle cx="94" cy="94" fill="none" opacity=".46" r="64" stroke={palette.ring} strokeWidth="1.7" />
      <Path d="M45 31 A78 78 0 0 1 151 45" fill="none" opacity=".34" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2" />
      <Path d="M31 133 A78 78 0 0 0 143 157" fill="none" opacity=".26" stroke={palette.ring} strokeLinecap="round" strokeWidth="2.4" />
      <Circle cx="26" cy="91" fill={palette.accent} opacity=".42" r="3" />
      <Circle cx="154" cy="145" fill={palette.accent} opacity=".34" r="2.4" />

      <G transform="rotate(-6 94 94)">
        <MissionSymbol ids={ids} palette={palette} variant={variant} />
      </G>
    </Svg>
  );
}

type GradientIds = Record<'face' | 'glow' | 'inset' | 'ring', string>;
type SymbolProps = { ids: GradientIds; palette: MissionPalette };

function MissionSymbol({
  ids,
  palette,
  variant,
}: SymbolProps & { variant: DailyMissionArtworkVariant }) {
  if (variant === 'call') return <CallSymbol ids={ids} palette={palette} />;
  if (variant === 'live') return <LiveSymbol ids={ids} palette={palette} />;
  return <SocialSymbol ids={ids} palette={palette} />;
}

function CallSymbol({ ids, palette }: SymbolProps) {
  const check = 'M47 92 L76 118 L142 48';
  return (
    <G>
      <Path d={check} fill="none" opacity=".76" stroke="#001A19" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" transform="translate(5 7)" />
      <Path d={check} fill="none" stroke={`url(#${ids.face})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="22" />
      <Path d="M48 87 L76 111 L137 47" fill="none" opacity=".3" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.2" />
      <Path d="M83 118 L144 54" fill="none" opacity=".46" stroke={palette.deep} strokeLinecap="round" strokeWidth="4" />
    </G>
  );
}

function LiveSymbol({ ids, palette }: SymbolProps) {
  const shell = 'M58 42 C49 37 42 44 43 55 L49 132 C50 145 61 150 72 144 L144 105 C155 99 155 88 144 81 Z';
  return (
    <G>
      <Path d={shell} fill="#17002F" opacity=".72" transform="translate(5 7)" />
      <Path d={shell} fill={`url(#${ids.face})`} stroke={palette.deep} strokeLinejoin="round" strokeWidth="6" />
      <Path d="M66 61 L127 94 L70 126 Z" fill={`url(#${ids.inset})`} stroke={palette.accent} strokeOpacity=".32" strokeLinejoin="round" strokeWidth="4" />
      <Path d="M57 49 C53 47 50 51 51 58 L56 125" fill="none" opacity=".34" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3.2" />
      <Path d="M75 70 L116 93" fill="none" opacity=".22" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.6" />
    </G>
  );
}

function SocialSymbol({ ids, palette }: SymbolProps) {
  return (
    <G>
      <G opacity=".72">
        <Circle cx="55" cy="70" fill="#00264C" r="18" transform="translate(4 5)" />
        <Circle cx="55" cy="70" fill={`url(#${ids.face})`} r="16" stroke={palette.deep} strokeWidth="4" />
        <Path d="M22 132 C24 107 36 94 55 94 C69 94 79 101 84 114" fill="none" opacity=".82" stroke={`url(#${ids.face})`} strokeLinecap="round" strokeWidth="17" transform="translate(4 6)" />
        <Path d="M22 132 C24 107 36 94 55 94 C69 94 79 101 84 114" fill="none" stroke={palette.deep} strokeLinecap="round" strokeWidth="10" />
      </G>
      <G opacity=".78">
        <Circle cx="133" cy="69" fill="#00264C" r="18" transform="translate(4 5)" />
        <Circle cx="133" cy="69" fill={`url(#${ids.face})`} r="16" stroke={palette.deep} strokeWidth="4" />
        <Path d="M104 113 C110 100 119 93 133 93 C153 93 164 108 166 132" fill="none" opacity=".82" stroke={`url(#${ids.face})`} strokeLinecap="round" strokeWidth="17" transform="translate(4 6)" />
        <Path d="M104 113 C110 100 119 93 133 93 C153 93 164 108 166 132" fill="none" stroke={palette.deep} strokeLinecap="round" strokeWidth="10" />
      </G>
      <Circle cx="94" cy="61" fill="#00264C" r="24" transform="translate(5 6)" />
      <Circle cx="94" cy="61" fill={`url(#${ids.face})`} r="21" stroke={palette.deep} strokeWidth="5" />
      <Path d="M49 142 C52 109 69 94 94 94 C119 94 136 109 139 142" fill="none" opacity=".8" stroke="#00264C" strokeLinecap="round" strokeWidth="30" transform="translate(5 7)" />
      <Path d="M49 142 C52 109 69 94 94 94 C119 94 136 109 139 142" fill="none" stroke={`url(#${ids.face})`} strokeLinecap="round" strokeWidth="23" />
      <Path d="M79 45 Q94 35 108 45" fill="none" opacity=".34" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3" />
      <Path d="M62 132 C67 111 78 104 94 104" fill="none" opacity=".2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}
