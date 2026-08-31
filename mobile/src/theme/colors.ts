const canvas = '#091117';
const canvasAlternate = '#0B1218';
const surfaceStandard = '#111A22';
const surfaceElevated = '#152633';
const border = '#30414E';
const textSecondary = '#A5AFB9';
const focus = '#E8FF3D';

export const colors = {
  canvas,
  canvasAlternate,
  surfaceStandard,
  surfaceElevated,
  border,
  background: canvas,
  backgroundDeep: canvasAlternate,
  surfaceLow: surfaceStandard,
  surfaceRaised: surfaceElevated,
  surfaceInteractive: surfaceElevated,
  borderSubtle: border,
  borderStrong: border,
  overlay: 'rgba(0,0,0,.76)',
  focus,

  // Compatibility aliases for feature screens while all shared primitives
  // consume the semantic roles above.
  surface: surfaceStandard,
  text: '#F4F7FA',
  textSecondary,
  textMuted: '#8893A0',
  textSubtle: textSecondary,
  textDisabled: '#7A8692',
  frag: '#9A72FF',
  volt: focus,
  success: '#45D483',
  danger: '#FF5D68',
  info: '#66A8FF',
  live: '#FF6575',
  liveText: '#FF9AA5',
  liveSurface: 'rgba(34,10,16,.86)',
  liveBorder: 'rgba(255,101,117,.48)',
} as const;
