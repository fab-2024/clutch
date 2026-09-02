/// <reference types="jest" />

import {
  resolveRelicFillRatio,
  resolveRelicInteractionPresentation,
  resolveRelicPressAction,
} from '../relicInteraction';
import {
  RELIC_MUTATION_DURATION_MS,
  RELIC_MUTATION_RELEASE_MS,
  RELIC_MUTATION_RUPTURE_MS,
  RELIC_MUTATION_RUPTURE_PROGRESS,
  relicMutationBoilEnergy,
  relicMutationCrackOpacity,
  relicMutationCrackProgress,
  relicMutationHeartScale,
  relicMutationMaterialization,
  relicMutationOldVesselOpacity,
  relicMutationOverheatEnergy,
  relicMutationShockwaveOpacity,
  relicMutationSplashEdgeOpacity,
  relicMutationSplashFillOpacity,
} from '../relicMutationMotion';
import type { CommunityMutationPresentation } from '../types';

const AMPOULE_TO_FIOLE: CommunityMutationPresentation = {
  id: 'mutation-ampoule-fiole',
  from_level: 1,
  to_level: 2,
  name: 'Fiole',
  threshold: 100,
  reward: 200,
  awakened: false,
  occurred_at: '2026-09-01T08:00:00.000Z',
};

describe('relic interaction presentation', () => {
  it('keeps the current vessel when no mutation is pending', () => {
    expect(resolveRelicInteractionPresentation('ampoule', null)).toEqual({
      fromContainer: 'ampoule',
      mutationEventId: null,
      toContainer: null,
    });
  });

  it('resolves both sides of a pending vessel mutation', () => {
    expect(resolveRelicInteractionPresentation('fiole', AMPOULE_TO_FIOLE)).toEqual({
      fromContainer: 'ampoule',
      mutationEventId: 'mutation-ampoule-fiole',
      toContainer: 'fiole',
    });
  });

  it('keeps the terminal vessel while awakening its heart', () => {
    expect(resolveRelicInteractionPresentation('reliquaire', {
      ...AMPOULE_TO_FIOLE,
      id: 'mutation-awakened',
      from_level: 5,
      to_level: 6,
    })).toEqual({
      fromContainer: 'reliquaire',
      mutationEventId: 'mutation-awakened',
      toContainer: 'reliquaire',
    });
  });
});

describe('relic press action', () => {
  it('runs the local reaction for a regular tap', () => {
    expect(resolveRelicPressAction({
      disabled: false,
      longPressTriggered: false,
      mutationEventId: null,
    })).toBe('reaction');
  });

  it('prioritizes the mutation when an event is waiting', () => {
    expect(resolveRelicPressAction({
      disabled: false,
      longPressTriggered: false,
      mutationEventId: 'mutation-ampoule-fiole',
    })).toBe('mutation');
  });

  it('does not replay a tap after a long press or while disabled', () => {
    expect(resolveRelicPressAction({
      disabled: false,
      longPressTriggered: true,
      mutationEventId: null,
    })).toBe('none');
    expect(resolveRelicPressAction({
      disabled: true,
      longPressTriggered: false,
      mutationEventId: null,
    })).toBe('none');
  });
});

describe('relic elixir fill ratio', () => {
  it('preserves continuous progress between consecutive supporters', () => {
    const ratio19 = resolveRelicFillRatio({
      levelProgress: (19 - 1) / 99,
      mutationPending: false,
    });
    const ratio20 = resolveRelicFillRatio({
      levelProgress: (20 - 1) / 99,
      mutationPending: false,
    });
    const ratio50 = resolveRelicFillRatio({
      levelProgress: (50 - 1) / 99,
      mutationPending: false,
    });
    const ratio51 = resolveRelicFillRatio({
      levelProgress: (51 - 1) / 99,
      mutationPending: false,
    });

    expect(ratio20).toBeGreaterThan(ratio19);
    expect(ratio51).toBeGreaterThan(ratio50);
    expect(ratio20 - ratio19).toBeCloseTo(1 / 99);
    expect(ratio51 - ratio50).toBeCloseTo(1 / 99);
  });

  it('shows the previous vessel full while its mutation is pending', () => {
    expect(resolveRelicFillRatio({
      levelProgress: 0,
      mutationPending: true,
    })).toBe(1);
  });

  it('restarts the next vessel empty and clamps invalid values', () => {
    expect(resolveRelicFillRatio({
      levelProgress: 0,
      mutationPending: false,
    })).toBe(0);
    expect(resolveRelicFillRatio({
      levelProgress: .5,
      mutationPending: false,
    })).toBe(.5);
    expect(resolveRelicFillRatio({
      levelProgress: -2,
      mutationPending: false,
    })).toBe(0);
    expect(resolveRelicFillRatio({
      levelProgress: 3,
      mutationPending: false,
    })).toBe(1);
  });
});

describe('relic mutation motion', () => {
  it('keeps the detailed mutation on an exact four-second timeline', () => {
    expect(RELIC_MUTATION_DURATION_MS).toBe(4_000);
    expect(RELIC_MUTATION_RUPTURE_MS).toBe(2_200);
    expect(RELIC_MUTATION_RELEASE_MS).toBe(1_800);
    expect(RELIC_MUTATION_RUPTURE_PROGRESS).toBe(.55);
    expect(RELIC_MUTATION_RUPTURE_MS / RELIC_MUTATION_DURATION_MS).toBe(
      RELIC_MUTATION_RUPTURE_PROGRESS,
    );
  });

  it('builds heat and viscous boiling before the 2 200 ms rupture', () => {
    expect(relicMutationOverheatEnergy(0)).toBe(0);
    expect(relicMutationBoilEnergy(0)).toBe(0);
    expect(relicMutationOverheatEnergy(.32)).toBeGreaterThan(0);
    expect(relicMutationBoilEnergy(.32)).toBeGreaterThan(.75);
    expect(relicMutationHeartScale(.32)).toBeGreaterThan(1);
    expect(relicMutationOverheatEnergy(.7)).toBe(0);
    expect(relicMutationBoilEnergy(.7)).toBe(0);
  });

  it('draws staggered cracks and clears them immediately after rupture', () => {
    expect(relicMutationCrackProgress(.42, 0)).toBe(0);
    expect(relicMutationCrackProgress(.49, 0)).toBeGreaterThan(0);
    expect(relicMutationCrackProgress(.49, 6)).toBeLessThan(
      relicMutationCrackProgress(.49, 0),
    );
    expect(relicMutationCrackOpacity(RELIC_MUTATION_RUPTURE_PROGRESS, 0)).toBe(1);
    expect(relicMutationCrackOpacity(.64, 0)).toBe(0);
  });

  it('removes the old vessel and materializes the next one after rupture', () => {
    expect(relicMutationOldVesselOpacity(RELIC_MUTATION_RUPTURE_PROGRESS)).toBe(1);
    expect(relicMutationOldVesselOpacity(.66)).toBe(0);
    expect(relicMutationMaterialization(.79)).toBe(0);
    expect(relicMutationMaterialization(.9)).toBeGreaterThan(0);
    expect(relicMutationMaterialization(1)).toBe(1);
  });

  it('emits a short shockwave only after the rupture', () => {
    expect(relicMutationShockwaveOpacity(.54)).toBe(0);
    expect(relicMutationShockwaveOpacity(.62)).toBeGreaterThan(0);
    expect(relicMutationShockwaveOpacity(.72)).toBeCloseTo(0);
  });

  it('dries splash fill before its remaining edge evaporates', () => {
    expect(relicMutationSplashFillOpacity(.64)).toBeGreaterThan(0);
    expect(relicMutationSplashEdgeOpacity(.64)).toBeGreaterThan(0);
    expect(relicMutationSplashFillOpacity(.82)).toBe(0);
    expect(relicMutationSplashEdgeOpacity(.82)).toBeGreaterThan(0);
    expect(relicMutationSplashEdgeOpacity(1)).toBe(0);
  });
});
