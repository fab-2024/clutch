import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { FounderPackBanner } from '@/src/features/purchases';
import { loadProfileData } from '@/src/features/profile/api';
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
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '../api';
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
import { CosmeticItemPreview, SupporterIdentity } from './CosmeticRenderer';

export type LockerScreenProps = {
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
};

type LockerTab = IdentityCosmeticSlot | 'showcase_ring';

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
  label: 'Anneaux',
  promise: 'Expose les accomplissements qui ont réellement marqué ton parcours.',
  short: 'ANNEAUX',
} as const;

export default function LockerScreen({ previewData, previewProfile }: LockerScreenProps) {
  const params = useLocalSearchParams<{ scope?: string | string[]; tab?: string | string[] }>();
  const requestedScope = collectionScopeFromParam(params.scope);
  const requestedTab = ringTabFromParam(params.tab);
  const { profile, session } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
  const { refresh: refreshCosmetics } = useCosmetics();
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
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(!previewProfile);
  const [profileError, setProfileError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const profileRequestRef = useRef(0);
  const cachedDataRef = useRef<CosmeticShopData | null>(previewData ?? null);
  const collectionEventRef = useRef('');

  const ringEquipment = useShowcaseRingEquipment(
    previewData ? `preview-${pseudo}` : pseudo,
    previewData ? 'rank' : null,
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
    setMessage(null);
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
    () => [...availableSlots, 'showcase_ring'],
    [availableSlots],
  );
  const ringActive = slot === 'showcase_ring';
  const activeSlot = slot !== 'showcase_ring' && availableSlots.includes(slot)
    ? slot
    : availableSlots[0] ?? 'cadre_profil';
  const activeMeta = ringActive ? RING_TAB_META : SLOT_META[activeSlot];
  const ringStats = useMemo(() => adaptShowcaseRingStats(profileData), [profileData]);
  const ringProgressions = useMemo(
    () => resolveAllShowcaseRings(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const unlockedRingCount = ringProgressions.filter((progress) => progress.current).length;
  const equippedRingProgress = ringProgressions.find((progress) => progress.availability === 'equipped') ?? null;
  const collectionCount = (data?.items.filter((item) => item.owned).length ?? 0) + unlockedRingCount;
  const equipped = useMemo(() => resolveEquipped(data), [data]);
  const teams = useMemo(() => uniqueTeams(data?.items ?? []), [data?.items]);
  const collections = useMemo(() => uniqueCollections(data?.items ?? []), [data?.items]);
  const selectedItem = data?.items.find((item) => item.id === selectedId && isIdentityCosmeticItem(item)) as (CosmeticItem & { slot: IdentityCosmeticSlot }) | undefined;
  const filterCount = Number(teamFilter !== 'all') + Number(collectionFilter !== 'all') + Number(rarityFilter !== 'all');
  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter((item) => item.slot === activeSlot)
      .filter((item) => scope === 'catalog' || item.owned)
      .filter((item) => teamFilter === 'all' || item.team?.id === teamFilter)
      .filter((item) => collectionFilter === 'all' || item.collectionKey === collectionFilter)
      .filter((item) => rarityFilter === 'all' || item.rarity === rarityFilter)
      .sort((a, b) => Number(b.equipped) - Number(a.equipped) || Number(b.owned) - Number(a.owned) || a.level - b.level);
  }, [activeSlot, collectionFilter, data?.items, rarityFilter, scope, teamFilter]);

  async function handleRingEquip(family: ShowcaseRingFamily | null) {
    try {
      await ringEquipment.equip(family);
      setMessage(family
        ? `Anneau ${SHOWCASE_RING_CATALOG[family].name} équipé dans ta Vitrine.`
        : 'Anneau retiré de ta Vitrine.');
    } catch {
      setMessage('L’anneau n’a pas pu être enregistré sur cet appareil.');
    }
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
        setMessage(acquisitionMessage(item));
        return;
      }
      if (data.balance < item.price) {
        setMessage(`Il te manque ${formatNumber(item.price - data.balance)} Volts pour ${item.name}.`);
        return;
      }
      if (confirmingId !== item.id) {
        setConfirmingId(item.id);
        setMessage('Confirme une seconde fois : les Volts seront débités immédiatement.');
        return;
      }
    }

    const target = fallback ?? item;
    setPendingId(item.id);
    setConfirmingId(null);
    setError(null);
    setMessage(null);

    try {
      if (previewData) {
        const next = applyPreviewAction(data, item, target);
        cachedDataRef.current = next;
        setData(next);
        setMessage(fallback ? `${item.name} a été retiré.` : `${item.name} est maintenant équipé.`);
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
        setMessage(fallback
          ? `${item.name} a été retiré.`
          : mutation.purchased
            ? `${item.name} rejoint ta collection.`
            : `${item.name} est maintenant équipé.`);
      }
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Cette action n’a pas pu être réalisée.';
      setOffline(isOfflineError(detail));
      setError(detail);
    } finally {
      setPendingId(null);
    }
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
            <Text style={styles.headerTitle}>LOCKER</Text>
          </View>
          <View accessible accessibilityLabel={`${formatNumber(data?.balance ?? 0)} Volts`} style={styles.balancePill}>
            <CurrencyIcon color="#080A0C" kind="volts" size={15} />
            <Text style={styles.balanceValue}>{loading ? '—' : formatNumber(data?.balance ?? 0)}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#171E10', '#0A0F13', '#080B0F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={styles.heroHeading}>
            <View>
              <Text style={styles.heroKicker}>APERÇU ÉQUIPÉ // PUBLIC</Text>
              <Text style={styles.heroTitle}>TA SIGNATURE,{`\n`}PARTOUT DANS GRIFF.</Text>
            </View>
            <Text style={styles.heroLive}>ACTIF</Text>
          </View>
          <SupporterIdentity cosmetics={equipped} meta="5 SURFACES" pseudo={pseudo} />
          <View style={styles.heroStats}>
            <HeroStat label="OBJETS" value={loading ? '—' : `${collectionCount}/${(data?.items.length ?? 0) + 5}`} />
            <View style={styles.heroDivider} />
            <HeroStat label="ÉQUIPÉS" value={`${countEquipped(equipped) + Number(Boolean(equippedRingProgress))}/${availableSlots.length + 1}`} />
            <View style={styles.heroDivider} />
            <HeroStat label="PAY-TO-WIN" value={contract.catalog.competitiveEffects ? '!' : '0'} accent={!contract.catalog.competitiveEffects} />
          </View>
        </View>

        <NovaWeekBanner preview={Boolean(previewData)} />

        <FounderPackBanner preview={Boolean(previewData)} />

        {offline ? (
          <View style={styles.offlineBanner}><View style={styles.offlineDot} /><Text style={styles.offlineText}>HORS CONNEXION · DERNIÈRE COLLECTION CONNUE</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View>
        ) : null}

        {!ringActive ? (
          <View style={styles.scopeTabs}>
            <ScopeButton active={scope === 'owned'} label="MES OBJETS" meta={`${collectionCount - unlockedRingCount}`} onPress={() => setScope('owned')} />
            <ScopeButton active={scope === 'catalog'} label="CATALOGUE" meta={`${data?.items.length ?? 0}`} onPress={() => setScope('catalog')} />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {availableTabs.map((itemTab) => {
            const isRing = itemTab === 'showcase_ring';
            const active = isRing ? ringActive : itemTab === activeSlot && !ringActive;
            const meta = isRing ? RING_TAB_META : SLOT_META[itemTab];
            const currentName = isRing
              ? equippedRingProgress?.display.name ?? 'À équiper'
              : data?.items.find((item) => item.slot === itemTab && item.equipped)?.name ?? 'À équiper';
            return (
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={itemTab} onPress={() => setSlot(itemTab)} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}>
                <Text style={[styles.tabGlyph, active && styles.tabGlyphActive]}>{meta.glyph}</Text>
                <View style={styles.tabCopy}><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{meta.label}</Text><Text numberOfLines={1} style={styles.tabEquipped}>{currentName}</Text></View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHead}>
          <View style={styles.sectionMark}><Text style={styles.sectionMarkText}>{activeMeta.glyph}</Text></View>
          <View style={styles.sectionCopy}><Text style={styles.sectionEyebrow}>{ringActive ? 'COLLECTION' : scope === 'owned' ? 'COLLECTION' : 'CATALOGUE'}{' // '}{activeMeta.short}</Text><Text style={styles.sectionTitle}>{activeMeta.label}</Text><Text style={styles.sectionPromise}>{activeMeta.promise}</Text></View>
          {!ringActive ? (
            <Pressable accessibilityLabel="Afficher les filtres" accessibilityRole="button" accessibilityState={{ expanded: filtersVisible }} onPress={() => setFiltersVisible((visible) => !visible)} style={({ pressed }) => [styles.filterToggle, filtersVisible && styles.filterToggleActive, pressed && styles.pressed]}>
              <Text style={[styles.filterToggleText, filtersVisible && styles.filterToggleTextActive]}>FILTRES{filterCount ? ` · ${filterCount}` : ''}</Text>
            </Pressable>
          ) : null}
        </View>

        {filtersVisible && !ringActive ? (
          <View style={styles.filters}>
            <FilterRow label="ÉQUIPE" options={[{ id: 'all', label: 'TOUTES' }, ...teams]} selected={teamFilter} onSelect={setTeamFilter} />
            <FilterRow label="COLLECTION" options={[{ id: 'all', label: 'TOUTES' }, ...collections]} selected={collectionFilter} onSelect={setCollectionFilter} />
            <FilterRow label="RARETÉ" options={[{ id: 'all', label: 'TOUTES' }, ...RARITIES.map((rarity) => ({ id: rarity, label: rarityLabel(rarity) }))]} selected={rarityFilter} onSelect={(value) => setRarityFilter(value as 'all' | CosmeticRarity)} />
            {filterCount ? <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearFilters}><Text style={styles.clearFiltersText}>EFFACER LES FILTRES</Text></Pressable> : null}
          </View>
        ) : null}

        {error && !ringActive ? <View style={styles.error}><Text style={styles.errorText}>{friendlyError(error)}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {profileError && ringActive ? <View style={styles.error}><Text style={styles.errorText}>Les données de progression ne sont pas synchronisées. Les anneaux déjà connus restent visibles.</Text><Pressable accessibilityRole="button" onPress={() => void loadRingProfile()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {ringActive && (profileLoading || ringEquipment.loading) ? (
          <View style={styles.loading}><ActivityIndicator color={colors.volt} /><Text style={styles.loadingText}>Lecture de tes accomplissements…</Text></View>
        ) : ringActive ? (
          <ShowcaseRingCollection
            onEquip={handleRingEquip}
            progressions={ringProgressions}
            stats={ringStats}
          />
        ) : loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.volt} /><Text style={styles.loadingText}>Ouverture du Locker…</Text></View>
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

        <View style={styles.rules}>
          <View style={styles.rulesHeader}><View style={styles.rulesIcon}><CurrencyIcon kind="volts" size={20} /></View><View style={styles.rulesCopy}><Text style={styles.rulesEyebrow}>CONTRAT {contract.version}{' // '}{contract.code.toUpperCase()}</Text><Text style={styles.rulesTitle}>LE PACTE GRIFF</Text><Text style={styles.rulesText}>Tes objets restent permanents et ne modifient jamais tes performances.</Text></View></View>
          <View style={styles.ruleList}>{contract.rules.map((rule) => <View key={rule.id} style={styles.ruleRow}><Text style={styles.ruleCheck}>✓</Text><View style={styles.ruleCopy}><Text style={styles.ruleLabel}>{rule.label}</Text><Text style={styles.ruleDetail}>{rule.detail}</Text></View></View>)}</View>
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSelectedId(null)} transparent visible={Boolean(selectedItem)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Fermer le détail" accessibilityRole="button" onPress={() => setSelectedId(null)} style={StyleSheet.absoluteFill} />
          {selectedItem ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTop}><View><Text style={styles.sheetEyebrow}>FICHE OBJET // {SLOT_META[selectedItem.slot].short}</Text><Text style={styles.sheetTitle}>{selectedItem.name}</Text></View><Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.sheetClose}><Text style={styles.sheetCloseText}>×</Text></Pressable></View>
              <CosmeticItemPreview item={selectedItem} pseudo={pseudo} />
              <View style={styles.sheetTags}><Tag label={rarityLabel(selectedItem.rarity)} color={rarityColor(selectedItem.rarity, selectedItem.accent)} /><Tag label={selectedItem.owned ? 'POSSÉDÉ' : sourceLabel(selectedItem.source)} color={selectedItem.owned ? colors.volt : '#AAB4BE'} />{selectedItem.equipped ? <Tag label="ÉQUIPÉ" color={selectedItem.accent} /> : null}</View>
              <Text style={styles.sheetDescription}>{selectedItem.description}</Text>
              <View style={styles.provenance}><DetailRow label="COLLECTION" value={humanize(selectedItem.collectionKey)} /><DetailRow label="ÉQUIPE" value={selectedItem.team ? `${selectedItem.team.name} · ${selectedItem.team.tag}` : 'Collection GRIFF'} /><DetailRow label="PROVENANCE" value={sourceDetail(selectedItem)} /><DetailRow label="LICENCE" value={`${humanize(selectedItem.license.type)} · ${selectedItem.license.holder}`} /><DetailRow label="DISPONIBILITÉ" value={availabilityLabel(selectedItem)} /></View>
              <ActionButton balance={data?.balance ?? 0} confirming={confirmingId === selectedItem.id} item={selectedItem} pending={pendingId === selectedItem.id} onPress={() => void handleItem(selectedItem)} />
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function isIdentityCosmeticItem(item: CosmeticItem): item is CosmeticItem & { slot: IdentityCosmeticSlot } {
  return IDENTITY_COSMETIC_SLOTS.includes(item.slot as IdentityCosmeticSlot);
}

function NovaWeekBanner({ preview }: { preview: boolean }) {
  return (
    <Pressable
      accessibilityHint="Ouvre les missions et récompenses de l’activation"
      accessibilityLabel="Découvrir Nova Week"
      accessibilityRole="button"
      onPress={() => router.push((preview ? '/campaign-preview' : '/campaign/nova-week') as never)}
      style={({ pressed }) => [styles.novaBanner, pressed && styles.pressed]}
    >
      <LinearGradient colors={['#28184F', '#151023', '#0A0E14']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.novaOrb}><View style={styles.novaOrbCore} /></View>
      <View style={styles.novaCopy}>
        <View style={styles.novaTopline}><Text style={styles.novaEyebrow}>ACTIVATION // PARTENAIRE FICTIF</Text><Text style={styles.novaLive}>LIVE</Text></View>
        <Text style={styles.novaTitle}>NOVA WEEK</Text>
        <Text style={styles.novaText}>3 signaux à compléter. Cadre, titre et variation de relique à gagner.</Text>
        <Text style={styles.novaAction}>ENTRER DANS L’ACTIVATION  →</Text>
      </View>
    </Pressable>
  );
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

function ActionButton({ balance, confirming, item, onPress, pending }: { balance: number; confirming: boolean; item: CosmeticItem; onPress: () => void; pending: boolean }) {
  const missing = Math.max(0, item.price - balance);
  const locked = !item.owned && !item.acquirable;
  const removable = item.equipped && !item.included;
  const disabled = pending || locked || (item.equipped && !removable);
  const action = itemAction(item, pending, confirming, missing);
  return <Pressable accessibilityLabel={`${action}, ${item.name}`} accessibilityRole="button" accessibilityState={{ disabled, selected: item.equipped }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.itemAction, item.equipped && styles.itemActionEquipped, confirming && styles.itemActionConfirm, (missing > 0 && !item.owned) && styles.itemActionMissing, locked && styles.itemActionMissing, pressed && styles.pressed]}>{pending ? <ActivityIndicator color="#080A0C" size="small" /> : <Text style={[styles.itemActionText, removable && styles.itemActionTextRemove, (disabled || (missing > 0 && !item.owned)) && styles.itemActionTextMuted]}>{action}</Text>}</Pressable>;
}

function HeroStat({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) { return <View style={styles.heroStat}><Text style={[styles.heroStatValue, accent && styles.heroStatValueAccent]}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>; }
function Tag({ color, label }: { color: string; label: string }) { return <View style={[styles.sheetTag, { borderColor: `${color}72`, backgroundColor: `${color}12` }]}><Text style={[styles.sheetTagText, { color }]}>{label}</Text></View>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

function applyPreviewAction(data: CosmeticShopData, selected: CosmeticItem, target: CosmeticItem): CosmeticShopData {
  if (!selected.owned && !selected.acquirable) return data;
  const purchasedNow = !selected.owned;
  const items = data.items.map((item) => item.slot === target.slot ? { ...item, owned: item.owned || item.id === selected.id, equipped: item.id === target.id } : item);
  return { ...data, balance: Math.max(0, data.balance - (purchasedNow ? selected.price : 0)), items, equipped: equippedFromItems(items, data.equipped) };
}

function resolveEquipped(data: CosmeticShopData | null): EquippedCosmetics | null { return data ? equippedFromItems(data.items, data.equipped) : null; }
function equippedFromItems(items: CosmeticItem[], fallback: EquippedCosmetics): EquippedCosmetics { return { frame: asEquipped(items.find((item) => item.slot === 'cadre_profil' && item.equipped)) ?? fallback.frame, title: asEquipped(items.find((item) => item.slot === 'titre_profil' && item.equipped)) ?? fallback.title, core: asEquipped(items.find((item) => item.slot === 'apparence_core' && item.equipped)) ?? fallback.core, factionEffect: asEquipped(items.find((item) => item.slot === 'effet_faction' && item.equipped)) ?? fallback.factionEffect, profileCard: asEquipped(items.find((item) => item.slot === 'carte_profil' && item.equipped)) ?? fallback.profileCard, showcase: fallback.showcase }; }
function asEquipped(item?: CosmeticItem): EquippedCosmetic | null { if (!item) return null; const { id, slot, level, name, description, rarity, styleKey, accent } = item; return { id, slot, level, name, description, rarity, styleKey, accent }; }
function uniqueTeams(items: CosmeticItem[]) { const teams = new Map<string, string>(); items.forEach((item) => { if (item.team) teams.set(item.team.id, item.team.tag || item.team.name); }); return Array.from(teams, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr')); }
function uniqueCollections(items: CosmeticItem[]) { return Array.from(new Set(items.map((item) => item.collectionKey))).sort().map((id) => ({ id, label: humanize(id) })); }
function countEquipped(equipped: EquippedCosmetics | null) { return equipped ? [equipped.frame, equipped.title, equipped.core, equipped.factionEffect, equipped.profileCard].filter(Boolean).length : 0; }
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
function ringTabFromParam(value?: string | string[]): 'showcase_ring' | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === 'rings' || normalized === 'anneaux' ? 'showcase_ring' : null;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 42, gap: 20 },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#171E25' }, back: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#29333D' }, backText: { ...typography.action, color: colors.text, letterSpacing: .4 }, headerIdentity: { flex: 1, minWidth: 0 }, headerEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 }, headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 25, letterSpacing: -.3 }, balancePill: { minHeight: 43, minWidth: 88, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: colors.volt }, balanceValue: { ...typography.bodyStrong, color: '#080A0C', fontVariant: ['tabular-nums'] },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 320, marginHorizontal: spacing.md, padding: 19, borderRadius: 30, borderWidth: 1, borderColor: '#46531F', gap: 14 }, heroGlow: { position: 'absolute', right: -110, top: -90, width: 270, height: 270, borderRadius: 135, backgroundColor: 'rgba(232,255,61,.11)', boxShadow: '0 0 80px rgba(232,255,61,.10)' }, heroHeading: { zIndex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, heroKicker: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 }, heroTitle: { ...typography.displaySmall, maxWidth: 300, marginTop: 5, color: colors.text }, heroLive: { ...typography.label, height: 28, paddingHorizontal: 9, paddingTop: 7, overflow: 'hidden', color: '#080A0C', borderRadius: 14, backgroundColor: colors.volt }, heroStats: { minHeight: 64, marginTop: 'auto', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(4,8,10,.68)', borderWidth: 1, borderColor: '#273129' }, heroStat: { flex: 1, alignItems: 'center' }, heroStatValue: { ...typography.metricSmall, color: colors.text }, heroStatValueAccent: { color: colors.volt }, heroStatLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, fontSize: 9, letterSpacing: .35 }, heroDivider: { width: 1, height: 30, backgroundColor: '#28322C' },
  novaBanner: { position: 'relative', minHeight: 190, marginHorizontal: spacing.md, padding: 17, overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch', borderRadius: 26, borderWidth: 1, borderColor: '#59447B' }, novaOrb: { position: 'absolute', right: -44, top: -25, width: 190, height: 190, alignItems: 'center', justifyContent: 'center', borderRadius: 95, backgroundColor: 'rgba(139,108,255,.14)', borderWidth: 1, borderColor: 'rgba(175,160,255,.25)', boxShadow: '0 0 55px rgba(139,108,255,.18)' }, novaOrbCore: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(199,125,255,.18)', boxShadow: '0 0 32px rgba(199,125,255,.38)' }, novaCopy: { zIndex: 1, flex: 1, maxWidth: 320 }, novaTopline: { flexDirection: 'row', alignItems: 'center', gap: 8 }, novaEyebrow: { ...typography.eyebrow, flex: 1, color: '#B8A8FF', letterSpacing: .7 }, novaLive: { ...typography.label, paddingHorizontal: 7, paddingVertical: 5, overflow: 'hidden', color: '#0A0810', borderRadius: 999, backgroundColor: '#B8A8FF', fontSize: 8 }, novaTitle: { marginTop: 17, color: colors.text, fontFamily: fonts.display, fontSize: 38, lineHeight: 39 }, novaText: { ...typography.caption, maxWidth: 245, marginTop: 7, color: '#C2BBD0' }, novaAction: { ...typography.action, marginTop: 'auto', paddingTop: 14, color: '#C5B8FF', letterSpacing: .3 },
  offlineBanner: { minHeight: 48, marginHorizontal: spacing.md, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 15, backgroundColor: '#17140C', borderWidth: 1, borderColor: '#4A4020' }, offlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFCB45' }, offlineText: { ...typography.label, flex: 1, color: '#D9C57D', letterSpacing: .35 },
  scopeTabs: { minHeight: 59, marginHorizontal: spacing.md, padding: 5, flexDirection: 'row', gap: 5, borderRadius: 19, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#222C35' }, scopeButton: { flex: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14 }, scopeButtonActive: { backgroundColor: '#18200F', borderWidth: 1, borderColor: '#4E5C21' }, scopeLabel: { ...typography.action, color: '#697580' }, scopeLabelActive: { color: colors.text }, scopeMeta: { ...typography.label, color: '#697580' }, scopeMetaActive: { color: colors.volt },
  tabs: { gap: 9, paddingHorizontal: spacing.md }, tab: { width: 143, minHeight: 68, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 19, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222C35' }, tabActive: { backgroundColor: '#141B0F', borderColor: '#596725' }, tabGlyph: { width: 29, color: '#65717D', fontFamily: fonts.display, fontSize: 22, textAlign: 'center' }, tabGlyphActive: { color: colors.volt }, tabCopy: { flex: 1, minWidth: 0 }, tabLabel: { ...typography.bodyStrong, color: colors.textMuted }, tabLabelActive: { color: colors.text }, tabEquipped: { ...typography.caption, marginTop: 2, color: '#64707B' },
  sectionHead: { minHeight: 86, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }, sectionMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, sectionMarkText: { color: '#080A0C', fontFamily: fonts.display, fontSize: 26 }, sectionCopy: { flex: 1, minWidth: 0 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, sectionTitle: { ...typography.sectionTitle, marginTop: 2, color: colors.text }, sectionPromise: { ...typography.caption, marginTop: 3, color: colors.textMuted }, filterToggle: { minHeight: 39, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#0D1318', borderWidth: 1, borderColor: '#29343D' }, filterToggleActive: { backgroundColor: '#19210F', borderColor: '#526022' }, filterToggleText: { ...typography.label, color: colors.textMuted, fontSize: 9 }, filterToggleTextActive: { color: colors.volt },
  filters: { marginHorizontal: spacing.md, padding: 14, gap: 13, borderRadius: 22, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#27313A' }, filterRow: { gap: 7 }, filterLabel: { ...typography.eyebrow, color: '#77838E', letterSpacing: .6 }, filterOptions: { gap: 7 }, filterChip: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#10161C', borderWidth: 1, borderColor: '#28323B' }, filterChipActive: { backgroundColor: '#1A220F', borderColor: '#566424' }, filterChipText: { ...typography.label, color: colors.textMuted }, filterChipTextActive: { color: colors.volt }, clearFilters: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#202A32' }, clearFiltersText: { ...typography.action, color: colors.textMuted },
  error: { marginHorizontal: spacing.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, flex: 1, color: '#FF9AA2' }, retry: { ...typography.action, color: colors.volt }, message: { ...typography.label, marginHorizontal: spacing.md, padding: 11, color: colors.volt, textAlign: 'center', borderRadius: 14, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3F4B1D' }, loading: { minHeight: 300, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 26, backgroundColor: '#0B1015' }, loadingText: { ...typography.body, color: colors.textMuted },
  grid: { paddingHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, itemCard: { width: '48%', minHeight: 382, padding: 12, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222C35' }, itemTopline: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, rarity: { ...typography.eyebrow, letterSpacing: .5 }, itemLevel: { ...typography.label, color: colors.textMuted, fontSize: 9 }, itemName: { ...typography.cardTitle, minHeight: 40, marginTop: 5, color: colors.text }, itemDescription: { ...typography.caption, minHeight: 31, marginTop: 4, color: colors.textMuted }, itemProvenance: { ...typography.eyebrow, minHeight: 15, marginTop: 5, color: '#71808C', fontSize: 8, letterSpacing: .45 }, itemPrice: { minHeight: 29, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, includedDot: { color: colors.volt, fontSize: 9 }, itemPriceText: { ...typography.bodyStrong, color: colors.text }, itemAction: { minHeight: 44, marginTop: 'auto', paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, itemActionEquipped: { backgroundColor: '#17200E', borderWidth: 1, borderColor: '#546225' }, itemActionConfirm: { backgroundColor: '#FFCB45' }, itemActionMissing: { backgroundColor: '#11171D', borderWidth: 1, borderColor: '#29343D' }, itemActionText: { ...typography.action, color: '#080A0C', textAlign: 'center' }, itemActionTextRemove: { color: colors.volt }, itemActionTextMuted: { color: colors.textMuted },
  empty: { minHeight: 240, marginHorizontal: spacing.md, padding: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#252F38' }, emptyGlyph: { color: colors.volt, fontFamily: fonts.display, fontSize: 38 }, emptyTitle: { ...typography.displaySmall, maxWidth: 310, marginTop: 9, color: colors.text, textAlign: 'center' }, emptyText: { ...typography.body, maxWidth: 310, marginTop: 7, color: colors.textMuted, textAlign: 'center' }, emptyAction: { minHeight: 44, marginTop: 17, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, emptyActionText: { ...typography.action, color: '#080A0C' },
  rules: { marginHorizontal: spacing.md, padding: 16, gap: 14, borderRadius: 23, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#26313A' }, rulesHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 }, rulesIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, rulesCopy: { flex: 1, minWidth: 0 }, rulesEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 }, rulesTitle: { ...typography.bodyStrong, color: colors.text }, rulesText: { ...typography.caption, marginTop: 4, color: colors.textMuted }, ruleList: { borderTopWidth: 1, borderTopColor: '#202A32' }, ruleRow: { minHeight: 67, paddingVertical: 11, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#182128' }, ruleCheck: { width: 20, color: colors.volt, fontFamily: fonts.bold, fontSize: 15 }, ruleCopy: { flex: 1, minWidth: 0 }, ruleLabel: { ...typography.label, color: colors.text, letterSpacing: .35 }, ruleDetail: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,5,7,.76)' }, sheet: { width: '100%', maxWidth: layout.contentMaxWidth, maxHeight: '92%', alignSelf: 'center', padding: 18, paddingBottom: 28, gap: 13, borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#303B44' }, sheetHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#414C55' }, sheetTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, sheetEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, sheetTitle: { ...typography.sectionTitle, marginTop: 3, color: colors.text }, sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#151B21', borderWidth: 1, borderColor: '#303A43' }, sheetCloseText: { color: colors.text, fontSize: 24, lineHeight: 25 }, sheetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, sheetTag: { minHeight: 27, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 }, sheetTagText: { ...typography.label, letterSpacing: .35 }, sheetDescription: { ...typography.body, color: colors.textMuted }, provenance: { overflow: 'hidden', borderRadius: 17, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#222C35' }, detailRow: { minHeight: 39, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#232C34' }, detailLabel: { ...typography.label, color: '#68747F', letterSpacing: .35 }, detailValue: { ...typography.caption, flex: 1, color: colors.text, textAlign: 'right' }, pressed: { opacity: .76 },
});
