import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Check from 'lucide-react-native/icons/check';
import Flame from 'lucide-react-native/icons/flame';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { publicAppUrl } from '@/src/config/release';
import { prepareMilestoneShare } from '@/src/features/profile/showcaseSocial/api';
import { GrowthError, growthError } from '@/src/lib/growthErrors';
import { milestonePath } from '@/src/lib/publicLinks';
import { sharePublicLink } from '@/src/lib/share';
import { formatDateTime, formatNumber, t, type TranslationKey } from '@/src/lib/i18n';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import { CallStreakError, streakDayMessage } from '../model';
import { forgetProtectorPurchase, loadPendingProtectorPurchase, rememberProtectorPurchase } from '../purchaseOperation';
import { STREAK_MILESTONES, type CallStreakState, type StreakMilestone } from '../types';
import { useStreakCountdown } from './CallStreakCard';

export default function CallStreakScreen({ previewState }: { previewState?: CallStreakState } = {}) {
  const streak = useCallStreak();
  const refreshStreak = streak.refresh;
  const { showSnackbar } = useSnackbar();
  const [preview, setPreview] = useState(previewState);
  const state = preview ?? streak.state;
  const ownerId = state?.userId;
  const remaining = useStreakCountdown(state, preview ? monotonicNow() : streak.receivedAt);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(Boolean(previewState));
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [sharedMilestoneUrl, setSharedMilestoneUrl] = useState<string | null>(null);
  const mutationLock = useRef(false);
  const ownerRef = useRef(ownerId);
  const purchaseButton = useRef<View>(null);

  useEffect(() => { if (!previewState) void refreshStreak(); }, [previewState, refreshStreak]);
  useEffect(() => {
    ownerRef.current = ownerId;
    setSheetVisible(false);
    setPendingOperation(null);
    setStorageReady(Boolean(previewState));
    setMutationError(null);
    setBusy(false);
    setSharedMilestoneUrl(null);
    mutationLock.current = false;
    let active = true;
    if (ownerId && !previewState) {
      void loadPendingProtectorPurchase(ownerId).then((operation) => {
        if (active) { setPendingOperation(operation); setStorageReady(true); }
      }).catch(() => { if (active) setMutationError(t('streak.error.storage')); });
    }
    return () => { active = false; ownerRef.current = undefined; };
  }, [ownerId, previewState, storageAttempt]);

  async function confirmPurchase() {
    if (!state || !storageReady || mutationLock.current) return;
    if (preview) {
      setPreview({ ...preview, protectors: Math.min(2, preview.protectors + 1), volts: preview.volts - preview.protectorPrice });
      setSheetVisible(false);
      showSnackbar({ message: t('streak.preview'), tone: 'info' });
      return;
    }
    const owner = state.userId;
    const operation = pendingOperation ?? state.purchaseOperationId;
    mutationLock.current = true;
    setBusy(true);
    setMutationError(null);
    let remembered = false;
    try {
      await rememberProtectorPurchase(owner, operation);
      remembered = true;
      if (ownerRef.current !== owner) return;
      setPendingOperation(operation);
      const receipt = await streak.purchase(operation);
      // A storage failure after server success leaves the key in place: replay
      // is harmless, whereas forgetting an uncertain debit would not be.
      await forgetProtectorPurchase(owner, operation);
      if (ownerRef.current !== owner) return;
      setPendingOperation(null);
      setSheetVisible(false);
      showSnackbar({ message: t(receipt.purchased ? 'streak.protector.purchased' : 'streak.protector.replayed'), tone: 'success' });
    } catch (caught) {
      if (caught instanceof CallStreakError && caught.definitive) {
        await forgetProtectorPurchase(owner, operation).catch(() => undefined);
        if (ownerRef.current === owner) setPendingOperation(null);
      }
      if (ownerRef.current === owner) setMutationError(!remembered ? t('streak.error.storage')
        : caught instanceof CallStreakError ? caught.message : t('streak.protector.pending'));
    } finally {
      if (ownerRef.current === owner) { mutationLock.current = false; setBusy(false); }
    }
  }

  async function chooseMilestone(days: StreakMilestone | null) {
    if (mutationLock.current || !state) return;
    setSharedMilestoneUrl(null);
    if (preview) { setPreview({ ...preview, selectedMilestone: days }); return; }
    const owner = state.userId;
    mutationLock.current = true;
    setBusy(true);
    setMutationError(null);
    try { await streak.selectMilestone(days); }
    catch (caught) { if (ownerRef.current === owner) setMutationError(caught instanceof Error ? caught.message : t('streak.error.unavailable')); }
    finally { if (ownerRef.current === owner) { mutationLock.current = false; setBusy(false); } }
  }

  async function shareMilestone() {
    if (!state?.selectedMilestone || mutationLock.current) return;
    if (preview) { showSnackbar({ message: t('growth.preview'), tone: 'info' }); return; }
    const owner = state.userId;
    mutationLock.current = true; setBusy(true); setMutationError(null); setSharedMilestoneUrl(null);
    try {
      const verified = await prepareMilestoneShare(state.selectedMilestone, owner);
      if (ownerRef.current !== owner) return;
      const path = milestonePath(verified.pseudo, verified.milestone);
      const url = path ? publicAppUrl(path) : null;
      if (!url) throw new GrowthError('public_origin_missing');
      setSharedMilestoneUrl(url);
      const outcome = await sharePublicLink(t('milestone.title', { count: verified.milestone }), t('streak.milestone.share', { count: verified.milestone }), url);
      if (ownerRef.current === owner && outcome === 'copied') showSnackbar({ message: t('growth.share.copied'), tone: 'success' });
    } catch (caught) { if (ownerRef.current === owner) setMutationError(growthError(caught)); }
    finally { if (ownerRef.current === owner) { mutationLock.current = false; setBusy(false); } }
  }

  const error = mutationError ?? (!preview ? streak.error : null);
  const canPurchase = Boolean(state && storageReady && !busy && (pendingOperation || (state.protectors < state.maxProtectors && state.volts >= state.protectorPrice)));
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={!preview ? <RefreshControl refreshing={streak.loading} onRefresh={() => { void streak.refresh(true); }} tintColor={colors.volt} /> : undefined}>
        <View style={styles.header}>
          <Button label={t('streak.back')} variant="ghost" onPress={() => router.back()} leading={<ArrowLeft size={20} color={colors.text} />} />
          {preview ? <Text style={styles.meta}>{t('streak.preview')}</Text> : null}
        </View>
        <View style={styles.intro}><Text style={styles.eyebrow}>{t('streak.eyebrow')}</Text><Text accessibilityRole="header" style={styles.title}>{t('streak.title')}</Text><Text style={styles.body}>{t('streak.description')}</Text></View>
        {error ? <View accessibilityRole="alert" style={styles.panel}><Text style={styles.body}>{error}</Text><Button label={t('common.retry')} variant="secondary" onPress={() => {
          void streak.refresh(true);
          if (!storageReady) setStorageAttempt((attempt) => attempt + 1);
        }} /></View> : null}
        {!state ? streak.loading ? <ActivityIndicator color={colors.volt} /> : null : (
          <>
            <View style={styles.panel} testID="streak-summary">
              <View style={styles.hero}><Flame size={40} color={colors.volt} /><Text style={styles.count}>{formatNumber(state.current)}</Text><Text style={styles.eyebrow}>{t('streak.dayUnit', { count: state.current })}</Text></View>
              <Text style={[styles.status, state.todayValidated && styles.accent]}>{streakDayMessage(state)}</Text>
              {!state.todayValidated ? <Text style={styles.meta}>{t('streak.day.end', { time: remaining })}</Text> : null}
              <Text style={styles.meta}>{t('streak.timeZone', { zone: state.timeZone })}</Text>
              <Button fullWidth label={t(!state.todayValidated && state.eligibleMatchId ? 'streak.call' : 'streak.matches')}
                onPress={() => router.push(!preview && !state.todayValidated && state.eligibleMatchId ? `/match/${encodeURIComponent(state.eligibleMatchId)}` as never : '/(tabs)/matches')} />
              <View style={styles.stats}><Metric value={state.best} label={t('streak.best')} /><Metric value={state.totalValidatedDays} label={t('streak.total')} /></View>
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t('streak.calendar')}</Text>
              <View style={styles.calendar}>
                {state.history.map((day) => (
                  <View key={day.day} accessible accessibilityLabel={t('streak.calendar.label', { date: day.day, status: t(`streak.calendar.${day.status}`), count: day.calls })}
                    style={[styles.day, day.status === 'valide' && styles.validDay, day.status === 'protege' && styles.protectedDay]}>
                    <Text style={styles.meta}>{day.day.slice(-2)}</Text>
                    {day.status === 'valide' ? <Check color={colors.volt} size={20} /> : day.status === 'protege' ? <ShieldCheck color={colors.info} size={20} /> : <Text style={styles.meta}>{day.status === 'neutre' || day.status === 'inactif' ? '—' : day.status === 'manque' ? '×' : '·'}</Text>}
                  </View>
                ))}
              </View>
              <View style={styles.legend}><Text style={styles.meta}>✓ {t('streak.calendar.valide')}</Text><Text style={styles.meta}>◇ {t('streak.calendar.protege')}</Text><Text style={styles.meta}>— {t('streak.calendar.neutre')}</Text></View>
            </View>
            <View style={styles.panel} testID="streak-protector-panel">
              <View style={styles.heading}><ShieldCheck color={colors.volt} size={26} /><Text style={styles.sectionTitle}>{t('streak.protector.title')}</Text></View>
              <Text style={styles.status}>{t('streak.protector.stock', { count: state.protectors, max: state.maxProtectors })}</Text>
              <Text style={styles.body}>{t('streak.protector.welcome')}</Text>
              <Text style={styles.body}>{t('streak.protector.rules')}</Text>
              {state.protectionUsed ? <Text style={styles.meta}>{t('streak.protector.used')}</Text> : state.protectors > 0 ? <Text style={styles.accent}>{t('streak.protector.available')}</Text> : null}
              {pendingOperation ? <Text style={styles.body}>{t('streak.protector.pending')}</Text> : null}
              <Button fullWidth disabled={!canPurchase} ref={purchaseButton} testID="streak-buy-protector"
                label={t(pendingOperation ? 'streak.protector.verify' : state.protectors >= 2 ? 'streak.protector.full' : 'streak.protector.buy', { price: state.protectorPrice })}
                onPress={() => { setMutationError(null); setSheetVisible(true); }} />
              <Text style={styles.meta}>{t('economy.availableBalanceLabel', { amount: formatNumber(state.volts) })}</Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t('streak.milestones')}</Text>
              <Text style={styles.body}>{t('streak.milestone.description')}</Text>
              <View style={styles.milestones}>
                {STREAK_MILESTONES.map((days) => {
                  const earned = state.milestones.some((milestone) => milestone.days === days);
                  const selected = state.selectedMilestone === days;
                  return <Pressable key={days} accessibilityRole="button" accessibilityLabel={t('streak.milestone.choose', { count: days })}
                    accessibilityState={{ disabled: !earned || busy, selected }} disabled={!earned || busy}
                    onPress={() => { void chooseMilestone(days); }} style={[styles.milestone, selected && styles.selectedMilestone, !earned && styles.locked]}>
                    <Flame color={selected ? colors.volt : colors.textSecondary} size={24} /><Text style={styles.meta}>{t(selected ? 'streak.milestone.selected' : 'streak.days', { count: days })}</Text>
                  </Pressable>;
                })}
              </View>
              {state.selectedMilestone ? <><Button fullWidth variant="secondary" disabled={busy} label={t('streak.share')} onPress={() => { void shareMilestone(); }} /><Button fullWidth variant="ghost" disabled={busy} label={t('streak.milestone.none')} onPress={() => { void chooseMilestone(null); }} /></> : null}
              {sharedMilestoneUrl ? <Text selectable style={styles.meta}>{sharedMilestoneUrl}</Text> : null}
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t('streak.protector.history')}</Text>
              {state.protectorHistory.map((movement) => <View key={movement.id} style={styles.historyRow}>
                <View style={styles.historyCopy}><Text style={styles.body}>{t(`streak.protector.${movement.kind}` as TranslationKey)}</Text><Text style={styles.meta}>{formatDateTime(movement.createdAt, state.timeZone)}</Text></View>
                <Text style={styles.accent}>{movement.quantity > 0 ? '+1' : '−1'}</Text>
              </View>)}
              <Button fullWidth variant="ghost" label={t('streak.notifications')} onPress={() => router.push(preview ? '/settings-preview' : '/settings/profile')} />
            </View>
          </>
        )}
      </ScrollView>
      <BaseSheet visible={sheetVisible && Boolean(state)} title={t(pendingOperation ? 'streak.protector.verify' : 'streak.protector.confirmTitle')}
        dismissible={!busy} onClose={() => setSheetVisible(false)} returnFocusRef={purchaseButton}
        footer={<View style={styles.actions}><Button fullWidth loading={busy} disabled={!canPurchase} onPress={() => { void confirmPurchase(); }}
          label={t(pendingOperation ? 'streak.protector.verify' : 'streak.protector.confirm', { price: state?.protectorPrice ?? 90 })} testID="streak-confirm-protector" />
          <Button fullWidth variant="ghost" disabled={busy} onPress={() => setSheetVisible(false)} label={t('common.cancel')} /></View>}>
        <View style={styles.actions}><Text style={styles.body}>{t(pendingOperation ? 'streak.protector.pending' : 'streak.protector.rules')}</Text>
          {state && !pendingOperation ? <Text style={styles.status}>{t('streak.protector.balance', { before: formatNumber(state.volts), after: formatNumber(Math.max(0, state.volts - state.protectorPrice)) })}</Text> : null}
          {mutationError ? <Text accessibilityRole="alert" style={styles.body}>{mutationError}</Text> : null}</View>
      </BaseSheet>
    </Screen>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{formatNumber(value)}</Text><Text style={styles.meta}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  intro: { gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.volt },
  title: { ...typography.displayMedium, color: colors.text },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, flexShrink: 1 },
  body: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textSecondary },
  panel: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: colors.surfaceLow },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { ...typography.displayLarge, color: colors.text },
  status: { ...typography.bodyStrong, color: colors.text },
  accent: { ...typography.control, color: colors.volt },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.borderSubtle, paddingTop: spacing.md },
  metric: { flex: 1, gap: spacing.xs },
  metricValue: { ...typography.metricLarge, color: colors.text },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  day: { width: '13%', minHeight: 60, gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  validDay: { borderColor: colors.volt, backgroundColor: colors.surfaceInteractive },
  protectedDay: { borderColor: colors.info },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  milestones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  milestone: { width: '30%', minHeight: 86, gap: spacing.sm, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong },
  selectedMilestone: { borderColor: colors.volt, backgroundColor: colors.surfaceInteractive },
  locked: { opacity: 0.4 },
  historyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  historyCopy: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.md },
});
