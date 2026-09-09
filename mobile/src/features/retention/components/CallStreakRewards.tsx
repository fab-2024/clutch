import Check from 'lucide-react-native/icons/check';
import Lock from 'lucide-react-native/icons/lock';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { colors, fonts, radius, typography } from '@/src/theme';

import type { CallStreakState } from '../types';
import { CallStreakFlame } from './CallStreakFlame';

export function CallStreakRewards({ state }: { state: CallStreakState }) {
  if (!state.rewards?.length) return null;
  const next = state.rewards.find((reward) => !reward.rewardedAt);
  return <View style={styles.section} testID="streak-rewards">
    <Text accessibilityRole="header" style={styles.title}>{t('streak.design.rewards')}</Text>
    <Text style={styles.meta}>{t('streak.design.rewardDescription')}</Text>
    {state.rewards.map((reward) => {
      const earned = Boolean(reward.rewardedAt);
      const active = !earned && next?.days === reward.days;
      const progress = earned ? reward.days : Math.min(state.current, reward.days);
      return <View key={reward.days} style={styles.card} testID={`streak-reward-${reward.days}`}>
        <View style={styles.row}>
          <View style={styles.art}><CallStreakFlame height={62} /></View>
          <View style={styles.copy}>
            <Text style={styles.days}>{t('streak.design.milestoneDays', { count: reward.days })}</Text>
            <Text style={styles.amount}>{t('streak.design.volts', { count: reward.volts })}</Text>
          </View>
          {earned ? <Check color={colors.volt} size={22} /> : <Lock color={colors.textMuted} size={22} />}
        </View>
        <Text style={[styles.meta, styles.status, earned && styles.earned]}>{t(earned ? 'streak.design.rewarded'
          : active ? progress === reward.days ? 'streak.design.nextCall' : 'streak.design.remaining'
            : 'streak.design.upcoming', { count: Math.max(0, reward.days - state.current) })}</Text>
        {active ? <View style={styles.progressRow}>
          <Text style={styles.days}>{progress} / {reward.days} {t('streak.dayUnit', { count: reward.days }).toLowerCase()}</Text>
          <View accessibilityRole="progressbar" accessibilityLabel={t('streak.design.progress', { count: reward.days })}
            accessibilityValue={{ min: 0, max: reward.days, now: progress }} style={styles.bar}>
            <View style={[styles.fill, { width: `${progress / reward.days * 100}%` }]} />
          </View>
        </View> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  card: { gap: 8, padding: 12, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: 'rgba(5,18,25,.72)' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  art: { width: 72, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  days: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.text },
  amount: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 36, color: colors.text },
  status: { textAlign: 'right' },
  earned: { color: colors.volt },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bar: { flex: 1, height: 9, borderRadius: radius.pill, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
});
