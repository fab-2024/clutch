import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';
type SocialSubsectionKey = 'friends' | 'leagues' | 'missions' | 'duels';

const SECTIONS: Array<{
  glyph: string;
  href: string;
  key: SocialSectionKey;
  label: string;
}> = [
  { key: 'faction', label: 'FACTION', glyph: '✦', href: '/(tabs)/social' },
  { key: 'circle', label: 'CERCLE', glyph: '◎', href: '/(tabs)/social/friends' },
  { key: 'challenges', label: 'DÉFIS', glyph: '⚡', href: '/(tabs)/social/missions' },
];

const SUBSECTIONS: Partial<Record<SocialSectionKey, Array<{
  href: string;
  key: SocialSubsectionKey;
  label: string;
}>>> = {
  circle: [
    { key: 'friends', label: 'AMIS', href: '/(tabs)/social/friends' },
    { key: 'leagues', label: 'LIGUES', href: '/(tabs)/social/leagues' },
  ],
  challenges: [
    { key: 'missions', label: 'MISSIONS', href: '/(tabs)/social/missions' },
    { key: 'duels', label: 'DUELS', href: '/(tabs)/social/duels' },
  ],
};

export default function SocialSectionNav({ activeOverride }: { activeOverride?: SocialSectionKey }) {
  const pathname = usePathname();
  const active = activeOverride ?? sectionFromPath(pathname);
  const activeSubsection = subsectionFromPath(pathname);
  const subsections = active ? SUBSECTIONS[active] ?? [] : [];

  return (
    <View style={styles.outer}>
      <View style={styles.rail}>
        {SECTIONS.map((item) => {
          const selected = active === item.key;
          return (
            <Pressable
              accessibilityLabel={`Ouvrir ${item.label.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => router.replace(item.href as never)}
              style={({ pressed }) => [styles.item, selected && styles.itemActive, pressed && styles.pressed]}
            >
              <Text style={[styles.glyph, selected && styles.glyphActive]}>{item.glyph}</Text>
              <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {subsections.length ? (
        <View style={styles.subRail}>
          {subsections.map((item) => {
            const selected = activeSubsection === item.key;
            return (
              <Pressable
                accessibilityLabel={`Ouvrir ${item.label.toLowerCase()}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item.key}
                onPress={() => router.replace(item.href as never)}
                style={({ pressed }) => [styles.subItem, selected && styles.subItemActive, pressed && styles.pressed]}
              >
                <Text style={[styles.subLabel, selected && styles.subLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function sectionFromPath(pathname: string): SocialSectionKey {
  if (pathname.includes('/social/friends') || pathname.includes('/social/leagues')) return 'circle';
  if (pathname.includes('/social/missions') || pathname.includes('/social/duels')) return 'challenges';
  return 'faction';
}

function subsectionFromPath(pathname: string): SocialSubsectionKey | null {
  if (pathname.includes('/social/friends')) return 'friends';
  if (pathname.includes('/social/leagues')) return 'leagues';
  if (pathname.includes('/social/missions')) return 'missions';
  if (pathname.includes('/social/duels')) return 'duels';
  return null;
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  rail: {
    flexDirection: 'row',
    gap: 7,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 11,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: '#222B34',
  },
  itemActive: {
    backgroundColor: '#171E10',
    borderColor: '#4A5720',
  },
  glyph: {
    color: '#65717D',
    fontSize: 15,
    fontWeight: '900',
  },
  glyphActive: { color: colors.volt },
  label: {
    color: '#78838E',
    fontFamily: fonts.bold,
    fontSize: 7,
    letterSpacing: .5,
  },
  labelActive: { color: '#F5F7F8' },
  subRail: {
    minHeight: 44,
    marginTop: 7,
    padding: 4,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#080C10',
    borderWidth: 1,
    borderColor: '#202831',
  },
  subItem: {
    flex: 1,
    minHeight: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemActive: { backgroundColor: '#181F11' },
  subLabel: { color: '#66717C', fontFamily: fonts.bold, fontSize: 7, letterSpacing: .8 },
  subLabelActive: { color: colors.volt },
  pressed: { opacity: .72 },
});
