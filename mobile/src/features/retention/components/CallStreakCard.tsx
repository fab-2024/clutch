import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Flame from 'lucide-react-native/icons/flame';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber, t } from '@/src/lib/i18n';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import { remainingStreakLabel, remainingStreakMs, streakDayMessage } from '../model';
import type { CallStreakState } from '../types';

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
  const remaining = useStreakCountdown(state, previewState ? monotonicNow() : streak.receivedAt);
  if (!state) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('streak.open')}
      onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID="call-streak-card">
      <View style={styles.top}>
        <Flame color={colors.volt} size={26} />
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t('streak.title')}</Text>
          <Text style={styles.days}>{t('streak.days', { count: state.current })}</Text>
        </View>
        <View style={styles.stock}><ShieldCheck color={colors.volt} size={17} /><Text style={styles.meta}>{state.protectors}/{state.maxProtectors}</Text></View>
        <ChevronRight color={colors.textSecondary} size={20} />
      </View>
      <Text style={[styles.status, state.todayValidated && styles.accent]}>{streak.error && !previewState ? t('economy.syncInterrupted') : streakDayMessage(state)}</Text>
      {!state.todayValidated ? <Text style={styles.meta}>{t('streak.day.end', { time: remaining })}</Text> : null}
      <Text style={styles.meta}>{t('streak.best')} · {formatNumber(state.best)}</Text>
      {state.selectedMilestone ? <Text style={styles.accent}>{t('streak.milestone.selected', { count: state.selectedMilestone })}</Text> : null}
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
  card: { margin: spacing.md, marginTop: spacing.sm, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceLow },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary },
  days: { ...typography.displaySmall, color: colors.text },
  title: { ...typography.sectionTitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  status: { ...typography.bodyStrong, color: colors.text },
  accent: { ...typography.control, color: colors.volt },
  stock: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  pressed: { opacity: 0.75 },
  showcaseBadge: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderStrong },
});
