import test from 'node:test';
import assert from 'node:assert/strict';
import { xpDetailleeV2 } from '../web/js/badges-v2.js';

test('completed Friend Quest XP is a permanent progression source', () => {
  const withoutQuest = xpDetailleeV2({ badges: [], recap: {} });
  const withQuest = xpDetailleeV2({ badges: [], recap: { xp_quetes: 260 } });
  assert.equal(withQuest.total - withoutQuest.total, 260);
  assert.deepEqual(withQuest.sources.find((s) => s.cle === 'quetes'), {
    cle: 'quetes',
    libelle: 'Missions entre amis',
    xp: 260,
    detail: 'XP social permanent',
  });
});

test('Friend Quest XP never changes badge acquisition by itself', () => {
  const result = xpDetailleeV2({ badges: [], recap: { xp_quetes: 140 } });
  assert.equal(result.total, 140);
  assert.equal(result.sources.length, 1);
});
