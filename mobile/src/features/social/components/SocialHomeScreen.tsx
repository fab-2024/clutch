import { useCallback, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { useCommunityDashboard } from '@/src/features/social/faction/hooks/useCommunityDashboard';
import type { RelicAnimationPreset } from '@/src/features/social/faction/components/CollectiveRelic';
import type {
  RelicMotionDiagnostics,
  RelicMotionCommand,
  RelicMotionPreview,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import type { CommunityData, CommunityMutationPresentation, FactionProgress } from '@/src/features/social/faction/types';
import { relicSceneVisibleAtOffset } from '@/src/features/social/faction/relicMutationMastering';
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
  const relicHeroHeightRef = useRef(480);
  const relicSceneActiveRef = useRef(true);
  const [relicSceneActive, setRelicSceneActive] = useState(true);
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
  const updateRelicSceneVisibility = useCallback((visible: boolean) => {
    if (relicSceneActiveRef.current === visible) return;
    relicSceneActiveRef.current = visible;
    setRelicSceneActive(visible);
  }, []);
  const handleRelicHeroLayout = useCallback((event: LayoutChangeEvent) => {
    relicHeroHeightRef.current = Math.max(1, event.nativeEvent.layout.height);
  }, []);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateRelicSceneVisibility(relicSceneVisibleAtOffset(
      event.nativeEvent.contentOffset.y,
      relicHeroHeightRef.current,
    ));
  }, [updateRelicSceneVisibility]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={64}
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

      <View onLayout={handleRelicHeroLayout}>
        {loading ? <SocialHomeSkeleton /> : error && !faction && !rankedFactions.length ? null : (
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
            relicSceneActive={relicSceneActive}
            instabilityPreviewOverride={instabilityPreviewOverride}
            motionPreviewOverride={motionPreviewOverride}
            onRelicDiagnosticsChange={onRelicDiagnosticsChange}
            onMutationPresented={onMutationPresented}
            onSupporterContributionPresented={onSupporterContributionPresented}
            reduceMotionOverride={reduceMotionOverride}
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
