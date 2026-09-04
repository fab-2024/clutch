import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Activity from 'lucide-react-native/icons/activity';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DetailScreen, detailStyles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { formatDateTime, formatNumber, t } from '@/src/lib/i18n';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { colors, radius, spacing, typography } from '@/src/theme';

import { loadVisualConsumables, runConsumableOperation } from '../api';
import { VISUAL_CONSUMABLE_CATALOG, visualConsumableCatalogItem } from '../catalog';
import { ConsumableError, consumableErrorMessage, effectIsActive, remainingEffectLabel } from '../model';
import {
  forgetPendingConsumableOperation,
  loadPendingConsumableOperation,
  newConsumableOperationId,
  rememberPendingConsumableOperation,
} from '../pendingOperation';
import type { ConsumableAction, PendingConsumableOperation, VisualConsumable, VisualConsumablesState, VisualConsumableType } from '../types';

type Confirmation = { action: ConsumableAction; type: VisualConsumableType };

const PREVIEW_OWNER = '00000000-0000-4000-8000-000000000003';
export const PREVIEW_VISUAL_CONSUMABLES: VisualConsumablesState = {
  ownerId: PREVIEW_OWNER,
  balanceVolts: 320,
  items: [
    { type: 'showcase_spotlight', stock: 1, maxStock: 3, priceVolts: 60, activeUntil: new Date(Date.now() + 8 * 60 * 60_000).toISOString() },
    { type: 'profile_pulse', stock: 2, maxStock: 3, priceVolts: 45, activeUntil: null },
  ],
  history: [],
  affectsRanking: false,
  convertsToFrags: false,
  receivedAt: Date.now(),
};

export default function VisualConsumablesScreen({ previewState }: { previewState?: VisualConsumablesState } = {}) {
  const { session } = useAuth();
  const ownerId = previewState?.ownerId ?? session?.user.id ?? '';
  const economy = useEconomy();
  const load = useCallback(() => previewState
    ? Promise.resolve({ ...previewState, receivedAt: Date.now() })
    : loadVisualConsumables(ownerId), [ownerId, previewState]);
  const resource = useScreenResource(load);
  const setResourceError = resource.setError;
  const [pending, setPending] = useState<PendingConsumableOperation | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!ownerId || previewState) return;
    loadPendingConsumableOperation(ownerId)
      .then((operation) => { if (active) setPending(operation); })
      .catch(() => { if (active) setResourceError(t('consumables.error.storage')); });
    return () => { active = false; };
  }, [ownerId, previewState, setResourceError]);

  async function execute(operation: PendingConsumableOperation) {
    if (!resource.data || busy) return;
    setBusy(true);
    setNotice(null);
    setResourceError(null);
    try {
      if (previewState) {
        const next = previewOperation(resource.data, operation);
        resource.setData(next);
        setPending(null);
        setConfirmation(null);
        setNotice(t(operation.action === 'purchase' ? 'consumables.purchased' : 'consumables.activated', {
          name: t(visualConsumableCatalogItem(operation.type).nameKey),
        }));
        return;
      }
      const receipt = await runConsumableOperation(ownerId, operation.type, operation.action, operation.operationId);
      await forgetPendingConsumableOperation(ownerId, operation.operationId);
      setPending(null);
      setConfirmation(null);
      resource.setData(receipt.state);
      economy.setConfirmedVolts(ownerId, receipt.state.balanceVolts);
      setNotice(receipt.applied
        ? t(operation.action === 'purchase' ? 'consumables.purchased' : 'consumables.activated', {
          name: t(visualConsumableCatalogItem(operation.type).nameKey),
        })
        : t('consumables.replayed'));
    } catch (caught) {
      if (caught instanceof ConsumableError && caught.definitive && !previewState) {
        await forgetPendingConsumableOperation(ownerId, operation.operationId).catch(() => undefined);
        setPending(null);
      } else {
        setPending(operation);
      }
      setResourceError(consumableErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!confirmation || !ownerId || busy || pending) return;
    const operation: PendingConsumableOperation = {
      ...confirmation,
      operationId: newConsumableOperationId(),
    };
    if (!previewState) {
      try {
        await rememberPendingConsumableOperation(ownerId, operation);
      } catch {
        setResourceError(t('consumables.error.storage'));
        return;
      }
    }
    setPending(operation);
    await execute(operation);
  }

  const confirmationItem = confirmation && resource.data?.items.find((item) => item.type === confirmation.type);
  return <DetailScreen
    title={t('consumables.title')}
    eyebrow={t('consumables.eyebrow')}
    subtitle={t('consumables.description')}
    loading={resource.loading}
    error={resource.error}
    onRefresh={() => { if (!busy) void resource.refresh(); }}
  >
    {previewState ? <Text style={styles.preview}>{t('consumables.preview')}</Text> : null}
    {resource.data ? <>
      <View style={styles.wallet}>
        <Text style={styles.walletLabel}>{t('economy.availableBalance')}</Text>
        <Text style={styles.walletValue}>{t('consumables.balance', { count: formatNumber(resource.data.balanceVolts) })}</Text>
        <View style={styles.integrity}><Text style={styles.integrityText}>{t('economy.noRankingImpact')}</Text><Text style={styles.integrityText}>{t('economy.noFragsConversion')}</Text></View>
      </View>
      {pending ? <View accessibilityRole="alert" style={styles.pending}>
        <Text style={styles.cardTitle}>{t('consumables.pending')}</Text>
        <Button fullWidth loading={busy} label={t('consumables.verify')} onPress={() => { void execute(pending); }} />
      </View> : null}
      <View style={styles.catalog}>
        {resource.data.items.map((item) => <ConsumableCard
          key={item.type}
          balanceVolts={resource.data!.balanceVolts}
          item={item}
          disabled={busy || Boolean(pending)}
          onAction={(action) => setConfirmation({ type: item.type, action })}
        />)}
      </View>
      {confirmation && confirmationItem ? <ConfirmationCard
        action={confirmation.action}
        item={confirmationItem}
        busy={busy}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => { void confirm(); }}
      /> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      <View style={detailStyles.intro}>
        <Text style={detailStyles.heading}>{t('consumables.history')}</Text>
        {!resource.data.history.length ? <View style={detailStyles.panel}><Text style={detailStyles.body}>{t('consumables.history.empty')}</Text></View>
          : resource.data.history.map((entry) => <View key={entry.id} style={styles.historyRow}>
            <Text style={styles.historyTitle}>{t(entry.action === 'purchase' ? 'consumables.history.purchase' : 'consumables.history.activation', {
              name: t(visualConsumableCatalogItem(entry.type).nameKey),
            })}</Text>
            <Text style={styles.historyDate}>{formatDateTime(entry.createdAt)}</Text>
          </View>)}
      </View>
    </> : null}
  </DetailScreen>;
}

function ConsumableCard({ item, balanceVolts, disabled, onAction }: { item: VisualConsumable; balanceVolts: number; disabled: boolean; onAction: (action: ConsumableAction) => void }) {
  const catalog = visualConsumableCatalogItem(item.type);
  const active = effectIsActive(item);
  const Icon = item.type === 'showcase_spotlight' ? Sparkles : Activity;
  return <LinearGradient colors={[`${catalog.accent}20`, colors.surfaceLow]} style={[styles.card, { borderColor: `${catalog.accent}99` }]}>
    <View style={styles.cardTop}>
      <View style={[styles.effectIcon, { backgroundColor: `${catalog.accent}22`, borderColor: catalog.accent }]}><Icon color={catalog.accent} size={28} strokeWidth={1.8} /></View>
      <View style={styles.cardCopy}><Text style={styles.cardTitle}>{t(catalog.nameKey)}</Text>
        <Text style={styles.stock}>{t('consumables.stock', { count: item.stock, max: item.maxStock })}</Text></View>
    </View>
    <Text style={styles.description}>{t(catalog.descriptionKey)}</Text>
    <Text style={[styles.effectStatus, active && { color: catalog.accent }]}>{active && item.activeUntil
      ? t('consumables.active', { time: remainingEffectLabel(item.activeUntil) })
      : item.stock ? t('consumables.inactive') : t('consumables.noStock')}</Text>
    <View style={styles.actions}>
      <Button disabled={disabled || item.stock >= item.maxStock || balanceVolts < item.priceVolts} label={item.stock >= item.maxStock
        ? t('consumables.full') : t('consumables.buy', { price: item.priceVolts })} onPress={() => onAction('purchase')} variant="secondary" />
      <Button disabled={disabled || !item.stock || active} label={t('consumables.activate')} onPress={() => onAction('activation')} />
    </View>
  </LinearGradient>;
}

function ConfirmationCard({ action, item, busy, onCancel, onConfirm }: {
  action: ConsumableAction;
  item: VisualConsumable;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = t(visualConsumableCatalogItem(item.type).nameKey);
  return <View accessibilityViewIsModal style={styles.confirmation} testID="consumable-confirmation">
    <Text style={styles.cardTitle}>{t(action === 'purchase' ? 'consumables.buyConfirm' : 'consumables.activateConfirm', { name })}</Text>
    <Text style={styles.description}>{action === 'purchase' ? t('consumables.description') : t(visualConsumableCatalogItem(item.type).descriptionKey)}</Text>
    <View style={styles.actions}>
      <Button disabled={busy} label={t('consumables.cancel')} onPress={onCancel} variant="ghost" />
      <Button loading={busy} label={action === 'purchase'
        ? t('consumables.confirmBuy', { price: item.priceVolts })
        : t('consumables.confirmActivate')} onPress={onConfirm} />
    </View>
  </View>;
}

function previewOperation(state: VisualConsumablesState, operation: PendingConsumableOperation): VisualConsumablesState {
  const catalog = state.items.find((item) => item.type === operation.type)!;
  const item = operation.action === 'purchase'
    ? { ...catalog, stock: Math.min(catalog.maxStock, catalog.stock + 1) }
    : { ...catalog, stock: Math.max(0, catalog.stock - 1), activeUntil: new Date(Date.now() + 24 * 60 * 60_000).toISOString() };
  return {
    ...state,
    balanceVolts: operation.action === 'purchase' ? Math.max(0, state.balanceVolts - catalog.priceVolts) : state.balanceVolts,
    items: state.items.map((entry) => entry.type === item.type ? item : entry),
    history: [{ id: newConsumableOperationId(), ...operation, createdAt: new Date().toISOString() }, ...state.history],
    receivedAt: Date.now(),
  };
}

export function VisualConsumablesEntryCard({ preview = false }: { preview?: boolean }) {
  const summary = VISUAL_CONSUMABLE_CATALOG.map((item) => t(item.nameKey)).join(' · ');
  return <Pressable accessibilityRole="button" accessibilityLabel={t('consumables.entry')}
    onPress={() => router.push(preview ? '/consumables-preview' : '/consumables')}
    style={({ pressed }) => [styles.entry, pressed && styles.pressed]} testID="store-visual-consumables">
    <View style={styles.entryIcons}><Sparkles color={colors.volt} size={28} /><Activity color="#E879F9" size={24} /></View>
    <View style={styles.cardCopy}><Text style={styles.cardTitle}>{t('consumables.entry')}</Text>
      <Text numberOfLines={2} style={styles.description}>{t('consumables.entryDetail')}</Text>
      <Text numberOfLines={1} style={styles.entrySummary}>{summary}</Text></View>
    <Text style={styles.open}>{t('consumables.open')} →</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  preview: { ...typography.eyebrow, color: colors.info },
  wallet: { padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
  walletLabel: { ...typography.eyebrow, color: colors.textSecondary },
  walletValue: { ...typography.metricLarge, color: colors.volt },
  integrity: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  integrityText: { ...typography.metadata, color: colors.success },
  pending: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.volt },
  catalog: { gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  effectIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1 },
  cardCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  cardTitle: { ...typography.cardTitle, color: colors.text },
  stock: { ...typography.metadata, color: colors.textSecondary },
  description: { ...typography.bodyComfort, color: colors.textSecondary },
  effectStatus: { ...typography.action, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  confirmation: { padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.backgroundDeep, borderWidth: 1, borderColor: colors.volt },
  notice: { ...typography.bodyStrong, padding: spacing.md, color: colors.success, borderRadius: radius.md, backgroundColor: colors.surfaceLow },
  historyRow: { padding: spacing.md, gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  historyTitle: { ...typography.bodyStrong, color: colors.text },
  historyDate: { ...typography.metadata, color: colors.textSecondary },
  entry: { minHeight: 112, margin: spacing.md, marginTop: spacing.xs, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderStrong },
  entryIcons: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  entrySummary: { ...typography.metadata, color: colors.textMuted },
  open: { ...typography.action, color: colors.volt },
  pressed: { opacity: 0.72 },
});
