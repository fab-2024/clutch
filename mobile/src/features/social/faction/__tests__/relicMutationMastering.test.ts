/// <reference types="jest" />

import {
  REDUCED_RELIC_MUTATION_CONCLUSION_START_MS,
  REDUCED_RELIC_MUTATION_SKIP_SETTLE_MS,
  REDUCED_RELIC_MUTATION_SKIP_UNLOCK_MS,
  RELIC_MUTATION_CONCLUSION_START_MS,
  RELIC_MUTATION_SKIP_SETTLE_MS,
  RELIC_MUTATION_SKIP_UNLOCK_MS,
  relicMutationMasteringTimeline,
  relicMutationNarrativePhase,
  relicSceneVisibleAtOffset,
  resolveRelicMutationConclusion,
  shouldRunRelicScene,
} from '../relicMutationMastering';
import type { CommunityMutationPresentation } from '../types';

function event(toLevel: number, reward = 500): CommunityMutationPresentation {
  return {
    id: `mutation-${toLevel}`,
    from_level: Math.max(1, toLevel - 1),
    to_level: toLevel,
    name: `Forme ${toLevel}`,
    threshold: 2_000,
    reward,
    awakened: toLevel === 6,
    occurred_at: '2026-08-29T08:00:00.000Z',
  };
}

describe('relic mutation mastering', () => {
  it('keeps the standard skip and conclusion inside the existing 2.9 second ceremony', () => {
    expect(relicMutationMasteringTimeline(false)).toMatchObject({
      conclusionStartMs: RELIC_MUTATION_CONCLUSION_START_MS,
      skipSettleMs: RELIC_MUTATION_SKIP_SETTLE_MS,
      skipUnlockMs: RELIC_MUTATION_SKIP_UNLOCK_MS,
    });
    expect(RELIC_MUTATION_SKIP_UNLOCK_MS).toBeLessThan(RELIC_MUTATION_CONCLUSION_START_MS);
    expect(RELIC_MUTATION_CONCLUSION_START_MS + 150).toBeLessThan(2_900);
  });

  it('keeps a compact readable conclusion in reduceMotion', () => {
    expect(relicMutationMasteringTimeline(true)).toMatchObject({
      conclusionStartMs: REDUCED_RELIC_MUTATION_CONCLUSION_START_MS,
      skipSettleMs: REDUCED_RELIC_MUTATION_SKIP_SETTLE_MS,
      skipUnlockMs: REDUCED_RELIC_MUTATION_SKIP_UNLOCK_MS,
    });
    expect(REDUCED_RELIC_MUTATION_CONCLUSION_START_MS).toBeLessThan(800);
  });

  it.each([
    [0, 'tension'],
    [849, 'tension'],
    [850, 'rupture'],
    [1_299, 'rupture'],
    [1_300, 'reconstruction'],
    [2_179, 'reconstruction'],
    [2_180, 'conclusion'],
  ] as const)('labels %i ms as %s', (elapsedMs, phase) => {
    expect(relicMutationNarrativePhase(elapsedMs)).toBe(phase);
  });

  it('removes the rupture beat from reduceMotion while preserving the story', () => {
    expect(relicMutationNarrativePhase(0, true)).toBe('tension');
    expect(relicMutationNarrativePhase(180, true)).toBe('reconstruction');
    expect(relicMutationNarrativePhase(500, true)).toBe('conclusion');
  });

  it.each([
    [2, 'PREMIER SIGNAL'],
    [3, 'RÉSEAU VIVANT'],
    [4, 'PRESSION COLLECTIVE'],
    [5, 'ARMATURE SCELLÉE'],
    [6, 'ÉVEIL COLLECTIF'],
  ] as const)('gives threshold %i its own restrained signature', (level, eyebrow) => {
    expect(resolveRelicMutationConclusion(event(level)).signature.eyebrow).toBe(eyebrow);
  });

  it('makes reward and next objective explicit', () => {
    const conclusion = resolveRelicMutationConclusion(event(4, 500));
    expect(conclusion.formCode).toBe('IV');
    expect(conclusion.formName).toBe('BONBONNE');
    expect(conclusion.rewardValue).toContain('500');
    expect(conclusion.nextObjective).toContain('CUVE');
    expect(conclusion.nextObjective).toContain('5');
    expect(conclusion.accessibilityLabel).toContain('Prochain objectif');
  });

  it('ends on a terminal objective for the awakened heart', () => {
    const conclusion = resolveRelicMutationConclusion(event(6, 1_500));
    expect(conclusion.formCode).toBe('∞');
    expect(conclusion.nextObjective).toBe('FORME TERMINALE ATTEINTE');
  });
});

describe('relic scene budget', () => {
  it.each([
    [true, true, true, true],
    [false, true, true, false],
    [true, false, true, false],
    [true, true, false, false],
  ] as const)('focus=%s app=%s visible=%s → %s', (focused, appActive, visible, expected) => {
    expect(shouldRunRelicScene(focused, appActive, visible)).toBe(expected);
  });

  it('keeps the loop alive until the hero has left the viewport', () => {
    expect(relicSceneVisibleAtOffset(480, 480)).toBe(true);
    expect(relicSceneVisibleAtOffset(504, 480)).toBe(true);
    expect(relicSceneVisibleAtOffset(505, 480)).toBe(false);
  });
});
