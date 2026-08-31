import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/src/theme';

import type { ShowcaseSection } from './types';

type ShowcaseTopNavigationProps = {
  active: ShowcaseSection;
  loading: boolean;
  objectCount: number;
  onBack: () => void;
  onRefresh: () => void;
  onSelect: (section: ShowcaseSection) => void;
  refreshing: boolean;
};

const ITEMS: { glyph: string; label: string; value: ShowcaseSection }[] = [
  { glyph: '◎', label: 'MA VITRINE', value: 'showcase' },
  { glyph: '◇', label: 'COLLECTION', value: 'collection' },
  { glyph: '□', label: 'SAISON', value: 'season' },
  { glyph: '◆', label: 'RANG', value: 'rank' },
  { glyph: '✦', label: 'TROPHÉES', value: 'trophies' },
];

export default function ShowcaseTopNavigation({
  active,
  loading,
  objectCount,
  onBack,
  onRefresh,
  onSelect,
  refreshing,
}: ShowcaseTopNavigationProps) {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Revenir au Magasin"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {ITEMS.map((item) => {
          const selected = item.value === active;
          return (
            <Pressable
              accessibilityLabel={`Afficher ${item.label.toLocaleLowerCase('fr-FR')}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item.value}
              onPress={() => onSelect(item.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabGlyph, selected && styles.tabTextSelected]}>{item.glyph}</Text>
              <Text numberOfLines={1} style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
              {selected ? <View style={styles.activeLine} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View accessible accessibilityLabel={loading ? 'Collection en chargement' : `${objectCount} objets possédés`} style={styles.count}>
        <Text style={styles.countValue}>{loading ? '—' : objectCount}</Text>
        <Text style={styles.countLabel}>OBJETS</Text>
      </View>
      <Pressable
        accessibilityLabel="Actualiser ma Vitrine"
        accessibilityRole="button"
        accessibilityState={{ busy: refreshing }}
        disabled={refreshing}
        onPress={onRefresh}
        style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
      >
        {refreshing ? <ActivityIndicator color={colors.volt} size="small" /> : <Text style={styles.refreshGlyph}>↻</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 48,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#0B1218',
    borderBottomWidth: 1,
    borderBottomColor: '#30414E',
  },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#30414E' },
  backGlyph: { color: '#C5CDD3', fontSize: 22, lineHeight: 24, fontWeight: '500' },
  tabs: { flex: 1, minWidth: 0, flexDirection: 'row' },
  tab: { position: 'relative', flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRightWidth: 1, borderRightColor: '#30414E' },
  tabSelected: { backgroundColor: 'rgba(232,255,61,.028)' },
  tabGlyph: { color: '#74808A', fontSize: 10, lineHeight: 12 },
  tabText: { ...typography.label, color: '#929EA8', letterSpacing: 0.38 },
  tabTextSelected: { color: colors.volt },
  activeLine: { position: 'absolute', right: 14, bottom: 0, left: 14, height: 1, backgroundColor: colors.volt },
  count: { width: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#30414E' },
  countValue: { ...typography.bodyStrong, color: colors.text, fontSize: 11 },
  countLabel: { ...typography.label, marginTop: -1, color: colors.textMuted },
  refresh: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  refreshGlyph: { color: '#8D99A3', fontSize: 15, lineHeight: 17, fontWeight: '700' },
  pressed: { opacity: 0.68 },
});
