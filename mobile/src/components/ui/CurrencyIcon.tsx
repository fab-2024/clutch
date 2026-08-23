import { Image } from 'react-native';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';

import { colors } from '@/src/theme';

export type CurrencyKind = 'frags' | 'volts';

type Props = {
  color?: string;
  kind: CurrencyKind;
  size?: number;
};

const CURRENCY_ASSETS = {
  frags: require('../../../assets/currency/frag.png'),
  volts: require('../../../assets/currency/volt.png'),
} as const;

/**
 * Currency masters stay detailed from 20 px upward. Compact SVG glyphs preserve
 * the same silhouettes when a transaction row only leaves 11–18 px available.
 */
export function CurrencyIcon({ color, kind, size = 18 }: Props) {
  if (size <= 18) {
    return kind === 'frags'
      ? <CompactFrag color={color} size={size} />
      : <CompactVolt color={color} size={size} />;
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={CURRENCY_ASSETS[kind]}
      style={{ height: size, width: size }}
    />
  );
}

function CompactFrag({ color, size }: { color?: string; size: number }) {
  const accent = color ?? colors.frag;
  const contextual = Boolean(color && color.toUpperCase() !== colors.frag.toUpperCase());
  const shell = contextual ? accent : '#DCE1E6';
  const shellShade = contextual ? accent : '#5C6670';

  return (
    <Svg height={size} viewBox="0 0 32 32" width={size}>
      <G stroke="#10151A" strokeLinejoin="round" strokeWidth="0.8">
        <Polygon fill={shell} points="14.6,1.4 4.7,8.3 7.1,14.2 13.3,10.8" />
        <Polygon fill={shell} points="18.1,2.4 27.7,8.6 25.2,15.4 18.8,11" />
        <Polygon fill={shellShade} points="5.5,16.2 12.2,18.7 12.6,29.1 3.5,22" />
        <Polygon fill={shell} points="25.8,16.8 19.5,19.2 18.5,29.7 28.3,22.4" />
        <Polygon fill={shellShade} points="14.6,25.3 18.9,28.4 15,31 12.7,28.2" />
      </G>
      <Path d="M14.6 1.4 7.1 14.2l6.2-3.4Z" fill="#FFFFFF" opacity={contextual ? 0.18 : 0.58} />
      <Path d="m18.1 2.4.7 8.6 6.4 4.4Z" fill="#FFFFFF" opacity={contextual ? 0.14 : 0.42} />
      <Polygon
        fill={accent}
        points="16,4.9 21,15.8 16,27.8 10.9,15.8"
        stroke="#EEE8FF"
        strokeLinejoin="round"
        strokeWidth="0.75"
      />
      <Path d="M16 4.9v22.9l-5.1-12Z" fill="#FFFFFF" opacity={0.24} />
      <Path d="m16 4.9 5 10.9-5 1.8Z" fill="#DCCBFF" opacity={0.42} />
      <Path d="m16 17.6 5-1.8-5 12Z" fill="#18083D" opacity={0.5} />
    </Svg>
  );
}

function CompactVolt({ color, size }: { color?: string; size: number }) {
  const accent = color ?? colors.volt;
  const darkAccent = accent.toUpperCase() === '#080A0C';
  const ink = darkAccent ? colors.volt : '#0A0E0B';
  const micro = size <= 13;

  return (
    <Svg height={size} viewBox="0 0 32 32" width={size}>
      <Path
        d="M16 1.8C13.3 7.4 6.7 14.1 6.7 21c0 6 4 9.4 9.3 9.4s9.3-3.4 9.3-9.4C25.3 14.1 18.7 7.4 16 1.8Z"
        fill={micro ? accent : '#11170D'}
        stroke={accent}
        strokeLinejoin="round"
        strokeWidth={micro ? 0.8 : 2.1}
      />
      {!micro ? (
        <Path d="M16 5.3c-2.1 4.8-6.2 10.3-6.2 15.8 0 4.1 2.4 6.5 6.2 6.8Z" fill={accent} opacity={0.22} />
      ) : null}
      <Path
        d="m17.7 7.5-6.1 10.4h4.1l-1.9 7 7.1-11.1h-4.3Z"
        fill={micro ? ink : accent}
        stroke={micro ? ink : '#F4FFC5'}
        strokeLinejoin="round"
        strokeWidth="0.45"
      />
      <Circle cx="16" cy="25.1" fill={micro ? ink : '#080B09'} r={micro ? 2 : 2.35} stroke={accent} strokeWidth={micro ? 0 : 0.7} />
    </Svg>
  );
}
