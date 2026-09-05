import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';

import {
  showcasePlaceableKindLabel,
  type ShowcasePlaceableItem,
  type ShowcasePlaceableKind,
  type ShowcaseRoomSlotDefinition,
} from './roomEditor';
import ShowcasePlaceableArtwork from './ShowcasePlaceableArtwork';

type ShowcaseObjectPickerSheetProps = {
  current: ShowcasePlaceableItem | null;
  items: readonly ShowcasePlaceableItem[];
  onClose: () => void;
  onSelect: (item: ShowcasePlaceableItem | null) => void;
  slot: ShowcaseRoomSlotDefinition | null;
};

const KIND_ORDER: readonly ShowcasePlaceableKind[] = [
  'trophy',
  'badge',
  'jersey',
  'ring',
  'rank',
  'frame',
  'title',
  'core',
  'banner',
] as const;

export default function ShowcaseObjectPickerSheet({
  current,
  items,
  onClose,
  onSelect,
  slot,
}: ShowcaseObjectPickerSheetProps) {
  return (
    <BaseSheet
      eyebrow={slot?.label.toUpperCase()}
      onClose={onClose}
      size="large"
      testID="showcase-object-picker"
      title="CHOISIS UN OBJET"
      visible={Boolean(slot)}
    >
      <Text style={styles.intro}>
        Tous les objets obtenus dans la Boutique actuelle peuvent être déplacés vers cet emplacement.
      </Text>
      <Pressable
        accessibilityLabel="Laisser cet emplacement vide"
        accessibilityRole="button"
        accessibilityState={{ selected: current === null }}
        onPress={() => onSelect(null)}
        style={({ pressed }) => [styles.emptyAction, current === null && styles.emptyActionSelected, pressed && styles.pressed]}
        testID="showcase-object-empty"
      >
        <Text style={styles.emptyGlyph}>＋</Text>
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>LAISSER VIDE</Text>
          <Text style={styles.emptyDescription}>L’emplacement reste disponible dans ta salle.</Text>
        </View>
      </Pressable>

      {KIND_ORDER.map((kind) => {
        const kindItems = items.filter((item) => item.kind === kind);
        if (!kindItems.length) return null;
        return (
          <View key={kind} style={styles.group}>
            <Text style={styles.groupTitle}>{showcasePlaceableKindLabel(kind).toUpperCase()}</Text>
            <View style={styles.grid}>
              {kindItems.map((item) => {
                const selected = current?.id === item.id;
                return (
                  <Pressable
                    accessibilityLabel={`${showcasePlaceableKindLabel(item.kind)} ${item.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.id}
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.item,
                      selected && { borderColor: item.accent, backgroundColor: `${item.accent}12` },
                      pressed && styles.pressed,
                    ]}
                    testID={`showcase-placeable-${item.id}`}
                  >
                    <View style={[styles.itemVisual, { borderColor: `${item.accent}72` }]}>
                      <ShowcasePlaceableArtwork item={item} size={36} />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                      <Text style={[styles.itemKind, { color: item.accent }]}>
                        {selected ? 'ÉQUIPÉ ICI' : showcasePlaceableKindLabel(item.kind).toUpperCase()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </BaseSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyAction: {
    minHeight: 64,
    marginTop: spacing.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  },
  emptyActionSelected: {
    borderColor: `${colors.volt}78`,
    backgroundColor: `${colors.volt}0A`,
  },
  emptyGlyph: {
    width: 42,
    color: colors.volt,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
    textAlign: 'center',
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    ...typography.control,
    color: colors.text,
  },
  emptyDescription: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textMuted,
  },
  group: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    width: '48%',
    minHeight: 78,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  },
  itemVisual: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  itemKind: {
    ...typography.eyebrow,
    marginTop: 3,
    fontSize: 8,
    lineHeight: 10,
  },
  pressed: {
    opacity: 0.72,
  },
});
