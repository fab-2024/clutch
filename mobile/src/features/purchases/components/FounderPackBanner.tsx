import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, typography } from '@/src/theme';

export function FounderPackBanner({ preview = false }: { preview?: boolean }) {
  return (
    <Pressable
      accessibilityHint="Ouvre le détail des quatre objets Founder"
      accessibilityLabel="Découvrir le Founder Pack"
      accessibilityRole="button"
      onPress={() => router.push(preview ? '/founder-pack-preview' : '/founder-pack')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      testID="founder-pack-banner"
    >
      <LinearGradient
        colors={['#251C0D', '#0D1014', '#07090C']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />
      <View style={styles.seal}><Text style={styles.sealText}>F</Text></View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>PREMIÈRE VAGUE // ACHAT UNIQUE</Text>
        <Text style={styles.title}>FOUNDER PACK</Text>
        <Text style={styles.detail}>4 signatures permanentes · aucun avantage compétitif</Text>
      </View>
      <View style={styles.cta}><Text style={styles.ctaText}>VOIR</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', overflow: 'hidden', minHeight: 112, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, borderWidth: 1, borderColor: '#665126' },
  glow: { position: 'absolute', left: -42, top: -58, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,203,69,.11)', boxShadow: '0 0 48px rgba(255,203,69,.14)' },
  seal: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#17120A', borderWidth: 1, borderColor: '#B88C32', transform: [{ rotate: '-5deg' }] },
  sealText: { color: '#FFCB45', fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: '#D8AE55', fontSize: 9, letterSpacing: .7 },
  title: { ...typography.sectionTitle, marginTop: 3, color: colors.text },
  detail: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  cta: { minWidth: 52, minHeight: 36, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFCB45' },
  ctaText: { ...typography.action, color: '#080A0C', fontSize: 10 },
  pressed: { opacity: .78, transform: [{ scale: .992 }] },
});
