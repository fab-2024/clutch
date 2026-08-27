import type { LucideIcon } from 'lucide-react-native';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Inbox from 'lucide-react-native/icons/inbox';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

import { Button } from './Button';

export type StateViewVariant = 'empty' | 'error' | 'loading' | 'success';

type StateAction = {
  accessibilityHint?: string;
  label: string;
  onPress: () => void;
};

type StateViewProps = {
  action?: StateAction;
  compact?: boolean;
  description?: string;
  testID?: string;
  title: string;
  variant: StateViewVariant;
};

const ICONS: Partial<Record<StateViewVariant, LucideIcon>> = {
  empty: Inbox,
  error: CircleAlert,
  success: CircleCheck,
};

const ICON_COLORS: Record<StateViewVariant, string> = {
  empty: colors.textSecondary,
  error: colors.danger,
  loading: colors.volt,
  success: colors.success,
};

export function StateView({
  action,
  compact = false,
  description,
  testID,
  title,
  variant,
}: StateViewProps) {
  const Icon = ICONS[variant];
  const liveRegion = variant === 'error' ? 'assertive' : 'polite';

  return (
    <View
      accessibilityLiveRegion={liveRegion}
      style={[styles.root, compact && styles.compact]}
      testID={testID}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        {variant === 'loading' ? (
          <ActivityIndicator color={ICON_COLORS.loading} size="small" />
        ) : Icon ? (
          <Icon color={ICON_COLORS[variant]} size={compact ? 22 : 26} strokeWidth={2} />
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text accessibilityRole={variant === 'error' ? 'alert' : undefined} style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      {action ? (
        <Button
          accessibilityHint={action.accessibilityHint}
          label={action.label}
          onPress={action.onPress}
          size="compact"
          variant={variant === 'error' ? 'secondary' : 'primary'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  compact: {
    minHeight: 144,
    padding: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  copy: {
    maxWidth: 330,
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyComfort,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
