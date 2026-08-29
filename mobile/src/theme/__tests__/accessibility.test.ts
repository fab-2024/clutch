/// <reference types="jest" />

import { accessibility } from '../accessibility';
import { colors } from '../colors';
import { typography } from '../typography';

const FUNCTIONAL_TYPE_ROLES = [
  'eyebrow',
  'caption',
  'label',
  'action',
  'metadata',
  'control',
] as const;

const TEXT_COLORS = [colors.text, colors.textSecondary, colors.textMuted];
const SURFACE_COLORS = [
  colors.background,
  colors.backgroundDeep,
  colors.surfaceLow,
  colors.surfaceRaised,
  colors.surfaceInteractive,
];

describe('global accessibility tokens', () => {
  it.each(FUNCTIONAL_TYPE_ROLES)('keeps %s at a readable functional size', (role) => {
    expect(typography[role].fontSize).toBeGreaterThanOrEqual(accessibility.minimumFunctionalFontSize);
  });

  it.each(TEXT_COLORS.flatMap((foreground) => SURFACE_COLORS.map((background) => [foreground, background]))) (
    'keeps %s readable on %s',
    (foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(accessibility.minimumTextContrast);
    },
  );
});

function contrastRatio(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(color: string) {
  const channels = color.slice(1).match(/.{2}/g);
  if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${color}`);
  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}
