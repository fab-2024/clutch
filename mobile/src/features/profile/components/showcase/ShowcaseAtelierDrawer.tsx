import { useEffect, useRef, type RefObject } from 'react';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import {
  type AtelierCategory,
  type AtelierProduct,
} from '@/src/features/shop/atelierCatalog';
import type { AtelierPrimaryAction } from '@/src/features/shop/atelierState';
import type { CosmeticItem } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';

import type {
  ShowcaseRoomSlotDefinition,
  ShowcaseRoomSlotId,
} from './roomEditor';

export type ShowcaseAtelierNotice = {
  text: string;
  tone: 'error' | 'info' | 'success';
};

type ShowcaseAtelierDrawerProps = {
  action: AtelierPrimaryAction;
  balance: number;
  category: AtelierCategory;
  canRemoveRankDisplay: boolean;
  item: CosmeticItem | null;
  loading: boolean;
  notice: ShowcaseAtelierNotice | null;
  onCategoryChange: (category: AtelierCategory) => void;
  onClose: () => void;
  onOpen: () => void;
  onPedestalTargetAll: () => void;
  onPedestalTargetToggle: (slotId: ShowcaseRoomSlotId) => void;
  onPrimary: () => void;
  onSelect: (product: AtelierProduct) => void;
  open: boolean;
  pending: boolean;
  pedestalSlots: readonly ShowcaseRoomSlotDefinition[];
  pedestalTargetIds: readonly ShowcaseRoomSlotId[];
  primaryRef?: RefObject<View | null>;
  product: AtelierProduct | null;
  products: readonly AtelierProduct[];
  runtimeById: ReadonlyMap<string, CosmeticItem>;
  selectedId: string | null;
};

const CATEGORY_LABELS: Record<AtelierCategory, string> = {
  originals: 'Collection',
  materials: 'Couleur',
  lighting: 'Éclairage',
  supports: 'Salles',
  pedestals: 'Socles',
  ranks: 'Rang',
  jerseys: 'Maillot',
};

export const SHOWCASE_ATELIER_CATEGORIES = ['supports', 'lighting', 'ranks'] as const;

export default function ShowcaseAtelierDrawer({
  action,
  balance,
  category,
  canRemoveRankDisplay,
  item,
  loading,
  notice,
  onCategoryChange,
  onClose,
  onOpen,
  onPedestalTargetAll,
  onPedestalTargetToggle,
  onPrimary,
  onSelect,
  open,
  pending,
  pedestalSlots,
  pedestalTargetIds,
  primaryRef,
  product,
  products,
  runtimeById,
  selectedId,
}: ShowcaseAtelierDrawerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const short = height < 500;
  const narrow = width < 700 && !short;
  const large = width >= 1200;
  const horizontalPadding = Math.max(insets.left, insets.right, large ? 40 : 24);
  const cardGap = large ? 24 : 16;
  const cardWidth = narrow ? width - horizontalPadding * 2 - 24
    : Math.min(480, (width - horizontalPadding * 2 - cardGap * 3) / 3.65);
  const visualHeight = Math.min(cardWidth * .55, short
    ? Math.max(48, height * .82 - 215)
    : Math.max(84, height * .74 - 180 - (narrow ? 50 : 0)));
  // Lighting sources include a legacy header/footer outside the actual room (rows 87–676).
  const lightingScale = Math.max((cardWidth - 4) / 1844, visualHeight / 589);
  const lightingCrop = {
    width: 1844 * lightingScale, height: 853 * lightingScale,
    left: (cardWidth - 4 - 1844 * lightingScale) / 2, top: -87 * lightingScale,
  };
  const selectedIndex = products.findIndex((candidate) => candidate.id === selectedId);
  const productListRef = useRef<ScrollView>(null);
  const primaryDisabled = pending || (!canRemoveRankDisplay
    && (action === 'equipped' || action === 'insufficient' || action === 'unavailable'));
  const label = canRemoveRankDisplay ? 'Déséquiper'
    : sentenceCase(primaryLabel(action, item, product, pedestalTargetIds.length));

  useEffect(() => {
    if (open) productListRef.current?.scrollTo({
      x: Math.max(0, selectedIndex) * (cardWidth + cardGap), animated: false,
    });
  }, [open, category, selectedIndex, cardWidth, cardGap]);

  const selectAdjacent = (direction: number) => {
    const next = products[selectedIndex + direction];
    if (next && !pending) onSelect(next);
  };

  const categoryTabs = (
        <ScrollView
          accessibilityLabel="Catégories de personnalisation"
          contentContainerStyle={styles.categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryStrip, narrow && styles.categoryStripNarrow]}
          testID="showcase-atelier-categories"
        >
          {SHOWCASE_ATELIER_CATEGORIES.map((value) => {
            const active = value === category;
            return (
              <Pressable
                accessibilityLabel={CATEGORY_LABELS[value]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active, disabled: pending }}
                disabled={pending}
                key={value}
                onPress={() => onCategoryChange(value)}
                style={({ pressed }) => [styles.category, active && styles.categoryActive, pressed && styles.pressed]}
                testID={`showcase-atelier-category-${value}`}
              >
                <Text style={[styles.categoryText, large && styles.categoryTextLarge, active && styles.categoryTextActive]}>
                  {CATEGORY_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
  );

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
      style={[styles.panel, { paddingBottom: Math.max(insets.bottom, short ? 8 : large ? 24 : 12) }]}
      testID="showcase-atelier-drawer"
    >
      <View style={[styles.header, short && styles.headerShort, narrow && styles.headerNarrow, { marginHorizontal: horizontalPadding }]}>
        <Text style={[styles.title, large && styles.titleLarge, narrow && styles.titleNarrow, short && styles.titleShort]}>Ambiance de la vitrine</Text>
        {!narrow ? categoryTabs : null}
        <View accessible accessibilityLabel={`${formatNumber(balance)} Volts disponibles`}
          style={styles.balance} testID="showcase-atelier-balance">
          <CurrencyIcon kind="volts" size={large ? 23 : 18} />
          <Text style={[styles.balanceValue, large && styles.balanceValueLarge]}>{formatNumber(balance)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Fermer l’Atelier de la Vitrine"
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, expanded: true }}
          disabled={pending}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pending && styles.disabled, pressed && styles.pressed]}
        >
          <ChevronDown color={colors.text} size={24} />
        </Pressable>
        {narrow ? categoryTabs : null}
      </View>

      {category === 'pedestals' ? (
        <View style={styles.pedestalTargets} testID="showcase-pedestal-targets">
          <Text style={styles.pedestalTargetsLabel}>APPLIQUER À</Text>
          <ScrollView
            accessibilityLabel="Emplacements des socles"
            contentContainerStyle={styles.pedestalTargetOptions}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <PedestalTargetChip
              active={pedestalTargetIds.length === pedestalSlots.length}
              label="TOUS"
              onPress={onPedestalTargetAll}
              testID="showcase-pedestal-target-all"
            />
            {pedestalSlots.map((slot) => (
              <PedestalTargetChip
                active={pedestalTargetIds.includes(slot.id)}
                key={slot.id}
                label={pedestalSlotLabel(slot.id)}
                onPress={() => onPedestalTargetToggle(slot.id)}
                testID={`showcase-pedestal-target-${slot.id}`}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        accessibilityLabel={`Options ${CATEGORY_LABELS[category].toLocaleLowerCase('fr-FR')}`}
        contentContainerStyle={[styles.products, short && styles.productsShort, { paddingHorizontal: horizontalPadding, gap: cardGap }]}
        ref={productListRef}
        snapToInterval={cardWidth + cardGap}
        decelerationRate="fast"
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="showcase-atelier-products"
      >
        {products.map((candidate) => {
          const runtime = runtimeById.get(candidate.id) ?? null;
          const selected = candidate.id === selectedId;
          const containedPreview = candidate.category === 'ranks' || candidate.category === 'pedestals';
          return (
            <Pressable
              accessibilityHint={selected && canRemoveRankDisplay
                ? "Retire l’écrin équipé"
                : "Applique un aperçu sans acheter"}
              accessibilityLabel={`${candidate.name}, ${productStateLabel(runtime, candidate)}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: pending }}
              disabled={pending}
              key={candidate.id}
              onPress={() => onSelect(candidate)}
              style={({ pressed }) => [
                styles.product,
                { width: cardWidth },
                selected && styles.productSelected,
                pressed && styles.pressed,
              ]}
              testID={`showcase-atelier-product-${candidate.id}`}
            >
              <View
                pointerEvents="none"
                style={[styles.productVisual, { height: visualHeight, backgroundColor: `${candidate.accent}18` }]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode={containedPreview ? 'contain' : 'cover'}
                  source={candidate.overlayImage ?? candidate.image}
                  style={[styles.productImage, containedPreview && styles.productImageContained,
                    candidate.category === 'lighting' && styles.lightingImage,
                    candidate.category === 'lighting' && lightingCrop]}
                  testID={`showcase-atelier-product-image-${candidate.id}`}
                />
                {selected ? <View style={styles.selectedMark} testID={`showcase-atelier-selected-${candidate.id}`}>
                  <Check color={colors.background} size={18} strokeWidth={3} />
                </View> : null}
              </View>
              <View style={[styles.productCopy, large && styles.productCopyLarge, short && styles.productCopyShort]}>
                <Text numberOfLines={1} style={[styles.productName, large && styles.productNameLarge]}>{candidate.name}</Text>
                <Text numberOfLines={1} style={[styles.productState, large && styles.productStateLarge]}>
                  {sentenceCase(productStateLabel(runtime, candidate))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, short && styles.footerShort, narrow && styles.footerNarrow, { marginHorizontal: horizontalPadding }]}>
        <View style={[styles.selectionCopy, narrow && styles.selectionCopyNarrow]}>
          <Text numberOfLines={1} style={styles.selectionName}>
            {product?.name ?? 'Option indisponible'}
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
            {notice?.text ?? (category === 'pedestals'
              ? pedestalTargetHint(pedestalTargetIds.length, pedestalSlots.length)
              : 'Sélectionne une ambiance pour la voir dans ta vitrine.')}
          </Text>
        </View>
        <View style={[styles.pagination, narrow && styles.paginationNarrow]} testID="showcase-atelier-pagination">
          <View style={styles.paginationControls}>
            <Pressable accessibilityLabel="Ambiance précédente" accessibilityRole="button"
              accessibilityState={{ disabled: pending || selectedIndex <= 0 }}
              disabled={pending || selectedIndex <= 0} onPress={() => selectAdjacent(-1)}
              style={({ pressed }) => [styles.pageArrow, (pending || selectedIndex <= 0) && styles.disabled, pressed && styles.pressed]}
              testID="showcase-atelier-previous">
              <ChevronLeft color={colors.textSecondary} size={20} />
            </Pressable>
            <Text style={styles.pageCount} accessibilityLiveRegion="polite">{selectedIndex < 0 ? 0 : selectedIndex + 1} / {products.length}</Text>
            <Pressable accessibilityLabel="Ambiance suivante" accessibilityRole="button"
              accessibilityState={{ disabled: pending || selectedIndex >= products.length - 1 }}
              disabled={pending || selectedIndex >= products.length - 1} onPress={() => selectAdjacent(1)}
              style={({ pressed }) => [styles.pageArrow, (pending || selectedIndex >= products.length - 1) && styles.disabled, pressed && styles.pressed]}
              testID="showcase-atelier-next">
              <ChevronRight color={colors.text} size={20} />
            </Pressable>
          </View>
          <View style={styles.progressTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {products.map((candidate, index) => <View key={candidate.id} style={[styles.progressSegment, index === selectedIndex && styles.progressActive]} />)}
          </View>
        </View>
        <View style={styles.primaryArea}>
          <Pressable
            accessibilityHint={canRemoveRankDisplay ? "Retire l’écrin équipé" : primaryAccessibilityHint(action, product)}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled, busy: pending }}
            disabled={primaryDisabled}
            onPress={onPrimary}
            ref={primaryRef}
            style={({ pressed }) => [styles.primary, action === 'buy' && !primaryDisabled && styles.primaryBuy, pressed && styles.pressed]}
            testID="showcase-atelier-primary"
          >
            {pending ? <ActivityIndicator color={colors.textSecondary} /> : action === 'equipped' && !canRemoveRankDisplay
              ? <Check color={colors.textMuted} size={20} /> : null}
            <Text style={[styles.primaryText, action === 'buy' && !primaryDisabled && styles.primaryTextBuy,
              primaryDisabled && styles.primaryTextDisabled]}>{label}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PedestalTargetChip({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Socles, emplacement ${label.toLocaleLowerCase('fr-FR')}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pedestalTarget,
        active && styles.pedestalTargetActive,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={[styles.pedestalTargetMark, active && styles.pedestalTargetMarkActive]} />
      <Text style={[styles.pedestalTargetText, active && styles.pedestalTargetTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function primaryLabel(
  action: AtelierPrimaryAction,
  item: CosmeticItem | null,
  product: AtelierProduct | null,
  pedestalTargetCount: number,
) {
  const price = item?.price ?? product?.price ?? 0;
  if (action === 'buy') return `ACHETER · ${formatNumber(price)} VOLTS`;
  if (action === 'equip' && product?.category === 'pedestals') {
    return pedestalTargetCount > 1 ? `APPLIQUER · ${pedestalTargetCount}` : 'APPLIQUER';
  }
  if (action === 'equip') return 'ÉQUIPER';
  if (action === 'equipped') return 'ÉQUIPÉ';
  if (action === 'insufficient') return 'VOLTS INSUFFISANTS';
  return 'INDISPONIBLE';
}

function pedestalSlotLabel(slotId: ShowcaseRoomSlotId) {
  if (slotId === 'left-free') return 'GAUCHE';
  if (slotId === 'left-extra') return 'G. INT.';
  if (slotId === 'jersey') return 'MAILLOT';
  if (slotId === 'trophy') return 'TROPHÉE';
  if (slotId === 'rank') return 'CENTRE';
  if (slotId === 'badge') return 'BADGE';
  if (slotId === 'title') return 'TITRE';
  if (slotId === 'ring') return 'ANNEAU';
  if (slotId === 'right-extra') return 'D. INT.';
  return 'DROITE';
}

function pedestalTargetHint(selected: number, total: number) {
  if (selected === total) return `Aperçu sur les ${total} emplacements de la salle.`;
  if (selected === 1) return 'Aperçu sur un seul emplacement.';
  return `Aperçu sur ${selected} emplacements.`;
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

function sentenceCase(value: string) {
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1).toLocaleLowerCase('fr-FR');
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
    position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 40,
    paddingTop: 8, backgroundColor: 'rgba(5,10,14,.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.borderSubtle,
    shadowColor: '#000000', shadowOpacity: .5, shadowRadius: 18,
    shadowOffset: { height: -5, width: 0 }, elevation: 14,
  },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  headerNarrow: { flexWrap: 'wrap', gap: 8 },
  headerShort: { minHeight: 54, gap: 8 },
  title: { ...typography.sectionTitle, color: colors.text, fontSize: 18, lineHeight: 26, flex: 1 },
  titleLarge: { fontSize: 26, lineHeight: 32 },
  titleNarrow: { fontSize: 16 },
  titleShort: { fontSize: 14, lineHeight: 20 },
  categoryStrip: { flex: 1.25, flexGrow: 1.25 },
  categoryStripNarrow: { width: '100%', flexBasis: '100%' },
  categories: { flexGrow: 1, justifyContent: 'center', gap: 8 },
  category: { minHeight: 54, flex: 1, minWidth: 78, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  categoryActive: { borderBottomColor: colors.volt },
  categoryText: { ...typography.label, color: colors.textMuted, fontSize: 16, lineHeight: 22 },
  categoryTextLarge: { fontSize: 20, lineHeight: 26 },
  categoryTextActive: { color: colors.text },
  balance: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.pill, backgroundColor: colors.surfaceInteractive,
    borderWidth: 1, borderColor: colors.borderStrong },
  balanceValue: { ...typography.metricSmall, color: colors.text, fontSize: 20 },
  balanceValueLarge: { fontSize: 26, lineHeight: 32 },
  close: { width: 54, height: 46, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, backgroundColor: colors.surfaceInteractive,
    borderWidth: 1, borderColor: colors.borderStrong },
  pedestalTargets: {
    minHeight: 34,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pedestalTargetsLabel: { ...typography.eyebrow, color: colors.textSecondary, fontSize: 8 },
  pedestalTargetOptions: { paddingRight: spacing.md, gap: spacing.xs },
  pedestalTarget: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  pedestalTargetActive: {
    borderColor: colors.volt,
    backgroundColor: 'rgba(232,255,61,.08)',
  },
  pedestalTargetMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  pedestalTargetMarkActive: { borderColor: colors.volt, backgroundColor: colors.volt },
  pedestalTargetText: { ...typography.label, color: colors.textMuted, fontSize: 8 },
  pedestalTargetTextActive: { color: colors.volt },
  products: { paddingTop: 20, paddingBottom: 24, alignItems: 'flex-start' },
  productsShort: { paddingTop: 12, paddingBottom: 12 },
  product: { position: 'relative', overflow: 'hidden', borderRadius: 16,
    backgroundColor: colors.background, borderWidth: 2, borderColor: colors.borderSubtle },
  productSelected: { borderColor: colors.volt },
  productVisual: { overflow: 'hidden', width: '100%' },
  productImage: { width: '100%', height: '100%' },
  lightingImage: { position: 'absolute' },
  productImageContained: { alignSelf: 'center', width: '82%' },
  selectedMark: { position: 'absolute', top: 12, right: 12, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.volt },
  productCopy: { paddingHorizontal: 16, paddingVertical: 12 },
  productCopyLarge: { paddingHorizontal: 24, paddingVertical: 16 },
  productCopyShort: { paddingHorizontal: 10, paddingVertical: 8 },
  productName: { ...typography.sectionTitle, color: colors.text, fontSize: 18, lineHeight: 24 },
  productNameLarge: { fontSize: 24, lineHeight: 30 },
  productState: { ...typography.caption, marginTop: 3, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  productStateLarge: { fontSize: 20, lineHeight: 26 },
  footer: { minHeight: 88, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderTopWidth: 1, borderTopColor: colors.borderStrong },
  footerNarrow: { flexWrap: 'wrap', paddingTop: 12, gap: 8 },
  footerShort: { minHeight: 64, paddingTop: 8, gap: 8 },
  selectionCopy: { flex: 1, minWidth: 0 },
  selectionCopyNarrow: { flexBasis: '100%' },
  selectionName: { ...typography.sectionTitle, color: colors.text, fontSize: 20, lineHeight: 26 },
  selectionHint: { ...typography.caption, marginTop: 4, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  pagination: { width: '19%', minWidth: 140, maxWidth: 320, alignItems: 'center' },
  paginationNarrow: { flex: 1 },
  paginationControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pageArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pageCount: { ...typography.caption, minWidth: 56, color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
  progressTrack: { height: 4, flexDirection: 'row', gap: 3, width: '100%', overflow: 'hidden', borderRadius: 2 },
  progressSegment: { height: 4, flex: 1, backgroundColor: colors.borderStrong, borderRadius: 2 },
  progressActive: { backgroundColor: colors.text },
  primaryArea: { flex: 1, alignItems: 'flex-end' },
  primary: { minHeight: 48, maxWidth: '100%', paddingHorizontal: 22, flexDirection: 'row', gap: 10,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill,
    backgroundColor: colors.surfaceInteractive, borderWidth: 1, borderColor: colors.borderStrong },
  primaryBuy: { backgroundColor: colors.volt, borderColor: colors.volt },
  primaryText: { ...typography.control, color: colors.text, flexShrink: 1 },
  primaryTextBuy: { color: colors.background },
  primaryTextDisabled: { color: colors.textMuted },
  noticeError: { color: colors.danger },
  noticeSuccess: { color: colors.success },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
