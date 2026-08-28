import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Info from 'lucide-react-native/icons/info';
import X from 'lucide-react-native/icons/x';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { selectionFeedback } from '@/src/lib/feedback';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

export type SnackbarTone = 'error' | 'info' | 'success';

export type SnackbarAction = {
  accessibilityLabel?: string;
  label: string;
  onPress: () => Promise<void> | void;
};

export type SnackbarOptions = {
  action?: SnackbarAction;
  duration?: number;
  message: string;
  testID?: string;
  tone?: SnackbarTone;
};

export type SnackbarItem = SnackbarOptions & {
  id: string;
  tone: SnackbarTone;
};

type SnackbarHostProps = {
  item: SnackbarItem | null;
  onDismiss: (id: string) => void;
};

export function SnackbarHost({ item, onDismiss }: SnackbarHostProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();

  const dismiss = useCallback(() => {
    if (!item) return;
    onDismiss(item.id);
  }, [item, onDismiss]);

  const runAction = useCallback(() => {
    if (!item?.action) return;
    const action = item.action;
    selectionFeedback();
    onDismiss(item.id);
    void Promise.resolve(action.onPress()).catch(() => undefined);
  }, [item, onDismiss]);

  if (!item) return null;

  const presentation = TONE_PRESENTATION[item.tone];
  const Icon = presentation.icon;
  const showClose = !item.action || width >= 360;
  const entering = reduceMotion
    ? undefined
    : FadeInDown.duration(220).easing(Easing.out(Easing.cubic));
  const exiting = reduceMotion
    ? undefined
    : FadeOutDown.duration(160).easing(Easing.in(Easing.quad));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { bottom: Math.max(insets.bottom + spacing.md, layout.tabBarHeight + 18) }]}
    >
      <Animated.View
        entering={entering}
        exiting={exiting}
        key={item.id}
        style={[styles.snackbar, { borderColor: presentation.border }]}
        testID={item.testID ?? 'global-snackbar'}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.icon, { backgroundColor: presentation.surface }]}
        >
          <Icon color={presentation.accent} size={19} strokeWidth={2.25} />
        </View>

        <Text
          accessibilityLiveRegion={item.tone === 'error' ? 'assertive' : 'polite'}
          accessibilityRole={item.tone === 'error' ? 'alert' : undefined}
          style={styles.message}
        >
          {item.message}
        </Text>

        {item.action ? (
          <Pressable
            accessibilityLabel={item.action.accessibilityLabel ?? item.action.label}
            accessibilityRole="button"
            hitSlop={4}
            onPress={runAction}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{item.action.label}</Text>
          </Pressable>
        ) : null}

        {showClose ? (
          <Pressable
            accessibilityLabel="Fermer la notification"
            accessibilityRole="button"
            hitSlop={4}
            onPress={dismiss}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <X color={colors.textSecondary} size={18} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const TONE_PRESENTATION = {
  error: {
    accent: colors.danger,
    border: 'rgba(255,93,104,.42)',
    icon: CircleAlert,
    surface: 'rgba(255,93,104,.12)',
  },
  info: {
    accent: colors.info,
    border: colors.borderStrong,
    icon: Info,
    surface: 'rgba(102,168,255,.12)',
  },
  success: {
    accent: colors.success,
    border: 'rgba(69,212,131,.38)',
    icon: CircleCheck,
    surface: 'rgba(69,212,131,.12)',
  },
} as const;

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 120,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  snackbar: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    minHeight: 64,
    paddingLeft: spacing.sm,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 22,
    elevation: 18,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  message: {
    ...typography.bodyStrong,
    flex: 1,
    minWidth: 0,
    color: colors.text,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  actionText: {
    color: colors.volt,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.97 }],
  },
});
