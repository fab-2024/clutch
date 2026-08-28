import { router, usePathname } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import Shield from 'lucide-react-native/icons/shield';
import Swords from 'lucide-react-native/icons/swords';
import UsersRound from 'lucide-react-native/icons/users-round';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, typography } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';
type SocialSubsectionKey = 'friends' | 'leagues';

const SECTIONS: {
  href: string;
  icon: LucideIcon;
  key: SocialSectionKey;
  label: string;
}[] = [
  { key: 'faction', label: 'Faction', icon: Shield, href: '/(tabs)/social' },
  { key: 'circle', label: 'Cercle', icon: UsersRound, href: '/(tabs)/social/friends' },
  { key: 'challenges', label: 'Défis', icon: Swords, href: '/(tabs)/social/duels' },
];

const SUBSECTIONS: Partial<Record<SocialSectionKey, {
  href: string;
  key: SocialSubsectionKey;
  label: string;
}[]>> = {
  circle: [
    { key: 'friends', label: 'Amis', href: '/(tabs)/social/friends' },
    { key: 'leagues', label: 'Ligue', href: '/(tabs)/social/leagues' },
  ],
};

export default function SocialSectionNav({
  activeOverride,
  activeSubsectionOverride,
  variant = 'default',
}: {
  activeOverride?: SocialSectionKey;
  activeSubsectionOverride?: SocialSubsectionKey;
  variant?: 'default' | 'v2';
}) {
  const pathname = usePathname();
  const active = activeOverride ?? sectionFromPath(pathname);
  const activeSubsection = activeSubsectionOverride ?? subsectionFromPath(pathname);
  const subsections = active ? SUBSECTIONS[active] ?? [] : [];
  const refined = variant === 'v2' || pathname.includes('/social/v2');

  return (
    <View style={styles.outer}>
      <View accessibilityRole="tablist" style={[styles.rail, refined && styles.railRefined]} testID="social-primary-tablist">
        {SECTIONS.map((item) => {
          const selected = active === item.key;
          const Icon = item.icon;
          return (
            <Pressable
              accessibilityLabel={`Ouvrir ${item.label.toLowerCase()}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              aria-selected={selected}
              key={item.key}
              onPress={() => router.replace(item.href as never)}
              style={({ pressed }) => [
                styles.item,
                refined && styles.itemRefined,
                selected && styles.itemActive,
                selected && refined && styles.itemActiveRefined,
                pressed && styles.pressed,
              ]}
            >
              <Icon color={selected ? colors.volt : '#6F7B87'} size={17} strokeWidth={selected ? 2.2 : 1.8} />
              <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {subsections.length ? (
        <View accessibilityRole="tablist" style={styles.subRail} testID="social-secondary-tablist">
          {subsections.map((item) => {
            const selected = activeSubsection === item.key;
            return (
              <Pressable
                accessibilityLabel={`Ouvrir ${item.label.toLowerCase()}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                aria-selected={selected}
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
  if (pathname.includes('/social/friends') || pathname.includes('/social/requests')) return 'friends';
  if (pathname.includes('/social/leagues')) return 'leagues';
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
    minHeight: 52,
    padding: 4,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: '#202A33',
  },
  railRefined: { backgroundColor: '#080D11', borderColor: '#25323A' },
  item: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'transparent',
  },
  itemRefined: {
    minHeight: 44,
    borderRadius: 13,
  },
  itemActive: {
    backgroundColor: 'rgba(232,255,61,.09)',
  },
  itemActiveRefined: {
    backgroundColor: 'rgba(232,255,61,.08)',
  },
  label: {
    ...typography.control,
    color: '#7F8A95',
    letterSpacing: .15,
  },
  labelActive: { color: colors.volt },
  subRail: {
    minHeight: 52,
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
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemActive: { backgroundColor: '#181F11' },
  subLabel: { ...typography.control, color: colors.textMuted, letterSpacing: .35 },
  subLabelActive: { color: colors.volt },
  pressed: { opacity: .72 },
});
