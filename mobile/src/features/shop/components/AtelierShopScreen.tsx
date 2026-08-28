import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { SegmentedControl, type SegmentedControlItem } from '@/src/components/ui/SegmentedControl';
import ShowcaseRoomScene from '@/src/features/profile/components/showcase/ShowcaseRoomScene';
import { loadProfileData } from '@/src/features/profile/api';
import {
  resolveLevelFrameCollection,
  resolveOwnedLevelFrames,
} from '@/src/features/profile/levelFrames/catalog';
import LevelFrameGallery from '@/src/features/profile/levelFrames/components/LevelFrameGallery';
import { useLevelFrameEquipment } from '@/src/features/profile/levelFrames/useLevelFrameEquipment';
import type { ProfileData } from '@/src/features/profile/types';
import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '@/src/features/ranking/grades';
import { errorFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '../api';
import {
  ATELIER_CATEGORIES,
  ATELIER_CATEGORY_META,
  atelierProductById,
  atelierProducts,
  type AtelierCategory,
  type AtelierProduct,
} from '../atelierCatalog';
import {
  applyAtelierTry,
  applyPreviewAtelierAction,
  atelierPrimaryAction,
  equippedAtelierIds,
  resolveAtelierSceneConfig,
  type AtelierPrimaryAction,
  type AtelierTrySelection,
} from '../atelierState';
import type { CosmeticItem, CosmeticShopData } from '../types';
import { AtelierPurchaseSheet } from './AtelierPurchaseSheet';

type AtelierDivision = 'showcase' | 'levelFrames';
type AtelierNotice = { text: string; tone: 'error' | 'info' | 'success' };

export type AtelierPreviewState = {
  error?: string | null;
  loading?: boolean;
  productId?: string;
  purchaseOpen?: boolean;
};

export type AtelierShopScreenProps = {
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
  previewState?: AtelierPreviewState;
};

const DIVISION_ITEMS: readonly SegmentedControlItem<AtelierDivision>[] = [
  { label: 'VITRINE', value: 'showcase' },
  { label: 'CADRES', value: 'levelFrames' },
];

const CATEGORY_ITEMS: readonly SegmentedControlItem<AtelierCategory>[] = ATELIER_CATEGORIES.map((value) => ({
  label: ATELIER_CATEGORY_META[value].shortLabel,
  value,
}));

const COMPACT_CATEGORY_LABELS: Readonly<Record<AtelierCategory, string>> = {
  jerseys: 'MAIL.',
  lighting: 'LUM.',
  materials: 'MAT.',
  supports: 'SOCLES',
};

const COMPACT_CATEGORY_ITEMS: readonly SegmentedControlItem<AtelierCategory>[] = ATELIER_CATEGORIES.map((value) => ({
  accessibilityLabel: ATELIER_CATEGORY_META[value].shortLabel,
  label: COMPACT_CATEGORY_LABELS[value],
  value,
}));

export default function AtelierShopScreen({
  previewData,
  previewProfile,
  previewState,
}: AtelierShopScreenProps) {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { profile, session } = useAuth();
  const { refresh: refreshEconomy, volts } = useEconomy();
  const { refresh: refreshCosmetics } = useCosmetics();
  const previewProduct = atelierProductById(previewState?.productId);
  const initialProduct = previewProduct ?? atelierProductById('material_graphite');
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [category, setCategory] = useState<AtelierCategory>(initialProduct?.category ?? 'materials');
  const [division, setDivision] = useState<AtelierDivision>(() => levelFrameCategoryFromParam(params.category));
  const [selectedId, setSelectedId] = useState(initialProduct?.id ?? 'material_graphite');
  const [trial, setTrial] = useState<AtelierTrySelection>({});
  const [loading, setLoading] = useState(previewState?.loading ?? !previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(previewState?.error ?? null);
  const [notice, setNotice] = useState<AtelierNotice | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(
    previewState?.purchaseOpen ? previewProduct?.id ?? null : null,
  );
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const productTrackRef = useRef<ScrollView>(null);
  const purchaseTriggerRef = useRef<View>(null);
  const requestRef = useRef(0);
  const cachedDataRef = useRef<CosmeticShopData | null>(previewData ?? null);
  const cachedProfileRef = useRef<ProfileData | null>(previewProfile ?? null);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';
  const compactHeight = height < 700;
  const compactWidth = width < 360;
  const cardWidth = Math.min(344, Math.max(240, width - 64));
  const previewLoading = previewState?.loading ?? false;
  const previewError = previewState?.error ?? null;

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setProfileData(previewProfile ?? null);
      cachedDataRef.current = previewData;
      cachedProfileRef.current = previewProfile ?? null;
      setLoadError(previewError);
      setLoading(previewLoading);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const [nextData, nextProfile] = await Promise.all([
        loadCosmeticShop(),
        loadProfileData(pseudo),
      ]);
      if (requestId !== requestRef.current) return;
      cachedDataRef.current = nextData;
      cachedProfileRef.current = nextProfile;
      setData(nextData);
      setProfileData(nextProfile);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      if (cachedDataRef.current) {
        setData(cachedDataRef.current);
        setProfileData(cachedProfileRef.current);
      }
      setLoadError(caught instanceof Error ? caught.message : 'Impossible d’ouvrir l’Atelier.');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData, previewError, previewLoading, previewProfile, pseudo]);

  const syncAfterMutation = useCallback((fallback: CosmeticShopData) => {
    if (previewData) return;
    const requestId = ++requestRef.current;
    void Promise.allSettled([
      loadCosmeticShop(),
      refreshEconomy(),
      refreshCosmetics(),
    ]).then(([shopResult]) => {
      if (requestId !== requestRef.current) return;
      if (shopResult.status === 'fulfilled') {
        cachedDataRef.current = shopResult.value;
        setData(shopResult.value);
      } else {
        cachedDataRef.current = fallback;
        setData(fallback);
      }
    });
  }, [previewData, refreshCosmetics, refreshEconomy]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    setDivision(levelFrameCategoryFromParam(params.category));
  }, [params.category]);

  useEffect(() => {
    if (!previewProduct) return;
    setCategory(previewProduct.category);
    setSelectedId(previewProduct.id);
    setPurchaseId(previewState?.purchaseOpen ? previewProduct.id : null);
  }, [previewProduct, previewState?.purchaseOpen]);

  const runtimeById = useMemo(
    () => new Map((data?.items ?? []).map((item) => [item.id, item])),
    [data?.items],
  );
  const products = useMemo(() => atelierProducts(category), [category]);
  const equippedIds = useMemo(
    () => equippedAtelierIds(data?.equipped ?? profileData?.cosmetics),
    [data?.equipped, profileData?.cosmetics],
  );
  const selectedProduct = products.find((product) => product.id === selectedId)
    ?? products.find((product) => product.id === (trial[category] ?? equippedIds[category]))
    ?? products[0]
    ?? null;
  const selectedItem = selectedProduct ? runtimeById.get(selectedProduct.id) ?? null : null;
  const selectedIndex = Math.max(0, products.findIndex((product) => product.id === selectedProduct?.id));
  const balance = data?.balance ?? volts ?? 0;
  const action = selectedItem ? atelierPrimaryAction(selectedItem, balance) : 'unavailable';
  const scene = resolveAtelierSceneConfig(data?.equipped ?? profileData?.cosmetics, trial);
  const cosmetics = data?.equipped ?? profileData?.cosmetics ?? null;
  const grade = profileData?.ranking.grade;
  const rankLabel = loading ? 'SYNCHRO' : grade?.libelle?.toUpperCase() ?? 'BRONZE';
  const rankAccent = profileData && isZeroRank(profileData.ranking.frags)
    ? ZERO_RANK_ACCENT
    : gradeAccent(grade);
  const trialActive = Object.keys(trial).length > 0;
  const purchaseProduct = atelierProductById(purchaseId);
  const purchaseItem = purchaseProduct ? runtimeById.get(purchaseProduct.id) ?? null : null;
  const ownedLevelFrames = useMemo(
    () => resolveOwnedLevelFrames({ founder: profileData?.founder, preview: Boolean(previewData) }),
    [previewData, profileData?.founder],
  );
  const levelFrameEquipment = useLevelFrameEquipment(
    previewData ? `preview-${pseudo}` : pseudo,
    ownedLevelFrames,
  );
  const levelFrameCollection = useMemo(
    () => resolveLevelFrameCollection(levelFrameEquipment.variant, ownedLevelFrames),
    [levelFrameEquipment.variant, ownedLevelFrames],
  );

  function handleDivisionChange(nextDivision: AtelierDivision) {
    selectionFeedback();
    setDivision(nextDivision);
    setNotice(null);
    setPurchaseId(null);
    setPurchaseError(null);
  }

  function handleCategoryChange(nextCategory: AtelierCategory) {
    selectionFeedback();
    const nextProducts = atelierProducts(nextCategory);
    const nextId = trial[nextCategory] ?? equippedIds[nextCategory];
    setCategory(nextCategory);
    setSelectedId(nextProducts.some((product) => product.id === nextId) ? nextId : nextProducts[0]?.id ?? '');
    setNotice(null);
  }

  function handleProductSelection(productId: string) {
    if (productId === selectedProduct?.id) return;
    selectionFeedback();
    setSelectedId(productId);
    setNotice(null);
  }

  function handleProductScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const interval = cardWidth + spacing.sm;
    const index = Math.max(0, Math.min(products.length - 1, Math.round(event.nativeEvent.contentOffset.x / interval)));
    const product = products[index];
    if (product) handleProductSelection(product.id);
  }

  function handleTry() {
    if (!selectedProduct) return;
    selectionFeedback();
    setTrial((current) => applyAtelierTry(current, selectedProduct.category, selectedProduct.id));
    setNotice({ tone: 'info', text: `${selectedProduct.name} est visible en aperçu. Rien n’est encore sauvegardé.` });
  }

  function handlePrimaryAction() {
    if (!selectedItem || !selectedProduct || pendingId) return;
    const nextAction = atelierPrimaryAction(selectedItem, balance);
    if (nextAction === 'buy') {
      selectionFeedback();
      setPurchaseError(null);
      setPurchaseId(selectedItem.id);
      return;
    }
    if (nextAction === 'equip') {
      void equipSelected(selectedItem, selectedProduct);
    }
  }

  async function equipSelected(item: CosmeticItem, product: AtelierProduct) {
    if (!data || pendingId) return;
    const previousData = data;
    const previousTrial = trial;
    const optimistic = applyPreviewAtelierAction(data, item.id);
    setPendingId(item.id);
    setLoadError(null);
    setNotice({ tone: 'info', text: `${product.name} est appliqué. Synchronisation en cours…` });
    setData(optimistic);
    cachedDataRef.current = optimistic;
    setTrial((current) => withoutTrialCategory(current, product.category));

    try {
      if (!previewData) await equipCosmetic(item.id);
      setNotice({ tone: 'success', text: `${product.name} équipe maintenant ta Vitrine.` });
      successFeedback();
      syncAfterMutation(optimistic);
    } catch (caught) {
      cachedDataRef.current = previousData;
      setData(previousData);
      setTrial(previousTrial);
      setNotice({
        tone: 'error',
        text: friendlyMutationError(caught, 'L’équipement n’a pas pu être enregistré. Ta configuration précédente est restaurée.'),
      });
      errorFeedback();
    } finally {
      setPendingId(null);
    }
  }

  async function confirmPurchase() {
    if (!data || !purchaseItem || !purchaseProduct || pendingId) return;
    if (atelierPrimaryAction(purchaseItem, balance) !== 'buy') {
      setPurchaseError('Le prix ou ton solde a changé. Ferme ce panneau puis réessaie.');
      errorFeedback();
      return;
    }

    setPendingId(purchaseItem.id);
    setPurchaseError(null);
    try {
      if (!previewData) await purchaseCosmetic(purchaseItem.id);
      const purchased = applyPreviewAtelierAction(data, purchaseItem.id);
      cachedDataRef.current = purchased;
      setData(purchased);
      setTrial((current) => withoutTrialCategory(current, purchaseProduct.category));
      setPurchaseId(null);
      setNotice({
        tone: 'success',
        text: `${purchaseProduct.name} rejoint ta collection et équipe maintenant ta Vitrine.`,
      });
      successFeedback();
      syncAfterMutation(purchased);
    } catch (caught) {
      setPurchaseError(friendlyMutationError(caught, 'Cette acquisition n’a pas pu être finalisée.'));
      errorFeedback();
    } finally {
      setPendingId(null);
    }
  }

  function closePurchase() {
    if (pendingId === purchaseId) return;
    setPurchaseId(null);
    setPurchaseError(null);
  }

  return (
    <Screen>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, compactHeight && styles.scrollContentCompact]}
          refreshControl={(
            <RefreshControl
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={colors.volt}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, compactHeight && styles.contentCompact]}>
            <AtelierHeader balance={balance} compact={compactHeight} loading={loading} />

            {loadError ? (
              <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBanner}>
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>ATELIER INDISPONIBLE</Text>
                  <Text style={styles.errorText}>{friendlyLoadError(loadError)}</Text>
                </View>
                <Button label="RÉESSAYER" onPress={() => void load()} size="compact" variant="secondary" />
              </View>
            ) : null}

            <SegmentedControl
              accessibilityLabel="Choisir une section de la boutique"
              items={DIVISION_ITEMS}
              onChange={handleDivisionChange}
              value={division}
            />

            {division === 'levelFrames' ? (
              <LevelFrameGallery
                entries={levelFrameCollection}
                level={profileData?.level.level ?? 42}
                mode="shop"
              />
            ) : (
              <>
                <View style={[styles.livePanel, compactHeight && styles.livePanelCompact]}>
                  <LinearGradient
                    colors={['rgba(18,25,32,.98)', 'rgba(7,10,14,.99)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.panelHeading}>
                    <View style={styles.panelCopy}>
                      <Text style={styles.sectionEyebrow}>APERÇU EN DIRECT</Text>
                      <Text numberOfLines={1} style={styles.panelDescription}>
                        {trialActive ? 'Aperçu temporaire' : 'Configuration équipée'}
                      </Text>
                    </View>
                    <Button
                      accessibilityLabel="Ouvrir la Vitrine en paysage"
                      label="OUVRIR ↗"
                      onPress={() => router.push((previewData ? '/showcase-preview' : '/showcase') as never)}
                      size="compact"
                      variant="ghost"
                    />
                  </View>

                  <View style={styles.sceneFrame}>
                    <ShowcaseRoomScene
                      cosmetics={cosmetics}
                      data={profileData}
                      jerseyPresentation={scene.jerseyPresentation}
                      lighting={scene.lighting}
                      loading={loading}
                      mode="preview"
                      pedestal={scene.pedestal}
                      rankAccent={rankAccent}
                      rankLabel={rankLabel}
                      style={compactHeight ? styles.compactScene : undefined}
                      theme={scene.theme}
                    />
                    {loading ? (
                      <View style={styles.sceneLoading}>
                        <ActivityIndicator color={colors.volt} />
                        <Text style={styles.sceneLoadingText}>INSTALLATION DE LA VITRINE…</Text>
                      </View>
                    ) : null}
                    {trialActive ? (
                      <View accessible accessibilityLabel="Aperçu temporaire, non sauvegardé" style={styles.trialStatus}>
                        <Text style={styles.trialStatusText}>APERÇU · NON SAUVEGARDÉ</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.composer, compactHeight && styles.composerCompact]}>
                  <View style={[styles.composerHeading, compactHeight && styles.composerHeadingCompact]}>
                    <View>
                      <Text style={styles.sectionEyebrow}>COMPOSER LA VITRINE</Text>
                      <Text style={styles.composerTitle}>CHOISIS UNE FINITION.</Text>
                    </View>
                    <Text accessibilityLabel={`${selectedIndex + 1} sur ${products.length}`} style={styles.counter}>
                      {String(selectedIndex + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
                    </Text>
                  </View>

                  <SegmentedControl
                    accessibilityLabel="Choisir une catégorie de finition"
                    items={compactWidth ? COMPACT_CATEGORY_ITEMS : CATEGORY_ITEMS}
                    onChange={handleCategoryChange}
                    testID="atelier-category-control"
                    value={category}
                  />

                  <Animated.View key={category} entering={reduceMotion ? undefined : FadeIn.duration(180)}>
                    <ScrollView
                      contentOffset={{ x: selectedIndex * (cardWidth + spacing.sm), y: 0 }}
                      contentContainerStyle={styles.productTrack}
                      decelerationRate="fast"
                      horizontal
                      onContentSizeChange={() => productTrackRef.current?.scrollTo({
                        animated: false,
                        x: selectedIndex * (cardWidth + spacing.sm),
                        y: 0,
                      })}
                      onMomentumScrollEnd={handleProductScrollEnd}
                      ref={productTrackRef}
                      showsHorizontalScrollIndicator={false}
                      snapToAlignment="start"
                      snapToInterval={cardWidth + spacing.sm}
                      testID="atelier-product-list"
                    >
                      {products.map((product, index) => (
                        <View key={product.id} style={index < products.length - 1 ? styles.productItem : undefined}>
                          <ProductCard
                            item={runtimeById.get(product.id) ?? null}
                            onPress={() => handleProductSelection(product.id)}
                            previewed={trial[category] === product.id}
                            product={product}
                            selected={selectedProduct?.id === product.id}
                            width={cardWidth}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </View>

                <View style={styles.discoveryLine}>
                  <Text style={styles.discoveryLabel}>PROCHAINEMENT</Text>
                  <Text style={styles.discoveryValue}>PACKS ÉQUIPES · COLLABS</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {division === 'showcase' && selectedProduct ? (
          <AtelierActionDock
            action={action}
            balance={balance}
            item={selectedItem}
            notice={notice}
            onPrimary={handlePrimaryAction}
            onTry={handleTry}
            pending={pendingId === selectedProduct.id}
            primaryRef={purchaseTriggerRef}
            product={selectedProduct}
          />
        ) : null}

        <AtelierPurchaseSheet
          balance={balance}
          error={purchaseError}
          onClose={closePurchase}
          onConfirm={() => void confirmPurchase()}
          pending={Boolean(purchaseId && pendingId === purchaseId)}
          price={purchaseItem?.price ?? purchaseProduct?.price ?? 0}
          product={purchaseProduct}
          returnFocusRef={purchaseTriggerRef}
          visible={Boolean(purchaseProduct && purchaseItem)}
        />
      </View>
    </Screen>
  );
}

function AtelierHeader({ balance, compact, loading }: { balance: number; compact: boolean; loading: boolean }) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Pressable
        accessibilityLabel="Revenir au profil"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.headerEyebrow}>BOUTIQUE // VITRINE</Text>
        <Text style={styles.headerTitle}>ATELIER</Text>
      </View>
      <View accessible accessibilityLabel={`${formatNumber(balance)} Volts disponibles`} style={styles.balance} testID="atelier-balance">
        <CurrencyIcon kind="volts" size={17} />
        <View>
          <Text style={styles.balanceLabel}>SOLDE</Text>
          <Text style={styles.balanceValue}>{loading ? '—' : formatNumber(balance)}</Text>
        </View>
      </View>
    </View>
  );
}

function ProductCard({
  item,
  onPress,
  previewed,
  product,
  selected,
  width,
}: {
  item: CosmeticItem | null;
  onPress: () => void;
  previewed: boolean;
  product: AtelierProduct;
  selected: boolean;
  width: number;
}) {
  return (
    <Pressable
      accessibilityHint="Sélectionne cette finition pour afficher ses actions"
      accessibilityLabel={`${product.name}, ${productStateLabel(item, product, previewed)}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        { width },
        selected && styles.productCardSelected,
        pressed && styles.pressed,
      ]}
      testID={`atelier-product-${product.id}`}
    >
      <View style={[styles.productAccent, { backgroundColor: product.accent }]} />
      <View style={[styles.productVisual, { backgroundColor: `${product.accent}0D` }]}>
        <Image resizeMode="contain" source={product.image} style={styles.productImage} />
        {selected && item?.equipped ? (
          <View style={styles.selectedMark}><Text style={styles.selectedMarkText}>✓</Text></View>
        ) : selected ? (
          <View style={styles.selectedChoice}><Text style={styles.selectedChoiceText}>CHOIX</Text></View>
        ) : null}
      </View>
      <View style={styles.productCopy}>
        <View style={styles.productTopline}>
          <Text style={[styles.rarity, { color: product.accent }]}>{rarityLabel(product.rarity)}</Text>
          <ProductState item={item} previewed={previewed} product={product} />
        </View>
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
        <Text numberOfLines={2} style={styles.productDescription}>{product.description}</Text>
      </View>
    </Pressable>
  );
}

function ProductState({
  item,
  previewed,
  product,
}: {
  item: CosmeticItem | null;
  previewed: boolean;
  product: AtelierProduct;
}) {
  if (previewed && !item?.equipped) return <Text style={styles.statePreview}>APERÇU</Text>;
  if (item?.equipped) return <Text style={styles.stateEquipped}>● ÉQUIPÉ</Text>;
  if (item?.owned) return <Text style={styles.stateOwned}>POSSÉDÉ</Text>;
  if (!item) return <Text style={styles.stateMuted}>SYNCHRO</Text>;
  return (
    <View style={styles.priceRow}>
      <CurrencyIcon kind="volts" size={13} />
      <Text style={styles.priceText}>{formatNumber(item.price || product.price)}</Text>
    </View>
  );
}

function AtelierActionDock({
  action,
  balance,
  item,
  notice,
  onPrimary,
  onTry,
  pending,
  primaryRef,
  product,
}: {
  action: AtelierPrimaryAction;
  balance: number;
  item: CosmeticItem | null;
  notice: AtelierNotice | null;
  onPrimary: () => void;
  onTry: () => void;
  pending: boolean;
  primaryRef: RefObject<View | null>;
  product: AtelierProduct;
}) {
  const disabled = pending || action === 'equipped' || action === 'insufficient' || action === 'unavailable';
  const contextualNotice = notice ?? defaultActionNotice(action, balance, item, product);
  const price = item?.price ?? product.price;

  return (
    <View style={styles.dockShell} testID="atelier-action">
      <View style={styles.actionDock}>
        {action === 'equipped' && !pending ? (
          <View accessible accessibilityLabel={`${product.name}, configuration active`} style={styles.activeConfiguration}>
            <View style={styles.activeCopy}>
              <Text style={styles.actionEyebrow}>{ATELIER_CATEGORY_META[product.category].label}</Text>
              <Text numberOfLines={1} style={styles.actionName}>{product.name}</Text>
            </View>
            <View style={styles.activeState}>
              <Text style={styles.activeMark}>✓</Text>
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.actionHeading}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionEyebrow}>{ATELIER_CATEGORY_META[product.category].label}</Text>
                <Text numberOfLines={1} style={styles.actionName}>{product.name}</Text>
              </View>
              <Text style={styles.actionState}>
                {action === 'insufficient' ? `${formatNumber(price)} VOLTS` : actionStateLabel(action)}
              </Text>
            </View>
            <View style={styles.actions}>
              <View style={styles.tryAction}>
                <Button
                  accessibilityLabel={`Essayer ${product.name}`}
                  disabled={pending}
                  fullWidth
                  label="ESSAYER"
                  onPress={onTry}
                  variant="secondary"
                />
              </View>
              <View style={styles.primaryAction}>
                <Button
                  accessibilityHint={action === 'buy' ? 'Ouvre le récapitulatif avant de débiter tes Volts' : undefined}
                  accessibilityLabel={primaryAccessibilityLabel(action, product, price, balance)}
                  disabled={disabled}
                  fullWidth
                  label={primaryLabel(action, item, product, balance)}
                  loading={pending}
                  onPress={onPrimary}
                  ref={primaryRef}
                  testID="atelier-action-primary"
                />
              </View>
            </View>
          </>
        )}

        {contextualNotice ? (
          <View
            accessible
            accessibilityLiveRegion={contextualNotice.tone === 'error' ? 'assertive' : 'polite'}
            accessibilityRole={contextualNotice.tone === 'error' ? 'alert' : undefined}
            style={styles.notice}
            testID="atelier-feedback"
          >
            <View style={[styles.noticeMark, noticeToneStyle[contextualNotice.tone]]} />
            <Text style={[styles.noticeText, contextualNotice.tone === 'error' && styles.noticeTextError]}>
              {contextualNotice.text}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function defaultActionNotice(
  action: AtelierPrimaryAction,
  balance: number,
  item: CosmeticItem | null,
  product: AtelierProduct,
): AtelierNotice | null {
  if (action === 'insufficient') {
    return {
      tone: 'error',
      text: `Il manque ${formatNumber((item?.price ?? product.price) - balance)} Volts pour cette finition.`,
    };
  }
  if (action === 'unavailable') {
    return {
      tone: 'info',
      text: item
        ? 'Cette finition n’est pas disponible à l’acquisition.'
        : 'Le catalogue Atelier est encore en cours de synchronisation.',
    };
  }
  return null;
}

function primaryLabel(
  action: AtelierPrimaryAction,
  item: CosmeticItem | null,
  product: AtelierProduct,
  balance: number,
) {
  const price = item?.price ?? product.price;
  if (action === 'equip') return 'ÉQUIPER';
  if (action === 'equipped') return 'ÉQUIPÉ';
  if (action === 'insufficient') return 'SOLDE INSUFFISANT';
  if (action === 'unavailable') return item ? 'INDISPONIBLE' : 'SYNCHRONISATION';
  return `DÉBLOQUER · ${formatNumber(price)}`;
}

function primaryAccessibilityLabel(
  action: AtelierPrimaryAction,
  product: AtelierProduct,
  price: number,
  balance: number,
) {
  if (action === 'buy') return `Débloquer ${product.name} pour ${formatNumber(price)} Volts`;
  if (action === 'equip') return `Équiper ${product.name}`;
  if (action === 'equipped') return `${product.name} est équipé`;
  if (action === 'insufficient') return `Solde insuffisant. Il manque ${formatNumber(price - balance)} Volts pour ${product.name}`;
  return `${product.name} est indisponible`;
}

function actionStateLabel(action: AtelierPrimaryAction) {
  if (action === 'equipped') return 'ÉQUIPÉ';
  if (action === 'equip') return 'POSSÉDÉ';
  if (action === 'buy') return 'À DÉBLOQUER';
  if (action === 'insufficient') return 'SOLDE INSUFFISANT';
  return 'INDISPONIBLE';
}

function productStateLabel(item: CosmeticItem | null, product: AtelierProduct, previewed: boolean) {
  if (previewed && !item?.equipped) return 'en aperçu temporaire';
  if (item?.equipped) return 'équipé';
  if (item?.owned) return 'possédé';
  if (!item) return 'en synchronisation';
  return `${formatNumber(item.price || product.price)} Volts`;
}

function rarityLabel(rarity: AtelierProduct['rarity']) {
  if (rarity === 'legendaire') return 'LÉGENDAIRE';
  if (rarity === 'epique') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  return 'COMMUN';
}

function withoutTrialCategory(selection: AtelierTrySelection, category: AtelierCategory) {
  const next = { ...selection };
  delete next[category];
  return next;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

function friendlyLoadError(value: string) {
  if (/network|fetch|hors connexion|offline/i.test(value)) {
    return 'Connexion indisponible. La dernière configuration connue reste affichée.';
  }
  return value;
}

function friendlyMutationError(caught: unknown, fallback: string) {
  const value = caught instanceof Error ? caught.message : fallback;
  if (/solde insuffisant/i.test(value)) return 'Ton solde a changé. Recharge l’Atelier avant de confirmer.';
  if (/network|fetch|hors connexion|offline/i.test(value)) return 'Connexion indisponible. Réessaie sans quitter ta composition.';
  return value || fallback;
}

function levelFrameCategoryFromParam(value?: string | string[]) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === 'level-frames' || normalized === 'levelFrames' || normalized === 'niveaux'
    ? 'levelFrames'
    : 'showcase';
}

const noticeToneStyle = StyleSheet.create({
  error: { backgroundColor: colors.danger },
  info: { backgroundColor: colors.info },
  success: { backgroundColor: colors.success },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  scrollContentCompact: {
    paddingTop: spacing.xs,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  contentCompact: {
    gap: spacing.sm,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCompact: {
    minHeight: 52,
  },
  backButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLow,
  },
  backIcon: {
    marginTop: -3,
    color: colors.text,
    fontSize: 31,
    lineHeight: 31,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  headerTitle: {
    ...typography.displaySmall,
    marginTop: 1,
    color: colors.text,
  },
  balance: {
    minWidth: 96,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.volt}52`,
    backgroundColor: colors.surfaceLow,
  },
  balanceLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  balanceValue: {
    ...typography.metricSmall,
    color: colors.text,
  },
  errorBanner: {
    minHeight: 72,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.danger}66`,
    backgroundColor: `${colors.danger}12`,
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    ...typography.control,
    color: colors.danger,
  },
  errorText: {
    ...typography.body,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  livePanel: {
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  livePanelCompact: {
    paddingTop: spacing.xs,
  },
  panelHeading: {
    minHeight: layout.minTouchTarget,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  panelCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  panelDescription: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  sceneFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  compactScene: {
    aspectRatio: 2.3,
  },
  sceneLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(4,7,9,.68)',
  },
  sceneLoadingText: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  trialStatus: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.volt}8A`,
    backgroundColor: 'rgba(9,13,7,.92)',
  },
  trialStatusText: {
    ...typography.metadata,
    color: colors.volt,
  },
  composer: {
    gap: spacing.sm,
  },
  composerCompact: {
    gap: spacing.xs,
  },
  composerHeading: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  composerHeadingCompact: {
    minHeight: 38,
  },
  composerTitle: {
    ...typography.sectionTitle,
    marginTop: 2,
    color: colors.text,
  },
  counter: {
    ...typography.metricSmall,
    color: colors.textMuted,
  },
  productTrack: {
    paddingRight: spacing.xl,
  },
  productItem: {
    marginRight: spacing.sm,
  },
  productCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  },
  productCardSelected: {
    borderColor: colors.volt,
    backgroundColor: colors.surfaceRaised,
  },
  productAccent: {
    height: 2,
    opacity: 0.8,
  },
  productVisual: {
    position: 'relative',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  selectedMark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.volt,
  },
  selectedMarkText: {
    ...typography.control,
    color: colors.background,
  },
  selectedChoice: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 48,
    height: 28,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.volt,
    backgroundColor: colors.surfaceRaised,
  },
  selectedChoiceText: {
    ...typography.metadata,
    color: colors.volt,
  },
  productCopy: {
    minHeight: 112,
    padding: spacing.sm,
  },
  productTopline: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rarity: {
    ...typography.metadata,
    fontFamily: fonts.bold,
  },
  statePreview: {
    ...typography.metadata,
    color: colors.info,
  },
  stateEquipped: {
    ...typography.metadata,
    color: colors.volt,
  },
  stateOwned: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  stateMuted: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    ...typography.metricSmall,
    color: colors.text,
  },
  productName: {
    ...typography.metricSmall,
    marginTop: spacing.xs,
    color: colors.text,
  },
  productDescription: {
    ...typography.body,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  discoveryLine: {
    minHeight: layout.minTouchTarget,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  discoveryLabel: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  discoveryValue: {
    ...typography.metadata,
    flex: 1,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  dockShell: {
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  actionDock: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  actionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionEyebrow: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  actionName: {
    ...typography.cardTitle,
    marginTop: 1,
    color: colors.text,
  },
  actionState: {
    ...typography.metadata,
    maxWidth: '42%',
    color: colors.volt,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tryAction: {
    width: 108,
  },
  primaryAction: {
    flex: 1,
    minWidth: 0,
  },
  activeConfiguration: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.volt}52`,
    backgroundColor: `${colors.volt}0D`,
  },
  activeMark: {
    ...typography.control,
    color: colors.volt,
  },
  activeText: {
    ...typography.control,
    color: colors.volt,
  },
  activeCopy: {
    flex: 1,
    minWidth: 0,
  },
  activeState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notice: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeMark: {
    width: 6,
    height: 6,
    marginTop: 6,
    borderRadius: radius.pill,
  },
  noticeText: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  noticeTextError: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.76,
  },
});
