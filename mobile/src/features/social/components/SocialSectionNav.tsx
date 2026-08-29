import { router, usePathname } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import Shield from 'lucide-react-native/icons/shield';
import Swords from 'lucide-react-native/icons/swords';
import UsersRound from 'lucide-react-native/icons/users-round';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { colors, layout, typography } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';

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

export default function SocialSectionNav({
  activeOverride,
  variant = 'default',
}: {
  activeOverride?: SocialSectionKey;
  variant?: 'default' | 'v2';
}) {
  const pathname = usePathname();
  const { isShortLandscape } = useResponsiveLayout();
  const active = activeOverride ?? sectionFromPath(pathname);
  const refined = variant === 'v2' || pathname.includes('/social/v2');

  return (
    <View style={[styles.outer, isShortLandscape && styles.outerLandscape]}>
      <View accessibilityRole="tablist" style={[styles.rail, refined && styles.railRefined, isShortLandscape && styles.railLandscape]} testID="social-primary-tablist">
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
    </View>
  );
}

function sectionFromPath(pathname: string): SocialSectionKey {
  if (pathname.includes('/social/friends') || pathname.includes('/social/requests') || pathname.includes('/social/leagues')) return 'circle';
  if (pathname.includes('/social/missions') || pathname.includes('/social/duels')) return 'challenges';
  return 'faction';
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
  outerLandscape: {
    maxWidth: layout.wideContentMaxWidth,
    paddingTop: 3,
    paddingBottom: 3,
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
  railLandscape: { minWidth: 0 },
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
  pressed: { opacity: .72 },
});
