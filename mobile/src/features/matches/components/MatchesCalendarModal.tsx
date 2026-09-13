import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArenaMatch } from '../types';
import { colors, fonts, radius, spacing } from '@/src/theme';

import { dateKey, formatMonth } from './MatchesArenaSections';

type Props = {
  matches: ArenaMatch[];
  onClose: () => void;
  onSelectDay: (dayKey: string) => void;
  selectedDayKey: string;
  visible: boolean;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function MatchesCalendarModal({ matches, onClose, onSelectDay, selectedDayKey, visible }: Props) {
  const selectedDate = dateFromKey(selectedDayKey);
  const [month, setMonth] = useState(() => startOfMonth(selectedDate));

  useEffect(() => {
    if (visible) setMonth(startOfMonth(selectedDate));
  }, [selectedDayKey, visible]);

  const matchDays = useMemo(
    () => new Set(matches.map((match) => dateKey(new Date(match.debut)))),
    [matches],
  );
  const cells = useMemo(() => monthCells(month), [month]);
  const todayKey = dateKey(new Date());

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Fermer le calendrier" accessibilityRole="button" onPress={onClose} style={styles.backdrop}>
        <View onStartShouldSetResponder={() => true} style={styles.sheet} testID="matches-calendar-modal">
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CALENDRIER DES MATCHS</Text>
              <Text accessibilityRole="header" style={styles.title}>{formatMonth(month)}</Text>
            </View>
            <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.monthControls}>
            <Pressable accessibilityLabel="Mois précédent" accessibilityRole="button" onPress={() => setMonth((current) => addMonths(current, -1))} style={styles.monthButton}>
              <Text style={styles.monthArrow}>‹</Text>
            </Pressable>
            <Pressable accessibilityLabel="Choisir aujourd’hui" accessibilityRole="button" onPress={() => onSelectDay(todayKey)} style={styles.todayButton}>
              <Text style={styles.todayText}>AUJOURD’HUI</Text>
            </Pressable>
            <Pressable accessibilityLabel="Mois suivant" accessibilityRole="button" onPress={() => setMonth((current) => addMonths(current, 1))} style={styles.monthButton}>
              <Text style={styles.monthArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekdays}>
            {WEEKDAYS.map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}
          </View>

          <View style={styles.grid}>
            {cells.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
              const key = dateKey(date);
              const selected = key === selectedDayKey;
              const today = key === todayKey;
              const hasMatch = matchDays.has(key);
              return (
                <View key={key} style={styles.dayCell}>
                  <Pressable
                    accessibilityLabel={`Choisir ${formatFullDate(date)}${hasMatch ? ', matchs disponibles' : ''}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onSelectDay(key)}
                    style={({ pressed }) => [styles.dayButton, today && styles.dayToday, selected && styles.daySelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
                    <View style={[styles.matchDot, hasMatch && styles.matchDotVisible, selected && hasMatch && styles.matchDotSelected]} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function monthCells(month: Date) {
  const leading = (month.getDay() + 6) % 7;
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= numberOfDays; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day, 12));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day, 12)
    : new Date();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,5,9,.76)' },
  sheet: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#315064',
    backgroundColor: '#07151E',
  },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#536976' },
  header: { minHeight: 67, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 9, lineHeight: 13, letterSpacing: 1.3 },
  title: { marginTop: 2, color: colors.text, fontFamily: fonts.bold, fontSize: 22, lineHeight: 27 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#294453', backgroundColor: '#0A1B25' },
  closeText: { marginTop: -2, color: colors.textSecondary, fontSize: 27, lineHeight: 29 },
  monthControls: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  monthButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#0D212D', borderWidth: 1, borderColor: '#284555' },
  monthArrow: { color: colors.text, fontFamily: fonts.medium, fontSize: 27, lineHeight: 28 },
  todayButton: { minHeight: 38, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: '#486070', backgroundColor: '#101F29' },
  todayText: { color: colors.text, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: .85 },
  weekdays: { marginTop: 13, flexDirection: 'row' },
  weekday: { width: '14.2857%', color: colors.textMuted, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  grid: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', aspectRatio: 1 },
  dayButton: { flex: 1, margin: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  dayToday: { borderWidth: 1, borderColor: '#F4F5EF' },
  daySelected: { backgroundColor: '#F4F5EF' },
  dayText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  dayTextSelected: { color: '#071017', fontFamily: fonts.bold },
  matchDot: { width: 4, height: 4, marginTop: 2, borderRadius: 2, backgroundColor: 'transparent' },
  matchDotVisible: { backgroundColor: colors.volt },
  matchDotSelected: { backgroundColor: '#071017' },
  pressed: { opacity: .68 },
});
