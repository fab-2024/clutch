import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { useCommunityDashboard } from '@/src/features/social/faction/hooks/useCommunityDashboard';
import type {
  RelicDiagnostics,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type { CommunityData, CommunityMutationPresentation, FactionProgress } from '@/src/features/social/faction/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import {
  EmptyFactions,
  FactionMemberRanking,
  FactionRelicHero,
  FactionWar,
  SocialHomeSkeleton,
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
  mutationOverride?: CommunityMutationPresentation | null;
  relicProgressOverride?: FactionProgress;
  instabilityPreviewOverride?: { charge: number; objective: number };
  onRelicDiagnosticsChange?: (diagnostics: RelicDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onRefresh: () => void;
  onRetry: () => void;
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
  mutationOverride,
  relicProgressOverride,
  instabilityPreviewOverride,
  onRelicDiagnosticsChange,
  onMutationPresented,
  onRefresh,
  onRetry,
  refreshing,
  supporterContribution,
  onSupporterContributionPresented,
}: SocialHomeExperienceProps) {
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
  const RelicHero = factionHeroVariant === 'v2' ? FactionRelicHeroV2 : FactionRelicHero;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
    >
      {error ? (
        <FeatureStateView
          compact
          domain="social"
          onRetry={onRetry}
          presentation="inline"
          testID="social-error-state"
          variant="error"
        />
      ) : null}

      <View>
        {loading ? <SocialHomeSkeleton /> : error && !faction && !rankedFactions.length ? null : (
          <RelicHero
            faction={faction}
            me={data.moi}
            mutationOverride={mutationOverride}
            relicProgressOverride={relicProgressOverride}
            instabilityPreviewOverride={instabilityPreviewOverride}
            onRelicDiagnosticsChange={onRelicDiagnosticsChange}
            onMutationPresented={onMutationPresented}
            onSupporterContributionPresented={onSupporterContributionPresented}
            supporterContribution={supporterContribution}
          />
        )}
      </View>

      {!loading && rankedFactions.length ? (
        <View>
          <FactionWar factions={rankedFactions} mine={faction} />
        </View>
      ) : null}

      {!loading && data.moi && faction ? (
        <View>
          <FactionMemberRanking faction={faction} me={data.moi} />
        </View>
      ) : null}

      {!loading && !error && !rankedFactions.length ? <EmptyFactions /> : null}
    </ScrollView>
  );
}
