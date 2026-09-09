export const TITAN_WAVE_ID = 'sang-des-titans-titan-wave-effect';
export const TITAN_WAVE_DURATION = 1600;
export const TITAN_ARTBOARD = { width: 768, height: 512, centerX: 384, centerY: 250 } as const;

export const TITAN_ROCKS = [
  { x: 235, y: 315, width: 57, height: 81, lift: 160, drift: -37, turn: -22, delay: 390 },
  { x: 522, y: 300, width: 54, height: 87, lift: 137, drift: 44, turn: 26, delay: 445 },
  { x: 307, y: 350, width: 30, height: 41, lift: 108, drift: -24, turn: -32, delay: 480 },
  { x: 455, y: 347, width: 22, height: 30, lift: 94, drift: 28, turn: 35, delay: 425 },
] as const;

export function unit(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}
export function pulse(time: number, start: number, peak: number, end: number) {
  'worklet';
  return time < peak ? unit((time - start) / (peak - start)) : 1 - unit((time - peak) / (end - peak));
}
export function rockFrame(time: number, delay: number) {
  'worklet';
  const progress = unit((time - delay) / 660);
  // Ballistic parabola: rapid takeoff, slower apex, accelerating fall.
  return { height: 4 * progress * (1 - progress), progress,
    opacity: Math.min(unit((time - delay) / 60), 1 - unit((time - delay - 610) / 120)) };
}
