import Check from 'lucide-react-native/icons/check';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { colors, fonts, layout, radius, typography } from '@/src/theme';

import { STREAK_MILESTONES, type CallStreakState, type StreakMilestone } from '../types';

export function CallStreakMilestones({ state, busy, onChoose }: {
  state: CallStreakState;
  busy: boolean;
  onChoose: (days: StreakMilestone) => void;
}) {
  const { width } = useWindowDimensions();
  const itemWidth = (Math.min(width, layout.contentMaxWidth) - 62) / 3;
  const latestEarned = STREAK_MILESTONES.filter((days) => state.milestones.some((milestone) => milestone.days === days)).at(-1);
  const nextMilestone = STREAK_MILESTONES.find((days) => !state.milestones.some((milestone) => milestone.days === days));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}
      accessibilityLabel={t('streak.milestones')} testID="streak-milestone-track">
      {STREAK_MILESTONES.map((days, index) => {
        const earned = state.milestones.some((milestone) => milestone.days === days);
        const selected = state.selectedMilestone === days;
        const latest = days === latestEarned;
        const nextEarned = state.milestones.some((milestone) => milestone.days === STREAK_MILESTONES[index + 1]);
        const status = selected ? 'streak.milestone.equipped'
          : earned ? latest ? 'streak.milestone.reached' : 'streak.milestone.validated'
            : days === nextMilestone ? 'streak.milestone.next' : 'streak.milestone.locked';

        return (
          <Pressable key={days} accessibilityRole="button" accessibilityLabel={t('streak.milestone.choose', { count: days })}
            accessibilityState={{ disabled: !earned || busy, selected }} disabled={!earned || busy}
            onPress={() => onChoose(days)} style={({ pressed }) => [styles.milestone, { width: itemWidth }, pressed && styles.pressed]}>
            {index > 0 ? <View style={[styles.lineLeft, earned && styles.earnedLine]} /> : null}
            {index < STREAK_MILESTONES.length - 1 ? <View style={[styles.lineRight, nextEarned && styles.earnedLine]} /> : null}
            <View style={[styles.marker, earned && styles.earnedMarker, earned && latest && styles.latestMarker, selected && styles.selectedMarker]}>
              {earned && !latest ? <Check size={13} strokeWidth={3} color={colors.background} />
                : <View style={[styles.dot, earned && styles.earnedDot]} />}
            </View>
            <Text style={styles.days}>{t('streak.days', { count: days })}</Text>
            <Text style={[styles.status, earned && styles.earnedText]}>{t(status)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { paddingTop: 8, paddingBottom: 4 },
  milestone: { minHeight: 82, alignItems: 'center', paddingHorizontal: 3, gap: 5 },
  lineLeft: { position: 'absolute', top: 11, left: 0, right: '50%', height: 1, backgroundColor: colors.borderHighlight },
  lineRight: { position: 'absolute', top: 11, left: '50%', right: 0, height: 1, backgroundColor: colors.borderHighlight },
  earnedLine: { backgroundColor: colors.volt },
  marker: { width: 24, height: 24, marginBottom: 5, borderRadius: radius.pill, borderWidth: 3,
    borderColor: '#253540', backgroundColor: '#101C24', alignItems: 'center', justifyContent: 'center' },
  earnedMarker: { backgroundColor: colors.volt, borderColor: 'rgba(232,255,61,.18)' },
  latestMarker: { backgroundColor: '#283415', borderColor: '#39451C' },
  selectedMarker: { borderColor: colors.text, boxShadow: '0 0 10px rgba(232,255,61,.35)' },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.textDisabled },
  earnedDot: { backgroundColor: colors.volt, boxShadow: '0 0 12px rgba(232,255,61,.7)' },
  days: { ...typography.control, color: colors.text, textAlign: 'center' },
  status: { fontFamily: fonts.displayBold, fontSize: 12, lineHeight: 16, letterSpacing: .3, color: colors.textSecondary, textAlign: 'center' },
  earnedText: { color: colors.volt },
  pressed: { opacity: .7 },
});
