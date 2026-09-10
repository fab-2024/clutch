import { useAuth } from '@/src/providers/AuthProvider';
import { isCosmeticPackBillingReady, syncCosmeticPacks } from '@/src/features/purchases/api';
import { COSMETIC_PACK_PRICE, packStoreProductId } from '@/src/features/purchases/cosmeticPacks';
import { currentStorePlatform } from '@/src/features/purchases/store';
import { loadPackStore, purchasePackFromStore, restorePackPurchases, type PackStoreSnapshot } from '@/src/features/purchases/packStore';
import { isShopItemAvailable } from '../effectAvailability';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { errorFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import {
  equipCosmeticPack,
  loadCosmeticShop,
  purchaseCosmeticPack,
} from '../api';
import {
  applyPreviewTeamPackAction,
  cosmeticPackById,
  isClutchOriginal,
  isIndividualCollection,
  SANG_DES_TITANS_PACK,
  teamPackPrimaryAction,
  type TeamPackDefinition,
  type TeamPackItemDefinition,
  type TeamPackPrimaryAction,
} from '../teamPackCatalog';
import type { CosmeticShopData } from '../types';

export type TeamPackScreenProps = {
  packId?: string;
  previewData?: CosmeticShopData;
};

export default function TeamPackScreen({ packId, previewData }: TeamPackScreenProps) {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const routeId = packId ?? readParam(params.key) ?? SANG_DES_TITANS_PACK.id;
  const pack = cosmeticPackById(routeId);
  const { session } = useAuth();
  const userId = session?.user.id;
  const activeUser = useRef(userId);
  activeUser.current = userId;
  const busy = useRef(false);
  const [store, setStore] = useState<PackStoreSnapshot | null>(null);
  const { refresh: refreshCosmetics } = useCosmetics();
  const { refresh: refreshEconomy } = useEconomy();
  const { showSnackbar } = useSnackbar();
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TeamPackItemDefinition | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      let nextData = await loadCosmeticShop();
      let nextStore: PackStoreSnapshot | null = null;
      if (userId && packStoreProductId(routeId)) {
        const billingReady = await isCosmeticPackBillingReady(routeId);
        nextStore = billingReady ? await loadPackStore(userId, routeId).catch(() => ({ availability: 'unavailable' as const, localizedPrice: null })) : { availability: 'unavailable', localizedPrice: null };
        const platform = currentStorePlatform();
        if (nextStore.availability === 'owned' && platform) {
          await syncCosmeticPacks(platform);
          nextData = await loadCosmeticShop();
        }
      }
      if (requestId === requestRef.current) { setData(nextData); setStore(nextStore); }
    } catch (caught) {
      if (requestId === requestRef.current) setError(friendlyError(caught));
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData, routeId, userId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const runtimeById = useMemo(
    () => new Map((data?.items ?? []).map((item) => [item.id, item])),
    [data?.items],
  );
  const visibleItems = pack?.items.filter(isShopItemAvailable) ?? [];
  const action = pack ? teamPackPrimaryAction(pack, data) : 'unavailable';
  const originalCreation = pack ? isClutchOriginal(pack) : false;

  async function handlePrimaryAction() {
    if (!pack || !data || loading || busy.current || (action !== 'buy' && action !== 'equip')) return;
    if (!previewData && packStoreProductId(pack.id) && action === 'buy' && store?.availability !== 'ready' && store?.availability !== 'owned') return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (previewData) {
        setData(applyPreviewTeamPackAction(data, pack));
      } else {
        if (!userId) throw new Error('Connecte-toi pour retrouver ta collection.');
        if (action === 'buy' && !packStoreProductId(pack.id)) {
          await purchaseCosmeticPack(pack.id);
        } else if (action === 'buy') {
          const outcome = await purchasePackFromStore(userId, pack.id);
          if (activeUser.current !== userId || outcome === 'cancelled') return;
          if (outcome === 'pending') {
            showSnackbar({ message: 'Paiement en attente de confirmation du store.', tone: 'info' });
            return;
          }
          const platform = currentStorePlatform();
          if (!platform) return;
          await syncCosmeticPacks(platform);
          if (activeUser.current !== userId) return;
          const verified = await loadCosmeticShop();
          const verifiedAction = teamPackPrimaryAction(pack, verified);
          if (verifiedAction !== 'equip' && verifiedAction !== 'equipped') {
            throw new Error('Ton achat est en cours de validation. Utilise « Restaurer mes achats » pour réessayer, sans repayer.');
          }
        }
        if (activeUser.current !== userId) return;
        await equipCosmeticPack(pack.id);
        const next = await loadCosmeticShop();
        if (activeUser.current !== userId) return;
        setData(next);
        await Promise.allSettled([refreshCosmetics(), refreshEconomy()]);
      }
      successFeedback();
      showSnackbar({
        message: action === 'buy' ? `${pack.name} débloqué et équipé dans ta Vitrine.` : `Le ${pack.name} équipe maintenant ta Vitrine.`,
        tone: 'success',
      });
    } catch (caught) {
      if (activeUser.current === userId) { setError(friendlyError(caught)); errorFeedback(); }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function handleRestore() {
    if (!pack || !userId || busy.current || previewData) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await restorePackPurchases(userId, pack.id);
      if (activeUser.current !== userId) return;
      const platform = currentStorePlatform();
      if (!platform) return;
      await syncCosmeticPacks(platform);
      const next = await loadCosmeticShop();
      if (activeUser.current !== userId) return;
      setData(next);
      await refreshCosmetics();
      showSnackbar({ message: 'Tes achats ont été synchronisés.', tone: 'success' });
    } catch (caught) {
      if (activeUser.current === userId) setError(friendlyError(caught));
    } finally { busy.current = false; setPending(false); }
  }

  if (!pack) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEyebrow}>PACK COSMÉTIQUE</Text>
          <Text style={styles.emptyTitle}>PACK INTROUVABLE</Text>
          <Text style={styles.emptyText}>Cette collection n’est plus disponible dans la Boutique.</Text>
          <Button label="REVENIR À LA BOUTIQUE" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (pack && isIndividualCollection(pack.id)) {
    return <Redirect href={previewData ? '/shop-preview' : '/shop'} />;
  }

  return (
    <Screen>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={(
            <RefreshControl
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={pack.accent}
            />
          )}
          showsVerticalScrollIndicator={false}
          testID="team-pack-scroll"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Revenir à la Boutique"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerEyebrow, { color: pack.accent }]}>
                {pack.kind === 'original'
                  ? 'COLLECTION // ORIGINALE'
                  : originalCreation
                    ? 'PACK ÉQUIPES // ORIGINAL'
                  : pack.kind === 'game_collection'
                    ? 'COLLECTION JEU // OFFICIELLE'
                    : 'PACK ÉQUIPE // OFFICIEL'}
              </Text>
              <Text style={styles.headerTitle}>{pack.name.toLocaleUpperCase('fr-FR')}</Text>
            </View>
            <View style={styles.itemCount}>
              <Text style={styles.itemCountValue}>{visibleItems.length}</Text>
              <Text style={styles.itemCountLabel}>OBJETS</Text>
            </View>
          </View>

          <View style={[styles.hero, { borderColor: `${pack.accent}80` }]} testID="team-pack-hero">
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={pack.hero}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(4,5,7,.06)', 'rgba(4,5,7,.20)', 'rgba(4,5,7,.98)']}
              locations={[0, 0.56, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={[styles.heroTeam, { color: pack.accent }]}>{pack.title}</Text>
              <Text style={styles.heroSubtitle}>{pack.subtitle}</Text>
              <Text style={styles.heroDescription}>{pack.description}</Text>
              <View style={styles.heroMeta}>
                <View style={[styles.officialPill, { borderColor: `${pack.accent}52` }]}>
                  <View style={[styles.officialDot, { backgroundColor: pack.accent }]} />
                  <Text style={styles.officialText}>
                    {originalCreation
                      ? 'CRÉATION ORIGINALE'
                      : pack.kind === 'game_collection'
                        ? 'COLLECTION PARTENAIRE'
                        : 'COLLECTION OFFICIELLE'}
                  </Text>
                </View>
                <Text style={styles.heroMetaText}>{visibleItems.length} COSMÉTIQUES</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>SYNCHRONISATION IMPOSSIBLE</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => void load()}>
                <Text style={[styles.retry, { color: pack.accent }]}>RÉESSAYER</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.collectionHeading}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: pack.accent }]}>CONTENU DU PACK</Text>
              <Text style={styles.sectionTitle}>{pack.subtitle}</Text>
            </View>
            <Text style={styles.inspectHint}>TOUCHE POUR INSPECTER</Text>
          </View>

          {loading ? (
            <View accessibilityLabel={`Chargement du ${pack.name}`} accessibilityRole="progressbar" style={styles.loading}>
              <ActivityIndicator color={pack.accent} />
              <Text style={styles.loadingText}>SYNCHRONISATION DES {visibleItems.length} OBJETS…</Text>
            </View>
          ) : (
            <View style={styles.itemGrid} testID="team-pack-item-grid">
              {visibleItems.map((item, index) => {
                const runtime = runtimeById.get(item.id);
                return (
                  <Pressable
                    accessibilityHint="Ouvre la fiche détaillée de cet objet"
                    accessibilityLabel={`${item.name}, objet ${index + 1} sur ${visibleItems.length}${runtime?.owned ? ', possédé' : ''}`}
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => {
                      selectionFeedback();
                      setSelectedItem(item);
                    }}
                    style={({ pressed }) => [
                      styles.itemCard,
                      runtime?.owned && { borderColor: `${pack.accent}70` },
                      pressed && styles.pressed,
                    ]}
                    testID={`team-pack-item-${item.id}`}
                  >
                    <View style={styles.itemVisual}>
                      <Image
                        accessibilityIgnoresInvertColors
                        resizeMode="cover"
                        source={item.image}
                        style={styles.itemImage}
                      />
                      <View style={[styles.numberPill, { borderColor: `${pack.accent}80` }]}>
                        <Text style={[styles.numberText, { color: pack.accent }]}>{index + 1}</Text>
                      </View>
                      {runtime?.owned ? (
                        <View style={styles.ownedPill}>
                          <Text style={[styles.ownedText, { color: pack.accent }]}>{runtime.equipped ? 'ÉQUIPÉ' : 'POSSÉDÉ'}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                      <Text numberOfLines={1} style={styles.itemType}>{slotLabel(item.slot)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {packStoreProductId(pack.id) ? <View style={styles.licenseBlock}>
            <Text style={styles.licenseText}>Achat unique · Pack permanent · Aucun Volt débité.</Text>
            {!previewData && store?.availability === 'mobile_only' ? <Text style={styles.licenseText}>Disponible à l’achat dans l’application iPhone ou Android.</Text> : null}
            {!previewData && store?.availability !== 'mobile_only' ? <Pressable accessibilityRole="button" disabled={pending || !userId} onPress={() => void handleRestore()}>
              <Text style={styles.retry}>Restaurer mes achats</Text>
            </Pressable> : null}
          </View> : null}

          <View style={[styles.licenseBlock, { borderColor: `${pack.accent}38` }]}>
            <Text style={[styles.licenseTitle, { color: pack.accent }]}>
              {originalCreation
                ? 'CRÉATION ORIGINALE CLUTCH'
                : `${pack.licenseHolder.toLocaleUpperCase('fr-FR')} × CLUTCH`}
            </Text>
            <Text style={styles.licenseText}>
              {originalCreation
                ? 'Collection cosmétique originale. Aucun objet ne modifie le rang, les Calls ou les performances.'
                : 'Collection cosmétique officielle. Aucun objet ne modifie le rang, les Calls ou les performances.'}
            </Text>
          </View>
        </ScrollView>

        <TeamPackActionDock
          action={action}
          balance={data?.balance ?? 0}
          priceLabel={packStoreProductId(pack.id) ? store?.localizedPrice ?? COSMETIC_PACK_PRICE : `${formatNumber(pack.price)} Volts`}
            storeReady={!packStoreProductId(pack.id) || Boolean(previewData) || store?.availability === 'ready' || store?.availability === 'owned'}
          onPress={() => void handlePrimaryAction()}
          pack={pack}
          pending={pending || loading}
        />

        <BaseSheet
          eyebrow={`${pack.kind === 'game_collection' ? 'COLLECTION' : 'PACK'} ${pack.title} // OBJET`}
          footer={<Button fullWidth label="FERMER" onPress={() => setSelectedItem(null)} variant="secondary" />}
          onClose={() => setSelectedItem(null)}
          testID="team-pack-item-sheet"
          title={selectedItem?.name ?? `Objet ${pack.title}`}
          visible={Boolean(selectedItem)}
        >
          {selectedItem ? (
            <View style={styles.sheetContent}>
              <View style={[styles.sheetImageWrap, { borderColor: `${pack.accent}70` }]}>

                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={selectedItem.image}
                  style={styles.sheetImage}
                />

              </View>
              <View style={styles.sheetMetaRow}>
                <Text style={[styles.sheetNumber, { color: pack.accent }]}>OBJET {visibleItems.findIndex((item) => item.id === selectedItem.id) + 1}/{visibleItems.length}</Text>
                <Text style={styles.sheetSlot}>{slotLabel(selectedItem.slot)}</Text>
              </View>
              <Text style={styles.sheetDescription}>{selectedItem.description}</Text>
              <View style={[styles.sheetStatus, { borderColor: `${pack.accent}38` }]}>
                <View style={[styles.officialDot, { backgroundColor: pack.accent }]} />
                <Text style={styles.sheetStatusText}>
                  {runtimeById.get(selectedItem.id)?.owned ? 'DANS TA COLLECTION' : 'INCLUS DANS LE PACK'}
                </Text>
              </View>
            </View>
          ) : null}
        </BaseSheet>
      </View>
    </Screen>
  );
}

function TeamPackActionDock({
  action,
  balance,
  priceLabel,
  storeReady,
  onPress,
  pack,
  pending,
}: {
  action: TeamPackPrimaryAction;
  balance: number;
  priceLabel: string;
  storeReady: boolean;
  onPress: () => void;
  pack: TeamPackDefinition;
  pending: boolean;
}) {
  const disabled = pending || (action === 'buy' && !storeReady) || action === 'equipped' || action === 'insufficient' || action === 'unavailable';
  return (
    <View style={[styles.dock, { borderTopColor: `${pack.accent}42` }]} testID="team-pack-action-dock">
      <View style={styles.dockCopy}>
        <Text style={styles.dockEyebrow}>PACK COMPLET</Text>
        {action === 'buy' || action === 'insufficient' ? (
          <View accessibilityLabel={priceLabel} style={styles.dockPrice}>
            <Text style={styles.dockPriceText}>{priceLabel}</Text>
          </View>
        ) : (
          <Text style={[styles.dockState, action === 'equipped' && { color: pack.accent }]}>
            {action === 'equipped' ? 'CONFIGURATION ACTIVE' : `${pack.items.filter(isShopItemAvailable).length} OBJETS POSSÉDÉS`}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityLabel={action === 'insufficient' ? `Solde insuffisant. Il manque ${formatNumber(pack.price - balance)} Volts` : actionAccessibilityLabel(action, priceLabel, pack.name)}
        accessibilityRole="button"
        accessibilityState={{ busy: pending, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.packAction,
          { backgroundColor: pack.accent, borderColor: pack.accent },
          disabled && styles.packActionDisabled,
          pressed && !disabled && styles.packActionPressed,
        ]}
        testID="team-pack-primary-action"
      >
        {pending ? (
          <ActivityIndicator color="#0A0A0A" />
        ) : (
          <Text style={[styles.packActionText, disabled && styles.packActionTextDisabled]}>
            {action === 'buy' && !storeReady ? 'BIENTÔT DISPONIBLE' : actionLabel(action)}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function actionLabel(action: TeamPackPrimaryAction) {
  if (action === 'buy') return 'ACHETER LE PACK';
  if (action === 'equip') return 'ÉQUIPER LE PACK';
  if (action === 'equipped') return 'PACK ÉQUIPÉ';
  if (action === 'insufficient') return 'SOLDE INSUFFISANT';
  return 'INDISPONIBLE';
}

function actionAccessibilityLabel(action: TeamPackPrimaryAction, price: string, packName: string) {
  if (action === 'buy') return `Acheter et équiper le ${packName} pour ${price}`;
  if (action === 'equip') return `Équiper le ${packName}`;
  if (action === 'equipped') return `Le ${packName} est équipé`;
  return `Le ${packName} est indisponible`;
}

function slotLabel(slot: TeamPackItemDefinition['slot']) {
  if (slot === 'cadre_profil') return 'CADRE DE PROFIL';
  if (slot === 'titre_profil') return 'TITRE';
  if (slot === 'apparence_core') return 'OBJET DE VITRINE';
  if (slot === 'effet_faction') return 'EFFET';
  if (slot === 'carte_profil') return 'CARTE & BANNIÈRE';
  if (slot === 'vitrine_eclairage') return 'ÉCLAIRAGE';
  if (slot === 'vitrine_supports') return 'PRÉSENTOIRS';
  if (slot === 'vitrine_maillot') return 'MAILLOT';
  if (slot === 'vitrine_rang') return 'RANG';
  return 'MATÉRIAU';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

function friendlyError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (/solde insuffisant/i.test(message)) return 'Ton solde a changé. Recharge le pack avant de réessayer.';
  if (/network|fetch|hors connexion|offline/i.test(message)) return 'Connexion indisponible. Ta collection n’a pas été modifiée.';
  return message || 'Le pack cosmétique n’a pas pu être synchronisé.';
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 144,
    gap: spacing.md,
  },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: '#111A22',
  },
  backGlyph: { color: colors.text, fontSize: 31, lineHeight: 31, marginTop: -3 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow },
  headerTitle: { ...typography.sectionTitle, color: colors.text, marginTop: 1 },
  itemCount: { alignItems: 'center', minWidth: 54 },
  itemCountValue: { ...typography.metricSmall, color: colors.text },
  itemCountLabel: { ...typography.eyebrow, color: colors.textMuted, marginTop: -1 },
  hero: {
    minHeight: 292,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: '#111A22',
  },
  heroContent: { padding: spacing.md, paddingTop: 112 },
  heroTeam: { fontFamily: fonts.display, fontSize: 48, lineHeight: 45, letterSpacing: -1 },
  heroSubtitle: { ...typography.cardTitle, color: colors.text, letterSpacing: 1.2 },
  heroDescription: { ...typography.body, color: '#D0D4D8', marginTop: spacing.xs, maxWidth: 330 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  officialPill: {
    minHeight: 27,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#4C3225',
    backgroundColor: 'rgba(8,9,11,.78)',
  },
  officialDot: { width: 6, height: 6, borderRadius: 3 },
  officialText: { ...typography.label, color: colors.text },
  heroMetaText: { ...typography.eyebrow, color: colors.textSecondary },
  errorBanner: {
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.danger}70`,
    borderRadius: radius.md,
    backgroundColor: '#160B0D',
  },
  errorTitle: { ...typography.eyebrow, color: colors.danger },
  errorText: { ...typography.body, color: colors.textSecondary },
  retry: { ...typography.action, marginTop: spacing.xs },
  collectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  sectionEyebrow: { ...typography.eyebrow },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, marginTop: 2 },
  inspectHint: { ...typography.caption, color: colors.textMuted, textAlign: 'right', maxWidth: 112 },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: '#111A22',
  },
  loadingText: { ...typography.eyebrow, color: colors.textMuted },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemCard: {
    width: '48.5%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#30414E',
    borderRadius: radius.md,
    backgroundColor: '#111A22',
  },
  itemVisual: { height: 126, overflow: 'hidden', backgroundColor: '#0B1218' },
  itemImage: { width: '100%', height: '100%' },
  numberPill: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(3,4,5,.88)',
  },
  numberText: { fontFamily: fonts.bold, fontSize: 12 },
  ownedPill: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(3,4,5,.88)',
  },
  ownedText: { ...typography.eyebrow, fontSize: 9 },
  itemCopy: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  itemName: { ...typography.bodyStrong, color: colors.text },
  itemType: { ...typography.eyebrow, color: colors.textMuted, fontSize: 9, marginTop: 3 },
  licenseBlock: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#30251F',
    borderRadius: radius.md,
    backgroundColor: '#111A22',
  },
  licenseTitle: { ...typography.eyebrow },
  licenseText: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 104,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#332017',
    backgroundColor: 'rgba(5,6,8,.97)',
  },
  dockCopy: { flex: 1, minWidth: 0 },
  dockEyebrow: { ...typography.eyebrow, color: colors.textMuted },
  dockPrice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  dockPriceText: { ...typography.metricSmall, color: colors.text },
  dockState: { ...typography.label, color: colors.textSecondary, marginTop: 4 },
  packAction: {
    minWidth: 184,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  packActionDisabled: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  packActionPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  packActionText: { ...typography.control, color: '#090A0B' },
  packActionTextDisabled: { color: colors.textDisabled },
  pressed: { opacity: 0.78 },
  sheetContent: { gap: spacing.md },
  sheetImageWrap: {
    height: 230,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: '#0B1218',
  },
  sheetImage: { width: '100%', height: '100%' },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sheetNumber: { ...typography.eyebrow },
  sheetSlot: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right' },
  sheetDescription: { ...typography.bodyComfort, color: colors.textSecondary },
  sheetStatus: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#30251F',
    borderRadius: radius.sm,
    backgroundColor: '#111A22',
  },
  sheetStatusText: { ...typography.label, color: colors.text },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEyebrow: { ...typography.eyebrow, color: colors.danger },
  emptyTitle: { ...typography.displayMedium, color: colors.text, textAlign: 'center' },
  emptyText: { ...typography.bodyComfort, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
});
