import type { CommunityMutationPresentation, RelicContainer } from './types';
import { communityFormForLevel } from './utils';

export type RelicInteractionPresentation = {
  fromContainer: RelicContainer;
  mutationEventId: string | null;
  toContainer: RelicContainer | null;
};

export function resolveRelicInteractionPresentation(
  currentContainer: RelicContainer,
  mutation?: CommunityMutationPresentation | null,
): RelicInteractionPresentation {
  if (!mutation || mutation.to_level <= mutation.from_level) {
    return {
      fromContainer: currentContainer,
      mutationEventId: null,
      toContainer: null,
    };
  }

  return {
    fromContainer: communityFormForLevel(mutation.from_level).container,
    mutationEventId: mutation.id,
    toContainer: communityFormForLevel(mutation.to_level).container,
  };
}

export type RelicPressAction = 'none' | 'reaction' | 'mutation';

export function resolveRelicPressAction({
  disabled,
  longPressTriggered,
  mutationEventId,
}: {
  disabled: boolean;
  longPressTriggered: boolean;
  mutationEventId: string | null;
}): RelicPressAction {
  if (disabled || longPressTriggered) return 'none';
  return mutationEventId ? 'mutation' : 'reaction';
}

export function resolveRelicFillRatio({
  levelProgress,
  mutationPending,
}: {
  levelProgress: number;
  mutationPending: boolean;
}) {
  if (mutationPending) return 1;
  return Math.max(0, Math.min(1, levelProgress));
}
