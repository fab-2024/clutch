import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { FounderPackBanner } from '@/src/features/purchases/components/FounderPackBanner';
import { loadProfileData } from '@/src/features/profile/api';
import {
  resolveLevelFrameCollection,
  resolveOwnedLevelFrames,
} from '@/src/features/profile/levelFrames/catalog';
import LevelFrame from '@/src/features/profile/levelFrames/components/LevelFrame';
import type { LevelFrameCollectionEntry } from '@/src/features/profile/levelFrames/types';
import { useLevelFrameEquipment } from '@/src/features/profile/levelFrames/useLevelFrameEquipment';
import type { ProfileData } from '@/src/features/profile/types';
import { errorFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
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
  applyPreviewAtelierAction,
  atelierPrimaryAction,
  equippedAtelierIds,
  type AtelierPrimaryAction,
} from '../atelierState';
import {
  createRareAcquisitionEvent,
  type RareAcquisitionEvent,
} from '../rareAcquisition';
import {
  SHOWCASE_ROOM_CATALOG,
  type ShowcaseRoomDefinition,
} from '../showcaseRoomCatalog';
import {
  COSMETIC_PACK_CATALOG,
  type TeamPackDefinition,
} from '../teamPackCatalog';
import type { CosmeticItem, CosmeticShopData } from '../types';
import { AtelierPurchaseSheet } from './AtelierPurchaseSheet';
import { RareAcquisitionReveal } from './RareAcquisitionReveal';

type AtelierNotice = { text: string; tone: 'error' | 'info' | 'success' };

const ATELIER_SHELF_TITLES: Record<AtelierCategory, string> = {
  materials: 'MATIÈRES',
  lighting: 'LUMIÈRES',
  supports: 'PRÉSENTOIRS',
  ranks: 'ÉCRINS DE RANG',
  jerseys: 'MAILLOTS',
};

const ATELIER_SCENE_REFERENCE = {
  height: 853,
  sceneBottom: 679,
  sceneTop: 87,
  width: 1844,
} as const;
const PRODUCT_VISUAL_HEIGHT = 132;

export type AtelierPreviewState = {
  acquisitionProductId?: string;
  error?: string | null;
  forceReduceMotion?: boolean;
  loading?: boolean;
  productId?: string;
  purchaseOpen?: boolean;
};

export type AtelierShopScreenProps = {
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
  previewState?: AtelierPreviewState;
};

export default function AtelierShopScreen({
  previewData,
  previewProfile,
  previewState,
}: AtelierShopScreenProps) {
  const { height, width } = useWindowDimensions();
  const { profile, session } = useAuth();
  const { refresh: refreshEconomy, volts } = useEconomy();
  const { refresh: refreshCosmetics } = useCosmetics();
  const { showSnackbar } = useSnackbar();
  const previewProduct = atelierProductById(previewState?.productId);
  const initialProduct = previewProduct ?? atelierProductById('material_graphite');
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [category, setCategory] = useState<AtelierCategory>(initialProduct?.category ?? 'materials');
  const [selectedId, setSelectedId] = useState(initialProduct?.id ?? 'material_graphite');
  const [loading, setLoading] = useState(previewState?.loading ?? !previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(previewState?.error ?? null);
  const [notice, setNotice] = useState<AtelierNotice | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(
    previewState?.purchaseOpen ? previewProduct?.id ?? null : null,
  );
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState<RareAcquisitionEvent | null>(null);
  const [pendingAcquisition, setPendingAcquisition] = useState<RareAcquisitionEvent | null>(null);
  const purchaseTriggerRef = useRef<View>(null);
  const requestRef = useRef(0);
  const cachedDataRef = useRef<CosmeticShopData | null>(previewData ?? null);
  const cachedProfileRef = useRef<ProfileData | null>(previewProfile ?? null);
  const previewAcquisitionRef = useRef('');
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';
  const compactHeight = height < 700;
  const shelfCardWidth = Math.min(268, Math.max(218, width * 0.72));
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
    ?? products.find((product) => product.id === equippedIds[category])
    ?? products[0]
    ?? null;
  const selectedItem = selectedProduct ? runtimeById.get(selectedProduct.id) ?? null : null;
  const balance = data?.balance ?? volts ?? 0;
  const action = selectedItem ? atelierPrimaryAction(selectedItem, balance) : 'unavailable';
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

  useEffect(() => {
    const product = atelierProductById(previewState?.acquisitionProductId);
    const item = product ? runtimeById.get(product.id) ?? null : null;
    if (!product || !item) return;
    const eventKey = `preview:atelier:${product.id}`;
    if (previewAcquisitionRef.current === eventKey) return;
    previewAcquisitionRef.current = eventKey;
    setAcquisition(createRareAcquisitionEvent({ eventKey, item, origin: 'atelier', product }));
  }, [previewState?.acquisitionProductId, runtimeById]);

  function handleProductSelection(product: AtelierProduct) {
    if (product.id === selectedProduct?.id) return;
    selectionFeedback();
    setCategory(product.category);
    setSelectedId(product.id);
    setNotice(null);
  }

  function openRoom(room: ShowcaseRoomDefinition) {
    selectionFeedback();
    router.push({
      pathname: previewData ? '/showcase-preview' : '/showcase',
      params: { room: room.id },
    } as never);
  }

  function openTeamPack(pack: TeamPackDefinition) {
    selectionFeedback();
    if (previewData) {
      router.push({ pathname: '/team-pack-preview', params: { packId: pack.id } } as never);
      return;
    }
    router.push({ pathname: '/team-pack/[key]', params: { key: pack.id } } as never);
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
    const previousItem = data.items.find((candidate) => candidate.slot === item.slot && candidate.equipped) ?? null;
    const optimistic = applyPreviewAtelierAction(data, item.id);
    setPendingId(item.id);
    setLoadError(null);
    setNotice({ tone: 'info', text: `${product.name} est appliqué. Synchronisation en cours…` });
    setData(optimistic);
    cachedDataRef.current = optimistic;

    try {
      if (!previewData) await equipCosmetic(item.id);
      setNotice(null);
      successFeedback();
      showSnackbar({
        action: previousItem && previousItem.id !== item.id ? {
          accessibilityLabel: `Rétablir ${previousItem.name}`,
          label: 'ANNULER',
          onPress: async () => {
            requestRef.current += 1;
            setPendingId(previousItem.id);
            setLoadError(null);
            setNotice({ tone: 'info', text: `Restauration de ${previousItem.name}…` });
            cachedDataRef.current = previousData;
            setData(previousData);
            try {
              if (!previewData) await equipCosmetic(previousItem.id);
              setNotice(null);
              successFeedback();
              showSnackbar({
                message: `${previousItem.name} restauré sur ta Vitrine.`,
                tone: 'success',
              });
              syncAfterMutation(previousData);
            } catch (caught) {
              cachedDataRef.current = optimistic;
              setData(optimistic);
              setNotice(null);
              errorFeedback();
              showSnackbar({
                message: friendlyMutationError(caught, `${product.name} reste équipé. L’annulation n’a pas pu être synchronisée.`),
                tone: 'error',
              });
              syncAfterMutation(optimistic);
            } finally {
              setPendingId(null);
            }
          },
        } : undefined,
        message: `${product.name} équipe ta Vitrine.`,
        tone: 'success',
      });
      syncAfterMutation(optimistic);
    } catch (caught) {
      cachedDataRef.current = previousData;
      setData(previousData);
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
      const mutation = previewData ? null : await purchaseCosmetic(purchaseItem.id);
      const purchased = applyPreviewAtelierAction(data, purchaseItem.id);
      cachedDataRef.current = purchased;
      setData(purchased);
      setPurchaseId(null);
      setNotice(null);
      const reveal = createRareAcquisitionEvent({
        eventKey: `purchase:atelier:${purchaseItem.id}:${Date.now()}`,
        item: { ...purchaseItem, owned: true, equipped: true },
        origin: 'atelier',
        product: purchaseProduct,
      });
      if (reveal && (previewData || mutation?.purchased)) {
        setPendingAcquisition(reveal);
      } else {
        showSnackbar({
          message: `${purchaseProduct.name} rejoint ta collection et équipe maintenant ta Vitrine.`,
          tone: 'success',
        });
        successFeedback();
      }
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

  function finishPurchaseSheetClose() {
    if (!pendingAcquisition) return;
    setAcquisition(pendingAcquisition);
    setPendingAcquisition(null);
  }

  function continueAfterAcquisition() {
    setAcquisition(null);
  }

  function viewAcquisitionInShowcase() {
    setAcquisition(null);
    router.push((previewData ? '/showcase-preview' : '/showcase') as never);
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

            {loading ? (
              <AtelierCatalogSkeleton />
            ) : (
              <View style={styles.catalog} testID="atelier-catalog">
                <View style={styles.catalogIntro}>
                  <Text style={styles.sectionEyebrow}>BOUTIQUE // COLLECTION</Text>
                  <Text style={styles.catalogTitle}>COMPOSE TON ESPACE.</Text>
                  <Text style={styles.catalogDescription}>
                    Fais glisser chaque rayon pour découvrir les différentes finitions.
                  </Text>
                </View>

                <ShowcaseRoomShelf
                  onOpen={openRoom}
                  rooms={SHOWCASE_ROOM_CATALOG}
                  width={shelfCardWidth}
                />

                <LevelFrameShelf
                  entries={levelFrameCollection}
                  level={profileData?.level.level ?? 42}
                  width={shelfCardWidth}
                />

                {ATELIER_CATEGORIES.map((shelfCategory) => (
                  <AtelierProductShelf
                    category={shelfCategory}
                    key={shelfCategory}
                    onSelect={handleProductSelection}
                    products={atelierProducts(shelfCategory)}
                    runtimeById={runtimeById}
                    selectedId={selectedProduct?.id ?? null}
                    width={shelfCardWidth}
                  />
                ))}

                <TeamPackShelf
                  kind="original"
                  onOpen={openTeamPack}
                  packs={COSMETIC_PACK_CATALOG}
                />

                <View style={styles.discoveryLine}>
                  <Text style={styles.discoveryLabel}>PROCHAINEMENT</Text>
                  <Text style={styles.discoveryValue}>NOUVELLES COLLECTIONS · COLLABS</Text>
                </View>

                <FounderPackBanner preview={Boolean(previewData)} />
              </View>
            )}
          </View>
        </ScrollView>

        {!loading && selectedProduct ? (
          <AtelierActionDock
            action={action}
            balance={balance}
            item={selectedItem}
            notice={notice}
            onPrimary={handlePrimaryAction}
            pending={pendingId === selectedProduct.id}
            primaryRef={purchaseTriggerRef}
            product={selectedProduct}
          />
        ) : null}

        <AtelierPurchaseSheet
          balance={balance}
          error={purchaseError}
          onClose={closePurchase}
          onClosed={finishPurchaseSheetClose}
          onConfirm={() => void confirmPurchase()}
          pending={Boolean(purchaseId && pendingId === purchaseId)}
          price={purchaseItem?.price ?? purchaseProduct?.price ?? 0}
          product={purchaseProduct}
          returnFocusRef={purchaseTriggerRef}
          visible={Boolean(purchaseProduct && purchaseItem)}
        />

        <RareAcquisitionReveal
          event={acquisition}
          forceReduceMotion={previewState?.forceReduceMotion}
          onContinueAtelier={continueAfterAcquisition}
          onViewShowcase={viewAcquisitionInShowcase}
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

function AtelierCatalogSkeleton() {
  return (
    <SkeletonGroup
      label="Chargement du catalogue Atelier"
      style={styles.catalogSkeleton}
      testID="atelier-catalog-loading"
    >
      <Skeleton height={14} radius="pill" width="38%" />
      <Skeleton height={30} radius="sm" width="70%" />
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.catalogSkeletonSection}>
          <Skeleton height={22} radius="sm" width="42%" />
          <View style={styles.catalogSkeletonTrack}>
            <Skeleton height={238} radius="md" width="70%" />
            <Skeleton height={238} radius="md" tone="subtle" width="24%" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function ShelfHeading({ count, eyebrow, title }: { count: number; eyebrow: string; title: string }) {
  return (
    <View style={styles.shelfHeading}>
      <View style={styles.shelfHeadingCopy}>
        <Text style={styles.shelfEyebrow}>{eyebrow}</Text>
        <Text style={styles.shelfTitle}>{title}</Text>
      </View>
      <Text accessibilityLabel={`${count} éléments`} style={styles.shelfCount}>
        {String(count).padStart(2, '0')}
      </Text>
    </View>
  );
}

function TeamPackShelf({
  kind,
  onOpen,
  packs,
}: {
  kind: TeamPackDefinition['kind'];
  onOpen: (pack: TeamPackDefinition) => void;
  packs: readonly TeamPackDefinition[];
}) {
  const isGameCollection = kind === 'game_collection';
  const isOriginal = kind === 'original';
  const shelfTestId = isOriginal
    ? 'atelier-shelf-original-packs'
    : isGameCollection
      ? 'atelier-shelf-game-collections'
      : 'atelier-shelf-team-packs';
  return (
    <View
      style={styles.catalogShelf}
      testID={shelfTestId}
    >
      <ShelfHeading
        count={packs.length}
        eyebrow={isOriginal ? 'CLUTCH // ORIGINAL' : isGameCollection ? 'JEUX // COLLECTIONS' : 'COLLECTION // OFFICIELLE'}
        title={isOriginal ? 'PACKS ORIGINAUX' : isGameCollection ? 'COLLECTIONS DE JEU' : 'PACKS ÉQUIPES'}
      />
      <View style={styles.teamPackList}>
        {packs.map((pack) => (
          <Pressable
            accessibilityHint={`Ouvre la collection complète et ses ${pack.items.length} objets`}
            accessibilityLabel={`Ouvrir ${pack.name}, ${pack.items.length} objets, ${formatNumber(pack.price)} Volts`}
            accessibilityRole="button"
            key={pack.id}
            onPress={() => onOpen(pack)}
            style={({ pressed }) => [
              styles.teamPackCard,
              { borderColor: `${pack.accent}72` },
              pressed && styles.pressed,
            ]}
            testID={`${isOriginal ? 'atelier-original-pack' : isGameCollection ? 'atelier-game-collection' : 'atelier-team-pack'}-${pack.id}`}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={pack.hero}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.teamPackShade} />
            <View style={styles.teamPackContent}>
              <View style={styles.teamPackTopline}>
                <View style={[styles.teamPackOfficial, { borderColor: `${pack.accent}80` }]}>
                  <View style={[styles.teamPackDot, { backgroundColor: pack.accent }]} />
                  <Text style={styles.teamPackOfficialText}>
                    {isOriginal ? 'CRÉATION ORIGINALE' : isGameCollection ? 'JEU PARTENAIRE' : 'OFFICIEL'}
                  </Text>
                </View>
                <Text style={styles.teamPackCount}>{pack.items.length} OBJETS</Text>
              </View>
              <View>
                <Text style={[styles.teamPackTitle, { color: pack.accent }]}>{pack.title}</Text>
                <Text style={styles.teamPackSubtitle}>{pack.subtitle}</Text>
                <View style={styles.teamPackActionRow}>
                  <View style={styles.teamPackPrice}>
                    <CurrencyIcon kind="volts" size={14} />
                    <Text style={styles.teamPackPriceText}>{formatNumber(pack.price)}</Text>
                  </View>
                  <Text style={[styles.teamPackOpen, { color: pack.accent }]}>VOIR LE PACK →</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ShowcaseRoomShelf({
  onOpen,
  rooms,
  width,
}: {
  onOpen: (room: ShowcaseRoomDefinition) => void;
  rooms: readonly ShowcaseRoomDefinition[];
  width: number;
}) {
  const imageHeight = 140 / ((676 - 87) / 853);
  const imageWidth = imageHeight * (1844 / 853);

  return (
    <View style={styles.catalogShelf} testID="atelier-shelf-rooms">
      <ShelfHeading count={rooms.length} eyebrow="VITRINE // ESPACE" title="SALLES" />
      <ScrollView
        accessibilityLabel="Parcourir les salles"
        contentContainerStyle={styles.shelfTrack}
        decelerationRate="fast"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={width + spacing.sm}
        testID="atelier-room-list"
      >
        {rooms.map((room, index) => (
          <Pressable
            accessibilityHint="Ouvre cette salle pour organiser les objets de ta collection"
            accessibilityLabel={`${room.name}, huit emplacements personnalisables`}
            accessibilityRole="button"
            key={room.id}
            onPress={() => onOpen(room)}
            style={({ pressed }) => [
              styles.roomCard,
              { borderColor: `${room.accent}66`, width },
              index < rooms.length - 1 && styles.shelfItem,
              pressed && styles.pressed,
            ]}
            testID={`atelier-room-${room.id}`}
          >
            <View style={styles.roomVisual}>
              <Image
                resizeMode="stretch"
                source={room.image}
                style={{
                  height: imageHeight,
                  left: (width - imageWidth) / 2,
                  position: 'absolute',
                  top: -imageHeight * (87 / 853),
                  width: imageWidth,
                }}
              />
              <View pointerEvents="none" style={styles.roomImageShade} />
              <View style={styles.roomSlotCount}>
                <Text style={styles.roomSlotCountText}>8 EMPLACEMENTS</Text>
              </View>
            </View>
            <View style={styles.roomCopy}>
              <View style={styles.roomTopline}>
                <Text style={[styles.rarity, { color: room.accent }]}>SALLE</Text>
                <Text style={styles.roomIncluded}>INCLUS</Text>
              </View>
              <Text numberOfLines={1} style={styles.productName}>{room.name}</Text>
              <Text numberOfLines={2} style={styles.productDescription}>{room.description}</Text>
              <Text style={styles.roomAction}>PERSONNALISER →</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function LevelFrameShelf({
  entries,
  level,
  width,
}: {
  entries: readonly LevelFrameCollectionEntry[];
  level: number;
  width: number;
}) {
  return (
    <View style={styles.catalogShelf} testID="atelier-shelf-level-frames">
      <ShelfHeading count={entries.length} eyebrow="IDENTITÉ // CADRES DE NIVEAU" title="CADRES" />
      <ScrollView
        accessibilityLabel="Parcourir les cadres"
        contentContainerStyle={styles.shelfTrack}
        decelerationRate="fast"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={width + spacing.sm}
      >
        {entries.map((entry, index) => (
          <View
            accessible
            accessibilityLabel={`${entry.name}, ${levelFrameStateLabel(entry)}`}
            key={entry.variant}
            style={[
              styles.frameCard,
              { width },
              entry.equipped && { borderColor: `${entry.accent}99` },
              index < entries.length - 1 && styles.shelfItem,
            ]}
            testID={`atelier-level-frame-${entry.variant}`}
          >
            <View style={styles.frameVisual}>
              <View style={[styles.frameGlow, { backgroundColor: entry.accent }]} />
              <LevelFrame
                disabled={!entry.owned}
                level={level}
                selected={entry.equipped}
                size={108}
                variant={entry.variant}
              />
              {entry.equipped ? (
                <View style={styles.frameEquippedPill}>
                  <Text style={styles.frameEquippedText}>ÉQUIPÉ</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.frameTopline}>
              <Text style={[styles.rarity, { color: entry.accent }]}>{levelFrameRarityLabel(entry)}</Text>
              <Text style={styles.frameState}>{levelFrameSourceLabel(entry)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.productName}>{entry.name}</Text>
            <Text numberOfLines={2} style={styles.productDescription}>{entry.description}</Text>
            <View style={styles.framePriceRow}>
              {entry.source === 'volts' && entry.price ? <CurrencyIcon kind="volts" size={13} /> : null}
              <Text style={styles.framePrice}>{levelFramePriceLabel(entry)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AtelierProductShelf({
  category,
  onSelect,
  products,
  runtimeById,
  selectedId,
  width,
}: {
  category: AtelierCategory;
  onSelect: (product: AtelierProduct) => void;
  products: readonly AtelierProduct[];
  runtimeById: ReadonlyMap<string, CosmeticItem>;
  selectedId: string | null;
  width: number;
}) {
  const title = ATELIER_SHELF_TITLES[category];

  return (
    <View style={styles.catalogShelf} testID={`atelier-shelf-${category}`}>
      <ShelfHeading
        count={products.length}
        eyebrow={`FINITION // ${ATELIER_CATEGORY_META[category].shortLabel}`}
        title={title}
      />
      <ScrollView
        accessibilityLabel={`Parcourir les ${title.toLocaleLowerCase('fr-FR')}`}
        contentContainerStyle={styles.shelfTrack}
        decelerationRate="fast"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={width + spacing.sm}
        testID={`atelier-product-list-${category}`}
      >
        {products.map((product, index) => (
          <View key={product.id} style={index < products.length - 1 ? styles.shelfItem : undefined}>
            <ProductCard
              item={runtimeById.get(product.id) ?? null}
              onPress={() => onSelect(product)}
              product={product}
              selected={selectedId === product.id}
              width={width}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProductCard({
  item,
  onPress,
  product,
  selected,
  width,
}: {
  item: CosmeticItem | null;
  onPress: () => void;
  product: AtelierProduct;
  selected: boolean;
  width: number;
}) {
  const sceneImageHeight = PRODUCT_VISUAL_HEIGHT / (
    (ATELIER_SCENE_REFERENCE.sceneBottom - ATELIER_SCENE_REFERENCE.sceneTop)
    / ATELIER_SCENE_REFERENCE.height
  );
  const sceneImageWidth = sceneImageHeight * (
    ATELIER_SCENE_REFERENCE.width / ATELIER_SCENE_REFERENCE.height
  );
  const usesScenePreview = product.category === 'lighting' || product.category === 'supports';
  const usesRankPreview = product.category === 'ranks';

  return (
    <Pressable
      accessibilityHint="Sélectionne cette finition pour afficher ses actions"
      accessibilityLabel={`${product.name}, ${productStateLabel(item, product)}`}
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
      <View
        style={[styles.productVisual, { backgroundColor: `${product.accent}0D` }]}
        testID={usesRankPreview ? `atelier-ranks-preview-${product.id}` : undefined}
      >
        {usesScenePreview ? (
          <Image
            resizeMode="stretch"
            source={product.image}
            style={{
              height: sceneImageHeight,
              left: (width - sceneImageWidth) / 2,
              position: 'absolute',
              top: -sceneImageHeight * (
                ATELIER_SCENE_REFERENCE.sceneTop / ATELIER_SCENE_REFERENCE.height
              ),
              width: sceneImageWidth,
            }}
            testID={`atelier-${product.category}-preview-${product.id}`}
          />
        ) : usesRankPreview ? (
          selected && product.overlayImage ? (
            <Image
              resizeMode="contain"
              source={product.overlayImage}
              style={styles.rankProductImage}
            />
          ) : (
            <View style={styles.rankProductMiniature}>
              <View style={[styles.rankProductHalo, { borderColor: `${product.accent}B8` }]} />
              <View style={[styles.rankProductCore, { backgroundColor: product.accent }]} />
              <View style={[styles.rankProductBase, { borderTopColor: product.accent }]} />
            </View>
          )
        ) : (
          <Image resizeMode="contain" source={product.image} style={styles.productImage} />
        )}
        {selected && item?.equipped ? (
          <View style={styles.selectedMark}><Text style={styles.selectedMarkText}>✓</Text></View>
        ) : selected ? (
          <View style={styles.selectedChoice}><Text style={styles.selectedChoiceText}>CHOIX</Text></View>
        ) : null}
      </View>
      <View style={styles.productCopy}>
        <View style={styles.productTopline}>
          <Text style={[styles.rarity, { color: product.accent }]}>{rarityLabel(product.rarity)}</Text>
          <ProductState item={item} product={product} />
        </View>
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
        <Text numberOfLines={2} style={styles.productDescription}>{product.description}</Text>
      </View>
    </Pressable>
  );
}

function ProductState({
  item,
  product,
}: {
  item: CosmeticItem | null;
  product: AtelierProduct;
}) {
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
  pending,
  primaryRef,
  product,
}: {
  action: AtelierPrimaryAction;
  balance: number;
  item: CosmeticItem | null;
  notice: AtelierNotice | null;
  onPrimary: () => void;
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

function productStateLabel(item: CosmeticItem | null, product: AtelierProduct) {
  if (item?.equipped) return 'équipé';
  if (item?.owned) return 'possédé';
  if (!item) return 'en synchronisation';
  return `${formatNumber(item.price || product.price)} Volts`;
}

function levelFrameRarityLabel(entry: LevelFrameCollectionEntry) {
  if (entry.rarity === 'legendary') return 'LÉGENDAIRE';
  if (entry.rarity === 'epic') return 'ÉPIQUE';
  if (entry.rarity === 'rare') return 'RARE';
  return 'INCLUS';
}

function levelFrameSourceLabel(entry: LevelFrameCollectionEntry) {
  if (entry.equipped) return '● ÉQUIPÉ';
  if (entry.owned) return 'POSSÉDÉ';
  if (entry.source === 'founder_pack') return 'FOUNDER PACK';
  if (entry.source === 'included') return 'INCLUS';
  return 'VOLTS';
}

function levelFramePriceLabel(entry: LevelFrameCollectionEntry) {
  if (entry.source === 'included') return 'INCLUS · ÉVOLUTIF';
  if (entry.source === 'founder_pack') return 'FOUNDER PACK';
  return entry.price ? `${formatNumber(entry.price)} VOLTS` : 'INDISPONIBLE';
}

function levelFrameStateLabel(entry: LevelFrameCollectionEntry) {
  if (entry.equipped) return 'équipé';
  if (entry.owned) return 'possédé';
  return levelFramePriceLabel(entry).toLocaleLowerCase('fr-FR');
}

function rarityLabel(rarity: AtelierProduct['rarity']) {
  if (rarity === 'legendaire') return 'LÉGENDAIRE';
  if (rarity === 'epique') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  return 'COMMUN';
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
  sectionEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  catalog: {
    gap: spacing.xl,
  },
  catalogIntro: {
    paddingTop: spacing.xs,
  },
  catalogTitle: {
    ...typography.displaySmall,
    marginTop: 3,
    color: colors.text,
  },
  catalogDescription: {
    ...typography.body,
    maxWidth: 330,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  catalogShelf: {
    gap: spacing.sm,
  },
  shelfHeading: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  shelfHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  shelfEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  shelfTitle: {
    ...typography.sectionTitle,
    marginTop: 2,
    color: colors.text,
  },
  shelfCount: {
    ...typography.metricSmall,
    color: colors.textMuted,
  },
  shelfTrack: {
    paddingRight: spacing.xl + spacing.md,
  },
  shelfItem: {
    marginRight: spacing.sm,
  },
  roomCard: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceLow,
  },
  roomVisual: {
    position: 'relative',
    height: 140,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  roomImageShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2,5,8,.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.08)',
  },
  roomSlotCount: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    minHeight: 26,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,255,61,.42)',
    backgroundColor: 'rgba(5,9,11,.88)',
  },
  roomSlotCountText: {
    ...typography.metadata,
    color: colors.volt,
  },
  roomCopy: {
    minHeight: 132,
    padding: spacing.sm,
  },
  roomTopline: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  roomIncluded: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  roomAction: {
    ...typography.control,
    marginTop: 'auto',
    paddingTop: spacing.sm,
    color: colors.volt,
  },
  frameCard: {
    position: 'relative',
    minHeight: 286,
    padding: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  },
  frameVisual: {
    position: 'relative',
    height: 132,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  frameGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    opacity: 0.09,
  },
  frameEquippedPill: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.volt,
  },
  frameEquippedText: {
    ...typography.metadata,
    color: colors.background,
  },
  frameTopline: {
    minHeight: 20,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  frameState: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  framePriceRow: {
    minHeight: 20,
    marginTop: 'auto',
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  framePrice: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  catalogSkeleton: {
    gap: spacing.sm,
  },
  catalogSkeletonSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  catalogSkeletonTrack: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    height: 132,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  rankProductImage: {
    width: '100%',
    height: '100%',
  },
  rankProductMiniature: {
    position: 'relative',
    width: 108,
    height: 112,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rankProductHalo: {
    position: 'absolute',
    top: 10,
    width: 74,
    height: 74,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.76,
  },
  rankProductCore: {
    position: 'absolute',
    top: 30,
    width: 34,
    height: 34,
    borderRadius: 6,
    opacity: 0.84,
    transform: [{ rotate: '45deg' }],
  },
  rankProductBase: {
    width: 96,
    height: 29,
    borderTopWidth: 2,
    borderRadius: 8,
    backgroundColor: '#0B1218',
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
    minHeight: 106,
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
  teamPackList: {
    gap: spacing.sm,
  },
  teamPackCard: {
    position: 'relative',
    minHeight: 250,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: '#0B1218',
  },
  teamPackShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4,5,7,.24)',
    borderBottomWidth: 128,
    borderBottomColor: 'rgba(4,5,7,.82)',
  },
  teamPackContent: {
    minHeight: 250,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  teamPackTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamPackOfficial: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4,5,7,.84)',
  },
  teamPackDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  teamPackOfficialText: {
    ...typography.eyebrow,
    color: colors.text,
  },
  teamPackCount: {
    ...typography.eyebrow,
    color: colors.textSecondary,
  },
  teamPackTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  teamPackSubtitle: {
    ...typography.cardTitle,
    color: colors.text,
    letterSpacing: 1,
  },
  teamPackActionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamPackPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamPackPriceText: {
    ...typography.metricSmall,
    color: colors.text,
  },
  teamPackOpen: {
    ...typography.control,
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
  primaryAction: {
    width: '100%',
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
