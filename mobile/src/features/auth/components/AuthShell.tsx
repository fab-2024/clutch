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

import { colors, fonts, spacing } from '@/src/theme';

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
                <View style={styles.logo}><Text style={styles.logoText}>C</Text></View>
                <Text style={styles.brand}>CLUTCH<Text style={styles.brandDot}>.</Text></Text>
              </View>
              {backLabel && onBack ? (
                <Pressable
                  accessibilityLabel={backLabel}
                  accessibilityRole="button"
                  onPress={onBack}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                >
                  <Text style={styles.backText}>← {backLabel.toUpperCase()}</Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt, boxShadow: '0 0 12px rgba(224,255,59,.25)' },
  logoText: { color: '#06090C', fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -1.4 },
  brand: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 3 },
  brandDot: { color: colors.volt },
  back: { minHeight: 42, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
  visual: { height: 160, alignItems: 'center', justifyContent: 'center', marginVertical: -5 },
  hero: { gap: 7 },
  eyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.7 },
  title: { maxWidth: 370, color: colors.text, fontFamily: fonts.display, fontSize: 48, lineHeight: 45, letterSpacing: -1.1, textTransform: 'uppercase' },
  subtitle: { maxWidth: 390, color: '#98A2AC', fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  panel: { overflow: 'hidden', padding: 14, borderRadius: 26, backgroundColor: 'rgba(9,13,17,.76)', borderWidth: 1, borderColor: '#273029' },
  footer: { alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
