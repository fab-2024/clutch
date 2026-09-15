import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type GriffPrimaryButtonNativeProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  disabled: boolean;
  label: string;
  tone: 'blue' | 'coral' | 'lime' | 'purple';
  onButtonPress?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
};

export const GriffPrimaryButtonNativeView: ComponentType<GriffPrimaryButtonNativeProps> =
  requireNativeView('GriffNativeUI', 'GriffPrimaryButtonView');
