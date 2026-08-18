import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONVICTIONS,
  convictionInfo,
  kEffectifConviction,
  projectionConviction,
  projectionsConviction,
} from '../web/js/prediction.js';

test('les trois convictions sont stables et Normal reste le barème Economy V2', () => {
  assert.equal(CONVICTIONS.faible.multiplicateur, 0.75);
  assert.equal(CONVICTIONS.normal.multiplicateur, 1);
  assert.equal(CONVICTIONS.fort.multiplicateur, 1.5);
  assert.equal(kEffectifConviction(40, 'faible'), 30);
  assert.equal(kEffectifConviction(40, 'normal'), 40);
  assert.equal(kEffectifConviction(40, 'fort'), 60);
  assert.equal(kEffectifConviction(60, 'faible'), 45);
  assert.equal(kEffectifConviction(60, 'fort'), 90);
});

test('la conviction module le risque sans engager de Frags', () => {
  assert.deepEqual(projectionConviction(0.35, { k: 40, conviction: 'faible' }), {
    conviction: 'faible',
    multiplicateur: 0.75,
    proba_scoring: 0.35,
    k_base: 40,
    k_effectif: 30,
    gain: 20,
    perte: -11,
  });

  assert.deepEqual(projectionConviction(0.35, { k: 40, conviction: 'normal' }), {
    conviction: 'normal',
    multiplicateur: 1,
    proba_scoring: 0.35,
    k_base: 40,
    k_effectif: 40,
    gain: 26,
    perte: -14,
  });

  assert.deepEqual(projectionConviction(0.35, { k: 40, conviction: 'fort' }), {
    conviction: 'fort',
    multiplicateur: 1.5,
    proba_scoring: 0.35,
    k_base: 40,
    k_effectif: 60,
    gain: 39,
    perte: -21,
  });
});

test('les placements K=60 deviennent K=45/60/90 selon la conviction', () => {
  const p = projectionsConviction(0.35, { k: 60 });
  assert.equal(p.faible.k_effectif, 45);
  assert.equal(p.normal.k_effectif, 60);
  assert.equal(p.fort.k_effectif, 90);
  assert.equal(p.fort.gain, 59);
  assert.equal(p.fort.perte, -32);
});

test('une conviction inconnue est refusée au lieu d’être rétrogradée silencieusement', () => {
  assert.throws(() => convictionInfo('all-in'), /Conviction invalide/);
});
