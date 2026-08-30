import test from 'node:test';
import assert from 'node:assert/strict';
import { signatureDepuisRecap, traitsDepuisProfil, signatureCourte } from '../web/js/profile-identity.js';

test('Oracle requires enough volume and elite precision', () => {
  assert.equal(signatureDepuisRecap({ paris: 20, gagnes: 17, precision_pct: 85 }).cle, 'oracle');
});

test('Upset Hunter is driven by repeated outsider wins', () => {
  assert.equal(signatureDepuisRecap({ paris: 12, gagnes: 7, precision_pct: 58, outsiders_250_gagnes: 3 }).cle, 'upset');
});

test('Streaker detects a long winning streak', () => {
  assert.equal(signatureDepuisRecap({ paris: 12, gagnes: 8, precision_pct: 66, plus_longue_serie: 6 }).cle, 'streaker');
});

test('Safe Hands rewards consistent precision below Oracle threshold', () => {
  assert.equal(signatureDepuisRecap({ paris: 20, gagnes: 15, precision_pct: 75 }).cle, 'safe');
});

test('Contrarian detects a low-probability winning call', () => {
  assert.equal(signatureDepuisRecap({ paris: 8, gagnes: 4, precision_pct: 50, proba_min_gagnee: .34 }).cle, 'contrarian');
});

test('Secondary traits expose game and conviction without replacing archetype', () => {
  const traits = traitsDepuisProfil({
    recap: { paris: 30, precision_pct: 76, outsiders_250_gagnes: 2 },
    meilleur_jeu: { jeu: 'rocket_league', pronostics: 18, precision_pct: 78 },
    conviction_preferee: { conviction: 'fort', pronostics: 12 },
    serie_actuelle: 2,
  });
  assert.deepEqual(traits.map((t) => t.cle), ['jeu-rocket_league', 'strong-conviction', 'upsets']);
});

test('Profile signature combines archetype, game and conviction', () => {
  assert.equal(signatureCourte({
    recap: { paris: 20, gagnes: 17, precision_pct: 85 },
    meilleur_jeu: { jeu: 'rocket_league' },
    conviction_preferee: { conviction: 'fort' },
  }), 'Oracle · RL · FORT');
});
