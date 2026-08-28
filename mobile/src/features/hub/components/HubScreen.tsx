import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '@/src/features/ranking/grades';
import { prefetchMatchCenterData } from '@/src/features/matches/matchCenterCache';
import { openMatchCenter, warmMatchCenter } from '@/src/features/matches/matchCenterNavigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadHubData } from '../api';
import { selectHubContext } from '../hubContext';
import { formatMatchSchedule, getHubMatchPhase, getMatchConfrontationState, withAlpha } from '../matchPresentation';
import type { HubData, HubMatch, HubPrediction } from '../types';
import { HubContextSkeleton, HubContextSlot } from './HubContextSlot';
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
      userId={session?.user.id}
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
  userId?: string;
};

export function HubExperience({
  error,
  headerEconomy,
  hub,
  loading,
  refreshing,
  onRefresh,
  onRetry,
  userId,
}: HubExperienceProps) {
  const reduceMotion = useReducedMotion();
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(420);
  const phase = hub.nextMatch ? getHubMatchPhase(hub.nextMatch) : null;
  const live = phase === 'live';
  const finished = phase === 'finished';
  const callLocked = Boolean(hub.nextMatchPrediction);
  const contextualItem = loading ? null : selectHubContext(hub);
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
          <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityLabel="Réessayer de charger le Hub"
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [styles.retryAction, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>RÉESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        <Animated.View entering={entrance(90)}>
          {loading ? <HeroSkeleton /> : hub.nextMatch ? <MatchHero match={hub.nextMatch} prediction={hub.nextMatchPrediction} reduceMotion={reduceMotion} userId={userId} /> : <EmptyHero />}
        </Animated.View>

        {loading || contextualItem ? (
          <Animated.View entering={entrance(150)} style={styles.contextSlot}>
            {loading ? <HubContextSkeleton /> : contextualItem ? <HubContextSlot context={contextualItem} /> : null}
          </Animated.View>
        ) : null}

        <Animated.View entering={entrance(210)}>
          <SeasonProgressCard hub={hub} loading={loading} />
        </Animated.View>

        {!loading && hub.upNext.length ? (
          <Animated.View entering={entrance(270)}>
            <UpNext matches={hub.upNext} userId={userId} />
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MatchHero({ match, prediction, reduceMotion, userId }: { match: HubMatch; prediction: HubPrediction | null; reduceMotion: boolean; userId?: string }) {
  const confrontation = getMatchConfrontationState(match, prediction);
  const callLocked = Boolean(confrontation.predictionTag);
  const prepare = useCallback(() => prepareMatchCenter(match, userId), [match, userId]);
  const open = useCallback(() => openMatchCenter(match), [match]);

  useEffect(() => {
    prepare();
  }, [prepare]);

  return (
    <View style={styles.matchFeature}>
      <MatchConfrontationCard match={match} onPress={open} onPressIn={prepare} reduceMotion={reduceMotion} state={confrontation} />

      <Pressable
        accessibilityLabel={confrontation.action}
        accessibilityRole="button"
        onPress={open}
        onPressIn={prepare}
        style={({ pressed }) => [styles.callAction, callLocked && styles.callActionLocked, pressed && styles.pressed]}
      >
        <Text style={[styles.callActionText, callLocked && styles.callActionTextLocked]}>{confrontation.action}</Text>
        <Text style={[styles.callActionArrow, callLocked && styles.callActionTextLocked]}>›</Text>
      </Pressable>
    </View>
  );
}

function UpNext({ matches, userId }: { matches: HubMatch[]; userId?: string }) {
  const { width } = useWindowDimensions();
  const dots = Math.min(matches.length, 4);
  const cardWidth = Math.min(310, Math.max(276, width - spacing.md * 2));
  return (
    <View style={styles.upNextSection}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>À SUIVRE</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}><Text style={styles.sectionLink}>TOUT VOIR →</Text></Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.upNextRail} showsHorizontalScrollIndicator={false}>
        {matches.map((match) => <UpNextMatchCard cardWidth={cardWidth} key={match.id} match={match} userId={userId} />)}
      </ScrollView>
      {dots > 1 ? <View style={styles.railDots}>{Array.from({ length: dots }, (_, index) => <View key={index} style={[styles.railDot, index === 0 && styles.railDotActive]} />)}</View> : null}
    </View>
  );
}

function UpNextMatchCard({ cardWidth, match, userId }: { cardWidth: number; match: HubMatch; userId?: string }) {
  const confrontation = getMatchConfrontationState(match, null);
  const cardHeight = Math.round(cardWidth / 1.78);
  const logoSize = Math.round(cardWidth * .28);
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0 ? `BO${formatValue}` : 'FORMAT À CONFIRMER';

  return (
    <Pressable
      accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, ${formatMatchSchedule(match.debut)}`}
      accessibilityRole="button"
      onPress={() => openMatchCenter(match)}
      onPressIn={() => prepareMatchCenter(match, userId)}
      style={({ pressed }) => [styles.upNextCard, { height: cardHeight, width: cardWidth }, pressed && styles.pressed]}
    >
      <Image resizeMode="cover" source={GAME_BACKGROUNDS[gameKey(match.jeu)]} style={styles.upNextBackdrop} />
      <LinearGradient
        colors={[
          withAlpha(confrontation.teamA.accent, .38),
          'rgba(2,7,13,.28)',
          withAlpha(confrontation.teamB.accent, .34),
        ]}
        end={{ x: 1, y: .52 }}
        start={{ x: 0, y: .48 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(2,6,11,.22)', 'rgba(2,6,11,.36)', 'rgba(2,6,11,.94)']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.upNextSchedulePill}>
        <Text style={styles.upNextWhen}>{formatMatchSchedule(match.debut)}</Text>
      </View>

      <View style={[styles.upNextLogo, styles.upNextLogoLeft]}>
        <TeamLogo
          accent={confrontation.teamA.accent}
          contentScale={upNextLogoContentScale(confrontation.teamA.name)}
          frameless
          name={confrontation.teamA.name}
          size={logoSize}
          tag={confrontation.teamA.tag}
          uri={confrontation.teamA.logo}
        />
      </View>
      <View style={styles.upNextConfrontation}>
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextTag}>{confrontation.teamA.tag}</Text>
        <Text style={styles.upNextVs}>VS</Text>
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextTag}>{confrontation.teamB.tag}</Text>
      </View>
      <View style={[styles.upNextLogo, styles.upNextLogoRight]}>
        <TeamLogo
          accent={confrontation.teamB.accent}
          contentScale={upNextLogoContentScale(confrontation.teamB.name)}
          frameless
          name={confrontation.teamB.name}
          size={logoSize}
          tag={confrontation.teamB.tag}
          uri={confrontation.teamB.logo}
        />
      </View>

      <View style={styles.upNextFooter}>
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextEvent}>
          {match.evenement.toUpperCase()} · {format}
        </Text>
      </View>
    </Pressable>
  );
}

function SeasonProgressCard({ hub, loading }: { hub: HubData; loading: boolean }) {
  const grade = hub.frags?.grade;
  const starting = Boolean(hub.frags && isZeroRank(hub.frags.frags));
  const gradeLabel = loading
    ? '—'
    : grade?.libelle?.toUpperCase() || 'NON CLASSÉ';
  const frags = loading || !hub.frags ? '—' : formatNumber(hub.frags.frags);
  const accent = starting ? ZERO_RANK_ACCENT : gradeAccent(grade);
  const seasonContext = hub.seasonName?.toUpperCase() ?? 'SAISON EN COURS';

  return (
    <Pressable
      accessibilityLabel={`Ouvrir ma saison, rang ${gradeLabel}, ${frags} Frags`}
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/rank')}
      style={({ pressed }) => [styles.seasonCard, pressed && styles.pressed]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.seasonEmblem, loading && styles.seasonEmblemLoading]}
      >
        <RankEmblem grade={grade} size={58} starting={starting} />
      </View>
      <View style={styles.seasonIdentity}>
        <Text style={styles.seasonKicker}>CLASSEMENT ACTUEL</Text>
        <Text numberOfLines={1} style={[styles.seasonGrade, { color: accent }]}>{gradeLabel}</Text>
        <Text numberOfLines={1} style={styles.seasonContext}>{seasonContext}</Text>
      </View>
      <View style={styles.seasonMetric}>
        <Text style={styles.seasonMetricLabel}>RATING FRAGS</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.seasonMetricValue}>{frags}</Text>
      </View>
      <ChevronRight color="#78838D" size={19} strokeWidth={2} />
    </Pressable>
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
  return (
    <SkeletonGroup label="Chargement de l’affiche principale" style={styles.matchFeature}>
      <View style={styles.skeleton}>
        <View style={styles.skeletonTop}>
          <Skeleton height={10} radius="pill" width="38%" />
          <Skeleton height={24} radius="pill" width={54} />
        </View>
        <Skeleton height={12} radius="pill" tone="subtle" width="52%" />
        <View style={styles.skeletonDuel}>
          <View style={styles.skeletonTeam}>
            <Skeleton height={62} radius="lg" width={62} />
            <Skeleton height={13} radius="pill" width={48} />
          </View>
          <View style={styles.skeletonVersus}>
            <Skeleton height={8} radius="pill" tone="subtle" width={32} />
            <Skeleton height={26} radius="sm" width={42} />
          </View>
          <View style={styles.skeletonTeam}>
            <Skeleton height={62} radius="lg" width={62} />
            <Skeleton height={13} radius="pill" width={48} />
          </View>
        </View>
        <Skeleton height={10} radius="pill" tone="subtle" width="46%" />
      </View>
      <Skeleton height={57} radius="md" tone="highlight" width="100%" />
    </SkeletonGroup>
  );
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function prepareMatchCenter(match: HubMatch, userId?: string) {
  warmMatchCenter(match);
  if (userId) {
    void prefetchMatchCenterData({ matchId: match.id, userId }).catch(() => undefined);
  }
}
function gameKey(game: string): HubGame {
  const key = String(game || '').toLowerCase();
  if (key.includes('valorant')) return 'valorant';
  if (key.includes('cs')) return 'cs2';
  return 'lol';
}
function upNextLogoContentScale(name: string) {
  if (name === 'Karmine Corp') return .72;
  if (name === 'Team Vitality') return 1.06;
  if (name === 'G2 Esports') return 1.02;
  if (name === 'Fnatic') return 1;
  return .9;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 16 },
  headline: { marginHorizontal: spacing.md, paddingTop: 3 },
  headlineKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, letterSpacing: 1.05 },
  headlineTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 43, letterSpacing: -.7 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: colors.liveSurface, borderWidth: 1, borderColor: colors.liveBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorText: { ...typography.bodyComfort, flex: 1, color: colors.liveText },
  retryAction: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { ...typography.control, color: colors.volt, letterSpacing: .5 },
  matchFeature: { marginHorizontal: spacing.md, gap: 10 },
  contextSlot: { marginHorizontal: spacing.md },
  matchBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  callAction: { minHeight: 57, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt, boxShadow: '0 10px 24px rgba(232,255,61,.16)' },
  callActionLocked: { backgroundColor: '#10170D', borderWidth: 1, borderColor: '#53631B' },
  callActionText: { color: '#07090B', fontFamily: fonts.display, fontSize: 21, lineHeight: 23, letterSpacing: .55 },
  callActionTextLocked: { color: colors.volt },
  callActionArrow: { position: 'absolute', right: 20, color: '#07090B', fontSize: 31, lineHeight: 33, fontWeight: '300' },
  upNextSection: { gap: 10 },
  sectionHead: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, letterSpacing: .5 },
  sectionLink: { ...typography.action, color: colors.volt, fontSize: 10, letterSpacing: .35 },
  upNextRail: { paddingHorizontal: spacing.md, gap: 10 },
  upNextCard: { position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#060B10', borderWidth: 1, borderColor: '#354653', boxShadow: '0 12px 28px rgba(0,0,0,.34)' },
  upNextBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  upNextSchedulePill: { position: 'absolute', zIndex: 4, top: 9, left: '50%', minHeight: 22, minWidth: 70, marginLeft: -35, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(8,13,8,.9)', borderWidth: 1, borderColor: 'rgba(232,255,61,.32)', boxShadow: '0 4px 12px rgba(0,0,0,.32)' },
  upNextWhen: { ...typography.label, color: colors.volt, fontSize: 9, lineHeight: 11, letterSpacing: .25 },
  upNextLogo: { position: 'absolute', zIndex: 2, top: 48, alignItems: 'center', justifyContent: 'center' },
  upNextLogoLeft: { left: 10 },
  upNextLogoRight: { right: 10 },
  upNextConfrontation: { position: 'absolute', zIndex: 3, top: 40, left: '50%', width: 72, marginLeft: -36, alignItems: 'center', justifyContent: 'center' },
  upNextTag: { width: '100%', color: '#F7F8F9', fontFamily: fonts.display, fontSize: 31, lineHeight: 32, textAlign: 'center', letterSpacing: -.5, textShadowColor: 'rgba(0,0,0,.94)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7 },
  upNextVs: { color: colors.volt, fontFamily: fonts.bold, fontSize: 13, lineHeight: 14, letterSpacing: .35, textShadowColor: 'rgba(0,0,0,.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  upNextFooter: { position: 'absolute', zIndex: 4, left: 14, right: 14, bottom: 11, alignItems: 'center', justifyContent: 'center' },
  upNextEvent: { color: '#AEB8C0', fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, letterSpacing: .35, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  railDots: { height: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  railDot: { width: 12, height: 4, borderRadius: 2, backgroundColor: '#263039' },
  railDotActive: { width: 24, backgroundColor: colors.volt },
  seasonCard: { minHeight: 88, marginHorizontal: spacing.md, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11, overflow: 'hidden', borderRadius: 18, backgroundColor: '#0C1116', borderWidth: 1, borderColor: '#28323B' },
  seasonEmblem: { width: 58, height: 58, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  seasonEmblemLoading: { opacity: .35 },
  seasonIdentity: { flex: 1, minWidth: 0, justifyContent: 'center' },
  seasonKicker: { color: '#A0AAB3', fontFamily: fonts.bold, fontSize: 11, lineHeight: 13, letterSpacing: .45 },
  seasonGrade: { marginTop: 3, fontFamily: fonts.display, fontSize: 23, lineHeight: 25, letterSpacing: .05 },
  seasonContext: { marginTop: 2, color: '#909BA5', fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, letterSpacing: .25 },
  seasonMetric: { width: 78, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center' },
  seasonMetricLabel: { color: '#929DA7', fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, letterSpacing: .35 },
  seasonMetricValue: { maxWidth: '100%', marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  emptyTicket: { position: 'relative', minHeight: 220, padding: 19, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 17, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#39444E' },
  emptyKicker: { ...typography.eyebrow, zIndex: 1, color: colors.volt, letterSpacing: 1 },
  emptyTitle: { zIndex: 1, maxWidth: 310, marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 29, lineHeight: 31 },
  emptyCopy: { ...typography.body, zIndex: 1, maxWidth: 300, marginTop: 6, color: '#A2ABB2' },
  skeleton: { minHeight: 245, padding: 16, justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  skeletonDuel: { minHeight: 96, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 },
  skeletonTeam: { width: 78, alignItems: 'center', gap: 8 },
  skeletonVersus: { width: 48, alignItems: 'center', gap: 8 },
  pressed: { opacity: .78, transform: [{ scale: .997 }] },
});
