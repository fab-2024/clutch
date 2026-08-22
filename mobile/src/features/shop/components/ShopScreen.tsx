import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { equipCosmetic, loadCosmeticShop, purchaseCosmetic } from '../api';
import type {
  CosmeticItem,
  CosmeticShopData,
  CosmeticSlot,
} from '../types';
import { DEFAULT_MONETIZATION_CONTRACT } from '../types';

type ShopScreenProps = {
  previewData?: CosmeticShopData;
};

const SLOT_META: Record<CosmeticSlot, { label: string; short: string; promise: string; glyph: string }> = {
  cadre_profil: { label: 'Cadres', short: 'CADRE', promise: 'Signe ton profil sans toucher à tes performances.', glyph: '▣' },
  titre_profil: { label: 'Titres', short: 'TITRE', promise: 'Affiche une identité gagnée, jamais un avantage.', glyph: 'T' },
  apparence_core: { label: 'Core', short: 'CORE', promise: 'Change la matière du noyau visible sur ton Hub.', glyph: 'C' },
  effet_faction: { label: 'Reliques', short: 'RELIQUE', promise: 'Habille la relique sans accélérer sa progression.', glyph: '✦' },
  carte_profil: { label: 'Bannières', short: 'BANNIÈRE', promise: 'Prépare une signature visuelle à partager.', glyph: '◇' },
};

const SLOT_ORDER = Object.keys(SLOT_META) as CosmeticSlot[];

export default function ShopScreen({ previewData }: ShopScreenProps) {
  const { refresh: refreshEconomy } = useEconomy();
  const { refresh: refreshCosmetics } = useCosmetics();
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [slot, setSlot] = useState<CosmeticSlot>('cadre_profil');
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const next = await loadCosmeticShop();
      if (requestId === requestRef.current) setData(next);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible de charger la boutique.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    setConfirmingId(null);
    setMessage(null);
  }, [slot]);

  const collection = data?.items.filter((item) => item.owned).length ?? 0;
  const contract = data?.contract ?? DEFAULT_MONETIZATION_CONTRACT;
  const availableSlots = useMemo(
    () => SLOT_ORDER.filter((itemSlot) => contract.catalog.allowedSlots.includes(itemSlot)),
    [contract.catalog.allowedSlots],
  );
  const activeSlot = availableSlots.includes(slot) ? slot : availableSlots[0] ?? 'cadre_profil';
  const visibleItems = useMemo(
    () => (data?.items ?? []).filter((item) => item.slot === activeSlot).sort((a, b) => a.level - b.level),
    [activeSlot, data?.items],
  );

  async function handleItem(item: CosmeticItem) {
    if (!data || pendingId || item.equipped) return;

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

    setPendingId(item.id);
    setConfirmingId(null);
    setError(null);
    setMessage(null);

    try {
      if (previewData) {
        setData(applyPreviewAction(data, item));
      } else {
        const mutation = item.owned
          ? await equipCosmetic(item.id)
          : await purchaseCosmetic(item.id);
        const next = await loadCosmeticShop();
        setData(next);
        await Promise.all([refreshEconomy(), refreshCosmetics()]);
        setMessage(mutation.purchased ? `${item.name} rejoint ta collection.` : `${item.name} est maintenant équipé.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Cette action n’a pas pu être réalisée.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir au profil" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← MOI</Text>
          </Pressable>
          <View style={styles.headerIdentity}>
            <Text style={styles.headerEyebrow}>ARSENAL VISUEL</Text>
            <Text style={styles.headerTitle}>BOUTIQUE</Text>
          </View>
          <View accessible accessibilityLabel={`${formatNumber(data?.balance ?? 0)} Volts`} style={styles.balancePill}>
            <CurrencyIcon color="#080A0C" kind="volts" size={15} />
            <Text style={styles.balanceValue}>{loading ? '—' : formatNumber(data?.balance ?? 0)}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#171E10', '#0A0F13', '#080B0F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <Text style={styles.heroKicker}>PACTE {contract.version} // VOLTS</Text>
          <Text style={styles.heroTitle}>DÉPENSE TON STYLE.{`\n`}JAMAIS TON AVANTAGE.</Text>
          <Text style={styles.heroCopy}>{contract.promise} Chaque achat personnalise ce que les autres voient.</Text>
          <View style={styles.heroStats}>
            <HeroStat label="COLLECTION" value={loading ? '—' : `${collection}/${data?.items.length ?? 0}`} />
            <View style={styles.heroDivider} />
            <HeroStat label="CATÉGORIES" value={`${availableSlots.length}`} />
            <View style={styles.heroDivider} />
            <HeroStat label="PAY-TO-WIN" value={contract.catalog.competitiveEffects ? '!' : '0'} accent={!contract.catalog.competitiveEffects} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {availableSlots.map((itemSlot) => {
            const active = itemSlot === activeSlot;
            const equipped = data?.items.find((item) => item.slot === itemSlot && item.equipped);
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={itemSlot}
                onPress={() => setSlot(itemSlot)}
                style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
              >
                <Text style={[styles.tabGlyph, active && styles.tabGlyphActive]}>{SLOT_META[itemSlot].glyph}</Text>
                <View>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{SLOT_META[itemSlot].label}</Text>
                  <Text numberOfLines={1} style={styles.tabEquipped}>{equipped?.name ?? 'À équiper'}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHead}>
          <View style={styles.sectionMark}><Text style={styles.sectionMarkText}>{SLOT_META[activeSlot].glyph}</Text></View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionEyebrow}>{SLOT_META[activeSlot].short} // COLLECTION</Text>
            <Text style={styles.sectionTitle}>{SLOT_META[activeSlot].label}</Text>
            <Text style={styles.sectionPromise}>{SLOT_META[activeSlot].promise}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{friendlyError(error)}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.volt} /><Text style={styles.loadingText}>Chargement du catalogue…</Text></View>
        ) : (
          <View style={styles.grid}>
            {visibleItems.map((item) => (
              <ItemCard
                balance={data?.balance ?? 0}
                confirming={confirmingId === item.id}
                item={item}
                key={item.id}
                pending={pendingId === item.id}
                onPress={() => void handleItem(item)}
              />
            ))}
          </View>
        )}

        <View style={styles.rules}>
          <View style={styles.rulesHeader}>
            <View style={styles.rulesIcon}><CurrencyIcon kind="volts" size={20} /></View>
            <View style={styles.rulesCopy}>
              <Text style={styles.rulesEyebrow}>CONTRAT {contract.version} // {contract.code.toUpperCase()}</Text>
              <Text style={styles.rulesTitle}>LE PACTE CLUTCH</Text>
              <Text style={styles.rulesText}>Ces règles viennent du même contrat que celui appliqué à chaque achat.</Text>
            </View>
          </View>
          <View style={styles.ruleList}>
            {contract.rules.map((rule) => (
              <View key={rule.id} style={styles.ruleRow}>
                <Text style={styles.ruleCheck}>✓</Text>
                <View style={styles.ruleCopy}>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                  <Text style={styles.ruleDetail}>{rule.detail}</Text>
                </View>
              </View>
            ))}
          </View>
          {!contract.payments.enabled ? <Text style={styles.paymentStatus}>PAIEMENTS RÉELS DÉSACTIVÉS POUR CETTE VERSION</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ItemCard({
  balance,
  confirming,
  item,
  onPress,
  pending,
}: {
  balance: number;
  confirming: boolean;
  item: CosmeticItem;
  onPress: () => void;
  pending: boolean;
}) {
  const missing = Math.max(0, item.price - balance);
  const locked = !item.owned && !item.acquirable;
  const disabled = item.equipped || pending || locked;
  const action = item.equipped
    ? 'ÉQUIPÉ'
    : pending
      ? 'SYNCHRONISATION…'
      : item.owned
        ? 'ÉQUIPER'
        : locked
          ? acquisitionAction(item)
        : missing
          ? `MANQUE ${formatNumber(missing)} V`
          : confirming
            ? `CONFIRMER · ${formatNumber(item.price)} V`
            : `DÉBLOQUER · ${formatNumber(item.price)} V`;

  return (
    <View style={[styles.itemCard, item.equipped && { borderColor: `${item.accent}8A` }]}>
      <CosmeticPreview item={item} />
      <View style={styles.itemTopline}>
        <Text style={[styles.rarity, { color: rarityColor(item.rarity, item.accent) }]}>{rarityLabel(item.rarity)}</Text>
        <Text style={styles.itemLevel}>NIV. {item.level}</Text>
      </View>
      <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
      <Text numberOfLines={3} style={styles.itemDescription}>{item.description}</Text>
      <Text numberOfLines={1} style={styles.itemProvenance}>{provenanceLabel(item)}</Text>
      <View style={styles.itemPrice}>
        {item.price ? <CurrencyIcon kind="volts" size={14} /> : <Text style={styles.includedDot}>●</Text>}
        <Text style={styles.itemPriceText}>{item.price
          ? formatNumber(item.price)
          : item.included
            ? 'INCLUS'
            : sourceLabel(item.source)}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${action}, ${item.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: item.equipped }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.itemAction,
          item.equipped && styles.itemActionEquipped,
          confirming && styles.itemActionConfirm,
          missing > 0 && !item.owned && styles.itemActionMissing,
          locked && styles.itemActionMissing,
          pressed && styles.pressed,
        ]}
      >
        {pending ? <ActivityIndicator color="#080A0C" size="small" /> : <Text style={[styles.itemActionText, (item.equipped || locked || (missing > 0 && !item.owned)) && styles.itemActionTextMuted]}>{action}</Text>}
      </Pressable>
    </View>
  );
}

function CosmeticPreview({ item }: { item: CosmeticItem }) {
  if (item.slot === 'cadre_profil') {
    return <View style={styles.preview}><View style={[styles.framePreview, { borderColor: item.accent, boxShadow: `0 0 18px ${item.accent}35` }]}><View style={styles.frameAvatar}><Text style={styles.frameAvatarText}>C</Text></View><View style={styles.frameLines}><View style={styles.frameLineLong} /><View style={[styles.frameLineShort, { backgroundColor: item.accent }]} /></View></View></View>;
  }
  if (item.slot === 'titre_profil') {
    return <View style={styles.preview}><View style={styles.titlePreview}><Text style={styles.titlePreviewPseudo}>PLAYER_01</Text><Text numberOfLines={1} style={[styles.titlePreviewValue, { color: item.accent }]}>{item.name.toUpperCase()}</Text><View style={[styles.titlePreviewLine, { backgroundColor: item.accent }]} /></View></View>;
  }
  if (item.slot === 'apparence_core') {
    return <View style={styles.preview}><View style={[styles.coreOrbit, { borderColor: `${item.accent}66` }]}><View style={[styles.coreOrbitNode, { backgroundColor: item.accent }]} /><LinearGradient colors={[`${item.accent}EE`, `${item.accent}66`, '#10141A']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.corePreview}><Text style={styles.corePreviewText}>C</Text></LinearGradient></View></View>;
  }
  if (item.slot === 'effet_faction') {
    return <View style={styles.preview}><View style={[styles.relicGlow, { backgroundColor: `${item.accent}22`, boxShadow: `0 0 24px ${item.accent}44` }]} /><View style={[styles.relicNeck, { borderColor: `${item.accent}77` }]} /><View style={[styles.relicBody, { borderColor: `${item.accent}99` }]}><View style={[styles.relicLiquid, { backgroundColor: `${item.accent}45` }]} /><View style={[styles.relicHeart, { backgroundColor: item.accent, boxShadow: `0 0 12px ${item.accent}` }]} /></View></View>;
  }
  return <View style={styles.preview}><LinearGradient colors={['#141A21', `${item.accent}28`, '#080B0F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[styles.cardPreview, { borderColor: `${item.accent}88` }]}><Text style={[styles.cardPreviewRank, { color: item.accent }]}>#128</Text><View style={styles.cardPreviewCopy}><Text style={styles.cardPreviewName}>PLAYER_01</Text><Text style={styles.cardPreviewMeta}>ÉLITE · 68% PRÉCISION</Text></View></LinearGradient></View>;
}

function HeroStat({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) {
  return <View style={styles.heroStat}><Text style={[styles.heroStatValue, accent && styles.heroStatValueAccent]}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>;
}

function applyPreviewAction(data: CosmeticShopData, selected: CosmeticItem): CosmeticShopData {
  if (!selected.owned && !selected.acquirable) return data;
  const purchasedNow = !selected.owned;
  return {
    ...data,
    balance: Math.max(0, data.balance - (purchasedNow ? selected.price : 0)),
    items: data.items.map((item) => item.slot === selected.slot
      ? { ...item, owned: item.owned || item.id === selected.id, equipped: item.id === selected.id }
      : item),
  };
}

function rarityColor(rarity: CosmeticItem['rarity'], accent: string) { return rarity === 'commun' ? '#87929E' : accent; }
function rarityLabel(rarity: CosmeticItem['rarity']) { if (rarity === 'legendaire') return 'LÉGENDAIRE'; if (rarity === 'epique') return 'ÉPIQUE'; if (rarity === 'rare') return 'RARE'; return 'COMMUN'; }
function sourceLabel(source: CosmeticItem['source']) {
  if (source === 'mission') return 'MISSION';
  if (source === 'partenaire') return 'PARTENAIRE';
  if (source === 'founder_pack') return 'FOUNDER PACK';
  if (source === 'gratuit') return 'OFFERT';
  return 'VOLTS';
}
function acquisitionAction(item: CosmeticItem) {
  return item.available ? sourceLabel(item.source) : 'INDISPONIBLE';
}
function acquisitionMessage(item: CosmeticItem) {
  if (!item.available) return `${item.name} n’est plus disponible à l’acquisition, mais reste permanent pour ses propriétaires.`;
  if (item.source === 'mission') return `${item.name} se débloque en accomplissant sa mission.`;
  if (item.source === 'partenaire') return `${item.name} se débloque via son activation partenaire.`;
  if (item.source === 'founder_pack') return `${item.name} est réservé au Founder Pack.`;
  return `${item.name} ne peut pas être débloqué depuis la boutique.`;
}
function provenanceLabel(item: CosmeticItem) {
  const identity = item.team?.tag || item.brandKey || item.collectionKey.replace(/-/g, ' ');
  return `${identity.toUpperCase()} · ${sourceLabel(item.source)}`;
}
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function friendlyError(value: string) { if (value.toLowerCase().includes('solde insuffisant')) return 'Ton solde a changé. Recharge la boutique avant de confirmer.'; return value; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 42, gap: 20 },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#171E25' },
  back: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#29333D' },
  backText: { ...typography.action, color: colors.text, letterSpacing: .4 },
  headerIdentity: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 },
  headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 25, letterSpacing: -.3 },
  balancePill: { minHeight: 43, minWidth: 88, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: colors.volt },
  balanceValue: { ...typography.bodyStrong, color: '#080A0C', fontVariant: ['tabular-nums'] },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 292, marginHorizontal: spacing.md, padding: 20, borderRadius: 30, borderWidth: 1, borderColor: '#46531F', gap: 10 },
  heroGlow: { position: 'absolute', right: -110, top: -90, width: 270, height: 270, borderRadius: 135, backgroundColor: 'rgba(232,255,61,.11)', boxShadow: '0 0 80px rgba(232,255,61,.10)' },
  heroKicker: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 },
  heroTitle: { ...typography.displayMedium, maxWidth: 340, color: colors.text },
  heroCopy: { ...typography.body, maxWidth: 345, color: colors.textMuted },
  heroStats: { minHeight: 64, marginTop: 'auto', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(4,8,10,.68)', borderWidth: 1, borderColor: '#273129' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { ...typography.metricSmall, color: colors.text },
  heroStatValueAccent: { color: colors.volt },
  heroStatLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, fontSize: 9, letterSpacing: .35 },
  heroDivider: { width: 1, height: 30, backgroundColor: '#28322C' },
  tabs: { gap: 9, paddingHorizontal: spacing.md },
  tab: { width: 143, minHeight: 68, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 19, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222C35' },
  tabActive: { backgroundColor: '#141B0F', borderColor: '#596725' },
  tabGlyph: { width: 29, color: '#65717D', fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  tabGlyphActive: { color: colors.volt },
  tabLabel: { ...typography.bodyStrong, color: colors.textMuted },
  tabLabelActive: { color: colors.text },
  tabEquipped: { ...typography.caption, width: 82, marginTop: 2, color: '#64707B' },
  sectionHead: { minHeight: 86, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  sectionMarkText: { color: '#080A0C', fontFamily: fonts.display, fontSize: 26 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 2, color: colors.text },
  sectionPromise: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  error: { marginHorizontal: spacing.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retry: { ...typography.action, color: colors.volt },
  message: { ...typography.label, marginHorizontal: spacing.md, padding: 11, color: colors.volt, textAlign: 'center', borderRadius: 14, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3F4B1D' },
  loading: { minHeight: 300, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 26, backgroundColor: '#0B1015' },
  loadingText: { ...typography.body, color: colors.textMuted },
  grid: { paddingHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemCard: { width: '48%', minHeight: 392, padding: 12, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222C35' },
  preview: { height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 17, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#1C252D' },
  framePreview: { width: 126, height: 78, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 18, backgroundColor: '#0C1116', borderWidth: 2 },
  frameAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  frameAvatarText: { color: '#080A0C', fontFamily: fonts.display, fontSize: 22 },
  frameLines: { flex: 1, gap: 7 },
  frameLineLong: { width: '92%', height: 6, borderRadius: 4, backgroundColor: '#D9DEE3' },
  frameLineShort: { width: '62%', height: 4, borderRadius: 3 },
  titlePreview: { width: 132, height: 74, padding: 11, justifyContent: 'center', borderRadius: 17, backgroundColor: '#0D1319', borderWidth: 1, borderColor: '#27313B' },
  titlePreviewPseudo: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  titlePreviewValue: { marginTop: 4, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: .4 },
  titlePreviewLine: { width: 34, height: 2, marginTop: 8 },
  coreOrbit: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 46, borderWidth: 1 },
  coreOrbitNode: { position: 'absolute', top: 3, width: 7, height: 7, borderRadius: 4 },
  corePreview: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 19, transform: [{ rotate: '-7deg' }] },
  corePreviewText: { color: '#07090C', fontFamily: fonts.display, fontSize: 32 },
  relicGlow: { position: 'absolute', width: 86, height: 86, borderRadius: 43 },
  relicNeck: { width: 21, height: 25, marginBottom: -3, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: '#12181D' },
  relicBody: { width: 66, height: 67, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 29, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, backgroundColor: 'rgba(19,28,34,.82)' },
  relicLiquid: { position: 'absolute', left: 3, right: 3, bottom: 3, height: 36, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  relicHeart: { width: 10, height: 22, marginBottom: 18, borderRadius: 6 },
  cardPreview: { width: 140, height: 82, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 17, borderWidth: 1 },
  cardPreviewRank: { fontFamily: fonts.display, fontSize: 25 },
  cardPreviewCopy: { flex: 1, minWidth: 0 },
  cardPreviewName: { ...typography.bodyStrong, color: colors.text },
  cardPreviewMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted, fontSize: 8 },
  itemTopline: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  rarity: { ...typography.eyebrow, letterSpacing: .5 },
  itemLevel: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  itemName: { ...typography.cardTitle, minHeight: 40, marginTop: 5, color: colors.text },
  itemDescription: { ...typography.caption, minHeight: 43, marginTop: 4, color: colors.textMuted },
  itemProvenance: { ...typography.eyebrow, minHeight: 15, marginTop: 5, color: '#71808C', fontSize: 8, letterSpacing: .45 },
  itemPrice: { minHeight: 29, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  includedDot: { color: colors.volt, fontSize: 9 },
  itemPriceText: { ...typography.bodyStrong, color: colors.text },
  itemAction: { minHeight: 44, marginTop: 'auto', paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt },
  itemActionEquipped: { backgroundColor: '#17200E', borderWidth: 1, borderColor: '#546225' },
  itemActionConfirm: { backgroundColor: '#FFCB45' },
  itemActionMissing: { backgroundColor: '#11171D', borderWidth: 1, borderColor: '#29343D' },
  itemActionText: { ...typography.action, color: '#080A0C', textAlign: 'center' },
  itemActionTextMuted: { color: colors.textMuted },
  rules: { marginHorizontal: spacing.md, padding: 16, gap: 14, borderRadius: 23, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#26313A' },
  rulesHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rulesIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' },
  rulesCopy: { flex: 1, minWidth: 0 },
  rulesEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  rulesTitle: { ...typography.bodyStrong, color: colors.text },
  rulesText: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  ruleList: { borderTopWidth: 1, borderTopColor: '#202A32' },
  ruleRow: { minHeight: 67, paddingVertical: 11, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#182128' },
  ruleCheck: { width: 20, color: colors.volt, fontFamily: fonts.bold, fontSize: 15 },
  ruleCopy: { flex: 1, minWidth: 0 },
  ruleLabel: { ...typography.label, color: colors.text, letterSpacing: .35 },
  ruleDetail: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  paymentStatus: { ...typography.eyebrow, color: '#77838E', letterSpacing: .45, textAlign: 'center' },
  pressed: { opacity: .76 },
});
