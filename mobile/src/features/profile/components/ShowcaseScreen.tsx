import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Eye from 'lucide-react-native/icons/eye';
import Settings2 from 'lucide-react-native/icons/settings-2';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Screen } from '@/src/components/layout/Screen';
import { t } from '@/src/lib/i18n';
import { StreakShowcaseBadge } from '@/src/features/retention/components/CallStreakCard';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '@/src/features/ranking/grades';
import { rankEmblemSource } from '@/src/features/ranking/components/RankEmblem';
import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '@/src/features/shop/api';
import {
  atelierProductById,
  atelierProducts,
  type AtelierCategory,
  type AtelierProduct,
} from '@/src/features/shop/atelierCatalog';
import {
  applyAtelierTry,
  applyPreviewAtelierAction,
  atelierPrimaryAction,
  equippedAtelierIds,
  resolveAtelierSceneConfig,
  type AtelierSceneConfig,
  type AtelierTrySelection,
} from '@/src/features/shop/atelierState';
import { AtelierPurchaseSheet } from '@/src/features/shop/components/AtelierPurchaseSheet';
import { createPresenterRoomAssignments } from '@/src/features/shop/showcasePresenterAssignments';
import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  showcasePresenterById,
} from '@/src/features/shop/showcasePresenterCatalog';
import {
  DEFAULT_SHOWCASE_RANK_DISPLAY_ID,
  SHOWCASE_RANK_DISPLAY_CATALOG,
  showcaseRankDisplayById,
} from '@/src/features/shop/showcaseRankDisplayCatalog';
import { showcaseRoomById } from '@/src/features/shop/showcaseRoomCatalog';
import {
  cosmeticPackItemById,
  currentCosmeticPackItemById,
} from '@/src/features/shop/teamPackCatalog';
import type { CosmeticItem, CosmeticShopData, EquippedCosmetics } from '@/src/features/shop/types';
import { resolveEquippedAchievementBadges } from '@/src/features/profile/achievementBadges/equipment';
import { useAchievementBadgeEquipment } from '@/src/features/profile/achievementBadges/useAchievementBadgeEquipment';
import ShowcaseRingDetailSheet from '@/src/features/profile/showcaseRings/components/ShowcaseRingDetailSheet';
import {
  adaptShowcaseRingStats,
  resolveAllShowcaseRings,
  resolveEquippedShowcaseRing,
} from '@/src/features/profile/showcaseRings/progression';
import type { ShowcaseRingFamily, ShowcaseRingProgress } from '@/src/features/profile/showcaseRings/types';
import { useShowcaseRingEquipment } from '@/src/features/profile/showcaseRings/useShowcaseRingEquipment';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, typography } from '@/src/theme';

import { loadProfileData } from '../api';
import type { ProfileData } from '../types';
import ShowcaseAtelierDrawer, {
  type ShowcaseAtelierNotice,
} from './showcase/ShowcaseAtelierDrawer';
import ShowcaseCustomizationBar from './showcase/ShowcaseCustomizationBar';
import ShowcaseObjectPickerSheet from './showcase/ShowcaseObjectPickerSheet';
import { SHOWCASE_COLLECTIBLE_ASSETS } from './showcase/ShowcasePhysicalObject';
import ShowcaseRoomEditorScene from './showcase/ShowcaseRoomEditorScene';
import ShowcaseRoomScene from './showcase/ShowcaseRoomScene';
import ShowcaseSettingsSheet from './showcase/ShowcaseSettingsSheet';
import {
  createEmptyShowcaseRoomAssignments,
  SHOWCASE_ROOM_SLOTS,
  type ShowcasePlaceableItem,
  type ShowcasePlaceableKind,
  type ShowcaseRoomSlotId,
} from './showcase/roomEditor';
import type {
  ShowcaseAtmospherePerformanceReport,
  ShowcaseAtmosphereQuality,
} from './showcase/showcaseAtmosphere';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';
import type {
  ShowcaseLighting,
  ShowcaseJerseyPresentation,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
  ShowcaseSection,
} from './showcase/types';

type ShowcaseScreenProps = {
  atmosphereQualityOverride?: ShowcaseAtmosphereQuality;
  onAtmospherePerformanceReport?: (report: ShowcaseAtmospherePerformanceReport) => void;
  previewProfile?: ProfileData;
  previewShop?: CosmeticShopData;
  reduceMotionOverride?: boolean;
};

type ShowcaseSceneSnapshot = AtelierSceneConfig & {
  ignoreSelectedRoom: boolean;
};

export default function ShowcaseScreen({
  atmosphereQualityOverride,
  onAtmospherePerformanceReport,
  previewProfile,
  previewShop,
  reduceMotionOverride,
}: ShowcaseScreenProps) {
  const params = useLocalSearchParams<{
    room?: string | string[];
    section?: string | string[];
  }>();
  const requestedSection = showcaseSectionFromParam(params.section);
  const selectedRoom = showcaseRoomById(readParam(params.room));
  const { profile, session } = useAuth();
  const { refresh: refreshCosmetics } = useCosmetics();
  const { refresh: refreshEconomy } = useEconomy();
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [shopData, setShopData] = useState<CosmeticShopData | null>(previewShop ?? null);
  const [loading, setLoading] = useState(!previewProfile || !previewShop);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<ShowcaseSection>(requestedSection);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [atelierVisible, setAtelierVisible] = useState(false);
  const [atelierCategory, setAtelierCategory] = useState<AtelierCategory>('lighting');
  const [atelierTrial, setAtelierTrial] = useState<AtelierTrySelection>({});
  const [atelierPendingId, setAtelierPendingId] = useState<string | null>(null);
  const [atelierPurchaseId, setAtelierPurchaseId] = useState<string | null>(null);
  const [atelierPurchaseError, setAtelierPurchaseError] = useState<string | null>(null);
  const [atelierNotice, setAtelierNotice] = useState<ShowcaseAtelierNotice | null>(null);
  const [pedestal, setPedestal] = useState<ShowcasePedestalSkin>('obsidian');
  const [theme, setTheme] = useState<ShowcaseRoomTheme>('graphite');
  const [lighting, setLighting] = useState<ShowcaseLighting>('cyan');
  const [presenterId, setPresenterId] = useState<string>(DEFAULT_SHOWCASE_PRESENTER_ID);
  const [rankDisplayId, setRankDisplayId] = useState<string>(DEFAULT_SHOWCASE_RANK_DISPLAY_ID);
  const [rankDisplayPendingId, setRankDisplayPendingId] = useState<string | null>(null);
  const [jerseyPresentation, setJerseyPresentation] = useState<ShowcaseJerseyPresentation>('locker');
  const [selectedRingFamily, setSelectedRingFamily] = useState<ShowcaseRingFamily | null>(null);
  const [activeRoomSlot, setActiveRoomSlot] = useState<ShowcaseRoomSlotId | null>(null);
  const [roomAssignments, setRoomAssignments] = useState(createEmptyShowcaseRoomAssignments);
  const [ignoreSelectedRoom, setIgnoreSelectedRoom] = useState(false);
  const [routeFocused, setRouteFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const requestRef = useRef(0);
  const atelierSyncRef = useRef(0);
  const atelierPurchaseTriggerRef = useRef<View>(null);
  const atelierSceneSnapshotRef = useRef<ShowcaseSceneSnapshot | null>(null);
  const trackedRef = useRef(false);
  const savedAtelierAppliedRef = useRef(false);
  const initializedRoomRef = useRef<string | null>(null);
  const rankDisplayMutationRef = useRef(false);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';
  const ringEquipment = useShowcaseRingEquipment(
    previewProfile ? `preview-${previewProfile.pseudo}` : pseudo,
    previewProfile ? 'rank' : null,
  );
  const fallbackBadgeIds = useMemo(
    () => profileData?.pinnedBadges.map((badge) => badge.id) ?? [],
    [profileData?.pinnedBadges],
  );
  const badgeEquipment = useAchievementBadgeEquipment(
    previewProfile ? `preview-${previewProfile.pseudo}` : pseudo,
    fallbackBadgeIds,
  );
  const atmosphereActive = routeFocused && appState === 'active';

  useFocusEffect(useCallback(() => {
    setRouteFocused(true);
    return () => setRouteFocused(false);
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setSection(requestedSection);
  }, [requestedSection]);

  const load = useCallback(async (refresh = false) => {
    if (previewProfile && previewShop) {
      setProfileData(previewProfile);
      setShopData(previewShop);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextShop] = await Promise.all([
        loadProfileData(pseudo),
        loadCosmeticShop(),
      ]);
      if (requestId !== requestRef.current) return;
      setProfileData(nextProfile);
      setShopData(nextShop);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible d’ouvrir ta Vitrine.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewProfile, previewShop, pseudo]);

  const syncAtelierAfterMutation = useCallback((fallback: CosmeticShopData) => {
    if (previewShop) return;
    const syncId = ++atelierSyncRef.current;
    void Promise.allSettled([
      loadCosmeticShop(),
      refreshCosmetics(),
      refreshEconomy(),
    ]).then(([shopResult]) => {
      if (syncId !== atelierSyncRef.current) return;
      setShopData(shopResult.status === 'fulfilled' ? shopResult.value : fallback);
    });
  }, [previewShop, refreshCosmetics, refreshEconomy]);

  useEffect(() => {
    void load();
    return () => {
      requestRef.current += 1;
      atelierSyncRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (previewProfile || loading || !profileData || trackedRef.current) return;
    trackedRef.current = true;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({
      type: 'collection_affichee',
      idempotencyKey: `showcase:${day}`,
    }).catch(() => { trackedRef.current = false; });
  }, [loading, previewProfile, profileData]);

  useEffect(() => {
    if (shopData && !savedAtelierAppliedRef.current) {
      const saved = resolveAtelierSceneConfig(shopData.equipped);
      savedAtelierAppliedRef.current = true;
      setTheme(saved.theme);
      setLighting(saved.lighting);
      setPedestal(saved.pedestal);
      setPresenterId(saved.presenterId);
      setRankDisplayId(saved.rankDisplayId);
      setJerseyPresentation(saved.jerseyPresentation);
    }
  }, [shopData]);

  useEffect(() => {
    if (!selectedRoom) return;
    setIgnoreSelectedRoom(false);
    setTheme(selectedRoom.theme);
    setLighting(selectedRoom.lighting);
    setPedestal(selectedRoom.pedestal);
  }, [selectedRoom]);

  const ownedItems = useMemo(
    () => shopData?.items.filter((item) => item.owned) ?? [],
    [shopData?.items],
  );
  const unlockedPresenterIds = useMemo(
    () => ownedItems
      .filter((item) => item.slot === 'vitrine_supports')
      .map((item) => item.id),
    [ownedItems],
  );
  const atelierRuntimeById = useMemo(
    () => new Map((shopData?.items ?? []).map((item) => [item.id, item])),
    [shopData?.items],
  );
  const atelierEquippedIds = useMemo(
    () => equippedAtelierIds(shopData?.equipped ?? profileData?.cosmetics),
    [profileData?.cosmetics, shopData?.equipped],
  );
  const atelierCategoryProducts = useMemo(
    () => atelierProducts(atelierCategory),
    [atelierCategory],
  );
  const atelierSelectedId = atelierTrial[atelierCategory]
    ?? atelierEquippedIds[atelierCategory]
    ?? atelierCategoryProducts[0]?.id
    ?? null;
  const atelierSelectedProduct = atelierCategoryProducts.find((product) => product.id === atelierSelectedId)
    ?? atelierCategoryProducts[0]
    ?? null;
  const atelierSelectedItem = atelierSelectedProduct
    ? atelierRuntimeById.get(atelierSelectedProduct.id) ?? null
    : null;
  const atelierAction = atelierSelectedItem
    ? atelierPrimaryAction(atelierSelectedItem, shopData?.balance ?? 0)
    : 'unavailable';
  const atelierPurchaseProduct = atelierProductById(atelierPurchaseId);
  const atelierPurchaseItem = atelierPurchaseProduct
    ? atelierRuntimeById.get(atelierPurchaseProduct.id) ?? null
    : null;
  const rankDisplayOptions = useMemo(() => {
    if (previewProfile && previewShop) return SHOWCASE_RANK_DISPLAY_CATALOG;
    const ownedIds = new Set(
      shopData?.items
        .filter((item) => item.slot === 'vitrine_rang' && item.owned)
        .map((item) => item.id) ?? [],
    );
    const ownedDisplays = SHOWCASE_RANK_DISPLAY_CATALOG.filter((display) => ownedIds.has(display.id));
    return ownedDisplays.length > 0
      ? ownedDisplays
      : SHOWCASE_RANK_DISPLAY_CATALOG.filter((display) => display.id === DEFAULT_SHOWCASE_RANK_DISPLAY_ID);
  }, [previewProfile, previewShop, shopData?.items]);
  const cosmetics = resolveEquipped(shopData, profileData?.cosmetics);
  const presenter = showcasePresenterById(presenterId)
    ?? showcasePresenterById(DEFAULT_SHOWCASE_PRESENTER_ID)!;
  const rankDisplay = showcaseRankDisplayById(rankDisplayId)
    ?? showcaseRankDisplayById(DEFAULT_SHOWCASE_RANK_DISPLAY_ID)!;
  const activeSlots = selectedRoom && !ignoreSelectedRoom && presenter.id === DEFAULT_SHOWCASE_PRESENTER_ID
    ? SHOWCASE_ROOM_SLOTS
    : presenter.slots;
  const editableScene = selectedRoom && !ignoreSelectedRoom ? selectedRoom : {
    ...presenter,
    image: presenter.editorImage ?? presenter.image,
  };
  const assignmentLayoutKey = `${selectedRoom && !ignoreSelectedRoom ? selectedRoom.id : 'equipped'}:${presenter.id}`;
  const ringStats = useMemo(() => adaptShowcaseRingStats(profileData), [profileData]);
  const ringProgressions = useMemo(
    () => resolveAllShowcaseRings(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const equippedRing = useMemo(
    () => resolveEquippedShowcaseRing(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const equippedBadges = useMemo(
    () => resolveEquippedAchievementBadges(profileData?.badges ?? [], badgeEquipment.slots),
    [badgeEquipment.slots, profileData?.badges],
  );
  const selectedRingProgress = ringProgressions.find(({ family }) => family === selectedRingFamily) ?? null;
  const grade = profileData?.ranking.grade;
  const rankLabel = loading
    ? 'SYNCHRO'
    : grade?.libelle?.toUpperCase() ?? 'BRONZE';
  const rankAccent = profileData && isZeroRank(profileData.ranking.frags)
    ? ZERO_RANK_ACCENT
    : gradeAccent(grade);
  const placeableItems = useMemo(
    () => resolveRoomPlaceableItems({
      ownedItems,
      profileData,
      rankAccent,
      rankLabel,
      ringProgressions,
    }),
    [ownedItems, profileData, rankAccent, rankLabel, ringProgressions],
  );
  const activeRoomSlotDefinition = activeSlots.find((slot) => slot.id === activeRoomSlot) ?? null;

  useEffect(() => {
    if (!placeableItems.length || initializedRoomRef.current === assignmentLayoutKey) return;
    initializedRoomRef.current = assignmentLayoutKey;
    setActiveRoomSlot(null);
    setRoomAssignments(createPresenterRoomAssignments(
      placeableItems,
      presenter.id,
    ));
  }, [assignmentLayoutKey, placeableItems, presenter.id]);

  function currentSceneSnapshot(): ShowcaseSceneSnapshot {
    return {
      ignoreSelectedRoom,
      jerseyPresentation,
      lighting,
      pedestal,
      presenterId: presenter.id,
      rankDisplayId: rankDisplay.id,
      theme,
    };
  }

  function applySceneSnapshot(snapshot: ShowcaseSceneSnapshot) {
    setIgnoreSelectedRoom(snapshot.ignoreSelectedRoom);
    setJerseyPresentation(snapshot.jerseyPresentation);
    setLighting(snapshot.lighting);
    setPedestal(snapshot.pedestal);
    setPresenterId(snapshot.presenterId);
    setRankDisplayId(snapshot.rankDisplayId);
    setTheme(snapshot.theme);
  }

  function applyAtelierCategoryPreview(category: AtelierCategory, config: AtelierSceneConfig) {
    if (category === 'materials') setTheme(config.theme);
    if (category === 'lighting') setLighting(config.lighting);
    if (category === 'supports') {
      setIgnoreSelectedRoom(true);
      setPedestal(config.pedestal);
      setPresenterId(config.presenterId);
    }
    if (category === 'ranks') setRankDisplayId(config.rankDisplayId);
    if (category === 'jerseys') setJerseyPresentation(config.jerseyPresentation);
  }

  function openAtelier() {
    atelierSceneSnapshotRef.current = currentSceneSnapshot();
    setAtelierTrial({});
    setAtelierNotice(null);
    setAtelierPurchaseError(null);
    setAtelierVisible(true);
  }

  function closeAtelier() {
    if (atelierPendingId) return;
    if (atelierSceneSnapshotRef.current) applySceneSnapshot(atelierSceneSnapshotRef.current);
    atelierSceneSnapshotRef.current = null;
    setAtelierTrial({});
    setAtelierNotice(null);
    setAtelierVisible(false);
  }

  function changeAtelierCategory(nextCategory: AtelierCategory) {
    setAtelierCategory(nextCategory);
    setAtelierNotice(null);
  }

  function previewAtelierProduct(product: AtelierProduct) {
    const nextTrial = applyAtelierTry(atelierTrial, product.category, product.id);
    const nextScene = resolveAtelierSceneConfig(
      shopData?.equipped ?? profileData?.cosmetics,
      nextTrial,
    );
    setAtelierCategory(product.category);
    setAtelierTrial(nextTrial);
    setAtelierNotice(null);
    applyAtelierCategoryPreview(product.category, nextScene);
  }

  function updateAtelierSnapshot(data: CosmeticShopData, category: AtelierCategory) {
    const nextConfig = resolveAtelierSceneConfig(data.equipped);
    const current = atelierSceneSnapshotRef.current ?? currentSceneSnapshot();
    const next = { ...current };

    if (category === 'materials') next.theme = nextConfig.theme;
    if (category === 'lighting') next.lighting = nextConfig.lighting;
    if (category === 'supports') {
      next.ignoreSelectedRoom = true;
      next.pedestal = nextConfig.pedestal;
      next.presenterId = nextConfig.presenterId;
    }
    if (category === 'ranks') next.rankDisplayId = nextConfig.rankDisplayId;
    if (category === 'jerseys') next.jerseyPresentation = nextConfig.jerseyPresentation;

    atelierSceneSnapshotRef.current = next;
  }

  function handleAtelierPrimaryAction() {
    if (!atelierSelectedItem || !atelierSelectedProduct || atelierPendingId) return;
    const nextAction = atelierPrimaryAction(atelierSelectedItem, shopData?.balance ?? 0);
    if (nextAction === 'buy') {
      setAtelierPurchaseError(null);
      setAtelierPurchaseId(atelierSelectedItem.id);
      return;
    }
    if (nextAction === 'equip') {
      void equipAtelierProduct(atelierSelectedItem, atelierSelectedProduct);
    }
  }

  async function equipAtelierProduct(item: CosmeticItem, product: AtelierProduct) {
    if (!shopData || atelierPendingId) return;
    const previousData = shopData;
    const previousSnapshot = atelierSceneSnapshotRef.current;
    const optimistic = applyPreviewAtelierAction(shopData, item.id);
    setAtelierPendingId(item.id);
    setAtelierNotice({ text: `${product.name} est appliqué…`, tone: 'info' });
    setShopData(optimistic);
    updateAtelierSnapshot(optimistic, product.category);

    try {
      if (!previewShop) await equipCosmetic(item.id);
      setAtelierNotice({ text: `${product.name} équipe maintenant ta Vitrine.`, tone: 'success' });
      syncAtelierAfterMutation(optimistic);
    } catch (caught) {
      atelierSceneSnapshotRef.current = previousSnapshot;
      setShopData(previousData);
      setAtelierNotice({
        text: friendlyAtelierError(caught, 'Cette finition n’a pas pu être équipée.'),
        tone: 'error',
      });
    } finally {
      setAtelierPendingId(null);
    }
  }

  async function confirmAtelierPurchase() {
    if (!shopData || !atelierPurchaseItem || !atelierPurchaseProduct || atelierPendingId) return;
    if (atelierPrimaryAction(atelierPurchaseItem, shopData.balance) !== 'buy') {
      setAtelierPurchaseError('Le prix ou ton solde a changé. Ferme ce panneau puis réessaie.');
      return;
    }

    setAtelierPendingId(atelierPurchaseItem.id);
    setAtelierPurchaseError(null);
    try {
      if (!previewShop) await purchaseCosmetic(atelierPurchaseItem.id);
      const purchased = applyPreviewAtelierAction(shopData, atelierPurchaseItem.id);
      setShopData(purchased);
      updateAtelierSnapshot(purchased, atelierPurchaseProduct.category);
      setAtelierPurchaseId(null);
      setAtelierNotice({
        text: `${atelierPurchaseProduct.name} est acheté et déjà équipé.`,
        tone: 'success',
      });
      syncAtelierAfterMutation(purchased);
    } catch (caught) {
      setAtelierPurchaseError(friendlyAtelierError(
        caught,
        'Cette acquisition n’a pas pu être finalisée.',
      ));
    } finally {
      setAtelierPendingId(null);
    }
  }

  function closeAtelierPurchase() {
    if (atelierPendingId === atelierPurchaseId) return;
    setAtelierPurchaseId(null);
    setAtelierPurchaseError(null);
  }

  function changePresenter(nextId: string) {
    const next = showcasePresenterById(nextId);
    if (!next) return;
    setIgnoreSelectedRoom(true);
    setPresenterId(next.id);
    setPedestal(next.pedestal);
  }

  async function changeRankDisplay(nextId: string) {
    const next = showcaseRankDisplayById(nextId);
    if (!next || next.id === rankDisplay.id || rankDisplayMutationRef.current || refreshing || loading) return;

    const item = shopData?.items.find((candidate) => candidate.id === next.id) ?? null;
    const previewMode = Boolean(previewProfile && previewShop);
    if (!previewMode && !item?.owned) return;

    const previousId = rankDisplay.id;
    const previousShop = shopData;
    const mutationRequestId = previewMode ? requestRef.current : ++requestRef.current;
    rankDisplayMutationRef.current = true;
    setRankDisplayPendingId(next.id);
    setError(null);
    setRankDisplayId(next.id);

    if (previewMode) {
      rankDisplayMutationRef.current = false;
      setRankDisplayPendingId(null);
      return;
    }

    if (shopData) setShopData(applyPreviewAtelierAction(shopData, next.id));

    try {
      await equipCosmetic(next.id);
      const [shopResult] = await Promise.allSettled([
        loadCosmeticShop(),
        refreshCosmetics(),
      ]);
      if (requestRef.current === mutationRequestId && shopResult.status === 'fulfilled') {
        setShopData(shopResult.value);
      }
    } catch (caught) {
      if (requestRef.current === mutationRequestId) {
        setRankDisplayId(previousId);
        setShopData(previousShop);
        setError(caught instanceof Error
          ? caught.message
          : 'Impossible d’équiper cet écrin de rang.');
      }
    } finally {
      rankDisplayMutationRef.current = false;
      setRankDisplayPendingId(null);
    }
  }

  function assignRoomItem(item: ShowcasePlaceableItem | null) {
    if (!activeRoomSlot) return;
    setRoomAssignments((current) => ({ ...current, [activeRoomSlot]: item }));
    setActiveRoomSlot(null);
  }

  return (
    <Screen atmosphere="none">
      <View style={styles.screen}>
        <View style={styles.sceneWrap}>
          {section === 'showcase' ? (
            <ShowcaseRoomEditorScene
              assignments={roomAssignments}
              atmosphereActive={atmosphereActive && !loading && !settingsVisible && !atelierVisible && !activeRoomSlot}
              atmosphereQuality={atmosphereQualityOverride}
              cosmetics={cosmetics}
              favoriteTeam={profileData?.favoriteTeam}
              lighting={lighting}
              onAtmospherePerformanceReport={onAtmospherePerformanceReport}
              onSlotPress={(slotId) => {
                if (atelierPendingId) return;
                if (atelierVisible) closeAtelier();
                setActiveRoomSlot(slotId);
              }}
              rankAccent={rankAccent}
              rankDisplay={presenter.showRankDisplay === false ? null : rankDisplay}
              rankOrder={profileData?.ranking.grade.ordre}
              reduceMotion={reduceMotion}
              room={editableScene}
              slots={activeSlots}
              theme={theme}
            />
          ) : (
            <ShowcaseRoomScene
              atmosphereActive={atmosphereActive}
              atmosphereQuality={atmosphereQualityOverride}
              cosmetics={cosmetics}
              data={profileData}
              equippedBadges={equippedBadges}
              equippedRing={equippedRing}
              focus={section}
              jerseyPresentation={jerseyPresentation}
              lighting={lighting}
              loading={loading}
              mode="full"
              onAtmospherePerformanceReport={onAtmospherePerformanceReport}
              onRingPress={equippedRing ? () => setSelectedRingFamily(equippedRing.family) : undefined}
              pedestal={pedestal}
              rankAccent={rankAccent}
              rankDisplay={rankDisplay}
              rankLabel={rankLabel}
              reduceMotion={reduceMotion}
              roomImage={editableScene.image}
              theme={theme}
            />
          )}

          <View pointerEvents="box-none" style={styles.floatingControls}>
            {!previewProfile && !previewShop ? <StreakShowcaseBadge /> : null}
            <Pressable
              accessibilityLabel="Revenir au Magasin"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.floatingButton, pressed && styles.pressed]}
            >
              <ArrowLeft color={colors.text} size={20} />
            </Pressable>
            <Pressable accessibilityLabel={t('showcase.social.entry')} accessibilityRole="button"
              onPress={() => router.push((previewProfile || previewShop ? '/growth-preview?section=activity' : '/showcase-activity') as never)}
              style={({ pressed }) => [styles.floatingButton, pressed && styles.pressed]}>
              <Eye color={colors.text} size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Ouvrir les réglages de la vitrine"
              accessibilityRole="button"
              accessibilityState={{ expanded: settingsVisible }}
              onPress={() => {
                if (atelierPendingId) return;
                if (atelierVisible) closeAtelier();
                setSettingsVisible(true);
              }}
              style={({ pressed }) => [styles.floatingButton, pressed && styles.pressed]}
            >
              <Settings2 color={colors.text} size={20} />
            </Pressable>
          </View>

          {loading ? (
            <View accessibilityLabel="Installation de ta collection" accessibilityRole="progressbar" pointerEvents="none" style={styles.loading}>
              <ActivityIndicator color={colors.volt} size="small" />
              <Text style={styles.loadingText}>INSTALLATION DE TA COLLECTION…</Text>
            </View>
          ) : null}

          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <View style={styles.errorCopy}>
                <Text style={styles.errorEyebrow}>SYNCHRONISATION INTERROMPUE</Text>
                <Text numberOfLines={2} style={styles.errorText}>{error}</Text>
              </View>
              <Pressable
                accessibilityLabel="Réessayer de charger ma Vitrine"
                accessibilityRole="button"
                onPress={() => void load()}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>RÉESSAYER</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <ShowcaseAtelierDrawer
          action={atelierAction}
          balance={shopData?.balance ?? 0}
          category={atelierCategory}
          item={atelierSelectedItem}
          loading={loading || !shopData}
          notice={atelierNotice}
          onCategoryChange={changeAtelierCategory}
          onClose={closeAtelier}
          onOpen={openAtelier}
          onPrimary={handleAtelierPrimaryAction}
          onSelect={previewAtelierProduct}
          open={atelierVisible}
          pending={atelierPendingId === atelierSelectedProduct?.id}
          primaryRef={atelierPurchaseTriggerRef}
          product={atelierSelectedProduct}
          products={atelierCategoryProducts}
          runtimeById={atelierRuntimeById}
          selectedId={atelierSelectedProduct?.id ?? null}
        />

        <AtelierPurchaseSheet
          balance={shopData?.balance ?? 0}
          error={atelierPurchaseError}
          onClose={closeAtelierPurchase}
          onConfirm={() => { void confirmAtelierPurchase(); }}
          pending={Boolean(atelierPurchaseId && atelierPendingId === atelierPurchaseId)}
          price={atelierPurchaseItem?.price ?? atelierPurchaseProduct?.price ?? 0}
          product={atelierPurchaseProduct}
          returnFocusRef={atelierPurchaseTriggerRef}
          visible={Boolean(atelierPurchaseProduct && atelierPurchaseItem)}
        />

        <ShowcaseSettingsSheet
          loading={loading}
          objectCount={placeableItems.length}
          onClose={() => setSettingsVisible(false)}
          onRefresh={() => {
            if (!rankDisplayMutationRef.current) void load(true);
          }}
          onSelect={setSection}
          refreshing={refreshing}
          section={section}
          visible={settingsVisible}
        >
          <ShowcaseCustomizationBar
            layout="sheet"
            lighting={lighting}
            onLightingChange={setLighting}
            onPresenterChange={changePresenter}
            onRankDisplayChange={(nextId) => { void changeRankDisplay(nextId); }}
            onThemeChange={setTheme}
            presenterId={presenter.id}
            rankDisplayDisabled={Boolean(rankDisplayPendingId) || refreshing || loading}
            rankDisplayId={rankDisplay.id}
            rankDisplays={rankDisplayOptions}
            theme={theme}
            unlockedPresenterIds={unlockedPresenterIds}
          />
        </ShowcaseSettingsSheet>

        <ShowcaseRingDetailSheet
          onClose={() => setSelectedRingFamily(null)}
          onEquip={ringEquipment.equip}
          progress={selectedRingProgress}
          visible={Boolean(selectedRingProgress)}
        />

        <ShowcaseObjectPickerSheet
          current={activeRoomSlot ? roomAssignments[activeRoomSlot] : null}
          items={placeableItems}
          onClose={() => setActiveRoomSlot(null)}
          onSelect={assignRoomItem}
          slot={activeRoomSlotDefinition}
        />
      </View>
    </Screen>
  );
}

export function resolveRoomPlaceableItems({
  ownedItems,
  profileData,
  rankAccent,
  rankLabel,
  ringProgressions,
}: {
  ownedItems: readonly CosmeticItem[];
  profileData: ProfileData | null;
  rankAccent: string;
  rankLabel: string;
  ringProgressions: readonly ShowcaseRingProgress[];
}): ShowcasePlaceableItem[] {
  if (!profileData) return [];
  const items: ShowcasePlaceableItem[] = [];

  ownedItems.forEach((item) => {
    const knownPackDefinition = cosmeticPackItemById(item.id);
    const packDefinition = currentCosmeticPackItemById(item.id);
    if (knownPackDefinition && !packDefinition) return;
    const kind = packDefinition?.roomKind ?? roomKindForCosmetic(item);
    if (!kind) return;
    items.push({
      accent: item.accent,
      id: `cosmetic:${item.id}`,
      image: packDefinition?.image ?? physicalAssetForKind(kind),
      kind,
      name: item.name,
    });
  });

  profileData.badges.filter((badge) => badge.obtained).forEach((badge) => {
    items.push({ accent: badge.accent, badge, id: `badge:${badge.id}`, kind: 'badge', name: badge.name });
  });

  ringProgressions.forEach((progress) => {
    if (!progress.current) return;
    items.push({
      accent: progress.definition.accent,
      id: `ring:${progress.family}`,
      image: progress.current.assets.full,
      kind: 'ring',
      name: `${progress.definition.name} · ${progress.current.name}`,
    });
  });

  items.push({
    accent: rankAccent,
    id: `rank:${profileData.ranking.grade.cle}`,
    image: rankEmblemSource(profileData.ranking.grade.cle),
    kind: 'rank',
    name: rankLabel,
  });

  return items;
}

function roomKindForCosmetic(item: CosmeticItem): ShowcasePlaceableKind | null {
  if (item.slot === 'cadre_profil') return 'frame';
  if (item.slot === 'titre_profil') return 'title';
  if (item.slot === 'apparence_core') return 'core';
  if (item.slot === 'carte_profil') return 'banner';
  return null;
}

function physicalAssetForKind(kind: ShowcasePlaceableKind) {
  if (kind === 'frame' || kind === 'title' || kind === 'core' || kind === 'banner' || kind === 'badge') {
    return SHOWCASE_COLLECTIBLE_ASSETS[kind];
  }
  return undefined;
}

function resolveEquipped(shop: CosmeticShopData | null, fallback?: EquippedCosmetics | null) {
  if (!shop) return fallback ?? null;
  const equipped = shop.equipped;
  const hasEquipment = [
    equipped.frame,
    equipped.title,
    equipped.core,
    equipped.factionEffect,
    equipped.profileCard,
    ...Object.values(equipped.showcase),
  ].some(Boolean);
  return hasEquipment ? equipped : fallback ?? equipped;
}

function showcaseSectionFromParam(value?: string | string[]): ShowcaseSection {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === 'collection' || normalized === 'season' || normalized === 'rank' || normalized === 'trophies') {
    return normalized;
  }
  return 'showcase';
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function friendlyAtelierError(caught: unknown, fallback: string) {
  const value = caught instanceof Error ? caught.message : fallback;
  if (/solde insuffisant/i.test(value)) {
    return 'Ton solde a changé. Recharge la Vitrine avant de confirmer.';
  }
  if (/network|fetch|hors connexion|offline/i.test(value)) {
    return 'Connexion indisponible. Ton aperçu reste visible, réessaie dans un instant.';
  }
  return value || fallback;
}

const styles = StyleSheet.create({
  screen: { position: 'relative', flex: 1, minWidth: 0, backgroundColor: SHOWCASE_PALETTE.graphiteDeep },
  sceneWrap: { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' },
  floatingControls: { position: 'absolute', top: 12, right: 12, left: 12, flexDirection: 'row', justifyContent: 'space-between' },
  floatingButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(3,7,10,.64)', borderWidth: 1, borderColor: 'rgba(164,188,204,.2)' },
  loading: { position: 'absolute', top: 12, left: '50%', minHeight: 30, marginLeft: -96, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,8,11,.86)', borderWidth: 1, borderColor: '#30414E' },
  loadingText: { ...typography.label, color: colors.textMuted, letterSpacing: 0.45 },
  error: { position: 'absolute', right: 14, bottom: 78, left: 14, minHeight: 54, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(27,12,15,.94)', borderWidth: 1, borderColor: '#71323C' },
  errorCopy: { flex: 1, minWidth: 0 },
  errorEyebrow: { ...typography.eyebrow, color: '#FF8691' },
  errorText: { ...typography.caption, marginTop: 2, color: '#E7A6AC' },
  retry: { minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211015', borderWidth: 1, borderColor: '#A84A56' },
  retryText: { ...typography.action, color: '#FF9AA2' },
  pressed: { opacity: 0.7 },
});
