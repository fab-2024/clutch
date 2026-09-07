import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/src/theme';

import { monotonicNow, useCallStreak } from '../context';
import type { CallStreakState } from '../types';
import { CallStreakFlame } from './CallStreakFlame';
import { useStreakCountdown } from './CallStreakCard';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function CompactCallStreakCard({ previewState }: { previewState?: CallStreakState }) {
  const streak = useCallStreak();
  const state = previewState ?? streak.state;
  const [previewReceivedAt] = useState(monotonicNow);
  const remaining = useStreakCountdown(state, previewState ? previewReceivedAt : streak.receivedAt);
  if (!state) return null;

  // The server's day is already expressed in the streak timezone.
  const today = new Date(`${state.day}T12:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  const title = state.current > 0
    ? `${state.current} ${state.current === 1 ? 'jour' : 'jours'} de série`
    : 'Lance ta série aujourd’hui';
  const subtitle = streak.error && !previewState ? 'Synchronisation interrompue'
    : state.todayValidated ? 'Journée validée · continue demain'
      : state.current > 0 ? 'Un call pour garder ta flamme.' : 'Un call suffit pour commencer.';

  return (
    <Pressable
      accessibilityLabel={`Voir ma série. ${title}. ${subtitle}${state.todayValidated ? '' : `. Il reste ${remaining}`}`}
      accessibilityRole="button"
      onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID="call-streak-card"
    >
      <View style={styles.flame}><CallStreakFlame height={62} /></View>
      <View style={styles.body}>
        <View style={styles.summary}>
          <View style={styles.copy}>
            <Text adjustsFontSizeToFit minimumFontScale={.8} numberOfLines={1} style={styles.title}>{title}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={.85} numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
          {!state.todayValidated ? <View style={styles.countdown}>
            <Text style={styles.subtitle}>Il reste</Text>
            <Text style={styles.time}>{remaining}</Text>
          </View> : null}
        </View>
        <View style={styles.week}>
          {WEEKDAYS.map((label, index) => {
            const date = new Date(monday);
            date.setUTCDate(monday.getUTCDate() + index);
            const day = date.toISOString().slice(0, 10);
            const current = day === state.day;
            const status = current && state.todayValidated ? 'valide' : state.history.find((entry) => entry.day === day)?.status;
            const validated = status === 'valide';
            const protectedDay = status === 'protege';
            return (
              <View key={day} style={[styles.day, validated && styles.dayValidated, protectedDay && styles.dayProtected, current && styles.today]}>
                <Text style={[styles.dayLabel, validated && styles.dayLabelValidated]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(10,21,29,.88)' },
  flame: { width: 64, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  countdown: { alignItems: 'flex-end', flexShrink: 0 },
  time: { color: colors.text, fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  week: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 5, borderWidth: 1, borderColor: colors.border },
  today: { borderColor: colors.volt },
  dayValidated: { backgroundColor: colors.volt, borderColor: colors.volt },
  dayProtected: { borderColor: colors.info },
  dayLabel: { fontFamily: fonts.bold, color: colors.textSecondary, fontSize: 11, lineHeight: 14 },
  dayLabelValidated: { color: colors.background },
  pressed: { opacity: .82 },
});
