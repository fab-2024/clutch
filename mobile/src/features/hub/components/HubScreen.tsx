import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { prefetchMatchCenterData } from '@/src/features/matches/matchCenterCache';
import {
  openMatchCenter,
  warmMatchCenter,
  type MatchCenterTarget,
} from '@/src/features/matches/matchCenterNavigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout } from '@/src/theme';

import { loadHubData } from '../api';
import { getMatchConfrontationState } from '../matchPresentation';
import type { HubData, HubMatch, HubPrediction } from '../types';
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
  error: string | null;
  hub: HubData;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  userId?: string;
};

export function HubExperience({
  error,
  hub,
  loading,
  refreshing,
  onRefresh,
  onRetry,
  userId,
}: HubExperienceProps) {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
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

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
    backgroundColor: '#020609',
  },
  stateInset: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  matchFeature: {
    width: '100%',
    gap: 10,
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
