import type { PropsWithChildren } from 'react';
import type { ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import {
  colors,
  radius,
  spacing,
  type RadiusToken,
  type SpacingToken,
} from '@/src/theme';

export type SurfaceTone = 'interactive' | 'low' | 'raised';
export type SurfaceBorder = 'none' | 'strong' | 'subtle';

type SurfaceLayout = Pick<ViewStyle, 'alignSelf' | 'flex' | 'minHeight' | 'width'>;

type SurfaceProps = PropsWithChildren<Omit<ViewProps, 'children' | 'style'> & {
  border?: SurfaceBorder;
  layout?: SurfaceLayout;
  padding?: 'none' | SpacingToken;
  radius?: RadiusToken;
  tone?: SurfaceTone;
}>;

export function Surface({
  border = 'none',
  children,
  layout: layoutStyle,
  padding = 'md',
  radius: radiusToken = 'md',
  tone = 'low',
  ...viewProps
}: SurfaceProps) {
  return (
    <View
      {...viewProps}
      style={[
        toneStyles[tone],
        borderStyles[border],
        padding === 'none' ? null : { padding: spacing[padding] },
        { borderRadius: radius[radiusToken] },
        layoutStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  low: {
    backgroundColor: colors.surfaceLow,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
  interactive: {
    backgroundColor: colors.surfaceInteractive,
  },
  borderNone: {
    borderWidth: 0,
  },
  borderSubtle: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  borderStrong: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});

const toneStyles: Record<SurfaceTone, object> = {
  low: styles.low,
  raised: styles.raised,
  interactive: styles.interactive,
};

const borderStyles: Record<SurfaceBorder, object> = {
  none: styles.borderNone,
  subtle: styles.borderSubtle,
  strong: styles.borderStrong,
};
