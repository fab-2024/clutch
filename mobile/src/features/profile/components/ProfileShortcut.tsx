import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/src/theme';

type ProfileShortcutProps = {
  accent?: string;
  accessibilityLabel: string;
  glyph: string;
  label: string;
  meta: string;
  onPress: () => void;
};

export default function ProfileShortcut({
  accent = colors.volt,
  accessibilityLabel,
  glyph,
  label,
  meta,
  onPress,
}: ProfileShortcutProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.mark, { borderColor: alpha(accent, '62') }]}>
        <Text style={[styles.glyph, { color: accent }]}>{glyph}</Text>
      </View>
      <View style={styles.copy}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
      </View>
      <Text style={[styles.arrow, { color: accent }]}>›</Text>
    </Pressable>
  );
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  card: { position: 'relative', flex: 1, minWidth: 0, minHeight: 60, padding: 6, paddingRight: 13, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 13, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#273139' },
  mark: { width: 26, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#0D1318', borderWidth: 1 },
  glyph: { fontSize: 14, lineHeight: 16, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0 },
  label: { ...typography.action, width: '100%', color: colors.text, fontSize: 8.6, letterSpacing: 0.06 },
  meta: { ...typography.label, marginTop: 2, color: colors.textMuted, fontSize: 7, letterSpacing: 0.25 },
  arrow: { position: 'absolute', right: 3, top: 19, width: 9, fontSize: 16, lineHeight: 18, fontWeight: '700' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
