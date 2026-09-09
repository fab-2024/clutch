import Check from 'lucide-react-native/icons/check';
import Gift from 'lucide-react-native/icons/gift';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { colors, fonts, radius } from '@/src/theme';

import { streakProgressDays } from '../presentation';
import type { CallStreakState } from '../types';

export function CallStreakProgress({ state }: { state: CallStreakState }) {
  return <View style={styles.track} testID="streak-progress-days">
    {streakProgressDays(state).map(({ day, validated, today, reward }) => (
      <View key={day} style={styles.column} accessible
        accessibilityLabel={t('streak.progress.day', { count: day, status: t(validated ? 'streak.calendar.valide' : today ? 'streak.calendar.a_faire' : 'streak.design.upcoming') })}>
        <View style={[styles.cell, today && styles.today]}>
          <Text style={styles.number}>{day}</Text>
          {validated ? <View style={styles.checked}><Check color={colors.background} size={14} strokeWidth={3} /></View>
            : reward ? <Gift color={colors.textSecondary} size={21} />
              : <View style={styles.pending} />}
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.caption}>{today ? t('streak.design.today') : ' '}</Text>
      </View>
    ))}
  </View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6 },
  column: { flex: 1, minWidth: 0, gap: 4, alignItems: 'stretch' },
  cell: { minHeight: 58, paddingVertical: 7, gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceGlass },
  today: { borderColor: colors.volt, borderWidth: 2, paddingVertical: 6 },
  number: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.text },
  checked: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  pending: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textSecondary },
  caption: { width: 70, maxWidth: 70, flexShrink: 0, alignSelf: 'center', fontFamily: fonts.medium, fontSize: 9, lineHeight: 12, textAlign: 'center', color: colors.textSecondary },
});
