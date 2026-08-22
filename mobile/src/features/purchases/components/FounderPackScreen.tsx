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
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadFounderPackStatus, syncFounderPackStatus } from '../api';
import {
  currentFounderPlatform,
  loadFounderStoreSnapshot,
  purchaseFounderPack,
  restoreFounderPack,
} from '../store';
import type {
  FounderPackItem,
  FounderPackStatus,
  FounderStoreSnapshot,
} from '../types';

type FounderPackScreenProps = {
  previewStatus?: FounderPackStatus;
};

const MOBILE_ONLY_SNAPSHOT: FounderStoreSnapshot = {
  availability: 'mobile_only',
  localizedPrice: null,
  platform: null,
  entitlementActive: false,
};

const ITEM_META: Record<FounderPackItem['slot'], { glyph: string; label: string }> = {
  cadre_profil: { glyph: '▣', label: 'CADRE' },
  titre_profil: { glyph: 'F', label: 'TITRE' },
  effet_faction: { glyph: '✦', label: 'RELIQUE' },
  carte_profil: { glyph: '◇', label: 'BANNIÈRE' },
};

export default function FounderPackScreen({ previewStatus }: FounderPackScreenProps) {
  const { refreshProfile, session } = useAuth();
  const { refresh: refreshCosmetics } = useCosmetics();
  const userId = session?.user.id ?? null;
  const preview = Boolean(previewStatus);
  const [status, setStatus] = useState<FounderPackStatus | null>(previewStatus ?? null);
  const [store, setStore] = useState<FounderStoreSnapshot>(MOBILE_ONLY_SNAPSHOT);
  const [loading, setLoading] = useState(!previewStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<'purchase' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);
  const impressionRef = useRef(false);

  const load = useCallback(async (refresh = false) => {
    if (previewStatus) {
      setStatus(previewStatus);
      setStore(MOBILE_ONLY_SNAPSHOT);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!userId) return;

    const requestId = ++requestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const platform = currentFounderPlatform();
      const [databaseStatus, storeSnapshot] = await Promise.all([
        loadFounderPackStatus(),
        loadFounderStoreSnapshot(userId),
      ]);
      if (requestId !== requestRef.current) return;
      setStatus(databaseStatus);
      setStore(storeSnapshot);

      if (
        platform
        && storeSnapshot.availability !== 'configuration_required'
        && storeSnapshot.availability !== 'product_unavailable'
      ) {
        try {
          const reconciled = await syncFounderPackStatus('status', platform);
          if (requestId === requestRef.current) setStatus(reconciled);
        } catch {
          // The private ledger and webhook remain authoritative. A manual pull
          // can fail temporarily without hiding the last server-known state.
        }
      }
    } catch (caught) {
      if (requestId === requestRef.current) setError(friendlyError(caught));
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewStatus, userId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    if (preview || !status || impressionRef.current) return;
    impressionRef.current = true;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({
      type: 'founder_pack_affiche',
      idempotencyKey: `founder-pack:view:${day}`,
    }).catch(() => { impressionRef.current = false; });
  }, [preview, status]);

  const items = status?.items ?? [];
  const packActive = status?.packActive === true;
  const localizedPrice = store.localizedPrice || status?.indicativePrice || '4,99 €';
  const primary = useMemo(
    () => primaryAction(status, store, acting),
    [acting, status, store],
  );

  async function handlePurchase() {
    if (preview) {
      setMessage('Le paiement réel s’ouvre uniquement dans le development build iOS ou Android.');
      return;
    }
    if (!userId || !store.platform || store.availability !== 'ready' || acting) return;

    setActing('purchase');
    setError(null);
    setMessage(null);
    let storeValidated = false;
    void trackAnalyticsEvent({ type: 'founder_pack_achat_demarre' }).catch(() => undefined);

    try {
      const outcome = await purchaseFounderPack(userId);
      if (outcome.kind === 'cancelled') {
        void trackAnalyticsEvent({ type: 'founder_pack_achat_annule' }).catch(() => undefined);
        setMessage('Aucun achat effectué. Tu peux revenir quand tu veux.');
        return;
      }
      if (outcome.kind === 'pending') {
        setMessage('Paiement en attente. Le pack sera attribué après confirmation du store.');
        return;
      }

      storeValidated = outcome.entitlementActive;
      setStore((current) => ({ ...current, availability: 'owned', entitlementActive: true }));
      const reconciled = await syncFounderPackStatus('purchase', store.platform);
      setStatus(reconciled);
      await Promise.allSettled([refreshCosmetics(), refreshProfile()]);
      setMessage('Founder Pack validé. Tes quatre signatures sont dans le Locker.');
    } catch (caught) {
      setError(storeValidated
        ? 'Le store a validé l’achat, mais la synchronisation Clutch est retardée. Utilise « Restaurer » ou attends le webhook automatique.'
        : friendlyError(caught));
    } finally {
      setActing(null);
    }
  }

  async function handleRestore() {
    if (preview) {
      setMessage('La restauration sera testée dans TestFlight et Play Internal Testing.');
      return;
    }
    if (!userId || !store.platform || acting) return;

    setActing('restore');
    setError(null);
    setMessage(null);
    void trackAnalyticsEvent({ type: 'founder_pack_restauration_demandee' }).catch(() => undefined);

    try {
      const entitlementActive = await restoreFounderPack(userId);
      const reconciled = await syncFounderPackStatus('restore', store.platform);
      setStatus(reconciled);
      setStore((current) => ({
        ...current,
        availability: entitlementActive ? 'owned' : current.availability,
        entitlementActive,
      }));
      await Promise.allSettled([refreshCosmetics(), refreshProfile()]);
      setMessage(entitlementActive
        ? 'Achat restauré. Ton identité Founder est de nouveau synchronisée.'
        : 'Aucun Founder Pack actif trouvé sur ce compte store.');
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setActing(null);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#FFCB45" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir au Locker" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← LOCKER</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>IDENTITÉ // PREMIÈRE VAGUE</Text>
            <Text style={styles.headerTitle}>FOUNDER</Text>
          </View>
          <View style={[styles.livePill, packActive && styles.livePillOwned]}><Text style={[styles.liveText, packActive && styles.liveTextOwned]}>{packActive ? 'ACTIF' : 'V1'}</Text></View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#2B1E09', '#0C1015', '#050709']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.orbit}><View style={styles.orbitNode} /></View>
          <View style={styles.founderSeal}>
            <LinearGradient colors={['#FFE18A', '#C88C25', '#201508']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.sealGradient}>
              <Text style={styles.sealLetter}>F</Text>
              <View style={styles.sealCutTop} />
              <View style={styles.sealCutBottom} />
            </LinearGradient>
          </View>
          <Text style={styles.heroEyebrow}>CLUTCH // ORIGIN SERIES 0001</Text>
          <Text style={styles.heroTitle}>TU ÉTAIS LÀ{`\n`}AVANT LE BRUIT.</Text>
          <Text style={styles.heroText}>Quatre signatures visuelles qui marquent le lancement de Clutch. Achat unique, permanent, restaurable.</Text>
          <View style={styles.priceRow}>
            <View><Text style={styles.priceLabel}>{store.localizedPrice ? 'PRIX DU STORE' : 'PRIX CIBLE'}</Text><Text style={styles.price}>{localizedPrice}</Text></View>
            <View style={styles.once}><Text style={styles.onceLabel}>UNE FOIS</Text><Text style={styles.onceValue}>PAS D’ABONNEMENT</Text></View>
          </View>
        </View>

        {status?.state === 'refunded' || status?.state === 'revoked' ? (
          <View style={styles.stateNotice}><Text style={styles.stateMark}>↺</Text><View style={styles.stateCopy}><Text style={styles.stateTitle}>PACK REMBOURSÉ OU RÉVOQUÉ</Text><Text style={styles.stateText}>Les objets liés ont été retirés. Une éventuelle qualité de Fondateur historique reste préservée.</Text></View></View>
        ) : null}
        {status?.legacyFounder && !packActive ? (
          <View style={styles.legacyNotice}><Text style={styles.legacyText}>TON STATUT FONDATEUR HISTORIQUE RESTE INDÉPENDANT DE CET ACHAT.</Text></View>
        ) : null}

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>CONTENU EXACT // 4 OBJETS</Text><Text style={styles.sectionTitle}>L’IDENTITÉ FOUNDER</Text></View>
          <Text style={styles.known}>CONNU{`\n`}À L’AVANCE</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color="#FFCB45" /><Text style={styles.loadingText}>Vérification du pack…</Text></View>
        ) : (
          <View style={styles.grid}>
            {items.map((item, index) => <FounderItemCard index={index} item={item} key={item.id} />)}
          </View>
        )}

        <View style={styles.guardrails}>
          <Guardrail glyph="0" label="FRAG ACHETÉ" detail="Le classement reste intact." />
          <Guardrail glyph="×" label="AUCUN VOLT" detail="Pas de dette au remboursement." />
          <Guardrail glyph="∞" label="PERMANENT" detail="Tant que l’achat reste valide." />
        </View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: primary.disabled }}
          disabled={primary.disabled && !preview}
          onPress={() => void handlePurchase()}
          style={({ pressed }) => [styles.primary, primary.disabled && !preview && styles.primaryDisabled, pressed && styles.pressed]}
        >
          {acting === 'purchase' ? <ActivityIndicator color="#080A0C" /> : <Text style={[styles.primaryText, primary.disabled && !preview && styles.primaryTextDisabled]}>{primary.label}</Text>}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={Boolean(acting) || (!preview && !store.platform)}
          onPress={() => void handleRestore()}
          style={({ pressed }) => [styles.restore, (Boolean(acting) || (!preview && !store.platform)) && styles.restoreDisabled, pressed && styles.pressed]}
        >
          {acting === 'restore' ? <ActivityIndicator color={colors.text} /> : <Text style={styles.restoreText}>RESTAURER UN ACHAT</Text>}
        </Pressable>
        <Text style={styles.legal}>Paiement traité par l’App Store ou Google Play. Le prix final et la devise sont ceux affichés par le store. Un remboursement invalide uniquement les éléments de ce pack.</Text>
      </ScrollView>
    </Screen>
  );
}

function FounderItemCard({ index, item }: { index: number; item: FounderPackItem }) {
  const meta = ITEM_META[item.slot];
  return (
    <View style={styles.itemCard}>
      <LinearGradient colors={index % 2 ? ['#15130D', '#080C10'] : ['#1E1609', '#090D11']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.itemVisual}>
        <View style={[styles.itemAura, { backgroundColor: `${item.accent}18`, boxShadow: `0 0 24px ${item.accent}35` }]} />
        <Text style={[styles.itemGlyph, { color: item.accent }]}>{meta.glyph}</Text>
        <Text style={styles.itemSerial}>0{index + 1}/04</Text>
      </LinearGradient>
      <View style={styles.itemTopline}><Text style={styles.itemLabel}>{meta.label}</Text>{item.owned ? <Text style={styles.owned}>POSSÉDÉ</Text> : null}</View>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
    </View>
  );
}

function Guardrail({ detail, glyph, label }: { detail: string; glyph: string; label: string }) {
  return <View style={styles.guardrail}><Text style={styles.guardrailGlyph}>{glyph}</Text><View style={styles.guardrailCopy}><Text style={styles.guardrailLabel}>{label}</Text><Text style={styles.guardrailDetail}>{detail}</Text></View></View>;
}

function primaryAction(
  status: FounderPackStatus | null,
  store: FounderStoreSnapshot,
  acting: 'purchase' | 'restore' | null,
) {
  if (status?.packActive || store.entitlementActive) return { disabled: true, label: 'FOUNDER PACK ACTIF' };
  if (acting) return { disabled: true, label: 'VALIDATION…' };
  if (store.availability === 'ready') return { disabled: false, label: `DÉBLOQUER · ${store.localizedPrice || status?.indicativePrice || '4,99 €'}` };
  if (store.availability === 'configuration_required') return { disabled: true, label: 'CONFIGURATION TEST REQUISE' };
  if (store.availability === 'product_unavailable') return { disabled: true, label: 'PRODUIT STORE À CONFIGURER' };
  return { disabled: true, label: 'DISPONIBLE SUR IPHONE ET ANDROID' };
}

function friendlyError(value: unknown) {
  const message = value instanceof Error ? value.message : 'Le Founder Pack est indisponible.';
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connexion')) {
    return 'Connexion indisponible. Aucun paiement n’a été lancé.';
  }
  if (lower.includes('configuration') || lower.includes('api key') || lower.includes('clé revenuecat')) {
    return 'Le build de test doit encore recevoir ses clés RevenueCat.';
  }
  if (lower.includes('product') || lower.includes('produit')) {
    return 'Le produit clutch_founder_pack_v1 doit encore être publié dans le store de test.';
  }
  return message;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 44, gap: 16 },
  header: { minHeight: 70, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { minWidth: 72, height: 40, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#11161B', borderWidth: 1, borderColor: '#29323A' },
  backText: { ...typography.action, color: colors.textMuted, fontSize: 10 },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerEyebrow: { ...typography.eyebrow, color: '#B6944F', fontSize: 8, letterSpacing: .65 },
  headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 27, letterSpacing: -.4 },
  livePill: { minWidth: 46, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#17130B', borderWidth: 1, borderColor: '#6B5429' },
  livePillOwned: { backgroundColor: '#FFCB45' },
  liveText: { ...typography.label, color: '#D7AD55' },
  liveTextOwned: { color: '#080A0C' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 590, marginHorizontal: spacing.md, padding: 22, paddingTop: 28, alignItems: 'center', borderRadius: 32, borderWidth: 1, borderColor: '#6B5227' },
  heroGlowLarge: { position: 'absolute', top: -155, width: 410, height: 410, borderRadius: 205, backgroundColor: 'rgba(255,190,50,.12)', boxShadow: '0 0 75px rgba(255,190,50,.18)' },
  heroGlowSmall: { position: 'absolute', top: 82, width: 165, height: 165, borderRadius: 83, backgroundColor: 'rgba(255,220,129,.09)', boxShadow: '0 0 52px rgba(255,203,69,.24)' },
  orbit: { position: 'absolute', top: 49, width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: 'rgba(255,203,69,.25)', transform: [{ rotate: '-12deg' }] },
  orbitNode: { position: 'absolute', top: 17, right: 29, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFCB45', boxShadow: '0 0 13px #FFCB45' },
  founderSeal: { zIndex: 2, width: 162, height: 162, padding: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 53, backgroundColor: '#090B0E', borderWidth: 1, borderColor: '#80632F', transform: [{ rotate: '-5deg' }], boxShadow: '0 24px 46px rgba(0,0,0,.52)' },
  sealGradient: { position: 'relative', overflow: 'hidden', width: 145, height: 145, alignItems: 'center', justifyContent: 'center', borderRadius: 47 },
  sealLetter: { color: '#120D06', fontFamily: fonts.display, fontSize: 96, lineHeight: 104, letterSpacing: -4 },
  sealCutTop: { position: 'absolute', top: 15, left: 18, width: 48, height: 5, backgroundColor: 'rgba(255,255,255,.31)', transform: [{ rotate: '-18deg' }] },
  sealCutBottom: { position: 'absolute', right: 10, bottom: 23, width: 72, height: 8, backgroundColor: 'rgba(35,20,4,.31)', transform: [{ rotate: '25deg' }] },
  heroEyebrow: { ...typography.eyebrow, zIndex: 2, marginTop: 45, color: '#C8A45A', letterSpacing: 1.05 },
  heroTitle: { zIndex: 2, marginTop: 8, color: colors.text, fontFamily: fonts.display, fontSize: 45, lineHeight: 43, letterSpacing: -1.15, textAlign: 'center' },
  heroText: { ...typography.body, zIndex: 2, maxWidth: 330, marginTop: 13, color: '#B7B5AE', textAlign: 'center' },
  priceRow: { zIndex: 2, width: '100%', minHeight: 83, marginTop: 27, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 20, backgroundColor: 'rgba(5,8,10,.74)', borderWidth: 1, borderColor: '#3C3320' },
  priceLabel: { ...typography.eyebrow, color: '#88754D', fontSize: 8 },
  price: { marginTop: 1, color: '#FFDE83', fontFamily: fonts.display, fontSize: 31, lineHeight: 33 },
  once: { alignItems: 'flex-end' },
  onceLabel: { ...typography.eyebrow, color: '#FFCB45' },
  onceValue: { ...typography.label, marginTop: 3, color: colors.textMuted },
  stateNotice: { marginHorizontal: spacing.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: '#1A1110', borderWidth: 1, borderColor: '#64352D' },
  stateMark: { width: 38, color: '#FF9B83', fontFamily: fonts.display, fontSize: 29, textAlign: 'center' },
  stateCopy: { flex: 1 },
  stateTitle: { ...typography.label, color: '#FFB19F' },
  stateText: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  legacyNotice: { marginHorizontal: spacing.md, padding: 11, borderRadius: 16, backgroundColor: '#11160D', borderWidth: 1, borderColor: '#39461D' },
  legacyText: { ...typography.label, color: colors.volt, textAlign: 'center' },
  sectionHead: { marginHorizontal: spacing.md, marginTop: 6, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  sectionEyebrow: { ...typography.eyebrow, color: '#B6934D', letterSpacing: .7 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 3, color: colors.text },
  known: { ...typography.label, color: '#6F7880', textAlign: 'right' },
  loading: { minHeight: 270, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 26, backgroundColor: '#0A0E12', borderWidth: 1, borderColor: '#242C33' },
  loadingText: { ...typography.body, color: colors.textMuted },
  grid: { paddingHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemCard: { width: '48%', minHeight: 286, padding: 11, borderRadius: 23, backgroundColor: '#0A0E12', borderWidth: 1, borderColor: '#292A27' },
  itemVisual: { position: 'relative', overflow: 'hidden', height: 126, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#3D3420' },
  itemAura: { position: 'absolute', width: 88, height: 88, borderRadius: 44 },
  itemGlyph: { fontFamily: fonts.display, fontSize: 57, lineHeight: 62, textShadowColor: 'rgba(255,203,69,.32)', textShadowRadius: 14 },
  itemSerial: { position: 'absolute', right: 8, bottom: 6, ...typography.label, color: '#6B624F', fontSize: 8 },
  itemTopline: { minHeight: 20, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  itemLabel: { ...typography.eyebrow, color: '#B59452', fontSize: 8 },
  owned: { ...typography.label, color: colors.volt, fontSize: 8 },
  itemName: { ...typography.bodyStrong, minHeight: 40, marginTop: 3, color: colors.text },
  itemDescription: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  guardrails: { marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 23, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#283038' },
  guardrail: { minHeight: 67, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#263039' },
  guardrailGlyph: { width: 34, color: '#FFCB45', fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  guardrailCopy: { flex: 1 },
  guardrailLabel: { ...typography.label, color: colors.text },
  guardrailDetail: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  error: { marginHorizontal: spacing.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retry: { ...typography.action, color: '#FFCB45' },
  message: { ...typography.label, marginHorizontal: spacing.md, padding: 12, color: '#FFDE83', textAlign: 'center', borderRadius: 16, backgroundColor: '#17130A', borderWidth: 1, borderColor: '#594522' },
  primary: { minHeight: 57, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFCB45', boxShadow: '0 10px 30px rgba(255,203,69,.16)' },
  primaryDisabled: { backgroundColor: '#191D20', borderWidth: 1, borderColor: '#30373D', boxShadow: 'none' },
  primaryText: { ...typography.action, color: '#080A0C', fontSize: 14 },
  primaryTextDisabled: { color: '#737D85' },
  restore: { minHeight: 48, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#0D1216', borderWidth: 1, borderColor: '#39424A' },
  restoreDisabled: { opacity: .48 },
  restoreText: { ...typography.action, color: colors.text },
  legal: { ...typography.caption, marginHorizontal: 27, color: '#626C74', textAlign: 'center' },
  pressed: { opacity: .76, transform: [{ scale: .993 }] },
});
