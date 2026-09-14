import { Fragment, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  isZeroRank,
  SEASONAL_GRADE_LADDER,
  ZERO_RANK_ACCENT,
  type SeasonalGradeDefinition,
  type SeasonalGradeSummary,
} from '../grades';
import type { RankSeasonState } from '../types';
import { RankEmblem } from './RankEmblem';
import type { RankTierVisualState } from './RankTierPedestal';
import { journeyStyles as styles } from './SeasonJourney.styles';

const GRADES = [...SEASONAL_GRADE_LADDER];
const GRADE_WIDTH = 112;
const CONNECTOR_WIDTH = 26;
const GRADE_STEP = GRADE_WIDTH + CONNECTOR_WIDTH;

type SeasonJourneyLadderProps = {
  pulse: SharedValue<number>;
  reduceMotion: boolean;
  reveal: SharedValue<number>;
  state: RankSeasonState;
};

export function SeasonJourneyLadder({
  pulse,
  reduceMotion,
  reveal,
  state,
}: SeasonJourneyLadderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const currentOrder = Math.max(0, Math.min(GRADES.length - 1, Number(state.grade.ordre ?? 0)));
  const edgePadding = Math.max(14, (viewportWidth - GRADE_WIDTH) / 2);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateX: interpolate(reveal.value, [0, 1], [18, 0]) }],
  }));

  useEffect(() => {
    if (!viewportWidth) return;
    scrollRef.current?.scrollTo({ x: currentOrder * GRADE_STEP, animated: false });
  }, [currentOrder, viewportWidth]);

  return (
    <View
      onLayout={({ nativeEvent }) => setViewportWidth(nativeEvent.layout.width)}
      style={styles.horizontalJourneyViewport}
    >
      <ScrollView
        accessibilityLabel="Parcours horizontal des grades de la saison"
        horizontal
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        snapToInterval={GRADE_STEP}
      >
        <Animated.View
          style={[
            styles.horizontalRail,
            { paddingHorizontal: edgePadding },
            revealStyle,
          ]}
        >
          {GRADES.map((grade, index) => {
            const visualState = gradeVisualState(grade, state);
            const active = visualState === 'current';
            const connectorActive = index < currentOrder;

            return (
              <Fragment key={grade.key}>
                <JourneyGrade
                  active={active}
                  entranceDelay={reduceMotion ? 0 : 90 + index * 65}
                  grade={grade}
                  pulse={pulse}
                  reduceMotion={reduceMotion}
                  starting={grade.key === 'bronze' && isZeroRank(state.frags)}
                  visualState={visualState}
                />
                {index < GRADES.length - 1 ? (
                  <View pointerEvents="none" style={styles.horizontalConnector}>
                    <View
                      style={[
                        styles.horizontalConnectorLine,
                        connectorActive && styles.horizontalConnectorLineActive,
                      ]}
                    />
                  </View>
                ) : null}
              </Fragment>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function JourneyGrade({
  active,
  entranceDelay,
  grade,
  pulse,
  reduceMotion,
  starting,
  visualState,
}: {
  active: boolean;
  entranceDelay: number;
  grade: SeasonalGradeDefinition;
  pulse: SharedValue<number>;
  reduceMotion: boolean;
  starting: boolean;
  visualState: RankTierVisualState;
}) {
  const accent = starting ? ZERO_RANK_ACCENT : grade.accent;
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: active ? interpolate(pulse.value, [0, 1], [0.94, 1]) : 1,
    transform: [{ scale: active ? interpolate(pulse.value, [0, 1], [0.985, 1.025]) : 1 }],
  }));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(entranceDelay).duration(420)}
      style={styles.horizontalGrade}
    >
      <Animated.View
        accessibilityLabel={gradeAccessibilityLabel(grade, visualState)}
        accessible
        style={[
          styles.horizontalGradeVisual,
          visualState === 'future' && styles.horizontalGradeFuture,
          visualState === 'acquired' && styles.horizontalGradeAcquired,
          active && styles.horizontalGradeCurrent,
          active && { borderColor: accent, shadowColor: accent },
          pulseStyle,
        ]}
      >
        <RankEmblem decorative grade={gradeSummary(grade)} size={74} />
        {active ? (
          <View style={[styles.currentBadge, { borderColor: accent }]}>
            <Text style={[styles.currentBadgeText, { color: accent }]}>ACTUEL</Text>
          </View>
        ) : null}
      </Animated.View>

      <Text
        numberOfLines={1}
        style={[
          styles.horizontalGradeName,
          visualState === 'acquired' && styles.horizontalGradeNameAcquired,
          active && { color: accent },
        ]}
      >
        {grade.label.toUpperCase()}
      </Text>
      <Text numberOfLines={2} style={styles.horizontalGradeRange}>
        {gradeRange(grade)}
      </Text>
    </Animated.View>
  );
}

function gradeVisualState(
  grade: SeasonalGradeDefinition,
  state: RankSeasonState,
): RankTierVisualState {
  const order = SEASONAL_GRADE_LADDER.indexOf(grade);
  const currentOrder = Number(state.grade.ordre ?? -1);
  if (order === currentOrder) return 'current';
  return order < currentOrder ? 'acquired' : 'future';
}

function gradeAccessibilityLabel(
  grade: SeasonalGradeDefinition,
  state: RankTierVisualState,
) {
  const status = state === 'current' ? 'grade actuel' : state === 'acquired' ? 'grade acquis' : 'verrouillé';
  return `${grade.label}, ${gradeRange(grade).toLowerCase()}, ${status}`;
}

function gradeSummary(grade: SeasonalGradeDefinition): SeasonalGradeSummary {
  return {
    cle: grade.key,
    libelle: grade.label,
    ordre: SEASONAL_GRADE_LADDER.indexOf(grade),
    minimum: grade.minimum,
  };
}

function gradeRange(grade: SeasonalGradeDefinition) {
  const threshold = grade.minimum === 0
    ? 'DÉPART'
    : `${formatNumber(grade.minimum)} FRAGS`;
  return grade.minimumVerdicts ? `${threshold}\n${grade.minimumVerdicts} VERDICTS` : threshold;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}
