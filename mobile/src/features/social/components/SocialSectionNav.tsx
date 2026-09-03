import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { colors, layout, typography } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';

const SECTIONS: {
  href: string;
  key: SocialSectionKey;
  label: string;
}[] = [
  { key: 'faction', label: 'Faction', href: '/(tabs)/social' },
  { key: 'circle', label: 'Cercle', href: '/(tabs)/social/friends' },
  { key: 'challenges', label: 'Défis', href: '/(tabs)/social/duels' },
];

export default function SocialSectionNav({
  activeOverride,
}: {
  activeOverride?: SocialSectionKey;
}) {
  const pathname = usePathname();
  const { isShortLandscape } = useResponsiveLayout();
  const active = activeOverride ?? sectionFromPath(pathname);

  return (
    <View style={[styles.outer, isShortLandscape && styles.outerLandscape]}>
      <View
        accessibilityRole="tablist"
        style={styles.rail}
        testID="social-primary-tablist"
      >
        {SECTIONS.map((item) => {
          const selected = active === item.key;
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
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>

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
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  item: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.info,
  },
  label: {
    ...typography.cardTitle,
    fontFamily: typography.body.fontFamily,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.info,
    fontFamily: typography.cardTitle.fontFamily,
  },
  pressed: { opacity: .72 },
});
