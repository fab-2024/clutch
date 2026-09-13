import { ramp, REACTION_DURATION } from './motion';
import { OVERHEAT_DURATION } from './overheatMotion';

export function relicBackdropEnergy(reactionTime: number, mutationTime: number, reduced: boolean) {
  'worklet';
  if (reduced) return 0;
  const touch = Math.min(ramp(reactionTime, 0, 120), 1 - ramp(reactionTime, 1280, REACTION_DURATION));
  const evolution = Math.min(ramp(mutationTime, 0, 180), 1 - ramp(mutationTime, OVERHEAT_DURATION - 520, OVERHEAT_DURATION));
  return Math.max(0, Math.min(1, Math.max(touch, evolution)));
}
