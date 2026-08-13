/**
 * Tests du moteur de cotes. Aucune dépendance : node --test tests/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../web/js/core.js';

const proche = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

test('probaMap : deux équipes identiques donnent 50 %', () => {
  proche(core.probaMap(1500, 1500), 0.5);
});

test('probaMap : +400 Elo donne bien ~91 % (borné à 95 %)', () => {
  const p = core.probaMap(1900, 1500);
  assert.ok(p > 0.9 && p <= 0.95);
});

test('probaMap : reste bornée même sur un mismatch absurde', () => {
  assert.equal(core.probaMap(3000, 1000), 0.95);
  assert.equal(core.probaMap(1000, 3000), 0.05);
});

for (const format of [1, 3, 5]) {
  test(`distributionScores BO${format} : les probabilités somment à 1`, () => {
    for (const p of [0.2, 0.35, 0.5, 0.66, 0.9]) {
      const total = core.distributionScores(p, format).reduce((t, s) => t + s.proba, 0);
      proche(total, 1, 1e-12);
    }
  });

  test(`distributionScores BO${format} : aucun score impossible`, () => {
    const attendu = Math.ceil(format / 2);
    for (const s of core.distributionScores(0.5, format)) {
      assert.equal(Math.max(s.scoreA, s.scoreB), attendu);
      assert.notEqual(s.scoreA, s.scoreB);
    }
  });
}

test('probaSerie : le format long favorise le plus fort', () => {
  const p = 0.6;
  const bo1 = core.probaSerie(p, 1);
  const bo3 = core.probaSerie(p, 3);
  const bo5 = core.probaSerie(p, 5);
  assert.ok(bo1 < bo3 && bo3 < bo5, `${bo1} < ${bo3} < ${bo5}`);
});

test('probaSerie : symétrie parfaite à 50 %', () => {
  for (const f of [1, 3, 5]) proche(core.probaSerie(0.5, f), 0.5, 1e-12);
});

test('coteDepuisProba : la marge est bien prélevée', () => {
  // Sans marge, une proba de 50 % vaut une cote de 2.00.
  proche(core.coteDepuisProba(0.5, 0), 2);
  // Avec 6 % de marge, la cote servie est plus basse.
  assert.ok(core.coteDepuisProba(0.5) < 2);
});

test('marché vainqueur : la somme des probas implicites vaut 1 + marge', () => {
  const match = { format: 3, elo_a: 1600, elo_b: 1500, equipe_a: 'A', equipe_b: 'B' };
  const marche = core.marchesDuMatch(match).find((m) => m.cle === 'vainqueur');
  const somme = marche.choix.reduce((t, c) => t + core.probaImplicite(c.cote), 0);
  assert.ok(Math.abs(somme - (1 + core.MARGE)) < 0.02, `overround = ${somme}`);
});

test('marchés : un BO1 ne propose pas de marché "nombre de maps"', () => {
  const match = { format: 1, elo_a: 1500, elo_b: 1500, equipe_a: 'A', equipe_b: 'B' };
  const cles = core.marchesDuMatch(match).map((m) => m.cle);
  assert.deepEqual(cles, ['vainqueur', 'score_exact']);
});

test('marchés : la meilleure équipe a toujours la cote la plus basse', () => {
  const match = { format: 3, elo_a: 1750, elo_b: 1400, equipe_a: 'Fort', equipe_b: 'Faible' };
  const v = core.marchesDuMatch(match).find((m) => m.cle === 'vainqueur');
  assert.ok(v.choix[0].cote < v.choix[1].cote);
});

test('pariGagnant : vainqueur', () => {
  assert.equal(core.pariGagnant('vainqueur', 'a', 2, 1), true);
  assert.equal(core.pariGagnant('vainqueur', 'b', 2, 1), false);
  assert.equal(core.pariGagnant('vainqueur', 'b', 1, 2), true);
});

test('pariGagnant : score exact', () => {
  assert.equal(core.pariGagnant('score_exact', '2-1', 2, 1), true);
  assert.equal(core.pariGagnant('score_exact', '2-0', 2, 1), false);
});

test('pariGagnant : nombre de maps', () => {
  // BO3 fini 2-0 : 2 maps jouées -> "moins de 2.5" gagne
  assert.equal(core.pariGagnant('total_maps', 'under', 2, 0), true);
  assert.equal(core.pariGagnant('total_maps', 'over', 2, 0), false);
  // BO3 fini 2-1 : 3 maps -> "plus de 2.5" gagne
  assert.equal(core.pariGagnant('total_maps', 'over', 2, 1), true);
  assert.equal(core.pariGagnant('total_maps', 'under', 2, 1), false);
  // BO5 fini 3-1 : 4 maps -> "plus de 3.5" gagne
  assert.equal(core.pariGagnant('total_maps', 'over', 3, 1), true);
  // BO5 fini 3-0 : 3 maps -> "moins de 3.5" gagne
  assert.equal(core.pariGagnant('total_maps', 'under', 3, 0), true);
});

test('gainPari : la mise est multipliée par la cote figée', () => {
  assert.equal(core.gainPari(100, 2.5, true), 250);
  assert.equal(core.gainPari(100, 2.5, false), 0);
});

test('majElo : le vainqueur monte, le perdant descend, somme conservée', () => {
  const { elo_a, elo_b } = core.majElo(1500, 1500, 2, 0);
  assert.ok(elo_a > 1500 && elo_b < 1500);
  assert.equal(elo_a + elo_b, 3000);
});

test('majElo : battre plus fort rapporte plus que battre plus faible', () => {
  const contreFort = core.majElo(1500, 1800, 2, 0).elo_a - 1500;
  const contreFaible = core.majElo(1500, 1200, 2, 0).elo_a - 1500;
  assert.ok(contreFort > contreFaible);
});

test('majElo : une victoire serrée déplace moins qu’un sweep', () => {
  const sweep = core.majElo(1500, 1500, 2, 0).elo_a;
  const serre = core.majElo(1500, 1500, 2, 1).elo_a;
  assert.ok(sweep > serre);
});

test('genererCodeLigue : 6 caractères sans ambiguïté', () => {
  for (let i = 0; i < 200; i++) {
    const c = core.genererCodeLigue();
    assert.match(c, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  }
});

test('roi : calcul du retour sur mise', () => {
  proche(core.roi(1000, 1200), 20);
  proche(core.roi(1000, 800), -20);
  proche(core.roi(0, 0), 0);
});

test('espérance du joueur : la marge rend le jeu perdant à long terme', () => {
  // Un joueur qui mise sur toutes les issues d'un marché perd exactement la marge.
  const match = { format: 3, elo_a: 1620, elo_b: 1480, equipe_a: 'A', equipe_b: 'B' };
  const p = core.probaMap(1620, 1480);
  const marche = core.marchesDuMatch(match).find((m) => m.cle === 'score_exact');
  const dist = core.distributionScores(p, 3);
  // On mise 1 sur chacune des N issues : la dépense est de N, le retour espéré
  // vaut la somme des (proba x cote). Le rapport doit valoir 1 / (1 + marge).
  let retourEspere = 0;
  for (const choix of marche.choix) {
    const proba = dist.find((s) => `${s.scoreA}-${s.scoreB}` === choix.cle).proba;
    retourEspere += proba * choix.cote;
  }
  const rendement = retourEspere / marche.choix.length;
  assert.ok(rendement < 1, `rendement ${rendement} devrait être < 1`);
  assert.ok(
    Math.abs(rendement - 1 / (1 + core.MARGE)) < 0.02,
    `rendement ${rendement} devrait avoisiner ${1 / (1 + core.MARGE)}`
  );
});
