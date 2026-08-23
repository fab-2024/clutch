import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { colors, spacing, typography } from '@/src/theme';

type AuthShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  backLabel?: string;
  onBack?: () => void;
  footer?: ReactNode;
  visual?: ReactNode;
}>;

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  backLabel,
  onBack,
  footer,
  visual,
  children,
}: AuthShellProps) {
  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={['#06090C', '#0A100D', '#06090C']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientLayer}>
        <View style={styles.ambientVolt} />
        <View style={styles.ambientBlue} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shell}>
            <View style={styles.topRow}>
              <View style={styles.brandRow}>
                <GriffLockup width={122} />
              </View>
              {backLabel && onBack ? (
                <Pressable
                  accessibilityLabel={backLabel}
                  accessibilityRole="button"
                  onPress={onBack}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                >
                  <Text style={styles.backText}>← {backLabel}</Text>
                </Pressable>
              ) : null}
            </View>

            {visual ? <View style={styles.visual}>{visual}</View> : null}

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <BlurView intensity={18} tint="dark" style={styles.panel}>
              {children}
            </BlurView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#06090C' },
  ambientLayer: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' },
  ambientVolt: { position: 'absolute', top: 90, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: '#BBD21F', opacity: 0.12 },
  ambientBlue: { position: 'absolute', bottom: -120, left: -140, width: 320, height: 320, borderRadius: 160, backgroundColor: '#174A70', opacity: 0.12 },
  scrollContent: { flexGrow: 1 },
  shell: { flexGrow: 1, width: '100%', maxWidth: 430, minHeight: 720, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brandRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  back: { minHeight: 42, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  backText: { ...typography.action, color: colors.textMuted, letterSpacing: .3 },
  visual: { height: 160, alignItems: 'center', justifyContent: 'center', marginVertical: -5 },
  hero: { gap: 7 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.3 },
  title: { ...typography.displayLarge, maxWidth: 370, color: colors.text },
  subtitle: { ...typography.body, maxWidth: 390, color: '#98A2AC' },
  panel: { overflow: 'hidden', padding: 14, borderRadius: 26, backgroundColor: 'rgba(9,13,17,.76)', borderWidth: 1, borderColor: '#273029' },
  footer: { alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
