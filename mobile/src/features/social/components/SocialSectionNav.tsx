import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SOCIAL_ROUTES } from '@/src/features/social/routes';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { colors, fonts, layout } from '@/src/theme';

type SocialSectionKey = 'faction' | 'circle' | 'challenges';

const SECTIONS: {
  href: (typeof SOCIAL_ROUTES)[keyof typeof SOCIAL_ROUTES];
  key: SocialSectionKey;
  label: string;
}[] = [
  { key: 'faction', label: 'Faction', href: SOCIAL_ROUTES.home },
  { key: 'circle', label: 'Cercle', href: SOCIAL_ROUTES.friends },
  { key: 'challenges', label: 'Défis', href: SOCIAL_ROUTES.duels },
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
              onPress={() => router.replace(item.href)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.labelWrap}>
                <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
                {selected ? <View pointerEvents="none" style={styles.underline} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function sectionFromPath(pathname: string): SocialSectionKey {
  if (pathname.includes('/social/friends') || pathname.includes('/social/requests') || pathname.includes('/social/leagues')) return 'circle';
  if (pathname.includes('/social/duels')) return 'challenges';
  return 'faction';
}

const styles = StyleSheet.create({
  outer: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 7, paddingBottom: 8 },
  outerLandscape: { maxWidth: layout.wideContentMaxWidth, paddingTop: 3, paddingBottom: 3 },
  rail: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(143,156,176,.22)' },
  item: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 4, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  labelWrap: { paddingBottom: 8 },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  labelActive: { color: colors.text, fontFamily: fonts.bold },
  underline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.text },
  pressed: { opacity: .72 },
});
