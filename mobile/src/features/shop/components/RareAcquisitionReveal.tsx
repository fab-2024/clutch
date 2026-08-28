import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { successFeedback } from '@/src/lib/feedback';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import {
  rareAcquisitionDuration,
  rareAcquisitionLabel,
  rareAcquisitionOriginLabel,
  type RareAcquisitionEvent,
} from '../rareAcquisition';
import { CosmeticItemPreview } from './CosmeticRenderer';

type RareAcquisitionRevealProps = {
  event: RareAcquisitionEvent | null;
  forceReduceMotion?: boolean;
  onContinueAtelier: () => void;
  onViewShowcase: () => void;
};

const WEB_FOCUS_RESET = Platform.OS === 'web'
  ? ({ outlineStyle: 'none' } as unknown as ViewStyle)
  : undefined;

export function RareAcquisitionReveal({
  event,
  forceReduceMotion,
  onContinueAtelier,
  onViewShowcase,
}: RareAcquisitionRevealProps) {
  const insets = useSafeAreaInsets();
  const systemReduceMotion = useReducedMotion();
  const { height, width } = useWindowDimensions();
  const reduceMotion = forceReduceMotion ?? systemReduceMotion;
  const progress = useSharedValue(0);
  const [ready, setReady] = useState(false);
  const titleRef = useRef<View>(null);
  const hapticEventRef = useRef('');
  const landscape = width > height && height < 560;
  const compact = width < 360 || height < 680;
  const duration = event ? rareAcquisitionDuration(event.item.rarity, reduceMotion) : 0;

  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!event) return;
    setReady(false);
    progress.value = 0;

    if (hapticEventRef.current !== event.eventKey) {
      hapticEventRef.current = event.eventKey;
      if (reduceMotion) successFeedback();
    }

    const hapticTimer = reduceMotion ? null : setTimeout(() => {
      if (hapticEventRef.current === event.eventKey) successFeedback();
    }, Math.round(duration * .58));

    progress.value = withTiming(
      1,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(markReady)();
      },
    );

    return () => {
      if (hapticTimer) clearTimeout(hapticTimer);
    };
  }, [duration, event, markReady, progress, reduceMotion]);

  const focusTitle = useCallback(() => {
    if (Platform.OS === 'web') {
      (titleRef.current as (View & { focus?: () => void }) | null)?.focus?.();
      return;
    }
    const handle = findNodeHandle(titleRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  const requestClose = useCallback(() => {
    if (ready) onContinueAtelier();
  }, [onContinueAtelier, ready]);

  const backdropMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, reduceMotion ? 1 : .16], [0, 1], Extrapolation.CLAMP),
  }));
  const artifactMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, reduceMotion ? 1 : .32], [0, 1], Extrapolation.CLAMP),
    transform: reduceMotion ? [] : [
      { translateY: interpolate(progress.value, [0, .42], [18, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, .5, 1], [.94, 1.015, 1], Extrapolation.CLAMP) },
    ],
  }));
  const sweepMotion = useAnimatedStyle(() => ({
    opacity: reduceMotion
      ? 0
      : interpolate(progress.value, [.12, .24, .62, .7], [0, .78, .48, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(progress.value, [.12, .7], [-width * .7, width * .7], Extrapolation.CLAMP) }],
  }));
  const rarityMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [reduceMotion ? 0 : .34, reduceMotion ? 1 : .62], [0, 1], Extrapolation.CLAMP),
    transform: reduceMotion ? [] : [
      { translateY: interpolate(progress.value, [.34, .62], [9, 0], Extrapolation.CLAMP) },
    ],
  }));
  const copyMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [reduceMotion ? 0 : .52, reduceMotion ? 1 : .82], [0, 1], Extrapolation.CLAMP),
    transform: reduceMotion ? [] : [
      { translateY: interpolate(progress.value, [.52, .82], [12, 0], Extrapolation.CLAMP) },
    ],
  }));
  const actionMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [reduceMotion ? 0 : .72, 1], [0, 1], Extrapolation.CLAMP),
  }));

  if (!event) return null;

  const accent = event.item.accent || colors.volt;
  const rarity = rareAcquisitionLabel(event.item.rarity);
  const accessibilityLabel = [
    `${event.item.name}. ${rarity.toLowerCase()}. ${event.category}.`,
    `Provenance ${event.provenance}.`,
    event.item.equipped
      ? 'Ajouté à ta collection et équipé dans ta Vitrine.'
      : 'Ajouté à ta collection.',
  ].join(' ');

  return (
    <Modal
      animationType="none"
      onRequestClose={requestClose}
      onShow={focusTitle}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <Animated.View
        accessibilityViewIsModal
        onAccessibilityEscape={requestClose}
        style={[styles.root, backdropMotion]}
        testID="rare-acquisition-reveal"
      >
        <LinearGradient
          colors={['rgba(5,8,11,.995)', '#0A0F14', 'rgba(5,8,11,.995)']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.ambient, { backgroundColor: accent }]} />

        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              paddingLeft: Math.max(insets.left, spacing.md),
              paddingRight: Math.max(insets.right, spacing.md),
              paddingTop: Math.max(insets.top, spacing.md),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, compact && styles.contentCompact, landscape && styles.contentLandscape]}>
            <Animated.View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.artifact,
                compact && styles.artifactCompact,
                landscape && styles.artifactLandscape,
                { borderColor: `${accent}66` },
                artifactMotion,
              ]}
            >
              <LinearGradient
                colors={[`${accent}20`, '#10161D', '#070A0E']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.facetTop, { borderColor: `${accent}4D` }]} />
              <View style={[styles.facetBottom, { borderColor: `${accent}3D` }]} />
              <View style={styles.artifactVisual}>
                {event.image ? (
                  <Image resizeMode="contain" source={event.image} style={styles.productImage} />
                ) : (
                  <View style={styles.identityPreview}>
                    <CosmeticItemPreview item={event.item} />
                  </View>
                )}
              </View>
              <Animated.View style={[styles.sweep, { backgroundColor: accent }, sweepMotion]} />
              <View style={[styles.categoryPlate, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}>
                <Text style={[styles.category, { color: accent }]}>{event.category}</Text>
              </View>
            </Animated.View>

            <View style={[styles.copyColumn, compact && styles.copyColumnCompact, landscape && styles.copyColumnLandscape]}>
              <Pressable
                accessibilityLabel={accessibilityLabel}
                accessibilityLiveRegion="polite"
                accessibilityRole="header"
                ref={titleRef}
                style={[styles.accessibilityTitle, WEB_FOCUS_RESET]}
                tabIndex={-1}
              >
                <Animated.View style={rarityMotion}>
                  <Text style={styles.origin}>{rareAcquisitionOriginLabel(event.origin)}</Text>
                  <Text style={[styles.rarity, { color: accent }]}>{rarity}</Text>
                </Animated.View>

                <Animated.View style={copyMotion}>
                  <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={2} style={[styles.title, compact && styles.titleCompact]}>
                    {event.item.name.toUpperCase()}
                  </Text>
                  <Text numberOfLines={compact ? 2 : 3} style={styles.description}>{event.item.description}</Text>
                  <View style={[styles.provenance, { borderLeftColor: accent }]}>
                    <Text style={styles.provenanceLabel}>PROVENANCE CERTIFIÉE</Text>
                    <Text numberOfLines={2} style={styles.provenanceValue}>{event.provenance}</Text>
                  </View>
                </Animated.View>
              </Pressable>

              <Animated.View
                accessibilityElementsHidden={!ready}
                importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}
                style={[styles.actions, actionMotion]}
              >
                <Button
                  accessibilityHint="Ouvre ta Vitrine avec le nouvel objet équipé"
                  disabled={!ready}
                  fullWidth
                  label="VOIR DANS MA VITRINE"
                  onPress={onViewShowcase}
                  testID="rare-acquisition-showcase"
                />
                <Button
                  accessibilityHint="Ferme cette révélation et revient à l’Atelier"
                  disabled={!ready}
                  fullWidth
                  label="CONTINUER DANS L’ATELIER"
                  onPress={onContinueAtelier}
                  size="compact"
                  testID="rare-acquisition-continue"
                  variant="ghost"
                />
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambient: {
    position: 'absolute',
    top: '-12%',
    alignSelf: 'center',
    width: 330,
    height: 330,
    borderRadius: 165,
    opacity: .08,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  contentLandscape: {
    maxWidth: 860,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  contentCompact: {
    gap: spacing.md,
  },
  artifact: {
    position: 'relative',
    width: '100%',
    height: 270,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    borderWidth: 1,
    backgroundColor: colors.surfaceLow,
  },
  artifactCompact: {
    height: 188,
  },
  artifactLandscape: {
    width: '44%',
    height: 248,
  },
  facetTop: {
    position: 'absolute',
    top: -34,
    right: -44,
    width: 142,
    height: 110,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '-12deg' }],
  },
  facetBottom: {
    position: 'absolute',
    bottom: -40,
    left: -46,
    width: 150,
    height: 120,
    borderTopWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '-12deg' }],
  },
  artifactVisual: {
    width: '82%',
    height: '84%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  identityPreview: {
    width: '100%',
    transform: [{ scale: 1.12 }],
  },
  sweep: {
    position: 'absolute',
    top: '-8%',
    width: 1,
    height: '116%',
    boxShadow: '0 0 20px rgba(255,255,255,.28)',
  },
  categoryPlate: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  category: {
    ...typography.eyebrow,
    letterSpacing: .65,
  },
  copyColumn: {
    gap: spacing.lg,
  },
  copyColumnCompact: {
    gap: spacing.md,
  },
  copyColumnLandscape: {
    flex: 1,
    minWidth: 0,
  },
  accessibilityTitle: {
    gap: spacing.sm,
    outlineWidth: 0,
  },
  origin: {
    ...typography.eyebrow,
    color: colors.textSecondary,
    letterSpacing: .8,
  },
  rarity: {
    marginTop: 4,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.8,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 45,
    letterSpacing: -1,
  },
  titleCompact: {
    fontSize: 40,
    lineHeight: 38,
  },
  description: {
    ...typography.bodyComfort,
    maxWidth: 430,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  provenance: {
    minHeight: 52,
    marginTop: spacing.md,
    paddingLeft: spacing.sm,
    justifyContent: 'center',
    borderLeftWidth: 2,
  },
  provenanceLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
    letterSpacing: .55,
  },
  provenanceValue: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.text,
  },
  actions: {
    gap: spacing.xs,
  },
});
