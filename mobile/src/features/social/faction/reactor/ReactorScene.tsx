import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, StyleSheet, View } from 'react-native';
import { cancelAnimation, Easing, runOnJS, useAnimatedReaction, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { nextReactorStage, type ReactorStage } from './model';
import { REACTION_DURATION } from './motion';
import { OVERHEAT_DURATION, overheatFill, overheatMachineTime, overheatTemperature } from './overheatMotion';
import { OverheatEffects } from './OverheatEffects';
import { ForgeEffects } from './ForgeEffects';
import { ReactorMachine } from './ReactorMachine';
import { useReactorSound } from './useReactorSound';

export type ReactorSceneHandle = { react: () => void; evolve: (destination?: ReactorStage, targetRatio?: number) => void };
type Props = { focusModule?: boolean; stage: ReactorStage; fillRatio: number; onEvolutionComplete: () => void; onEvolutionPhase?: (phase: number) => void; onEvolutionCancel?: () => void; reduceMotionOverride?: boolean; animateContribution?: boolean };

export const ReactorScene = forwardRef<ReactorSceneHandle, Props>(function ReactorScene({ focusModule = false, stage, fillRatio, onEvolutionComplete, onEvolutionPhase, onEvolutionCancel, reduceMotionOverride, animateContribution = true }, ref) {
  const systemReduced = useReducedMotion();
  const reduced = reduceMotionOverride ?? systemReduced;
  const [assembly, setAssembly] = useState({ from: stage, to: stage });
  const [transition, setTransition] = useState<{ request: number; destination: ReactorStage } | null>(null);
  const busy = useRef(false);
  const epoch = useRef(0);
  const callbacks = useRef({ onEvolutionComplete, onEvolutionPhase, onEvolutionCancel });
  callbacks.current = { onEvolutionComplete, onEvolutionPhase, onEvolutionCancel };
  const previousFill = useRef(fillRatio);
  const restingFill = useSharedValue(fillRatio);
  const startingFill = useSharedValue(fillRatio);
  const mutating = useSharedValue(false);
  const targetFill = useSharedValue(0);
  const mutation = useSharedValue(0);
  const reaction = useSharedValue(0);
  const fill = useDerivedValue(() => mutating.value ? overheatFill(mutation.value, startingFill.value, targetFill.value, reduced) : restingFill.value);
  const machineTime = useDerivedValue(() => reduced ? mutation.value : overheatMachineTime(mutation.value));
  const heat = useDerivedValue(() => reduced || !mutating.value ? 0 : overheatTemperature(mutation.value));
  const { play, stop } = useReactorSound(require('../../../../../assets/social/reactor/audio/overheat-demo.wav'));
  const reportPhase = useCallback((phase: number) => callbacks.current.onEvolutionPhase?.(phase), []);
  useAnimatedReaction(() => {
    if (!mutating.value || reduced) return -1;
    const t = mutation.value;
    return t >= 3700 ? 5 : t >= 2700 ? 4 : t >= 2000 ? 3 : t >= 1550 ? 2 : t >= 850 ? 1 : 0;
  }, (phase, previous) => {
    if (phase >= 0 && phase !== previous) runOnJS(reportPhase)(phase);
  });
  const next = nextReactorStage(stage);

  useEffect(() => {
    if (!busy.current) setAssembly(current => current.from === stage && current.to === stage ? current : { from: stage, to: stage });
  }, [stage]);

  // Reset the clock after switching to the lightweight resting renderer.
  // Both renderers share the same artwork, cavity mapping and optical material.
  useLayoutEffect(() => {
    if (!transition) mutation.value = 0;
  }, [transition, mutation]);

  const cancel = useCallback((notify: boolean) => {
    const wasBusy = busy.current;
    busy.current = false;
    setTransition(null);
    epoch.current += 1;
    cancelAnimation(mutation);
    cancelAnimation(reaction);
    cancelAnimation(restingFill);
    mutation.value = 0;
    reaction.value = 0;
    mutating.value = false;
    stop();
    setAssembly((current) => ({ from: current.from, to: current.from }));
    if (notify && wasBusy) callbacks.current.onEvolutionCancel?.();
  }, [mutation, reaction, restingFill, mutating, stop]);

  useFocusEffect(useCallback(() => () => cancel(true), [cancel]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') cancel(true); });
    return () => { subscription.remove(); cancel(false); };
  }, [cancel]);
  useEffect(() => {
    if (!busy.current) {
      restingFill.value = withTiming(fillRatio, { duration: reduced ? 0 : 450 });
      if (animateContribution && !reduced && fillRatio > previousFill.current) {
        reaction.value = 180;
        reaction.value = withTiming(REACTION_DURATION, { duration: 520, easing: Easing.linear });
      }
    }
    previousFill.current = fillRatio;
  }, [fillRatio, reduced, animateContribution, restingFill, reaction]);

  const finish = useCallback((request: number, destination: ReactorStage) => {
    if (!busy.current || request !== epoch.current) return;
    busy.current = false;
    setTransition(null);
    restingFill.value = targetFill.value;
    mutating.value = false;
    setAssembly({ from: destination, to: destination });
    stop();
    callbacks.current.onEvolutionComplete();
  }, [stop, restingFill, mutating, targetFill]);

  // Mount/rasterize the two mechanical forms before starting their shared clock.
  useEffect(() => {
    if (!transition) return;
    const { request, destination } = transition;
    const timer = setTimeout(() => {
      if (!busy.current || request !== epoch.current) return;
      if (!reduced) void play();
      const duration = reduced ? 300 : OVERHEAT_DURATION;
      mutation.value = withTiming(duration, { duration, easing: Easing.linear }, done => {
        if (done) runOnJS(finish)(request, destination);
      });
    }, reduced ? 0 : 300);
    return () => clearTimeout(timer);
  }, [transition, reduced, play, mutation, finish]);

  useImperativeHandle(ref, () => ({
    react() {
      if (busy.current) return;
      cancelAnimation(reaction);
      reaction.value = 0;
      reaction.value = withTiming(reduced ? 300 : REACTION_DURATION, { duration: reduced ? 300 : REACTION_DURATION, easing: Easing.linear });
    },
    evolve(destination = next ?? stage, targetRatio = 0) {
      if (busy.current) return;
      targetFill.value = Math.max(0, Math.min(1, targetRatio));
      busy.current = true;
      setAssembly({ from: stage, to: destination });
      const request = ++epoch.current;
      cancelAnimation(reaction);
      cancelAnimation(restingFill);
      reaction.value = 0;
      startingFill.value = restingFill.value;
      mutation.value = 0;
      mutating.value = true;
      setTransition({ request, destination });
    },
  }), [stage, next, reduced, reaction, restingFill, startingFill, mutation, mutating, targetFill]);

  return <View style={styles.scene} testID="reactor-scene" pointerEvents="none">
    <View style={styles.wall} /><View style={styles.floor} /><View style={styles.shadow} />
    <ReactorMachine forge active={!!transition} heat={transition && !reduced ? heat : undefined} focusModule={focusModule && !transition} from={assembly.from} to={assembly.to} fill={fill} mutation={machineTime} reaction={reaction} reduced={reduced} />
    {transition && !reduced && <><ForgeEffects stage={assembly.to} time={machineTime} /><OverheatEffects stage={assembly.from} time={mutation} heat={heat} /></>}
  </View>;
});

const styles = StyleSheet.create({
  scene: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: '#0b0d10' },
  wall: { position: 'absolute', left: '12%', right: '12%', top: 0, bottom: '15%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#202a32', backgroundColor: '#121519' },
  floor: { position: 'absolute', top: '85%', width: '100%', bottom: 0, backgroundColor: '#191b1e', borderTopWidth: 1, borderColor: '#293039' },
  shadow: { position: 'absolute', left: '27%', right: '27%', top: '87%', height: '2%', borderRadius: 100, backgroundColor: '#0b0d10' },
});
