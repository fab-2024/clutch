import { StyleSheet, Text, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import { useSharedValue } from 'react-native-reanimated';
import { RestingMachine } from '../reactor/FocusedModule';
import type { ReactorStage } from '../reactor/model';
import type { CommunityFaction, FactionProgress } from '@/src/features/social/faction/types';
import { colors, fonts, typography } from '@/src/theme';



type MiniatureState = 'complete' | 'current' | 'next' | 'locked';

const RAIL_FORMS = COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5);
const MINIATURE_VIEW_BOXES: Record<ReactorStage, string> = {
  1: '205 332 590 600',
  2: '145 218 710 710',
  3: '108 242 784 700',
  4: '88 108 824 824',
  5: '34 8 932 932',
};

export default function FactionEvolutionRail({
  comfortable = false,
  progress,
}: {
  comfortable?: boolean;
  progress: FactionProgress;
}) {
  const currentLevel = Math.min(5, Math.max(0, progress.level));

  return (
    <View style={[styles.evolutionRail, comfortable && styles.evolutionRailComfortable]}>
      {RAIL_FORMS.map((form, index) => {
        const state = miniatureState(form.level, currentLevel, progress.awakened);
        const miniatureSize = comfortable ? 58 : 46;
        return (
          <View
            accessibilityLabel={`${form.name}, ${stateLabel(state)}`}
            accessibilityRole="image"
            key={form.state}
            style={styles.evolutionNode}
          >
            {index < RAIL_FORMS.length - 1 ? (
              <View style={[
                styles.connector,
                comfortable && styles.connectorComfortable,
                state === 'complete' && styles.connectorComplete,
              ]}>
                <View style={[styles.connectorDot, state === 'complete' && styles.connectorDotComplete]} />
              </View>
            ) : null}
            <View style={comfortable ? styles.miniatureSlotComfortable : undefined}>
              <FactionRelicMiniature level={form.level} size={miniatureSize} state={state} />
            </View>
            <Text
              numberOfLines={2}
              style={[
                styles.evolutionLabel,
                comfortable && styles.evolutionLabelComfortable,
                state === 'current' && styles.evolutionLabelCurrent,
                state === 'current' && comfortable && styles.evolutionLabelCurrentComfortable,
                (state === 'locked' || state === 'next') && styles.evolutionLabelLocked,
              ]}
            >
              {form.name.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function FactionRelicMiniature({
  faction,
  level,
  size = 48,
  state,
}: {
  faction?: CommunityFaction | null;
  level: number;
  size?: number;
  state: MiniatureState;
}) {
  const normalizedLevel = Math.max(1, Math.min(5, level));
  const height = Math.round(size * 1.22);
  const medallionSize = Math.max(18, Math.round(size * .42));
  const masked = state === 'locked' || state === 'next';
  const opacity = state === 'locked' ? .58 : state === 'next' ? .72 : state === 'complete' ? .82 : 1;

  return (
    <View style={[styles.miniature, { width: size, height }]}>
      <View style={[styles.imageWindow, { width: size, height }]}>
        <ReactorMiniature level={normalizedLevel as ReactorStage} opacity={opacity} />
        {masked ? <View style={styles.lockShade} /> : null}
        {state === 'current' ? <View style={styles.currentMarker} /> : null}
      </View>

      {faction ? (
        <View
          style={[
            styles.miniMedallion,
            {
              width: medallionSize,
              height: medallionSize,
              left: (size - medallionSize) / 2,
              bottom: -1,
              borderRadius: medallionSize / 2,
            },
          ]}
        >
          <TeamLogo
            accent={state === 'current' ? colors.volt : '#C48350'}
            name={faction.nom}
            size={medallionSize - 5}
            tag={faction.tag}
            uri={faction.logo}
          />
        </View>
      ) : null}

      {masked ? (
        <View style={styles.lockBadge}>
          <View style={styles.lockLoop} />
          <View style={styles.lockBody}><Text style={styles.lockDot}>•</Text></View>
        </View>
      ) : null}
    </View>
  );
}

function ReactorMiniature({ level, opacity }: { level: ReactorStage; opacity: number }) {
  const fill = useSharedValue(.63), clock = useSharedValue(0);
  return <View style={[StyleSheet.absoluteFill, { opacity }]} testID={`relic-miniature-${level}`}>
    <RestingMachine
      box={MINIATURE_VIEW_BOXES[level]}
      stage={level}
      fill={fill}
      mutation={clock}
      reaction={clock}
      reduced
    />
  </View>;
}

function miniatureState(level: number, currentLevel: number, awakened: boolean): MiniatureState {
  if (awakened) return level < 5 ? 'complete' : 'current';
  if (level < currentLevel) return 'complete';
  if (level === currentLevel) return 'current';
  if (level === currentLevel + 1) return 'next';
  return 'locked';
}

function stateLabel(state: MiniatureState) {
  if (state === 'complete') return 'forme franchie';
  if (state === 'current') return 'forme actuelle';
  if (state === 'next') return 'prochaine forme';
  return 'forme verrouillée';
}

const styles = StyleSheet.create({
  evolutionRail: {
    minHeight: 96,
    marginTop: 3,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#091117',
  },
  evolutionRailComfortable: {
    minHeight: 102,
    marginTop: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 2,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  evolutionNode: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  connector: {
    position: 'absolute',
    zIndex: -1,
    width: '55%',
    height: 1,
    right: '-28%',
    top: 35,
    backgroundColor: '#152633',
  },
  connectorComplete: { backgroundColor: '#285E7D' },
  connectorComfortable: { top: 37 },
  connectorDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    right: '47%',
    top: -1.5,
    borderRadius: 2,
    backgroundColor: '#4B565E',
  },
  connectorDotComplete: { backgroundColor: '#2EA8FF' },
  miniature: { position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
  miniatureSlotComfortable: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  imageWindow: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#0B1218',
  },
  lockShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(3,6,8,.14)',
  },
  currentMarker: {
    position: 'absolute',
    bottom: 1,
    left: '34%',
    right: '34%',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2EA8FF',
    boxShadow: '0 0 7px rgba(46,168,255,.55)',
  },
  miniMedallion: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#A86B45',
  },
  lockBadge: {
    position: 'absolute',
    width: 18,
    height: 22,
    top: 4,
    right: 0,
    alignItems: 'center',
  },
  lockLoop: {
    width: 10,
    height: 9,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#30414E',
  },
  lockBody: {
    width: 15,
    height: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#152633',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  lockDot: { color: '#A8AFB4', fontFamily: fonts.bold, fontSize: 8, lineHeight: 8 },
  evolutionLabel: {
    ...typography.label,
    maxWidth: 68,
    marginTop: -1,
    color: '#BFC7CC',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: .05,
    textAlign: 'center',
  },
  evolutionLabelComfortable: {
    width: '100%',
    maxWidth: '100%',
    marginTop: 1,
    fontFamily: fonts.displayBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  evolutionLabelCurrent: { color: colors.volt },
  evolutionLabelCurrentComfortable: { color: colors.text },
  evolutionLabelLocked: { color: '#78838C' },
});
