export const SHOWCASE_PALETTE = {
  amber: '#E2B25D',
  bronze: '#B9794D',
  bronzeBright: '#D5A06A',
  cyan: '#31D7E2',
  graphite: '#080D11',
  graphiteDeep: '#04070A',
  lockedSteel: '#42535E',
  steel: '#8997A2',
  steelDark: '#172129',
  text: '#F3F6F8',
  textMuted: '#87939E',
} as const;

export function showcaseAlpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}
