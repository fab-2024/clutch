import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPresentation } from '../server/public-data.mjs';

test('public match presentation stays action-oriented', () => {
  const card = publicPresentation('match', {
    id: 'm-test',
    jeu: 'cs2',
    format: 3,
    debut: '2026-08-20T18:00:00Z',
    statut: 'a_venir',
    equipe_a: 'Team Vitality',
    equipe_b: 'G2 Esports',
    tag_a: 'VIT',
    tag_b: 'G2',
    evenement: 'IEM Cologne',
    score_a: null,
    score_b: null,
  });

  assert.equal(card.kind, 'match');
  assert.equal(card.title, 'VIT vs G2 · IEM Cologne | Clutch');
  assert.equal(card.cta, 'Prendre position');
  assert.equal(card.spaPath, '/#/matchs/m-test');
  assert.match(card.description, /Team Vitality vs G2 Esports/);
});

test('public challenge presentation exposes only the invitation story', () => {
  const card = publicPresentation('challenge', {
    token: 'abc123',
    statut: 'en_attente',
    jeu: 'cs2',
    evenement: 'IEM Cologne',
    debut: '2026-08-20T18:00:00Z',
    equipe_a: 'Team Vitality',
    equipe_b: 'G2 Esports',
    tag_a: 'VIT',
    tag_b: 'G2',
    createur_pseudo: 'FabTheTap',
    createur_choix: 'a',
    createur_conviction: 'fort',
  });

  assert.equal(card.kind, 'challenge');
  assert.equal(card.headline, 'FABTHETAP T’A DÉFIÉ.');
  assert.equal(card.chosenTag, 'VIT');
  assert.equal(card.conviction, 'Fort');
  assert.equal(card.cta, 'Répondre au défi');
  assert.equal(card.spaPath, '/#/defis/abc123');
  assert.match(card.description, /FabTheTap a pris VIT · Fort/);
});

test('settled match presentation switches to result copy', () => {
  const card = publicPresentation('match', {
    id: 'm-final',
    jeu: 'valorant',
    format: 3,
    debut: '2026-08-17T18:00:00Z',
    statut: 'termine',
    equipe_a: 'A',
    equipe_b: 'B',
    tag_a: 'AAA',
    tag_b: 'BBB',
    evenement: 'Finale',
    score_a: 2,
    score_b: 1,
  });

  assert.equal(card.headline, 'LE VERDICT EST TOMBÉ.');
  assert.equal(card.eyebrow, 'RÉSULTAT');
  assert.equal(card.cta, 'Voir le résultat');
  assert.match(card.description, /AAA 2 — 1 BBB/);
});
