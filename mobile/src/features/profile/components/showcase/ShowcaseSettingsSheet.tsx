import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { colors, radius, spacing, typography } from '@/src/theme';

import { SHOWCASE_NAVIGATION_ITEMS } from './ShowcaseTopNavigation';
import type { ShowcaseSection } from './types';

type Props = {
  children: ReactNode;
  loading: boolean;
  objectCount: number;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (section: ShowcaseSection) => void;
  refreshing: boolean;
  section: ShowcaseSection;
  visible: boolean;
};

export default function ShowcaseSettingsSheet({
  children,
  loading,
  objectCount,
  onClose,
  onRefresh,
  onSelect,
  refreshing,
  section,
  visible,
}: Props) {
  return (
    <BaseSheet
      onClose={onClose}
      size="large"
      testID="showcase-settings-sheet"
      title="MA VITRINE"
      visible={visible}
    >
      <View style={styles.summary}>
        <Text style={styles.count}>{loading ? 'CHARGEMENT…' : `${objectCount} OBJETS`}</Text>
        <Pressable
          accessibilityLabel="Actualiser ma Vitrine"
          accessibilityRole="button"
          accessibilityState={{ busy: refreshing, disabled: loading || refreshing }}
          disabled={loading || refreshing}
          onPress={onRefresh}
          style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
        >
          {refreshing ? <ActivityIndicator color={colors.volt} size="small" /> : (
            <Text style={styles.refreshText}>ACTUALISER</Text>
          )}
        </Pressable>
      </View>
      <View accessibilityRole="tablist" style={styles.sections}>
        {SHOWCASE_NAVIGATION_ITEMS.map((item) => (
          <Pressable
            accessibilityLabel={`Afficher ${item.label.toLocaleLowerCase('fr-FR')}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.value === section }}
            key={item.value}
            onPress={() => {
              onSelect(item.value);
              onClose();
            }}
            style={({ pressed }) => [
              styles.section,
              item.value === section && styles.sectionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.sectionText, item.value === section && styles.selectedText]}>
              {item.glyph} {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {children}
    </BaseSheet>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  count: { ...typography.eyebrow, color: colors.textMuted },
  refresh: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  refreshText: { ...typography.label, color: colors.volt },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
  section: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  sectionSelected: { borderColor: colors.volt, backgroundColor: `${colors.volt}0B` },
  sectionText: { ...typography.label, color: colors.textSecondary },
  selectedText: { color: colors.volt },
  pressed: { opacity: 0.7 },
});
