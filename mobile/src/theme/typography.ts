import type { TextStyle } from 'react-native';

export const fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/**
 * Semantic type tokens shared by the mobile experience.
 *
 * Space Grotesk carries functional information and long-form reading. Barlow
 * Condensed is intentionally limited to punchlines, scores and rankings.
 * Individual screens may add color, alignment or width, but should not create
 * another font scale.
 */
export const typography = {
  /** Short, non-essential overlines only. Never use for actions or status. */
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
  },
  action: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
  /** Accessible functional roles for new and migrated UI. */
  metadata: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  control: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  bodyComfort: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyComfortStrong: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 37,
    letterSpacing: -1,
  },
  displayLarge: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 44,
    letterSpacing: -1,
  },
  metricSmall: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 21,
  },
  metric: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  metricLarge: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1,
  },
} satisfies Record<string, TextStyle>;
