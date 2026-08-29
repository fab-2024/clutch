import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/src/theme';

export type SegmentedControlItem<Value extends string> = {
  accessibilityLabel?: string;
  badge?: number;
  label: string;
  value: Value;
};

type SegmentedControlProps<Value extends string> = {
  accessibilityLabel: string;
  items: readonly SegmentedControlItem<Value>[];
  onChange: (value: Value) => void;
  testID?: string;
  value: Value;
};

export function SegmentedControl<Value extends string>({
  accessibilityLabel,
  items,
  onChange,
  testID,
  value,
}: SegmentedControlProps<Value>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={styles.root}
      testID={testID}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            accessibilityLabel={item.badge
              ? `${item.accessibilityLabel ?? item.label}, ${item.badge}`
              : item.accessibilityLabel ?? item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              styles.item,
              selected && styles.itemSelected,
              pressed && styles.itemPressed,
            ]}
          >
            <Text numberOfLines={2} style={[styles.label, selected && styles.labelSelected]}>
              {item.label}
            </Text>
            {item.badge ? (
              <View style={[styles.badge, selected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: layout.controlHeight,
    padding: 3,
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
  },
  itemSelected: {
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  itemPressed: {
    opacity: 0.78,
  },
  label: {
    ...typography.control,
    flexShrink: 1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.volt,
  },
  badge: {
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  badgeSelected: {
    backgroundColor: colors.volt,
  },
  badgeText: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  badgeTextSelected: {
    color: colors.background,
  },
});
