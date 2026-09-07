import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { publicAppUrl } from '@/src/config/release';
import { prepareMilestoneShare } from '@/src/features/profile/showcaseSocial/api';
import { GrowthError, growthError } from '@/src/lib/growthErrors';
import { milestonePath } from '@/src/lib/publicLinks';
import { sharePublicLink } from '@/src/lib/share';
import { formatDateTime, formatNumber, t, type TranslationKey } from '@/src/lib/i18n';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import { CallStreakError, streakDayMessage } from '../model';
import { forgetProtectorPurchase, loadPendingProtectorPurchase, rememberProtectorPurchase } from '../purchaseOperation';
import type { CallStreakState, StreakMilestone } from '../types';
import { CallStreakCalendar } from './CallStreakCalendar';
import { useStreakCountdown } from './CallStreakCard';
import { CallStreakFlame, CallStreakGlow } from './CallStreakFlame';
import { CallStreakMilestones } from './CallStreakMilestones';

export default function CallStreakScreen({ previewState }: { previewState?: CallStreakState } = {}) {
  const streak = useCallStreak();
  const { unlimitedVolts } = useEconomy();
  const refreshStreak = streak.refresh;
  const { showSnackbar } = useSnackbar();
  const [preview, setPreview] = useState(previewState);
  const state = preview ?? streak.state;
  const ownerId = state?.userId;
  const [previewReceivedAt] = useState(monotonicNow);
  const remaining = useStreakCountdown(state, preview ? previewReceivedAt : streak.receivedAt);
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const [detailsVisible, setDetailsVisible] = useState(false);
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
    <Screen atmosphere="none" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={!preview ? <RefreshControl refreshing={streak.loading} onRefresh={() => { void streak.refresh(true); }} tintColor={colors.volt} /> : undefined}>
        <CallStreakGlow />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('streak.back')} onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{t('streak.screenTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        {error ? <View accessibilityRole="alert" style={styles.panel}><Text style={styles.body}>{error}</Text><Button label={t('common.retry')} variant="secondary" onPress={() => {
          void streak.refresh(true);
          if (!storageReady) setStorageAttempt((attempt) => attempt + 1);
        }} /></View> : null}
        {!state ? streak.loading ? <ActivityIndicator color={colors.volt} /> : null : (
          <>
            <View style={styles.summary} testID="streak-summary">
              <View style={styles.hero}>
                <CallStreakFlame height={isShortLandscape ? 112 : isCompactWidth ? 156 : 176} />
                <Text style={styles.flameLabel}>{t('streak.flame')}</Text>
                <Text style={[styles.count, state.current >= 100 && styles.countLong]}>{formatNumber(state.current)}</Text>
                <Text style={styles.dayUnit}>{t('streak.dayUnit', { count: state.current })}</Text>
              </View>
              <View style={styles.dayMessage}>
                <Text style={[styles.status, state.todayValidated && styles.accent]}>
                  {!state.todayValidated && state.eligibleMatchId ? t('streak.keepAlive') : streakDayMessage(state)}
                </Text>
                {!state.todayValidated ? <Text style={styles.meta}>{t('streak.day.end', { time: remaining })}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" testID="streak-call"
                onPress={() => router.push(preview ? '/matches-preview'
                  : !state.todayValidated && state.eligibleMatchId ? `/match/${encodeURIComponent(state.eligibleMatchId)}` as never : '/(tabs)/matches')}
                style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
                <Text style={styles.callButtonText}>{t(!state.todayValidated && state.eligibleMatchId ? 'streak.call' : 'streak.matches')}</Text>
              </Pressable>
              <View style={styles.stats}>
                <Metric value={formatNumber(state.best)} label={t('streak.best')} unit={t('streak.dayUnit', { count: state.best })} />
                <View style={styles.statDivider} />
                <Metric value={`${state.protectors} / ${state.maxProtectors}`} label={t('streak.protector.short')} />
              </View>
            </View>
            <CallStreakCalendar state={state} />
            <View style={styles.protectorPanel} testID="streak-protector-panel">
              <View style={styles.protectorRow}>
                <View style={styles.shield}><ShieldCheck color={colors.volt} size={25} /></View>
                <View style={styles.protectorCopy}>
                  <Text style={styles.protectorTitle}>{t('streak.protector.title')}</Text>
                  <Text style={styles.accent}>{t('streak.protector.stockAvailable', { count: state.protectors, max: state.maxProtectors })}</Text>
                </View>
                <Pressable disabled={!canPurchase} ref={purchaseButton} testID="streak-buy-protector"
                  accessibilityRole="button" accessibilityState={{ disabled: !canPurchase, busy }}
                  onPress={() => { setMutationError(null); setSheetVisible(true); }}
                  style={({ pressed }) => [styles.purchaseButton, !canPurchase && styles.purchaseDisabled, pressed && styles.pressed]}>
                  <Text style={[styles.purchaseText, !canPurchase && styles.disabledText]}>
                    {t(pendingOperation ? 'streak.protector.verify' : state.protectors >= state.maxProtectors ? 'streak.protector.full' : 'streak.protector.buy', { price: state.protectorPrice })}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.protectorDescription}>{t('streak.protector.summary')}</Text>
              {state.protectionUsed ? <Text style={styles.meta}>{t('streak.protector.used')}</Text> : null}
              {pendingOperation ? <Text style={styles.body}>{t('streak.protector.pending')}</Text> : null}
              {!canPurchase && state.protectors < state.maxProtectors && !busy ? <Text style={styles.meta}>{!preview && unlimitedVolts ? t('economy.unlimitedBalanceLabel') : t('economy.availableBalanceLabel', { amount: formatNumber(state.volts) })}</Text> : null}
            </View>
            <View style={styles.panel}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>{t('streak.milestones')}</Text>
              <CallStreakMilestones state={state} busy={busy} onChoose={(days) => { void chooseMilestone(days); }} />
              <Text style={styles.meta}>{t('streak.milestone.browse')}</Text>
              {state.selectedMilestone ? <><Text style={styles.meta}>{t('streak.milestone.description')}</Text><Button fullWidth variant="secondary" disabled={busy} label={t('streak.share')} onPress={() => { void shareMilestone(); }} /><Button fullWidth variant="ghost" disabled={busy} label={t('streak.milestone.none')} onPress={() => { void chooseMilestone(null); }} /></> : null}
              {sharedMilestoneUrl ? <Text selectable style={styles.meta}>{sharedMilestoneUrl}</Text> : null}
            </View>
            <View style={styles.details}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsVisible }} onPress={() => setDetailsVisible((visible) => !visible)}
                style={styles.detailsToggle}>
                <Text style={styles.meta}>{t('streak.details')}</Text>
                <ChevronRight color={colors.textSecondary} size={17} style={{ transform: [{ rotate: detailsVisible ? '90deg' : '0deg' }] }} />
              </Pressable>
              {detailsVisible ? <View style={styles.actions}>
                <Text style={styles.body}>{t('streak.description')}</Text>
                <Text style={styles.meta}>{t('streak.total')} · {formatNumber(state.totalValidatedDays)}</Text>
                <Text style={styles.meta}>{t('streak.timeZone', { zone: state.timeZone })}</Text>
                <Text style={styles.body}>{t('streak.protector.rules')}</Text>
                <Text style={styles.sectionTitle}>{t('streak.protector.history')}</Text>
                {state.protectorHistory.map((movement) => <View key={movement.id} style={styles.historyRow}>
                  <View style={styles.historyCopy}><Text style={styles.body}>{t(`streak.protector.${movement.kind}` as TranslationKey)}</Text><Text style={styles.meta}>{formatDateTime(movement.createdAt, state.timeZone)}</Text></View>
                  <Text style={styles.accent}>{movement.quantity > 0 ? '+1' : '−1'}</Text>
                </View>)}
                <Button fullWidth variant="ghost" label={t('streak.notifications')} onPress={() => router.push(preview ? '/settings-preview' : '/settings/profile')} />
              </View> : null}
            </View>
          </>
        )}
        {preview ? <Text style={styles.previewNote}>{t('streak.preview')}</Text> : null}
      </ScrollView>
      <BaseSheet visible={sheetVisible && Boolean(state)} title={t(pendingOperation ? 'streak.protector.verify' : 'streak.protector.confirmTitle')}
        dismissible={!busy} onClose={() => setSheetVisible(false)} returnFocusRef={purchaseButton}
        footer={<View style={styles.actions}><Button fullWidth loading={busy} disabled={!canPurchase} onPress={() => { void confirmPurchase(); }}
          label={t(pendingOperation ? 'streak.protector.verify' : 'streak.protector.confirm', { price: state?.protectorPrice ?? 90 })} testID="streak-confirm-protector" />
          <Button fullWidth variant="ghost" disabled={busy} onPress={() => setSheetVisible(false)} label={t('common.cancel')} /></View>}>
        <View style={styles.actions}><Text style={styles.body}>{t(pendingOperation ? 'streak.protector.pending' : 'streak.protector.rules')}</Text>
          {state && !pendingOperation ? <Text style={styles.status}>{!preview && unlimitedVolts ? t('economy.unlimitedBalanceLabel') : t('streak.protector.balance', { before: formatNumber(state.volts), after: formatNumber(Math.max(0, state.volts - state.protectorPrice)) })}</Text> : null}
          {mutationError ? <Text accessibilityRole="alert" style={styles.body}>{mutationError}</Text> : null}</View>
      </BaseSheet>
    </Screen>
  );
}

function Metric({ value, label, unit }: { value: string; label: string; unit?: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><View style={styles.metricValueRow}>
    <Text style={styles.metricValue}>{value}</Text>{unit ? <Text style={styles.metricLabel}>{unit}</Text> : null}
  </View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#030E17' },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 10 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { minWidth: layout.minTouchTarget, minHeight: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: 'rgba(3,14,23,.6)' },
  headerSpacer: { width: layout.minTouchTarget },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 25, lineHeight: 29, textAlign: 'center', color: colors.text },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 24, color: colors.text, flexShrink: 1 },
  body: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textSecondary },
  panel: { padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: 'rgba(9,20,29,.72)' },
  summary: { paddingTop: 8, gap: 10 },
  hero: { alignItems: 'center' },
  flameLabel: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 23, color: colors.volt, marginTop: 14 },
  count: { fontFamily: fonts.display, fontSize: 96, lineHeight: 98, letterSpacing: -2, color: colors.volt, textAlign: 'center' },
  countLong: { fontSize: 76, lineHeight: 82 },
  dayUnit: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 22, color: colors.volt },
  dayMessage: { alignItems: 'center', gap: 4 },
  status: { ...typography.bodyComfort, color: colors.text, textAlign: 'center' },
  accent: { ...typography.control, color: colors.volt },
  callButton: { minHeight: layout.controlHeight, marginTop: 7, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.volt },
  callButtonText: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.background, textAlign: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 3, marginBottom: 3 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  metricValueRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', columnGap: 5 },
  metricValue: { ...typography.metric, color: colors.text },
  statDivider: { width: 1, height: 42, backgroundColor: colors.border },
  protectorPanel: { padding: 12, gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: 'rgba(9,20,29,.72)' },
  protectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shield: { width: 38, height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(232,255,61,.35)' },
  protectorCopy: { flex: 1, minWidth: 0, gap: 3 },
  protectorTitle: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 20, color: colors.text },
  protectorDescription: { ...typography.caption, marginLeft: 46, color: colors.textSecondary },
  purchaseButton: { width: 112, minHeight: layout.minTouchTarget, flexShrink: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.volt },
  purchaseText: { fontFamily: fonts.displayBold, fontSize: 13, lineHeight: 16, color: colors.volt, textAlign: 'center' },
  purchaseDisabled: { borderColor: colors.border },
  disabledText: { color: colors.textDisabled },
  pressed: { opacity: .75 },
  details: { gap: 8, paddingHorizontal: 4 },
  detailsToggle: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  historyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  historyCopy: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.md },
});
