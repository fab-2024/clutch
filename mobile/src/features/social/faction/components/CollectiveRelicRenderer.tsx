import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { RelicResonanceRingArtwork } from './RelicEnergyArtwork';
import {
  RelicMutationConclusionOverlay,
  RelicMutationNarrativeOverlay,
  RelicMutationSkipOverlay,
} from './CollectiveRelicOverlays';
import { relicStyles as styles } from './CollectiveRelic.styles';
import RelicPedestal, { RelicPedestalBack, RelicPedestalFrontLip } from './RelicPedestal';
import type { RelicAnimationPreset } from './collectiveRelicTypes';
import type { RelicMotionState } from '../relicMotion';
import type { RelicMutationConclusion } from '../relicMutationMastering';
import type { CommunityFaction, CommunityForm } from '../types';

const ARCH_ASSET = require('../../../../../assets/social/faction-relic-arch.png');
const LAB_CHAMBER_ASSET = require('../../../../../assets/social/relic-lab-chamber-v1.png');

type MotionStyle = AnimatedStyle<ViewStyle>;

export type CollectiveRelicRendererMotion = {
  ambient: MotionStyle;
  contact: MotionStyle;
  mutationAura: MotionStyle;
  mutationBackdrop: MotionStyle;
  mutationConclusion: MotionStyle;
  mutationContact: MotionStyle;
  mutationReconstructionCopy: MotionStyle;
  mutationRuptureCopy: MotionStyle;
  mutationTensionCopy: MotionStyle;
  pedestalRest: MotionStyle;
  relicBody: MotionStyle;
  ring: MotionStyle;
  signatureField: MotionStyle;
  signatureOrbit: MotionStyle;
  signaturePulseRing: MotionStyle;
  supporterPedestalSegment: MotionStyle;
};

type Props = {
  accent: string;
  accessibilityHint: string;
  accessibilityLabel: string;
  animationPreset: RelicAnimationPreset;
  canSkipMutation: boolean;
  compact: boolean;
  disabled: boolean;
  faction: CommunityFaction | null;
  labMode: boolean;
  motion: CollectiveRelicRendererMotion;
  motionState: RelicMotionState;
  mutationActive: boolean;
  mutationConclusion: RelicMutationConclusion | null;
  mutationConclusionVisible: boolean;
  mutationContactWidth: number;
  mutationToForm: CommunityForm | null;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  presentedVessel: ReactNode;
  showLegacyScene: boolean;
};

export default function CollectiveRelicRenderer({
  accent,
  accessibilityHint,
  accessibilityLabel,
  animationPreset,
  canSkipMutation,
  compact,
  disabled,
  faction,
  labMode,
  motion,
  motionState,
  mutationActive,
  mutationConclusion,
  mutationConclusionVisible,
  mutationContactWidth,
  mutationToForm,
  onLayout,
  onPress,
  onPressIn,
  onPressOut,
  presentedVessel,
  showLegacyScene,
}: Props) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={mutationConclusionVisible ? 'polite' : 'none'}
      accessibilityRole={mutationConclusionVisible ? 'summary' : 'button'}
      accessibilityState={mutationConclusionVisible ? undefined : { disabled }}
      accessibilityValue={{ text: motionState }}
      disabled={disabled}
      onLayout={onLayout}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.stage, compact && styles.stageCompact]}
      testID="collective-relic-stage"
    >
      {animationPreset === 'skia' ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={LAB_CHAMBER_ASSET}
          style={styles.labChamberBackdrop}
        />
      ) : null}
      <LinearGradient
        colors={animationPreset === 'skia'
          ? ['rgba(0,3,6,.34)', 'rgba(1,5,8,.06)', 'rgba(0,2,4,.3)']
          : ['rgba(2,10,19,.96)', 'rgba(3,28,40,.7)', 'rgba(2,8,14,.18)']}
        locations={animationPreset === 'skia' ? [0, .58, 1] : [0, .54, 1]}
        style={styles.sceneBackdrop}
      />
      <Animated.View pointerEvents="none" style={[styles.mutationBackdrop, motion.mutationBackdrop]} />

      {mutationActive && mutationToForm ? (
        <RelicMutationNarrativeOverlay
          compact={compact}
          conclusion={mutationConclusion}
          reconstructionMotion={motion.mutationReconstructionCopy}
          ruptureMotion={motion.mutationRuptureCopy}
          tensionMotion={motion.mutationTensionCopy}
          toForm={mutationToForm}
        />
      ) : null}

      {canSkipMutation && !mutationConclusionVisible ? <RelicMutationSkipOverlay compact={compact} /> : null}

      {showLegacyScene ? (
        <View pointerEvents="none" style={styles.haloCanvas}>
          <Animated.View style={[styles.ambientEnergy, motion.ambient]}>
            <LinearGradient
              colors={['rgba(5,31,49,.1)', 'rgba(6,55,72,.46)', 'rgba(3,10,18,0)']}
              end={{ x: .5, y: 1 }}
              start={{ x: .5, y: 0 }}
              style={styles.coldAura}
            />
            <LinearGradient
              colors={['rgba(42,220,232,0)', 'rgba(29,185,203,.13)', 'rgba(8,74,91,0)']}
              locations={[0, .52, 1]}
              style={styles.glassHalo}
            />
            <View style={styles.amberAura} />
          </Animated.View>
          <View style={styles.wireLeft} />
          <View style={styles.wireRight} />
          <LinearGradient
            colors={['rgba(2,10,18,0)', 'rgba(2,10,18,.78)', 'rgba(2,8,14,1)']}
            locations={[0, .72, 1]}
            style={styles.haloFade}
          />
        </View>
      ) : null}

      {showLegacyScene ? <Image accessibilityIgnoresInvertColors resizeMode="contain" source={ARCH_ASSET} style={styles.arch} /> : null}
      {showLegacyScene ? <RelicPedestalBack /> : null}

      {animationPreset === 'living' || animationPreset === 'pulse' || animationPreset === 'orbit' ? (
        <Animated.View pointerEvents="none" style={[styles.signatureField, motion.signatureField]} />
      ) : null}
      {animationPreset === 'pulse' ? (
        <Animated.View pointerEvents="none" style={[styles.signaturePulseRing, motion.signaturePulseRing]} />
      ) : null}
      {animationPreset === 'orbit' ? (
        <Animated.View pointerEvents="none" style={[styles.signatureOrbit, motion.signatureOrbit]}>
          <View style={[styles.signatureOrbitNode, styles.signatureOrbitNodePrimary]} />
          <View style={[styles.signatureOrbitNode, styles.signatureOrbitNodeSecondary]} />
        </Animated.View>
      ) : null}

      {mutationActive && showLegacyScene ? <Animated.View pointerEvents="none" style={[styles.labMutationAura, motion.mutationAura]} /> : null}
      {showLegacyScene ? (
        <Animated.View pointerEvents="none" style={[styles.resonanceRing, motion.ring]}>
          <RelicResonanceRingArtwork />
        </Animated.View>
      ) : null}

      {animationPreset === 'classic' || animationPreset === 'skia' ? presentedVessel : (
        <Animated.View pointerEvents="none" style={[styles.vesselMotionLayer, motion.relicBody]}>
          {presentedVessel}
        </Animated.View>
      )}

      {showLegacyScene ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.contactLightLayer, { width: mutationContactWidth }, motion.contact]}
        >
          <Animated.View style={[styles.mutationContactSurface, motion.mutationContact]}>
            <LinearGradient
              colors={['rgba(35,214,231,0)', 'rgba(71,238,246,.34)', 'rgba(35,214,231,0)']}
              end={{ x: 1, y: .5 }}
              locations={[0, .5, 1]}
              start={{ x: 0, y: .5 }}
              style={styles.contactBloom}
            />
            <View style={[styles.contactCore, { width: Math.max(34, mutationContactWidth - 12) }]} />
          </Animated.View>
        </Animated.View>
      ) : null}

      {showLegacyScene ? (
        <>
          <RelicPedestalFrontLip />
          <Animated.View pointerEvents="none" style={[styles.contactCopperReflection, motion.pedestalRest]} />
          <Animated.View pointerEvents="none" style={[styles.supporterPedestalSegment, motion.supporterPedestalSegment]} />
          <RelicPedestal accent={accent} faction={faction} />
        </>
      ) : null}

      {mutationConclusionVisible && mutationConclusion ? (
        <RelicMutationConclusionOverlay
          compact={compact}
          conclusion={mutationConclusion}
          labMode={labMode}
          motion={motion.mutationConclusion}
        />
      ) : null}
    </Pressable>
  );
}
