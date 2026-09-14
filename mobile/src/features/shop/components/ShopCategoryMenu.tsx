import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Layers from 'lucide-react-native/icons/layers';
import PackageOpen from 'lucide-react-native/icons/package-open';
import Trophy from 'lucide-react-native/icons/trophy';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/src/theme';

const ALL_SHOP_CATEGORIES = [
  { id: 'all', label: 'TOUT', Icon: LayoutGrid },
  { id: 'packs', label: 'PROFIL', Icon: Layers },
  { id: 'objects', label: 'FIGURINES', Icon: Trophy },
  { id: 'consumables', label: 'RECHARGES', Icon: PackageOpen },
] as const;

export const SHOP_CATEGORIES = ALL_SHOP_CATEGORIES;
export type ShopCategory = typeof ALL_SHOP_CATEGORIES[number]['id']
  | 'frames' | 'lighting' | 'rooms' | 'ranks' | 'effects';

export function shopCategoryFromParam(value?: string | string[]): ShopCategory {
  const id = Array.isArray(value) ? value[0] : value;
  return SHOP_CATEGORIES.find((category) => category.id === id)?.id ?? 'all';
}

export function ShopCategoryMenu({ selected, onSelect }: {
  selected: ShopCategory;
  onSelect: (category: ShopCategory) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.menu}
      testID="shop-category-scroll"
    >
      <View accessibilityRole="tablist" accessibilityLabel="Catégories du magasin" style={styles.row}>
        {SHOP_CATEGORIES.map(({ id, label, Icon }, index) => {
          const active = selected === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              aria-selected={active}
              onPress={() => {
                onSelect(id);
                scrollRef.current?.scrollTo({ x: Math.max(0, (index - 1) * 94), animated: true });
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.icon, active && styles.iconActive]}>
                <Icon color={active ? colors.volt : colors.textMuted} size={26} strokeWidth={1.4} />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menu: { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, paddingBottom: 10, paddingHorizontal: spacing.md, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 2 },
  item: { width: 92, alignItems: 'center', gap: 4, paddingVertical: 2 },
  icon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  iconActive: { borderColor: colors.volt, backgroundColor: 'rgba(228,255,40,.08)' },
  label: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 9, lineHeight: 14, letterSpacing: .2 },
  labelActive: { color: colors.volt, fontFamily: fonts.bold },
  pressed: { opacity: 0.7 },
});
