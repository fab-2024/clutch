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

import { colors, spacing } from '@/src/theme';

type AuthShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  backLabel?: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  backLabel,
  onBack,
  footer,
  children,
}: AuthShellProps) {
  return (
    <SafeAreaView style={styles.root}>
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

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  shell: { flexGrow: 1, width: '100%', maxWidth: 430, minHeight: 680, alignSelf: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  logoText: { color: '#06090C', fontSize: 24, lineHeight: 27, fontWeight: '900', letterSpacing: -2 },
  brand: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  brandDot: { color: colors.volt },
  back: { minHeight: 42, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hero: { gap: spacing.sm },
  eyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: colors.text, fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -1.4 },
  subtitle: { maxWidth: 390, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  footer: { alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
