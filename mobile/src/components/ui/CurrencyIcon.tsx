import Svg, { Circle, G, Path } from 'react-native-svg';

import { colors } from '@/src/theme';

export type CurrencyKind = 'frags' | 'volts';

type Props = {
  color?: string;
  kind: CurrencyKind;
  size?: number;
};

/**
 * Flat currency glyphs designed to stay distinct in monochrome and at 14 px.
 * Frags use an asymmetric shard cluster; Volts use an orbital energy cell.
 */
export function CurrencyIcon({ color, kind, size = 18 }: Props) {
  const ink = color ?? (kind === 'frags' ? colors.frag : colors.volt);

  if (kind === 'frags') {
    return (
      <Svg height={size} viewBox="0 0 24 24" width={size}>
        <G fill={ink}>
          <Path d="M10.3 1.8 18 6.8l-3.8 15-6.1-6.5Z" />
          <Path d="M8.2 5.1 2.7 9l3.1 8.4 3.1-3.8Z" opacity={0.72} />
          <Path d="m18.8 8.1 2.6 3.1-5 8.2-1.2-4.4Z" opacity={0.48} />
        </G>
      </Svg>
    );
  }

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle
        cx="12"
        cy="12"
        fill="none"
        r="8.7"
        stroke={ink}
        strokeDasharray="40 15"
        strokeLinecap="round"
        strokeWidth="2.2"
        transform="rotate(-38 12 12)"
      />
      <Circle cx="12" cy="12" fill={ink} opacity={0.2} r="5.4" />
      <Circle cx="12" cy="12" fill={ink} r="3.2" />
      <Circle cx="18.1" cy="6.4" fill={ink} r="1.35" />
    </Svg>
  );
}
