import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { relicStyles as styles } from './CollectiveRelic.styles';

type Props = {
  accessibilityHint: string;
  accessibilityLabel: string;
  compact: boolean;
  disabled: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onPressIn: () => void;
  presentedVessel: ReactNode;
};

export default function CollectiveRelicRenderer({
  accessibilityHint,
  accessibilityLabel,
  compact,
  disabled,
  onLongPress,
  onPress,
  onPressIn,
  presentedVessel,
}: Props) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      delayLongPress={600}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      style={[styles.stage, compact && styles.stageCompact]}
      testID="collective-relic-stage"
    >
      <View pointerEvents="none" style={styles.vesselSlot}>{presentedVessel}</View>
    </Pressable>
  );
}
