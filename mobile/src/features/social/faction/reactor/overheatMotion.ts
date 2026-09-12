import { smooth } from './motion';

export const OVERHEAT_DURATION = 5000;
export function overheatMachineTime(time: number) {
  'worklet';
  return time < 2000 ? time * 1120 / 2000 : time < 3700 ? 1120 + (time - 2000) * 2030 / 1700 : 3150 + (time - 3700) * 1050 / 1300;
}
export function overheatTemperature(time: number) {
  'worklet';
  return smooth(time, 200, 1750) * (1 - smooth(time, 3500, 4250));
}
export function overheatFill(time: number, start: number, target: number, reduced = false) {
  'worklet';
  if (reduced) return start + (target - start) * smooth(time, 0, 300);
  // Keep a small expansion space for boiling, without lowering an already full tank.
  const charged = start + (Math.max(start, .96) - start) * smooth(time, 0, 1600);
  return charged + (target - charged) * smooth(time, 4350, OVERHEAT_DURATION);
}
