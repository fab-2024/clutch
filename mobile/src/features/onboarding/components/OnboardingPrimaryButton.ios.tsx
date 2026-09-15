import { Host } from '@expo/ui/swift-ui';
import { StyleSheet } from 'react-native';

import { GriffPrimaryButtonNativeView } from '../../../../modules/griff-native-ui/src';

import type { OnboardingPrimaryButtonProps } from './OnboardingPrimaryButton';

export default function OnboardingPrimaryButton({
  disabled = false,
  label,
  onPress,
  tone,
}: OnboardingPrimaryButtonProps) {
  return (
    <Host
      colorScheme="dark"
      style={[styles.host, disabled && styles.disabled]}
      testID="onboarding-primary-button"
      useViewportSizeMeasurement
    >
      <GriffPrimaryButtonNativeView
        disabled={disabled}
        label={label}
        onButtonPress={onPress}
        testID="onboarding-primary-button-native"
        tone={tone}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { width: '100%', height: 56 },
  disabled: { opacity: .55 },
});
