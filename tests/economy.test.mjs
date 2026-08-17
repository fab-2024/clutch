import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FRAGS_INITIAL,
  FRAGS_K,
  FRAGS_K_PLACEMENTS,
  bornerProbaFrags,
  deltaFrags,
  kFrags,
  projectionFrags,
  softResetFrags,
} from '../web/js/economy.js';

test('barème K=40 : favoris, 50/50 et outsiders', () => {
  const cas = [
    [0.85, 6, -34],
    [0.75, 10, -30],
    [0.65, 14, -26],
    [0.50, 20, -20],
    [0.35, 26, -14],
    [0.25, 30, -10],
    [0.15, 34, -6],
  ];

  for (const [p, gain, perte] of cas) {
    assert.equal(deltaFrags(p, true, { k: FRAGS_K }), gain);
    assert.equal(deltaFrags(p, false, { k: FRAGS_K }), perte);
  }
});

test('les probabilités de scoring sont bornées à 15–85 %', () => {
  assert.equal(bornerProbaFrags(0.01), 0.15);
  assert.equal(bornerProbaFrags(0.15), 0.15);
  assert.equal(bornerProbaFrags(0.85), 0.85);
  assert.equal(bornerProbaFrags(0.99), 0.85);
});

test('les cinq premiers pronostics sont des placements à K=60', () => {
  assert.equal(kFrags(0), FRAGS_K_PLACEMENTS);
  assert.equal(kFrags(4), FRAGS_K_PLACEMENTS);
  assert.equal(kFrags(5), FRAGS_K);
  assert.equal(kFrags(99), FRAGS_K);
});

test('projection expose le risque avant validation', () => {
  assert.deepEqual(projectionFrags(0.35, { nbPronosticsClasses: 5 }), {
    proba: 0.35,
    proba_scoring: 0.35,
    k: 40,
    gain: 26,
    perte: -14,
  });
});

test('l’espérance est nulle si la probabilité de référence est calibrée', () => {
  for (const p of [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85]) {
    const gainExact = FRAGS_K * (1 - p);
    const perteExacte = -FRAGS_K * p;
    const esperance = p * gainExact + (1 - p) * perteExacte;
    assert.ok(Math.abs(esperance) < 1e-10);
  }
});

test('soft reset conserve 40 % de l’écart à 1000', () => {
  assert.equal(FRAGS_INITIAL, 1000);
  assert.equal(softResetFrags(2000), 1400);
  assert.equal(softResetFrags(1500), 1200);
  assert.equal(softResetFrags(800), 920);
  assert.equal(softResetFrags(1000), 1000);
});
