import assert from 'node:assert/strict';
import test from 'node:test';

import {
  equipeChoisie,
  equipeGagnante,
  mouvementRang,
  presentationResultat,
  xpResultat,
} from '../web/js/result-reveal.js';

test('un résultat donne uniquement l’XP directement attribuable au prono', () => {
  assert.equal(xpResultat('gagne'), 50);
  assert.equal(xpResultat('perdu'), 30);
  assert.equal(xpResultat('en_cours'), 0);
});

test('le mouvement de rang distingue montée, stabilité et baisse', () => {
  assert.deepEqual(mouvementRang(7, 4), {
    disponible: true,
    delta: 3,
    monte: true,
    descend: false,
    stable: false,
  });
  assert.equal(mouvementRang(4, 4).stable, true);
  assert.equal(mouvementRang(4, 6).descend, true);
  assert.equal(mouvementRang(null, null).disponible, false);
});

test('la présentation victoire reprend la signature GRIFF et les données réelles', () => {
  const resultat = {
    statut: 'gagne',
    choix: 'a',
    equipe_a: 'Vitality',
    equipe_b: 'G2',
    score_a: 2,
    score_b: 1,
    delta_frags: 56,
    rang_avant: 7,
    rang_apres: 4,
  };
  const p = presentationResultat(resultat);
  assert.equal(p.headline, 'TU L’AVAIS VU.');
  assert.equal(p.deltaFrags, 56);
  assert.equal(p.xp, 50);
  assert.equal(p.rang.monte, true);
  assert.equal(equipeChoisie(resultat), 'Vitality');
  assert.equal(equipeGagnante(resultat), 'Vitality');
});

test('la défaite reste un moment de progression et ne masque pas le vainqueur', () => {
  const resultat = {
    statut: 'perdu',
    choix: 'a',
    equipe_a: 'Vitality',
    equipe_b: 'G2',
    score_a: 0,
    score_b: 2,
    delta_frags: -34,
    rang_avant: 4,
    rang_apres: 6,
  };
  const p = presentationResultat(resultat);
  assert.equal(p.headline, 'CELLE-LÀ T’A ÉCHAPPÉ.');
  assert.equal(p.deltaFrags, -34);
  assert.equal(p.xp, 30);
  assert.equal(p.rang.descend, true);
  assert.equal(equipeGagnante(resultat), 'G2');
});

test('un statut non réglé ne peut pas produire de reveal', () => {
  assert.throws(() => presentationResultat({ statut: 'en_cours' }), /Statut de résultat invalide/);
});
