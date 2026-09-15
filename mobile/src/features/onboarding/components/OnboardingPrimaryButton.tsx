import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/src/theme';

export type OnboardingPrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone: 'blue' | 'coral' | 'lime' | 'purple';
};

const GRADIENTS = {
  blue: ['#14D4F4', '#087CFF', '#245CFF'],
  coral: ['#FF934D', '#FF6045', '#FF7A4E'],
  lime: ['#F4FF75', '#DCFF28', '#B8D91A'],
  purple: ['#774AFF', '#C954FF', '#A93DFF'],
} as const;

const GLOWS = {
  blue: '0 10px 28px rgba(20,124,255,.46)',
  coral: '0 10px 28px rgba(255,96,69,.42)',
  lime: '0 10px 28px rgba(220,255,40,.32)',
  purple: '0 10px 30px rgba(183,72,255,.54)',
} as const;

export default function OnboardingPrimaryButton({
  disabled = false,
  label,
  onPress,
  tone,
}: OnboardingPrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { boxShadow: GLOWS[tone] },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      testID="onboarding-primary-button"
    >
      <LinearGradient
        colors={GRADIENTS[tone]}
        end={{ x: 1, y: .7 }}
        pointerEvents="none"
        start={{ x: 0, y: .3 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.gloss} />
      <View pointerEvents="none" style={styles.innerStroke} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.arrow}>
        <ArrowRight color="#050A0D" size={21} strokeWidth={2.9} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 22,
  },
  gloss: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.16)',
  },
  innerStroke: {
    position: 'absolute',
    inset: 1,
    borderWidth: 1,
    borderRadius: 21,
    borderColor: 'rgba(255,255,255,.24)',
  },
  label: {
    color: '#050A0D',
    fontFamily: fonts.displayBold,
    fontSize: 21,
    lineHeight: 24,
  },
  arrow: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(4,10,13,.08)',
  },
  disabled: { opacity: .55 },
  pressed: { opacity: .75 },
});
