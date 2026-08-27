import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { gradeAccent } from '@/src/features/ranking/grades';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadHubData } from '../api';
import { formatMatchSchedule, getHubMatchPhase, getMatchConfrontationState } from '../matchPresentation';
import type { HubData, HubFactionMission, HubMatch, HubPrediction } from '../types';
import { MatchConfrontationCard } from './MatchConfrontationCard';

type HubGame = 'lol' | 'valorant' | 'cs2';

const GAME_BACKGROUNDS: Record<HubGame, ImageSourcePropType> = {
  lol: require('../../../../assets/onboarding/lol-characters.jpg'),
  valorant: require('../../../../assets/onboarding/valorant-characters.jpg'),
  cs2: require('../../../../assets/onboarding/cs2-operators.jpg'),
};

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
  upNext: [],
  nextMatchPrediction: null,
  predictionsToday: 0,
  leagueCount: 0,
  faction: null,
  recentResult: null,
  factionMission: null,
  latestReward: null,
};

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) {
      setHub(EMPTY_HUB);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setHub(await loadHubData(session.user.id, profile?.jeux_suivis ?? []));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.jeux_suivis, session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <HubExperience
      error={error}
      hub={hub}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

type HubExperienceProps = {
  error: string | null;
  headerEconomy?: { frags: number; volts: number };
  hub: HubData;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
};

export function HubExperience({
  error,
  headerEconomy,
  hub,
  loading,
  refreshing,
  onRefresh,
  onRetry,
}: HubExperienceProps) {
  const reduceMotion = useReducedMotion();
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(420);
  const phase = hub.nextMatch ? getHubMatchPhase(hub.nextMatch) : null;
  const live = phase === 'live';
  const finished = phase === 'finished';
  const callLocked = Boolean(hub.nextMatchPrediction);
  const headlineKicker = live ? 'LE MATCH EST LANCÉ' : finished ? 'LE VERDICT EST TOMBÉ' : callLocked ? 'TON CALL EST VERROUILLÉ' : 'À TOI DE JOUER';
  const headline = live ? 'SUIS LE MATCH EN DIRECT.' : finished ? 'CONSULTE LE RÉSULTAT.' : callLocked ? 'TON CALL EST POSÉ.' : 'TON PROCHAIN CALL.';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <GriffHeader economy={headerEconomy} variant="social" />

        <Animated.View entering={entrance(30)} style={styles.headline}>
          <Text style={styles.headlineKicker}>{headlineKicker}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={1} style={styles.headlineTitle}>{headline}</Text>
        </Animated.View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retryText}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        <Animated.View entering={entrance(90)}>
          {loading ? <HeroSkeleton /> : hub.nextMatch ? <MatchHero match={hub.nextMatch} prediction={hub.nextMatchPrediction} reduceMotion={reduceMotion} /> : <EmptyHero />}
        </Animated.View>

        <Animated.View entering={entrance(150)}>
          <SeasonProgressCard hub={hub} loading={loading} />
        </Animated.View>

        <Animated.View entering={entrance(210)}>
          <FactionMissionCard loading={loading} mission={hub.factionMission} />
        </Animated.View>

        {!loading && hub.upNext.length ? (
          <Animated.View entering={entrance(270)}>
            <UpNext matches={hub.upNext} />
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MatchHero({ match, prediction, reduceMotion }: { match: HubMatch; prediction: HubPrediction | null; reduceMotion: boolean }) {
  const confrontation = getMatchConfrontationState(match, prediction);
  const callLocked = Boolean(confrontation.predictionTag);

  return (
    <View style={styles.matchFeature}>
      <MatchConfrontationCard match={match} onPress={() => openMatch(match.id)} reduceMotion={reduceMotion} state={confrontation} />

      <Pressable
        accessibilityLabel={confrontation.action}
        accessibilityRole="button"
        onPress={() => openMatch(match.id)}
        style={({ pressed }) => [styles.callAction, callLocked && styles.callActionLocked, pressed && styles.pressed]}
      >
        <Text style={[styles.callActionText, callLocked && styles.callActionTextLocked]}>{confrontation.action}</Text>
        <Text style={[styles.callActionArrow, callLocked && styles.callActionTextLocked]}>›</Text>
      </Pressable>
    </View>
  );
}

function FactionMissionCard({ loading, mission }: { loading: boolean; mission: HubFactionMission | null }) {
  const progress = loading || !mission ? 0 : Math.min(100, Math.round((mission.progress / mission.goal) * 100));
  const remaining = mission ? Math.max(0, mission.goal - mission.progress) : 0;
  const action = mission ? (mission.completed ? 'TERMINÉE' : 'PARTICIPER') : 'REJOINDRE';

  return (
    <Pressable
      accessibilityLabel="Ouvrir la mission de faction"
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/social/faction')}
      style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}
    >
      <View style={styles.missionIcon}><View style={styles.missionIconRing}><View style={styles.missionIconCore} /></View></View>
      <View style={styles.missionCopy}>
        <View style={styles.missionTop}>
          <Text style={styles.missionKicker}>MISSION COLLECTIVE · 24 H</Text>
          <Text style={styles.missionCount}>{loading || !mission ? '—' : `${mission.progress} / ${mission.goal}`}</Text>
        </View>
        <Text numberOfLines={1} style={styles.missionTitle}>{loading ? 'LECTURE DE LA FACTION…' : mission ? (mission.completed ? 'OBJECTIF VALIDÉ.' : `${remaining} CALL${remaining > 1 ? 'S' : ''} À VERROUILLER.`) : 'REJOINS UNE FACTION.'}</Text>
        <Text numberOfLines={1} style={styles.missionHint}>{mission ? `Ta contribution · ${mission.personalContribution}` : 'Choisis ton équipe pour activer les missions.'}</Text>
        <View style={styles.missionBottom}>
          <View style={styles.missionTrack}><View style={[styles.missionProgress, { width: `${progress}%` }]} /></View>
          <View style={[styles.missionAction, mission?.completed && styles.missionActionDone]}><Text style={styles.missionActionText}>{action}</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

function UpNext({ matches }: { matches: HubMatch[] }) {
  const dots = Math.min(matches.length, 4);
  return (
    <View style={styles.upNextSection}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>À SUIVRE</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}><Text style={styles.sectionLink}>TOUT VOIR →</Text></Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.upNextRail} showsHorizontalScrollIndicator={false}>
        {matches.map((match) => (
          <Pressable
            accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, ${formatMatchSchedule(match.debut)}`}
            accessibilityRole="button"
            key={match.id}
            onPress={() => openMatch(match.id)}
            style={({ pressed }) => [styles.upNextCard, pressed && styles.pressed]}
          >
            <Image resizeMode="cover" source={GAME_BACKGROUNDS[gameKey(match.jeu)]} style={styles.upNextBackdrop} />
            <LinearGradient colors={['rgba(3,7,11,.38)', 'rgba(3,7,11,.76)', 'rgba(3,7,11,.96)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={styles.upNextTop}><Text style={styles.upNextWhen}>{formatMatchSchedule(match.debut)}</Text><Text style={styles.upNextGame}>{gameName(match.jeu).toUpperCase()}</Text></View>
            <View style={styles.upNextDuel}><Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.upNextTag}>{match.tag_a}</Text><Text style={styles.upNextVs}>VS</Text><Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.upNextTag}>{match.tag_b}</Text></View>
            <View style={styles.upNextFooter}><Text numberOfLines={1} style={styles.upNextEvent}>{match.evenement}</Text><Text style={styles.upNextFormat}>BO{match.format}</Text></View>
          </Pressable>
        ))}
      </ScrollView>
      {dots > 1 ? <View style={styles.railDots}>{Array.from({ length: dots }, (_, index) => <View key={index} style={[styles.railDot, index === 0 && styles.railDotActive]} />)}</View> : null}
    </View>
  );
}

function SeasonProgressCard({ hub, loading }: { hub: HubData; loading: boolean }) {
  const grade = hub.frags?.grade;
  const provisional = Boolean(hub.frags?.provisoire);
  const gradeLabel = loading
    ? '—'
    : provisional
      ? 'PLACEMENT'
      : grade?.libelle?.toUpperCase() || 'NON CLASSÉ';
  const frags = loading ? '—' : formatNumber(hub.frags?.frags ?? 0);
  const accent = provisional || !grade?.classe ? colors.volt : gradeAccent(grade);

  return (
    <Pressable
      accessibilityLabel={`Ouvrir ma saison, rang ${gradeLabel}, ${frags} Frags`}
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/rank')}
      style={({ pressed }) => [styles.seasonCard, pressed && styles.pressed]}
    >
      <View style={[styles.seasonEmblem, loading && styles.seasonEmblemLoading]}>
        <SeasonRankMark accent={accent} />
      </View>
      <View style={styles.seasonIdentity}>
        <Text style={styles.seasonKicker}>RANK ACTUEL</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.seasonGrade}>{gradeLabel}</Text>
      </View>
      <View style={styles.seasonDivider} />
      <View style={styles.seasonLevel}>
        <Text style={styles.seasonKicker}>NIVEAU</Text>
        <View style={styles.seasonLevelValueRow}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.seasonLevelValue}>{frags}</Text>
          <Text style={styles.seasonLevelUnit}>FRAGS</Text>
        </View>
      </View>
      <Text style={styles.seasonArrow}>›</Text>
    </Pressable>
  );
}

function SeasonRankMark({ accent }: { accent: string }) {
  const chevrons = [
    'M6 16 L31 0 L58 18 L58 30 L31 12 L6 29 Z',
    'M6 35 L31 19 L58 37 L58 49 L31 31 L6 48 Z',
    'M6 54 L31 38 L58 56 L58 68 L31 50 L6 67 Z',
  ];

  return (
    <Svg height={56} viewBox="0 0 64 72" width={50}>
      <Defs>
        <SvgLinearGradient id="rank-metal" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#F7FAFC" />
          <Stop offset="0.28" stopColor={accent} />
          <Stop offset="0.62" stopColor="#68727B" />
          <Stop offset="1" stopColor="#272D33" />
        </SvgLinearGradient>
        <SvgLinearGradient id="rank-edge" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.76} />
          <Stop offset="0.45" stopColor={accent} stopOpacity={0.72} />
          <Stop offset="1" stopColor="#11161A" stopOpacity={0.9} />
        </SvgLinearGradient>
      </Defs>
      <G opacity={0.88} transform="translate(0 3)">
        {chevrons.map((path) => <Path d={path} fill="#020507" key={`shadow-${path}`} />)}
      </G>
      {chevrons.map((path) => (
        <Path
          d={path}
          fill="url(#rank-metal)"
          key={path}
          stroke="url(#rank-edge)"
          strokeLinejoin="round"
          strokeWidth={0.85}
        />
      ))}
      <Path d="M8 17 L31 2 L31 11 L8 27 Z" fill="#FFFFFF" opacity={0.18} />
      <Path d="M8 36 L31 21 L31 30 L8 46 Z" fill="#FFFFFF" opacity={0.14} />
      <Path d="M8 55 L31 40 L31 49 L8 65 Z" fill="#FFFFFF" opacity={0.1} />
    </Svg>
  );
}

function EmptyHero() {
  return (
    <View style={styles.matchFeature}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.emptyTicket, pressed && styles.pressed]}>
        <Image resizeMode="cover" source={GAME_BACKGROUNDS.lol} style={styles.matchBackdrop} />
        <LinearGradient colors={['rgba(3,6,9,.45)', 'rgba(3,6,9,.97)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.emptyKicker}>PROCHAINE AFFICHE</Text>
        <Text style={styles.emptyTitle}>LE CALME AVANT LE PROCHAIN MATCH.</Text>
        <Text style={styles.emptyCopy}>Le Hub se réactivera dès qu’un match sera programmé.</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.callAction, pressed && styles.pressed]}><Text style={styles.callActionText}>VOIR TOUS LES MATCHS</Text><Text style={styles.callActionArrow}>›</Text></Pressable>
    </View>
  );
}

function HeroSkeleton() {
  return <View style={styles.matchFeature}><View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonDuel} /><View style={styles.skeletonLine} /></View><View style={styles.skeletonAction} /></View>;
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function openMatch(id: string) { router.push({ pathname: '/match/[id]', params: { id } }); }
function gameKey(game: string): HubGame {
  const key = String(game || '').toLowerCase();
  if (key.includes('valorant')) return 'valorant';
  if (key.includes('cs')) return 'cs2';
  return 'lol';
}
function gameName(game: string) {
  const key = gameKey(game);
  if (key === 'valorant') return 'Valorant';
  if (key === 'cs2') return 'CS2';
  return 'LoL';
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 16 },
  headline: { marginHorizontal: spacing.md, paddingTop: 3 },
  headlineKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, letterSpacing: 1.05 },
  headlineTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 43, letterSpacing: -.7 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retryText: { ...typography.action, color: colors.volt, letterSpacing: .5 },
  matchFeature: { marginHorizontal: spacing.md, gap: 10 },
  matchBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  callAction: { minHeight: 57, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt, boxShadow: '0 10px 24px rgba(232,255,61,.16)' },
  callActionLocked: { backgroundColor: '#10170D', borderWidth: 1, borderColor: '#53631B' },
  callActionText: { color: '#07090B', fontFamily: fonts.display, fontSize: 21, lineHeight: 23, letterSpacing: .55 },
  callActionTextLocked: { color: colors.volt },
  callActionArrow: { position: 'absolute', right: 20, color: '#07090B', fontSize: 31, lineHeight: 33, fontWeight: '300' },
  missionCard: { minHeight: 132, marginHorizontal: spacing.md, padding: 13, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#090E12', borderWidth: 1, borderColor: '#29343D' },
  missionIcon: { width: 58, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#11170A', borderWidth: 1, borderColor: '#4B5B16' },
  missionIconRing: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 3, borderColor: colors.volt },
  missionIconCore: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: colors.volt },
  missionCopy: { flex: 1, minWidth: 0 },
  missionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  missionKicker: { ...typography.eyebrow, flex: 1, color: colors.textMuted, letterSpacing: .45 },
  missionCount: { ...typography.label, color: colors.volt },
  missionTitle: { color: colors.text, fontFamily: fonts.display, marginTop: 4, fontSize: 20, lineHeight: 22, letterSpacing: .1 },
  missionHint: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  missionBottom: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionTrack: { flex: 1, height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#222B32' },
  missionProgress: { height: '100%', borderRadius: 3, backgroundColor: colors.volt, boxShadow: '0 0 7px rgba(232,255,61,.35)' },
  missionAction: { minHeight: 34, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#0C120D', borderWidth: 1, borderColor: '#596A1A' },
  missionActionDone: { opacity: .55 },
  missionActionText: { ...typography.action, color: colors.volt, fontSize: 9, letterSpacing: .3 },
  upNextSection: { gap: 10 },
  sectionHead: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, letterSpacing: .5 },
  sectionLink: { ...typography.action, color: colors.volt, fontSize: 10, letterSpacing: .35 },
  upNextRail: { paddingHorizontal: spacing.md, gap: 10 },
  upNextCard: { position: 'relative', width: 250, minHeight: 154, padding: 12, overflow: 'hidden', borderRadius: 18, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#4A535B' },
  upNextBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  upNextTop: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upNextWhen: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  upNextGame: { ...typography.label, color: colors.textSubtle, fontSize: 8 },
  upNextDuel: { zIndex: 1, marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  upNextTag: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 37, textAlign: 'center', letterSpacing: -.5 },
  upNextVs: { ...typography.action, color: colors.volt },
  upNextFooter: { zIndex: 1, marginTop: 'auto', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upNextEvent: { ...typography.caption, flex: 1, color: '#AEB6BD' },
  upNextFormat: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .5 },
  railDots: { height: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  railDot: { width: 12, height: 4, borderRadius: 2, backgroundColor: '#263039' },
  railDotActive: { width: 24, backgroundColor: colors.volt },
  seasonCard: { minHeight: 84, marginHorizontal: spacing.md, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', borderRadius: 12, backgroundColor: '#03080B', borderWidth: 1, borderColor: '#3B4850', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 8px 24px rgba(0,0,0,.18)' },
  seasonEmblem: { width: 52, height: 60, alignItems: 'center', justifyContent: 'center' },
  seasonEmblemLoading: { opacity: .35 },
  seasonIdentity: { width: 82, minWidth: 0, justifyContent: 'center' },
  seasonKicker: { color: '#7F8893', fontFamily: fonts.display, fontSize: 10, lineHeight: 12, letterSpacing: .2 },
  seasonGrade: { marginTop: 5, color: colors.volt, fontFamily: fonts.display, fontSize: 25, lineHeight: 27, letterSpacing: 0 },
  seasonDivider: { width: 1, height: 47, marginHorizontal: 1, backgroundColor: '#354049' },
  seasonLevel: { flex: 1, minWidth: 0, justifyContent: 'center' },
  seasonLevelValueRow: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  seasonLevelValue: { flexShrink: 1, color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: 0 },
  seasonLevelUnit: { color: '#737C86', fontFamily: fonts.display, fontSize: 8, lineHeight: 11 },
  seasonArrow: { color: '#B9C0C6', fontSize: 32, lineHeight: 34, fontWeight: '300' },
  emptyTicket: { position: 'relative', minHeight: 220, padding: 19, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 17, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#39444E' },
  emptyKicker: { ...typography.eyebrow, zIndex: 1, color: colors.volt, letterSpacing: 1 },
  emptyTitle: { zIndex: 1, maxWidth: 310, marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 29, lineHeight: 31 },
  emptyCopy: { ...typography.body, zIndex: 1, maxWidth: 300, marginTop: 6, color: '#A2ABB2' },
  skeleton: { minHeight: 245, padding: 16, justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonLine: { width: '58%', height: 10, borderRadius: 5, backgroundColor: '#1B242C' },
  skeletonDuel: { width: '82%', height: 74, alignSelf: 'center', borderRadius: 18, backgroundColor: '#151D24' },
  skeletonAction: { height: 57, borderRadius: 13, backgroundColor: '#1A2214' },
  pressed: { opacity: .78, transform: [{ scale: .997 }] },
});
