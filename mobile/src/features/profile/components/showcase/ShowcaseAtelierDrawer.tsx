import type { RefObject } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import {
  ATELIER_CATEGORIES,
  type AtelierCategory,
  type AtelierProduct,
} from '@/src/features/shop/atelierCatalog';
import type { AtelierPrimaryAction } from '@/src/features/shop/atelierState';
import type { CosmeticItem } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';

export type ShowcaseAtelierNotice = {
  text: string;
  tone: 'error' | 'info' | 'success';
};

type ShowcaseAtelierDrawerProps = {
  action: AtelierPrimaryAction;
  balance: number;
  category: AtelierCategory;
  item: CosmeticItem | null;
  loading: boolean;
  notice: ShowcaseAtelierNotice | null;
  onCategoryChange: (category: AtelierCategory) => void;
  onClose: () => void;
  onOpen: () => void;
  onPrimary: () => void;
  onSelect: (product: AtelierProduct) => void;
  open: boolean;
  pending: boolean;
  primaryRef?: RefObject<View | null>;
  product: AtelierProduct | null;
  products: readonly AtelierProduct[];
  runtimeById: ReadonlyMap<string, CosmeticItem>;
  selectedId: string | null;
};

const CATEGORY_LABELS: Record<AtelierCategory, string> = {
  materials: 'COULEUR',
  lighting: 'ÉCLAIRAGE',
  supports: 'FOND',
  ranks: 'RANG',
  jerseys: 'MAILLOT',
};

export const SHOWCASE_ATELIER_CATEGORIES = ATELIER_CATEGORIES;

export default function ShowcaseAtelierDrawer({
  action,
  balance,
  category,
  item,
  loading,
  notice,
  onCategoryChange,
  onClose,
  onOpen,
  onPrimary,
  onSelect,
  open,
  pending,
  primaryRef,
  product,
  products,
  runtimeById,
  selectedId,
}: ShowcaseAtelierDrawerProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 720;

  if (!open) {
    return (
      <View pointerEvents="box-none" style={[styles.closedDock, { bottom: Math.max(insets.bottom, spacing.sm) }]}>
        <Pressable
          accessibilityHint="Prévisualise et achète les finitions de la pièce"
          accessibilityLabel="Ouvrir l’Atelier de la Vitrine"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, expanded: false }}
          disabled={loading}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.openTab,
            loading && styles.disabled,
            pressed && styles.pressed,
          ]}
          testID="showcase-atelier-tab"
        >
          <View style={styles.openTabMark} />
          <View style={styles.openTabCopy}>
            <Text style={styles.openTabTitle}>ATELIER VITRINE</Text>
            <Text style={styles.openTabSubtitle}>APERÇU DIRECT · ACHAT</Text>
          </View>
          <Text style={styles.chevron}>⌃</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Atelier de la Vitrine"
      style={[styles.panel, compact && styles.panelCompact, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      testID="showcase-atelier-drawer"
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>VITRINE // APERÇU DIRECT</Text>
          <Text style={styles.title}>CHANGE L’AMBIANCE.</Text>
        </View>
        <View
          accessible
          accessibilityLabel={`${formatNumber(balance)} Volts disponibles`}
          style={styles.balance}
          testID="showcase-atelier-balance"
        >
          <CurrencyIcon kind="volts" size={16} />
          <Text style={styles.balanceValue}>{formatNumber(balance)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Fermer l’Atelier de la Vitrine"
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, expanded: true }}
          disabled={pending}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pending && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.closeGlyph}>⌄</Text>
        </Pressable>
      </View>

      <ScrollView
        accessibilityLabel="Catégories de personnalisation"
        contentContainerStyle={styles.categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="showcase-atelier-categories"
      >
        {SHOWCASE_ATELIER_CATEGORIES.map((value) => {
          const active = value === category;
          return (
            <Pressable
              accessibilityLabel={CATEGORY_LABELS[value]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={value}
              onPress={() => onCategoryChange(value)}
              style={({ pressed }) => [
                styles.category,
                active && styles.categoryActive,
                pressed && styles.pressed,
              ]}
              testID={`showcase-atelier-category-${value}`}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                {CATEGORY_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        accessibilityLabel={`Options ${CATEGORY_LABELS[category].toLocaleLowerCase('fr-FR')}`}
        contentContainerStyle={styles.products}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="showcase-atelier-products"
      >
        {products.map((candidate) => {
          const runtime = runtimeById.get(candidate.id) ?? null;
          const selected = candidate.id === selectedId;
          const rankPreview = candidate.category === 'ranks';
          return (
            <Pressable
              accessibilityHint="Applique un aperçu sans acheter"
              accessibilityLabel={`${candidate.name}, ${productStateLabel(runtime, candidate)}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={candidate.id}
              onPress={() => onSelect(candidate)}
              style={({ pressed }) => [
                styles.product,
                selected && { borderColor: candidate.accent },
                selected && styles.productSelected,
                pressed && styles.pressed,
              ]}
              testID={`showcase-atelier-product-${candidate.id}`}
            >
              <View
                pointerEvents="none"
                style={[styles.productVisual, { backgroundColor: `${candidate.accent}18` }]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode={rankPreview ? 'contain' : 'cover'}
                  source={candidate.overlayImage ?? candidate.image}
                  style={[styles.productImage, rankPreview && styles.productImageContained]}
                  testID={`showcase-atelier-product-image-${candidate.id}`}
                />
                <View style={[styles.productAccent, { backgroundColor: `${candidate.accent}10` }]} />
              </View>
              <View style={styles.productCopy}>
                <Text numberOfLines={1} style={styles.productName}>{candidate.name.toUpperCase()}</Text>
                <Text numberOfLines={1} style={[styles.productState, selected && { color: candidate.accent }]}>
                  {productStateLabel(runtime, candidate).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.selectionCopy}>
          <Text numberOfLines={1} style={styles.selectionName}>
            {product?.name.toUpperCase() ?? 'OPTION INDISPONIBLE'}
          </Text>
          <Text
            accessibilityLiveRegion={notice ? 'polite' : 'none'}
            numberOfLines={1}
            style={[
              styles.selectionHint,
              notice?.tone === 'error' && styles.noticeError,
              notice?.tone === 'success' && styles.noticeSuccess,
            ]}
          >
            {notice?.text ?? 'Touchez une option pour la voir immédiatement dans la pièce.'}
          </Text>
        </View>
        <Button
          accessibilityHint={primaryAccessibilityHint(action, product)}
          disabled={action === 'equipped' || action === 'insufficient' || action === 'unavailable'}
          label={primaryLabel(action, item, product)}
          loading={pending}
          onPress={onPrimary}
          ref={primaryRef}
          size="compact"
          testID="showcase-atelier-primary"
          variant={action === 'equip' ? 'secondary' : 'primary'}
        />
      </View>

      <Text style={styles.exclusion}>
        Les objets posés sur les socles restent dans ta collection : ils ne sont jamais mis en vente ici.
      </Text>
    </View>
  );
}

function primaryLabel(
  action: AtelierPrimaryAction,
  item: CosmeticItem | null,
  product: AtelierProduct | null,
) {
  const price = item?.price ?? product?.price ?? 0;
  if (action === 'buy') return `ACHETER · ${formatNumber(price)} VOLTS`;
  if (action === 'equip') return 'ÉQUIPER';
  if (action === 'equipped') return 'ÉQUIPÉ';
  if (action === 'insufficient') return 'VOLTS INSUFFISANTS';
  return 'INDISPONIBLE';
}

function primaryAccessibilityHint(action: AtelierPrimaryAction, product: AtelierProduct | null) {
  if (!product) return undefined;
  if (action === 'buy') return `Ouvre la confirmation d’achat pour ${product.name}`;
  if (action === 'equip') return `Équipe ${product.name} dans la Vitrine`;
  return undefined;
}

function productStateLabel(item: CosmeticItem | null, product: AtelierProduct) {
  if (item?.equipped) return 'équipé';
  if (item?.owned) return 'possédé';
  if (!item || !item.available || !item.acquirable) return 'indisponible';
  return `${formatNumber(item.price || product.price)} Volts`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

const styles = StyleSheet.create({
  closedDock: {
    position: 'absolute',
    right: spacing.md,
    left: spacing.md,
    zIndex: 30,
    alignItems: 'center',
  },
  openTab: {
    minWidth: 238,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(5,10,14,.94)',
    borderWidth: 1,
    borderColor: '#425865',
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { height: 4, width: 0 },
    elevation: 8,
  },
  openTabMark: {
    width: 4,
    height: 27,
    borderRadius: 2,
    backgroundColor: colors.volt,
  },
  openTabCopy: { flex: 1, minWidth: 0 },
  openTabTitle: { ...typography.action, color: colors.text },
  openTabSubtitle: { ...typography.eyebrow, marginTop: 1, color: colors.volt, fontSize: 9 },
  chevron: { color: colors.textSecondary, fontSize: 22, lineHeight: 24 },
  panel: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    minHeight: 294,
    paddingTop: spacing.sm,
    backgroundColor: 'rgba(5,10,14,.98)',
    borderTopWidth: 1,
    borderTopColor: '#425865',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { height: -5, width: 0 },
    elevation: 14,
  },
  panelCompact: { minHeight: 258 },
  header: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 9 },
  title: { ...typography.sectionTitle, color: colors.text, fontSize: 18, lineHeight: 21 },
  balance: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  balanceValue: { ...typography.metricSmall, color: colors.text },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  closeGlyph: { color: colors.text, fontSize: 22, lineHeight: 24 },
  categories: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  category: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  categoryActive: { borderColor: colors.volt, backgroundColor: 'rgba(232,255,61,.08)' },
  categoryText: { ...typography.label, color: colors.textMuted },
  categoryTextActive: { color: colors.volt },
  products: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm },
  product: {
    position: 'relative',
    overflow: 'hidden',
    width: 132,
    height: 82,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  productSelected: { borderWidth: 2 },
  productVisual: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%' },
  productImageContained: { marginHorizontal: 18, width: 96 },
  productAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  productCopy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    backgroundColor: 'rgba(2,5,8,.82)',
  },
  productName: { ...typography.label, color: colors.text, fontSize: 9 },
  productState: { ...typography.eyebrow, marginTop: 1, color: colors.textSecondary, fontSize: 8 },
  footer: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectionCopy: { flex: 1, minWidth: 0 },
  selectionName: { ...typography.action, color: colors.text },
  selectionHint: { ...typography.caption, marginTop: 2, color: colors.textSecondary, fontSize: 11 },
  noticeError: { color: colors.danger },
  noticeSuccess: { color: colors.success },
  exclusion: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
