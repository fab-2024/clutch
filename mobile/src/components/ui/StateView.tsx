import type { LucideIcon } from 'lucide-react-native';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Inbox from 'lucide-react-native/icons/inbox';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

import { Button } from './Button';

export type StateViewVariant = 'empty' | 'error' | 'loading' | 'success';

export type StateAction = {
  accessibilityHint?: string;
  label: string;
  onPress: () => void;
};

export type StateViewProps = {
  action?: StateAction;
  compact?: boolean;
  description?: string;
  presentation?: 'inline' | 'panel';
  style?: StyleProp<ViewStyle>;
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
  presentation = 'panel',
  style,
  testID,
  title,
  variant,
}: StateViewProps) {
  const Icon = ICONS[variant];
  const liveRegion = variant === 'error' ? 'assertive' : 'polite';
  const inline = presentation === 'inline';

  return (
    <View
      accessibilityLabel={variant === 'loading'
        ? [title, description].filter(Boolean).join('. ')
        : undefined}
      accessibilityLiveRegion={liveRegion}
      accessibilityRole={variant === 'loading' ? 'progressbar' : undefined}
      accessibilityState={variant === 'loading' ? { busy: true } : undefined}
      aria-busy={variant === 'loading' ? true : undefined}
      accessible={variant === 'loading'}
      style={[styles.root, compact && styles.compact, inline && styles.inline, style]}
      testID={testID}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, inline && styles.iconInline]}>
        {variant === 'loading' ? (
          <ActivityIndicator color={ICON_COLORS.loading} size="small" />
        ) : Icon ? (
          <Icon color={ICON_COLORS[variant]} size={compact ? 22 : 26} strokeWidth={2} />
        ) : null}
      </View>

      <View style={[styles.copy, inline && styles.copyInline]}>
        <Text accessibilityRole={variant === 'error' ? 'alert' : undefined} style={[styles.title, inline && styles.titleInline]}>{title}</Text>
        {description ? <Text style={[styles.description, inline && styles.descriptionInline]}>{description}</Text> : null}
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
  inline: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  iconInline: {
    width: 36,
    height: 36,
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  copy: {
    maxWidth: 330,
    alignItems: 'center',
    gap: spacing.xs,
  },
  copyInline: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 2,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
    textAlign: 'center',
  },
  titleInline: {
    ...typography.bodyStrong,
    textAlign: 'left',
  },
  description: {
    ...typography.bodyComfort,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  descriptionInline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'left',
  },
});
