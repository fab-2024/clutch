import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { CommunityData } from '@/src/features/social/faction/types';
import { useCommunityDashboard } from '@/src/features/social/faction/hooks/useCommunityDashboard';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import {
  EmptyFactions,
  FactionHeroSkeleton,
  FactionMemberRanking,
  FactionRelicHero,
  FactionWar,
} from './SocialHomeSections';
import { styles } from './SocialHomeScreen.styles';

type SocialHomeExperienceProps = {
  data: CommunityData;
  error: string | null;
  favoriteTeamId?: string | null;
  loading: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  refreshing: boolean;
};

export default function SocialHomeScreen() {
  const { profile } = useAuth();
  const { data, error, load, loading, refreshing } = useCommunityDashboard();

  return (
    <SocialHomeExperience
      data={data}
      error={error}
      favoriteTeamId={profile?.equipe_favorite_id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

export function SocialHomeExperience({
  data,
  error,
  favoriteTeamId,
  loading,
  onRefresh,
  onRetry,
  refreshing,
}: SocialHomeExperienceProps) {
  const reduceMotion = useReducedMotion();
  const rankedFactions = useMemo(
    () => [...data.factions].sort((a, b) => (
      b.membres - a.membres
      || b.croissance_7j - a.croissance_7j
      || a.nom.localeCompare(b.nom)
    )),
    [data.factions],
  );
  const faction = useMemo(
    () => rankedFactions.find((item) => item.moi)
      ?? rankedFactions.find((item) => item.equipe_id === favoriteTeamId)
      ?? null,
    [favoriteTeamId, rankedFactions],
  );
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(380);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
    >
      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
        </View>
      ) : null}

      <Animated.View entering={entrance(20)}>
        {loading ? <FactionHeroSkeleton /> : <FactionRelicHero faction={faction} me={data.moi} />}
      </Animated.View>

      {!loading && rankedFactions.length ? (
        <Animated.View entering={entrance(90)}>
          <FactionWar factions={rankedFactions} mine={faction} />
        </Animated.View>
      ) : null}

      {!loading && data.moi && faction ? (
        <Animated.View entering={entrance(150)}>
          <FactionMemberRanking faction={faction} me={data.moi} />
        </Animated.View>
      ) : null}

      {!loading && !rankedFactions.length ? <EmptyFactions /> : null}
    </ScrollView>
  );
}
