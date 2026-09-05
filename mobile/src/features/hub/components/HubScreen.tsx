import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { prefetchMatchCenterData } from '@/src/features/matches/matchCenterCache';
import {
  openMatchCenter,
  warmMatchCenter,
  type MatchCenterTarget,
} from '@/src/features/matches/matchCenterNavigation';
import { InlinePredictionPanel } from '@/src/features/matches/components/InlinePredictionPanel';
import type { ArenaMatch } from '@/src/features/matches/types';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import CallStreakCard from '@/src/features/retention/components/CallStreakCard';
import type { CallStreakState } from '@/src/features/retention/types';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { gradeAccent } from '@/src/features/ranking/grades';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadHubData } from '../api';
import {
  formatMatchSchedule,
  getHubMatchPhase,
  getMatchConfrontationState,
  withAlpha,
} from '../matchPresentation';
import type { HubData, HubMatch, HubPrediction } from '../types';
import { HubContextSkeleton, HubDailyChallenges } from './HubContextSlot';
import { MatchConfrontationCard } from './MatchConfrontationCard';

type HubGame = 'lol' | 'rocket_league' | 'valorant';

const GAME_BACKGROUNDS: Record<HubGame, ImageSourcePropType> = {
  lol: require('../../../../assets/onboarding/lol-characters.jpg'),
  rocket_league: require('../../../../assets/onboarding/rocket-league-arena.png'),
  valorant: require('../../../../assets/onboarding/valorant-characters.jpg'),
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
  callStreakPreview?: CallStreakState;
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
  callStreakPreview,
  error,
  headerEconomy,
  hub,
  loading,
  refreshing,
  onRefresh,
  onRetry,
  userId,
}: HubExperienceProps) {
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const [inlinePredictionMatchId, setInlinePredictionMatchId] = useState<string | null>(null);
  const inlinePredictionMatch = hub.nextMatch?.id === inlinePredictionMatchId
    ? hub.nextMatch
    : hub.upNext.find((match) => match.id === inlinePredictionMatchId) ?? null;
  const phase = hub.nextMatch ? getHubMatchPhase(hub.nextMatch) : null;
  const live = phase === 'live';
  const finished = phase === 'finished';
  const callLocked = Boolean(hub.nextMatchPrediction);
  const headlineKicker = finished
    ? 'LE VERDICT EST TOMBÉ'
    : callLocked
      ? 'TON CALL EST VERROUILLÉ'
      : 'À TOI DE JOUER';
  const headline = finished
    ? 'CONSULTE LE RÉSULTAT.'
    : callLocked
      ? 'TON CALL EST POSÉ.'
      : 'TON PROCHAIN CALL.';
  const closeInlinePrediction = useCallback(() => setInlinePredictionMatchId(null), []);
  const openInlinePrediction = useCallback((match: HubMatch) => setInlinePredictionMatchId(match.id), []);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, isShortLandscape && styles.contentLandscape]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <GriffHeader
          economy={headerEconomy}
          leading={<ProfileHeaderButton preview={Boolean(headerEconomy)} />}
          variant="wallet"
        />

        {!live ? (
          <View style={[styles.headline, isShortLandscape && styles.headlineLandscape]}>
            <Text style={styles.headlineKicker}>{headlineKicker}</Text>
            <Text
              adjustsFontSizeToFit={!isCompactWidth && !isShortLandscape}
              minimumFontScale={.72}
              numberOfLines={isCompactWidth || isShortLandscape ? 2 : 1}
              style={[
                styles.headlineTitle,
                isCompactWidth && styles.headlineTitleCompact,
                isShortLandscape && styles.headlineTitleLandscape,
              ]}
            >
              {headline}
            </Text>
          </View>
        ) : null}

        {error ? (
          <FeatureStateView
            compact
            domain="hub"
            onRetry={onRetry}
            presentation="inline"
            style={styles.stateInset}
            testID="hub-error-state"
            variant="error"
          />
        ) : null}

        <View>
          {loading ? (
            <HeroSkeleton />
          ) : hub.nextMatch ? (
            inlinePredictionMatch?.id === hub.nextMatch.id && getHubMatchPhase(hub.nextMatch) === 'upcoming' ? (
              <View style={styles.inlinePredictionPrimary}>
                <InlinePredictionPanel
                  key={inlinePredictionMatch.id}
                  match={hubMatchToArenaMatch(inlinePredictionMatch)}
                  onClose={closeInlinePrediction}
                  onPredictionLocked={onRefresh}
                  userId={userId}
                />
              </View>
            ) : (
              <MatchHero
                match={hub.nextMatch}
                onOpenPrediction={openInlinePrediction}
                prediction={hub.nextMatchPrediction}
                userId={userId}
              />
            )
          ) : (
            <EmptyHero />
          )}
        </View>

        <View>
          <SeasonProgressCard hub={hub} loading={loading} />
        </View>

        {!headerEconomy || callStreakPreview ? <CallStreakCard previewState={callStreakPreview} /> : null}

        <View style={styles.contextSlot}>
          {loading ? <HubContextSkeleton /> : <HubDailyChallenges />}
        </View>

        {!loading && hub.upNext.length ? (
          <View>
            <UpNext matches={hub.upNext} onOpenPrediction={openInlinePrediction} userId={userId} />
          </View>
        ) : null}

        {!loading && inlinePredictionMatch && inlinePredictionMatch.id !== hub.nextMatch?.id && getHubMatchPhase(inlinePredictionMatch) === 'upcoming' ? (
          <View style={styles.inlinePredictionUpcoming}>
            <InlinePredictionPanel
              key={inlinePredictionMatch.id}
              match={hubMatchToArenaMatch(inlinePredictionMatch)}
              onClose={closeInlinePrediction}
              onPredictionLocked={onRefresh}
              userId={userId}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MatchHero({
  match,
  onOpenPrediction,
  prediction,
  userId,
}: {
  match: HubMatch;
  onOpenPrediction: (match: HubMatch) => void;
  prediction: HubPrediction | null;
  userId?: string;
}) {
  const confrontation = getMatchConfrontationState(match, prediction);
  const transitionTarget = useMemo<MatchCenterTarget>(() => ({
    ...match,
    couleur_a: confrontation.teamA.accent,
    couleur_b: confrontation.teamB.accent,
    logo_a: confrontation.teamA.logo,
    logo_b: confrontation.teamB.logo,
  }), [
    confrontation.teamA.accent,
    confrontation.teamA.logo,
    confrontation.teamB.accent,
    confrontation.teamB.logo,
    match,
  ]);
  const prepare = useCallback(
    () => prepareMatchCenter(transitionTarget, userId),
    [transitionTarget, userId],
  );
  const opensInline = confrontation.phase === 'upcoming' && !prediction;
  const open = useCallback(
    () => {
      if (!prediction && getHubMatchPhase(match) === 'upcoming') {
        onOpenPrediction(match);
        return;
      }
      openMatchCenter(transitionTarget, { source: 'hub' });
    },
    [match, onOpenPrediction, prediction, transitionTarget],
  );

  useEffect(() => {
    prepare();
  }, [prepare]);

  return (
    <View style={styles.matchFeature}>
      <MatchConfrontationCard
        accessibilityHint={opensInline ? 'Déplie le pronostic dans le Hub' : 'Ouvre le Match Center'}
        match={match}
        onPress={open}
        onPressIn={prepare}
        state={confrontation}
      />
      <MatchCallAction
        live={confrontation.phase === 'live'}
        label={confrontation.action}
        onPress={open}
        onPressIn={prepare}
      />
    </View>
  );
}

function MatchCallAction({
  live,
  label,
  onPress,
  onPressIn,
}: {
  live: boolean;
  label: string;
  onPress: () => void;
  onPressIn: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.callAction,
        live && styles.callActionLive,
        pressed && styles.pressed,
      ]}
      testID="hub-primary-action"
    >
      {live ? (
        <LinearGradient
          colors={['#F0D51A', '#DDF10E', '#C5FA1D']}
          end={{ x: 1, y: .5 }}
          start={{ x: 0, y: .5 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.72}
        numberOfLines={1}
        style={[styles.callActionText, live && styles.callActionTextLive]}
      >
        {label}
      </Text>
      {live ? (
        <View style={styles.callActionLiveArrow} testID="hub-primary-action-live-arrow">
          <ChevronRight color="#FFFFFF" size={17} strokeWidth={3.2} />
        </View>
      ) : (
        <Text style={styles.callActionArrow}>›</Text>
      )}
    </Pressable>
  );
}

function UpNext({ matches, onOpenPrediction, userId }: { matches: HubMatch[]; onOpenPrediction: (match: HubMatch) => void; userId?: string }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(310, Math.max(276, width - spacing.md * 2));

  return (
    <View style={styles.upNextSection}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>À SUIVRE</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}>
          <Text style={styles.sectionLink}>TOUT VOIR →</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.upNextRail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {matches.map((match) => (
          <UpNextMatchCard cardWidth={cardWidth} key={match.id} match={match} onOpenPrediction={onOpenPrediction} userId={userId} />
        ))}
      </ScrollView>
    </View>
  );
}

function UpNextMatchCard({
  cardWidth,
  match,
  onOpenPrediction,
  userId,
}: {
  cardWidth: number;
  match: HubMatch;
  onOpenPrediction: (match: HubMatch) => void;
  userId?: string;
}) {
  const confrontation = getMatchConfrontationState(match, null);
  const transitionTarget: MatchCenterTarget = {
    ...match,
    couleur_a: confrontation.teamA.accent,
    couleur_b: confrontation.teamB.accent,
    logo_a: confrontation.teamA.logo,
    logo_b: confrontation.teamB.logo,
  };
  const cardHeight = Math.round(cardWidth / 2.18);
  const logoSize = Math.round(cardWidth * .18);
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0
    ? 'BO' + formatValue
    : 'FORMAT À CONFIRMER';
  const opensInline = getHubMatchPhase(match) === 'upcoming';

  return (
    <Pressable
      accessibilityLabel={match.equipe_a + ' contre ' + match.equipe_b + ', ' + formatMatchSchedule(match.debut)}
      accessibilityHint={opensInline ? 'Déplie le pronostic dans le Hub' : 'Ouvre le Match Center'}
      accessibilityRole="button"
      onPress={() => getHubMatchPhase(match) === 'upcoming' ? onOpenPrediction(match) : openMatchCenter(transitionTarget, { source: 'hub' })}
      onPressIn={() => prepareMatchCenter(transitionTarget, userId)}
      style={({ pressed }) => [
        styles.upNextCard,
        { height: cardHeight, width: cardWidth },
        pressed && styles.pressed,
      ]}
      testID={`hub-up-next-match-${match.id}`}
    >
      <Image
        resizeMode="cover"
        source={GAME_BACKGROUNDS[gameKey(match.jeu)]}
        style={styles.upNextBackdrop}
      />
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

      <View
        style={[
          styles.upNextLogo,
          styles.upNextLogoLeft,
          { height: logoSize, marginTop: -logoSize / 2, width: logoSize },
        ]}
        testID={`hub-up-next-logo-a-${match.id}`}
      >
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
      <View
        style={[
          styles.upNextLogo,
          styles.upNextLogoRight,
          { height: logoSize, marginTop: -logoSize / 2, width: logoSize },
        ]}
        testID={`hub-up-next-logo-b-${match.id}`}
      >
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

      <View style={[styles.upNextConfrontation, { left: logoSize + 18, right: logoSize + 18 }]}>
        <Text numberOfLines={1} style={styles.upNextWhen}>{formatMatchSchedule(match.debut)}</Text>
        <View style={styles.upNextDuel}>
          <Text adjustsFontSizeToFit minimumFontScale={.58} numberOfLines={1} style={styles.upNextTag}>
            {confrontation.teamA.tag}
          </Text>
          <Text style={styles.upNextVs}>VS</Text>
          <Text adjustsFontSizeToFit minimumFontScale={.58} numberOfLines={1} style={styles.upNextTag}>
            {confrontation.teamB.tag}
          </Text>
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextEvent}>
          {match.evenement.toUpperCase()} · {format}
        </Text>
      </View>
    </Pressable>
  );
}

function SeasonProgressCard({ hub, loading }: { hub: HubData; loading: boolean }) {
  const { isCompactWidth } = useResponsiveLayout();
  const grade = hub.frags?.grade;
  const gradeLabel = loading
    ? '—'
    : grade?.libelle?.toUpperCase() || 'NON CLASSÉ';
  const fragScore = loading || !hub.frags ? null : hub.frags.frags;
  const frags = loading || !hub.frags ? '—' : formatNumber(hub.frags.frags);
  const accent = loading ? '#7C8790' : gradeAccent(grade);
  const seasonContext = hub.seasonName?.toUpperCase() ?? 'SAISON EN COURS';
  const emblemSize = isCompactWidth ? 78 : 96;

  return (
    <View style={styles.seasonSection} testID="hub-season-ranking">
      <View style={styles.seasonHeader}>
        <Text numberOfLines={1} style={styles.seasonHeaderTitle}>Ton classement</Text>
      </View>

      <Pressable
        accessibilityLabel={'Ouvrir ma saison, rang ' + gradeLabel + ', ' + frags + ' Frags'}
        accessibilityRole="button"
        onPress={openRankScreen}
        style={({ pressed }) => [
          styles.seasonCard,
          { borderColor: withAlpha(accent, .72) },
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={[withAlpha(accent, .68), withAlpha(accent, .34), '#160D08']}
          end={{ x: 1, y: .6 }}
          start={{ x: 0, y: .4 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,.13)', 'rgba(255,255,255,0)', 'rgba(0,0,0,.28)']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.seasonEmblem,
            { height: emblemSize, width: emblemSize },
            loading && styles.seasonEmblemLoading,
          ]}
        >
          <RankEmblem grade={grade} size={emblemSize} />
        </View>
        <View style={styles.seasonIdentity}>
          <Text numberOfLines={1} style={styles.seasonContext}>{seasonContext}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={.68}
            numberOfLines={1}
            style={[styles.seasonGrade, isCompactWidth && styles.seasonGradeCompact, { color: accent }]}
          >
            {gradeLabel}
          </Text>
        </View>
        <View style={[styles.seasonMetric, isCompactWidth && styles.seasonMetricCompact]}>
          <LinearGradient
            colors={['rgba(13,29,40,.98)', 'rgba(4,10,15,.98)', 'rgba(2,5,8,.98)']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.seasonMetricInnerBorder} />
          <Text numberOfLines={1} style={styles.seasonMetricLabel}>FRAGS</Text>
          <View style={styles.seasonMetricCopy}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={.72}
              numberOfLines={1}
              style={[
                styles.seasonMetricValue,
                fragScore != null && Math.abs(fragScore) >= 100 && styles.seasonMetricValueMedium,
                fragScore != null && Math.abs(fragScore) >= 1000 && styles.seasonMetricValueLong,
                { color: accent },
              ]}
            >
              {frags}
            </Text>
            <ChevronRight
              color="#B8BDC2"
              size={isCompactWidth ? 23 : 27}
              strokeWidth={2.5}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function EmptyHero() {
  return (
    <View style={styles.emptyState}>
      <FeatureStateView
        action={{ label: 'VOIR LES MATCHS', onPress: () => router.push('/(tabs)/matches') }}
        compact
        domain="hub"
        testID="hub-empty-state"
        variant="empty"
      />
    </View>
  );
}

function HeroSkeleton() {
  return (
    <SkeletonGroup label={FEATURE_STATE_COPY.hub.loading.title} style={styles.matchFeature}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonTop}>
          <Skeleton height={14} radius="pill" width="24%" />
          <Skeleton height={14} radius="pill" width="42%" />
        </View>
        <View style={styles.skeletonDuel}>
          <View style={styles.skeletonTeam}>
            <Skeleton height={92} radius="lg" width={92} />
            <Skeleton height={35} radius="sm" width={84} />
          </View>
          <Skeleton height={32} radius="sm" tone="highlight" width={64} />
          <View style={styles.skeletonTeam}>
            <Skeleton height={92} radius="lg" width={92} />
            <Skeleton height={35} radius="sm" width={84} />
          </View>
        </View>
      </View>
      <View style={styles.skeletonAction}>
        <Skeleton height={23} radius="pill" tone="highlight" width="46%" />
      </View>
    </SkeletonGroup>
  );
}

function prepareMatchCenter(match: MatchCenterTarget, userId?: string) {
  warmMatchCenter(match);
  if (userId) {
    void prefetchMatchCenterData({ matchId: match.id, userId }).catch(() => undefined);
  }
}

function hubMatchToArenaMatch(match: HubMatch): ArenaMatch {
  const phase = getHubMatchPhase(match);
  return {
    ...match,
    saison_id: 'hub',
    statut: phase === 'live'
      ? 'en_cours'
      : phase === 'finished'
        ? 'termine'
        : phase === 'cancelled'
          ? 'annule'
          : 'a_venir',
    score_a: match.score_a ?? null,
    score_b: match.score_b ?? null,
    prediction: null,
  };
}

function openRankScreen() {
  router.push('/(tabs)/rank');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function gameKey(game: string): HubGame {
  const key = String(game || '').toLowerCase();
  if (key.includes('rocket') || key === 'rl') return 'rocket_league';
  if (key.includes('valorant')) return 'valorant';
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
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
    gap: 16,
    backgroundColor: 'transparent',
  },
  contentLandscape: {
    maxWidth: layout.wideContentMaxWidth,
    gap: 12,
  },
  headline: {
    marginHorizontal: spacing.md,
    paddingTop: 3,
  },
  headlineLandscape: {
    paddingTop: 0,
  },
  headlineKicker: {
    color: colors.volt,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.05,
  },
  headlineTitle: {
    marginTop: 5,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 43,
    letterSpacing: -.7,
  },
  headlineTitleCompact: {
    fontSize: 35,
    lineHeight: 37,
  },
  headlineTitleLandscape: {
    marginTop: 3,
    fontSize: 34,
    lineHeight: 36,
  },
  stateInset: {
    marginHorizontal: spacing.md,
  },
  matchFeature: {
    width: '100%',
    gap: 10,
  },
  inlinePredictionPrimary: {
    marginHorizontal: 4,
  },
  inlinePredictionUpcoming: {
    marginHorizontal: spacing.md,
  },
  contextSlot: {
    marginHorizontal: spacing.md,
  },
  callAction: {
    minHeight: 58,
    marginHorizontal: 4,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: colors.volt,
    borderWidth: 1,
    borderColor: '#D8EE31',
    boxShadow: '0 0 22px rgba(232,255,61,.18)',
  },
  callActionLive: {
    width: 192,
    minHeight: 42,
    alignSelf: 'center',
    marginHorizontal: 0,
    paddingLeft: 28,
    paddingRight: 10,
    gap: 12,
    borderRadius: 22,
    borderColor: '#E8F22B',
    backgroundColor: '#DDF10E',
    boxShadow: '0 8px 22px rgba(215,240,20,.2)',
  },
  callActionText: {
    maxWidth: '82%',
    color: '#050708',
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: .45,
    textAlign: 'center',
  },
  callActionTextLive: {
    maxWidth: 110,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: .25,
  },
  callActionArrow: {
    position: 'absolute',
    right: 20,
    color: '#050708',
    fontSize: 39,
    lineHeight: 41,
    fontWeight: '300',
  },
  callActionLiveArrow: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#050708',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    boxShadow: '0 2px 5px rgba(0,0,0,.32)',
  },
  upNextSection: {
    gap: 10,
  },
  sectionHead: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionKicker: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: .5,
  },
  sectionLink: {
    ...typography.action,
    color: colors.text,
    letterSpacing: .35,
  },
  upNextRail: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  upNextCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  upNextBackdrop: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  upNextWhen: {
    ...typography.label,
    color: colors.volt,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: .35,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  upNextLogo: {
    position: 'absolute',
    zIndex: 2,
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextLogoLeft: {
    left: 12,
  },
  upNextLogoRight: {
    right: 12,
  },
  upNextConfrontation: {
    position: 'absolute',
    zIndex: 4,
    top: 14,
    bottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextDuel: {
    width: '100%',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  upNextTag: {
    flex: 1,
    minWidth: 0,
    color: '#F7F8F9',
    fontFamily: fonts.display,
    fontSize: 29,
    lineHeight: 31,
    textAlign: 'center',
    letterSpacing: -.65,
    textShadowColor: 'rgba(0,0,0,.94)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  upNextVs: {
    flexShrink: 0,
    color: colors.volt,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: .1,
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  upNextEvent: {
    width: '100%',
    marginTop: 3,
    color: '#AEB8C0',
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: .25,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  seasonSection: {
    marginHorizontal: spacing.md,
    gap: 8,
  },
  seasonHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonHeaderTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -.3,
  },
  seasonCard: {
    minHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#3B1A08',
    borderWidth: 1,
    borderColor: 'rgba(255,190,92,.72)',
  },
  seasonEmblem: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonEmblemLoading: {
    opacity: .35,
  },
  seasonIdentity: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  seasonGrade: {
    marginTop: 5,
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 40,
    letterSpacing: -.75,
    textShadowColor: 'rgba(0,0,0,.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  seasonGradeCompact: {
    fontSize: 34,
    lineHeight: 34,
  },
  seasonContext: {
    color: '#D6C8BC',
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: .35,
    textShadowColor: 'rgba(0,0,0,.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seasonMetric: {
    width: 112,
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 11,
    flexShrink: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 2,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#050A0E',
    borderWidth: 1,
    borderColor: 'rgba(104,139,163,.78)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.72), 0 3px 10px rgba(0,0,0,.28)',
  },
  seasonMetricCompact: {
    width: 94,
    minHeight: 90,
    paddingTop: 10,
    paddingBottom: 7,
    paddingHorizontal: 8,
  },
  seasonMetricInnerBorder: {
    position: 'absolute',
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
  },
  seasonMetricCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  seasonMetricLabel: {
    color: '#F1F2F3',
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: .4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seasonMetricValue: {
    maxWidth: '70%',
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 47,
    letterSpacing: -.7,
    textShadowColor: 'rgba(0,0,0,.78)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  seasonMetricValueMedium: {
    fontSize: 39,
    lineHeight: 41,
  },
  seasonMetricValueLong: {
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -.45,
  },
  emptyState: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  skeletonCard: {
    aspectRatio: 1.405,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 18,
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  skeletonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skeletonDuel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 10,
  },
  skeletonTeam: {
    alignItems: 'center',
    gap: 9,
  },
  skeletonAction: {
    minHeight: 58,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#22290F',
  },
  pressed: {
    opacity: .82,
    transform: [{ scale: .995 }],
  },
});
