import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMES_COMMUNAUTE, palierFaction } from '../web/js/community-progression.js';

test('la progression communautaire conserve les sept formes officielles', () => {
  assert.deepEqual(
    FORMES_COMMUNAUTE.map((f) => f.nom),
    ['Fiole', 'Flacon', 'Bombonne', 'Calice', 'Alambic', 'Cornue', 'Océan']
  );
});

test('les seuils supporters restent 10 / 50 / 100 / 500 / 1000 / 5000', () => {
  assert.deepEqual(
    FORMES_COMMUNAUTE.slice(1).map((f) => f.seuil),
    [10, 50, 100, 500, 1000, 5000]
  );
});

test('les récompenses de mutation sont des Volts et suivent le catalogue Economy V2', () => {
  assert.deepEqual(
    FORMES_COMMUNAUTE.slice(1).map((f) => f.recompense),
    [200, 300, 500, 750, 1000, 1500]
  );
});

test('la Fiole est le niveau I et 10 supporters débloquent le Flacon', () => {
  const debut = palierFaction(1, 1);
  assert.equal(debut.niveau, 1);
  assert.equal(debut.nom, 'Fiole');
  assert.equal(debut.objectif, 10);
  assert.equal(debut.prochainNom, 'Flacon');

  const mutation = palierFaction(10, 2);
  assert.equal(mutation.niveau, 2);
  assert.equal(mutation.nom, 'Flacon');
});

test('un niveau déjà atteint ne régresse pas si des supporters partent', () => {
  const etat = palierFaction(80, 4);
  assert.equal(etat.niveau, 4);
  assert.equal(etat.nom, 'Calice');
  assert.equal(etat.objectif, 500);
});
