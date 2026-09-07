import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { colors, layout, radius, typography } from '@/src/theme';

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
        <LinearGradient
          colors={['rgba(172,209,232,.16)', 'rgba(9,25,37,0)', 'rgba(68,128,166,.12)']}
          locations={[0, 0.45, 1]}
          pointerEvents="none"
          style={styles.reflection}
        />
        <View pointerEvents="none" style={styles.innerRim} />
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
                selected && styles.itemActive,
                pressed && styles.pressed,
              ]}
            >
              {selected ? (
                <>
                  <LinearGradient
                    colors={['rgba(98,178,255,.32)', 'rgba(7,25,44,0)', 'rgba(54,125,225,.2)']}
                    locations={[0, 0.46, 1]}
                    pointerEvents="none"
                    style={styles.reflection}
                  />
                  <View pointerEvents="none" style={styles.highlight} />
                </>
              ) : null}
              <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
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
    backgroundColor: 'rgba(7,20,29,.76)',
  },
  outerLandscape: {
    maxWidth: layout.wideContentMaxWidth,
    paddingTop: 3,
    paddingBottom: 3,
  },
  rail: {
    padding: 5,
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: '#071721',
    borderWidth: 1,
    borderColor: '#456478',
    boxShadow: 'inset 0 1px 2px rgba(191,223,244,.16), 0 8px 18px rgba(0,0,0,.22)',
  },
  reflection: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
  },
  innerRim: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 5,
    right: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(87,140,181,.2)',
    boxShadow: 'inset 0 2px 5px rgba(137,190,226,.16), inset 0 -2px 5px rgba(73,143,214,.2)',
  },
  item: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: '#071A2C',
    borderColor: '#87C1FF',
    boxShadow: 'inset 0 2px 7px rgba(119,190,255,.65), inset 0 -2px 7px rgba(45,119,232,.62), 0 0 8px rgba(66,144,252,.34)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 17,
    right: 17,
    height: 1,
    backgroundColor: 'rgba(217,237,255,.65)',
  },
  label: {
    ...typography.cardTitle,
    fontFamily: typography.body.fontFamily,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: '#AED4FF',
    fontFamily: typography.cardTitle.fontFamily,
  },
  pressed: { opacity: .72 },
});
