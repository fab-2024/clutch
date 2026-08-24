import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, typography } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';
type SocialSubsectionKey = 'friends' | 'requests' | 'leagues' | 'missions' | 'duels';

const SECTIONS: {
  glyph: string;
  href: string;
  key: SocialSectionKey;
  label: string;
}[] = [
  { key: 'faction', label: 'Faction', glyph: '✦', href: '/(tabs)/social' },
  { key: 'circle', label: 'Cercle', glyph: '◎', href: '/(tabs)/social/friends' },
  { key: 'challenges', label: 'Défis', glyph: '⚡', href: '/(tabs)/social/missions' },
];

const SUBSECTIONS: Partial<Record<SocialSectionKey, {
  href: string;
  key: SocialSubsectionKey;
  label: string;
}[]>> = {
  circle: [
    { key: 'friends', label: 'Amis', href: '/(tabs)/social/friends' },
    { key: 'requests', label: 'Demandes', href: '/(tabs)/social/requests' },
    { key: 'leagues', label: 'Ligue', href: '/(tabs)/social/leagues' },
  ],
  challenges: [
    { key: 'missions', label: 'Missions', href: '/(tabs)/social/missions' },
    { key: 'duels', label: 'Duels', href: '/(tabs)/social/duels' },
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
  if (pathname.includes('/social/friends') || pathname.includes('/social/requests') || pathname.includes('/social/leagues')) return 'circle';
  if (pathname.includes('/social/missions') || pathname.includes('/social/duels')) return 'challenges';
  return 'faction';
}

function subsectionFromPath(pathname: string): SocialSubsectionKey | null {
  if (pathname.includes('/social/friends')) return 'friends';
  if (pathname.includes('/social/requests')) return 'requests';
  if (pathname.includes('/social/leagues')) return 'leagues';
  if (pathname.includes('/social/missions')) return 'missions';
  if (pathname.includes('/social/duels')) return 'duels';
  return null;
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: colors.background,
  },
  rail: {
    flexDirection: 'row',
    gap: 8,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(7,12,17,.9)',
    borderWidth: 1,
    borderColor: '#25313B',
  },
  itemActive: {
    backgroundColor: 'rgba(17,25,23,.96)',
    borderColor: '#789081',
    boxShadow: '0 0 16px rgba(115,191,190,.18), 0 0 10px rgba(205,231,58,.1)',
  },
  glyph: {
    color: '#65717D',
    fontSize: 14,
    fontWeight: '900',
  },
  glyphActive: { color: colors.volt },
  label: {
    ...typography.label,
    color: '#78838E',
    letterSpacing: .25,
  },
  labelActive: { color: colors.volt },
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
  subLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  subLabelActive: { color: colors.volt },
  pressed: { opacity: .72 },
});
