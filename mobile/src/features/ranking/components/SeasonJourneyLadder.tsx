import { Fragment } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import {
  isZeroRank,
  SEASONAL_GRADE_LADDER,
  type SeasonalGradeDefinition,
} from '../grades';
import type { RankSeasonState } from '../types';
import { RankTierPedestal, type RankTierVisualState } from './RankTierPedestal';
import {
  JOURNEY_FIRST_Y,
  JOURNEY_GRADE_SPACING,
  JOURNEY_VIEWBOX_WIDTH,
  journeyStyles as styles,
} from './SeasonJourney.styles';

const GRADES = [...SEASONAL_GRADE_LADDER].reverse();
const GRADE_X = [244, 218, 243, 216, 241, 220];

type SeasonJourneyLadderProps = {
  pulse: SharedValue<number>;
  reduceMotion: boolean;
  reveal: SharedValue<number>;
  state: RankSeasonState;
};

type JourneyPoint = {
  x: number;
  y: number;
};

export function SeasonJourneyLadder({
  pulse,
  reduceMotion,
  reveal,
  state,
}: SeasonJourneyLadderProps) {
  const gradePoints = GRADES.map((_, index) => ({
    x: GRADE_X[index] ?? 230,
    y: JOURNEY_FIRST_Y + index * JOURNEY_GRADE_SPACING,
  }));
  const journeyHeight = (gradePoints.at(-1)?.y ?? JOURNEY_FIRST_Y) + 102;
  const pathRevealStyle = useAnimatedStyle(() => ({
    height: interpolate(reveal.value, [0, 1], [0, journeyHeight]),
  }));
  const currentOrder = Number(state.grade.ordre ?? -1);
  const currentReversedIndex = GRADES.findIndex(
    (grade) => SEASONAL_GRADE_LADDER.indexOf(grade) === currentOrder,
  );

  return (
    <View style={[styles.journey, { height: journeyHeight }]}>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.pathLayer, pathRevealStyle]}
      >
        <JourneyEnergyPath
          currentReversedIndex={currentReversedIndex}
          height={journeyHeight}
          points={gradePoints}
        />
      </Animated.View>

      {GRADES.map((grade, index) => {
        const point = gradePoints[index];
        const visualState = gradeVisualState(grade, state);
        const label = gradeAccessibilityLabel(grade, visualState);
        const active = visualState === 'current';
        const entranceDelay = 110 + (GRADES.length - 1 - index) * 70;

        return (
          <View key={grade.key}>
            <Animated.View
              entering={reduceMotion ? undefined : FadeInUp.delay(entranceDelay).duration(420)}
              style={[styles.gradeLabel, { top: point.y - 27 }]}
            >
              <View style={styles.gradeLabelRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.gradeName,
                    visualState === 'acquired' && styles.gradeNameAcquired,
                    active && styles.gradeNameCurrent,
                  ]}
                >
                  {grade.label.toUpperCase()}
                </Text>
                <View style={[styles.gradeRule, active && styles.gradeRuleCurrent]} />
              </View>
              <Text style={[styles.gradeRange, active && styles.gradeRangeCurrent]}>
                {gradeRange(grade)}
              </Text>
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? undefined : FadeInUp.delay(entranceDelay).duration(460)}
              style={[
                styles.node,
                {
                  left: percent(point.x),
                  marginLeft: -79,
                  top: point.y - 57,
                },
              ]}
            >
              <RankTierPedestal
                accessibilityLabel={label}
                grade={grade}
                pulse={pulse}
                starting={grade.key === 'bronze' && isZeroRank(state.frags)}
                state={visualState}
              />
            </Animated.View>
          </View>
        );
      })}

    </View>
  );
}

function JourneyEnergyPath({
  currentReversedIndex,
  height,
  points,
}: {
  currentReversedIndex: number;
  height: number;
  points: JourneyPoint[];
}) {
  const segments = points.slice(0, -1).map((point, index) => ({
    d: connectorPath(point, points[index + 1]),
    index,
    point,
    next: points[index + 1],
  }));

  return (
    <Svg
      height={height}
      pointerEvents="none"
      preserveAspectRatio="none"
      style={styles.pathSvg}
      viewBox={`0 0 ${JOURNEY_VIEWBOX_WIDTH} ${height}`}
      width="100%"
    >
      <Defs>
        <SvgLinearGradient id="journeyCyan" x1="0" x2="0" y1="1" y2="0">
          <Stop offset="0" stopColor="#B9E9FF" />
          <Stop offset="0.55" stopColor="#79CAFF" />
          <Stop offset="1" stopColor="#347FA9" />
        </SvgLinearGradient>
      </Defs>

      <Path
        d={`M 136 ${height - 26} C 184 ${height - 54}, 117 ${height - 86}, 164 ${height - 112}`}
        fill="none"
        opacity={0.24}
        stroke="#32617C"
        strokeWidth={0.7}
      />
      <Path
        d={`M 286 ${height - 62} C 310 ${height - 98}, 274 ${height - 136}, 318 ${height - 166}`}
        fill="none"
        opacity={0.18}
        stroke="#79CAFF"
        strokeWidth={0.65}
      />

      {segments.map(({ d, index }) => (
        <Path
          key={`future-${index}`}
          d={d}
          fill="none"
          opacity={0.72}
          stroke="#263B48"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={4.2}
        />
      ))}

      {segments.map(({ d, index, point, next }) => {
        const active = currentReversedIndex >= 0 && index >= currentReversedIndex;
        if (!active) return null;
        const stroke = 'url(#journeyCyan)';
        const branch = branchPath(point, next, index);
        return (
          <Fragment key={`active-${index}`}>
            <Path d={d} fill="none" opacity={0.14} stroke={stroke} strokeLinecap="round" strokeWidth={14} />
            <Path d={d} fill="none" opacity={0.56} stroke={stroke} strokeLinecap="round" strokeWidth={5.5} />
            <Path d={d} fill="none" opacity={0.95} stroke="#D9F4FF" strokeLinecap="round" strokeWidth={1.35} />
            <Path d={branch} fill="none" opacity={0.34} stroke="#79CAFF" strokeLinecap="round" strokeWidth={0.8} />
          </Fragment>
        );
      })}
    </Svg>
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

function connectorPath(from: JourneyPoint, to: JourneyPoint) {
  const bend = from.x < to.x ? 38 : -38;
  const middleY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x + bend} ${middleY - 24}, ${to.x - bend} ${middleY + 24}, ${to.x} ${to.y}`;
}

function branchPath(from: JourneyPoint, to: JourneyPoint, index: number) {
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;
  const direction = index % 2 === 0 ? 1 : -1;
  return `M ${middleX} ${middleY} C ${middleX + 8 * direction} ${middleY + 7}, ${middleX + 18 * direction} ${middleY + 10}, ${middleX + 25 * direction} ${middleY + 18}`;
}

function gradeRange(grade: SeasonalGradeDefinition) {
  return grade.maximum == null
    ? `${formatNumber(grade.minimum)}+ FRAGS`
    : `${formatNumber(grade.minimum)}–${formatNumber(grade.maximum)} FRAGS`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function percent(x: number) {
  return `${(x / JOURNEY_VIEWBOX_WIDTH) * 100}%` as `${number}%`;
}
