import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import type { CallStreakState } from '@/src/features/retention/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, spacing } from '@/src/theme';

import { loadHubData } from '../api';
import {
  getHubMatchPhase,
  getMatchConfrontationState,
} from '../matchPresentation';
import type { HubData, HubMatch, HubPrediction } from '../types';
import { HubContextSkeleton, HubDailyChallenges } from './HubContextSlot';
import { HubProgressPanel } from './HubProgressPanel';
import { MatchConfrontationCard } from './MatchConfrontationCard';

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
  const { isShortLandscape } = useResponsiveLayout();
  const [inlinePredictionMatchId, setInlinePredictionMatchId] = useState<string | null>(null);
  const inlinePredictionMatch = hub.nextMatch?.id === inlinePredictionMatchId
    ? hub.nextMatch
    : null;
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

        <View style={styles.seasonSection}>
          <Text style={styles.seasonHeaderTitle}>Ma progression</Text>
          <HubProgressPanel hub={hub} loading={loading} previewState={callStreakPreview} />
        </View>

        <View style={styles.contextSlot}>
          {loading ? <HubContextSkeleton /> : <HubDailyChallenges />}
        </View>

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
        actionLabel={confrontation.action}
        accessibilityHint={opensInline ? 'Déplie le pronostic dans le Hub' : 'Ouvre le centre du match'}
        match={match}
        onPress={open}
        onPressIn={prepare}
        state={confrontation}
      />
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
        <View style={styles.skeletonAction}>
          <Skeleton height={19} radius="pill" tone="highlight" width="46%" />
        </View>
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
  stateInset: {
    marginHorizontal: spacing.md,
  },
  matchFeature: {
    width: '100%',
    gap: 0,
  },
  inlinePredictionPrimary: {
    marginHorizontal: 4,
  },
  contextSlot: {
    marginHorizontal: spacing.md,
  },
  seasonSection: { marginHorizontal: spacing.md, gap: 8 },
  seasonHeaderTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, marginBottom: 2 },
  emptyState: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  skeletonCard: {
    aspectRatio: 1.25,
    padding: 14,
    justifyContent: 'space-between',
    borderRadius: 24,
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
    minHeight: 40,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#22290F',
  },
});
