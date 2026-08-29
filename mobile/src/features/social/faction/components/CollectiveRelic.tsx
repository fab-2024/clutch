import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import {
  resolveRelicInstability,
  type RelicDiagnostics,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type {
  CommunityFaction,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { communityFormForLevel } from '@/src/features/social/faction/utils';

import CollectiveRelicRenderer from './CollectiveRelicRenderer';
import StaticRelicVial from './StaticRelicVial';

const PRESENTED_SUPPORTER_CONTRIBUTION_IDS = new Set<string>();
const PRESENTED_MUTATION_EVENT_IDS = new Set<string>();

type CollectiveRelicProps = {
  compact?: boolean;
  faction: CommunityFaction | null;
  instabilityPreviewOverride?: { charge: number; objective: number };
  mutation?: CommunityMutationPresentation | null;
  onDiagnosticsChange?: (diagnostics: RelicDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  progress: FactionProgress;
  supporterContribution?: SupporterContributionPresentation | null;
};

export default function CollectiveRelic({
  compact = false,
  faction,
  instabilityPreviewOverride,
  mutation,
  onDiagnosticsChange,
  onMutationPresented,
  onSupporterContributionPresented,
  progress,
  supporterContribution,
}: CollectiveRelicProps) {
  const longPressTriggeredRef = useRef(false);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const persistentLiquidLift = Math.min(18, Math.max(0, progress.progress * 15));

  useEffect(() => {
    if (!mutation || PRESENTED_MUTATION_EVENT_IDS.has(mutation.id)) return;
    PRESENTED_MUTATION_EVENT_IDS.add(mutation.id);
    if (onMutationPresented) {
      void Promise.resolve(onMutationPresented(mutation.id)).catch(() => undefined);
    }
  }, [mutation, onMutationPresented]);

  useEffect(() => {
    if (!supporterContribution || PRESENTED_SUPPORTER_CONTRIBUTION_IDS.has(supporterContribution.id)) return;
    PRESENTED_SUPPORTER_CONTRIBUTION_IDS.add(supporterContribution.id);
    if (onSupporterContributionPresented) {
      void Promise.resolve(onSupporterContributionPresented(supporterContribution.id)).catch(() => undefined);
    }
  }, [onSupporterContributionPresented, supporterContribution]);

  useEffect(() => {
    const fromForm = mutation ? communityFormForLevel(mutation.from_level) : null;
    const toForm = mutation ? communityFormForLevel(mutation.to_level) : null;
    onDiagnosticsChange?.({
      tier: instability.tier,
      ratio: instability.ratio,
      mutationFromForm: fromForm?.container ?? null,
      mutationToForm: toForm?.container ?? null,
      mutationEventId: mutation?.id ?? null,
      mutationEventPresented: Boolean(mutation && PRESENTED_MUTATION_EVENT_IDS.has(mutation.id)),
    });
  }, [instability.ratio, instability.tier, mutation, onDiagnosticsChange, supporterContribution]);

  const haptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(style).catch(() => undefined);
  }, []);

  const handlePressIn = useCallback(() => {
    longPressTriggeredRef.current = false;
  }, []);

  const handleLongPress = useCallback(() => {
    longPressTriggeredRef.current = true;
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [haptic]);

  const handlePress = useCallback(() => {
    if (!longPressTriggeredRef.current) haptic(Haptics.ImpactFeedbackStyle.Light);
  }, [haptic]);

  const stageLabel = faction
    ? `Relique ${progress.current.name} de ${faction.nom}, ${progress.charge} supporter${progress.charge > 1 ? 's' : ''} sur ${progress.objective}`
    : 'Relique de faction en attente de couleurs';
  const stageDisabled = progress.level === 0;
  const stageAccessibilityHint = stageDisabled
    ? 'La première charge collective est nécessaire'
    : 'Touche rapidement pour une réaction tactile, ou maintiens pour faire résonner le cœur';

  return (
    <CollectiveRelicRenderer
      accessibilityHint={stageAccessibilityHint}
      accessibilityLabel={stageLabel}
      compact={compact}
      disabled={stageDisabled}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressIn={handlePressIn}
      presentedVessel={(
        <StaticRelicVial
          container={progress.current.container}
          height={compact ? 330 : 365}
          levelLift={persistentLiquidLift}
          testID="collective-relic-vial"
          width={compact ? 360 : 390}
        />
      )}
    />
  );
}
