import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { gradeAccent } from '@/src/features/ranking/grades';
import { loadCosmeticShop } from '@/src/features/shop/api';
import type { CosmeticShopData, EquippedCosmetics } from '@/src/features/shop/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, typography } from '@/src/theme';

import { loadProfileData } from '../api';
import type { ProfileData } from '../types';
import ShowcaseCustomizationBar from './showcase/ShowcaseCustomizationBar';
import ShowcaseRoomScene from './showcase/ShowcaseRoomScene';
import ShowcaseTopNavigation from './showcase/ShowcaseTopNavigation';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';
import type {
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
  ShowcaseSection,
} from './showcase/types';

type ShowcaseScreenProps = {
  previewProfile?: ProfileData;
  previewShop?: CosmeticShopData;
};

export default function ShowcaseScreen({ previewProfile, previewShop }: ShowcaseScreenProps) {
  const { profile, session } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [shopData, setShopData] = useState<CosmeticShopData | null>(previewShop ?? null);
  const [loading, setLoading] = useState(!previewProfile || !previewShop);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<ShowcaseSection>('showcase');
  const [pedestal, setPedestal] = useState<ShowcasePedestalSkin>('obsidian');
  const [theme, setTheme] = useState<ShowcaseRoomTheme>('graphite');
  const [lighting, setLighting] = useState<ShowcaseLighting>('cyan');
  const requestRef = useRef(0);
  const trackedRef = useRef(false);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';

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

  const ownedItems = useMemo(
    () => shopData?.items.filter((item) => item.owned) ?? [],
    [shopData?.items],
  );
  const cosmetics = resolveEquipped(shopData, profileData?.cosmetics);
  const grade = profileData?.ranking.grade;
  const rankLabel = loading
    ? 'SYNCHRO'
    : !profileData?.ranking.pronostics_regles
      ? 'NON CLASSÉ'
      : profileData.ranking.provisoire
        ? 'PLACEMENT'
        : grade?.libelle?.toUpperCase() ?? 'NON CLASSÉ';
  const rankAccent = gradeAccent(grade);

  return (
    <Screen>
      <View style={styles.screen}>
        <ShowcaseTopNavigation
          active={section}
          loading={loading}
          objectCount={ownedItems.length}
          onBack={() => router.back()}
          onRefresh={() => void load(true)}
          onSelect={setSection}
          refreshing={refreshing}
        />

        <View style={styles.sceneWrap}>
          <ShowcaseRoomScene
            cosmetics={cosmetics}
            data={profileData}
            focus={section}
            lighting={lighting}
            loading={loading}
            mode="full"
            pedestal={pedestal}
            rankAccent={rankAccent}
            rankLabel={rankLabel}
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
      </View>
    </Screen>
  );
}

function resolveEquipped(shop: CosmeticShopData | null, fallback?: EquippedCosmetics | null) {
  if (!shop) return fallback ?? null;
  const equipped = shop.equipped;
  return Object.values(equipped).some(Boolean) ? equipped : fallback ?? equipped;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minWidth: 0, backgroundColor: SHOWCASE_PALETTE.graphiteDeep },
  sceneWrap: { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' },
  loading: { position: 'absolute', top: 12, left: '50%', minHeight: 30, marginLeft: -96, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,8,11,.86)', borderWidth: 1, borderColor: '#35414B' },
  loadingText: { ...typography.label, color: colors.textMuted, fontSize: 7, letterSpacing: 0.45 },
  error: { position: 'absolute', right: 14, bottom: 12, left: 14, minHeight: 54, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(27,12,15,.94)', borderWidth: 1, borderColor: '#71323C' },
  errorCopy: { flex: 1, minWidth: 0 },
  errorEyebrow: { ...typography.eyebrow, color: '#FF8691', fontSize: 7 },
  errorText: { ...typography.caption, marginTop: 2, color: '#E7A6AC', fontSize: 8 },
  retry: { minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211015', borderWidth: 1, borderColor: '#A84A56' },
  retryText: { ...typography.action, color: '#FF9AA2', fontSize: 8 },
  pressed: { opacity: 0.7 },
});
