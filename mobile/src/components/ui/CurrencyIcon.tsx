import Svg, { Ellipse, G, Path, Polygon } from 'react-native-svg';

import { colors } from '@/src/theme';

export type CurrencyKind = 'frags' | 'volts';

type Props = {
  color?: string;
  kind: CurrencyKind;
  size?: number;
};

/** Frags use a faceted graphite shard; Volts use a charged energy drop. */
export function CurrencyIcon({ color, kind, size = 18 }: Props) {
  const accent = color ?? colors.volt;

  if (kind === 'frags') {
    return (
      <Svg height={size} viewBox="0 0 32 32" width={size}>
        <Path
          d="M17.7 1.5 27.8 7l1.1 14.4-10.5 9.1L6.2 26.2 2.8 13.1 8.3 4.7Z"
          fill="#080C10"
          stroke="#87929B"
          strokeLinejoin="round"
          strokeWidth="1.15"
        />
        <G stroke="#95A0A8" strokeLinejoin="round" strokeWidth="0.7">
          <Path d="m8.3 4.7 6.9 9.1-12.4-.7Z" fill="#172027" />
          <Path d="m17.7 1.5-2.5 12.3-6.9-9.1Z" fill="#222C33" />
          <Path d="m17.7 1.5 10.1 5.5-12.6 6.8Z" fill="#0F151A" />
          <Path d="m27.8 7 1.1 14.4-13.7-7.6Z" fill="#1C252B" />
          <Path d="m28.9 21.4-10.5 9.1-3.2-16.7Z" fill="#0B1115" />
          <Path d="m18.4 30.5-12.2-4.3 9-12.4Z" fill="#1A2329" />
          <Path d="M6.2 26.2 2.8 13.1l12.4.7Z" fill="#0C1217" />
        </G>
        <Polygon
          fill={accent}
          points="15.2,10.5 20.1,13.8 18.7,19.4 13.4,20 10.9,15.1"
          stroke="#F1FFC5"
          strokeLinejoin="round"
          strokeWidth="0.75"
        />
        <Path d="m14.2 12.2 3.8 2.2-.7 3.5-3.2.3-1.5-2.8Z" fill="#FFFFFF" opacity={0.22} />
      </Svg>
    );
  }

  const star = color === '#080A0C' ? colors.volt : '#080A0C';

  return (
    <Svg height={size} viewBox="0 0 32 32" width={size}>
      {size >= 18 ? (
        <G fill="none" stroke={accent} strokeLinecap="round">
          <Ellipse cx="16" cy="18.2" opacity={0.45} rx="14" ry="5.1" strokeWidth="0.8" transform="rotate(-16 16 18.2)" />
          <Ellipse cx="16" cy="18.2" opacity={0.28} rx="13" ry="4.2" strokeDasharray="3 3" strokeWidth="0.7" transform="rotate(18 16 18.2)" />
        </G>
      ) : null}
      <Path
        d="M16 1.9C13.4 7.2 7.1 13.5 7.1 20.4c0 6.1 3.8 10 8.9 10s8.9-3.9 8.9-10C24.9 13.5 18.6 7.2 16 1.9Z"
        fill={accent}
        stroke="#F3FFC6"
        strokeLinejoin="round"
        strokeWidth="0.85"
      />
      <Path d="M16 3.4c-1.7 5.1-5.3 11.2-5.3 17.1 0 4.5 2.2 7.6 5.3 8.5Z" fill="#FFFFFF" opacity={0.18} />
      <Path d="M16 3.4c2 5.4 5.2 11 5.2 16.7 0 4.8-2.1 7.8-5.2 8.9Z" fill="#6E8300" opacity={0.24} />
      <Path d="M16 10.3c.8 3.9 2.2 5.4 5.5 6.2-3.3.8-4.7 2.3-5.5 6.2-.8-3.9-2.2-5.4-5.5-6.2 3.3-.8 4.7-2.3 5.5-6.2Z" fill={star} />
      <Path d="M11.1 24.1c2.1 2.3 6.7 2.9 9.5-.6" fill="none" opacity={0.22} stroke="#FFFFFF" strokeLinecap="round" strokeWidth="0.8" />
    </Svg>
  );
}
