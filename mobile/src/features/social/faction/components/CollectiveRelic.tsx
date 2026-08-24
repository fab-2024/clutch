import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, Text, View, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  aggregateSupporterContributions,
  clearRelicMutationTimerHandles,
  MUTATION_DURATION_MS,
  mutationElapsedMs,
  mutationSegment,
  observeSupporterCharge,
  RELIC_RESONANCE_MIN_MS,
  RELIC_TAP_MAX_MS,
  resolveRelicGesture,
  resolveRelicInstability,
  resolveRelicMutationTransition,
  shouldEnterMutationReady,
  shouldQueueSupporterContribution,
  shouldStartRelicMutation,
  type RelicContributionBaseline,
  type RelicMutationTransition,
  type RelicMutationTimers,
  type RelicMotionDiagnostics,
  type RelicMotionCommand,
  type RelicMotionPreview,
  type RelicMotionState,
  type SupporterContributionBatch,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import {
  RELIC_HEART_ASSET,
  RELIC_STAGE_ARTWORK,
  type RelicStageArtworkConfig,
} from '@/src/features/social/faction/relicArtwork';
import type {
  CommunityForm,
  CommunityFaction,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { communityFormForLevel } from '@/src/features/social/faction/utils';

import { relicStyles as styles } from './CollectiveRelic.styles';
import {
  RelicGlassHighlightsArtwork,
  RelicCracksArtwork,
  RelicInstabilityArcsArtwork,
  RelicLiquidArtwork,
  RelicMutationFragmentsArtwork,
  RelicMutationLiquidArtwork,
  RelicMutationReturnBubblesArtwork,
  RelicMutationRootsArtwork,
  RelicReconstructionTraceArtwork,
  RelicResonanceRingArtwork,
  RelicRootsArtwork,
  RelicStageLiquidArtwork,
  RelicSupporterArrivalArtwork,
} from './RelicEnergyArtwork';
import RelicLabContainerArtwork from './RelicLabContainerArtwork';
import RelicPedestal, {
  RelicPedestalBack,
  RelicPedestalFrontLip,
} from './RelicPedestal';
import type { RelicScenePoint } from './SupporterArrivalOverlay';

const RELIC_ASSET = RELIC_STAGE_ARTWORK.ampoule.asset;
const ARCH_ASSET = require('../../../../../assets/social/faction-relic-arch.png');

const IDLE_DURATION_MS = 6_400;
const TAP_DURATION_MS = 550;
const RESONANCE_DURATION_MS = 700;
const RECOVERY_DURATION_MS = 300;
const SUPPORTER_ARRIVAL_DURATION_MS = 1_200;
const TWO_PI = Math.PI * 2;

const MOTION_IDLE = 0;
const MOTION_PRESSING = 1;
const MOTION_TAP = 2;
const MOTION_CHARGING = 3;
const MOTION_RESONATING = 4;
const MOTION_RECOVERING = 5;
const MOTION_SUPPORTER_ARRIVAL = 6;
const MOTION_MUTATION_READY = 7;
const MOTION_MUTATING = 8;

const PRESENTED_SUPPORTER_CONTRIBUTION_IDS = new Set<string>();
const PRESENTED_MUTATION_EVENT_IDS = new Set<string>();

type ActiveRelicMutation = {
  event: CommunityMutationPresentation;
  transition: RelicMutationTransition;
};

type CollectiveRelicProps = {
  accent: string;
  faction: CommunityFaction | null;
  labMode?: boolean;
  mutation?: CommunityMutationPresentation | null;
  mutationInterruptSignal?: number;
  mutationPreviewMs?: number | null;
  motionCommand?: RelicMotionCommand | null;
  instabilityPreviewOverride?: { charge: number; objective: number };
  onDiagnosticsChange?: (diagnostics: RelicMotionDiagnostics) => void;
  onLiquidTargetLayout?: (target: RelicScenePoint) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onSupporterArrivalComplete?: () => void;
  onSupporterArrivalStart?: (batch: SupporterContributionBatch) => void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  motionPreviewOverride?: RelicMotionPreview;
  progress: FactionProgress;
  reduceMotionOverride?: boolean;
  supporterArrivalPhase?: SharedValue<number>;
  supporterContribution?: SupporterContributionPresentation | null;
};

export default function CollectiveRelic({
  accent,
  faction,
  labMode = false,
  mutation,
  mutationInterruptSignal,
  mutationPreviewMs,
  motionCommand,
  instabilityPreviewOverride,
  onDiagnosticsChange,
  onLiquidTargetLayout,
  motionPreviewOverride,
  onMutationPresented,
  onSupporterArrivalComplete,
  onSupporterArrivalStart,
  onSupporterContributionPresented,
  progress,
  reduceMotionOverride,
  supporterArrivalPhase,
  supporterContribution,
}: CollectiveRelicProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [routeActive, setRouteActive] = useState(false);
  const [motionState, setMotionState] = useState<RelicMotionState>('idle');
  const [displayForm, setDisplayForm] = useState<CommunityForm>(progress.current);
  const [mutationActive, setMutationActive] = useState(false);
  const [activeMutation, setActiveMutation] = useState<ActiveRelicMutation | null>(null);
  const [activeContribution, setActiveContribution] = useState<SupporterContributionBatch | null>(null);
  const [pendingContribution, setPendingContribution] = useState<SupporterContributionBatch | null>(null);
  const routeActiveRef = useRef(false);
  const motionStateRef = useRef<RelicMotionState>('idle');
  const activeMutationRef = useRef<ActiveRelicMutation | null>(null);
  const presentedMutationIdsRef = useRef(PRESENTED_MUTATION_EVENT_IDS);
  const pressedRef = useRef(false);
  const gestureResolvedRef = useRef(false);
  const pressStartedAtRef = useRef(0);
  const mutationActiveRef = useRef(false);
  const activeContributionRef = useRef<SupporterContributionBatch | null>(null);
  const pendingContributionRef = useRef<SupporterContributionBatch | null>(null);
  const contributionBaselineRef = useRef<RelicContributionBaseline>({ factionId: null, charge: null });
  const contributionBaselineReadyRef = useRef(false);
  const handledContributionIdsRef = useRef(PRESENTED_SUPPORTER_CONTRIBUTION_IDS);
  const handledMutationReadyRef = useRef<string | null>(null);
  const contributionFactionRef = useRef<string | null>(faction?.equipe_id ?? null);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationTimersRef = useRef<RelicMutationTimers>({ impact: null, finish: null });
  const contributionFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginSupporterArrivalRef = useRef<(batch: SupporterContributionBatch) => void>(() => undefined);
  const stageLayoutRef = useRef<LayoutRectangle | null>(null);

  const idlePhase = useSharedValue(0);
  const pressCharge = useSharedValue(0);
  const tapPhase = useSharedValue(0);
  const resonancePhase = useSharedValue(0);
  const mutationPhase = useSharedValue(0);
  const localSupporterPhase = useSharedValue(0);
  const mutationReadyPhase = useSharedValue(0);
  const motionCode = useSharedValue(MOTION_IDLE);
  const supporterPhase = supporterArrivalPhase ?? localSupporterPhase;

  const instability = useMemo(() => resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  ), [instabilityPreviewOverride?.charge, instabilityPreviewOverride?.objective, progress.charge, progress.objective]);
  const instabilityEnergy = instabilityEnergyFor(instability.tier, instability.localIntensity);
  const idlePulseCount = idlePulseCountFor(instability.tier, instability.localIntensity);
  const persistentLiquidLift = Math.min(18, Math.max(0, progress.progress * 15));
  const mutationFromForm = activeMutation
    ? communityFormForLevel(activeMutation.transition.fromLevel)
    : null;
  const mutationToForm = activeMutation
    ? communityFormForLevel(activeMutation.transition.toLevel)
    : null;
  const mutationFromArtwork = mutationFromForm
    ? RELIC_STAGE_ARTWORK[mutationFromForm.container]
    : null;
  const mutationToArtwork = mutationToForm
    ? RELIC_STAGE_ARTWORK[mutationToForm.container]
    : null;
  const mutationFromMetrics = mutationFromArtwork
    ? mutationArtworkMetrics(mutationFromArtwork)
    : null;
  const mutationToMetrics = mutationToArtwork
    ? mutationArtworkMetrics(mutationToArtwork)
    : null;

  const stageLabel = faction
    ? `Relique ${progress.current.name} de ${faction.nom}, ${progress.charge} supporter${progress.charge > 1 ? 's' : ''} sur ${progress.objective}`
    : 'Relique de faction en attente de couleurs';
  const currentProgressLevel = progress.current.level;
  const currentProgressContainer = progress.current.container;
  const currentProgressObjective = progress.objective;

  const clearInteractionTimers = useCallback(() => {
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    chargeTimerRef.current = null;
    holdTimerRef.current = null;
    settleTimerRef.current = null;
  }, []);

  const clearHoldTimers = useCallback(() => {
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    chargeTimerRef.current = null;
    holdTimerRef.current = null;
  }, []);

  const clearMutationTimers = useCallback(() => {
    clearRelicMutationTimerHandles(mutationTimersRef.current);
  }, []);

  const clearContributionTimer = useCallback(() => {
    if (contributionFinishTimerRef.current) clearTimeout(contributionFinishTimerRef.current);
    contributionFinishTimerRef.current = null;
  }, []);

  const updatePendingContribution = useCallback((next: SupporterContributionBatch | null) => {
    pendingContributionRef.current = next;
    setPendingContribution(next);
  }, []);

  const updateActiveContribution = useCallback((next: SupporterContributionBatch | null) => {
    activeContributionRef.current = next;
    setActiveContribution(next);
  }, []);

  const pauseContributionForMutation = useCallback(() => {
    const active = activeContributionRef.current;
    if (active) updatePendingContribution(mergeContributionBatches(pendingContributionRef.current, active));
    clearContributionTimer();
    cancelAnimation(supporterPhase);
    supporterPhase.value = 0;
    updateActiveContribution(null);
    onSupporterArrivalComplete?.();
  }, [clearContributionTimer, onSupporterArrivalComplete, supporterPhase, updateActiveContribution, updatePendingContribution]);

  const setMotion = useCallback((next: RelicMotionState) => {
    motionStateRef.current = next;
    motionCode.value = motionCodeFor(next);
    setMotionState(next);
  }, [motionCode]);

  const stopAnimations = useCallback(() => {
    for (const id of activeContributionRef.current?.ids ?? []) handledContributionIdsRef.current.add(id);
    for (const id of pendingContributionRef.current?.ids ?? []) handledContributionIdsRef.current.add(id);
    clearInteractionTimers();
    clearMutationTimers();
    clearContributionTimer();
    cancelAnimation(idlePhase);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    cancelAnimation(resonancePhase);
    cancelAnimation(mutationPhase);
    cancelAnimation(mutationReadyPhase);
    cancelAnimation(supporterPhase);
    pressedRef.current = false;
    gestureResolvedRef.current = false;
    mutationActiveRef.current = false;
    motionStateRef.current = 'idle';
    motionCode.value = MOTION_IDLE;
    idlePhase.value = 0;
    pressCharge.value = 0;
    tapPhase.value = 0;
    resonancePhase.value = 0;
    mutationPhase.value = 0;
    mutationReadyPhase.value = 0;
    supporterPhase.value = 0;
    updateActiveContribution(null);
    updatePendingContribution(null);
  }, [clearContributionTimer, clearInteractionTimers, clearMutationTimers, idlePhase, motionCode, mutationPhase, mutationReadyPhase, pressCharge, resonancePhase, supporterPhase, tapPhase, updateActiveContribution, updatePendingContribution]);

  const startIdle = useCallback(() => {
    cancelAnimation(idlePhase);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    cancelAnimation(resonancePhase);
    pressCharge.value = 0;
    tapPhase.value = 0;
    resonancePhase.value = 0;
    idlePhase.value = 0;
    setMotion(instability.tier === 'mutationReady' ? 'mutationReady' : 'idle');
    if (!routeActiveRef.current || mutationActiveRef.current || reduceMotion) return;
    idlePhase.value = withRepeat(
      withTiming(1, { duration: IDLE_DURATION_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [idlePhase, instability.tier, pressCharge, reduceMotion, resonancePhase, setMotion, tapPhase]);

  const scheduleIdle = useCallback((delayMs: number) => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      if (!routeActiveRef.current) return;
      const queued = pendingContributionRef.current;
      if (queued && instability.tier !== 'mutationReady' && !mutationActiveRef.current) {
        updatePendingContribution(null);
        setMotion('idle');
        beginSupporterArrivalRef.current(queued);
      } else {
        startIdle();
      }
    }, delayMs);
  }, [instability.tier, setMotion, startIdle, updatePendingContribution]);

  const haptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(style).catch(() => undefined);
  }, []);

  const beginSupporterArrival = useCallback((batch: SupporterContributionBatch) => {
    if (!routeActiveRef.current) return;
    if (shouldQueueSupporterContribution(motionStateRef.current, mutationActiveRef.current)) {
      updatePendingContribution(mergeContributionBatches(pendingContributionRef.current, batch));
      return;
    }

    clearContributionTimer();
    cancelAnimation(idlePhase);
    cancelAnimation(supporterPhase);
    idlePhase.value = 0;
    supporterPhase.value = 0;
    updateActiveContribution(batch);
    setMotion('supporterArrival');
    onSupporterArrivalStart?.(batch);
    supporterPhase.value = withTiming(1, {
      duration: reduceMotion ? 620 : SUPPORTER_ARRIVAL_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });

    const duration = reduceMotion ? 620 : SUPPORTER_ARRIVAL_DURATION_MS;
    contributionFinishTimerRef.current = setTimeout(() => {
      contributionFinishTimerRef.current = null;
      const presented = activeContributionRef.current ?? batch;
      for (const id of presented.ids) {
        handledContributionIdsRef.current.add(id);
        if (onSupporterContributionPresented) {
          void Promise.resolve(onSupporterContributionPresented(id)).catch(() => undefined);
        }
      }
      updateActiveContribution(null);
      supporterPhase.value = 0;
      onSupporterArrivalComplete?.();
      if (!routeActiveRef.current) return;
      const queued = pendingContributionRef.current;
      if (queued && instability.tier !== 'mutationReady' && !mutationActiveRef.current) {
        updatePendingContribution(null);
        setMotion('idle');
        beginSupporterArrivalRef.current(queued);
      } else {
        startIdle();
      }
    }, duration + 24);
  }, [clearContributionTimer, idlePhase, instability.tier, onSupporterArrivalComplete, onSupporterArrivalStart, onSupporterContributionPresented, reduceMotion, setMotion, startIdle, supporterPhase, updateActiveContribution, updatePendingContribution]);

  useEffect(() => {
    beginSupporterArrivalRef.current = beginSupporterArrival;
  }, [beginSupporterArrival]);

  const enqueueSupporterContribution = useCallback((contribution: SupporterContributionPresentation) => {
    if (handledContributionIdsRef.current.has(contribution.id)) return;
    if (activeContributionRef.current?.ids.includes(contribution.id)) return;
    if (pendingContributionRef.current?.ids.includes(contribution.id)) return;

    if (motionStateRef.current === 'supporterArrival' && activeContributionRef.current) {
      const aggregate = aggregateSupporterContributions(activeContributionRef.current, contribution);
      updateActiveContribution(aggregate);
      onSupporterArrivalStart?.(aggregate);
      return;
    }

    const batch = aggregateSupporterContributions(null, contribution);
    if (shouldQueueSupporterContribution(motionStateRef.current, mutationActiveRef.current)) {
      const pending = aggregateSupporterContributions(
        pendingContributionRef.current,
        contribution,
      );
      updatePendingContribution(pending);
      return;
    }
    beginSupporterArrivalRef.current(batch);
  }, [onSupporterArrivalStart, updateActiveContribution, updatePendingContribution]);

  const acknowledgeMutation = useCallback((eventId: string) => {
    if (presentedMutationIdsRef.current.has(eventId)) return;
    presentedMutationIdsRef.current.add(eventId);
    if (onMutationPresented) {
      void Promise.resolve(onMutationPresented(eventId)).catch(() => undefined);
    }
  }, [onMutationPresented]);

  const finishMutation = useCallback((_interrupted = false) => {
    const current = activeMutationRef.current;
    if (!current) return;

    clearMutationTimers();
    cancelAnimation(mutationPhase);
    mutationPhase.value = 0;
    setDisplayForm(communityFormForLevel(current.transition.toLevel));
    activeMutationRef.current = null;
    mutationActiveRef.current = false;
    setActiveMutation(null);
    setMutationActive(false);
    setMotion('idle');
    acknowledgeMutation(current.event.id);

    if (!routeActiveRef.current) return;
    const queued = pendingContributionRef.current;
    if (queued) {
      updatePendingContribution(null);
      beginSupporterArrivalRef.current(queued);
    } else {
      startIdle();
    }
  }, [acknowledgeMutation, clearMutationTimers, mutationPhase, setMotion, startIdle, updatePendingContribution]);

  const finishMutationRef = useRef(finishMutation);
  useEffect(() => {
    finishMutationRef.current = finishMutation;
  }, [finishMutation]);

  const beginResonance = useCallback(() => {
    if (gestureResolvedRef.current) return;
    gestureResolvedRef.current = true;
    clearHoldTimers();
    cancelAnimation(pressCharge);
    cancelAnimation(resonancePhase);
    pressCharge.value = 1;
    resonancePhase.value = 0;
    setMotion('resonating');
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    resonancePhase.value = withTiming(1, {
      duration: RESONANCE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    scheduleIdle(RESONANCE_DURATION_MS);
  }, [clearHoldTimers, haptic, pressCharge, resonancePhase, scheduleIdle, setMotion]);

  const beginTapReaction = useCallback((elapsedMs: number) => {
    const clampedElapsed = Math.min(Math.max(elapsedMs, 0), RELIC_TAP_MAX_MS - 1);
    const initialPhase = clampedElapsed / TAP_DURATION_MS;
    const remaining = Math.max(1, TAP_DURATION_MS - clampedElapsed);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    pressCharge.value = 0;
    tapPhase.value = initialPhase;
    setMotion('tapReaction');
    tapPhase.value = withTiming(1, {
      duration: remaining,
      easing: Easing.out(Easing.cubic),
    });
    scheduleIdle(remaining);
  }, [pressCharge, scheduleIdle, setMotion, tapPhase]);

  const beginRecovery = useCallback(() => {
    cancelAnimation(pressCharge);
    setMotion('recovering');
    pressCharge.value = withTiming(0, {
      duration: RECOVERY_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
    scheduleIdle(RECOVERY_DURATION_MS);
  }, [pressCharge, scheduleIdle, setMotion]);

  const handlePressIn = useCallback(() => {
    if (!routeActiveRef.current || mutationActiveRef.current || progress.level === 0 || motionStateRef.current !== 'idle') return;
    clearInteractionTimers();
    cancelAnimation(idlePhase);
    idlePhase.value = 0;
    tapPhase.value = 0;
    resonancePhase.value = 0;
    pressCharge.value = 0;
    pressedRef.current = true;
    gestureResolvedRef.current = false;
    pressStartedAtRef.current = Date.now();
    setMotion('pressing');
    haptic(Haptics.ImpactFeedbackStyle.Light);
    pressCharge.value = withTiming(1, {
      duration: RELIC_RESONANCE_MIN_MS,
      easing: Easing.inOut(Easing.quad),
    });
    chargeTimerRef.current = setTimeout(() => {
      chargeTimerRef.current = null;
      if (pressedRef.current && !gestureResolvedRef.current) setMotion('charging');
    }, RELIC_TAP_MAX_MS);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (pressedRef.current && !gestureResolvedRef.current) beginResonance();
    }, RELIC_RESONANCE_MIN_MS);
  }, [beginResonance, clearInteractionTimers, haptic, idlePhase, pressCharge, progress.level, resonancePhase, setMotion, tapPhase]);

  const handlePressOut = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    clearHoldTimers();
    const elapsedMs = Date.now() - pressStartedAtRef.current;
    const resolution = resolveRelicGesture(elapsedMs, gestureResolvedRef.current);
    if (!resolution) return;
    if (resolution === 'resonating') {
      beginResonance();
      return;
    }
    gestureResolvedRef.current = true;
    if (resolution === 'tapReaction') beginTapReaction(elapsedMs);
    else beginRecovery();
  }, [beginRecovery, beginResonance, beginTapReaction, clearHoldTimers]);

  const lifecycleStartIdleRef = useRef(startIdle);
  const lifecycleStopAnimationsRef = useRef(stopAnimations);
  useEffect(() => {
    lifecycleStartIdleRef.current = startIdle;
    lifecycleStopAnimationsRef.current = stopAnimations;
  }, [startIdle, stopAnimations]);

  useFocusEffect(useCallback(() => {
    routeActiveRef.current = true;
    contributionBaselineReadyRef.current = false;
    contributionBaselineRef.current = { factionId: null, charge: null };
    setRouteActive(true);
    lifecycleStartIdleRef.current();
    return () => {
      routeActiveRef.current = false;
      finishMutationRef.current(true);
      lifecycleStopAnimationsRef.current();
      setRouteActive(false);
      setMutationActive(false);
      setActiveMutation(null);
      setMotionState('idle');
    };
  }, []));

  useEffect(() => () => {
    routeActiveRef.current = false;
    finishMutationRef.current(true);
    lifecycleStopAnimationsRef.current();
  }, []);

  useEffect(() => {
    if (mutationActiveRef.current) return;
    setDisplayForm(communityFormForLevel(currentProgressLevel));
  }, [currentProgressLevel]);

  useEffect(() => {
    const factionId = faction?.equipe_id ?? null;
    if (contributionFactionRef.current === factionId) return;
    finishMutationRef.current(true);
    contributionFactionRef.current = factionId;
    contributionBaselineReadyRef.current = false;
    contributionBaselineRef.current = { factionId, charge: progress.charge };
    clearContributionTimer();
    cancelAnimation(supporterPhase);
    supporterPhase.value = 0;
    updateActiveContribution(null);
    updatePendingContribution(null);
    onSupporterArrivalComplete?.();
    if (routeActiveRef.current && motionStateRef.current === 'supporterArrival') startIdle();
  }, [clearContributionTimer, faction?.equipe_id, onSupporterArrivalComplete, progress.charge, startIdle, supporterPhase, updateActiveContribution, updatePendingContribution]);

  useEffect(() => {
    if (!routeActive || supporterContribution === undefined) return;
    if (!supporterContribution) return;
    enqueueSupporterContribution(supporterContribution);
  }, [enqueueSupporterContribution, routeActive, supporterContribution]);

  useEffect(() => {
    if (!routeActive || supporterContribution !== undefined) return;
    const factionId = faction?.equipe_id ?? null;
    if (!contributionBaselineReadyRef.current) {
      contributionBaselineRef.current = { factionId, charge: progress.charge };
      contributionBaselineReadyRef.current = true;
      return;
    }
    const observation = observeSupporterCharge(
      contributionBaselineRef.current,
      factionId,
      progress.charge,
    );
    contributionBaselineRef.current = observation.baseline;
    if (observation.contribution) enqueueSupporterContribution(observation.contribution);
  }, [enqueueSupporterContribution, faction?.equipe_id, progress.charge, routeActive, supporterContribution]);

  useEffect(() => {
    if (!routeActive) return;
    const presentationKey = `${faction?.equipe_id ?? 'none'}:${currentProgressContainer}:${currentProgressObjective}`;
    if (!shouldEnterMutationReady(instability.tier, presentationKey, handledMutationReadyRef.current)) {
      if (instability.tier !== 'mutationReady' && motionStateRef.current === 'mutationReady') {
        updatePendingContribution(null);
        startIdle();
      }
      return;
    }
    handledMutationReadyRef.current = presentationKey;
    if (activeContributionRef.current) pauseContributionForMutation();
    clearInteractionTimers();
    cancelAnimation(mutationReadyPhase);
    mutationReadyPhase.value = 0;
    setMotion('mutationReady');
    mutationReadyPhase.value = withTiming(1, {
      duration: reduceMotion ? 520 : 1_240,
      easing: Easing.out(Easing.cubic),
    });
  }, [clearInteractionTimers, currentProgressContainer, currentProgressObjective, faction?.equipe_id, instability.tier, mutationReadyPhase, pauseContributionForMutation, reduceMotion, routeActive, setMotion, startIdle, updatePendingContribution]);

  useEffect(() => {
    const frozenElapsed = mutationPreviewMs === null || mutationPreviewMs === undefined
      ? 0
      : Math.max(0, Math.min(MUTATION_DURATION_MS, mutationPreviewMs));
    const activeEventId = activeMutation?.event.id ?? mutation?.id ?? null;
    onDiagnosticsChange?.({
      state: motionState,
      tier: instability.tier,
      ratio: instability.ratio,
      pendingAmount: pendingContribution?.amount ?? 0,
      aggregatedCount: activeContribution?.count ?? pendingContribution?.count ?? 0,
      mutationFromForm: activeMutation?.transition.fromContainer ?? null,
      mutationToForm: activeMutation?.transition.toContainer ?? null,
      mutationElapsedMs: activeMutation ? frozenElapsed : 0,
      mutationEventId: activeEventId,
      mutationEventPresented: Boolean(
        activeEventId
        && (presentedMutationIdsRef.current.has(activeEventId)
          || (activeMutation && mutationPreviewMs !== null && mutationPreviewMs !== undefined && frozenElapsed >= MUTATION_DURATION_MS)),
      ),
    });
  }, [activeContribution?.count, activeMutation, instability.ratio, instability.tier, motionState, mutation?.id, mutationPreviewMs, onDiagnosticsChange, pendingContribution?.amount, pendingContribution?.count]);

  useEffect(() => {
    if (!routeActive || !motionPreviewOverride) return undefined;
    clearInteractionTimers();
    cancelAnimation(idlePhase);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    cancelAnimation(resonancePhase);
    cancelAnimation(supporterPhase);
    idlePhase.value = 0;
    pressCharge.value = motionPreviewOverride === 'resonancePeak' ? 1 : 0;
    tapPhase.value = motionPreviewOverride === 'tapPeak' ? .47 : 0;
    resonancePhase.value = motionPreviewOverride === 'resonancePeak' ? .23 : 0;
    supporterPhase.value = motionPreviewOverride === 'supporterPeak' ? .5 : 0;
    if (motionPreviewOverride === 'supporterPeak') {
      const previewBatch: SupporterContributionBatch = {
        ids: ['preview-peak'],
        amount: 5,
        count: 1,
        fromCharge: Math.max(0, progress.charge - 5),
        toCharge: progress.charge,
      };
      updateActiveContribution(previewBatch);
      onSupporterArrivalStart?.(previewBatch);
      setMotion('supporterArrival');
    } else {
      setMotion(motionPreviewOverride === 'tapPeak' ? 'tapReaction' : 'resonating');
    }
    return () => {
      supporterPhase.value = 0;
      updateActiveContribution(null);
      onSupporterArrivalComplete?.();
      if (routeActiveRef.current) startIdle();
    };
  }, [clearInteractionTimers, idlePhase, motionPreviewOverride, onSupporterArrivalComplete, onSupporterArrivalStart, pressCharge, progress.charge, resonancePhase, routeActive, setMotion, startIdle, supporterPhase, tapPhase, updateActiveContribution]);

  useEffect(() => {
    if (!labMode || !routeActive || !motionCommand || mutationActiveRef.current) return;

    clearInteractionTimers();
    cancelAnimation(idlePhase);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    cancelAnimation(resonancePhase);
    idlePhase.value = 0;
    pressCharge.value = 0;
    tapPhase.value = 0;
    resonancePhase.value = 0;
    pressedRef.current = false;
    gestureResolvedRef.current = false;

    if (motionCommand.kind === 'idle') {
      startIdle();
      return;
    }

    haptic(Haptics.ImpactFeedbackStyle.Light);
    if (motionCommand.kind === 'tap') {
      gestureResolvedRef.current = true;
      beginTapReaction(0);
      return;
    }

    setMotion('pressing');
    pressCharge.value = withTiming(
      motionCommand.kind === 'resonance' ? 1 : .58,
      {
        duration: motionCommand.kind === 'resonance' ? RELIC_RESONANCE_MIN_MS : 340,
        easing: Easing.inOut(Easing.quad),
      },
    );
    chargeTimerRef.current = setTimeout(() => {
      chargeTimerRef.current = null;
      if (!gestureResolvedRef.current) setMotion('charging');
    }, RELIC_TAP_MAX_MS);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (motionCommand.kind === 'resonance') {
        beginResonance();
      } else {
        gestureResolvedRef.current = true;
        beginRecovery();
      }
    }, motionCommand.kind === 'resonance' ? RELIC_RESONANCE_MIN_MS : 360);
  }, [beginRecovery, beginResonance, beginTapReaction, clearInteractionTimers, haptic, idlePhase, labMode, motionCommand, pressCharge, resonancePhase, routeActive, setMotion, startIdle, tapPhase]);

  useEffect(() => {
    if (!routeActive || !mutation) return;

    const current = activeMutationRef.current;
    if (current?.event.id === mutation.id) {
      if (mutationPreviewMs !== null && mutationPreviewMs !== undefined) {
        cancelAnimation(mutationPhase);
        mutationPhase.value = Math.max(0, Math.min(1, mutationPreviewMs / MUTATION_DURATION_MS));
      }
      return;
    }
    if (!shouldStartRelicMutation(
      mutation,
      current?.event.id ?? null,
      presentedMutationIdsRef.current,
    )) return;

    const transition = resolveRelicMutationTransition(mutation, reduceMotion);
    if (!transition) return;

    const nextActive = { event: mutation, transition };
    clearMutationTimers();
    pauseContributionForMutation();
    clearInteractionTimers();
    cancelAnimation(idlePhase);
    cancelAnimation(pressCharge);
    cancelAnimation(tapPhase);
    cancelAnimation(resonancePhase);
    cancelAnimation(mutationPhase);
    idlePhase.value = 0;
    pressCharge.value = 0;
    tapPhase.value = 0;
    resonancePhase.value = 0;
    mutationPhase.value = 0;
    pressedRef.current = false;
    gestureResolvedRef.current = true;
    mutationActiveRef.current = true;
    activeMutationRef.current = nextActive;
    setMutationActive(true);
    setActiveMutation(nextActive);
    setDisplayForm(communityFormForLevel(transition.fromLevel));
    setMotion('mutating');

    if (mutationPreviewMs !== null && mutationPreviewMs !== undefined) {
      mutationPhase.value = Math.max(0, Math.min(1, mutationPreviewMs / MUTATION_DURATION_MS));
      return;
    }

    mutationPhase.value = withTiming(1, {
      duration: transition.durationMs,
      easing: Easing.linear,
    });

    mutationTimersRef.current.impact = setTimeout(() => {
      mutationTimersRef.current.impact = null;
      if (activeMutationRef.current?.event.id !== mutation.id) return;
      haptic(reduceMotion ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
    }, reduceMotion ? 400 : 1_100);

    mutationTimersRef.current.finish = setTimeout(() => {
      mutationTimersRef.current.finish = null;
      if (activeMutationRef.current?.event.id === mutation.id) finishMutationRef.current(false);
    }, transition.durationMs + 18);
  }, [clearInteractionTimers, clearMutationTimers, haptic, idlePhase, mutation, mutationActive, mutationPhase, mutationPreviewMs, pauseContributionForMutation, pressCharge, reduceMotion, resonancePhase, routeActive, setMotion, tapPhase]);

  useEffect(() => {
    if (!routeActive || !activeMutationRef.current || mutation) return;
    finishMutationRef.current(true);
  }, [mutation, routeActive]);

  useEffect(() => {
    if (!mutationInterruptSignal || !activeMutationRef.current) return;
    finishMutationRef.current(true);
  }, [mutationInterruptSignal]);

  const ambientMotion = useAnimatedStyle(() => {
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    const arrival = supporterArrivalEnergy(supporterPhase.value, motionCode.value);
    return {
      opacity: .82 + breath * .08 + energy * .08 + instabilityEnergy * .14 + arrival * .08,
      transform: [{ scale: reduceMotion ? 1 : 1 + breath * .008 + energy * .012 + instabilityEnergy * .006 + arrival * .01 }],
    };
  }, [idlePulseCount, instability.tier, instabilityEnergy, reduceMotion]);

  const liquidMotion = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: .94 + interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value) * .06 };
    }
    const mode = motionCode.value;
    const idleLift = Math.sin(idlePhase.value * TWO_PI) * (1.5 + instabilityEnergy * 2);
    const resting = isRestingMode(mode);
    let translateY = resting ? idleLift : 0;
    let scaleX = resting ? 1 + Math.sin(idlePhase.value * TWO_PI) * (.006 + instabilityEnergy * .006) : 1;
    let scaleY = 1;
    if (mode === MOTION_PRESSING || mode === MOTION_CHARGING || mode === MOTION_RECOVERING) {
      translateY = -pressCharge.value * 1.2;
      scaleX = 1 - pressCharge.value * .012;
      scaleY = 1 + pressCharge.value * .01;
    } else if (mode === MOTION_TAP) {
      translateY = interpolate(tapPhase.value, [0, .28, .64, 1], [0, 0, -2.5, 0], Extrapolation.CLAMP);
      scaleX = interpolate(tapPhase.value, [0, .28, .64, 1], [1, .99, 1.025, 1], Extrapolation.CLAMP);
    } else if (mode === MOTION_RESONATING) {
      translateY = interpolate(resonancePhase.value, [0, .23, .5, 1], [-1.2, -2.6, .8, 0], Extrapolation.CLAMP);
      scaleX = interpolate(resonancePhase.value, [0, .23, .55, 1], [.988, 1.035, 1.012, 1], Extrapolation.CLAMP);
      scaleY = interpolate(resonancePhase.value, [0, .23, 1], [1.01, .98, 1], Extrapolation.CLAMP);
    } else if (mode === MOTION_SUPPORTER_ARRIVAL) {
      translateY = interpolate(supporterPhase.value, [.56, .72, .84, 1], [0, -1, -2, 0], Extrapolation.CLAMP);
      scaleX = interpolate(supporterPhase.value, [.56, .72, .84, 1], [1, 1.012, 1.024, 1], Extrapolation.CLAMP);
      scaleY = interpolate(supporterPhase.value, [.56, .72, .84, 1], [1, .994, 1.012, 1], Extrapolation.CLAMP);
    }
    return { transform: [{ translateY }, { scaleX }, { scaleY }] };
  }, [instabilityEnergy, reduceMotion]);

  const liquidRefractionMotion = useAnimatedStyle(() => {
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    const arrival = supporterArrivalEnergy(supporterPhase.value, motionCode.value);
    return { opacity: .13 + breath * .06 + energy * .46 + instabilityEnergy * .12 + arrival * .32 };
  }, [idlePulseCount, instability.tier, instabilityEnergy]);

  const rootsBaseMotion = useAnimatedStyle(() => {
    const delayedBreath = instabilityBreath((idlePhase.value + .98) % 1, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    const arrival = supporterArrivalRootsEnergy(supporterPhase.value, motionCode.value);
    return { opacity: .34 + delayedBreath * .08 + energy * .22 + instabilityEnergy * .12 + arrival * .18 };
  }, [idlePulseCount, instability.tier, instabilityEnergy]);

  const rootsPulseMotion = useAnimatedStyle(() => {
    const delayedBreath = instabilityBreath((idlePhase.value + .98) % 1, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    const arrival = supporterArrivalRootsEnergy(supporterPhase.value, motionCode.value);
    return {
      opacity: .02 + delayedBreath * (.07 + instabilityEnergy * .09) + energy * .5 + instabilityEnergy * .08 + arrival * .52,
      transform: [{ scale: reduceMotion ? 1 : .992 + delayedBreath * .012 + energy * .018 + arrival * .012 }],
    };
  }, [idlePulseCount, instability.tier, instabilityEnergy, reduceMotion]);

  const cyanRootsMotion = useAnimatedStyle(() => ({
    opacity: interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value) * .4
      + instabilityEnergy * .12
      + supporterArrivalRootsEnergy(supporterPhase.value, motionCode.value) * .22,
  }), [instabilityEnergy]);

  const heartMotion = useAnimatedStyle(() => {
    const mode = motionCode.value;
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    let scale = 1;
    let opacity = .94;
    if (isRestingMode(mode)) {
      scale = 1 + breath * (.035 + instabilityEnergy * .012);
      opacity = .92 + breath * .08 + instabilityEnergy * .04;
    } else if (mode === MOTION_PRESSING || mode === MOTION_CHARGING || mode === MOTION_RECOVERING) {
      const charge = pressCharge.value;
      scale = charge <= .3
        ? 1 - .06 * (charge / .3)
        : .94 + .08 * ((charge - .3) / .7);
      opacity = .9 + charge * .1;
    } else if (mode === MOTION_TAP) {
      scale = interpolate(tapPhase.value, [0, .164, .473, 1], [1, .94, 1.04, 1], Extrapolation.CLAMP);
      opacity = interpolate(tapPhase.value, [0, .2, .5, 1], [.92, .88, 1, .94], Extrapolation.CLAMP);
    } else if (mode === MOTION_RESONATING) {
      scale = interpolate(resonancePhase.value, [0, .23, .52, 1], [1.02, 1.1, 1.03, 1], Extrapolation.CLAMP);
      opacity = interpolate(resonancePhase.value, [0, .23, .65, 1], [1, 1, .96, .94], Extrapolation.CLAMP);
    } else if (mode === MOTION_SUPPORTER_ARRIVAL) {
      scale = interpolate(supporterPhase.value, [.66, .75, .9, 1], [1, 1.08, 1.025, 1], Extrapolation.CLAMP);
      opacity = interpolate(supporterPhase.value, [.62, .76, 1], [.96, 1, .95], Extrapolation.CLAMP);
    }
    if (mode === MOTION_MUTATION_READY) {
      scale += interpolate(mutationReadyPhase.value, [0, .32, 1], [0, .055, .02], Extrapolation.CLAMP);
      opacity = 1;
    }
    return { opacity, transform: [{ scale: reduceMotion ? 1 : scale }] };
  }, [idlePulseCount, instability.tier, instabilityEnergy, reduceMotion]);

  const heartAuraMotion = useAnimatedStyle(() => {
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    const arrival = supporterArrivalEnergy(supporterPhase.value, motionCode.value);
    return {
      opacity: .22 + breath * .1 + energy * .42 + instabilityEnergy * .15 + arrival * .38,
      transform: [{ scale: reduceMotion ? 1 : .96 + breath * .04 + energy * .18 + instabilityEnergy * .04 + arrival * .12 }],
    };
  }, [idlePulseCount, instability.tier, instabilityEnergy, reduceMotion]);

  const waveMotion = useAnimatedStyle(() => {
    const mode = motionCode.value;
    let opacity = 0;
    let scale = .45;
    if (mode === MOTION_TAP) {
      opacity = interpolate(tapPhase.value, [.15, .3, .72], [0, .64, 0], Extrapolation.CLAMP);
      scale = interpolate(tapPhase.value, [.15, .72], [.45, 1.65], Extrapolation.CLAMP);
    } else if (mode === MOTION_RESONATING) {
      opacity = interpolate(resonancePhase.value, [0, .12, .52], [.25, .82, 0], Extrapolation.CLAMP);
      scale = interpolate(resonancePhase.value, [0, .52], [.62, 2], Extrapolation.CLAMP);
    } else if (mode === MOTION_MUTATION_READY) {
      opacity = interpolate(mutationReadyPhase.value, [0, .16, .8, 1], [0, .48, .12, 0], Extrapolation.CLAMP);
      scale = interpolate(mutationReadyPhase.value, [0, 1], [.7, 2.15], Extrapolation.CLAMP);
    }
    return { opacity, transform: [{ scale: reduceMotion ? 1 : scale }] };
  }, [reduceMotion]);

  const ringMotion = useAnimatedStyle(() => {
    const mode = motionCode.value;
    let opacity = 0;
    let rotation = 0;
    if (mode === MOTION_CHARGING || mode === MOTION_PRESSING || mode === MOTION_RECOVERING) {
      opacity = interpolate(pressCharge.value, [.3, .7, 1], [0, .22, .48], Extrapolation.CLAMP);
      rotation = pressCharge.value * 1.2;
    } else if (mode === MOTION_RESONATING) {
      opacity = interpolate(resonancePhase.value, [0, .18, .72, 1], [.48, .82, .2, 0], Extrapolation.CLAMP);
      rotation = interpolate(resonancePhase.value, [0, .23, 1], [1.2, 5, 0], Extrapolation.CLAMP);
    }
    return {
      opacity,
      transform: [{ rotate: `${reduceMotion ? 0 : rotation}deg` }],
    };
  }, [reduceMotion]);

  const contactMotion = useAnimatedStyle(() => {
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    return { opacity: .88 + breath * .04 + energy * .08 + instabilityEnergy * .06 };
  }, [idlePulseCount, instability.tier, instabilityEnergy]);

  const pedestalRestMotion = useAnimatedStyle(() => ({
    opacity: .76 + instabilityEnergy * .2,
  }), [instabilityEnergy]);

  const supporterPedestalSegmentMotion = useAnimatedStyle(() => ({
    opacity: interpolate(supporterPhase.value, [.74, .81, .96, 1], [0, .92, .34, 0], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(supporterPhase.value, [.74, .84, 1], [.4, 1, .82], Extrapolation.CLAMP) }],
  }));

  const instabilityArcsMotion = useAnimatedStyle(() => {
    if (reduceMotion || instability.tier !== 'critical') return { opacity: 0 };
    const rarity = Math.pow(Math.max(0, Math.sin(idlePhase.value * TWO_PI * 3 - .7)), 12);
    return { opacity: rarity * (.24 + instability.localIntensity * .46) };
  }, [instability.localIntensity, instability.tier, reduceMotion]);

  const idleBubbleMotion = useAnimatedStyle(() => {
    if (!isRestingMode(motionCode.value)) return { opacity: 0 };
    const phase = idlePhase.value;
    const local = Math.max(0, Math.min(1, (phase - .12) / .72));
    return {
      opacity: reduceMotion ? .24 : Math.sin(local * Math.PI) * .62,
      transform: reduceMotion
        ? [{ translateY: 0 }]
        : [{ translateX: Math.sin(local * Math.PI) * 3.5 }, { translateY: -local * 52 }, { scale: .82 + local * .16 }],
    };
  }, [reduceMotion]);

  const idleBubbleTwoMotion = useAnimatedStyle(() => {
    if (!isRestingMode(motionCode.value) || instability.tier === 'calm') return { opacity: 0 };
    const local = Math.max(0, Math.min(1, (idlePhase.value - .5) / .42));
    const tierOpacity = instability.tier === 'awakening'
      ? .18 + instability.localIntensity * .2
      : .52 + instabilityEnergy * .18;
    return {
      opacity: reduceMotion ? .12 : Math.sin(local * Math.PI) * tierOpacity,
      transform: reduceMotion
        ? [{ translateY: 0 }]
        : [{ translateX: -Math.sin(local * Math.PI) * 2.5 }, { translateY: -local * 44 }, { scale: .72 + local * .12 }],
    };
  }, [instability.localIntensity, instability.tier, instabilityEnergy, reduceMotion]);

  const idleBubbleThreeMotion = useAnimatedStyle(() => {
    if (!isRestingMode(motionCode.value) || instability.tier !== 'critical' || reduceMotion) return { opacity: 0 };
    const local = Math.max(0, Math.min(1, (idlePhase.value - .73) / .24));
    return {
      opacity: Math.sin(local * Math.PI) * (.32 + instability.localIntensity * .22),
      transform: [{ translateX: Math.sin(local * Math.PI) * 2 }, { translateY: -local * 37 }, { scale: .68 + local * .14 }],
    };
  }, [instability.localIntensity, instability.tier, reduceMotion]);

  const tapBubbleMotion = useAnimatedStyle(() => {
    if (motionCode.value !== MOTION_TAP) return { opacity: 0 };
    const local = interpolate(tapPhase.value, [.27, .64], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: Math.sin(local * Math.PI) * .78,
      transform: reduceMotion ? [{ translateY: 0 }] : [{ translateX: local * -3 }, { translateY: -local * 46 }],
    };
  }, [reduceMotion]);

  const resonanceBubbleOne = useAnimatedStyle(() => resonanceBubbleStyle(resonancePhase.value, 0, motionCode.value, reduceMotion));
  const resonanceBubbleTwo = useAnimatedStyle(() => resonanceBubbleStyle(resonancePhase.value, .035, motionCode.value, reduceMotion));
  const resonanceBubbleThree = useAnimatedStyle(() => resonanceBubbleStyle(resonancePhase.value, .07, motionCode.value, reduceMotion));

  const mutationBackdropMotion = useAnimatedStyle(() => {
    if (!mutationActive) return { opacity: 0 };
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    if (reduceMotion) {
      const enter = mutationSegment(elapsed, 0, 180);
      const leave = mutationSegment(elapsed, 680, 800);
      return { opacity: .3 * enter * (1 - leave) };
    }
    const enter = mutationSegment(elapsed, 0, 300);
    const leave = mutationSegment(elapsed, 2_600, 2_900);
    return { opacity: .56 * enter * (1 - leave) };
  }, [mutationActive, reduceMotion]);

  const mutationAuraMotion = useAnimatedStyle(() => {
    if (!mutationActive) return { opacity: 0 };
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    if (reduceMotion) {
      const pulse = Math.sin(mutationSegment(elapsed, 180, 680) * Math.PI);
      return { opacity: pulse * .24, transform: [{ scale: 1 }] };
    }
    const charge = mutationSegment(elapsed, 200, 900);
    const release = mutationSegment(elapsed, 1_050, 1_420);
    const restore = mutationSegment(elapsed, 2_300, 2_900);
    return {
      opacity: Math.max(0, charge * .58 * (1 - release) + (1 - restore) * .1),
      transform: [{ scale: .74 + charge * .5 + release * .18 }],
    };
  }, [mutationActive, reduceMotion]);

  const mutationLocalFlashMotion = useAnimatedStyle(() => {
    if (!mutationActive || reduceMotion) return { opacity: 0, transform: [{ scale: .5 }] };
    const elapsed = mutationElapsedMs(mutationPhase.value, false);
    const local = mutationSegment(elapsed, 1_050, 1_240);
    return {
      opacity: Math.sin(local * Math.PI) * .94,
      transform: [{ scale: .42 + local * 1.28 }],
    };
  }, [mutationActive, reduceMotion]);

  const mutationImplosionWaveMotion = useAnimatedStyle(() => {
    if (!mutationActive || reduceMotion) return { opacity: 0, transform: [{ scale: .35 }] };
    const elapsed = mutationElapsedMs(mutationPhase.value, false);
    const local = mutationSegment(elapsed, 1_075, 1_390);
    return {
      opacity: Math.sin(local * Math.PI) * .72,
      transform: [{ scale: .35 + local * 2.1 }],
    };
  }, [mutationActive, reduceMotion]);

  const mutationHeartMotion = useAnimatedStyle(() => {
    const fromY = mutationFromMetrics?.heartCenterY ?? 0;
    const toY = mutationToMetrics?.heartCenterY ?? fromY;
    const fromSize = mutationFromMetrics?.heartSize ?? 56;
    const toSize = mutationToMetrics?.heartSize ?? fromSize;
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    const travel = reduceMotion
      ? mutationSegment(elapsed, 180, 520)
      : mutationSegment(elapsed, 1_150, 2_000);
    let energyScale = 1;
    if (reduceMotion) {
      energyScale = 1 + Math.sin(mutationSegment(elapsed, 180, 620) * Math.PI) * .03;
    } else if (elapsed < 650) {
      energyScale = 1 + mutationSegment(elapsed, 200, 650) * .12;
    } else if (elapsed < 1_150) {
      energyScale = 1.12 - mutationSegment(elapsed, 900, 1_150) * .02;
    } else if (elapsed < 1_650) {
      energyScale = 1.1 - mutationSegment(elapsed, 1_150, 1_650) * .04;
    } else {
      energyScale = 1.06 - mutationSegment(elapsed, 1_650, 2_900) * .06;
    }
    const sizeScale = 1 + (toSize / Math.max(1, fromSize) - 1) * travel;
    return {
      opacity: 1,
      transform: [
        { translateY: (toY - fromY) * travel },
        { scale: energyScale * sizeScale },
      ],
    };
  }, [mutationFromMetrics?.heartCenterY, mutationFromMetrics?.heartSize, mutationToMetrics?.heartCenterY, mutationToMetrics?.heartSize, reduceMotion]);

  const mutationHeartAuraMotion = useAnimatedStyle(() => {
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    const charge = reduceMotion
      ? Math.sin(mutationSegment(elapsed, 180, 680) * Math.PI)
      : mutationSegment(elapsed, 200, 900) * (1 - mutationSegment(elapsed, 2_300, 2_900));
    return {
      opacity: .3 + charge * .52,
      transform: [{ scale: reduceMotion ? 1 : .88 + charge * .48 }],
    };
  }, [reduceMotion]);

  const mutationContactMotion = useAnimatedStyle(() => {
    if (!mutationActive) return { opacity: 1, transform: [{ scaleX: 1 }] };
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    const maxWidth = Math.max(1, mutationFromArtwork?.contactWidth ?? 1, mutationToArtwork?.contactWidth ?? 1);
    const fromScale = (mutationFromArtwork?.contactWidth ?? maxWidth) / maxWidth;
    const toScale = (mutationToArtwork?.contactWidth ?? maxWidth) / maxWidth;
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return { opacity: .76 + crossfade * .2, transform: [{ scaleX: fromScale + (toScale - fromScale) * crossfade }] };
    }
    const disappear = mutationSegment(elapsed, 550, 900);
    const reappear = mutationSegment(elapsed, 1_550, 2_000);
    const visibility = elapsed < 1_150 ? 1 - disappear : reappear;
    return {
      opacity: visibility,
      transform: [{ scaleX: fromScale + (toScale - fromScale) * reappear }],
    };
  }, [mutationActive, mutationFromArtwork?.contactWidth, mutationToArtwork?.contactWidth, reduceMotion]);

  const mutationRevealMotion = useAnimatedStyle(() => {
    const elapsed = mutationElapsedMs(mutationPhase.value, reduceMotion);
    const enter = reduceMotion
      ? mutationSegment(elapsed, 500, 590)
      : mutationSegment(elapsed, 2_200, 2_340);
    const exit = reduceMotion
      ? mutationSegment(elapsed, 680, 780)
      : mutationSegment(elapsed, 2_480, 2_600);
    return {
      opacity: enter * (1 - exit),
      transform: [{ translateY: (1 - enter) * 8 - exit * 4 }],
    };
  }, [reduceMotion]);

  const alternateVesselMotion = useAnimatedStyle(() => {
    const breath = instabilityBreath(idlePhase.value, idlePulseCount, instability.tier === 'critical' ? .16 : 0);
    const energy = interactionEnergy(motionCode.value, pressCharge.value, tapPhase.value, resonancePhase.value);
    return {
      opacity: .92 + energy * .08,
      transform: [
        { translateY: reduceMotion ? 0 : (breath - .5) * 1.2 },
        { scale: reduceMotion ? 1 : 1 + breath * .003 + energy * .015 },
      ],
    };
  }, [idlePulseCount, instability.tier, reduceMotion]);

  const stageArtwork = RELIC_STAGE_ARTWORK[displayForm.container];
  const labContainerLayout = stageArtwork.layout;
  const labLayoutScale = labContainerLayout.height / 330;
  const labLayoutOffsetX = (labContainerLayout.width - 220 * labLayoutScale) / 2;
  const labContainerImageLayout = {
    height: labContainerLayout.height,
    top: labContainerLayout.top,
    width: labContainerLayout.width,
  };
  const labRootsFrame = {
    height: stageArtwork.rootsFrame.height * labLayoutScale,
    left: labLayoutOffsetX + stageArtwork.rootsFrame.x * labLayoutScale,
    top: stageArtwork.rootsFrame.y * labLayoutScale,
    width: stageArtwork.rootsFrame.width * labLayoutScale,
  };
  const labHeartSize = 56 * stageArtwork.heartScale;
  const labHeartCenterX = labLayoutOffsetX + stageArtwork.heartX * labLayoutScale;
  const labHeartCenterY = stageArtwork.heartY * labLayoutScale;
  const labHeartFrame = {
    height: labHeartSize,
    left: labHeartCenterX - labHeartSize / 2,
    top: labHeartCenterY - labHeartSize / 2,
    width: labHeartSize,
  };
  const labAuraSize = 64 * stageArtwork.heartScale;
  const labAuraFrame = {
    height: labAuraSize,
    left: labHeartCenterX - labAuraSize / 2,
    top: labHeartCenterY - labAuraSize / 2,
    width: labAuraSize,
  };
  const showAlternateContainer = displayForm.container !== 'ampoule';
  const reportLiquidTarget = useCallback((layout: LayoutRectangle) => {
    if (!onLiquidTargetLayout) return;
    const artworkScale = stageArtwork.layout.height / 330;
    const surfaceY = displayForm.container === 'ampoule'
      ? 5 + 132 + 20 - persistentLiquidLift
      : 5
        + stageArtwork.layout.top
        + (stageArtwork.liquidLevel - persistentLiquidLift) * artworkScale;
    onLiquidTargetLayout({
      x: layout.x + layout.width / 2,
      y: layout.y + surfaceY,
    });
  }, [displayForm.container, onLiquidTargetLayout, persistentLiquidLift, stageArtwork]);
  const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
    stageLayoutRef.current = event.nativeEvent.layout;
    reportLiquidTarget(event.nativeEvent.layout);
  }, [reportLiquidTarget]);

  useEffect(() => {
    if (stageLayoutRef.current) reportLiquidTarget(stageLayoutRef.current);
  }, [reportLiquidTarget]);

  const phaseOneVessel = (
    <View pointerEvents="none" style={styles.vesselCanvas}>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={RELIC_ASSET} style={styles.image} />

      <View style={styles.liquidMask}>
        <Animated.View style={[styles.liquidArtwork, liquidMotion]}>
          <RelicLiquidArtwork levelLift={persistentLiquidLift} />
        </Animated.View>

        <LinearGradient
          colors={['rgba(13,8,36,0)', 'rgba(18,7,43,.82)', 'rgba(13,8,36,.94)', 'rgba(13,8,36,0)']}
          locations={[0, .28, .7, 1]}
          style={styles.oldCoreVeil}
        />

        <Animated.View style={[styles.rootsLayer, rootsBaseMotion]}><RelicRootsArtwork container="ampoule" /></Animated.View>
        <Animated.View style={[styles.rootsLayer, rootsPulseMotion]}><RelicRootsArtwork container="ampoule" tone="bright" /></Animated.View>
        <Animated.View style={[styles.rootsLayer, cyanRootsMotion]}><RelicRootsArtwork container="ampoule" tone="cyan" /></Animated.View>
        <Animated.View style={[styles.rootsLayer, instabilityArcsMotion]}><RelicInstabilityArcsArtwork container="ampoule" /></Animated.View>

        <Animated.View style={[styles.heartAura, heartAuraMotion]} />
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={RELIC_HEART_ASSET}
          style={[styles.heart, heartMotion]}
        />
        <Animated.View style={[styles.heartWave, waveMotion]} />

        <Animated.View style={[styles.liquidRefraction, liquidRefractionMotion]}>
          <LinearGradient
            colors={['rgba(49,215,226,0)', 'rgba(77,40,126,.34)', 'rgba(49,215,226,.18)', 'rgba(49,215,226,0)']}
            end={{ x: 1, y: 1 }}
            locations={[0, .36, .62, 1]}
            start={{ x: 0, y: 0 }}
            style={styles.liquidRefractionFill}
          />
        </Animated.View>

        <View style={styles.glassHighlights}><RelicGlassHighlightsArtwork /></View>

        <Animated.View style={[styles.bubble, styles.idleBubble, idleBubbleMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.idleBubbleTwo, idleBubbleTwoMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.idleBubbleThree, idleBubbleThreeMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.tapBubble, tapBubbleMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.resonanceBubbleOne, resonanceBubbleOne]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.resonanceBubbleTwo, resonanceBubbleTwo]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.resonanceBubbleThree, resonanceBubbleThree]}><View style={styles.bubbleHighlight} /></Animated.View>
      </View>

      <View style={[styles.supporterInternalArtwork, styles.ampouleInternalArtwork]}>
        <RelicSupporterArrivalArtwork
          amount={activeContribution?.amount ?? 1}
          config={RELIC_STAGE_ARTWORK.ampoule}
          levelLift={persistentLiquidLift}
          phase={supporterPhase}
          reduceMotion={reduceMotion}
        />
      </View>
    </View>
  );

  const alternateVessel = (
    <View pointerEvents="none" style={styles.vesselCanvas}>
      <Animated.View
        style={[styles.labContainerImage, labContainerImageLayout, alternateVesselMotion]}
      >
        <RelicLabContainerArtwork source={stageArtwork.asset} />

        <Animated.View style={[styles.labLiquidLayer, liquidMotion]}>
          <RelicStageLiquidArtwork config={stageArtwork} container={displayForm.container} levelLift={persistentLiquidLift} />
        </Animated.View>

        <Animated.View style={[styles.labRootsLayer, labRootsFrame, rootsBaseMotion]}>
          <RelicRootsArtwork container={displayForm.container} />
        </Animated.View>
        <Animated.View style={[styles.labRootsLayer, labRootsFrame, rootsPulseMotion]}>
          <RelicRootsArtwork container={displayForm.container} tone="bright" />
        </Animated.View>
        <Animated.View style={[styles.labRootsLayer, labRootsFrame, cyanRootsMotion]}>
          <RelicRootsArtwork container={displayForm.container} tone="cyan" />
        </Animated.View>
        <Animated.View style={[styles.labRootsLayer, labRootsFrame, instabilityArcsMotion]}>
          <RelicInstabilityArcsArtwork container={displayForm.container} />
        </Animated.View>

        <Animated.View style={[styles.labHeartAura, labAuraFrame, heartAuraMotion]} />
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={RELIC_HEART_ASSET}
          style={[styles.labHeart, labHeartFrame, heartMotion]}
        />
        <Animated.View
          style={[
            styles.labCoreWave,
            { left: labHeartCenterX - 26, top: labHeartCenterY - 4 },
            waveMotion,
          ]}
        />

        <Animated.View style={[styles.labRefraction, labRootsFrame, liquidRefractionMotion]}>
          <LinearGradient
            colors={['rgba(49,215,226,0)', 'rgba(77,40,126,.24)', 'rgba(49,215,226,.12)', 'rgba(49,215,226,0)']}
            end={{ x: 1, y: 1 }}
            locations={[0, .36, .62, 1]}
            start={{ x: 0, y: 0 }}
            style={styles.liquidRefractionFill}
          />
        </Animated.View>
        <View style={styles.supporterInternalArtwork}>
          <RelicSupporterArrivalArtwork
            amount={activeContribution?.amount ?? 1}
            config={stageArtwork}
            levelLift={persistentLiquidLift}
            phase={supporterPhase}
            reduceMotion={reduceMotion}
          />
        </View>
        <View style={[styles.labGlassHighlights, labRootsFrame]}>
          <RelicGlassHighlightsArtwork />
        </View>

        <Animated.View style={[styles.bubble, { left: labHeartCenterX + 11, top: labHeartCenterY - 5 }, idleBubbleMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX - 17, top: labHeartCenterY - 7 }, idleBubbleTwoMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX + 20, top: labHeartCenterY - 4 }, idleBubbleThreeMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX - 12, top: labHeartCenterY - 3 }, tapBubbleMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX - 6, top: labHeartCenterY - 4 }, resonanceBubbleOne]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX + 3, top: labHeartCenterY - 8 }, resonanceBubbleTwo]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, { left: labHeartCenterX + 14, top: labHeartCenterY - 2 }, resonanceBubbleThree]}><View style={styles.bubbleHighlight} /></Animated.View>
      </Animated.View>
    </View>
  );

  const vessel = showAlternateContainer ? alternateVessel : phaseOneVessel;
  const mutationContactWidth = activeMutation && mutationFromArtwork && mutationToArtwork
    ? Math.max(mutationFromArtwork.contactWidth, mutationToArtwork.contactWidth)
    : stageArtwork.contactWidth;
  const mutationHeartBaseSize = mutationFromMetrics?.heartSize ?? 56;
  const mutationHeartFrame = mutationFromMetrics ? {
    height: mutationHeartBaseSize,
    left: '50%' as const,
    marginLeft: -mutationHeartBaseSize / 2,
    top: mutationFromMetrics.heartCenterY - mutationHeartBaseSize / 2,
    width: mutationHeartBaseSize,
  } : null;
  const mutationAuraSize = mutationHeartBaseSize * 1.75;
  const mutationHeartAuraFrame = mutationFromMetrics ? {
    height: mutationAuraSize,
    left: '50%' as const,
    marginLeft: -mutationAuraSize / 2,
    top: mutationFromMetrics.heartCenterY - mutationAuraSize / 2,
    width: mutationAuraSize,
  } : null;
  const mutationScene = activeMutation && mutationFromForm && mutationToForm && mutationFromArtwork && mutationToArtwork && mutationHeartFrame && mutationHeartAuraFrame ? (
    <View pointerEvents="none" style={styles.vesselCanvas}>
      <RelicMutationVesselLayer
        config={mutationFromArtwork}
        form={mutationFromForm}
        kind="old"
        levelLift={18}
        phase={mutationPhase}
        reduceMotion={reduceMotion}
      />
      <RelicMutationVesselLayer
        config={mutationToArtwork}
        form={mutationToForm}
        kind="new"
        levelLift={persistentLiquidLift}
        phase={mutationPhase}
        reduceMotion={reduceMotion}
      />

      <View style={styles.mutationEnergyLayer}>
        <Animated.View style={[styles.mutationHeartAura, mutationHeartAuraFrame, mutationHeartAuraMotion]} />
        <Animated.View style={[styles.mutationLocalFlash, mutationHeartAuraFrame, mutationLocalFlashMotion]} />
        <Animated.View style={[styles.mutationImplosionWave, mutationHeartAuraFrame, mutationImplosionWaveMotion]} />
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={RELIC_HEART_ASSET}
          style={[styles.mutationHeart, mutationHeartFrame, mutationHeartMotion]}
        />
      </View>
    </View>
  ) : null;

  return (
    <Pressable
      accessibilityHint={progress.level === 0 ? 'La première charge collective est nécessaire' : 'Touche rapidement pour une réaction, ou maintiens pour faire résonner le cœur'}
      accessibilityLabel={stageLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: progress.level === 0 || mutationActive || motionState === 'supporterArrival' || instability.tier === 'mutationReady' }}
      accessibilityValue={{ text: motionState }}
      disabled={progress.level === 0 || mutationActive || motionState === 'supporterArrival' || instability.tier === 'mutationReady'}
      onLayout={handleStageLayout}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.stage}
    >
      <LinearGradient
        colors={['rgba(2,10,19,.96)', 'rgba(3,28,40,.7)', 'rgba(2,8,14,.18)']}
        locations={[0, .54, 1]}
        style={styles.sceneBackdrop}
      />
      <Animated.View pointerEvents="none" style={[styles.mutationBackdrop, mutationBackdropMotion]} />

      <View pointerEvents="none" style={styles.haloCanvas}>
        <Animated.View style={[styles.ambientEnergy, ambientMotion]}>
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

      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={ARCH_ASSET} style={styles.arch} />

      <RelicPedestalBack />

      {mutationActive ? <Animated.View pointerEvents="none" style={[styles.labMutationAura, mutationAuraMotion]} /> : null}

      <Animated.View pointerEvents="none" style={[styles.resonanceRing, ringMotion]}>
        <RelicResonanceRingArtwork />
      </Animated.View>

      {mutationScene ?? vessel}

      <Animated.View
        pointerEvents="none"
        style={[styles.contactLightLayer, { width: mutationContactWidth }, contactMotion]}
      >
        <Animated.View style={[styles.mutationContactSurface, mutationContactMotion]}>
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

      <RelicPedestalFrontLip />
      <Animated.View pointerEvents="none" style={[styles.contactCopperReflection, pedestalRestMotion]} />
      <Animated.View pointerEvents="none" style={[styles.supporterPedestalSegment, supporterPedestalSegmentMotion]} />
      <RelicPedestal accent={accent} faction={faction} />

      {activeMutation && mutationToForm ? (
        <Animated.View accessibilityLiveRegion="polite" style={[styles.reveal, labMode && styles.labReveal, mutationRevealMotion]}>
          <Text style={styles.revealEyebrow}>MUTATION ACCOMPLIE</Text>
          <Text style={styles.revealName}>{mutationToForm.name.toUpperCase()}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

function RelicMutationVesselLayer({
  config,
  form,
  kind,
  levelLift,
  phase,
  reduceMotion,
}: {
  config: RelicStageArtworkConfig;
  form: CommunityForm;
  kind: 'old' | 'new';
  levelLift: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const metrics = mutationArtworkMetrics(config);
  const frame = {
    height: config.layout.height,
    top: config.layout.top,
    width: config.layout.width,
  };
  const revealBottom = 270 - config.layout.top - config.layout.height;
  const oldMotion = useAnimatedStyle(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return { opacity: 1 - crossfade, transform: [{ scale: 1 }] };
    }
    const implosion = mutationSegment(elapsed, 1_050, 1_150);
    return {
      opacity: 1 - implosion,
      transform: [{ scale: 1 - implosion * .14 }],
    };
  }, [reduceMotion]);
  const revealClipMotion = useAnimatedStyle(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return { height: config.layout.height, opacity: crossfade };
    }
    const reveal = mutationSegment(elapsed, 1_150, 1_650);
    return {
      height: Math.max(.1, config.layout.height * reveal),
      opacity: mutationSegment(elapsed, 1_150, 1_300),
    };
  }, [config.layout.height, reduceMotion]);
  const reconstructionMotion = useAnimatedStyle(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    const reveal = reduceMotion
      ? mutationSegment(elapsed, 180, 520)
      : mutationSegment(elapsed, 1_150, 1_650);
    const scale = reduceMotion ? 1 : .94 + reveal * .06;
    return {
      opacity: reveal,
      transform: [
        { scale },
        { translateY: (1 - scale) * config.layout.height / 2 },
      ],
    };
  }, [config.layout.height, reduceMotion]);

  if (kind === 'old') {
    return (
      <Animated.View style={[styles.labContainerImage, frame, oldMotion]}>
        <MutationVesselContents
          config={config}
          form={form}
          kind={kind}
          levelLift={levelLift}
          metrics={metrics}
          phase={phase}
          reduceMotion={reduceMotion}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.mutationRevealClip,
        { bottom: revealBottom, width: config.layout.width },
        revealClipMotion,
      ]}
    >
      <Animated.View
        style={[
          styles.mutationVesselInner,
          { height: config.layout.height, width: config.layout.width },
          reconstructionMotion,
        ]}
      >
        <MutationVesselContents
          config={config}
          form={form}
          kind={kind}
          levelLift={levelLift}
          metrics={metrics}
          phase={phase}
          reduceMotion={reduceMotion}
        />
      </Animated.View>
    </Animated.View>
  );
}

function MutationVesselContents({
  config,
  form,
  kind,
  levelLift,
  metrics,
  phase,
  reduceMotion,
}: {
  config: RelicStageArtworkConfig;
  form: CommunityForm;
  kind: 'old' | 'new';
  levelLift: number;
  metrics: ReturnType<typeof mutationArtworkMetrics>;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  return (
    <>
      <View style={styles.mutationVesselImage}>
        <RelicLabContainerArtwork source={config.asset} />
      </View>
      <View style={styles.mutationVesselLiquid}>
        <RelicMutationLiquidArtwork
          config={config}
          container={form.container}
          kind={kind}
          levelLift={levelLift}
          phase={phase}
          reduceMotion={reduceMotion}
        />
      </View>
      <View style={[styles.mutationVesselRoots, metrics.rootsFrame]}>
        <RelicMutationRootsArtwork
          container={form.container}
          kind={kind}
          phase={phase}
          reduceMotion={reduceMotion}
        />
      </View>
      {kind === 'old' ? (
        <>
          <View style={styles.mutationVesselEffects}>
            <RelicCracksArtwork
              config={config}
              container={form.container}
              phase={phase}
              reduceMotion={reduceMotion}
            />
          </View>
          <View style={styles.mutationVesselEffects}>
            <RelicMutationFragmentsArtwork config={config} phase={phase} reduceMotion={reduceMotion} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.mutationVesselEffects}>
            <RelicReconstructionTraceArtwork
              config={config}
              container={form.container}
              phase={phase}
              reduceMotion={reduceMotion}
            />
          </View>
          <View style={styles.mutationVesselEffects}>
            <RelicMutationReturnBubblesArtwork
              config={config}
              container={form.container}
              phase={phase}
              reduceMotion={reduceMotion}
            />
          </View>
        </>
      )}
    </>
  );
}

function mutationArtworkMetrics(config: RelicStageArtworkConfig) {
  const layoutScale = config.layout.height / 330;
  const layoutOffsetX = (config.layout.width - 220 * layoutScale) / 2;
  return {
    contactCenterY: config.layout.top + config.contactY * layoutScale,
    heartCenterX: layoutOffsetX + config.heartX * layoutScale,
    heartCenterY: config.layout.top + config.heartY * layoutScale,
    heartSize: 56 * config.heartScale * layoutScale,
    rootsFrame: {
      height: config.rootsFrame.height * layoutScale,
      left: layoutOffsetX + config.rootsFrame.x * layoutScale,
      top: config.rootsFrame.y * layoutScale,
      width: config.rootsFrame.width * layoutScale,
    },
  };
}

function motionCodeFor(state: RelicMotionState) {
  if (state === 'pressing') return MOTION_PRESSING;
  if (state === 'tapReaction') return MOTION_TAP;
  if (state === 'charging') return MOTION_CHARGING;
  if (state === 'resonating') return MOTION_RESONATING;
  if (state === 'recovering') return MOTION_RECOVERING;
  if (state === 'supporterArrival') return MOTION_SUPPORTER_ARRIVAL;
  if (state === 'mutationReady') return MOTION_MUTATION_READY;
  if (state === 'mutating') return MOTION_MUTATING;
  return MOTION_IDLE;
}

function instabilityBreath(phase: number, pulseCount: number, irregularity: number) {
  'worklet';
  const primary = (Math.sin(phase * TWO_PI * pulseCount - Math.PI / 2) + 1) / 2;
  if (irregularity <= 0) return primary;
  const irregular = (Math.sin(phase * TWO_PI * (pulseCount + .5) + .8) + 1) / 2;
  return primary * (1 - irregularity) + irregular * irregularity;
}

function isRestingMode(mode: number) {
  'worklet';
  return mode === MOTION_IDLE || mode === MOTION_MUTATION_READY;
}

function supporterArrivalEnergy(phase: number, mode: number) {
  'worklet';
  if (mode !== MOTION_SUPPORTER_ARRIVAL) return 0;
  return interpolate(phase, [.42, .7, .92, 1], [0, .35, 1, 0], Extrapolation.CLAMP);
}

function supporterArrivalRootsEnergy(phase: number, mode: number) {
  'worklet';
  if (mode !== MOTION_SUPPORTER_ARRIVAL) return 0;
  return interpolate(phase, [.67, .76, .96, 1], [0, .35, 1, 0], Extrapolation.CLAMP);
}

function interactionEnergy(mode: number, charge: number, tap: number, resonance: number) {
  'worklet';
  if (mode === MOTION_PRESSING || mode === MOTION_CHARGING || mode === MOTION_RECOVERING) return charge;
  if (mode === MOTION_TAP) return interpolate(tap, [.08, .4, 1], [0, 1, 0], Extrapolation.CLAMP);
  if (mode === MOTION_RESONATING) return interpolate(resonance, [0, .23, 1], [1, 1, 0], Extrapolation.CLAMP);
  return 0;
}

function resonanceBubbleStyle(phase: number, delay: number, mode: number, reduceMotion: boolean) {
  'worklet';
  if (mode !== MOTION_RESONATING) return { opacity: 0 };
  const local = interpolate(phase, [delay, delay + .36], [0, 1], Extrapolation.CLAMP);
  return {
    opacity: Math.sin(local * Math.PI) * .76,
    transform: reduceMotion
      ? [{ translateY: 0 }]
      : [{ translateX: Math.sin(local * Math.PI) * (delay * 44 - 1.5) }, { translateY: -local * 52 }, { scale: .82 + local * .18 }],
  };
}

function instabilityEnergyFor(
  tier: ReturnType<typeof resolveRelicInstability>['tier'],
  localIntensity: number,
) {
  if (tier === 'calm') return 0;
  if (tier === 'awakening') return localIntensity * .18;
  if (tier === 'charged') return .18 + localIntensity * .28;
  if (tier === 'critical') return .46 + localIntensity * .36;
  return 1;
}

function idlePulseCountFor(
  tier: ReturnType<typeof resolveRelicInstability>['tier'],
  localIntensity: number,
) {
  if (tier === 'charged') return 2 + localIntensity;
  if (tier === 'critical' || tier === 'mutationReady') return 3;
  return 2;
}

function mergeContributionBatches(
  current: SupporterContributionBatch | null,
  next: SupporterContributionBatch,
): SupporterContributionBatch {
  if (!current) return next;
  return next.ids.reduce((aggregate, id) => {
    if (aggregate.ids.includes(id)) return aggregate;
    const amountShare = Math.max(1, Math.round(next.amount / Math.max(1, next.ids.length)));
    return aggregateSupporterContributions(aggregate, {
      id,
      amount: amountShare,
      fromCharge: next.fromCharge,
      toCharge: next.toCharge,
    });
  }, current);
}
