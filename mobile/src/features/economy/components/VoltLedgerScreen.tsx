import { router } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadVoltLedger } from '../api';
import type { VoltLedger, VoltMovement, VoltMovementSource } from '../types';

type LoadMode = 'initial' | 'refresh' | 'more';

type SourceMeta = {
  label: string;
  glyph: string;
  tone: string;
  detail: string;
};

const PAGE_SIZE = 24;
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');
const SOURCE_META: Record<VoltMovementSource, SourceMeta> = {
  onboarding: { label: 'BIENVENUE', glyph: '✦', tone: colors.volt, detail: 'Entrée dans GRIFF' },
  progression: { label: 'PROGRESSION', glyph: '↗', tone: '#68B8FF', detail: 'Progression et saison' },
  mission: { label: 'MISSION', glyph: '◆', tone: '#A982FF', detail: 'Objectif accompli' },
  activation: { label: 'ACTIVATION', glyph: '◎', tone: '#FFB84D', detail: 'Participation validée' },
  exceptionnelle: { label: 'RÉCOMPENSE', glyph: '★', tone: '#FF75D8', detail: 'Attribution exceptionnelle' },
  achat_cosmetique: { label: 'LOCKER', glyph: '−', tone: '#FF8B66', detail: 'Objet cosmétique permanent' },
  ajustement: { label: 'AJUSTEMENT', glyph: '≈', tone: '#AAB4BE', detail: 'Correction du registre' },
};

type VoltLedgerScreenProps = {
  previewData?: VoltLedger;
};

export default function VoltLedgerScreen({ previewData }: VoltLedgerScreenProps) {
  const { refresh: refreshEconomy } = useEconomy();
  const [ledger, setLedger] = useState<VoltLedger | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const cursorRef = useRef<string | null>(null);

  const load = useCallback(async (mode: LoadMode) => {
    if (previewData) {
      setLedger(previewData);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      setError(null);
      return;
    }
    if (mode === 'more' && !cursorRef.current) return;

    const requestId = ++requestRef.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    setError(null);

    try {
      const ledgerPromise = loadVoltLedger(
        PAGE_SIZE,
        mode === 'more' ? cursorRef.current : null,
      );
      const economyPromise = mode === 'refresh' ? refreshEconomy() : Promise.resolve();
      const [nextLedger] = await Promise.all([ledgerPromise, economyPromise]);
      if (requestId !== requestRef.current) return;

      setLedger((current) => {
        const movements = mode === 'more' && current
          ? mergeMovements(current.movements, nextLedger.movements)
          : nextLedger.movements;
        cursorRef.current = nextLedger.hasMore
          ? movements[movements.length - 1]?.createdAt ?? null
          : null;
        return { ...nextLedger, movements };
      });
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(caught instanceof Error ? caught.message : 'Journal des Volts indisponible.');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [previewData, refreshEconomy]);

  useEffect(() => {
    void load('initial');
    return () => { requestRef.current += 1; };
  }, [load]);

  const movements = ledger?.movements ?? [];
  const renderMovement = useCallback(({ index, item }: ListRenderItemInfo<VoltMovement>) => (
    <MovementRow
      first={index === 0}
      last={index === movements.length - 1}
      movement={item}
    />
  ), [movements.length]);

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.content}
        data={movements}
        initialNumToRender={10}
        keyExtractor={(movement) => movement.id}
        ListEmptyComponent={(
          <LedgerEmpty
            error={error}
            ledger={ledger}
            loading={loading}
          />
        )}
        ListFooterComponent={(
          <LedgerFooter
            hasMore={ledger?.hasMore === true}
            loadingMore={loadingMore}
            onLoadMore={() => void load('more')}
          />
        )}
        ListHeaderComponent={(
          <LedgerHeader
            error={error}
            ledger={ledger}
            loading={loading}
            onRetry={() => void load('refresh')}
          />
        )}
        maxToRenderPerBatch={10}
        refreshControl={(
          <RefreshControl
            onRefresh={() => void load('refresh')}
            refreshing={refreshing}
            tintColor={colors.volt}
          />
        )}
        removeClippedSubviews
        renderItem={renderMovement}
        showsVerticalScrollIndicator={false}
        testID="volt-ledger-list"
        windowSize={7}
      />
    </Screen>
  );
}

function LedgerHeader({
  error,
  ledger,
  loading,
  onRetry,
}: {
  error: string | null;
  ledger: VoltLedger | null;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <View style={styles.headerStack}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Revenir au profil"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>← MOI</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>ÉCONOMIE PERSONNELLE</Text>
          <Text style={styles.headerTitle}>JOURNAL DES VOLTS</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>TRAÇABLE</Text></View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.currencyMark}><CurrencyIcon kind="volts" size={42} /></View>
          <Text style={styles.heroLabel}>SOLDE DISPONIBLE</Text>
        </View>
        {loading && !ledger ? (
          <SkeletonGroup style={styles.balanceSkeleton} testID="volt-balance-loading">
            <Skeleton height={58} radius="md" width={184} />
            <Skeleton height={9} radius="pill" width={58} />
          </SkeletonGroup>
        ) : (
          <>
            <Text accessibilityLabel={`${formatNumber(ledger?.balance ?? 0)} Volts disponibles`} style={styles.balance}>
              {formatNumber(ledger?.balance ?? 0)}
            </Text>
            <Text style={styles.balanceUnit}>VOLTS</Text>
          </>
        )}
        <Text style={styles.heroCopy}>Chaque gain et chaque dépense laisse une trace. Ton classement reste complètement séparé.</Text>
        <View style={styles.guardrailRow}>
          <Guardrail label="0 CONVERSION FRAGS" />
          <Guardrail label="0 IMPACT CLASSEMENT" />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>REGISTRE PERSONNEL</Text>
          <Text style={styles.sectionTitle}>TES MOUVEMENTS.</Text>
        </View>
        <Text style={styles.sectionMeta}>{ledger ? `${ledger.movements.length} AFFICHÉ${ledger.movements.length > 1 ? 'S' : ''}` : '—'}</Text>
      </View>

      {error ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorCard}>
          <View style={styles.errorCopy}><Text style={styles.errorTitle}>SYNCHRONISATION INTERROMPUE</Text><Text style={styles.errorText}>{error}</Text></View>
          <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function LedgerEmpty({
  error,
  ledger,
  loading,
}: {
  error: string | null;
  ledger: VoltLedger | null;
  loading: boolean;
}) {
  if (loading && !ledger) return <LedgerSkeleton />;
  if (error || !ledger) return null;

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyMark}><CurrencyIcon kind="volts" size={36} /></View>
      <Text style={styles.emptyEyebrow}>REGISTRE VIERGE</Text>
      <Text style={styles.emptyTitle}>Ton premier mouvement apparaîtra ici.</Text>
      <Text style={styles.emptyText}>Termine l’onboarding, progresse ou accomplis une mission pour recevoir tes premiers Volts.</Text>
    </View>
  );
}

function LedgerFooter({
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <View style={styles.footerStack}>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: loadingMore, disabled: loadingMore }}
          disabled={loadingMore}
          onPress={onLoadMore}
          style={({ pressed }) => [styles.moreButton, loadingMore && styles.disabled, pressed && styles.pressed]}
        >
          {loadingMore ? <ActivityIndicator color={colors.volt} size="small" /> : null}
          <Text style={styles.moreText}>{loadingMore ? 'CHARGEMENT…' : 'AFFICHER LA SUITE'}</Text>
        </Pressable>
      ) : null}

      <View style={styles.promiseCard}>
        <View style={styles.promiseMark}><Text style={styles.promiseGlyph}>◇</Text></View>
        <View style={styles.promiseCopy}>
          <Text style={styles.promiseEyebrow}>PACTE GRIFF</Text>
          <Text style={styles.promiseTitle}>L’identité du supporter. Jamais ses performances.</Text>
          <Text style={styles.promiseText}>Les Volts servent uniquement aux objets visuels connus à l’avance. Ils ne deviennent ni Frags, ni rang, ni avantage.</Text>
        </View>
      </View>
    </View>
  );
}

function Guardrail({ label }: { label: string }) {
  return <View style={styles.guardrail}><Text style={styles.guardrailGlyph}>✓</Text><Text style={styles.guardrailText}>{label}</Text></View>;
}

const MovementRow = memo(function MovementRow({
  first,
  last,
  movement,
}: {
  first: boolean;
  last: boolean;
  movement: VoltMovement;
}) {
  const meta = SOURCE_META[movement.source];
  const positive = movement.amount > 0;
  const title = movementTitle(movement);
  const detail = movement.object
    ? `LOCKER · ${humanize(movement.object.slot)}`
    : movement.campaignKey
      ? `CAMPAGNE · ${humanize(movement.campaignKey)}`
      : meta.detail;

  return (
    <View
      accessibilityLabel={`${meta.label}, ${title}, ${positive ? 'plus' : 'moins'} ${formatNumber(Math.abs(movement.amount))} Volts, solde ${formatNumber(movement.balanceAfter)}`}
      accessible
      style={[
        styles.movement,
        first && styles.movementFirst,
        !first && styles.movementBorder,
        last && styles.movementLast,
      ]}
    >
      <View style={[styles.movementMark, { borderColor: `${meta.tone}66`, backgroundColor: `${meta.tone}12` }]}>
        <Text style={[styles.movementGlyph, { color: meta.tone }]}>{meta.glyph}</Text>
      </View>
      <View style={styles.movementCopy}>
        <View style={styles.movementLabelRow}><Text style={[styles.movementLabel, { color: meta.tone }]}>{meta.label}</Text><Text style={styles.movementDate}>{formatDate(movement.createdAt)}</Text></View>
        <Text numberOfLines={1} style={styles.movementTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.movementDetail}>{detail}</Text>
      </View>
      <View style={styles.movementAmount}>
        <View style={styles.amountRow}><CurrencyIcon color={positive ? colors.volt : '#FF9B78'} kind="volts" size={13} /><Text style={[styles.amount, positive ? styles.credit : styles.debit]}>{positive ? '+' : '−'}{formatNumber(Math.abs(movement.amount))}</Text></View>
        <Text style={styles.balanceAfter}>SOLDE {formatNumber(movement.balanceAfter)}</Text>
      </View>
    </View>
  );
});

function LedgerSkeleton() {
  return (
    <SkeletonGroup
      label="Chargement du journal des Volts"
      style={styles.ledgerSkeleton}
      testID="volt-ledger-loading"
    >
      {[0, 1, 2, 3].map((item) => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          key={item}
          style={[styles.skeletonRow, item > 0 && styles.skeletonRowBorder]}
        >
          <Skeleton height={45} radius="md" width={45} />
          <View style={styles.skeletonCopy}>
            <Skeleton height={7} radius="pill" tone="subtle" width="38%" />
            <Skeleton height={12} radius="pill" width="76%" />
            <Skeleton height={8} radius="pill" tone="subtle" width="54%" />
          </View>
          <Skeleton height={24} radius="sm" width={55} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function movementTitle(movement: VoltMovement) {
  if (movement.object) return movement.object.name;
  if (movement.source === 'onboarding') return 'Bienvenue dans GRIFF';
  if (movement.source === 'mission') return 'Mission accomplie';
  if (movement.source === 'activation') return 'Participation validée';
  if (movement.source === 'exceptionnelle') return 'Récompense exceptionnelle';
  if (movement.source === 'ajustement') return 'Ajustement du registre';
  if (movement.origin === 'badge') return 'Badge débloqué';
  if (movement.origin === 'saison') return 'Progression de saison';
  if (movement.origin === 'faction') return 'Mutation de faction';
  if (movement.origin === 'call' || movement.origin === 'pari') return 'Progression Calls';
  return 'Progression GRIFF';
}

function mergeMovements(current: VoltMovement[], next: VoltMovement[]) {
  const seen = new Set(current.map((movement) => movement.id));
  return [...current, ...next.filter((movement) => !seen.has(movement.id))];
}

function humanize(value: string) {
  return value.replace(/[-_]+/g, ' ').trim().toUpperCase();
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'DATE INCONNUE';
  return DATE_FORMATTER.format(date).replace('.', '').toUpperCase();
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 54 },
  headerStack: { gap: 20, paddingBottom: 20 },
  footerStack: { gap: 20, paddingTop: 20 },
  header: { minHeight: 82, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#30414E' },
  back: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  backText: { ...typography.action, color: colors.text, letterSpacing: .5 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  headerTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.bold, fontSize: 15, letterSpacing: .6 },
  liveBadge: { minHeight: 32, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3A461D' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  liveText: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 300, marginHorizontal: spacing.md, padding: 22, borderRadius: 31, backgroundColor: '#0D130C', borderWidth: 1, borderColor: '#4A5822' },
  heroGlow: { position: 'absolute', width: 300, height: 300, right: -95, top: -110, borderRadius: 150, backgroundColor: colors.volt, opacity: .1 },
  heroTop: { zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  currencyMark: { width: 66, height: 66, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080D09', borderWidth: 1, borderColor: '#53621F', boxShadow: '0 0 22px rgba(232,255,61,.12)' },
  heroLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.1 },
  balance: { zIndex: 1, marginTop: 17, color: colors.text, fontFamily: fonts.display, fontSize: 68, lineHeight: 66, letterSpacing: -2.5 },
  balanceUnit: { zIndex: 1, marginTop: 2, color: colors.volt, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.2 },
  balanceSkeleton: { zIndex: 1, minHeight: 77, marginTop: 17, justifyContent: 'space-between' },
  heroCopy: { zIndex: 1, maxWidth: 345, marginTop: 14, ...typography.body, color: colors.textSubtle },
  guardrailRow: { zIndex: 1, marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  guardrail: { minHeight: 31, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, backgroundColor: '#080D09', borderWidth: 1, borderColor: '#29351A' },
  guardrailGlyph: { color: colors.volt, fontSize: 10, fontWeight: '900' },
  guardrailText: { ...typography.label, color: colors.textSubtle, letterSpacing: .25 },
  sectionHeading: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text },
  sectionMeta: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  errorCard: { marginHorizontal: spacing.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorCopy: { flex: 1 },
  errorTitle: { ...typography.eyebrow, color: '#FF9AA2' },
  errorText: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  retry: { ...typography.action, color: colors.volt },
  emptyCard: { minHeight: 230, marginHorizontal: spacing.md, padding: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border },
  emptyMark: { width: 58, height: 58, marginBottom: 15, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C0E', borderWidth: 1, borderColor: '#3A461D' },
  emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  emptyTitle: { ...typography.cardTitle, marginTop: 7, color: colors.text, textAlign: 'center' },
  emptyText: { ...typography.body, maxWidth: 330, marginTop: 7, color: colors.textMuted, textAlign: 'center' },
  movement: { minHeight: 92, marginHorizontal: spacing.md, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceLow, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderSubtle },
  movementFirst: { borderTopWidth: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  movementBorder: { borderTopWidth: 1, borderTopColor: '#30414E' },
  movementLast: { borderBottomWidth: 1, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  movementMark: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  movementGlyph: { fontSize: 16, fontWeight: '900' },
  movementCopy: { flex: 1, minWidth: 0 },
  movementLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  movementLabel: { ...typography.eyebrow, letterSpacing: .65 },
  movementDate: { ...typography.caption, color: '#69747E' },
  movementTitle: { ...typography.bodyStrong, marginTop: 4, color: colors.text },
  movementDetail: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  movementAmount: { minWidth: 70, alignItems: 'flex-end' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  credit: { color: colors.volt },
  debit: { color: '#FF9B78' },
  balanceAfter: { ...typography.caption, marginTop: 3, color: '#69747E' },
  ledgerSkeleton: { marginHorizontal: spacing.md, paddingHorizontal: 14, borderRadius: 25, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  skeletonRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 11 },
  skeletonRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  skeletonCopy: { flex: 1, minWidth: 0, gap: 7 },
  moreButton: { minHeight: 50, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 17, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3A461D' },
  moreText: { ...typography.action, color: colors.volt, letterSpacing: .55 },
  promiseCard: { marginHorizontal: spacing.md, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 13, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  promiseMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  promiseGlyph: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  promiseCopy: { flex: 1 },
  promiseEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .75 },
  promiseTitle: { ...typography.bodyStrong, marginTop: 4, color: colors.text },
  promiseText: { ...typography.caption, marginTop: 5, color: colors.textMuted },
  pressed: { opacity: .72, transform: [{ scale: .99 }] },
  disabled: { opacity: .55 },
});
