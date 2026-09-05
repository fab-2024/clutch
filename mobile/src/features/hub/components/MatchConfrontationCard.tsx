import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { fonts, layout, typography } from '@/src/theme';

import {
  formatMatchHeaderSchedule,
  withAlpha,
  type ConfrontationTeam,
  type MatchConfrontationState,
} from '../matchPresentation';
import type { HubMatch } from '../types';
import { buildMatchTerritoryPalette } from './matchConfrontationPalette';

type MatchConfrontationCardProps = {
  accessibilityHint?: string;
  match: HubMatch;
  onPress: () => void;
  onPressIn?: () => void;
  state: MatchConfrontationState;
};

const CARD_ASPECT_RATIO = 1.405;

export function MatchConfrontationCard({
  accessibilityHint = 'Ouvre le Match Center',
  match,
  onPress,
  onPressIn,
  state,
}: MatchConfrontationCardProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, layout.contentMaxWidth);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT_RATIO);
  const sceneScale = cardWidth / 400;
  const event = String(match.evenement || '').trim() || 'COMPÉTITION';
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0
    ? 'BO' + formatValue
    : 'FORMAT À CONFIRMER';
  const scoreCopy = state.scoreLabel
    ? ', score ' + state.scoreLabel
    : '';

  return (
    <View style={[styles.ticketShell, { height: cardHeight, width: cardWidth }]}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={state.teamA.name + ' contre ' + state.teamB.name + ', ' + state.status + scoreCopy}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        style={({ pressed }) => [styles.ticketSurface, pressed && styles.pressed]}
        testID="match-confrontation-card"
      >
        <ArenaBackdrop
          height={cardHeight}
          leftAccent={state.teamA.accent}
          rightAccent={state.teamB.accent}
          width={cardWidth}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.watermarkLayer}
        >
          <View style={[styles.watermark, { left: -24 * sceneScale, top: 42 * sceneScale }]}>
            <TeamLogo
              accent={state.teamA.accent}
              contentScale={.96}
              frameless
              name={state.teamA.name}
              size={188 * sceneScale}
              tag={state.teamA.tag}
              uri={state.teamA.logo}
            />
          </View>
          <View style={[styles.watermark, { right: -24 * sceneScale, top: 42 * sceneScale }]}>
            <TeamLogo
              accent={state.teamB.accent}
              contentScale={1.08}
              frameless
              name={state.teamB.name}
              size={188 * sceneScale}
              tag={state.teamB.tag}
              uri={state.teamB.logo}
            />
          </View>
        </View>

        <MatchMetadata
          event={event}
          format={format}
          sceneScale={sceneScale}
          schedule={formatMatchHeaderSchedule(match.debut)}
          state={state}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.matchupTitle,
            {
              marginLeft: -110 * sceneScale,
              top: 38 * sceneScale,
              width: 220 * sceneScale,
            },
          ]}
          testID="match-confrontation-title"
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={.58}
            numberOfLines={1}
            style={[
              styles.matchupTitleText,
              {
                fontSize: 33 * sceneScale,
                lineHeight: 37 * sceneScale,
              },
            ]}
          >
            {state.teamA.tag} — {state.teamB.tag}
          </Text>
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.teamLayer}
        >
          <TeamFace
            muted={state.winner === 'b'}
            sceneScale={sceneScale}
            team={state.teamA}
            winner={state.winner === 'a'}
          />
          <TeamFace
            muted={state.winner === 'a'}
            sceneScale={sceneScale}
            team={state.teamB}
            winner={state.winner === 'b'}
          />
        </View>
      </Pressable>
    </View>
  );
}

function MatchMetadata({
  event,
  format,
  sceneScale,
  schedule,
  state,
}: {
  event: string;
  format: string;
  sceneScale: number;
  schedule: string;
  state: MatchConfrontationState;
}) {
  const lead = state.phase === 'live'
    ? 'EN DIRECT'
    : state.phase === 'finished'
      ? 'TERMINÉ'
      : state.phase === 'cancelled'
        ? 'ANNULÉ'
        : schedule;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.matchTop,
        {
          height: 32 * sceneScale,
          paddingHorizontal: 13 * sceneScale,
        },
      ]}
    >
      <View style={styles.matchMetaLead}>
        {state.phase === 'live' ? <View style={styles.liveDot} /> : null}
        <Text
          numberOfLines={1}
          style={[
            styles.matchMetaLeadText,
            state.phase === 'live' && styles.matchMetaLiveText,
            { fontSize: 11 * sceneScale, lineHeight: 14 * sceneScale },
          ]}
        >
          {lead}
        </Text>
      </View>
      <Text style={[styles.matchMetaSeparator, { fontSize: 11 * sceneScale }]}>·</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.58}
        numberOfLines={1}
        style={[
          styles.eventName,
          {
            fontSize: 11 * sceneScale,
            lineHeight: 14 * sceneScale,
          },
        ]}
      >
        {event.toUpperCase()}
      </Text>
      <Text style={[styles.matchMetaSeparator, { fontSize: 11 * sceneScale }]}>·</Text>
      <Text
        numberOfLines={1}
        style={[
          styles.matchFormat,
          {
            fontSize: 11 * sceneScale,
            lineHeight: 14 * sceneScale,
          },
        ]}
      >
        {format}
      </Text>
    </View>
  );
}

function ArenaBackdrop({
  height,
  leftAccent,
  rightAccent,
  width,
}: {
  height: number;
  leftAccent: string;
  rightAccent: string;
  width: number;
}) {
  const uniqueId = useId().replace(/:/g, '');
  const leftPalette = buildMatchTerritoryPalette(leftAccent);
  const rightPalette = buildMatchTerritoryPalette(rightAccent);
  const leftGradient = 'hub-left-' + uniqueId;
  const rightGradient = 'hub-right-' + uniqueId;
  const shadeGradient = 'hub-shade-' + uniqueId;

  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <Svg height={height} preserveAspectRatio="none" viewBox="0 0 400 280" width={width}>
        <Defs>
          <SvgLinearGradient id={leftGradient} x1="0" x2="1" y1=".4" y2=".55">
            <Stop offset="0" stopColor={leftPalette.outer} />
            <Stop offset=".68" stopColor={leftPalette.middle} />
            <Stop offset="1" stopColor={leftPalette.nearFracture} />
          </SvgLinearGradient>
          <SvgLinearGradient id={rightGradient} x1="0" x2="1" y1=".55" y2=".4">
            <Stop offset="0" stopColor={rightPalette.nearFracture} />
            <Stop offset=".36" stopColor={rightPalette.middle} />
            <Stop offset="1" stopColor={rightPalette.outer} />
          </SvgLinearGradient>
          <SvgLinearGradient id={shadeGradient} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity=".16" />
            <Stop offset=".62" stopColor="#000000" stopOpacity=".02" />
            <Stop offset="1" stopColor="#000000" stopOpacity=".46" />
          </SvgLinearGradient>
        </Defs>

        <Path d="M0 0 H244 L168 280 H0 Z" fill={'url(#' + leftGradient + ')'} />
        <Path d="M244 0 H400 V280 H168 Z" fill={'url(#' + rightGradient + ')'} />

        <G fill={withAlpha(leftPalette.local, .1)}>
          <Path d="M0 62 L72 0 H98 L0 126 Z" />
          <Path d="M0 136 L138 0 H158 L0 202 Z" />
          <Path d="M0 280 L113 164 L75 280 Z" />
          <Path d="M88 280 L190 112 L151 280 Z" />
        </G>
        <G fill={withAlpha(rightPalette.local, .1)}>
          <Path d="M400 50 L346 0 H320 L400 112 Z" />
          <Path d="M400 128 L278 0 H258 L400 194 Z" />
          <Path d="M400 280 L312 166 L344 280 Z" />
          <Path d="M320 280 L224 116 L263 280 Z" />
        </G>

        <G fill="none" stroke={withAlpha(leftPalette.edge, .42)} strokeWidth="1">
          <Path d="M0 70 L82 12" />
          <Path d="M0 116 L128 18" />
          <Path d="M0 218 L172 78" />
          <Path d="M20 280 L184 126" />
        </G>
        <G fill="none" stroke={withAlpha(rightPalette.edge, .42)} strokeWidth="1">
          <Path d="M400 70 L328 10" />
          <Path d="M400 116 L282 18" />
          <Path d="M400 218 L232 78" />
          <Path d="M380 280 L220 126" />
        </G>

        <Path d="M231 -14 L261 -14 L181 294 L148 294 Z" fill="rgba(0,0,0,.7)" />
        <Path d="M238 -10 L162 290" fill="none" stroke={withAlpha(leftPalette.edge, .9)} strokeWidth="2.2" />
        <Path d="M246 -10 L170 290" fill="none" stroke="#F7FAFC" strokeOpacity=".94" strokeWidth="2.4" />
        <Path d="M254 -10 L178 290" fill="none" stroke={withAlpha(rightPalette.edge, .94)} strokeWidth="3" />
        <Path d="M261 -10 L185 290" fill="none" stroke="#020406" strokeOpacity=".92" strokeWidth="7" />

        <Rect fill={'url(#' + shadeGradient + ')'} height="280" width="400" x="0" y="0" />
        <Rect fill="rgba(1,4,7,.82)" height="32" width="400" x="0" y="0" />
        <Path d="M0 32 H400" fill="none" stroke="#53616A" strokeOpacity=".74" strokeWidth=".8" />
      </Svg>

      <LinearGradient
        colors={['rgba(0,0,0,.18)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.22)']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function TeamFace({
  muted,
  sceneScale,
  team,
  winner,
}: {
  muted: boolean;
  sceneScale: number;
  team: ConfrontationTeam;
  winner: boolean;
}) {
  const left = team.side === 'a';
  const logoSize = 104 * sceneScale;

  return (
    <View
      accessibilityLabel={team.name + (winner ? ', vainqueur' : '')}
      style={[
        styles.ticketTeam,
        {
          left: (left ? 0 : 244) * sceneScale,
          top: 84 * sceneScale,
          width: 156 * sceneScale,
        },
        muted && styles.ticketTeamMuted,
      ]}
      testID={`match-team-${team.side}`}
    >
      <View
        style={[styles.logoStage, { height: 108 * sceneScale }]}
        testID={`match-team-logo-${team.side}`}
      >
        <TeamLogo
          accent={team.accent}
          contentScale={teamLogoContentScale(team.name)}
          frameless
          name={team.name}
          size={logoSize}
          tag={team.tag}
          uri={team.logo}
        />
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.58}
        numberOfLines={1}
        style={[
          styles.teamTag,
          {
            fontSize: 31 * sceneScale,
            lineHeight: 34 * sceneScale,
          },
          winner && { color: team.accent },
        ]}
      >
        {team.tag}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.7}
        numberOfLines={1}
        style={[
          styles.teamName,
          {
            fontSize: 13 * sceneScale,
            lineHeight: 17 * sceneScale,
          },
        ]}
      >
        {team.name}
      </Text>
    </View>
  );
}

function teamLogoContentScale(name: string) {
  if (name === 'Karmine Corp') return .82;
  if (name === 'Team Vitality') return 1.2;
  if (name === 'G2 Esports') return 1.12;
  if (name === 'Fnatic') return 1.04;
  return .96;
}

const styles = StyleSheet.create({
  ticketShell: {
    position: 'relative',
    alignSelf: 'center',
    boxShadow: '0 18px 42px rgba(0,0,0,.48)',
  },
  ticketSurface: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#02060A',
    borderWidth: 1,
    borderColor: '#40515B',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  watermarkLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    opacity: .045,
  },
  matchTop: {
    position: 'absolute',
    zIndex: 6,
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  matchMetaLead: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF3945',
    boxShadow: '0 0 7px rgba(255,57,69,.42)',
  },
  matchMetaLeadText: {
    flexShrink: 0,
    color: '#F5F6F7',
    fontFamily: fonts.bold,
    letterSpacing: .28,
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  matchMetaLiveText: {
    color: '#FF4A55',
  },
  matchMetaSeparator: {
    flexShrink: 0,
    color: '#F0F2F3',
    fontFamily: fonts.bold,
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventName: {
    flexShrink: 1,
    minWidth: 0,
    color: '#F0F2F3',
    fontFamily: fonts.bold,
    letterSpacing: .28,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  matchFormat: {
    flexShrink: 0,
    color: '#F0F2F3',
    fontFamily: fonts.bold,
    letterSpacing: .28,
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  matchupTitle: {
    position: 'absolute',
    zIndex: 7,
    left: '50%',
    alignItems: 'center',
  },
  matchupTitleText: {
    width: '100%',
    color: '#F7F8F9',
    fontFamily: fonts.display,
    fontStyle: 'italic',
    letterSpacing: -1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.98)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  teamLayer: {
    position: 'absolute',
    zIndex: 4,
    inset: 0,
  },
  ticketTeam: {
    position: 'absolute',
    minWidth: 0,
    alignItems: 'center',
  },
  ticketTeamMuted: {
    opacity: .62,
  },
  logoStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamTag: {
    width: '100%',
    color: '#F7F8F9',
    fontFamily: fonts.display,
    letterSpacing: -.65,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.96)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  teamName: {
    ...typography.bodyStrong,
    width: '100%',
    paddingHorizontal: 4,
    color: '#F0F2F3',
    fontStyle: 'italic',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.94)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  pressed: {
    opacity: .84,
  },
});
