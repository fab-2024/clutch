import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { useCommunityDashboard } from '@/src/features/social/faction/hooks/useCommunityDashboard';
import type { RelicAnimationPreset } from '@/src/features/social/faction/components/CollectiveRelic';
import type {
  RelicMotionDiagnostics,
  RelicMotionCommand,
  RelicMotionPreview,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import type { CommunityData, CommunityMutationPresentation, FactionProgress } from '@/src/features/social/faction/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import {
  EmptyFactions,
  FactionHeroSkeleton,
  FactionMemberRanking,
  FactionRelicHero,
  FactionWar,
} from './SocialHomeSections';
import FactionRelicHeroV2 from './FactionRelicHeroV2';
import { styles } from './SocialHomeScreen.styles';

export type FactionHeroVariant = 'current' | 'v2';

type SocialHomeExperienceProps = {
  data: CommunityData;
  error: string | null;
  factionHeroVariant?: FactionHeroVariant;
  favoriteTeamId?: string | null;
  loading: boolean;
  mutationInterruptSignal?: number;
  mutationOverride?: CommunityMutationPresentation | null;
  mutationPreviewMs?: number | null;
  relicAnimationPreset?: RelicAnimationPreset;
  relicLabMode?: boolean;
  relicMotionCommand?: RelicMotionCommand | null;
  relicProgressOverride?: FactionProgress;
  instabilityPreviewOverride?: { charge: number; objective: number };
  motionPreviewOverride?: RelicMotionPreview;
  onRelicDiagnosticsChange?: (diagnostics: RelicMotionDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onRefresh: () => void;
  onRetry: () => void;
  reduceMotionOverride?: boolean;
  refreshing: boolean;
  supporterContribution?: SupporterContributionPresentation | null;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
};

export default function SocialHomeScreen() {
  return <SocialHomeScreenForVariant factionHeroVariant="current" />;
}

export function SocialHomeV2Screen() {
  return <SocialHomeScreenForVariant factionHeroVariant="v2" />;
}

function SocialHomeScreenForVariant({ factionHeroVariant }: { factionHeroVariant: FactionHeroVariant }) {
  const { profile } = useAuth();
  const { acknowledgeMutation, data, error, load, loading, refreshing } = useCommunityDashboard();

  return (
    <SocialHomeExperience
      data={data}
      error={error}
      factionHeroVariant={factionHeroVariant}
      favoriteTeamId={profile?.equipe_favorite_id}
      loading={loading}
      onMutationPresented={acknowledgeMutation}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

export function SocialHomeExperience({
  data,
  error,
  factionHeroVariant = 'current',
  favoriteTeamId,
  loading,
  mutationInterruptSignal,
  mutationOverride,
  mutationPreviewMs,
  relicAnimationPreset,
  relicLabMode,
  relicMotionCommand,
  relicProgressOverride,
  instabilityPreviewOverride,
  motionPreviewOverride,
  onRelicDiagnosticsChange,
  onMutationPresented,
  onRefresh,
  onRetry,
  reduceMotionOverride,
  refreshing,
  supporterContribution,
  onSupporterContributionPresented,
}: SocialHomeExperienceProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
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
  const RelicHero = factionHeroVariant === 'v2' ? FactionRelicHeroV2 : FactionRelicHero;

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
        {loading ? <FactionHeroSkeleton /> : (
          <RelicHero
            faction={faction}
            me={data.moi}
            mutationInterruptSignal={mutationInterruptSignal}
            mutationOverride={mutationOverride}
            mutationPreviewMs={mutationPreviewMs}
            relicAnimationPreset={relicAnimationPreset}
            relicLabMode={relicLabMode}
            relicMotionCommand={relicMotionCommand}
            relicProgressOverride={relicProgressOverride}
            instabilityPreviewOverride={instabilityPreviewOverride}
            motionPreviewOverride={motionPreviewOverride}
            onRelicDiagnosticsChange={onRelicDiagnosticsChange}
            onMutationPresented={onMutationPresented}
            onSupporterContributionPresented={onSupporterContributionPresented}
            reduceMotionOverride={reduceMotionOverride}
            supporterContribution={supporterContribution}
          />
        )}
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
