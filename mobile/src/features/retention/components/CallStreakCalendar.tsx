import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { StyleSheet, Text, View } from 'react-native';

import { getActiveLocale, t } from '@/src/lib/i18n';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';

import type { CallStreakState, StreakDayStatus } from '../types';

const protectedColor = '#00C9F2';

export function CallStreakCalendar({ state }: { state: CallStreakState }) {
  const rows = [state.history.slice(0, 7), state.history.slice(7, 14)].filter((row) => row.length);
  const firstDay = state.history[0]?.day;
  const lastDay = state.history.at(-1)?.day;
  const formatter = new Intl.DateTimeFormat(getActiveLocale(), { day: '2-digit', month: 'short', timeZone: 'UTC' });
  const range = firstDay && lastDay
    ? `${formatter.format(new Date(`${firstDay}T12:00:00Z`))} — ${formatter.format(new Date(`${lastDay}T12:00:00Z`))}`
    : null;

  return (
    <View style={styles.panel} testID="streak-calendar">
      <Text accessibilityRole="header" style={styles.title}>{t('streak.calendar')}</Text>
      {range ? <Text style={styles.range}>{range}</Text> : <Text style={styles.meta}>{t('streak.calendar.empty')}</Text>}
      <View style={styles.calendar}>
        {rows.map((row) => (
          <View key={row[0].day} style={[styles.week, { width: `${row.length / 7 * 100}%` }]}>
            <View style={[styles.line, { left: `${50 / row.length}%`, right: `${50 / row.length}%` }]} />
            {row.map((day) => (
              <View key={day.day} accessible
                accessibilityLabel={t('streak.calendar.label', { date: day.day, status: t(`streak.calendar.${day.status}`), count: day.calls })}
                style={styles.day}>
                <Text style={styles.meta}>{day.day.slice(-2)}</Text>
                <View style={[styles.marker, day.day === state.day && styles.today,
                  day.status === 'protege' && styles.protectedRing, day.status === 'manque' && styles.missedRing]}>
                  <View style={[styles.dot, dotStyles[day.status]]}>
                    {day.status === 'manque' ? <Text style={styles.cross}>×</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.validDot]} /><Text style={styles.legendText}>{t('streak.calendar.valide')}</Text></View>
        <View style={styles.legendItem}><ShieldCheck color={protectedColor} size={13} /><Text style={styles.legendText}>{t('streak.calendar.protectedShort')}</Text></View>
        <View style={styles.legendItem}><View style={styles.legendDot} /><Text style={styles.legendText}>{t('streak.calendar.neutralShort')}</Text></View>
        {state.history.some((day) => day.status === 'manque') ? (
          <View style={styles.legendItem}><Text style={styles.cross}>×</Text><Text style={styles.legendText}>{t('streak.calendar.manque')}</Text></View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 14, gap: 5, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: 'rgba(9,20,29,.72)' },
  title: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 24, color: colors.text },
  meta: { ...typography.metadata, color: colors.textSecondary },
  range: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  calendar: { gap: 5, marginTop: 8, marginBottom: 12 },
  week: { flexDirection: 'row' },
  line: { position: 'absolute', top: 34, height: 1, backgroundColor: colors.borderHighlight },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8 },
  marker: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1720' },
  today: { borderColor: colors.volt },
  protectedRing: { borderColor: protectedColor },
  missedRing: { borderColor: colors.danger },
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.textDisabled, alignItems: 'center', justifyContent: 'center' },
  validDot: { backgroundColor: colors.volt, boxShadow: '0 0 10px rgba(232,255,61,.6)' },
  protectedDot: { backgroundColor: protectedColor },
  missedDot: { backgroundColor: 'transparent' },
  pendingDot: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textSecondary },
  inactiveDot: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderHighlight },
  cross: { color: colors.danger, fontFamily: fonts.bold, fontSize: 14, lineHeight: 15 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.textDisabled },
  legendText: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
});

const dotStyles: Record<StreakDayStatus, object> = {
  valide: styles.validDot,
  protege: styles.protectedDot,
  neutre: {},
  manque: styles.missedDot,
  a_faire: styles.pendingDot,
  inactif: styles.inactiveDot,
};
