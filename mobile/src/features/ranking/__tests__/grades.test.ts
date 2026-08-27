import { describe, expect, it } from '@jest/globals';

import {
  gradeTransition,
  isZeroRank,
  normalizeGradeState,
} from '../grades';

describe('rank without placement matches', () => {
  it('classifies a new player immediately at zero Frags', () => {
    const grade = normalizeGradeState(
      { classe: false, objectif_placements: 5, placements_restants: 5 },
      { frags: 0, settledCalls: 0 },
    );

    expect(grade).toMatchObject({
      classe: true,
      cle: 'bronze',
      libelle: 'Bronze',
      objectif_placements: 0,
      placements_restants: 0,
      progression: 0,
    });
    expect(isZeroRank(0)).toBe(true);
    expect(isZeroRank(1)).toBe(false);
  });

  it('derives the visible grade from Frags when a legacy payload hides it', () => {
    expect(normalizeGradeState({ classe: false }, { frags: 1000, settledCalls: 0 })).toMatchObject({
      classe: true,
      cle: 'argent',
      libelle: 'Argent',
    });
  });

  it('keeps the thirty-call condition for Mythique', () => {
    expect(normalizeGradeState({}, { frags: 1650, settledCalls: 29 }).cle).toBe('diamant');
    expect(normalizeGradeState({}, { frags: 1650, settledCalls: 30 }).cle).toBe('mythique');
  });

  it('classifies transitions only as promotion, demotion or stable', () => {
    const bronze = normalizeGradeState({}, { frags: 0, settledCalls: 0 });
    const silver = normalizeGradeState({}, { frags: 850, settledCalls: 1 });

    expect(gradeTransition(bronze, silver).kind).toBe('promotion');
    expect(gradeTransition(silver, bronze).kind).toBe('demotion');
    expect(gradeTransition(bronze, bronze).kind).toBe('stable');
  });
});
