import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

import { AppAtmosphere, type AppAtmosphereTone } from './AppAtmosphere';

type ScreenProps = PropsWithChildren<{
  atmosphere?: AppAtmosphereTone | 'none';
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ atmosphere = 'standard', children, style }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.root, style]}>
      {atmosphere === 'none' ? null : <AppAtmosphere tone={atmosphere} />}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.atmosphereBottom,
  },
});
