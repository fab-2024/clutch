import { ramp, smooth } from './motion';

export const FORGE_DURATION = 4200;
// Short approach, hinge rotation, overshoot, then a firm mechanical stop.
export function forgeAttachment(piece: string, incoming: boolean, time: number) {
  'worklet';
  const side = piece.endsWith('left') || piece === 'left' ? -1 : 1;
  const base = piece.startsWith('base');
  if (!incoming) {
    const p = smooth(time, 1120, 1500);
    return { x: side * 24 * p, y: 26 * p, angle: side * 4 * p, visible: 1 - p };
  }
  const start = base ? 1200 + (side > 0 ? 110 : 0) : 1660 + (piece.startsWith('rear') ? 400 : 0) + (side > 0 ? 280 : 0);
  const duration = base ? 470 : 570;
  const p = ramp(time, start, start + duration);
  const q = p - 1;
  const approach = 1 + 2.1 * q * q * q + 1.1 * q * q;
  return { x: side * (base ? 65 : 115) * (1 - approach), y: (base ? 54 : 18) * (1 - approach), angle: side * (base ? 3 : 11) * (1 - approach), visible: smooth(time, start, start + 100) };
}
export function forgeFill(time: number) {
  'worklet';
  return (.72 + .28 * smooth(time, 0, 780)) * (1 - smooth(time, 3450, FORGE_DURATION));
}
