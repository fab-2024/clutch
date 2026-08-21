import { router, Slot, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { colors, radius, spacing } from '@/src/theme';

const SECTIONS = [
  { key: 'home', label: 'Accueil', glyph: '⌂', href: '/(tabs)/social' },
  { key: 'missions', label: 'Missions', glyph: '⚡', href: '/(tabs)/social/missions' },
  { key: 'leagues', label: 'Ligues', glyph: '', href: '/(tabs)/social/leagues' },
  { key: 'faction', label: 'Faction', glyph: '', href: '/(tabs)/social/faction' },
  { key: 'friends', label: 'Amis', glyph: '', href: '/(tabs)/social/friends' },
  { key: 'duels', label: 'Duels', glyph: '⚔', href: '/(tabs)/social/duels' },
] as const;

export default function SocialLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 6) }]}>
        <ClutchHeader />
      </View>

      <View style={styles.navOuter}>
        <View style={styles.navCard}>
          {SECTIONS.map((item) => {
            const active = item.key === 'home'
              ? pathname.endsWith('/social')
              : pathname.includes(`/social/${item.key}`);
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir ${item.label.toLowerCase()}`}
                accessibilityState={{ selected: active }}
                onPress={() => router.replace(item.href as never)}
                style={({ pressed }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.glyph ? `${item.glyph} ` : ''}{item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: {
    backgroundColor: '#06090C',
    borderBottomWidth: 1,
    borderBottomColor: '#171D23',
  },
  navOuter: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 18,
  },
  navCard: {
    minHeight: 124,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'center',
    rowGap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: '#090D11',
    borderWidth: 1,
    borderColor: '#222A32',
  },
  navItem: {
    flexBasis: '31.5%',
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navItemActive: {
    backgroundColor: colors.volt,
  },
  navLabel: {
    color: '#778291',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.15,
  },
  navLabelActive: {
    color: '#080A0C',
  },
  content: { flex: 1 },
  pressed: { opacity: 0.76 },
});
