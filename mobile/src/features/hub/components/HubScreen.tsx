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
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { gradeAccent, isZeroRank } from '@/src/features/ranking/grades';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadHubData } from '../api';
import { selectHubContext } from '../hubContext';
import {
  formatMatchSchedule,
  getHubMatchPhase,
  getMatchConfrontationState,
  withAlpha,
} from '../matchPresentation';
import type { HubData, HubMatch, HubPrediction } from '../types';
import { HubContextSkeleton, HubContextSlot } from './HubContextSlot';
import { MatchConfrontationCard } from './MatchConfrontationCard';

type HubGame = 'lol' | 'rocket_league' | 'valorant';

const GAME_BACKGROUNDS: Record<HubGame, ImageSourcePropType> = {
  lol: require('../../../../assets/onboarding/lol-characters.jpg'),
  rocket_league: require('../../../../assets/onboarding/rocket-league-arena.png'),
  valorant: require('../../../../assets/onboarding/valorant-characters.jpg'),
};

const SEASON_HEADER_DOTS = [0, 1, 2, 3] as const;

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
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const phase = hub.nextMatch ? getHubMatchPhase(hub.nextMatch) : null;
  const live = phase === 'live';
  const finished = phase === 'finished';
  const callLocked = Boolean(hub.nextMatchPrediction);
  const contextualItem = loading ? null : selectHubContext(hub);
  const headlineKicker = live
    ? 'LE MATCH EST LANCÉ'
    : finished
      ? 'LE VERDICT EST TOMBÉ'
      : callLocked
        ? 'TON CALL EST VERROUILLÉ'
        : 'À TOI DE JOUER';
  const headline = live
    ? 'SUIS LE MATCH EN DIRECT.'
    : finished
      ? 'CONSULTE LE RÉSULTAT.'
      : callLocked
        ? 'TON CALL EST POSÉ.'
        : 'TON PROCHAIN CALL.';

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
            <MatchHero
              match={hub.nextMatch}
              prediction={hub.nextMatchPrediction}
              userId={userId}
            />
          ) : (
            <EmptyHero />
          )}
        </View>

        <View>
          <SeasonProgressCard hub={hub} loading={loading} />
        </View>

        {loading || contextualItem ? (
          <View style={styles.contextSlot}>
            {loading ? <HubContextSkeleton /> : contextualItem ? <HubContextSlot context={contextualItem} /> : null}
          </View>
        ) : null}

        {!loading && hub.upNext.length ? (
          <View>
            <UpNext matches={hub.upNext} userId={userId} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MatchHero({
  match,
  prediction,
  userId,
}: {
  match: HubMatch;
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
  const open = useCallback(
    () => openMatchCenter(transitionTarget, { source: 'hub' }),
    [transitionTarget],
  );

  useEffect(() => {
    prepare();
  }, [prepare]);

  return (
    <View style={styles.matchFeature}>
      <MatchConfrontationCard
        match={match}
        onPress={open}
        onPressIn={prepare}
        state={confrontation}
      />
      <MatchCallAction label={confrontation.action} onPress={open} onPressIn={prepare} />
    </View>
  );
}

function MatchCallAction({
  label,
  onPress,
  onPressIn,
}: {
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
      style={({ pressed }) => [styles.callAction, pressed && styles.pressed]}
      testID="hub-primary-action"
    >
      <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.callActionText}>
        {label}
      </Text>
      <Text style={styles.callActionArrow}>›</Text>
    </Pressable>
  );
}

function UpNext({ matches, userId }: { matches: HubMatch[]; userId?: string }) {
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
          <UpNextMatchCard cardWidth={cardWidth} key={match.id} match={match} userId={userId} />
        ))}
      </ScrollView>
    </View>
  );
}

function UpNextMatchCard({
  cardWidth,
  match,
  userId,
}: {
  cardWidth: number;
  match: HubMatch;
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
  const cardHeight = Math.round(cardWidth / 1.78);
  const logoSize = Math.round(cardWidth * .28);
  const formatValue = Number(match.format);
  const format = Number.isInteger(formatValue) && formatValue > 0
    ? 'BO' + formatValue
    : 'FORMAT À CONFIRMER';

  return (
    <Pressable
      accessibilityLabel={match.equipe_a + ' contre ' + match.equipe_b + ', ' + formatMatchSchedule(match.debut)}
      accessibilityRole="button"
      onPress={() => openMatchCenter(transitionTarget, { source: 'hub' })}
      onPressIn={() => prepareMatchCenter(transitionTarget, userId)}
      style={({ pressed }) => [
        styles.upNextCard,
        { height: cardHeight, width: cardWidth },
        pressed && styles.pressed,
      ]}
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
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextTag}>
          {confrontation.teamA.tag}
        </Text>
        <Text style={styles.upNextVs}>VS</Text>
        <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.upNextTag}>
          {confrontation.teamB.tag}
        </Text>
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
  const { isCompactWidth } = useResponsiveLayout();
  const grade = hub.frags?.grade;
  const starting = Boolean(hub.frags && isZeroRank(hub.frags.frags));
  const gradeLabel = loading
    ? '—'
    : grade?.libelle?.toUpperCase() || 'NON CLASSÉ';
  const frags = loading || !hub.frags ? '—' : formatNumber(hub.frags.frags);
  const accent = loading ? '#7C8790' : gradeAccent(grade);
  const seasonContext = hub.seasonName?.toUpperCase() ?? 'SAISON EN COURS';
  const emblemSize = isCompactWidth ? 78 : 96;
  const openRank = () => router.push('/(tabs)/rank');

  return (
    <View style={styles.seasonSection} testID="hub-season-ranking">
      <View style={styles.seasonHeader}>
        <Text numberOfLines={1} style={styles.seasonHeaderTitle}>Ton classement</Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.seasonDots}
        >
          {SEASON_HEADER_DOTS.map((dot) => (
            <View key={dot} style={[styles.seasonDot, dot === 0 && styles.seasonDotActive]} />
          ))}
        </View>
        <Pressable
          accessibilityLabel="Voir mon classement"
          accessibilityRole="button"
          onPress={openRank}
          style={({ pressed }) => [styles.seasonHeaderAction, pressed && styles.pressed]}
        >
          <Text style={styles.seasonHeaderActionText}>Voir</Text>
          <ChevronRight color={colors.text} size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={'Ouvrir ma saison, rang ' + gradeLabel + ', ' + frags + ' Frags'}
        accessibilityRole="button"
        onPress={openRank}
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
          <RankEmblem grade={grade} size={emblemSize} starting={starting} />
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
          <View style={styles.seasonMetricCopy}>
            <Text numberOfLines={1} style={styles.seasonMetricLabel}>RATING FRAGS</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={.72}
              numberOfLines={1}
              style={styles.seasonMetricValue}
            >
              {frags}
            </Text>
          </View>
          <ChevronRight color="#AEB7BF" size={22} strokeWidth={2.4} />
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
    backgroundColor: '#020609',
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
  callActionText: {
    maxWidth: '82%',
    color: '#050708',
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: .45,
    textAlign: 'center',
  },
  callActionArrow: {
    position: 'absolute',
    right: 20,
    color: '#050708',
    fontSize: 39,
    lineHeight: 41,
    fontWeight: '300',
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
    color: colors.volt,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: .5,
  },
  sectionLink: {
    ...typography.action,
    color: colors.volt,
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
    backgroundColor: '#060B10',
    borderWidth: 1,
    borderColor: '#354653',
  },
  upNextBackdrop: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  upNextSchedulePill: {
    position: 'absolute',
    zIndex: 4,
    top: 11,
    left: '50%',
    minWidth: 84,
    marginLeft: -42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextWhen: {
    ...typography.label,
    color: colors.volt,
    letterSpacing: .25,
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  upNextLogo: {
    position: 'absolute',
    zIndex: 2,
    top: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextLogoLeft: {
    left: 10,
  },
  upNextLogoRight: {
    right: 10,
  },
  upNextConfrontation: {
    position: 'absolute',
    zIndex: 3,
    top: 40,
    left: '50%',
    width: 72,
    marginLeft: -36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextTag: {
    width: '100%',
    color: '#F7F8F9',
    fontFamily: fonts.display,
    fontSize: 31,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: -.5,
    textShadowColor: 'rgba(0,0,0,.94)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  upNextVs: {
    color: colors.volt,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 14,
    letterSpacing: .35,
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  upNextFooter: {
    position: 'absolute',
    zIndex: 4,
    left: 14,
    right: 14,
    bottom: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextEvent: {
    color: '#AEB8C0',
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: .35,
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  seasonDots: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  seasonDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#29323A',
  },
  seasonDotActive: {
    width: 36,
    backgroundColor: colors.volt,
    shadowColor: colors.volt,
    shadowOpacity: .38,
    shadowRadius: 8,
  },
  seasonHeaderAction: {
    minWidth: 74,
    minHeight: 44,
    paddingHorizontal: 12,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 22,
    backgroundColor: '#12181D',
    borderWidth: 1,
    borderColor: '#202931',
  },
  seasonHeaderActionText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
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
    minHeight: 88,
    paddingHorizontal: 10,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderRadius: 17,
    backgroundColor: 'rgba(7,9,11,.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
  },
  seasonMetricCompact: {
    width: 94,
    minHeight: 82,
    paddingHorizontal: 8,
  },
  seasonMetricCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  seasonMetricLabel: {
    color: '#9AA6B1',
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: .28,
  },
  seasonMetricValue: {
    maxWidth: '100%',
    marginTop: 6,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 31,
    lineHeight: 31,
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
    backgroundColor: '#091017',
    borderWidth: 1,
    borderColor: '#31414B',
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
