/// <reference types="jest" />

import {
  aggregateSupporterContributions,
  clearRelicMutationTimerHandles,
  MUTATION_DURATION_MS,
  mutationElapsedMs,
  mutationSegment,
  observeSupporterCharge,
  REDUCED_MUTATION_DURATION_MS,
  RELIC_RESONANCE_MIN_MS,
  RELIC_TAP_MAX_MS,
  relicMutationTimelineStage,
  resolveRelicGesture,
  resolveRelicInstability,
  resolveRelicMutationTransition,
  shouldEnterMutationReady,
  shouldQueueSupporterContribution,
  shouldStartRelicMutation,
  type RelicContributionBaseline,
  type RelicMutationTimers,
} from '../relicMotion';
import type { CommunityMutationPresentation } from '../types';

describe('relic gesture classification', () => {
  it.each([0, 60, RELIC_TAP_MAX_MS - 1])(
    'classifies a release at %i ms as a quick tap',
    (elapsedMs) => {
      expect(resolveRelicGesture(elapsedMs)).toBe('tapReaction');
    },
  );

  it.each([RELIC_TAP_MAX_MS, 320, RELIC_RESONANCE_MIN_MS - 1])(
    'classifies a release at %i ms as a cancelled charge',
    (elapsedMs) => {
      expect(resolveRelicGesture(elapsedMs)).toBe('recovering');
    },
  );

  it.each([RELIC_RESONANCE_MIN_MS, 760, 1_300])(
    'classifies a hold at %i ms as resonance',
    (elapsedMs) => {
      expect(resolveRelicGesture(elapsedMs)).toBe('resonating');
    },
  );

  it('does not resolve a second sequence for the same gesture', () => {
    expect(resolveRelicGesture(RELIC_RESONANCE_MIN_MS)).toBe('resonating');
    expect(resolveRelicGesture(720, true)).toBeNull();
    expect(resolveRelicGesture(80, true)).toBeNull();
  });
});

describe('relic instability', () => {
  it('returns zero when the objective is zero', () => {
    expect(resolveRelicInstability(40, 0)).toEqual({
      ratio: 0,
      tier: 'calm',
      localIntensity: 0,
    });
  });

  it('clamps ratios below zero', () => {
    expect(resolveRelicInstability(-10, 100).ratio).toBe(0);
  });

  it('clamps ratios above one', () => {
    expect(resolveRelicInstability(150, 100).ratio).toBe(1);
  });

  it.each([
    [49, 'calm'],
    [50, 'awakening'],
    [74, 'awakening'],
    [75, 'charged'],
    [89, 'charged'],
    [90, 'critical'],
    [99, 'critical'],
    [100, 'mutationReady'],
  ] as const)('maps %i%% to %s', (charge, tier) => {
    expect(resolveRelicInstability(charge, 100).tier).toBe(tier);
  });

  it('progresses local intensity inside a tier', () => {
    const start = resolveRelicInstability(50, 100);
    const middle = resolveRelicInstability(62.5, 100);
    const end = resolveRelicInstability(74.999, 100);
    expect(start.localIntensity).toBe(0);
    expect(middle.localIntensity).toBeCloseTo(.5);
    expect(end.localIntensity).toBeGreaterThan(.99);
  });
});

describe('supporter contribution presentation', () => {
  const emptyBaseline: RelicContributionBaseline = { factionId: null, charge: null };

  it('does not animate the first load', () => {
    expect(observeSupporterCharge(emptyBaseline, 'kc', 21).contribution).toBeNull();
  });

  it('creates exactly one contribution for an increase', () => {
    const observed = observeSupporterCharge({ factionId: 'kc', charge: 21 }, 'kc', 26);
    expect(observed.contribution).toEqual({
      id: 'charge:kc:21:26',
      amount: 5,
      fromCharge: 21,
      toCharge: 26,
    });
  });

  it('does not animate a decrease', () => {
    expect(observeSupporterCharge({ factionId: 'kc', charge: 26 }, 'kc', 20).contribution).toBeNull();
  });

  it('resets the baseline when the faction changes', () => {
    const observed = observeSupporterCharge({ factionId: 'kc', charge: 21 }, 'fnc', 120);
    expect(observed.contribution).toBeNull();
    expect(observed.baseline).toEqual({ factionId: 'fnc', charge: 120 });
  });

  it('aggregates several contributions into one batch', () => {
    const first = aggregateSupporterContributions(null, {
      id: 'one', amount: 1, fromCharge: 20, toCharge: 21,
    });
    const aggregate = aggregateSupporterContributions(first, {
      id: 'five', amount: 5, fromCharge: 21, toCharge: 26,
    });
    expect(aggregate).toMatchObject({
      ids: ['one', 'five'],
      amount: 6,
      count: 2,
      fromCharge: 20,
      toCharge: 26,
    });
  });

  it('does not aggregate the same contribution twice', () => {
    const contribution = { id: 'unique', amount: 1, fromCharge: 20, toCharge: 21 };
    const first = aggregateSupporterContributions(null, contribution);
    expect(aggregateSupporterContributions(first, contribution)).toEqual(first);
  });

  it('queues a contribution received during an interaction', () => {
    expect(shouldQueueSupporterContribution('charging')).toBe(true);
    expect(shouldQueueSupporterContribution('resonating')).toBe(true);
    expect(shouldQueueSupporterContribution('idle')).toBe(false);
  });
});

describe('mutation-ready presentation', () => {
  it('is emitted only once for the same presentation key', () => {
    expect(shouldEnterMutationReady('mutationReady', 'kc:ampoule', null)).toBe(true);
    expect(shouldEnterMutationReady('mutationReady', 'kc:ampoule', 'kc:ampoule')).toBe(false);
    expect(shouldEnterMutationReady('critical', 'kc:ampoule', null)).toBe(false);
  });
});

describe('relic mutation timeline', () => {
  const event = (fromLevel: number, toLevel: number, id = `${fromLevel}-${toLevel}`): CommunityMutationPresentation => ({
    id,
    from_level: fromLevel,
    to_level: toLevel,
    name: `Forme ${toLevel}`,
    threshold: 100,
    reward: 200,
    awakened: toLevel === 6,
    occurred_at: '2026-08-24T12:00:00.000Z',
  });

  it.each([
    [1, 2, 'ampoule', 'fiole'],
    [2, 3, 'fiole', 'flacon'],
    [3, 4, 'flacon', 'reacteur'],
    [4, 5, 'reacteur', 'reliquaire'],
  ] as const)('maps level %i → %i to %s → %s', (fromLevel, toLevel, fromContainer, toContainer) => {
    expect(resolveRelicMutationTransition(event(fromLevel, toLevel))).toMatchObject({
      fromLevel,
      toLevel,
      fromContainer,
      toContainer,
      durationMs: MUTATION_DURATION_MS,
    });
  });

  it('uses the final profile for a direct Ampoule → Cuve jump', () => {
    expect(resolveRelicMutationTransition(event(1, 5))).toMatchObject({
      fromContainer: 'ampoule',
      toContainer: 'reliquaire',
      toName: 'Cuve',
    });
  });

  it('uses the reduced timeline without changing the target form', () => {
    expect(resolveRelicMutationTransition(event(3, 4), true)).toMatchObject({
      fromContainer: 'flacon',
      toContainer: 'reacteur',
      durationMs: REDUCED_MUTATION_DURATION_MS,
      reducedMotion: true,
    });
  });

  it('rejects a backwards or empty mutation event', () => {
    expect(resolveRelicMutationTransition(event(3, 2))).toBeNull();
    expect(resolveRelicMutationTransition(event(2, 2))).toBeNull();
    expect(resolveRelicMutationTransition(event(1, 2, ''))).toBeNull();
  });

  it('starts only for a new explicit event and never from an initial progress mismatch', () => {
    const presented = new Set<string>();
    expect(shouldStartRelicMutation(null, null, presented)).toBe(false);
    expect(shouldStartRelicMutation(event(1, 2, 'unique'), null, presented)).toBe(true);
    expect(shouldStartRelicMutation(event(1, 2, 'unique'), 'other-active', presented)).toBe(false);
    presented.add('unique');
    expect(shouldStartRelicMutation(event(1, 2, 'unique'), null, presented)).toBe(false);
  });

  it('acknowledges an event once and refuses a replay of the same eventId', () => {
    const presented = new Set<string>();
    const mutation = event(1, 2, 'present-once');
    let acknowledgements = 0;
    if (shouldStartRelicMutation(mutation, null, presented)) {
      presented.add(mutation.id);
      acknowledgements += 1;
    }
    if (shouldStartRelicMutation(mutation, null, presented)) acknowledgements += 1;
    expect(acknowledgements).toBe(1);
  });

  it('queues contributions and blocks interactions while mutating', () => {
    expect(shouldQueueSupporterContribution('mutating')).toBe(true);
  });

  it.each([
    [0, 0, 300, 0],
    [150, 0, 300, .5],
    [300, 0, 300, 1],
    [500, 0, 300, 1],
    [-20, 0, 300, 0],
  ] as const)('clamps mutationSegment(%i, %i, %i)', (elapsed, start, end, expected) => {
    expect(mutationSegment(elapsed, start, end)).toBeCloseTo(expected);
  });

  it.each([
    [0, 'dimming'],
    [299, 'dimming'],
    [300, 'heartAcceleration'],
    [549, 'heartAcceleration'],
    [550, 'liquidAspiration'],
    [849, 'liquidAspiration'],
    [850, 'cracking'],
    [1_049, 'cracking'],
    [1_050, 'implosion'],
    [1_149, 'implosion'],
    [1_150, 'reconstruction'],
    [1_549, 'reconstruction'],
    [1_550, 'liquidReturn'],
    [1_899, 'liquidReturn'],
    [1_900, 'rootsDeployment'],
    [2_199, 'rootsDeployment'],
    [2_200, 'nameReveal'],
    [2_599, 'nameReveal'],
    [2_600, 'restoring'],
    [2_899, 'restoring'],
    [2_900, 'complete'],
  ] as const)('resolves %i ms to %s', (elapsed, stage) => {
    expect(relicMutationTimelineStage(elapsed)).toBe(stage);
  });

  it('clamps elapsed time to the active timeline', () => {
    expect(mutationElapsedMs(-1)).toBe(0);
    expect(mutationElapsedMs(.5)).toBe(MUTATION_DURATION_MS / 2);
    expect(mutationElapsedMs(2)).toBe(MUTATION_DURATION_MS);
    expect(mutationElapsedMs(1, true)).toBe(REDUCED_MUTATION_DURATION_MS);
  });

  it('uses the compact reduced-motion stages', () => {
    expect(relicMutationTimelineStage(0, true)).toBe('dimming');
    expect(relicMutationTimelineStage(180, true)).toBe('reconstruction');
    expect(relicMutationTimelineStage(520, true)).toBe('nameReveal');
    expect(relicMutationTimelineStage(680, true)).toBe('restoring');
    expect(relicMutationTimelineStage(800, true)).toBe('complete');
  });

  it('cleans the impact and finalization timers on interruption', () => {
    jest.useFakeTimers();
    const conclusion = jest.fn();
    const impact = jest.fn();
    const finish = jest.fn();
    const skip = jest.fn();
    const timers: RelicMutationTimers = {
      conclusion: setTimeout(conclusion, 2_180) as unknown as ReturnType<typeof setTimeout>,
      impact: setTimeout(impact, 1_100) as unknown as ReturnType<typeof setTimeout>,
      finish: setTimeout(finish, MUTATION_DURATION_MS) as unknown as ReturnType<typeof setTimeout>,
      skip: setTimeout(skip, 420) as unknown as ReturnType<typeof setTimeout>,
    };
    clearRelicMutationTimerHandles(timers);
    jest.advanceTimersByTime(MUTATION_DURATION_MS + 100);
    expect(conclusion).not.toHaveBeenCalled();
    expect(impact).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    expect(skip).not.toHaveBeenCalled();
    expect(timers).toEqual({ conclusion: null, impact: null, finish: null, skip: null });
    jest.useRealTimers();
  });
});
