const background = '#070A0E';
const backgroundDeep = '#05080B';
const surfaceLow = '#0E1319';
const surfaceRaised = '#141A22';
const borderSubtle = '#202833';
const textSecondary = '#A5AFB9';
const focus = '#E8FF3D';

export const colors = {
  background,
  backgroundDeep,
  surfaceLow,
  surfaceRaised,
  surfaceInteractive: '#171F28',
  borderSubtle,
  borderStrong: '#34404D',
  overlay: 'rgba(2,5,7,.82)',
  focus,

  // Compatibility aliases. Existing screens keep their current rendering
  // while new primitives consume the semantic surface roles above.
  surface: surfaceLow,
  surfaceElevated: surfaceRaised,
  border: borderSubtle,
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
