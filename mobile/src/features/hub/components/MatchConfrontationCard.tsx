import { LinearGradient } from 'expo-linear-gradient';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleX from 'lucide-react-native/icons/circle-x';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Radio from 'lucide-react-native/icons/radio';
import Trophy from 'lucide-react-native/icons/trophy';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { fonts, layout, spacing } from '@/src/theme';

import {
  formatMatchHeaderSchedule,
  withAlpha,
  type ConfrontationTeam,
  type MatchConfrontationState,
} from '../matchPresentation';
import type { HubMatch } from '../types';

type MatchConfrontationCardProps = {
  actionLabel: string;
  accessibilityHint?: string;
  match: HubMatch;
  onPress: () => void;
  onPressIn?: () => void;
  state: MatchConfrontationState;
};

const CARD_ASPECT_RATIO = 1.25;
const ARENA_BACKGROUND = require('../../../../assets/hub/match-arena-entry-v1.jpg');

export function MatchConfrontationCard({
  actionLabel,
  accessibilityHint = 'Ouvre le centre du match',
  match,
  onPress,
  onPressIn,
  state,
}: MatchConfrontationCardProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, layout.contentMaxWidth) - spacing.md * 2;
  const cardHeight = Math.round(cardWidth / CARD_ASPECT_RATIO);
  const sceneScale = cardWidth / 400;
  const actionBottom = 10 * sceneScale;
  const actionHeight = 42 * sceneScale;
  const statusBottom = actionBottom + actionHeight + 3 * sceneScale;
  const event = String(match.evenement || '').trim() || 'COMPÉTITION';
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0
    ? 'BO' + formatValue
    : 'FORMAT À CONFIRMER';
  const scoreCopy = state.scoreLabel ? ', score ' + state.scoreLabel : '';

  return (
    <View style={[styles.ticketShell, { height: cardHeight, width: cardWidth }]}>
      <View pointerEvents="none" style={styles.ticketSurface}>
        <ArenaBackdrop
          height={cardHeight}
          leftTeam={state.teamA}
          rightTeam={state.teamB}
          width={cardWidth}
        />

        <MatchMetadata
          event={event}
          format={format}
          sceneScale={sceneScale}
          schedule={formatMatchHeaderSchedule(match.debut)}
        />
        <CompetitionMark event={event} sceneScale={sceneScale} />

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
          <View style={[styles.versus, { left: 176 * sceneScale, top: 201 * sceneScale, width: 48 * sceneScale }]}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={.65}
              numberOfLines={1}
              style={[styles.versusText, { fontSize: (state.scoreLabel ? 19 : 25) * sceneScale }]}
            >
              {state.scoreLabel ?? 'VS'}
            </Text>
          </View>
          <TeamFace
            muted={state.winner === 'a'}
            sceneScale={sceneScale}
            team={state.teamB}
            winner={state.winner === 'b'}
          />
          <MatchStatusBadge bottom={statusBottom} sceneScale={sceneScale} state={state} />
        </View>
      </View>

      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={state.teamA.name + ' contre ' + state.teamB.name + ', ' + state.status + scoreCopy}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        style={({ pressed }) => [
          styles.scenePressable,
          { bottom: statusBottom },
          pressed && styles.scenePressed,
        ]}
        testID="match-confrontation-card"
      />

      <MatchCallAction
        bottom={actionBottom}
        height={actionHeight}
        label={actionLabel}
        onPress={onPress}
        onPressIn={onPressIn}
        sceneScale={sceneScale}
      />
    </View>
  );
}

function ArenaBackdrop({
  height,
  leftTeam,
  rightTeam,
  width,
}: {
  height: number;
  leftTeam: ConfrontationTeam;
  rightTeam: ConfrontationTeam;
  width: number;
}) {
  const scale = width / 400;
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <Image resizeMode="cover" source={ARENA_BACKGROUND} style={[styles.arenaImage, { height, width }]} />

      <LinearGradient
        colors={[withAlpha(leftTeam.accent, .64), withAlpha(leftTeam.accent, .1), 'transparent']}
        end={{ x: 1, y: .55 }}
        start={{ x: 0, y: .4 }}
        style={styles.leftColorWash}
      />
      <LinearGradient
        colors={['transparent', withAlpha(rightTeam.accent, .1), withAlpha(rightTeam.accent, .64)]}
        end={{ x: 1, y: .4 }}
        start={{ x: 0, y: .55 }}
        style={styles.rightColorWash}
      />

      <ArenaBanner sceneScale={scale} team={leftTeam} />
      <ArenaBanner sceneScale={scale} team={rightTeam} />

      <LinearGradient
        colors={['rgba(1,5,10,.84)', 'rgba(1,5,10,.08)', 'rgba(1,5,10,.08)', 'rgba(1,5,10,.92)']}
        locations={[0, .23, .58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,.28)', 'transparent', 'rgba(0,0,0,.36)']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function ArenaBanner({ sceneScale, team }: { sceneScale: number; team: ConfrontationTeam }) {
  const left = team.side === 'a';
  return (
    <View
      style={[
        styles.arenaBanner,
        {
          height: 148 * sceneScale,
          left: (left ? 4 : 296) * sceneScale,
          top: 27 * sceneScale,
          transform: [{ skewY: left ? '-6deg' : '6deg' }, { scaleX: .94 }],
          width: 100 * sceneScale,
        },
      ]}
      testID={`match-banner-${team.side}`}
    >
      <LinearGradient
        colors={[
          withAlpha(team.accent, .03),
          withAlpha(team.accent, .18),
          withAlpha(team.accent, .05),
        ]}
        end={{ x: left ? 1 : 0, y: 1 }}
        locations={[0, .46, 1]}
        start={{ x: left ? 0 : 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.bannerLightRail,
          {
            backgroundColor: withAlpha(team.accent, .78),
            left: left ? 5 * sceneScale : undefined,
            right: left ? undefined : 5 * sceneScale,
            width: Math.max(1, 1.2 * sceneScale),
          },
        ]}
      />
      <View style={[styles.bannerMark, { opacity: .72 }]}>
        <TeamLogo
          accent={team.accent}
          contentScale={teamBannerLogoContentScale(team.name)}
          frameless
          name={team.name}
          size={84 * sceneScale}
          tag={team.tag}
          uri={team.logo}
        />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,.09)', 'transparent']}
        end={{ x: .85, y: 1 }}
        start={{ x: .15, y: 0 }}
        style={styles.bannerSheen}
      />
      <LinearGradient
        colors={[
          withAlpha(team.accent, .1),
          'rgba(255,255,255,.025)',
          'rgba(0,0,0,.12)',
          'rgba(255,255,255,.02)',
          withAlpha(team.accent, .08),
        ]}
        end={{ x: 1, y: .5 }}
        locations={[0, .22, .48, .72, 1]}
        start={{ x: 0, y: .5 }}
        style={styles.bannerSurface}
      />
    </View>
  );
}

function MatchMetadata({
  event,
  format,
  sceneScale,
  schedule,
}: {
  event: string;
  format: string;
  sceneScale: number;
  schedule: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.matchTop, { paddingHorizontal: 12 * sceneScale, paddingTop: 10 * sceneScale }]}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.65}
        numberOfLines={1}
        style={[styles.eventName, { fontSize: 15 * sceneScale, lineHeight: 18 * sceneScale }]}
      >
        {event.toUpperCase()}
      </Text>
      <View style={[styles.formatPill, {
        borderRadius: 10 * sceneScale,
        paddingHorizontal: 8 * sceneScale,
        paddingVertical: 3 * sceneScale,
        right: 48 * sceneScale,
        top: 9 * sceneScale,
      }]}>
        <Text style={[styles.matchFormat, { fontSize: 13 * sceneScale, lineHeight: 16 * sceneScale }]}>{format}</Text>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.72}
        numberOfLines={1}
        style={[styles.schedule, { fontSize: 19 * sceneScale, lineHeight: 23 * sceneScale, marginTop: 8 * sceneScale }]}
      >
        {schedule}
      </Text>
    </View>
  );
}

function CompetitionMark({ event, sceneScale }: { event: string; sceneScale: number }) {
  const label = competitionLabel(event);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.competitionMark,
        {
          top: 84 * sceneScale,
        },
      ]}
    >
      <View style={[styles.competitionRule, { width: 36 * sceneScale }]} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.68}
        numberOfLines={1}
        style={[
          styles.competitionLabel,
          {
            fontSize: 23 * sceneScale,
            lineHeight: 27 * sceneScale,
            width: 124 * sceneScale,
          },
        ]}
      >
        {label}
      </Text>
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
  return (
    <View
      accessibilityLabel={team.name + (winner ? ', vainqueur' : '')}
      style={[
        styles.ticketTeam,
        {
          left: (left ? 20 : 228) * sceneScale,
          top: 196 * sceneScale,
          width: 152 * sceneScale,
        },
        muted && styles.ticketTeamMuted,
      ]}
      testID={`match-team-${team.side}`}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.6}
        numberOfLines={1}
        style={[
          styles.teamTag,
          { fontSize: 50 * sceneScale, lineHeight: 54 * sceneScale },
          winner && { color: team.accent },
        ]}
      >
        {team.tag}
      </Text>
    </View>
  );
}

function MatchStatusBadge({
  bottom,
  sceneScale,
  state,
}: {
  bottom: number;
  sceneScale: number;
  state: MatchConfrontationState;
}) {
  const accent = state.phase === 'live'
    ? '#FF4954'
    : state.phase === 'finished'
      ? '#31E6BD'
      : state.phase === 'cancelled' || state.phase === 'pending'
        ? '#9AA6AF'
        : '#FF7448';
  const label = state.phase === 'upcoming' && !state.predictionTag ? 'À FAIRE' : state.status;
  const StatusIcon = state.phase === 'live'
    ? Radio
    : state.phase === 'finished'
      ? Trophy
      : state.phase === 'cancelled'
        ? CircleX
        : Clock3;
  return (
    <View style={[styles.statusWrap, { bottom }]}>
      <View
        style={[
          styles.statusBadge,
          {
            borderColor: accent,
            borderRadius: 12 * sceneScale,
            paddingHorizontal: 13 * sceneScale,
            paddingVertical: 3 * sceneScale,
          },
        ]}
        testID="match-status-badge"
      >
        <StatusIcon color={accent} size={13 * sceneScale} strokeWidth={2.6} />
        <Text style={[styles.statusText, {
          color: accent,
          fontSize: 13 * sceneScale,
          lineHeight: 15 * sceneScale,
        }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MatchCallAction({
  bottom,
  height,
  label,
  onPress,
  onPressIn,
  sceneScale,
}: {
  bottom: number;
  height: number;
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
  sceneScale: number;
}) {
  const horizontalInset = 18 * sceneScale;
  const arrowSize = 37 * sceneScale;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.callAction,
        {
          bottom,
          height,
          left: horizontalInset,
          right: horizontalInset,
          borderRadius: height / 2,
        },
        pressed && styles.actionPressed,
      ]}
      testID="hub-primary-action"
    >
      <LinearGradient
        colors={['#FFF978', '#F6FF42', '#E8FF22']}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={StyleSheet.absoluteFill}
      />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.7}
        numberOfLines={1}
        style={[
          styles.callActionText,
          {
            fontSize: 21 * sceneScale,
            left: 48 * sceneScale,
            lineHeight: 24 * sceneScale,
            right: 48 * sceneScale,
          },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.callActionArrow,
          {
            borderRadius: arrowSize / 2,
            height: arrowSize,
            right: 6 * sceneScale,
            width: arrowSize,
          },
        ]}
        testID="hub-primary-action-arrow"
      >
        <ChevronRight color="#FFFFFF" size={22 * sceneScale} strokeWidth={3.2} />
      </View>
    </Pressable>
  );
}

function competitionLabel(event: string) {
  const main = event.split(/[·•|/]/)[0]?.trim().toUpperCase() || 'COMPÉTITION';
  if (main.length <= 10) return main;
  return main.split(/\s+/)[0] || 'COMPÉTITION';
}

function teamLogoContentScale(name: string) {
  if (name === 'Karmine Corp') return .82;
  if (name === 'Team Vitality') return 1.2;
  if (name === 'G2 Esports') return 1.12;
  if (name === 'Fnatic') return 1.04;
  return .96;
}

function teamBannerLogoContentScale(name: string) {
  if (name === 'Natus Vincere') return .82;
  if (name === 'Movistar KOI') return 1.08;
  return teamLogoContentScale(name) * .94;
}

const styles = StyleSheet.create({
  ticketShell: {
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    boxShadow: '0 22px 48px rgba(0,0,0,.58)',
  },
  ticketSurface: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#02060A',
    borderWidth: 1,
    borderColor: 'rgba(64,183,224,.52)',
  },
  scenePressable: {
    position: 'absolute',
    zIndex: 8,
    top: 0,
    right: 0,
    left: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scenePressed: { backgroundColor: 'rgba(255,255,255,.055)' },
  backdrop: { position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' },
  arenaImage: { position: 'absolute', inset: 0 },
  leftColorWash: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '62%' },
  rightColorWash: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '62%' },
  arenaBanner: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: .96,
  },
  bannerMark: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLightRail: {
    position: 'absolute',
    zIndex: 1,
    top: '8%',
    bottom: '8%',
    borderRadius: 999,
    boxShadow: '0 0 10px rgba(120,205,255,.22)',
  },
  bannerSheen: {
    position: 'absolute',
    zIndex: 3,
    top: '-18%',
    left: '18%',
    width: '22%',
    height: '136%',
    transform: [{ rotate: '10deg' }],
  },
  bannerSurface: {
    position: 'absolute',
    zIndex: 4,
    inset: 0,
  },
  matchTop: { position: 'absolute', zIndex: 5, top: 0, right: 0, left: 0, alignItems: 'center' },
  eventName: {
    maxWidth: '74%',
    color: '#DDE7FF',
    fontFamily: fonts.bold,
    letterSpacing: 2.1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  formatPill: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#BFD0EA',
    backgroundColor: 'rgba(4,12,22,.62)',
  },
  matchFormat: { color: '#EAF0FF', fontFamily: fonts.display, letterSpacing: .5 },
  schedule: {
    color: '#BFD0EC',
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  competitionMark: {
    position: 'absolute',
    zIndex: 3,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  competitionRule: {
    height: 2,
    marginBottom: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(215,230,255,.74)',
    boxShadow: '0 0 9px rgba(110,180,255,.36)',
  },
  competitionLabel: {
    width: '100%',
    color: 'rgba(229,237,251,.82)',
    fontFamily: fonts.display,
    letterSpacing: 2.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.96)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  teamLayer: { position: 'absolute', zIndex: 4, inset: 0 },
  ticketTeam: { position: 'absolute', minWidth: 0, alignItems: 'center' },
  ticketTeamMuted: { opacity: .58 },
  teamTag: {
    width: '100%',
    color: '#F8F9FA',
    fontFamily: fonts.display,
    letterSpacing: -.65,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.98)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 9,
  },
  versus: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  versusText: {
    color: '#B9C8DC',
    fontFamily: fonts.display,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.98)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  statusWrap: {
    position: 'absolute',
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.2,
    backgroundColor: 'rgba(13,8,8,.78)',
  },
  statusText: { fontFamily: fonts.display, letterSpacing: .45 },
  callAction: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248,255,86,.96)',
    backgroundColor: '#F4FF3F',
    boxShadow: '0 8px 24px rgba(223,246,36,.28)',
  },
  callActionText: {
    position: 'absolute',
    color: '#050708',
    fontFamily: fonts.display,
    letterSpacing: .15,
    textAlign: 'center',
  },
  callActionArrow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050708',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.18)',
    boxShadow: '0 3px 8px rgba(0,0,0,.42)',
  },
  actionPressed: { opacity: .86, transform: [{ scale: .992 }] },
});
