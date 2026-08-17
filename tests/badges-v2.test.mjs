import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BADGES_V2,
  NB_BADGES_PUBLICS,
  SECRETS,
  evaluerBadgesV2,
  rareteBadgeV2,
  xpDuBadgeV2,
} from '../web/js/badges-v2.js';

test('badges V2 : le catalogue fondateur contient 30 badges dont 25 publics', () => {
  assert.equal(BADGES_V2.length, 30);
  assert.equal(NB_BADGES_PUBLICS, 25);
  assert.equal(SECRETS.length, 5);
  assert.equal(new Set(BADGES_V2.map((b) => b.cle)).size, 30);
});

test('badges V2 : les cinq secrets sont légendaires et ne publient aucune condition', () => {
  for (const b of SECRETS) {
    assert.equal(b.secret, true);
    assert.equal(b.rarete, 'legendaire');
    assert.equal('test' in b, false);
    assert.equal('condition' in b, false);
  }
});

test('badges V2 : les premiers accomplissements se débloquent depuis le récapitulatif', () => {
  const badges = evaluerBadgesV2({
    paris: 1,
    gagnes: 1,
    a_equipe_favorite: true,
    ligues_rejointes: 1,
  });
  const cles = badges.filter((b) => b.obtenu).map((b) => b.cle);
  assert.ok(cles.includes('selectionneur'));
  assert.ok(cles.includes('premier_frag'));
  assert.ok(cles.includes('sous_les_couleurs'));
  assert.ok(cles.includes('premier_cercle'));
  assert.ok(cles.includes('petit_arsenal'));
});

test('badges V2 : un secret ne se débloque que par la liste opaque de Supabase', () => {
  const sans = evaluerBadgesV2({ cote_max_gagnee: 99 });
  assert.equal(sans.find((b) => b.cle === 'david').obtenu, false);

  const avec = evaluerBadgesV2({ secrets_obtenus: ['david'] });
  assert.equal(avec.find((b) => b.cle === 'david').obtenu, true);
});

test('badges V2 : la hiérarchie XP suit la rareté', () => {
  const commun = BADGES_V2.find((b) => rareteBadgeV2(b) === 'commun');
  const rare = BADGES_V2.find((b) => rareteBadgeV2(b) === 'rare');
  const epique = BADGES_V2.find((b) => rareteBadgeV2(b) === 'epique');
  const legendaire = BADGES_V2.find((b) => rareteBadgeV2(b) === 'legendaire');
  assert.ok(xpDuBadgeV2(commun) < xpDuBadgeV2(rare));
  assert.ok(xpDuBadgeV2(rare) < xpDuBadgeV2(epique));
  assert.ok(xpDuBadgeV2(epique) < xpDuBadgeV2(legendaire));
});
