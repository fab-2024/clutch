import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '@/src/theme';

type GriffMarkProps = {
  decorative?: boolean;
  size?: number;
  style?: StyleProp<ImageStyle>;
  tintColor?: ColorValue;
};

type GriffEmblemProps = {
  decorative?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

type GriffLockupProps = {
  width?: number;
  style?: StyleProp<ViewStyle>;
};

const MARK_SOURCE = require('../../../assets/brand/griff-mark.png');
const HERITAGE_COPPER = '#C98154';
const LOCKUP_BASE_WIDTH = 128;
const EMBLEM_BASE_SIZE = 45;

export function GriffMark({ decorative = false, size = 40, style, tintColor }: GriffMarkProps) {
  return (
    <Image
      accessibilityElementsHidden={decorative}
      accessibilityLabel={decorative ? undefined : 'Logo GRIFF'}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      resizeMode="contain"
      source={MARK_SOURCE}
      style={[{ width: size, height: size }, style]}
      testID="griff-mark"
      tintColor={tintColor}
    />
  );
}

export function GriffEmblem({ decorative = false, size = EMBLEM_BASE_SIZE, style }: GriffEmblemProps) {
  const scale = size / EMBLEM_BASE_SIZE;

  return (
    <View
      accessibilityElementsHidden={decorative}
      accessibilityLabel={decorative ? undefined : 'Logo GRIFF'}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      style={[
        styles.emblem,
        {
          width: size,
          height: size,
          borderRadius: 14 * scale,
          borderWidth: Math.max(1, 1.25 * scale),
        },
        style,
      ]}
      testID="griff-emblem"
    >
      <View
        style={[
          styles.emblemHighlight,
          {
            right: 7 * scale,
            left: 7 * scale,
            height: Math.max(1, scale),
          },
        ]}
      />
      <GriffMark
        decorative
        size={35 * scale}
        tintColor={HERITAGE_COPPER}
      />
    </View>
  );
}

export function GriffLockup({ width = 116, style }: GriffLockupProps) {
  const scale = width / LOCKUP_BASE_WIDTH;
  const emblemSize = EMBLEM_BASE_SIZE * scale;

  return (
    <View
      accessibilityLabel="GRIFF"
      accessibilityRole="image"
      accessible
      style={[
        styles.lockup,
        { width, height: emblemSize, gap: 8 * scale },
        style,
      ]}
      testID="griff-lockup"
    >
      <GriffEmblem decorative size={emblemSize} />
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[
          styles.wordmark,
          {
            fontSize: 17 * scale,
            lineHeight: 20 * scale,
            letterSpacing: 2.6 * scale,
          },
        ]}
      >
        GRIFF
      </Text>
      <View
        style={[
          styles.voltDot,
          {
            width: 6 * scale,
            height: 6 * scale,
            marginLeft: -7 * scale,
            marginTop: 15 * scale,
            borderRadius: 3 * scale,
          },
        ]}
        testID="griff-lockup-dot"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: {
    flexShrink: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090B0D',
    borderColor: HERITAGE_COPPER,
  },
  emblemHighlight: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255,211,171,.36)',
  },
  lockup: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    flexShrink: 1,
    color: '#F8F7F4',
    fontFamily: fonts.bold,
  },
  voltDot: {
    flexShrink: 0,
    backgroundColor: colors.volt,
  },
});
