import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import {
  formatMatchSchedule,
  withAlpha,
  type ConfrontationTeam,
  type MatchConfrontationState,
} from '../matchPresentation';
import type { HubMatch } from '../types';
import MatchConfrontationCanvas from './MatchConfrontationCanvas';
import { MATCH_PLATE_OUTWARD_SHIFT } from './matchConfrontationLayout';

type MatchConfrontationCardProps = {
  compactLandscape?: boolean;
  match: HubMatch;
  onPress: () => void;
  onPressIn?: () => void;
  reduceMotion: boolean;
  state: MatchConfrontationState;
};

const CARD_ASPECT_RATIO = 1.43;
const CARD_SIDE_INSET = spacing.sm;

export function MatchConfrontationCard({ compactLandscape = false, match, onPress, onPressIn, reduceMotion, state }: MatchConfrontationCardProps) {
  const { width } = useWindowDimensions();
  const compact = width < layout.compactWidthBreakpoint || compactLandscape;
  const cardWidth = compactLandscape
    ? Math.min(320, Math.max(240, width * .56))
    : Math.max(288, Math.min(width, layout.contentMaxWidth) - CARD_SIDE_INSET * 2);
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const sceneScale = cardWidth / 400;
  const statusAccent = state.phase === 'live'
    ? colors.live
    : state.phase === 'finished' || state.phase === 'cancelled'
      ? '#8F9AA4'
      : colors.volt;
  const event = String(match.evenement || '').trim() || 'COMPÉTITION';
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0 ? `BO${formatValue}` : 'FORMAT À CONFIRMER';
  const scoreCopy = state.phase !== 'live' && state.scoreLabel ? `, score ${state.scoreLabel}` : '';
  const statusGlass: [string, string, string] = state.phase === 'live'
    ? ['rgba(45,8,13,.96)', 'rgba(16,5,8,.94)', 'rgba(4,6,8,.98)']
    : ['rgba(18,25,31,.96)', 'rgba(7,11,14,.94)', 'rgba(2,5,7,.98)'];

  return (
    <View style={[styles.ticketShell, { height: cardHeight, width: cardWidth }]}>
      <Pressable
        accessibilityHint="Ouvre le Match Center"
        accessibilityLabel={`${state.teamA.name} contre ${state.teamB.name}, ${state.status}${scoreCopy}`}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        style={({ pressed }) => [styles.ticketSurface, pressed && styles.pressed]}
        testID="match-confrontation-card"
      >
        <View pointerEvents="none" style={styles.canvasLayer}>
          <MatchConfrontationCanvas
            height={cardHeight}
            leftAccent={state.teamA.accent}
            leftWinner={state.winner === 'a'}
            reduceMotion={reduceMotion}
            rightAccent={state.teamB.accent}
            rightWinner={state.winner === 'b'}
            width={cardWidth}
          />
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.watermarkLayer}
        >
          <View style={[styles.watermark, { left: -34 * sceneScale, top: 70 * sceneScale, transform: [{ rotateZ: '7deg' }] }]}>
            <TeamLogo
              accent={state.teamA.accent}
              contentScale={.92}
              frameless
              name={state.teamA.name}
              size={142 * sceneScale}
              tag={state.teamA.tag}
              uri={state.teamA.logo}
            />
          </View>
          <View style={[styles.watermark, { right: -34 * sceneScale, top: 70 * sceneScale, transform: [{ rotateZ: '-7deg' }] }]}>
            <TeamLogo
              accent={state.teamB.accent}
              contentScale={.92}
              frameless
              name={state.teamB.name}
              size={142 * sceneScale}
              tag={state.teamB.tag}
              uri={state.teamB.logo}
            />
          </View>
        </View>

        <View style={styles.matchTop}>
          <Text numberOfLines={1} style={styles.scheduleText}>{formatMatchSchedule(match.debut)}</Text>
          <View style={styles.eventMeta}>
            <Text numberOfLines={1} style={styles.eventName}>{event.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.formatText}>· {format}</Text>
          </View>
        </View>

        <View pointerEvents="none" style={styles.teamLayer}>
          <TeamFace
            compact={compact}
            reduceMotion={reduceMotion}
            sceneScale={sceneScale}
            team={state.teamA}
            winner={state.winner === 'a'}
            muted={state.winner === 'b'}
          />
          <TeamFace
            compact={compact}
            reduceMotion={reduceMotion}
            sceneScale={sceneScale}
            team={state.teamB}
            winner={state.winner === 'b'}
            muted={state.winner === 'a'}
          />
          {state.scoreLabel && state.phase !== 'live' ? (
            <View style={[styles.scoreOverlay, { left: 174 * sceneScale, top: 128 * sceneScale, width: 52 * sceneScale }]}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.score}>{state.scoreLabel}</Text>
            </View>
          ) : null}
        </View>

        {state.phase === 'live' ? (
          <View
            pointerEvents="none"
            style={[
              styles.liveMarker,
              {
                marginLeft: -58 * sceneScale,
                top: 32 * sceneScale,
                width: 116 * sceneScale,
              },
            ]}
          >
            <View style={styles.liveMarkerLine} />
            <View
              style={[
                styles.liveMarkerBadge,
                {
                  borderColor: withAlpha(colors.live, .88),
                  boxShadow: `0 7px 18px ${withAlpha(colors.live, .28)}`,
                  minHeight: Math.max(24, 26 * sceneScale),
                  minWidth: Math.max(52, 57 * sceneScale),
                },
              ]}
            >
              <LinearGradient colors={['#F12636', '#C70D22', '#850916']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
              <View style={styles.liveMarkerHighlight} />
              <Text style={[styles.liveMarkerText, { fontSize: Math.max(10, 10.5 * sceneScale) }]}>LIVE</Text>
            </View>
            <View style={styles.liveMarkerLine} />
          </View>
        ) : (
          <View
            style={[
              styles.matchStatus,
              compact && styles.matchStatusCompact,
              {
                borderColor: withAlpha(statusAccent, .58),
                boxShadow: `0 7px 18px ${withAlpha(statusAccent, .1)}`,
                shadowColor: statusAccent,
              },
            ]}
          >
            <LinearGradient colors={statusGlass} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={styles.statusHighlight} />
            <Text style={[styles.matchStatusText, { color: statusAccent }]}>{state.status}</Text>
          </View>
        )}

      </Pressable>
    </View>
  );
}

function TeamFace({
  compact,
  muted,
  reduceMotion,
  sceneScale,
  team,
  winner,
}: {
  compact: boolean;
  muted: boolean;
  reduceMotion: boolean;
  sceneScale: number;
  team: ConfrontationTeam;
  winner: boolean;
}) {
  const left = team.side === 'a';
  const anchorLeft = (left
    ? 54 - MATCH_PLATE_OUTWARD_SHIFT
    : 202 + MATCH_PLATE_OUTWARD_SHIFT) * sceneScale;
  const anchorTop = (left ? 73 : 71) * sceneScale;
  const anchorWidth = 152 * sceneScale;
  const logoSize = Math.round(80 * sceneScale);
  const logoStageHeight = 94 * sceneScale;
  const entry = (left ? FadeInLeft : FadeInRight)
    .springify()
    .damping(13)
    .mass(.74)
    .stiffness(118);
  const logoContentScale = team.name === 'G2 Esports'
    ? 1.22
    : team.name === 'Fnatic'
      ? .9
      : team.name === 'Karmine Corp'
        ? .72
        : 1;
  return (
    <Animated.View
      accessibilityLabel={`${team.name}${winner ? ', vainqueur' : ''}`}
      entering={reduceMotion ? undefined : entry}
      style={[
        styles.ticketTeam,
        {
          left: anchorLeft,
          top: anchorTop,
          width: anchorWidth,
        },
        muted && styles.ticketTeamMuted,
      ]}
    >
      <View style={[styles.logoStage, { height: logoStageHeight }]}>
        <View
          style={[
            styles.logoPerspective,
            {
              transform: [
                { rotateZ: left ? '6deg' : '-6deg' },
                { skewY: left ? '1.5deg' : '-1.5deg' },
                { scaleX: .91 },
                { translateY: left ? -4 : 2 },
              ],
            },
          ]}
        >
          <TeamLogo
            accent={team.accent}
            contentScale={logoContentScale}
            frameless
            name={team.name}
            size={logoSize}
            tag={team.tag}
            uri={team.logo}
          />
        </View>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.56}
        numberOfLines={1}
        style={[
          styles.teamTag,
          compact && styles.teamTagCompact,
          {
            fontSize: Math.max(compact ? 31 : 35, 40 * sceneScale),
            lineHeight: Math.max(compact ? 33 : 37, 42 * sceneScale),
            marginTop: 18 * sceneScale,
          },
          winner && { color: team.accent },
        ]}
      >
        {team.tag}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={.7} numberOfLines={1} style={[styles.teamName, compact && styles.teamNameCompact]}>{team.name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ticketShell: { position: 'relative', alignSelf: 'center', boxShadow: '0 20px 46px rgba(0,0,0,.48)' },
  ticketSurface: { position: 'absolute', inset: 0, padding: 14, overflow: 'hidden', borderRadius: 16, backgroundColor: '#02060A', borderWidth: 1, borderColor: '#324654' },
  canvasLayer: { position: 'absolute', inset: 0, zIndex: 0 },
  watermarkLayer: { position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' },
  watermark: { position: 'absolute', opacity: .05 },
  matchTop: { zIndex: 5, minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scheduleText: { ...typography.bodyStrong, flexShrink: 0, color: '#F4F6F7', fontSize: 12, letterSpacing: .25, textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  eventMeta: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  eventName: { ...typography.label, flexShrink: 1, minWidth: 0, color: '#B8C0C7', letterSpacing: .22, textAlign: 'right', textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  formatText: { ...typography.label, flexShrink: 0, color: '#D1D7DB', letterSpacing: .22, textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  teamLayer: { position: 'absolute', zIndex: 4, inset: 0 },
  scoreOverlay: { position: 'absolute', zIndex: 5, alignItems: 'center', justifyContent: 'center' },
  score: { color: '#F5F7F8', fontFamily: fonts.display, fontSize: 22, lineHeight: 25, letterSpacing: -.35, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.92)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7 },
  liveMarker: { position: 'absolute', zIndex: 7, left: '50%', minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  liveMarkerLine: { flex: 1, height: 1, borderRadius: 1, backgroundColor: 'rgba(244,248,250,.84)', boxShadow: '0 0 6px rgba(255,255,255,.28)' },
  liveMarkerBadge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 4, borderWidth: 1, backgroundColor: '#C70D22' },
  liveMarkerHighlight: { position: 'absolute', top: 1, left: 5, right: 5, height: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,.42)' },
  liveMarkerText: { color: '#FFFFFF', fontFamily: fonts.bold, lineHeight: 14, letterSpacing: .45, textShadowColor: 'rgba(80,0,10,.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  ticketTeam: { position: 'absolute', zIndex: 2, minWidth: 0, alignItems: 'center' },
  ticketTeamMuted: { opacity: .64 },
  logoStage: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  logoPerspective: { alignItems: 'center', justifyContent: 'center' },
  teamTag: { width: '100%', color: '#F7F8F9', fontFamily: fonts.display, letterSpacing: -1, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.94)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 9 },
  teamTagCompact: { letterSpacing: -.7 },
  teamName: { ...typography.label, width: '100%', marginTop: 1, paddingHorizontal: 3, color: '#BEC6CC', textAlign: 'center' },
  teamNameCompact: { fontSize: 11, lineHeight: 14 },
  matchStatus: { position: 'absolute', zIndex: 6, left: '40%', right: '40%', bottom: 9, minHeight: 32, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 16, backgroundColor: '#05080A', borderWidth: 1, shadowOpacity: .2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  matchStatusCompact: { left: '39%', right: '39%', bottom: 8, minHeight: 29, paddingHorizontal: 6 },
  statusHighlight: { position: 'absolute', top: 1, left: 9, right: 9, height: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,.15)' },
  matchStatusText: { ...typography.action, letterSpacing: .5 },
  pressed: { opacity: .78 },
});
