import { Text, View, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import type { RelicMutationConclusion } from '@/src/features/social/faction/relicMutationMastering';
import type { CommunityForm } from '@/src/features/social/faction/types';

import { relicStyles as styles } from './CollectiveRelic.styles';

type MotionStyle = AnimatedStyle<ViewStyle>;

export function RelicMutationNarrativeOverlay({
  compact,
  conclusion,
  reconstructionMotion,
  ruptureMotion,
  tensionMotion,
  toForm,
}: {
  compact: boolean;
  conclusion: RelicMutationConclusion | null;
  reconstructionMotion: MotionStyle;
  ruptureMotion: MotionStyle;
  tensionMotion: MotionStyle;
  toForm: CommunityForm;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.mutationNarrative, compact && styles.mutationNarrativeCompact]}
    >
      <Animated.View style={[styles.mutationNarrativeItem, tensionMotion]}>
        <View style={styles.mutationNarrativeRule} />
        <View>
          <Text style={styles.mutationNarrativeEyebrow}>TENSION</Text>
          <Text style={styles.mutationNarrativeText}>LE CŒUR CONCENTRE LA CHARGE</Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.mutationNarrativeItem, ruptureMotion]}>
        <View style={[styles.mutationNarrativeRule, styles.mutationNarrativeRuleRupture]} />
        <View>
          <Text style={[styles.mutationNarrativeEyebrow, styles.mutationNarrativeEyebrowRupture]}>RUPTURE</Text>
          <Text style={styles.mutationNarrativeText}>L’ANCIENNE FORME CÈDE</Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.mutationNarrativeItem, reconstructionMotion]}>
        <View style={[styles.mutationNarrativeRule, { backgroundColor: conclusion?.signature.accent }]} />
        <View>
          <Text style={[styles.mutationNarrativeEyebrow, { color: conclusion?.signature.accent }]}>RECONSTRUCTION</Text>
          <Text style={styles.mutationNarrativeText}>PALIER {toForm.code} EN FORMATION</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function RelicMutationSkipOverlay({ compact }: { compact: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.mutationSkip, compact && styles.mutationSkipCompact]}
      testID="relic-mutation-skip-label"
    >
      <Text style={styles.mutationSkipText}>PASSER</Text>
      <Text style={styles.mutationSkipGlyph}>››</Text>
    </View>
  );
}

export function RelicMutationConclusionOverlay({
  compact,
  conclusion,
  labMode,
  motion,
}: {
  compact: boolean;
  conclusion: RelicMutationConclusion;
  labMode: boolean;
  motion: MotionStyle;
}) {
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.mutationConclusion,
        compact && styles.mutationConclusionCompact,
        labMode && styles.labMutationConclusion,
        motion,
      ]}
      testID="relic-mutation-conclusion"
    >
      <View style={[styles.mutationConclusionWash, { backgroundColor: conclusion.signature.wash }]} />
      <View style={[styles.mutationConclusionRule, { backgroundColor: conclusion.signature.accent }]} />
      <View style={styles.mutationConclusionBody}>
        <Text style={[styles.mutationConclusionEyebrow, { color: conclusion.signature.accent }]}>
          {conclusion.signature.eyebrow} · PALIER {conclusion.formCode}
        </Text>
        <View style={styles.mutationConclusionHeadline}>
          <Text numberOfLines={1} style={styles.mutationConclusionName}>{conclusion.formName}</Text>
          <Text numberOfLines={1} style={[styles.mutationConclusionReward, { color: conclusion.signature.accent }]}>
            {conclusion.rewardValue}
          </Text>
        </View>
        <View style={styles.mutationConclusionMeta}>
          <Text style={styles.mutationConclusionLabel}>{conclusion.rewardLabel}</Text>
          <Text numberOfLines={2} style={styles.mutationConclusionNext}>SUIVANT · {conclusion.nextObjective}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
