import { StyleSheet, Text, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import { relicContainerForLevel } from '@/src/features/social/faction/relicArtwork';
import type { CommunityFaction, FactionProgress } from '@/src/features/social/faction/types';
import { colors, fonts, typography } from '@/src/theme';

import StaticRelicVial from './StaticRelicVial';

type MiniatureState = 'complete' | 'current' | 'next' | 'locked';

const RAIL_FORMS = COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5);

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
            <FactionRelicMiniature level={form.level} size={43} state={state} />
            <Text
              numberOfLines={2}
              style={[
                styles.evolutionLabel,
                comfortable && styles.evolutionLabelComfortable,
                state === 'current' && styles.evolutionLabelCurrent,
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
  const opacity = masked ? .34 : state === 'complete' ? .82 : 1;

  return (
    <View style={[styles.miniature, { width: size, height }]}>
      <View style={[styles.imageWindow, { width: size, height }]}>
        <View style={[
          styles.imageHalo,
          state === 'current' && styles.imageHaloCurrent,
          state === 'complete' && styles.imageHaloComplete,
        ]} />
        <StaticRelicVial
          container={relicContainerForLevel(normalizedLevel)}
          height={height}
          opacity={opacity}
          testID={`relic-miniature-${normalizedLevel}`}
          width={size}
        />
        {masked ? <View style={styles.lockShade} /> : null}
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
        <View style={[styles.lockBadge, { top: Math.round(height * .39) }]}>
          <View style={styles.lockLoop} />
          <View style={styles.lockBody}><Text style={styles.lockDot}>•</Text></View>
        </View>
      ) : null}
    </View>
  );
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
    minHeight: 88,
    marginTop: 3,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#020609',
  },
  evolutionRailComfortable: {
    minHeight: 92,
    paddingTop: 3,
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
    top: 31,
    backgroundColor: '#303A42',
  },
  connectorComplete: { backgroundColor: '#557F79' },
  connectorComfortable: { top: 31 },
  connectorDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    right: '47%',
    top: -1.5,
    borderRadius: 2,
    backgroundColor: '#4B565E',
  },
  connectorDotComplete: { backgroundColor: colors.volt },
  miniature: { position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
  imageWindow: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#020406',
  },
  imageHalo: {
    position: 'absolute',
    left: '17%',
    right: '17%',
    top: '22%',
    bottom: '9%',
    borderRadius: 999,
    backgroundColor: 'rgba(19,81,95,.12)',
  },
  imageHaloCurrent: {
    backgroundColor: 'rgba(31,177,188,.22)',
    boxShadow: '0 0 12px rgba(56,208,215,.23)',
  },
  imageHaloComplete: { backgroundColor: 'rgba(28,113,122,.16)' },
  lockShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(3,6,8,.48)',
  },
  miniMedallion: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070A0D',
    borderWidth: 1,
    borderColor: '#A86B45',
  },
  lockBadge: {
    position: 'absolute',
    width: 18,
    height: 22,
    left: '50%',
    marginLeft: -9,
    alignItems: 'center',
  },
  lockLoop: {
    width: 10,
    height: 9,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#6D747A',
  },
  lockBody: {
    width: 15,
    height: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3035',
    borderWidth: 1,
    borderColor: '#626A70',
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
    maxWidth: 72,
    marginTop: 0,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  evolutionLabelCurrent: { color: colors.volt },
  evolutionLabelLocked: { color: '#78838C' },
});
