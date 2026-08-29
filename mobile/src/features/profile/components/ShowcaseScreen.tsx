import { router, useFocusEffect } from 'expo-router';
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
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '@/src/features/ranking/grades';
import { loadCosmeticShop } from '@/src/features/shop/api';
import { resolveAtelierSceneConfig } from '@/src/features/shop/atelierState';
import type { CosmeticShopData, EquippedCosmetics } from '@/src/features/shop/types';
import { resolveEquippedAchievementBadges } from '@/src/features/profile/achievementBadges/equipment';
import { useAchievementBadgeEquipment } from '@/src/features/profile/achievementBadges/useAchievementBadgeEquipment';
import ShowcaseRingDetailSheet from '@/src/features/profile/showcaseRings/components/ShowcaseRingDetailSheet';
import {
  adaptShowcaseRingStats,
  resolveAllShowcaseRings,
  resolveEquippedShowcaseRing,
} from '@/src/features/profile/showcaseRings/progression';
import type { ShowcaseRingFamily } from '@/src/features/profile/showcaseRings/types';
import { useShowcaseRingEquipment } from '@/src/features/profile/showcaseRings/useShowcaseRingEquipment';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, typography } from '@/src/theme';

import { loadProfileData } from '../api';
import type { ProfileData } from '../types';
import ShowcaseCustomizationBar from './showcase/ShowcaseCustomizationBar';
import ShowcaseRoomScene from './showcase/ShowcaseRoomScene';
import ShowcaseTopNavigation from './showcase/ShowcaseTopNavigation';
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

export default function ShowcaseScreen({
  atmosphereQualityOverride,
  onAtmospherePerformanceReport,
  previewProfile,
  previewShop,
  reduceMotionOverride,
}: ShowcaseScreenProps) {
  const { profile, session } = useAuth();
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [shopData, setShopData] = useState<CosmeticShopData | null>(previewShop ?? null);
  const [loading, setLoading] = useState(!previewProfile || !previewShop);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<ShowcaseSection>('showcase');
  const [pedestal, setPedestal] = useState<ShowcasePedestalSkin>('obsidian');
  const [theme, setTheme] = useState<ShowcaseRoomTheme>('graphite');
  const [lighting, setLighting] = useState<ShowcaseLighting>('cyan');
  const [jerseyPresentation, setJerseyPresentation] = useState<ShowcaseJerseyPresentation>('locker');
  const [selectedRingFamily, setSelectedRingFamily] = useState<ShowcaseRingFamily | null>(null);
  const [routeFocused, setRouteFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const requestRef = useRef(0);
  const trackedRef = useRef(false);
  const savedAtelierAppliedRef = useRef(false);
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

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
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
    if (!shopData || savedAtelierAppliedRef.current) return;
    const saved = resolveAtelierSceneConfig(shopData.equipped);
    savedAtelierAppliedRef.current = true;
    setTheme(saved.theme);
    setLighting(saved.lighting);
    setPedestal(saved.pedestal);
    setJerseyPresentation(saved.jerseyPresentation);
  }, [shopData]);

  const ownedItems = useMemo(
    () => shopData?.items.filter((item) => item.owned) ?? [],
    [shopData?.items],
  );
  const cosmetics = resolveEquipped(shopData, profileData?.cosmetics);
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

  return (
    <Screen>
      <View style={styles.screen}>
        <ShowcaseTopNavigation
          active={section}
          loading={loading}
          objectCount={ownedItems.length + ringProgressions.filter((progress) => progress.current).length + (profileData?.badges.filter((badge) => badge.obtained).length ?? 0)}
          onBack={() => router.back()}
          onRefresh={() => void load(true)}
          onSelect={setSection}
          refreshing={refreshing}
        />

        <View style={styles.sceneWrap}>
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
            rankLabel={rankLabel}
            reduceMotion={reduceMotion}
            theme={theme}
          />

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

        <ShowcaseCustomizationBar
          lighting={lighting}
          onLightingChange={setLighting}
          onPedestalChange={setPedestal}
          onThemeChange={setTheme}
          pedestal={pedestal}
          theme={theme}
        />

        <ShowcaseRingDetailSheet
          onClose={() => setSelectedRingFamily(null)}
          onEquip={ringEquipment.equip}
          progress={selectedRingProgress}
          visible={Boolean(selectedRingProgress)}
        />
      </View>
    </Screen>
  );
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

const styles = StyleSheet.create({
  screen: { flex: 1, minWidth: 0, backgroundColor: SHOWCASE_PALETTE.graphiteDeep },
  sceneWrap: { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' },
  loading: { position: 'absolute', top: 12, left: '50%', minHeight: 30, marginLeft: -96, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,8,11,.86)', borderWidth: 1, borderColor: '#35414B' },
  loadingText: { ...typography.label, color: colors.textMuted, letterSpacing: 0.45 },
  error: { position: 'absolute', right: 14, bottom: 12, left: 14, minHeight: 54, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(27,12,15,.94)', borderWidth: 1, borderColor: '#71323C' },
  errorCopy: { flex: 1, minWidth: 0 },
  errorEyebrow: { ...typography.eyebrow, color: '#FF8691' },
  errorText: { ...typography.caption, marginTop: 2, color: '#E7A6AC' },
  retry: { minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211015', borderWidth: 1, borderColor: '#A84A56' },
  retryText: { ...typography.action, color: '#FF9AA2' },
  pressed: { opacity: 0.7 },
});
