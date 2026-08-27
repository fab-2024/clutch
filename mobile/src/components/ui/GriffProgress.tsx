import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

type GriffProgressProps = {
  accessibilityLabel: string;
  max: number;
  style?: StyleProp<ViewStyle>;
  value: number;
};

export function GriffProgress({ accessibilityLabel, max, style, value }: GriffProgressProps) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const percentage = Math.round((safeValue / safeMax) * 100);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: safeMax, min: 0, now: safeValue }}
      style={[styles.track, style]}
    >
      <View style={[styles.fill, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.volt,
  },
});
