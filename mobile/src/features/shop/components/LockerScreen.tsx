import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { loadProfileData } from '@/src/features/profile/api';
import ShowcaseTrophyCollection from '@/src/features/profile/achievementBadges/components/ShowcaseTrophyCollection';
import {
  resolveLevelFrameCollection,
  resolveOwnedLevelFrames,
} from '@/src/features/profile/levelFrames/catalog';
import LevelFrameGallery from '@/src/features/profile/levelFrames/components/LevelFrameGallery';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import { useLevelFrameEquipment } from '@/src/features/profile/levelFrames/useLevelFrameEquipment';
import { SHOWCASE_RING_CATALOG } from '@/src/features/profile/showcaseRings/catalog';
import ShowcaseRingCollection from '@/src/features/profile/showcaseRings/components/ShowcaseRingCollection';
import {
  adaptShowcaseRingStats,
  resolveAllShowcaseRings,
} from '@/src/features/profile/showcaseRings/progression';
import type { ShowcaseRingFamily } from '@/src/features/profile/showcaseRings/types';
import { useShowcaseRingEquipment } from '@/src/features/profile/showcaseRings/useShowcaseRingEquipment';
import type { ProfileData } from '@/src/features/profile/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '../api';
import {
  claimRareAcquisitionPresentation,
  createRareAcquisitionEvent,
  type RareAcquisitionEvent,
  type RareAcquisitionOrigin,
} from '../rareAcquisition';
import { collectionScopeFromParam, type CollectionScope } from '../scope';
import type {
  CosmeticItem,
  CosmeticRarity,
  CosmeticShopData,
  EquippedCosmetic,
  EquippedCosmetics,
  IdentityCosmeticSlot,
} from '../types';
import { DEFAULT_MONETIZATION_CONTRACT, IDENTITY_COSMETIC_SLOTS } from '../types';
import { CosmeticItemPreview } from './CosmeticRenderer';
import { RareAcquisitionReveal } from './RareAcquisitionReveal';

export type LockerPreviewState = {
  acquisitionId?: string;
  forceReduceMotion?: boolean;
  origin?: RareAcquisitionOrigin;
};

export type LockerScreenProps = {
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
  previewState?: LockerPreviewState;
};

type LockerTab = IdentityCosmeticSlot | 'showcase_jersey' | 'showcase_ring' | 'showcase_trophy' | 'level_frame';

const SLOT_META: Record<IdentityCosmeticSlot, { label: string; short: string; promise: string; glyph: string }> = {
  cadre_profil: { label: 'Cadres', short: 'CADRE', promise: 'Signe ton profil sans toucher à tes performances.', glyph: '▣' },
  titre_profil: { label: 'Titres', short: 'TITRE', promise: 'Affiche une identité gagnée, jamais un avantage.', glyph: 'T' },
  apparence_core: { label: 'Core', short: 'CORE', promise: 'Change la matière du noyau visible sur ton Hub.', glyph: 'C' },
  effet_faction: { label: 'Reliques', short: 'RELIQUE', promise: 'Habille la relique sans accélérer sa progression.', glyph: '✦' },
  carte_profil: { label: 'Bannières', short: 'BANNIÈRE', promise: 'Prépare une signature visuelle à partager.', glyph: '◇' },
};

const SLOT_ORDER = [...IDENTITY_COSMETIC_SLOTS];
const RARITIES: CosmeticRarity[] = ['commun', 'rare', 'epique', 'legendaire'];
const RING_TAB_META = {
  glyph: '◎',
  label: 'Anneaux évolutifs',
  promise: 'Expose les accomplissements qui ont réellement marqué ton parcours.',
  short: 'ANNEAUX ÉVOLUTIFS',
} as const;
const TROPHY_TAB_META = {
  glyph: '♜',
  label: 'Trophées',
  promise: 'Les accomplissements qui prennent place dans les quatre emplacements de ta Vitrine.',
  short: 'TROPHÉES',
} as const;
const JERSEY_TAB_META = {
  glyph: '⌁',
  label: 'Maillots',
  promise: 'Retrouve et équipe uniquement les maillots déjà présents dans ta collection.',
  short: 'MAILLOTS',
} as const;
const LEVEL_FRAME_TAB_META = {
  glyph: '⌑',
  label: 'Niveaux',
  promise: 'Le petit cadre du niveau, distinct de ton cadre d’avatar et de ta signature.',
  short: 'CADRES DE NIVEAU',
} as const;

export default function LockerScreen({ previewData, previewProfile, previewState }: LockerScreenProps) {
  const params = useLocalSearchParams<{
    acquisitionEvent?: string | string[];
    acquisitionId?: string | string[];
    acquisitionOrigin?: string | string[];
    scope?: string | string[];
    tab?: string | string[];
  }>();
  const requestedScope = collectionScopeFromParam(params.scope);
  const requestedTab = collectionTabFromParam(params.tab);
  const focusedCollection = requestedTab !== null;
  const previewAcquisitionId = previewState?.acquisitionId;
  const previewAcquisitionOrigin = previewState?.origin;
  const { profile, session } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
  const unlimitedVolts = !previewData && profile?.volts_illimites === true;
  const { refresh: refreshCosmetics } = useCosmetics();
  const { showSnackbar } = useSnackbar();
  const pseudo = previewProfile?.pseudo || profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [slot, setSlot] = useState<LockerTab>(requestedTab ?? 'cadre_profil');
  const [scope, setScope] = useState<CollectionScope>(requestedScope);
  const [teamFilter, setTeamFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CosmeticRarity>('all');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(!previewProfile);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState<RareAcquisitionEvent | null>(null);
  const requestRef = useRef(0);
  const profileRequestRef = useRef(0);
  const cachedDataRef = useRef<CosmeticShopData | null>(previewData ?? null);
  const collectionEventRef = useRef('');
  const acquisitionEventRef = useRef('');

  const ringEquipment = useShowcaseRingEquipment(
    previewData ? `preview-${pseudo}` : pseudo,
    previewData ? 'rank' : null,
  );
  const ownedLevelFrames = useMemo(
    () => resolveOwnedLevelFrames({ founder: profileData?.founder, preview: Boolean(previewData) }),
    [previewData, profileData?.founder],
  );
  const levelFrameEquipment = useLevelFrameEquipment(
    previewData ? `preview-${pseudo}` : pseudo,
    ownedLevelFrames,
    previewData ? 'azurOrbit' : 'signalAscendant',
  );

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      cachedDataRef.current = previewData;
      setData(previewData);
      setOffline(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await loadCosmeticShop();
      if (requestId === requestRef.current) {
        cachedDataRef.current = next;
        setData(next);
        setOffline(false);
      }
    } catch (caught) {
      if (requestId === requestRef.current) {
        const detail = caught instanceof Error ? caught.message : 'Impossible de charger le Locker.';
        if (cachedDataRef.current && isOfflineError(detail)) {
          setData(cachedDataRef.current);
          setOffline(true);
        } else {
          setError(detail);
        }
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData]);

  const loadRingProfile = useCallback(async () => {
    if (previewProfile) {
      setProfileData(previewProfile);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    const requestId = ++profileRequestRef.current;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const next = await loadProfileData(pseudo);
      if (requestId === profileRequestRef.current) setProfileData(next);
    } catch (caught) {
      if (requestId === profileRequestRef.current) {
        setProfileError(caught instanceof Error ? caught.message : 'Progression des anneaux indisponible.');
      }
    } finally {
      if (requestId === profileRequestRef.current) setProfileLoading(false);
    }
  }, [previewProfile, pseudo]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    void loadRingProfile();
    return () => { profileRequestRef.current += 1; };
  }, [loadRingProfile]);

  useEffect(() => {
    setConfirmingId(null);
    setSelectedId(null);
  }, [slot]);

  useEffect(() => {
    setScope(requestedScope);
  }, [requestedScope]);

  useEffect(() => {
    if (requestedTab) setSlot(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (previewData || loading || !data) return;
    const day = new Date().toISOString().slice(0, 10);
    const eventKey = `locker:${day}`;
    if (collectionEventRef.current === eventKey) return;

    collectionEventRef.current = eventKey;
    void trackAnalyticsEvent({
      type: 'collection_affichee',
      idempotencyKey: eventKey,
    }).catch(() => {
      if (collectionEventRef.current === eventKey) collectionEventRef.current = '';
    });
  }, [data, loading, previewData]);

  const contract = data?.contract ?? DEFAULT_MONETIZATION_CONTRACT;
  const availableSlots = useMemo(
    () => SLOT_ORDER.filter((itemSlot) => contract.catalog.allowedSlots.includes(itemSlot)),
    [contract.catalog.allowedSlots],
  );
  const availableTabs = useMemo<LockerTab[]>(
    () => [...availableSlots, 'level_frame', 'showcase_ring', 'showcase_trophy', 'showcase_jersey'],
    [availableSlots],
  );
  const jerseyActive = slot === 'showcase_jersey';
  const ringActive = slot === 'showcase_ring';
  const trophyActive = slot === 'showcase_trophy';
  const levelFrameActive = slot === 'level_frame';
  const profileCollectionActive = jerseyActive || ringActive || trophyActive || levelFrameActive;
  const activeSlot = isIdentityTab(slot) && availableSlots.includes(slot)
    ? slot
    : availableSlots[0] ?? 'cadre_profil';
  const activeMeta = trophyActive
    ? TROPHY_TAB_META
    : ringActive
      ? RING_TAB_META
      : jerseyActive
        ? JERSEY_TAB_META
        : levelFrameActive
          ? LEVEL_FRAME_TAB_META
          : SLOT_META[activeSlot];
  const ringStats = useMemo(() => adaptShowcaseRingStats(profileData), [profileData]);
  const ringProgressions = useMemo(
    () => resolveAllShowcaseRings(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const unlockedRingCount = ringProgressions.filter((progress) => progress.current).length;
  const equippedRingProgress = ringProgressions.find((progress) => progress.availability === 'equipped') ?? null;
  const badgeCollection = profileData?.badges ?? [];
  const unlockedBadgeCount = badgeCollection.filter((badge) => badge.obtained).length;
  const levelFrameCollection = useMemo(
    () => resolveLevelFrameCollection(levelFrameEquipment.variant, ownedLevelFrames),
    [levelFrameEquipment.variant, ownedLevelFrames],
  );
  const focusedCollectionLoading = trophyActive
    ? profileLoading
    : ringActive
      ? profileLoading || ringEquipment.loading
      : jerseyActive
        ? loading
        : levelFrameActive
          ? profileLoading || levelFrameEquipment.loading
          : false;
  const collectionCount = (data?.items.filter((item) => item.owned).length ?? 0)
    + unlockedRingCount
    + ownedLevelFrames.length;
  const teams = useMemo(() => uniqueTeams(data?.items ?? []), [data?.items]);
  const collections = useMemo(() => uniqueCollections(data?.items ?? []), [data?.items]);
  const selectedItem = data?.items.find((item) => item.id === selectedId && (
    isIdentityCosmeticItem(item) || item.slot === 'vitrine_maillot'
  ));
  const filterCount = Number(teamFilter !== 'all') + Number(collectionFilter !== 'all') + Number(rarityFilter !== 'all');
  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter((item) => jerseyActive ? item.slot === 'vitrine_maillot' : item.slot === activeSlot)
      .filter((item) => scope === 'catalog' || item.owned)
      .filter((item) => teamFilter === 'all' || item.team?.id === teamFilter)
      .filter((item) => collectionFilter === 'all' || item.collectionKey === collectionFilter)
      .filter((item) => rarityFilter === 'all' || item.rarity === rarityFilter)
      .sort((a, b) => Number(b.equipped) - Number(a.equipped) || Number(b.owned) - Number(a.owned) || a.level - b.level);
  }, [activeSlot, collectionFilter, data?.items, jerseyActive, rarityFilter, scope, teamFilter]);

  useEffect(() => {
    if (loading || !data) return;
    const acquisitionId = previewAcquisitionId ?? readParam(params.acquisitionId);
    if (!acquisitionId) return;
    const eventKey = previewAcquisitionId
      ? `preview:${previewAcquisitionOrigin ?? 'locker'}:${acquisitionId}`
      : readParam(params.acquisitionEvent) ?? `route:${acquisitionId}`;
    if (acquisitionEventRef.current === eventKey) return;
    acquisitionEventRef.current = eventKey;

    if (!previewAcquisitionId) {
      consumeAcquisitionRouteParams();
    }

    const item = data.items.find((candidate) => candidate.id === acquisitionId);
    if (!item) return;
    const originParam = readParam(params.acquisitionOrigin);
    const origin: RareAcquisitionOrigin = previewAcquisitionOrigin
      ?? (originParam === 'hub' ? 'hub' : 'locker');
    const reveal = createRareAcquisitionEvent({ eventKey, item, origin });
    if (!reveal) return;
    if (!previewAcquisitionId && !claimRareAcquisitionPresentation(eventKey)) return;
    setSelectedId(null);
    setScope('owned');
    if (isIdentityCosmeticItem(item)) setSlot(item.slot);
    else if (item.slot === 'vitrine_maillot') setSlot('showcase_jersey');
    setAcquisition(reveal);
  }, [
    data,
    loading,
    params.acquisitionEvent,
    params.acquisitionId,
    params.acquisitionOrigin,
    previewAcquisitionId,
    previewAcquisitionOrigin,
  ]);

  async function handleRingEquip(family: ShowcaseRingFamily | null) {
    const previousFamily = ringEquipment.family;
    try {
      await ringEquipment.equip(family);
      showEquipmentResult(
        family
          ? `Anneau ${SHOWCASE_RING_CATALOG[family].name} équipé dans ta Vitrine.`
          : 'Anneau retiré de ta Vitrine.',
        previousFamily !== family ? {
          label: previousFamily ? `l’anneau ${SHOWCASE_RING_CATALOG[previousFamily].name}` : 'la Vitrine sans anneau',
          run: () => ringEquipment.equip(previousFamily),
        } : undefined,
      );
    } catch {
      showSnackbar({ message: 'L’anneau n’a pas pu être enregistré sur cet appareil.', tone: 'error' });
    }
  }

  async function handleLevelFrameEquip(variant: LevelFrameVariant) {
    const previousVariant = levelFrameEquipment.variant;
    try {
      await levelFrameEquipment.equip(variant);
      showEquipmentResult(
        `${levelFrameCollection.find((entry) => entry.variant === variant)?.name ?? 'Cadre'} équipe maintenant ton niveau.`,
        previousVariant !== variant ? {
          label: levelFrameCollection.find((entry) => entry.variant === previousVariant)?.name ?? 'le cadre précédent',
          run: () => levelFrameEquipment.equip(previousVariant),
        } : undefined,
      );
    } catch (caught) {
      showSnackbar({
        message: caught instanceof Error ? caught.message : 'Le cadre de niveau n’a pas pu être enregistré.',
        tone: 'error',
      });
      throw caught;
    }
  }

  function showEquipmentResult(
    message: string,
    undo?: { label: string; run: () => Promise<void> | void },
  ) {
    showSnackbar({
      action: undo ? {
        accessibilityLabel: `Rétablir ${undo.label}`,
        label: 'ANNULER',
        onPress: async () => {
          try {
            await undo.run();
            showSnackbar({ message: 'Configuration précédente restaurée.', tone: 'success' });
          } catch (caught) {
            showSnackbar({
              message: caught instanceof Error ? caught.message : 'La configuration précédente n’a pas pu être restaurée.',
              tone: 'error',
            });
          }
        },
      } : undefined,
      message,
      tone: 'success',
    });
  }

  function clearFilters() {
    setTeamFilter('all');
    setCollectionFilter('all');
    setRarityFilter('all');
  }

  function openItem(item: CosmeticItem) {
    setSelectedId(item.id);
    if (previewData) return;
    void trackAnalyticsEvent({
      type: 'objet_consulte',
      itemId: item.id,
      campaignKey: item.campaignKey,
    }).catch(() => undefined);
  }

  async function handleItem(item: CosmeticItem) {
    if (!data || pendingId) return;

    const fallback = item.equipped && !item.included
      ? data.items.find((candidate) => candidate.slot === item.slot && candidate.included && candidate.owned)
      : null;
    if (item.equipped && !fallback) return;

    if (!item.owned) {
      if (!item.acquirable) {
        setConfirmingId(null);
        showSnackbar({ message: acquisitionMessage(item), tone: 'info' });
        return;
      }
      if (data.balance < item.price) {
        showSnackbar({
          message: `Il te manque ${formatNumber(item.price - data.balance)} Volts pour ${item.name}.`,
          tone: 'error',
        });
        return;
      }
      if (confirmingId !== item.id) {
        setConfirmingId(item.id);
        showSnackbar({ message: 'Confirme une seconde fois : les Volts seront débités immédiatement.', tone: 'info' });
        return;
      }
    }

    const target = fallback ?? item;
    const purchasing = !item.owned;
    const previousData = data;
    const previousItem = data.items.find((candidate) => candidate.slot === item.slot && candidate.equipped) ?? null;
    setPendingId(item.id);
    setConfirmingId(null);
    setError(null);

    try {
      if (previewData) {
        const next = applyPreviewAction(data, item, target);
        cachedDataRef.current = next;
        setData(next);
        const acquiredItem = next.items.find((candidate) => candidate.id === item.id) ?? item;
        const reveal = purchasing ? createRareAcquisitionEvent({
          eventKey: `purchase:locker:${item.id}:${Date.now()}`,
          item: acquiredItem,
          origin: 'locker',
        }) : null;
        if (reveal) {
          setSelectedId(null);
          setAcquisition(reveal);
        } else {
          showEquipmentResult(
            fallback ? `${item.name} a été retiré.` : `${item.name} est maintenant équipé.`,
            item.owned && previousItem && previousItem.id !== target.id ? {
              label: previousItem.name,
              run: () => undoIdentityEquip(previousData, next, previousItem),
            } : undefined,
          );
        }
      } else {
        if (!item.owned) {
          void trackAnalyticsEvent({
            type: 'achat_commence',
            idempotencyKey: `cosmetic-purchase:${item.id}`,
          }).catch(() => undefined);
        }
        const mutation = !item.owned
          ? await purchaseCosmetic(item.id)
          : await equipCosmetic(target.id);
        const [next] = await Promise.all([
          loadCosmeticShop(),
          refreshEconomy(),
          refreshCosmetics(),
        ]);
        cachedDataRef.current = next;
        setData(next);
        setOffline(false);
        const acquiredItem = next.items.find((candidate) => candidate.id === item.id) ?? item;
        const reveal = mutation.purchased ? createRareAcquisitionEvent({
          eventKey: `purchase:locker:${mutation.itemId}:${Date.now()}`,
          item: acquiredItem,
          origin: 'locker',
        }) : null;
        if (reveal) {
          setSelectedId(null);
          setAcquisition(reveal);
        } else {
          showEquipmentResult(
            fallback
              ? `${item.name} a été retiré.`
              : mutation.purchased
                ? `${item.name} rejoint ta collection.`
                : `${item.name} est maintenant équipé.`,
            !mutation.purchased && previousItem && previousItem.id !== target.id ? {
              label: previousItem.name,
              run: () => undoIdentityEquip(previousData, next, previousItem),
            } : undefined,
          );
        }
      }
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Cette action n’a pas pu être réalisée.';
      setOffline(isOfflineError(detail));
      setError(detail);
    } finally {
      setPendingId(null);
    }
  }

  async function undoIdentityEquip(
    previousData: CosmeticShopData,
    fallbackData: CosmeticShopData,
    previousItem: CosmeticItem,
  ) {
    const requestId = ++requestRef.current;
    setPendingId(previousItem.id);
    setError(null);
    cachedDataRef.current = previousData;
    setData(previousData);

    try {
      if (previewData) return;
      await equipCosmetic(previousItem.id);
      const [shopResult] = await Promise.allSettled([
        loadCosmeticShop(),
        refreshEconomy(),
        refreshCosmetics(),
      ]);
      if (requestId !== requestRef.current) return;
      const restored = shopResult.status === 'fulfilled' ? shopResult.value : previousData;
      cachedDataRef.current = restored;
      setData(restored);
      setOffline(false);
    } catch (caught) {
      if (requestId === requestRef.current) {
        cachedDataRef.current = fallbackData;
        setData(fallbackData);
      }
      throw caught;
    } finally {
      if (requestId === requestRef.current) setPendingId(null);
    }
  }

  function continueAfterAcquisition() {
    setAcquisition(null);
    router.replace((previewData ? '/shop-preview' : '/shop') as never);
  }

  function viewAcquisitionInShowcase() {
    setAcquisition(null);
    router.push((previewData ? '/showcase-preview' : '/showcase') as never);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); void loadRingProfile(); }} tintColor={colors.volt} />}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir au profil" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← MOI</Text>
          </Pressable>
          <View style={styles.headerIdentity}>
            <Text style={styles.headerEyebrow}>COLLECTION D’IDENTITÉ</Text>
            <Text style={styles.headerTitle}>{focusedCollection ? activeMeta.label.toUpperCase() : 'LOCKER'}</Text>
          </View>
          <View accessible accessibilityLabel={unlimitedVolts ? 'Volts illimités' : `${formatNumber(data?.balance ?? 0)} Volts`} style={styles.balancePill}>
            <CurrencyIcon color="#080A0C" kind="volts" size={15} />
            <Text style={styles.balanceValue}>{loading ? '—' : unlimitedVolts ? '∞' : formatNumber(data?.balance ?? 0)}</Text>
          </View>
        </View>

        {offline && !focusedCollection ? (
          <View style={styles.offlineBanner}><View style={styles.offlineDot} /><Text style={styles.offlineText}>HORS CONNEXION · DERNIÈRE COLLECTION CONNUE</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View>
        ) : null}

        {!profileCollectionActive ? (
          <View style={styles.scopeTabs}>
            <ScopeButton active={scope === 'owned'} label="MES OBJETS" meta={`${collectionCount - unlockedRingCount}`} onPress={() => setScope('owned')} />
            <ScopeButton active={scope === 'catalog'} label="CATALOGUE" meta={`${data?.items.length ?? 0}`} onPress={() => setScope('catalog')} />
          </View>
        ) : null}

        {!focusedCollection ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {availableTabs.map((itemTab) => {
              const isJersey = itemTab === 'showcase_jersey';
              const isRing = itemTab === 'showcase_ring';
              const isTrophy = itemTab === 'showcase_trophy';
              const isLevelFrame = itemTab === 'level_frame';
              const active = isTrophy ? trophyActive : isRing ? ringActive : isJersey ? jerseyActive : isLevelFrame ? levelFrameActive : itemTab === activeSlot && !profileCollectionActive;
              const meta = isTrophy ? TROPHY_TAB_META : isRing ? RING_TAB_META : isJersey ? JERSEY_TAB_META : isLevelFrame ? LEVEL_FRAME_TAB_META : SLOT_META[itemTab];
              const currentName = isTrophy
                ? `${Math.min(unlockedBadgeCount, 4)}/4 révélés`
                : isRing
                ? equippedRingProgress?.display.name ?? 'À équiper'
                : isJersey
                ? data?.items.find((item) => item.slot === 'vitrine_maillot' && item.equipped)?.name ?? 'À équiper'
                : isLevelFrame
                ? levelFrameCollection.find((entry) => entry.equipped)?.name ?? 'Signal Ascendant'
                : data?.items.find((item) => item.slot === itemTab && item.equipped)?.name ?? 'À équiper';
              return (
                <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={itemTab} onPress={() => setSlot(itemTab)} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}>
                  <Text style={[styles.tabGlyph, active && styles.tabGlyphActive]}>{meta.glyph}</Text>
                  <View style={styles.tabCopy}><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{meta.label}</Text><Text numberOfLines={1} style={styles.tabEquipped}>{currentName}</Text></View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.sectionHead}>
          <View style={styles.sectionMark}><Text style={styles.sectionMarkText}>{activeMeta.glyph}</Text></View>
          <View style={styles.sectionCopy}><Text style={styles.sectionEyebrow}>{profileCollectionActive ? 'COLLECTION' : scope === 'owned' ? 'COLLECTION' : 'CATALOGUE'}{' // '}{activeMeta.short}</Text><Text style={styles.sectionTitle}>{activeMeta.label}</Text><Text style={styles.sectionPromise}>{activeMeta.promise}</Text></View>
          {!profileCollectionActive ? (
            <Pressable accessibilityLabel="Afficher les filtres" accessibilityRole="button" accessibilityState={{ expanded: filtersVisible }} onPress={() => setFiltersVisible((visible) => !visible)} style={({ pressed }) => [styles.filterToggle, filtersVisible && styles.filterToggleActive, pressed && styles.pressed]}>
              <Text style={[styles.filterToggleText, filtersVisible && styles.filterToggleTextActive]}>FILTRES{filterCount ? ` · ${filterCount}` : ''}</Text>
            </Pressable>
          ) : null}
        </View>

        {filtersVisible && !profileCollectionActive ? (
          <View style={styles.filters}>
            <FilterRow label="ÉQUIPE" options={[{ id: 'all', label: 'TOUTES' }, ...teams]} selected={teamFilter} onSelect={setTeamFilter} />
            <FilterRow label="COLLECTION" options={[{ id: 'all', label: 'TOUTES' }, ...collections]} selected={collectionFilter} onSelect={setCollectionFilter} />
            <FilterRow label="RARETÉ" options={[{ id: 'all', label: 'TOUTES' }, ...RARITIES.map((rarity) => ({ id: rarity, label: rarityLabel(rarity) }))]} selected={rarityFilter} onSelect={(value) => setRarityFilter(value as 'all' | CosmeticRarity)} />
            {filterCount ? <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearFilters}><Text style={styles.clearFiltersText}>EFFACER LES FILTRES</Text></Pressable> : null}
          </View>
        ) : null}

        {error && (!profileCollectionActive || jerseyActive) ? <View style={styles.error}><Text style={styles.errorText}>{friendlyError(error)}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {profileError && profileCollectionActive && !jerseyActive ? <View style={styles.error}><Text style={styles.errorText}>Les données d’accomplissement ne sont pas synchronisées. Les objets déjà connus restent visibles.</Text><Pressable accessibilityRole="button" onPress={() => void loadRingProfile()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {profileCollectionActive && focusedCollectionLoading ? (
          <LockerContentSkeleton label={jerseyActive ? 'Chargement de tes maillots' : 'Chargement de tes accomplissements'} />
        ) : trophyActive ? (
          <ShowcaseTrophyCollection badges={badgeCollection} />
        ) : ringActive ? (
          <ShowcaseRingCollection
            onEquip={handleRingEquip}
            progressions={ringProgressions}
            stats={ringStats}
          />
        ) : levelFrameActive ? (
          <LevelFrameGallery
            entries={levelFrameCollection}
            level={profileData?.level.level ?? 1}
            mode="locker"
            onEquip={handleLevelFrameEquip}
          />
        ) : loading ? (
          <LockerContentSkeleton label="Chargement du Locker" />
        ) : visibleItems.length ? (
          <View style={styles.grid}>
            {visibleItems.map((item) => <ItemCard balance={data?.balance ?? 0} confirming={confirmingId === item.id} item={item} key={item.id} pending={pendingId === item.id} pseudo={pseudo} onAction={() => void handleItem(item)} onOpen={() => openItem(item)} />)}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>{scope === 'owned' ? '◇' : '⌁'}</Text>
            <Text style={styles.emptyTitle}>{scope === 'owned' ? 'AUCUN OBJET ICI POUR LE MOMENT.' : 'AUCUN OBJET NE CORRESPOND.'}</Text>
            <Text style={styles.emptyText}>{scope === 'owned' ? 'Passe au catalogue pour découvrir les signatures disponibles.' : 'Modifie tes filtres pour retrouver le reste de la collection.'}</Text>
            <Pressable accessibilityRole="button" onPress={() => scope === 'owned' ? setScope('catalog') : clearFilters()} style={styles.emptyAction}><Text style={styles.emptyActionText}>{scope === 'owned' ? 'VOIR LE CATALOGUE' : 'RÉINITIALISER'}</Text></Pressable>
          </View>
        )}

        {!focusedCollection ? (
          <View style={styles.rules}>
            <View style={styles.rulesHeader}><View style={styles.rulesIcon}><CurrencyIcon kind="volts" size={20} /></View><View style={styles.rulesCopy}><Text style={styles.rulesEyebrow}>CONTRAT {contract.version}{' // '}{contract.code.toUpperCase()}</Text><Text style={styles.rulesTitle}>LE PACTE GRIFF</Text><Text style={styles.rulesText}>Tes objets restent permanents et ne modifient jamais tes performances.</Text></View></View>
            <View style={styles.ruleList}>{contract.rules.map((rule) => <View key={rule.id} style={styles.ruleRow}><Text style={styles.ruleCheck}>✓</Text><View style={styles.ruleCopy}><Text style={styles.ruleLabel}>{rule.label}</Text><Text style={styles.ruleDetail}>{rule.detail}</Text></View></View>)}</View>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSelectedId(null)} transparent visible={Boolean(selectedItem)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Fermer le détail" accessibilityRole="button" onPress={() => setSelectedId(null)} style={StyleSheet.absoluteFill} />
          {selectedItem ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTop}><View><Text style={styles.sheetEyebrow}>FICHE OBJET // {slotShortLabel(selectedItem.slot)}</Text><Text style={styles.sheetTitle}>{selectedItem.name}</Text></View><Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.sheetClose}><Text style={styles.sheetCloseText}>×</Text></Pressable></View>
              <CosmeticItemPreview item={selectedItem} pseudo={pseudo} />
              <View style={styles.sheetTags}><Tag label={rarityLabel(selectedItem.rarity)} color={rarityColor(selectedItem.rarity, selectedItem.accent)} /><Tag label={selectedItem.owned ? 'POSSÉDÉ' : sourceLabel(selectedItem.source)} color={selectedItem.owned ? colors.volt : '#AAB4BE'} />{selectedItem.equipped ? <Tag label="ÉQUIPÉ" color={selectedItem.accent} /> : null}</View>
              <Text style={styles.sheetDescription}>{selectedItem.description}</Text>
              <View style={styles.provenance}><DetailRow label="COLLECTION" value={humanize(selectedItem.collectionKey)} /><DetailRow label="ÉQUIPE" value={selectedItem.team ? `${selectedItem.team.name} · ${selectedItem.team.tag}` : 'Collection GRIFF'} /><DetailRow label="PROVENANCE" value={sourceDetail(selectedItem)} /><DetailRow label="LICENCE" value={`${humanize(selectedItem.license.type)} · ${selectedItem.license.holder}`} /><DetailRow label="DISPONIBILITÉ" value={availabilityLabel(selectedItem)} /></View>
              <ActionButton balance={data?.balance ?? 0} confirming={confirmingId === selectedItem.id} item={selectedItem} pending={pendingId === selectedItem.id} onPress={() => void handleItem(selectedItem)} />
            </View>
          ) : null}
        </View>
      </Modal>

      <RareAcquisitionReveal
        event={acquisition}
        forceReduceMotion={previewState?.forceReduceMotion}
        onContinueAtelier={continueAfterAcquisition}
        onViewShowcase={viewAcquisitionInShowcase}
      />
    </Screen>
  );
}

function isIdentityCosmeticItem(item: CosmeticItem): item is CosmeticItem & { slot: IdentityCosmeticSlot } {
  return IDENTITY_COSMETIC_SLOTS.includes(item.slot as IdentityCosmeticSlot);
}

function ScopeButton({ active, label, meta, onPress }: { active: boolean; label: string; meta: string; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.scopeButton, active && styles.scopeButtonActive, pressed && styles.pressed]}><Text style={[styles.scopeLabel, active && styles.scopeLabelActive]}>{label}</Text><Text style={[styles.scopeMeta, active && styles.scopeMetaActive]}>{meta}</Text></Pressable>;
}

function FilterRow({ label, onSelect, options, selected }: { label: string; onSelect: (value: string) => void; options: { id: string; label: string }[]; selected: string }) {
  return <View style={styles.filterRow}><Text style={styles.filterLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>{options.map((option) => <Pressable accessibilityRole="button" accessibilityState={{ selected: option.id === selected }} key={option.id} onPress={() => onSelect(option.id)} style={({ pressed }) => [styles.filterChip, option.id === selected && styles.filterChipActive, pressed && styles.pressed]}><Text style={[styles.filterChipText, option.id === selected && styles.filterChipTextActive]}>{option.label}</Text></Pressable>)}</ScrollView></View>;
}

function ItemCard({ balance, confirming, item, onAction, onOpen, pending, pseudo }: { balance: number; confirming: boolean; item: CosmeticItem; onAction: () => void; onOpen: () => void; pending: boolean; pseudo: string }) {
  return (
    <View style={[styles.itemCard, item.equipped && { borderColor: `${item.accent}8A` }]}>
      <Pressable accessibilityLabel={`Voir le détail de ${item.name}`} accessibilityRole="button" onPress={onOpen} style={({ pressed }) => pressed && styles.pressed}>
        <CosmeticItemPreview item={item} pseudo={pseudo} />
        <View style={styles.itemTopline}><Text style={[styles.rarity, { color: rarityColor(item.rarity, item.accent) }]}>{rarityLabel(item.rarity)}</Text><Text style={styles.itemLevel}>NIV. {item.level}</Text></View>
        <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text><Text numberOfLines={2} style={styles.itemDescription}>{item.description}</Text><Text numberOfLines={1} style={styles.itemProvenance}>{provenanceLabel(item)}</Text>
      </Pressable>
      <View style={styles.itemPrice}>{item.price ? <CurrencyIcon kind="volts" size={14} /> : <Text style={styles.includedDot}>●</Text>}<Text style={styles.itemPriceText}>{item.price ? formatNumber(item.price) : item.included ? 'INCLUS' : sourceLabel(item.source)}</Text></View>
      <ActionButton balance={balance} confirming={confirming} item={item} pending={pending} onPress={onAction} />
    </View>
  );
}

function LockerContentSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={styles.grid} testID="locker-content-loading">
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.itemSkeleton}>
          <Skeleton height={154} radius="md" tone="highlight" width="100%" />
          <View style={styles.itemSkeletonTopline}>
            <Skeleton height={8} radius="pill" width="42%" />
            <Skeleton height={8} radius="pill" tone="subtle" width={34} />
          </View>
          <Skeleton height={34} radius="sm" width="82%" />
          <Skeleton height={22} radius="sm" tone="subtle" width="100%" />
          <Skeleton height={8} radius="pill" tone="subtle" width="64%" />
          <Skeleton height={22} radius="sm" width={72} />
          <Skeleton height={44} radius="md" style={styles.itemSkeletonAction} width="100%" />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function ActionButton({ balance, confirming, item, onPress, pending }: { balance: number; confirming: boolean; item: CosmeticItem; onPress: () => void; pending: boolean }) {
  const missing = Math.max(0, item.price - balance);
  const locked = !item.owned && !item.acquirable;
  const removable = item.equipped && !item.included;
  const disabled = pending || locked || (item.equipped && !removable);
  const action = itemAction(item, pending, confirming, missing);
  return <Pressable accessibilityLabel={`${action}, ${item.name}`} accessibilityRole="button" accessibilityState={{ disabled, selected: item.equipped }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.itemAction, item.equipped && styles.itemActionEquipped, confirming && styles.itemActionConfirm, (missing > 0 && !item.owned) && styles.itemActionMissing, locked && styles.itemActionMissing, pressed && styles.pressed]}>{pending ? <ActivityIndicator color="#080A0C" size="small" /> : <Text style={[styles.itemActionText, removable && styles.itemActionTextRemove, (disabled || (missing > 0 && !item.owned)) && styles.itemActionTextMuted]}>{action}</Text>}</Pressable>;
}

function Tag({ color, label }: { color: string; label: string }) { return <View style={[styles.sheetTag, { borderColor: `${color}72`, backgroundColor: `${color}12` }]}><Text style={[styles.sheetTagText, { color }]}>{label}</Text></View>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

function applyPreviewAction(data: CosmeticShopData, selected: CosmeticItem, target: CosmeticItem): CosmeticShopData {
  if (!selected.owned && !selected.acquirable) return data;
  const purchasedNow = !selected.owned;
  const items = data.items.map((item) => item.slot === target.slot ? { ...item, owned: item.owned || item.id === selected.id, equipped: item.id === target.id } : item);
  return { ...data, balance: Math.max(0, data.balance - (purchasedNow ? selected.price : 0)), items, equipped: equippedFromItems(items, data.equipped) };
}

function equippedFromItems(items: CosmeticItem[], fallback: EquippedCosmetics): EquippedCosmetics { return { frame: asEquipped(items.find((item) => item.slot === 'cadre_profil' && item.equipped)) ?? fallback.frame, title: asEquipped(items.find((item) => item.slot === 'titre_profil' && item.equipped)) ?? fallback.title, core: asEquipped(items.find((item) => item.slot === 'apparence_core' && item.equipped)) ?? fallback.core, factionEffect: asEquipped(items.find((item) => item.slot === 'effet_faction' && item.equipped)) ?? fallback.factionEffect, profileCard: asEquipped(items.find((item) => item.slot === 'carte_profil' && item.equipped)) ?? fallback.profileCard, showcase: fallback.showcase }; }
function asEquipped(item?: CosmeticItem): EquippedCosmetic | null { if (!item) return null; const { id, slot, level, name, description, rarity, styleKey, accent } = item; return { id, slot, level, name, description, rarity, styleKey, accent }; }
function uniqueTeams(items: CosmeticItem[]) { const teams = new Map<string, string>(); items.forEach((item) => { if (item.team) teams.set(item.team.id, item.team.tag || item.team.name); }); return Array.from(teams, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr')); }
function uniqueCollections(items: CosmeticItem[]) { return Array.from(new Set(items.map((item) => item.collectionKey))).sort().map((id) => ({ id, label: humanize(id) })); }
function itemAction(item: CosmeticItem, pending: boolean, confirming: boolean, missing: number) { if (pending) return 'SYNCHRONISATION…'; if (item.equipped) return item.included ? 'ÉQUIPÉ' : 'RETIRER'; if (item.owned) return 'ÉQUIPER'; if (!item.acquirable) return acquisitionAction(item); if (missing) return `MANQUE ${formatNumber(missing)} V`; return confirming ? `CONFIRMER · ${formatNumber(item.price)} V` : `DÉBLOQUER · ${formatNumber(item.price)} V`; }
function rarityColor(rarity: CosmeticRarity, accent: string) { return rarity === 'commun' ? '#87929E' : accent; }
function rarityLabel(rarity: CosmeticRarity) { if (rarity === 'legendaire') return 'LÉGENDAIRE'; if (rarity === 'epique') return 'ÉPIQUE'; if (rarity === 'rare') return 'RARE'; return 'COMMUN'; }
function sourceLabel(source: CosmeticItem['source']) { if (source === 'mission') return 'MISSION'; if (source === 'partenaire') return 'PARTENAIRE'; if (source === 'founder_pack') return 'FOUNDER PACK'; if (source === 'gratuit') return 'OFFERT'; return 'VOLTS'; }
function acquisitionAction(item: CosmeticItem) { return item.available ? sourceLabel(item.source) : 'INDISPONIBLE'; }
function acquisitionMessage(item: CosmeticItem) { if (!item.available) return `${item.name} n’est plus disponible à l’acquisition, mais reste permanent pour ses propriétaires.`; if (item.source === 'mission') return `${item.name} se débloque en accomplissant sa mission.`; if (item.source === 'partenaire') return `${item.name} se débloque via son activation partenaire.`; if (item.source === 'founder_pack') return `${item.name} est réservé au Founder Pack.`; return `${item.name} ne peut pas être débloqué depuis le Locker.`; }
function provenanceLabel(item: CosmeticItem) { const identity = item.team?.tag || item.brandKey || humanize(item.collectionKey); return `${identity.toUpperCase()} · ${sourceLabel(item.source)}`; }
function sourceDetail(item: CosmeticItem) { return [sourceLabel(item.source), item.campaignKey ? humanize(item.campaignKey) : null, item.brandKey ? humanize(item.brandKey) : null].filter(Boolean).join(' · '); }
function availabilityLabel(item: CosmeticItem) { if (!item.available && item.owned) return 'Retiré · conservé dans ta collection'; if (!item.available) return 'Indisponible'; if (item.availableUntil) return `Disponible jusqu’au ${new Date(item.availableUntil).toLocaleDateString('fr-FR')}`; return 'Disponible sans expiration'; }
function humanize(value: string) { return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function friendlyError(value: string) { if (value.toLowerCase().includes('solde insuffisant')) return 'Ton solde a changé. Recharge le Locker avant de confirmer.'; if (isOfflineError(value)) return 'Connexion indisponible. Tes objets équipés restent visibles sur cet appareil.'; return value; }
function isOfflineError(value: string) { return /network|fetch|connexion|offline|hors ligne/i.test(value); }
function collectionTabFromParam(value?: string | string[]): 'showcase_jersey' | 'showcase_ring' | 'showcase_trophy' | 'level_frame' | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === 'jerseys' || normalized === 'maillots') return 'showcase_jersey';
  if (normalized === 'rings' || normalized === 'anneaux' || normalized === 'badges-rings' || normalized === 'badges-anneaux') return 'showcase_ring';
  if (normalized === 'trophies' || normalized === 'trophees') return 'showcase_trophy';
  if (normalized === 'badges' || normalized === 'accomplissements') return 'showcase_ring';
  if (normalized === 'levelFrames' || normalized === 'level-frames' || normalized === 'niveaux') return 'level_frame';
  return null;
}

function slotShortLabel(slot: CosmeticItem['slot']) {
  return slot === 'vitrine_maillot'
    ? JERSEY_TAB_META.short
    : SLOT_META[slot as IdentityCosmeticSlot]?.short ?? 'OBJET';
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function consumeAcquisitionRouteParams() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('acquisitionEvent');
    url.searchParams.delete('acquisitionId');
    url.searchParams.delete('acquisitionOrigin');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return;
  }
  router.setParams({
    acquisitionEvent: '',
    acquisitionId: '',
    acquisitionOrigin: '',
  });
}

function isIdentityTab(value: LockerTab): value is IdentityCosmeticSlot {
  return IDENTITY_COSMETIC_SLOTS.includes(value as IdentityCosmeticSlot);
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 42, gap: 20 },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#30414E' }, back: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, backText: { ...typography.action, color: colors.text, letterSpacing: .4 }, headerIdentity: { flex: 1, minWidth: 0 }, headerEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 }, headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 25, letterSpacing: -.3 }, balancePill: { minHeight: 43, minWidth: 88, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: colors.volt }, balanceValue: { ...typography.bodyStrong, color: '#080A0C', fontVariant: ['tabular-nums'] },
  offlineBanner: { minHeight: 48, marginHorizontal: spacing.md, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 15, backgroundColor: '#17140C', borderWidth: 1, borderColor: '#4A4020' }, offlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFCB45' }, offlineText: { ...typography.label, flex: 1, color: '#D9C57D', letterSpacing: .35 },
  scopeTabs: { minHeight: 59, marginHorizontal: spacing.md, padding: 5, flexDirection: 'row', gap: 5, borderRadius: 19, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' }, scopeButton: { flex: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14 }, scopeButtonActive: { backgroundColor: '#18200F', borderWidth: 1, borderColor: '#4E5C21' }, scopeLabel: { ...typography.action, color: '#697580' }, scopeLabelActive: { color: colors.text }, scopeMeta: { ...typography.label, color: '#697580' }, scopeMetaActive: { color: colors.volt },
  tabs: { gap: 9, paddingHorizontal: spacing.md }, tab: { width: 143, minHeight: 68, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 19, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, tabActive: { backgroundColor: '#141B0F', borderColor: '#596725' }, tabGlyph: { width: 29, color: '#65717D', fontFamily: fonts.display, fontSize: 22, textAlign: 'center' }, tabGlyphActive: { color: colors.volt }, tabCopy: { flex: 1, minWidth: 0 }, tabLabel: { ...typography.bodyStrong, color: colors.textMuted }, tabLabelActive: { color: colors.text }, tabEquipped: { ...typography.caption, marginTop: 2, color: '#64707B' },
  sectionHead: { minHeight: 86, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }, sectionMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, sectionMarkText: { color: '#080A0C', fontFamily: fonts.display, fontSize: 26 }, sectionCopy: { flex: 1, minWidth: 0 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, sectionTitle: { ...typography.sectionTitle, marginTop: 2, color: colors.text }, sectionPromise: { ...typography.caption, marginTop: 3, color: colors.textMuted }, filterToggle: { minHeight: 39, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, filterToggleActive: { backgroundColor: '#19210F', borderColor: '#526022' }, filterToggleText: { ...typography.label, color: colors.textMuted, fontSize: 9 }, filterToggleTextActive: { color: colors.volt },
  filters: { marginHorizontal: spacing.md, padding: 14, gap: 13, borderRadius: 22, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, filterRow: { gap: 7 }, filterLabel: { ...typography.eyebrow, color: '#77838E', letterSpacing: .6 }, filterOptions: { gap: 7 }, filterChip: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, filterChipActive: { backgroundColor: '#1A220F', borderColor: '#566424' }, filterChipText: { ...typography.label, color: colors.textMuted }, filterChipTextActive: { color: colors.volt }, clearFilters: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#30414E' }, clearFiltersText: { ...typography.action, color: colors.textMuted },
  error: { marginHorizontal: spacing.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, flex: 1, color: '#FF9AA2' }, retry: { ...typography.action, color: colors.volt },
  grid: { paddingHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, itemCard: { width: '48%', minHeight: 382, padding: 12, borderRadius: 24, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, itemTopline: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, rarity: { ...typography.eyebrow, letterSpacing: .5 }, itemLevel: { ...typography.label, color: colors.textMuted, fontSize: 9 }, itemName: { ...typography.cardTitle, minHeight: 40, marginTop: 5, color: colors.text }, itemDescription: { ...typography.caption, minHeight: 31, marginTop: 4, color: colors.textMuted }, itemProvenance: { ...typography.eyebrow, minHeight: 15, marginTop: 5, color: '#71808C', fontSize: 8, letterSpacing: .45 }, itemPrice: { minHeight: 29, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, includedDot: { color: colors.volt, fontSize: 9 }, itemPriceText: { ...typography.bodyStrong, color: colors.text }, itemAction: { minHeight: 44, marginTop: 'auto', paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, itemActionEquipped: { backgroundColor: '#17200E', borderWidth: 1, borderColor: '#546225' }, itemActionConfirm: { backgroundColor: '#FFCB45' }, itemActionMissing: { backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, itemActionText: { ...typography.action, color: '#080A0C', textAlign: 'center' }, itemActionTextRemove: { color: colors.volt }, itemActionTextMuted: { color: colors.textMuted },
  itemSkeleton: { width: '48%', minHeight: 382, padding: 12, gap: 9, borderRadius: 24, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  itemSkeletonTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemSkeletonAction: { marginTop: 'auto' },
  empty: { minHeight: 240, marginHorizontal: spacing.md, padding: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, emptyGlyph: { color: colors.volt, fontFamily: fonts.display, fontSize: 38 }, emptyTitle: { ...typography.displaySmall, maxWidth: 310, marginTop: 9, color: colors.text, textAlign: 'center' }, emptyText: { ...typography.body, maxWidth: 310, marginTop: 7, color: colors.textMuted, textAlign: 'center' }, emptyAction: { minHeight: 44, marginTop: 17, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, emptyActionText: { ...typography.action, color: '#080A0C' },
  rules: { marginHorizontal: spacing.md, padding: 16, gap: 14, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, rulesHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 }, rulesIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, rulesCopy: { flex: 1, minWidth: 0 }, rulesEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 }, rulesTitle: { ...typography.bodyStrong, color: colors.text }, rulesText: { ...typography.caption, marginTop: 4, color: colors.textMuted }, ruleList: { borderTopWidth: 1, borderTopColor: '#30414E' }, ruleRow: { minHeight: 67, paddingVertical: 11, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#30414E' }, ruleCheck: { width: 20, color: colors.volt, fontFamily: fonts.bold, fontSize: 15 }, ruleCopy: { flex: 1, minWidth: 0 }, ruleLabel: { ...typography.label, color: colors.text, letterSpacing: .35 }, ruleDetail: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,5,7,.76)' }, sheet: { width: '100%', maxWidth: layout.contentMaxWidth, maxHeight: '92%', alignSelf: 'center', padding: 18, paddingBottom: 28, gap: 13, borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, sheetHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#414C55' }, sheetTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, sheetEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, sheetTitle: { ...typography.sectionTitle, marginTop: 3, color: colors.text }, sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, sheetCloseText: { color: colors.text, fontSize: 24, lineHeight: 25 }, sheetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, sheetTag: { minHeight: 27, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 }, sheetTagText: { ...typography.label, letterSpacing: .35 }, sheetDescription: { ...typography.body, color: colors.textMuted }, provenance: { overflow: 'hidden', borderRadius: 17, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' }, detailRow: { minHeight: 39, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#30414E' }, detailLabel: { ...typography.label, color: '#68747F', letterSpacing: .35 }, detailValue: { ...typography.caption, flex: 1, color: colors.text, textAlign: 'right' }, pressed: { opacity: .76 },
});
