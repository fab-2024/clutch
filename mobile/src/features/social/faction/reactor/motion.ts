import type { ReactorStage } from './model';

export const MUTATION_DURATION = 3900;
export const REACTION_DURATION = 1650;
export const TIMING = {
  fillEnd: 760, pressureStart: 760, pressureEnd: 1260,
  supportsStart: 1180, supportsEnd: 1620,
  exitStart: 1260, exitEnd: 1800,
  panelStart: 1620, panelEnd: 2420,
  podStart: 1880, podEnd: 2650,
  crownStart: 2020, crownEnd: 2780,
  pipeStart: 2600, pipeEnd: 3150,
  settleStart: 3150, end: MUTATION_DURATION,
} as const;
export function ramp(time: number, start: number, end: number) {
  'worklet';
  return Math.max(0, Math.min(1, (time - start) / (end - start)));
}
export function smooth(time: number, start: number, end: number) {
  'worklet'; const p = ramp(time, start, end); return p * p * (3 - 2 * p);
}
export function pulse(time: number, start: number, end: number) {
  'worklet'; return time <= start || time >= end ? 0 : Math.sin(Math.PI * ramp(time, start, end));
}
export function attachmentPose(piece: string, stage: ReactorStage, incoming: boolean, time: number, reduced: boolean) {
  'worklet';
  if (reduced) return { x: 0, y: 0, visible: incoming ? ramp(time, 0, 300) : 1 - ramp(time, 0, 300) };
  const side = piece.endsWith('left') ? -1 : 1;
  const base = piece.startsWith('base'), rear = piece.startsWith('rear');
  const pod = (stage === 3 || stage === 5) && !base && !rear;
  const start = base ? 1180 : rear ? 2020 : pod ? 1880 : 1620;
  const end = base ? 1620 : rear ? 2780 : pod ? 2650 : 2420;
  const delay = side > 0 ? 100 : 0;
  const p = incoming ? 1 - smooth(time, start + delay, end + delay) : smooth(time, 1260, 1800);
  return {
    visible: incoming ? (time >= start + delay ? 1 : 0) : (time < 1800 ? 1 : 0),
    x: rear || pod ? 0 : side * (base ? 180 : 440) * p,
    y: rear ? -500 * p : pod ? 800 * p : base ? 180 * p : 0,
  };
}
export function pressure(time: number) {
  'worklet'; return pulse(time, TIMING.pressureStart, TIMING.pressureEnd);
}
export function bubbleEnergy(touch: number, mutation: number) {
  'worklet'; return Math.max(pulse(touch, 450, 1450), pulse(mutation, 780, 1460), pulse(mutation, 2920, 3700));
}
export function coreEnergy(touch: number, mutation: number) {
  'worklet'; return Math.max(pulse(touch, 0, 280), pulse(mutation, 0, 1260), pulse(mutation, 3080, 3500));
}
export function mutationFill(time: number, startRatio: number, targetRatio = 0, reduced = false) {
  'worklet';
  if (reduced) return startRatio + (targetRatio - startRatio) * smooth(time, 0, 300);
  const charged = startRatio + (1 - startRatio) * smooth(time, 0, TIMING.fillEnd);
  return charged + (targetRatio - charged) * smooth(time, TIMING.settleStart, TIMING.end);
}


export function machineRole(stage: ReactorStage, from: ReactorStage, to: ReactorStage) {
  'worklet';
  if (stage !== from && stage !== to) return 'preloaded';
  if (from === to) return 'resting';
  return stage === to ? 'incoming' : 'outgoing';
}
