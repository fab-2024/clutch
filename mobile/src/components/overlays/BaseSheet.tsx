import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing, typography } from '@/src/theme';

export type BaseSheetSize = 'large' | 'medium';

type BaseSheetProps = PropsWithChildren<{
  dismissible?: boolean;
  eyebrow?: string;
  footer?: ReactNode;
  onClose: () => void;
  onClosed?: () => void;
  returnFocusRef?: RefObject<View | null>;
  scrollable?: boolean;
  size?: BaseSheetSize;
  testID?: string;
  title: string;
  visible: boolean;
}>;

export function BaseSheet({
  children,
  dismissible = true,
  eyebrow,
  footer,
  onClose,
  onClosed,
  returnFocusRef,
  scrollable = true,
  size = 'medium',
  testID,
  title,
  visible,
}: BaseSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const titleRef = useRef<View>(null);
  const [rendered, setRendered] = useState(visible);
  const [titleFocused, setTitleFocused] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);

  const finishClose = useCallback(() => {
    setRendered(false);
    focusAccessibilityTarget(returnFocusRef?.current ?? null);
    onClosed?.();
  }, [onClosed, returnFocusRef]);

  useEffect(() => {
    if (visible) setRendered(true);
  }, [visible]);

  useEffect(() => {
    if (!rendered) return;
    const duration = reduceMotion ? 120 : visible ? 240 : 180;
    progress.value = withTiming(
      visible ? 1 : 0,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && !visible) runOnJS(finishClose)();
      },
    );
  }, [finishClose, progress, reduceMotion, rendered, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 28 }],
  }));

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  const focusTitle = useCallback(() => {
    focusAccessibilityTarget(titleRef.current);
  }, []);

  if (!rendered) return null;

  const bodyStyle = [
    styles.body,
    !footer && { paddingBottom: Math.max(insets.bottom, spacing.md) },
  ];

  return (
    <Modal
      animationType="none"
      onRequestClose={requestClose}
      onShow={focusTitle}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={rendered}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityElementsHidden
            accessible={false}
            disabled={!dismissible}
            importantForAccessibility="no-hide-descendants"
            onPress={requestClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          style={[styles.sheet, sizeStyles[size], sheetStyle]}
          testID={testID}
        >
          <View style={styles.header}>
            <View style={styles.heading}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Pressable
                accessibilityRole="header"
                onBlur={() => setTitleFocused(false)}
                onFocus={() => setTitleFocused(true)}
                ref={titleRef}
                style={[styles.titleFocusTarget, titleFocused && styles.titleFocused]}
                tabIndex={-1}
              >
                <Text style={styles.title}>{title}</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityLabel={`Fermer ${title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !dismissible }}
              aria-disabled={!dismissible}
              disabled={!dismissible}
              onPress={requestClose}
              style={({ pressed }) => [
                styles.close,
                !dismissible && styles.closeDisabled,
                pressed && dismissible && styles.closePressed,
              ]}
            >
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>

          {scrollable ? (
            <ScrollView
              contentContainerStyle={bodyStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={bodyStyle}>{children}</View>
          )}

          {footer ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  medium: {
    maxHeight: '70%',
  },
  large: {
    maxHeight: '92%',
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: 4,
    color: colors.volt,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  titleFocusTarget: {
    alignSelf: 'flex-start',
  },
  titleFocused: {
    borderRadius: 4,
    outlineColor: colors.focus,
    outlineOffset: 2,
    outlineStyle: 'solid',
    outlineWidth: 2,
  },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  closeDisabled: {
    opacity: 0.45,
  },
  closePressed: {
    opacity: 0.72,
  },
  closeGlyph: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 26,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
});

const sizeStyles: Record<BaseSheetSize, object> = {
  medium: styles.medium,
  large: styles.large,
};

function focusAccessibilityTarget(target: View | null) {
  if (!target) return;
  if (Platform.OS === 'web') {
    (target as View & { focus?: () => void }).focus?.();
    return;
  }

  const handle = findNodeHandle(target);
  if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
}
