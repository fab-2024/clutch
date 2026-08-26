import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
  useWindowDimensions,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { loadProfileData } from '@/src/features/profile/api';
import ShowcaseRoomScene from '@/src/features/profile/components/showcase/ShowcaseRoomScene';
import type { ProfileData } from '@/src/features/profile/types';
import { gradeAccent } from '@/src/features/ranking/grades';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '../api';
import {
  ATELIER_CATEGORIES,
  ATELIER_CATEGORY_META,
  ATELIER_DISCOVERY_ENTRIES,
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

export type AtelierShopScreenProps = {
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
};

export default function AtelierShopScreen({ previewData, previewProfile }: AtelierShopScreenProps) {
  const { width } = useWindowDimensions();
  const { profile, session } = useAuth();
  const { refresh: refreshEconomy, volts } = useEconomy();
  const { refresh: refreshCosmetics } = useCosmetics();
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [category, setCategory] = useState<AtelierCategory>('materials');
  const [selectedId, setSelectedId] = useState('material_graphite');
  const [trial, setTrial] = useState<AtelierTrySelection>({});
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);
  const cachedDataRef = useRef<CosmeticShopData | null>(previewData ?? null);
  const cachedProfileRef = useRef<ProfileData | null>(previewProfile ?? null);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';
  const cardWidth = Math.min(170, Math.max(154, width * 0.42));

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setProfileData(previewProfile ?? null);
      cachedDataRef.current = previewData;
      cachedProfileRef.current = previewProfile ?? null;
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

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
      setError(caught instanceof Error ? caught.message : 'Impossible d’ouvrir l’Atelier.');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData, previewProfile, pseudo]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const runtimeById = useMemo(
    () => new Map((data?.items ?? []).map((item) => [item.id, item])),
    [data?.items],
  );
  const products = useMemo(() => atelierProducts(category), [category]);
  const selectedProduct = atelierProductById(selectedId) ?? products[0] ?? null;
  const selectedItem = selectedProduct ? runtimeById.get(selectedProduct.id) ?? null : null;
  const balance = data?.balance ?? volts ?? 0;
  const action = selectedItem ? atelierPrimaryAction(selectedItem, balance) : 'unavailable';
  const scene = resolveAtelierSceneConfig(data?.equipped ?? profileData?.cosmetics, trial);
  const equippedIds = useMemo(
    () => equippedAtelierIds(data?.equipped ?? profileData?.cosmetics),
    [data?.equipped, profileData?.cosmetics],
  );
  const equippedIdsRef = useRef(equippedIds);
  const cosmetics = data?.equipped ?? profileData?.cosmetics ?? null;
  const grade = profileData?.ranking.grade;
  const rankLabel = loading
    ? 'SYNCHRO'
    : !profileData?.ranking.pronostics_regles
      ? 'NON CLASSÉ'
      : profileData.ranking.provisoire
        ? 'PLACEMENT'
        : grade?.libelle?.toUpperCase() ?? 'NON CLASSÉ';
  const rankAccent = gradeAccent(grade);
  const trialActive = Object.keys(trial).length > 0;

  useEffect(() => {
    equippedIdsRef.current = equippedIds;
  }, [equippedIds]);

  useEffect(() => {
    const persistedId = equippedIdsRef.current[category];
    const nextId = products.some((product) => product.id === persistedId)
      ? persistedId
      : products[0]?.id;
    if (nextId) setSelectedId(nextId);
  }, [category, products]); // Equipment updates must not pull the carousel away from the user's selection.

  async function handlePrimaryAction() {
    if (!selectedItem || !selectedProduct || pendingId) return;
    const nextAction = atelierPrimaryAction(selectedItem, balance);
    if (nextAction === 'equipped' || nextAction === 'unavailable') return;
    if (nextAction === 'insufficient') {
      setMessage(`Il te manque ${formatNumber(selectedItem.price - balance)} Volts.`);
      return;
    }

    setPendingId(selectedItem.id);
    setError(null);
    setMessage(null);
    try {
      if (previewData) {
        const next = applyPreviewAtelierAction(data ?? previewData, selectedItem.id);
        cachedDataRef.current = next;
        setData(next);
      } else {
        if (nextAction === 'buy') await purchaseCosmetic(selectedItem.id);
        else await equipCosmetic(selectedItem.id);
        const [next] = await Promise.all([
          loadCosmeticShop(),
          refreshEconomy(),
          refreshCosmetics(),
        ]);
        cachedDataRef.current = next;
        setData(next);
      }
      setTrial((current) => {
        const next = { ...current };
        delete next[selectedProduct.category];
        return next;
      });
      setMessage(nextAction === 'buy'
        ? `${selectedProduct.name} rejoint ta Vitrine et est maintenant équipé.`
        : `${selectedProduct.name} est maintenant équipé.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Cette action n’a pas pu être réalisée.');
    } finally {
      setPendingId(null);
    }
  }

  function handleTry() {
    if (!selectedProduct) return;
    setTrial((current) => applyAtelierTry(current, selectedProduct.category, selectedProduct.id));
    setMessage(`${selectedProduct.name} est appliqué en essai. Rien n’est sauvegardé.`);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
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
          <View accessible accessibilityLabel={`${formatNumber(balance)} Volts`} style={styles.balancePill}>
            <CurrencyIcon kind="volts" size={17} />
            <View><Text style={styles.balanceLabel}>VOLTS</Text><Text style={styles.balanceValue}>{loading ? '—' : formatNumber(balance)}</Text></View>
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <View style={styles.errorCopy}><Text style={styles.errorTitle}>ATELIER INDISPONIBLE</Text><Text numberOfLines={2} style={styles.errorText}>{friendlyError(error)}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.livePanel}>
          <LinearGradient colors={['rgba(11,18,24,.98)', 'rgba(5,9,13,.98)']} style={StyleSheet.absoluteFill} />
          <View style={styles.panelHeading}>
            <View><Text style={styles.panelEyebrow}>APERÇU EN DIRECT</Text><Text style={styles.panelTitle}>TA VITRINE, EN TEMPS RÉEL.</Text></View>
            <Pressable
              accessibilityLabel="Ouvrir la Vitrine en paysage"
              accessibilityRole="button"
              onPress={() => router.push((previewData ? '/showcase-preview' : '/showcase') as never)}
              style={({ pressed }) => [styles.openShowcase, pressed && styles.pressed]}
            >
              <Text style={styles.openShowcaseText}>OUVRIR ↗</Text>
            </Pressable>
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
              theme={scene.theme}
            />
            {loading ? <View style={styles.sceneLoading}><ActivityIndicator color={colors.volt} /></View> : null}
            {trialActive ? <View style={styles.trialPill}><Text style={styles.trialPillText}>ESSAI TEMPORAIRE</Text></View> : null}
          </View>

          <ScrollView contentContainerStyle={styles.equippedRow} horizontal showsHorizontalScrollIndicator={false}>
            {ATELIER_CATEGORIES.map((itemCategory) => {
              const product = atelierProductById(equippedIds[itemCategory]);
              return (
                <View key={itemCategory} style={styles.equippedChip}>
                  <Text style={styles.equippedLabel}>{ATELIER_CATEGORY_META[itemCategory].shortLabel}</Text>
                  <Text numberOfLines={1} style={styles.equippedValue}>{product?.name ?? 'Origine'}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionEyebrow}>PERSONNALISER // 04 CATÉGORIES</Text>
          <View style={styles.categoryRow}>
            {ATELIER_CATEGORIES.map((itemCategory) => {
              const active = itemCategory === category;
              const meta = ATELIER_CATEGORY_META[itemCategory];
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  key={itemCategory}
                  onPress={() => { setCategory(itemCategory); setMessage(null); }}
                  style={({ pressed }) => [styles.categoryButton, active && styles.categoryButtonActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.categoryGlyph, active && styles.categoryGlyphActive]}>{meta.glyph}</Text>
                  <Text numberOfLines={1} style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.productsHeader}>
          <View><Text style={styles.sectionEyebrow}>CATALOGUE // {ATELIER_CATEGORY_META[category].label}</Text><Text style={styles.productsTitle}>CHOISIS TA FINITION.</Text></View>
          <Text style={styles.productsCount}>{String(products.length).padStart(2, '0')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.productTrack}
          decelerationRate="fast"
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 10}
        >
          {products.map((product) => (
            <ProductCard
              item={runtimeById.get(product.id) ?? null}
              key={product.id}
              onPress={() => { setSelectedId(product.id); setMessage(null); }}
              product={product}
              selected={selectedProduct?.id === product.id}
              width={cardWidth}
            />
          ))}
        </ScrollView>

        {selectedProduct ? (
          <SelectionPanel
            action={action}
            balance={balance}
            item={selectedItem}
            message={message}
            onPrimary={() => void handlePrimaryAction()}
            onTry={handleTry}
            pending={pendingId === selectedProduct.id}
            product={selectedProduct}
          />
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyTitle}>CATALOGUE EN COURS DE SYNCHRONISATION.</Text><Text style={styles.emptyText}>Réessaie dans un instant pour retrouver les finitions de la Vitrine.</Text></View>
        )}

        <View style={styles.discovery}>
          {ATELIER_DISCOVERY_ENTRIES.map((entry) => (
            <View accessible accessibilityLabel={`${entry.label}, bientôt`} key={entry.kind} style={styles.discoveryCard}>
              <View style={styles.discoveryGlyph}><Text style={styles.discoveryGlyphText}>{entry.glyph}</Text></View>
              <View style={styles.discoveryCopy}><Text style={styles.discoveryTitle}>{entry.label}</Text><Text numberOfLines={1} style={styles.discoveryText}>{entry.description}</Text></View>
              <Text style={styles.discoverySoon}>BIENTÔT</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
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
  return (
    <Pressable
      accessibilityLabel={`${product.name}, ${productState(item, product)}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.productCard, { width }, selected && styles.productCardSelected, pressed && styles.pressed]}
      testID={`atelier-product-${product.id}`}
    >
      <View style={styles.productVisual}>
        <Image blurRadius={8} resizeMode="cover" source={product.image} style={styles.productVisualBackdrop} />
        <View style={styles.productVisualShade} />
        <Image resizeMode="contain" source={product.image} style={styles.productVisualImage} />
        {selected ? <View style={styles.selectedMark}><Text style={styles.selectedMarkText}>SÉLECTION</Text></View> : null}
      </View>
      <View style={styles.productCopy}>
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
        <ProductState item={item} product={product} />
      </View>
    </Pressable>
  );
}

function ProductState({ item, product }: { item: CosmeticItem | null; product: AtelierProduct }) {
  if (item?.equipped) return <Text style={styles.stateEquipped}>● ÉQUIPÉ</Text>;
  if (item?.owned) return <Text style={styles.stateOwned}>POSSÉDÉ</Text>;
  if (!item) return <Text style={styles.stateMuted}>SYNCHRO</Text>;
  return <View style={styles.priceRow}><CurrencyIcon kind="volts" size={13} /><Text style={styles.priceText}>{formatNumber(product.price)}</Text></View>;
}

function SelectionPanel({
  action,
  balance,
  item,
  message,
  onPrimary,
  onTry,
  pending,
  product,
}: {
  action: AtelierPrimaryAction;
  balance: number;
  item: CosmeticItem | null;
  message: string | null;
  onPrimary: () => void;
  onTry: () => void;
  pending: boolean;
  product: AtelierProduct;
}) {
  const primaryDisabled = pending || action === 'equipped' || action === 'insufficient' || action === 'unavailable';
  return (
    <View style={styles.selectionPanel}>
      <View style={styles.selectionTop}>
        <View style={styles.selectionThumb}>
          <Image resizeMode="cover" source={product.image} style={styles.selectionThumbBackdrop} />
          <View style={styles.selectionThumbShade} />
          <Image resizeMode="contain" source={product.image} style={styles.selectionThumbImage} />
        </View>
        <View style={styles.selectionCopy}>
          <Text style={styles.selectionEyebrow}>{ATELIER_CATEGORY_META[product.category].label}</Text>
          <Text numberOfLines={1} style={styles.selectionName}>{product.name}</Text>
          <Text numberOfLines={2} style={styles.selectionDescription}>{product.description}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityLabel={`Essayer ${product.name}`} accessibilityRole="button" onPress={onTry} style={({ pressed }) => [styles.tryButton, pressed && styles.pressed]}>
          <Text style={styles.tryButtonText}>ESSAYER</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={primaryLabel(action, product)}
          accessibilityRole="button"
          accessibilityState={{ disabled: primaryDisabled, selected: action === 'equipped' }}
          disabled={primaryDisabled}
          onPress={onPrimary}
          style={({ pressed }) => [styles.primaryButton, primaryDisabled && styles.primaryButtonDisabled, pressed && styles.pressed]}
        >
          {pending ? <ActivityIndicator color="#070A0C" size="small" /> : <Text style={[styles.primaryButtonText, primaryDisabled && styles.primaryButtonTextDisabled]}>{primaryLabel(action, product)}</Text>}
        </Pressable>
      </View>
      {action === 'insufficient' ? <Text style={styles.insufficient}>Solde insuffisant · il manque {formatNumber(product.price - balance)} Volts.</Text> : null}
      {action === 'unavailable' && !item ? <Text style={styles.syncNote}>La migration du catalogue Atelier doit être appliquée avant l’achat réel.</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

function primaryLabel(action: AtelierPrimaryAction, product: AtelierProduct) {
  if (action === 'equip') return 'ÉQUIPER';
  if (action === 'equipped') return 'ÉQUIPÉ';
  if (action === 'unavailable') return 'BIENTÔT';
  return `ACHETER · ${formatNumber(product.price)}`;
}

function productState(item: CosmeticItem | null, product: AtelierProduct) {
  if (item?.equipped) return 'équipé';
  if (item?.owned) return 'possédé';
  if (!item) return 'en synchronisation';
  return `${product.price} Volts`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

function friendlyError(value: string) {
  if (/network|fetch|hors connexion/i.test(value)) return 'Connexion indisponible. La dernière configuration connue reste affichée.';
  return value;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 30, gap: 15, backgroundColor: '#05080B' },
  header: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#2A3640', backgroundColor: '#0A0F13' },
  backIcon: { marginTop: -3, color: '#D9E0E5', fontSize: 31, lineHeight: 31 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 8, letterSpacing: 0.65 },
  headerTitle: { marginTop: 1, color: '#F4F6F4', fontFamily: fonts.display, fontSize: 29, lineHeight: 30 },
  balancePill: { minWidth: 92, height: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, borderWidth: 1, borderColor: '#445120', backgroundColor: '#0D130A' },
  balanceLabel: { ...typography.label, color: '#7F8A92', fontSize: 6, letterSpacing: 0.4 },
  balanceValue: { color: '#F2F5F5', fontFamily: fonts.display, fontSize: 16, lineHeight: 17 },
  livePanel: { position: 'relative', overflow: 'hidden', padding: 10, borderRadius: 18, borderWidth: 1, borderColor: '#2B3944', backgroundColor: '#081017' },
  panelHeading: { minHeight: 43, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  panelEyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 8, letterSpacing: 0.6 },
  panelTitle: { marginTop: 2, color: '#F1F3F2', fontFamily: fonts.display, fontSize: 18, lineHeight: 19 },
  openShowcase: { minWidth: 76, minHeight: 32, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#52641C', backgroundColor: '#11180B' },
  openShowcaseText: { ...typography.action, color: colors.volt, fontSize: 8 },
  sceneFrame: { position: 'relative', overflow: 'hidden', borderRadius: 12 },
  sceneLoading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,7,9,.62)' },
  trialPill: { position: 'absolute', top: 7, right: 7, minHeight: 22, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#DDEB4A', backgroundColor: 'rgba(12,16,7,.88)' },
  trialPillText: { ...typography.label, color: colors.volt, fontSize: 6.5, letterSpacing: 0.3 },
  equippedRow: { paddingTop: 8, gap: 7 },
  equippedChip: { width: 105, minHeight: 34, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#222D35', backgroundColor: '#080D11' },
  equippedLabel: { ...typography.label, color: '#6F7C86', fontSize: 6, letterSpacing: 0.35 },
  equippedValue: { ...typography.caption, marginTop: 2, color: '#D3D9DD', fontSize: 8 },
  categorySection: { gap: 8 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 8, letterSpacing: 0.58 },
  categoryRow: { flexDirection: 'row', gap: 6 },
  categoryButton: { flex: 1, minWidth: 0, minHeight: 59, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: '#26323B', backgroundColor: '#080D11' },
  categoryButtonActive: { borderColor: '#82951B', backgroundColor: '#141C0D', boxShadow: '0 0 10px rgba(232,255,61,.08)' },
  categoryGlyph: { color: '#76828C', fontSize: 15, lineHeight: 16 },
  categoryGlyphActive: { color: colors.volt },
  categoryLabel: { ...typography.label, maxWidth: '100%', color: '#7B8791', fontSize: 6.1, letterSpacing: 0.15 },
  categoryLabelActive: { color: colors.volt },
  productsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  productsTitle: { marginTop: 2, color: '#F1F3F2', fontFamily: fonts.display, fontSize: 21, lineHeight: 22 },
  productsCount: { color: '#3F4A53', fontFamily: fonts.display, fontSize: 28, lineHeight: 28 },
  productTrack: { paddingRight: 24, gap: 10 },
  productCard: { overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#28343D', backgroundColor: '#090E12' },
  productCardSelected: { borderColor: colors.volt, boxShadow: '0 0 12px rgba(232,255,61,.16)' },
  productVisual: { position: 'relative', overflow: 'hidden', height: 188, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020405' },
  productVisualBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.35, transform: [{ scale: 1.14 }] },
  productVisualShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(2,4,6,.34)' },
  productVisualImage: { width: '100%', height: '100%' },
  selectedMark: { position: 'absolute', top: 7, left: 7, minHeight: 21, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.volt },
  selectedMarkText: { ...typography.label, color: '#080A0B', fontSize: 6 },
  productCopy: { minHeight: 63, padding: 10, justifyContent: 'space-between' },
  productName: { color: '#EDF0EF', fontFamily: fonts.display, fontSize: 17, lineHeight: 18 },
  stateEquipped: { ...typography.label, color: colors.volt, fontSize: 7.5 },
  stateOwned: { ...typography.label, color: '#C1C9CF', fontSize: 7.5 },
  stateMuted: { ...typography.label, color: '#69757F', fontSize: 7.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceText: { color: '#F1F4F3', fontFamily: fonts.display, fontSize: 14 },
  selectionPanel: { padding: 11, borderRadius: 16, borderWidth: 1, borderColor: '#303D47', backgroundColor: '#0A0F13' },
  selectionTop: { flexDirection: 'row', gap: 11 },
  selectionThumb: { position: 'relative', overflow: 'hidden', width: 76, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#26323A', backgroundColor: '#030506' },
  selectionThumbBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.28 },
  selectionThumbShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(2,4,6,.25)' },
  selectionThumbImage: { width: '100%', height: '100%' },
  selectionCopy: { flex: 1, minWidth: 0, justifyContent: 'center' },
  selectionEyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 7 },
  selectionName: { marginTop: 2, color: '#F3F5F4', fontFamily: fonts.display, fontSize: 21, lineHeight: 22 },
  selectionDescription: { ...typography.caption, marginTop: 4, color: '#929DA6', fontSize: 9, lineHeight: 12 },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  tryButton: { width: 96, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#53616B', backgroundColor: '#0B1116' },
  tryButtonText: { ...typography.action, color: '#D7DDE1', fontSize: 9 },
  primaryButton: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt },
  primaryButtonDisabled: { borderWidth: 1, borderColor: '#2B353D', backgroundColor: '#11171C' },
  primaryButtonText: { ...typography.action, color: '#080A0B', fontSize: 10 },
  primaryButtonTextDisabled: { color: '#707B84' },
  insufficient: { ...typography.caption, marginTop: 7, color: '#F1A27A', fontSize: 8.5 },
  syncNote: { ...typography.caption, marginTop: 7, color: '#74818A', fontSize: 8.5 },
  message: { ...typography.caption, marginTop: 7, color: '#C9DA38', fontSize: 8.5 },
  discovery: { gap: 8 },
  discoveryCard: { minHeight: 62, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#28343D', backgroundColor: '#080D11' },
  discoveryGlyph: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#43501D', backgroundColor: '#11170B' },
  discoveryGlyphText: { color: colors.volt, fontSize: 15 },
  discoveryCopy: { flex: 1, minWidth: 0 },
  discoveryTitle: { color: '#EDF0EF', fontFamily: fonts.display, fontSize: 16, lineHeight: 17 },
  discoveryText: { ...typography.caption, marginTop: 2, color: '#6E7A84', fontSize: 8 },
  discoverySoon: { ...typography.label, color: '#7F8A92', fontSize: 7 },
  errorBanner: { minHeight: 54, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#6E3840', backgroundColor: '#1B0D11' },
  errorCopy: { flex: 1, minWidth: 0 },
  errorTitle: { ...typography.eyebrow, color: '#FF8995', fontSize: 7 },
  errorText: { ...typography.caption, marginTop: 2, color: '#DCA4AA', fontSize: 8 },
  retry: { ...typography.action, color: '#FF9AA3', fontSize: 8 },
  emptyState: { minHeight: 110, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#28343D', backgroundColor: '#080D11' },
  emptyTitle: { color: '#E8ECEB', fontFamily: fonts.display, fontSize: 17, textAlign: 'center' },
  emptyText: { ...typography.caption, marginTop: 5, color: '#7C8892', textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
