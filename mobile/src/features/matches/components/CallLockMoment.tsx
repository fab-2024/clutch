import Lock from 'lucide-react-native/icons/lock';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/src/theme';

export const CALL_LOCK_DURATION_MS = 700;
export const CALL_LOCK_MILESTONE_MS = 470;
export const REDUCED_CALL_LOCK_HOLD_MS = 650;

type CallLockMomentProps = {
  accentA: string;
  accentB: string;
  choice: 'a' | 'b';
  fixedProgress?: number;
  onComplete: () => void;
  onLocked: () => void;
  reduceMotion: boolean;
  tagA: string;
  tagB: string;
  teamName: string;
  visible: boolean;
};

export function CallLockMoment({
  accentA,
  accentB,
  choice,
  fixedProgress,
  onComplete,
  onLocked,
  reduceMotion,
  tagA,
  tagB,
  teamName,
  visible,
}: CallLockMomentProps) {
  const progress = useSharedValue(fixedProgress ?? (reduceMotion ? 1 : 0));
  const selectedAccent = choice === 'a' ? accentA : accentB;
  const selectedTag = choice === 'a' ? tagA : tagB;

  useEffect(() => {
    if (!visible || fixedProgress != null) return;

    cancelAnimation(progress);
    if (reduceMotion) {
      progress.value = 1;
      onLocked();
      const timeout = setTimeout(onComplete, REDUCED_CALL_LOCK_HOLD_MS);
      return () => clearTimeout(timeout);
    }

    progress.value = 0;
    progress.value = withSequence(
      withTiming(
        CALL_LOCK_MILESTONE_MS / CALL_LOCK_DURATION_MS,
        {
          duration: CALL_LOCK_MILESTONE_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(onLocked)();
        },
      ),
      withTiming(
        1,
        {
          duration: CALL_LOCK_DURATION_MS - CALL_LOCK_MILESTONE_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(onComplete)();
        },
      ),
    );

    return () => cancelAnimation(progress);
  }, [fixedProgress, onComplete, onLocked, progress, reduceMotion, visible]);

  useEffect(() => {
    if (fixedProgress != null) progress.value = fixedProgress;
  }, [fixedProgress, progress]);

  const backdropMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.14, 1], [0, 0.96, 1]),
  }));
  const leftCampMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.26, 0.68], [0.38, 0.72, 1])
      * (choice === 'a' ? 1 : 0.56),
    transform: [{ translateX: interpolate(progress.value, [0, 0.68], [-42, 0]) }],
  }));
  const rightCampMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.26, 0.68], [0.38, 0.72, 1])
      * (choice === 'b' ? 1 : 0.56),
    transform: [{ translateX: interpolate(progress.value, [0, 0.68], [42, 0]) }],
  }));
  const seamMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.46, 0.68], [0, 0, 1]),
    transform: [{ scaleY: interpolate(progress.value, [0.46, 0.68], [0.24, 1]) }],
  }));
  const tokenMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.54, 0.72], [0, 0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0.54, 0.78, 1], [8, -2, 0]) },
      { scale: interpolate(progress.value, [0.54, 0.78, 1], [0.82, 1.04, 1]) },
    ],
  }));
  const copyMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.72, 1], [0, 0, 1]),
    transform: [{ translateY: interpolate(progress.value, [0.72, 1], [6, 0]) }],
  }));

  if (!visible) return null;

  const accessibilityLabel = `Call verrouillé pour ${teamName}. Ton choix est enregistré.`;
  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="assertive"
        accessibilityRole="summary"
        accessibilityViewIsModal
        style={styles.root}
        testID="call-lock-moment"
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropMotion]} />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.stage}
        >
          <Text style={styles.eyebrow}>VERROUILLAGE DU CALL</Text>

          <View style={styles.camps}>
            <Animated.View
              style={[
                styles.camp,
                styles.campLeft,
                leftCampMotion,
              ]}
            >
              <View style={[styles.campTone, { backgroundColor: accentA }]} />
              <Text numberOfLines={1} style={[styles.campTag, choice === 'a' && { color: accentA }]}>{tagA}</Text>
              <View style={[styles.campRule, { backgroundColor: accentA }]} />
            </Animated.View>

            <Animated.View
              style={[
                styles.camp,
                styles.campRight,
                rightCampMotion,
              ]}
            >
              <View style={[styles.campTone, { backgroundColor: accentB }]} />
              <Text numberOfLines={1} style={[styles.campTag, choice === 'b' && { color: accentB }]}>{tagB}</Text>
              <View style={[styles.campRule, { backgroundColor: accentB }]} />
            </Animated.View>

            <Animated.View style={[styles.seam, { backgroundColor: selectedAccent }, seamMotion]} />
            <Animated.View
              style={[
                styles.token,
                { borderColor: selectedAccent },
                tokenMotion,
              ]}
            >
              <View style={[styles.tokenCap, { backgroundColor: selectedAccent }]} />
              <Lock color={selectedAccent} size={21} strokeWidth={2.4} />
              <Text numberOfLines={1} style={styles.tokenTag}>{selectedTag}</Text>
              <Text style={[styles.tokenLabel, { color: selectedAccent }]}>LOCK</Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.confirmation, copyMotion]}>
            <Text style={styles.title}>CALL VERROUILLÉ</Text>
            <Text numberOfLines={2} style={styles.teamName}>{teamName}</Text>
            <Text style={styles.caption}>TON CHOIX EST ENREGISTRÉ</Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backdrop: {
    backgroundColor: colors.backgroundDeep,
  },
  stage: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: 20,
    color: colors.textMuted,
    letterSpacing: 1.1,
  },
  camps: {
    position: 'relative',
    width: '100%',
    height: 174,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  camp: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLow,
    borderColor: colors.borderStrong,
  },
  campLeft: {
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  campRight: {
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  campTone: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.08,
  },
  campTag: {
    ...typography.displayMedium,
    color: colors.text,
  },
  campRule: {
    width: 34,
    height: 2,
    marginTop: 10,
    opacity: 0.78,
  },
  seam: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    left: '50%',
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
  },
  token: {
    position: 'absolute',
    top: 28,
    left: '50%',
    width: 92,
    height: 118,
    marginLeft: -46,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 24,
    backgroundColor: '#080C10',
    borderWidth: 1.5,
  },
  tokenCap: {
    position: 'absolute',
    top: 0,
    left: 26,
    right: 26,
    height: 2,
  },
  tokenTag: {
    ...typography.metricSmall,
    color: colors.text,
  },
  tokenLabel: {
    ...typography.metadata,
    letterSpacing: 1,
  },
  confirmation: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text,
    letterSpacing: 0.3,
  },
  teamName: {
    ...typography.bodyStrong,
    marginTop: 3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  caption: {
    ...typography.metadata,
    marginTop: 7,
    color: colors.textMuted,
    letterSpacing: 0.7,
  },
});
