import { router, Slot, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/theme/tokens';

const SECTIONS = [
  { key: 'missions', label: 'Missions', glyph: '⚡', href: '/(tabs)/social/missions' },
  { key: 'leagues', label: 'Ligues', glyph: '🏆', href: '/(tabs)/social/leagues' },
  { key: 'faction', label: 'Faction', glyph: '✦', href: '/(tabs)/social/faction' },
  { key: 'friends', label: 'Amis', glyph: '●', href: '/(tabs)/social/friends' },
  { key: 'duels', label: 'Duels', glyph: '⚔', href: '/(tabs)/social/duels' },
] as const;

export default function SocialLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.eyebrow}>CLUTCH // SOCIAL</Text>
            <Text style={styles.title}>Ton cercle.</Text>
          </View>
          <View style={styles.signal}><View style={styles.signalDot} /><Text style={styles.signalText}>LIVE</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRail}>
          {SECTIONS.map((item) => {
            const active = pathname.includes(`/social/${item.key}`) || (item.key === 'leagues' && pathname.endsWith('/social'));
            return (
              <Pressable
                key={item.key}
                onPress={() => router.replace(item.href as never)}
                style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
              >
                <Text style={[styles.navGlyph, active && styles.navGlyphActive]}>{item.glyph}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    backgroundColor: '#080C10',
    borderBottomWidth: 1,
    borderBottomColor: '#19222B',
  },
  brandRow: { maxWidth: 430, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 2, color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.8 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 25, borderRadius: 999, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#334019' },
  signalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  signalText: { color: colors.volt, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  navRail: { maxWidth: 430, gap: 7, paddingTop: 10, paddingRight: spacing.md },
  navItem: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: radius.md, backgroundColor: '#0C1116', borderWidth: 1, borderColor: '#1A232C' },
  navItemActive: { backgroundColor: '#171E0E', borderColor: '#46531E' },
  navGlyph: { color: '#65717C', fontSize: 11, fontWeight: '900' },
  navGlyphActive: { color: colors.volt },
  navLabel: { color: '#7E8994', fontSize: 10, fontWeight: '800' },
  navLabelActive: { color: colors.text },
  content: { flex: 1 },
  pressed: { opacity: 0.78 },
});
