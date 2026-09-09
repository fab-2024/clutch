import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Trophy from 'lucide-react-native/icons/trophy';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { formatNumber, t } from '@/src/lib/i18n';
import { colors, fonts, radius, typography } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import { streakDayMessage } from '../model';
import { nextStreakTarget } from '../presentation';
import type { CallStreakState } from '../types';
import { CallStreakFlame } from './CallStreakFlame';
import { CallStreakProgress } from './CallStreakProgress';
import { useStreakCountdown } from './CallStreakCard';

export default function CompactCallStreakCard({ previewState }: { previewState?: CallStreakState }) {
  const streak = useCallStreak();
  const state = previewState ?? streak.state;
  const [previewReceivedAt] = useState(monotonicNow);
  const remaining = useStreakCountdown(state, previewState ? previewReceivedAt : streak.receivedAt);
  if (!state) return null;
  const target = nextStreakTarget(state);
  const subtitle = streak.error && !previewState ? t('economy.syncInterrupted')
    : !state.todayValidated && state.eligibleMatchId ? t('streak.design.continue') : streakDayMessage(state);

  return (
    <Pressable accessibilityLabel={`${t('streak.open')}. ${state.current} ${t('streak.design.consecutive', { count: state.current })}. ${subtitle}`}
      accessibilityHint={state.todayValidated ? undefined : t('streak.day.end', { time: remaining })}
      accessibilityRole="button" onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID="call-streak-card">
      <View style={styles.header}><Text style={styles.eyebrow}>{t('streak.design.title')}</Text><ChevronRight color={colors.textSecondary} size={22} /></View>
      <View style={styles.summary}>
        <CallStreakFlame height={76} />
        <Text style={[styles.count, state.current >= 100 && styles.countLong]}>{formatNumber(state.current)}</Text>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('streak.design.consecutive', { count: state.current })}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <CallStreakProgress state={state} />
      <View style={styles.footer}>
        <View style={styles.copy}>
          <Text style={styles.next}>{t('streak.design.next', { count: target.days })}</Text>
          <Text style={styles.subtitle}>{t(target.remaining ? 'streak.design.remaining' : 'streak.design.nextCall', { count: target.remaining })}</Text>
        </View>
        <View style={styles.reward}>
          {target.volts !== null ? <CurrencyIcon kind="volts" size={24} /> : <Trophy color={colors.volt} size={22} />}
          <Text style={styles.next}>{target.volts !== null ? t('streak.design.volts', { count: target.volts }) : t('streak.design.badge')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 13, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(5,18,25,.72)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.control, color: colors.text },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { color: colors.volt, fontFamily: fonts.display, fontSize: 84, lineHeight: 90, letterSpacing: -2 },
  countLong: { fontSize: 54, lineHeight: 70 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  footer: { paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  next: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.text },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pressed: { opacity: .82 },
});
