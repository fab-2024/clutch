import DoorOpen from 'lucide-react-native/icons/door-open';
import Gem from 'lucide-react-native/icons/gem';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Trophy from 'lucide-react-native/icons/trophy';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { colors, fonts, spacing } from '@/src/theme';

function Frame({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth={1.4}>
    <Path d="M3 3H37V37H3Z M8 8H32V32H8Z M3 3L8 8M37 3L32 8M37 37L32 32M3 37L8 32" />
    <Rect x={6} y={6} width={28} height={28} rx={2} />
  </Svg>;
}

function Orbit({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth={1.4}>
    <Ellipse cx={20} cy={20} rx={18} ry={10} />
    <Ellipse cx={20} cy={20} rx={18} ry={10} transform="rotate(25 20 20)" />
    <Ellipse cx={20} cy={20} rx={18} ry={10} transform="rotate(-25 20 20)" />
  </Svg>;
}

export const SHOP_CATEGORIES = [
  { id: 'all', label: 'TOUT', Icon: LayoutGrid },
  { id: 'frames', label: 'CADRES', Icon: Frame },
  { id: 'lighting', label: 'LUMIÈRES', Icon: Orbit },
  { id: 'rooms', label: 'SALLES', Icon: DoorOpen },
  { id: 'ranks', label: 'ÉCRINS', Icon: Gem },
  { id: 'objects', label: 'OBJETS', Icon: Trophy },
  { id: 'effects', label: 'EFFETS', Icon: Sparkles },
  { id: 'consumables', label: 'CONSOMMABLES', Icon: Sparkles },
] as const;

export type ShopCategory = typeof SHOP_CATEGORIES[number]['id'];

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
  menu: { paddingHorizontal: spacing.md, paddingBottom: 8 },
  row: { flexDirection: 'row' },
  item: { width: 94, alignItems: 'center', gap: 5, paddingVertical: 3 },
  icon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  iconActive: { borderColor: colors.volt, backgroundColor: 'rgba(228,255,40,.05)' },
  label: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  labelActive: { color: colors.volt },
  pressed: { opacity: 0.7 },
});
