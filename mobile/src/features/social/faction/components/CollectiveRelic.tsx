import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  resolveRelicInstability,
  type RelicDiagnostics,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import {
  resolveRelicFillRatio,
  resolveRelicInteractionPresentation,
  resolveRelicPressAction,
} from '@/src/features/social/faction/relicInteraction';
import type {
  CommunityFaction,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { communityFormForLevel } from '@/src/features/social/faction/utils';

import CollectiveRelicRenderer from './CollectiveRelicRenderer';
import InteractiveRelicVial, { type InteractiveRelicVialHandle } from './InteractiveRelicVial';

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
  const [completedMutationEventId, setCompletedMutationEventId] = useState<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  const mutationInFlightRef = useRef<string | null>(null);
  const vialRef = useRef<InteractiveRelicVialHandle>(null);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const pendingMutation = mutation
    && mutation.id !== completedMutationEventId
    && !PRESENTED_MUTATION_EVENT_IDS.has(mutation.id)
    ? mutation
    : null;
  const presentation = resolveRelicInteractionPresentation(progress.current.container, pendingMutation);
  const fillRatio = resolveRelicFillRatio({
    levelProgress: progress.progress,
    mutationPending: Boolean(presentation.mutationEventId),
  });
  const stageDisabled = progress.level === 0;

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
    vialRef.current?.playReaction();
  }, [haptic]);

  const handlePress = useCallback(() => {
    const action = resolveRelicPressAction({
      disabled: stageDisabled,
      longPressTriggered: longPressTriggeredRef.current,
      mutationEventId: presentation.mutationEventId,
    });
    if (action === 'none') return;

    if (action === 'mutation' && presentation.mutationEventId) {
      if (mutationInFlightRef.current === presentation.mutationEventId) return;
      mutationInFlightRef.current = presentation.mutationEventId;
      haptic(Haptics.ImpactFeedbackStyle.Medium);
      vialRef.current?.playMutation();
      return;
    }

    haptic(Haptics.ImpactFeedbackStyle.Light);
    vialRef.current?.playReaction();
  }, [haptic, presentation.mutationEventId, stageDisabled]);

  const handleMutationBurst = useCallback(() => {
    haptic(Haptics.ImpactFeedbackStyle.Heavy);
  }, [haptic]);

  const handleMutationComplete = useCallback(() => {
    const eventId = presentation.mutationEventId;
    mutationInFlightRef.current = null;
    if (!eventId || PRESENTED_MUTATION_EVENT_IDS.has(eventId)) return;
    PRESENTED_MUTATION_EVENT_IDS.add(eventId);
    setCompletedMutationEventId(eventId);
    if (onMutationPresented) {
      void Promise.resolve(onMutationPresented(eventId)).catch(() => undefined);
    }
  }, [onMutationPresented, presentation.mutationEventId]);

  const stageLabel = faction
    ? `Relique ${progress.current.name} de ${faction.nom}, ${progress.charge} supporter${progress.charge > 1 ? 's' : ''} sur ${progress.objective}`
    : 'Relique de faction en attente de couleurs';
  const stageAccessibilityHint = stageDisabled
    ? 'La première charge collective est nécessaire'
    : presentation.mutationEventId
      ? 'Touche pour libérer le cœur et faire évoluer la relique'
      : 'Touche rapidement pour activer les racines et faire bouillonner le liquide';

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
        <InteractiveRelicVial
          fromContainer={presentation.fromContainer}
          height={compact ? 330 : 365}
          key={presentation.mutationEventId ?? `stable-${presentation.fromContainer}`}
          fillRatio={fillRatio}
          onMutationBurst={handleMutationBurst}
          onMutationComplete={handleMutationComplete}
          ref={vialRef}
          testID="collective-relic-vial"
          toContainer={presentation.toContainer}
          width={compact ? 360 : 390}
        />
      )}
    />
  );
}
