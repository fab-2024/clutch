import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Flame from 'lucide-react-native/icons/flame';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber, t } from '@/src/lib/i18n';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import { remainingStreakLabel, remainingStreakMs, streakDayMessage } from '../model';
import type { CallStreakState } from '../types';
import { CallStreakFlame } from './CallStreakFlame';

export function useStreakCountdown(state: CallStreakState | null, receivedAt: number) {
  const [now, setNow] = useState(monotonicNow);
  useEffect(() => {
    if (!state) return;
    const timer = setInterval(() => setNow(monotonicNow()), 30_000);
    return () => clearInterval(timer);
  }, [state]);
  return state ? remainingStreakLabel(remainingStreakMs(state, Math.max(0, now - receivedAt))) : '';
}

export default function CallStreakCard({ previewState }: { previewState?: CallStreakState }) {
  const streak = useCallStreak();
  const state = previewState ?? streak.state;
  const [previewReceivedAt] = useState(monotonicNow);
  const remaining = useStreakCountdown(state, previewState ? previewReceivedAt : streak.receivedAt);
  if (!state) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('streak.open')}
      onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.streakCard, pressed && styles.pressed]} testID="call-streak-card">
      <View style={styles.streakHeader}>
        <Text style={[styles.eyebrow, styles.copy]}>{t('streak.title')}</Text>
        <View style={styles.stock}><ShieldCheck color={colors.volt} size={17} /><Text style={styles.meta}>{state.protectors}/{state.maxProtectors}</Text></View>
        <ChevronRight color={colors.textSecondary} size={18} />
      </View>
      <View style={styles.streakBody}>
        <CallStreakFlame height={82} />
        <Text style={[styles.streakCount, state.current >= 100 && styles.streakCountLong]}>{formatNumber(state.current)}</Text>
        <View style={styles.streakDetails}>
          <Text style={styles.streakUnit}>{t('streak.dayUnit', { count: state.current })}</Text>
          <Text style={[styles.streakStatus, state.todayValidated && styles.accent]}>
            {streak.error && !previewState ? t('economy.syncInterrupted') : streakDayMessage(state)}
          </Text>
          <Text style={styles.meta}>{t('streak.record', { count: state.best })}</Text>
        </View>
      </View>
      {!state.todayValidated ? <Text style={styles.meta}>{t('streak.day.end', { time: remaining })}</Text> : null}
      <View style={styles.streakFooter}>
        <Text style={styles.streakLink}>{t('streak.view')}</Text>
        <ChevronRight color={colors.textSecondary} size={17} />
      </View>
    </Pressable>
  );
}

export function StreakShowcaseBadge() {
  const { state } = useCallStreak();
  if (!state) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('streak.open')}
      onPress={() => router.push('/streak')} style={styles.showcaseBadge} testID="showcase-streak-badge">
      <Flame color={colors.volt} size={18} />
      <View>
        <Text style={styles.eyebrow}>{state.selectedMilestone ? t('streak.milestone.selected', { count: state.selectedMilestone }) : t('streak.title')}</Text>
        <Text style={styles.meta}>{state.current} J · {t('streak.best')} {state.best}</Text>
      </View>
    </Pressable>
  );
}

export function ProtectorShopCard({ preview = false }: { preview?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('streak.protector.title')}
      onPress={() => router.push(preview ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID="shop-streak-protector">
      <View style={styles.top}>
        <ShieldCheck color={colors.volt} size={30} />
        <View style={styles.copy}>
          <Text style={styles.title}>{t('streak.protector.title')}</Text>
          <Text style={styles.meta}>{t('streak.protector.shop')}</Text>
        </View>
        <ChevronRight color={colors.text} size={20} />
      </View>
      <Text style={styles.accent}>{t('streak.protector.buy', { price: 90 })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  streakCard: { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 12, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(10,21,29,.88)' },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakCount: { color: colors.text, fontFamily: fonts.display, fontSize: 86, lineHeight: 92, letterSpacing: -2 },
  streakCountLong: { fontSize: 56, lineHeight: 72, letterSpacing: -1 },
  streakDetails: { flex: 1, minWidth: 0, gap: 5 },
  streakUnit: { ...typography.displaySmall, fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 26, color: colors.text },
  streakStatus: { ...typography.control, color: colors.textSecondary, textTransform: 'uppercase' },
  streakFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: layout.minTouchTarget,
    borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  streakLink: { ...typography.metadata, color: colors.textSecondary, letterSpacing: 1 },
  card: { margin: spacing.md, marginTop: spacing.sm, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceLow },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary },
  title: { ...typography.sectionTitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  accent: { ...typography.control, color: colors.volt },
  stock: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  pressed: { opacity: 0.75 },
  showcaseBadge: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderStrong },
});
