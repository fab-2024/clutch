import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Trophy from 'lucide-react-native/icons/trophy';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { formatNumber, t } from '@/src/lib/i18n';
import { colors, fonts, radius, typography } from '@/src/theme';

import { useCallStreak } from '../context';
import { streakDayMessage } from '../model';
import { nextStreakTarget } from '../presentation';
import type { CallStreakState } from '../types';
import { CallStreakFlame } from './CallStreakFlame';

export default function CompactCallStreakCard({ previewState }: { previewState?: CallStreakState }) {
  const streak = useCallStreak();
  const state = previewState ?? streak.state;
  if (!state) return null;
  const target = nextStreakTarget(state);
  const starting = state.current === 0 && !state.todayValidated && Boolean(state.eligibleMatchId);
  const title = starting ? t('streak.hub.start') : t('streak.hub.count', { count: state.current });
  const subtitle = streak.error && !previewState ? t('economy.syncInterrupted')
    : starting ? t('streak.hub.firstCall') : streakDayMessage(state);
  const reward = target.volts !== null ? t('streak.design.volts', { count: target.volts }) : t('streak.design.badge');
  const progress = Math.min(1, Math.max(0, state.current / target.days));

  return (
    <Pressable accessibilityLabel={`${title}. ${subtitle}. ${t('streak.design.next', { count: target.days })}. ${reward}`}
      accessibilityHint={t('streak.hub.details')}
      accessibilityRole="button" onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID="call-streak-card">
      <View style={styles.summary}>
        <View accessible={false}><CallStreakFlame height={36} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <ChevronRight color={colors.textSecondary} size={18} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.target}>{t('streak.hub.target', { count: target.days })}</Text>
        <View style={styles.reward}>
          {target.volts !== null ? <CurrencyIcon kind="volts" size={18} /> : <Trophy color={colors.volt} size={16} />}
          <Text style={styles.rewardValue}>{reward}</Text>
        </View>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={t('streak.design.progress', { count: target.days })}
        accessibilityValue={{ min: 0, max: target.days, now: Math.min(state.current, target.days),
          text: t('streak.design.progressCount', { current: formatNumber(state.current), count: target.days }) }}
        style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 9, padding: 13, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(5,18,25,.72)' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  target: { ...typography.caption, color: colors.textSecondary },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rewardValue: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.text },
  track: { height: 3, borderRadius: radius.pill, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
  pressed: { opacity: .82 },
});
