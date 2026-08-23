import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { colors, fonts, typography } from '@/src/theme';

import {
  formatMatchSchedule,
  withAlpha,
  type ConfrontationTeam,
  type MatchConfrontationState,
} from '../matchPresentation';
import type { HubMatch } from '../types';

type MatchConfrontationCardProps = {
  match: HubMatch;
  onPress: () => void;
  reduceMotion: boolean;
  state: MatchConfrontationState;
};

const RAY_POSITIONS = [42, 72, 104, 140, 178, 216];
const LEFT_RAY_ANGLES = ['19deg', '13deg', '7deg', '-5deg', '-12deg', '-19deg'] as const;
const RIGHT_RAY_ANGLES = ['-19deg', '-13deg', '-7deg', '5deg', '12deg', '19deg'] as const;
const PLATE_PATH = 'M19 2 H77 Q83 2 87 6 L94 13 Q98 17 98 23 V77 Q98 83 94 87 L87 94 Q83 98 77 98 H23 Q17 98 13 94 L6 87 Q2 83 2 77 V23 Q2 17 6 13 L13 6 Q17 2 23 2 Z';
const FRACTURE_PATH = 'M21 -6 L16 24 L22 48 L15 75 L21 102 L17 124 L23 146 L15 171 L21 196 L14 220 L20 246 L17 271 L22 306';
const GRAIN_PATH = 'M13 24h1v1h-1zM42 69h1v1h-1zM77 18h1v1h-1zM101 114h1v1h-1zM138 42h1v1h-1zM164 181h1v1h-1zM191 86h1v1h-1zM218 31h1v1h-1zM247 139h1v1h-1zM276 61h1v1h-1zM309 205h1v1h-1zM337 104h1v1h-1zM371 38h1v1h-1zM25 248h1v1h-1zM61 154h1v1h-1zM112 272h1v1h-1zM149 228h1v1h-1zM203 257h1v1h-1zM258 284h1v1h-1zM294 165h1v1h-1zM351 266h1v1h-1zM388 194h1v1h-1z';

export function MatchConfrontationCard({ match, onPress, reduceMotion, state }: MatchConfrontationCardProps) {
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const statusAccent = state.phase === 'live'
    ? colors.live
    : state.phase === 'finished' || state.phase === 'cancelled'
      ? '#8F9AA4'
      : colors.volt;
  const event = String(match.evenement || '').trim() || 'COMPÉTITION';
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0 ? `BO${formatValue}` : 'FORMAT À CONFIRMER';
  const scoreCopy = state.scoreLabel ? `, score ${state.scoreLabel}` : '';
  const statusGlass: [string, string, string] = state.phase === 'live'
    ? ['rgba(45,8,13,.96)', 'rgba(16,5,8,.94)', 'rgba(4,6,8,.98)']
    : ['rgba(18,25,31,.96)', 'rgba(7,11,14,.94)', 'rgba(2,5,7,.98)'];

  return (
    <View style={styles.ticketShell}>
      <Pressable
        accessibilityHint="Ouvre le Match Center"
        accessibilityLabel={`${state.teamA.name} contre ${state.teamB.name}, ${state.status}${scoreCopy}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.ticketSurface, pressed && styles.pressed]}
      >
        <View pointerEvents="none" style={styles.territories}>
          <TeamTerritory compact={compact} side="a" team={state.teamA} />
          <TeamTerritory compact={compact} side="b" team={state.teamB} />
          <View style={styles.centerBlend}>
            <LinearGradient
              colors={[
                withAlpha(state.teamA.accent, .14),
                'rgba(7,11,15,.82)',
                withAlpha(state.teamB.accent, .14),
              ]}
              end={{ x: 1, y: .5 }}
              start={{ x: 0, y: .5 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <FilmGrain />
          <LinearGradient
            colors={['rgba(0,2,4,.68)', 'rgba(0,2,4,.02)', 'rgba(0,2,4,.58)']}
            end={{ x: .5, y: 1 }}
            start={{ x: .5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,2,4,.48)', 'rgba(0,2,4,0)', 'rgba(0,2,4,.48)']}
            end={{ x: 1, y: .5 }}
            start={{ x: 0, y: .5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.delay(170).duration(320).easing(Easing.out(Easing.cubic))}
          pointerEvents="none"
          style={styles.fractureWrap}
        >
          <Fracture leftAccent={state.teamA.accent} rightAccent={state.teamB.accent} showPulse={!state.scoreLabel} />
        </Animated.View>

        <View style={styles.matchTop}>
          <Text numberOfLines={1} style={styles.scheduleText}>{formatMatchSchedule(match.debut)}</Text>
          <View style={styles.eventMeta}>
            <Text numberOfLines={1} style={styles.eventName}>{event.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.formatText}>· {format}</Text>
          </View>
        </View>

        <View style={[styles.duel, compact && styles.duelCompact]}>
          <TeamFace
            compact={compact}
            reduceMotion={reduceMotion}
            team={state.teamA}
            winner={state.winner === 'a'}
            muted={state.winner === 'b'}
          />
          <View pointerEvents="none" style={[styles.centerLane, compact && styles.centerLaneCompact]}>
            {state.scoreLabel ? (
              <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.score, state.phase === 'live' && styles.scoreLive]}>{state.scoreLabel}</Text>
            ) : null}
          </View>
          <TeamFace
            compact={compact}
            reduceMotion={reduceMotion}
            team={state.teamB}
            winner={state.winner === 'b'}
            muted={state.winner === 'a'}
          />
        </View>

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

        <View pointerEvents="none" style={[styles.ticketTopCut, styles.ticketTopCutLeft]} />
        <View pointerEvents="none" style={[styles.ticketTopCut, styles.ticketTopCutRight]} />
        <View pointerEvents="none" style={[styles.ticketSideNotch, styles.ticketSideNotchLeft]} />
        <View pointerEvents="none" style={[styles.ticketSideNotch, styles.ticketSideNotchRight]} />
      </Pressable>
    </View>
  );
}

function TeamTerritory({ compact, side, team }: { compact: boolean; side: 'a' | 'b'; team: ConfrontationTeam }) {
  const left = side === 'a';
  const baseColors: [string, string, string, string] = left
    ? ['#070B0F', '#07111F', '#0B2548', '#123C78']
    : ['#4A130A', '#351006', '#160907', '#070B0F'];
  const teamGlow: [string, string, string] = left
    ? ['rgba(0,0,0,0)', withAlpha(team.accent, .08), withAlpha(team.accent, .3)]
    : [withAlpha(team.accent, .3), withAlpha(team.accent, .08), 'rgba(0,0,0,0)'];
  const reflectedLight: [string, string, string] = left
    ? ['rgba(0,0,0,0)', 'rgba(76,157,255,.08)', 'rgba(76,157,255,.28)']
    : ['rgba(255,106,26,.28)', 'rgba(255,106,26,.08)', 'rgba(0,0,0,0)'];

  return (
    <View accessible={false} style={styles.territory}>
      <LinearGradient
        colors={baseColors}
        end={{ x: 1, y: .5 }}
        locations={[0, .38, .74, 1]}
        start={{ x: 0, y: .5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={teamGlow}
        end={{ x: 1, y: .52 }}
        locations={[0, .62, 1]}
        start={{ x: 0, y: .48 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={reflectedLight}
        end={{ x: 1, y: .5 }}
        locations={[0, .72, 1]}
        start={{ x: 0, y: .5 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.territoryHaloOuter,
          left ? styles.territoryHaloOuterLeft : styles.territoryHaloOuterRight,
          {
            backgroundColor: withAlpha(team.accent, .035),
            boxShadow: `0 0 52px ${withAlpha(team.accent, .16)}`,
          },
        ]}
      />
      <View
        style={[
          styles.territoryHaloInner,
          left ? styles.territoryHaloInnerLeft : styles.territoryHaloInnerRight,
          { backgroundColor: left ? 'rgba(76,157,255,.1)' : 'rgba(255,106,26,.1)' },
        ]}
      />
      {RAY_POSITIONS.map((top, index) => (
        <View
          key={`${side}-${top}`}
          style={[
            styles.territoryRay,
            left ? styles.territoryRayLeft : styles.territoryRayRight,
            {
              backgroundColor: index % 2
                ? withAlpha(team.accent, .21)
                : left
                  ? 'rgba(76,157,255,.19)'
                  : 'rgba(255,106,26,.19)',
              opacity: index === 0 || index === RAY_POSITIONS.length - 1 ? .6 : 1,
              top: compact ? Math.round(top * .72) : top,
              transform: [{ rotateZ: left ? LEFT_RAY_ANGLES[index] : RIGHT_RAY_ANGLES[index] }],
            },
          ]}
        />
      ))}
      <View style={[styles.watermark, left ? styles.watermarkLeft : styles.watermarkRight, compact && styles.watermarkCompact]}>
        <TeamLogo accent={team.accent} contentScale={1.02} frameless name={team.name} size={compact ? 124 : 158} tag={team.tag} uri={team.logo} />
      </View>
    </View>
  );
}

function TeamFace({
  compact,
  muted,
  reduceMotion,
  team,
  winner,
}: {
  compact: boolean;
  muted: boolean;
  reduceMotion: boolean;
  team: ConfrontationTeam;
  winner: boolean;
}) {
  const left = team.side === 'a';
  const plateSize = compact ? 88 : 106;
  const outward = left ? -1 : 1;
  const entry = (left ? FadeInLeft : FadeInRight)
    .duration(480)
    .easing(Easing.out(Easing.cubic));
  return (
    <Animated.View
      accessibilityLabel={`${team.name}${winner ? ', vainqueur' : ''}`}
      entering={reduceMotion ? undefined : entry}
      style={[styles.ticketTeam, muted && styles.ticketTeamMuted]}
    >
      <View
        style={[
          styles.plateScene,
          {
            height: plateSize,
            transform: [
              { perspective: 680 },
              { rotateY: left ? '-15deg' : '15deg' },
              { rotateZ: left ? '2deg' : '-2deg' },
              { translateX: left ? 6 : -6 },
              { translateY: -1 },
            ],
            width: plateSize,
          },
        ]}
      >
        <View
          style={[
            styles.plateLayer,
            styles.plateShadowLayer,
            {
              boxShadow: '0 15px 25px rgba(0,0,0,.68)',
              transform: [
                { translateX: outward * 10 },
                { translateY: 13 },
                { scale: 1.08 },
              ],
            },
          ]}
        >
          <PlateLayer accent={team.accent} side={team.side} variant="shadow" winner={winner} />
        </View>
        <View
          style={[
            styles.plateLayer,
            {
              transform: [
                { translateX: outward * 7 },
                { translateY: 9 },
              ],
            },
          ]}
        >
          <PlateLayer accent={team.accent} side={team.side} variant="extrusion" winner={winner} />
        </View>
        <View style={[styles.plateLayer, styles.plateRimLayer]}>
          <PlateLayer accent={team.accent} side={team.side} variant="rim" winner={winner} />
        </View>
        <View style={[styles.plateLayer, styles.plateFaceLayer]}>
          <PlateLayer accent={team.accent} side={team.side} variant="face" winner={winner} />
          <View style={styles.plateLogo}>
            <TeamLogo
              accent={team.accent}
              contentScale={1.08}
              frameless
              name={team.name}
              size={Math.round(plateSize * .9)}
              tag={team.tag}
              uri={team.logo}
            />
          </View>
        </View>
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={.56} numberOfLines={1} style={[styles.teamTag, compact && styles.teamTagCompact, winner && { color: team.accent }]}>{team.tag}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={.7} numberOfLines={1} style={[styles.teamName, compact && styles.teamNameCompact]}>{team.name}</Text>
    </Animated.View>
  );
}

function PlateLayer({
  accent,
  side,
  variant,
  winner,
}: {
  accent: string;
  side: 'a' | 'b';
  variant: 'shadow' | 'extrusion' | 'rim' | 'face';
  winner: boolean;
}) {
  const gradientId = `plate-${variant}-${side}`;
  const fill = variant === 'shadow'
    ? '#000204'
    : variant === 'extrusion'
      ? `url(#${gradientId})`
      : variant === 'rim'
        ? accent
        : `url(#${gradientId})`;
  return (
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width="100%">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor={variant === 'extrusion' ? accent : '#17222B'} stopOpacity={variant === 'extrusion' ? .38 : 1} />
          <Stop offset={variant === 'extrusion' ? .4 : .38} stopColor={variant === 'extrusion' ? '#0A1117' : '#080E13'} />
          <Stop offset="1" stopColor={variant === 'extrusion' ? '#000204' : '#010305'} />
        </SvgLinearGradient>
      </Defs>
      <Path
        d={PLATE_PATH}
        fill={fill}
        fillOpacity={variant === 'rim' ? .22 : variant === 'shadow' ? .96 : 1}
        stroke={variant === 'shadow' ? '#000000' : accent}
        strokeOpacity={variant === 'face' ? (winner ? .98 : .76) : variant === 'rim' ? .5 : .22}
        strokeWidth={variant === 'face' ? (winner ? 2 : 1.35) : variant === 'rim' ? 2.6 : 1.2}
      />
      {variant === 'face' ? (
        <>
          <Path d="M18 7 H76 Q81 7 85 11 L91 17" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity=".24" strokeWidth="1.2" />
          <Path d="M8 76 Q8 82 13 86 L19 92 H77" fill="none" stroke="#000000" strokeLinecap="round" strokeOpacity=".92" strokeWidth="3.2" />
          <Path d="M13 80 Q14 84 20 88 H76" fill="none" stroke={accent} strokeLinecap="round" strokeOpacity=".2" strokeWidth="1" />
        </>
      ) : null}
    </Svg>
  );
}

function Fracture({ leftAccent, rightAccent, showPulse }: { leftAccent: string; rightAccent: string; showPulse: boolean }) {
  return (
    <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" viewBox="0 0 40 300" width="100%">
      <Defs>
        <SvgLinearGradient id="fracture-halo" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={leftAccent} stopOpacity=".38" />
          <Stop offset=".5" stopColor="#FFF7E6" stopOpacity=".2" />
          <Stop offset="1" stopColor={rightAccent} stopOpacity=".38" />
        </SvgLinearGradient>
        <SvgLinearGradient id="fracture-core" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#C9E1FF" stopOpacity=".48" />
          <Stop offset=".46" stopColor="#FFF9EA" stopOpacity=".96" />
          <Stop offset=".56" stopColor={colors.volt} stopOpacity=".8" />
          <Stop offset="1" stopColor="#FFD9BF" stopOpacity=".42" />
        </SvgLinearGradient>
      </Defs>
      <Path d={FRACTURE_PATH} fill="none" stroke="url(#fracture-halo)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".42" strokeWidth="12" />
      <Path d={FRACTURE_PATH} fill="none" stroke="#FFF2DC" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".18" strokeWidth="4.5" />
      <Path d={FRACTURE_PATH} fill="none" stroke="url(#fracture-core)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
      <Path d="M17 123 L8 130 M22 145 L34 137 M16 171 L8 179" fill="none" stroke="#FFF7E8" strokeLinecap="round" strokeOpacity=".52" strokeWidth="1" />
      <Path d="M18 121 L12 126 M23 146 L30 141 M16 172 L11 177" fill="none" stroke={colors.volt} strokeLinecap="round" strokeOpacity=".3" strokeWidth="2.4" />
      {showPulse ? (
        <>
          <Circle cx="20" cy="151" fill={colors.volt} opacity=".12" r="5.5" />
          <Circle cx="20" cy="151" fill="#FFF9E7" opacity=".94" r="1.35" />
        </>
      ) : null}
    </Svg>
  );
}

function FilmGrain() {
  return (
    <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" style={styles.grainOverlay} viewBox="0 0 400 300" width="100%">
      <Path d={GRAIN_PATH} fill="#FFFFFF" opacity=".085" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ticketShell: { position: 'relative', width: '100%', aspectRatio: 1.38, boxShadow: '0 17px 38px rgba(0,0,0,.38)' },
  ticketSurface: { position: 'absolute', inset: 0, padding: 14, overflow: 'hidden', borderRadius: 12, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#293640' },
  territories: { position: 'absolute', inset: 0, flexDirection: 'row', backgroundColor: '#070B0F' },
  territory: { position: 'relative', width: '50%', height: '100%', overflow: 'hidden' },
  territoryRay: { position: 'absolute', width: 205, height: 1 },
  territoryRayLeft: { right: -38 },
  territoryRayRight: { left: -38 },
  territoryHaloOuter: { position: 'absolute', top: '18%', width: 148, height: 148, borderRadius: 74, transform: [{ scaleX: 1.22 }] },
  territoryHaloOuterLeft: { right: '7%' },
  territoryHaloOuterRight: { left: '7%' },
  territoryHaloInner: { position: 'absolute', top: '27%', width: 92, height: 92, borderRadius: 46, transform: [{ scaleX: 1.16 }] },
  territoryHaloInnerLeft: { right: '19%' },
  territoryHaloInnerRight: { left: '19%' },
  watermark: { position: 'absolute', top: 66, opacity: .052 },
  watermarkLeft: { left: -52 },
  watermarkRight: { right: -52 },
  watermarkCompact: { top: 43 },
  centerBlend: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 52, marginLeft: -26 },
  grainOverlay: { position: 'absolute', inset: 0 },
  fractureWrap: { position: 'absolute', zIndex: 1, top: -3, bottom: -3, left: '50%', width: 40, marginLeft: -20, alignItems: 'center' },
  matchTop: { zIndex: 3, minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scheduleText: { ...typography.bodyStrong, flexShrink: 0, color: '#F4F6F7', fontSize: 12, letterSpacing: .25, textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  eventMeta: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  eventName: { ...typography.label, flexShrink: 1, minWidth: 0, color: '#B8C0C7', fontSize: 9, letterSpacing: .22, textAlign: 'right', textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  formatText: { ...typography.label, flexShrink: 0, color: '#D1D7DB', fontSize: 9, letterSpacing: .22, textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  duel: { zIndex: 2, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  duelCompact: { marginTop: 14 },
  centerLane: { width: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  centerLaneCompact: { width: 32, minWidth: 32 },
  score: { color: '#F5F7F8', fontFamily: fonts.display, fontSize: 19, lineHeight: 22, letterSpacing: -.35, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.92)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7 },
  scoreLive: { color: '#FFFFFF', textShadowColor: 'rgba(255,62,85,.45)', textShadowRadius: 9 },
  ticketTeam: { position: 'relative', zIndex: 2, flex: 1, minWidth: 0, alignItems: 'center' },
  ticketTeamMuted: { opacity: .64 },
  plateScene: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible', backfaceVisibility: 'hidden' },
  plateLayer: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  plateShadowLayer: { opacity: .78, shadowColor: '#000000', shadowOpacity: .68, shadowRadius: 17, shadowOffset: { width: 0, height: 12 } },
  plateRimLayer: { transform: [{ translateY: 1.5 }, { scale: 1.04 }] },
  plateFaceLayer: { backfaceVisibility: 'hidden' },
  plateLogo: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', transform: [{ scale: .97 }] },
  teamTag: { width: '100%', marginTop: 9, color: '#F7F8F9', fontFamily: fonts.display, fontSize: 37, lineHeight: 39, letterSpacing: -.8, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
  teamTagCompact: { marginTop: 5, fontSize: 28, lineHeight: 30 },
  teamName: { ...typography.label, width: '100%', marginTop: 1, paddingHorizontal: 3, color: '#BEC6CC', fontSize: 8, lineHeight: 10, textAlign: 'center' },
  teamNameCompact: { fontSize: 7, lineHeight: 9 },
  matchStatus: { zIndex: 4, minHeight: 29, marginTop: 10, paddingHorizontal: 14, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 15, backgroundColor: '#05080A', borderWidth: 1, shadowOpacity: .2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  matchStatusCompact: { minHeight: 27, marginTop: 6, paddingHorizontal: 11 },
  statusHighlight: { position: 'absolute', top: 1, left: 9, right: 9, height: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,.15)' },
  matchStatusText: { ...typography.action, fontSize: 10, letterSpacing: .5 },
  ticketTopCut: { position: 'absolute', top: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.background, borderWidth: 1, borderColor: '#303941' },
  ticketTopCutLeft: { left: -15 },
  ticketTopCutRight: { right: -15 },
  ticketSideNotch: { position: 'absolute', top: '56%', width: 18, height: 18, marginTop: -9, borderRadius: 9, backgroundColor: colors.background, borderWidth: 1, borderColor: '#303941' },
  ticketSideNotchLeft: { left: -8 },
  ticketSideNotchRight: { right: -8 },
  pressed: { opacity: .78 },
});
