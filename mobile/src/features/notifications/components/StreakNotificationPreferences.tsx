import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import type { NotificationPreferences } from '../types';

export function formatQuietTime(minutes: number) {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}

export default function StreakNotificationPreferences({ preferences, onChange }: {
  preferences: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
}) {
  if (preferences.retentionAvailable === false) return <Text style={styles.detail}>{t('notifications.retentionUnavailable')}</Text>;
  function changeTime(key: 'quietHoursStart' | 'quietHoursEnd', delta: number) {
    const other = key === 'quietHoursStart' ? preferences.quietHoursEnd : preferences.quietHoursStart;
    let next = (preferences[key] + delta + 1440) % 1440;
    if (next === other) next = (next + delta + 1440) % 1440;
    onChange({ ...preferences, [key]: next });
  }
  return (
    <View style={styles.section}>
      <Text style={styles.group}>{t('notifications.streak.group')}</Text>
      <Toggle label={t('notifications.streak.risk')} detail={t('notifications.streak.riskDetail')} value={preferences.streakRisk}
        onPress={() => onChange({ ...preferences, streakRisk: !preferences.streakRisk })} />
      <Toggle label={t('notifications.streak.protected')} detail={t('notifications.streak.protectedDetail')} value={preferences.streakProtected}
        onPress={() => onChange({ ...preferences, streakProtected: !preferences.streakProtected })} />
      <Toggle label={t('notifications.quiet.label')} detail={t('notifications.quiet.detail')} value={preferences.quietHoursEnabled}
        onPress={() => onChange({ ...preferences, quietHoursEnabled: !preferences.quietHoursEnabled })} />
      {preferences.quietHoursEnabled ? <View style={styles.times}>
        {(['quietHoursStart', 'quietHoursEnd'] as const).map((key) => {
          const label = t(key === 'quietHoursStart' ? 'notifications.quiet.start' : 'notifications.quiet.end');
          return <View style={styles.time} key={key}><Text style={styles.detail}>{label}</Text><View style={styles.timeControls}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.quiet.earlier', { label })} onPress={() => changeTime(key, -30)} style={styles.timeButton}><Text style={styles.title}>−</Text></Pressable>
            <Text style={styles.clock}>{formatQuietTime(preferences[key])}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.quiet.later', { label })} onPress={() => changeTime(key, 30)} style={styles.timeButton}><Text style={styles.title}>+</Text></Pressable>
          </View></View>;
        })}
        <Text style={styles.detail}>{preferences.timezone}</Text>
      </View> : null}
    </View>
  );
}

function Toggle({ label, detail, value, onPress }: { label: string; detail: string; value: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={onPress} style={styles.row}>
    <View style={styles.copy}><Text style={styles.title}>{label}</Text><Text style={styles.detail}>{detail}</Text></View>
    <View style={[styles.track, value && styles.on]}><View style={[styles.thumb, value && styles.thumbOn]} /></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
  group: { ...typography.eyebrow, color: colors.volt },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.bodyStrong, color: colors.text },
  detail: { ...typography.caption, color: colors.textSecondary },
  track: { width: 44, height: 26, padding: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  on: { backgroundColor: colors.volt },
  thumb: { width: 20, height: 20, borderRadius: radius.pill, backgroundColor: colors.textSecondary },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: colors.background },
  times: { paddingTop: spacing.md, gap: spacing.sm },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeControls: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  timeButton: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  clock: { ...typography.control, color: colors.text },
});
