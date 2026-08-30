import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient
        accessibilityRole="tablist"
        colors={['#11170F', '#091118', '#11182B']}
        end={{ x: 1, y: 0.5 }}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0.5 }}
        style={[styles.rail, refined && styles.railRefined, isShortLandscape && styles.railLandscape]}
        testID="social-primary-tablist"
      >
        {SECTIONS.map((item, index) => {
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
              {selected ? (
                <LinearGradient
                  accessibilityElementsHidden
                  colors={['rgba(232,255,61,.10)', 'rgba(164,183,76,.055)', 'rgba(43,55,73,.22)']}
                  end={{ x: 1, y: 0.5 }}
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  style={styles.activeSurface}
                />
              ) : null}

              <View style={styles.itemContent}>
                <Icon color={selected ? colors.volt : '#8A95A5'} size={18} strokeWidth={selected ? 2.25 : 1.8} />
                <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
              </View>

              {index < SECTIONS.length - 1 ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  style={styles.separator}
                />
              ) : null}

              {selected ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  style={styles.activeIndicator}
                  testID="social-section-active-indicator"
                />
              ) : null}
            </Pressable>
          );
        })}
      </LinearGradient>
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
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  outerLandscape: {
    maxWidth: layout.wideContentMaxWidth,
    paddingTop: 3,
    paddingBottom: 3,
  },
  rail: {
    minHeight: 54,
    padding: 4,
    borderRadius: 27,
    flexDirection: 'row',
    backgroundColor: '#0A1018',
    borderWidth: 1.5,
    borderColor: '#465365',
    overflow: 'visible',
  },
  railLandscape: { minWidth: 0 },
  railRefined: { borderColor: '#526075' },
  item: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  itemRefined: {
    minHeight: 46,
    borderRadius: 23,
  },
  itemActive: { zIndex: 1 },
  itemActiveRefined: { zIndex: 1 },
  activeSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(232,255,61,.07)',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    zIndex: 2,
  },
  separator: {
    position: 'absolute',
    top: 11,
    right: 0,
    bottom: 11,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#3A4656',
    opacity: .82,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.volt,
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: .48,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    ...typography.bodyStrong,
    color: '#929BAA',
    letterSpacing: .15,
  },
  labelActive: { color: colors.volt },
  pressed: { opacity: .72 },
});
