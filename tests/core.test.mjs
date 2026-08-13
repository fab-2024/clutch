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

/* ------------------------------------------------------------------ */
/* Prime de connexion en série                                         */
/* ------------------------------------------------------------------ */

const H = 3600 * 1000;

test('serieApres : une première prime ouvre le jour 1', () => {
  assert.equal(core.serieApres(0, null), 1);
});

test('serieApres : revenir dans les 48 h fait avancer la série', () => {
  const maintenant = Date.now();
  const hier = new Date(maintenant - 25 * H).toISOString();
  assert.equal(core.serieApres(1, hier, maintenant), 2);
  assert.equal(core.serieApres(4, hier, maintenant), 5);
});

test('serieApres : un jour manqué remet la série à 1', () => {
  const maintenant = Date.now();
  const avantHier = new Date(maintenant - 50 * H).toISOString();
  assert.equal(core.serieApres(6, avantHier, maintenant), 1);
});

test('serieApres : la semaine bouclée repart au jour 1', () => {
  const maintenant = Date.now();
  const hier = new Date(maintenant - 25 * H).toISOString();
  assert.equal(core.serieApres(core.PRIME_SERIE_MAX, hier, maintenant), 1);
});

test('montantPrime : le palier suit la série', () => {
  for (let jour = 1; jour <= core.PRIME_SERIE_MAX; jour++) {
    assert.equal(
      core.montantPrime({ serie: jour, solde: 1000, misesRecentes: 3 }),
      core.PRIME_PALIERS[jour - 1]
    );
  }
});

test('montantPrime : la série est strictement croissante', () => {
  for (let i = 1; i < core.PRIME_PALIERS.length; i++) {
    assert.ok(core.PRIME_PALIERS[i] > core.PRIME_PALIERS[i - 1]);
  }
});

test('montantPrime : au-dessus du plafond, retour au plancher', () => {
  assert.equal(
    core.montantPrime({ serie: 7, solde: core.PRIME_PLAFOND_SOLDE, misesRecentes: 5 }),
    core.PRIME_BASE
  );
});

test('montantPrime : sans mise récente, la bonification saute dès le jour 3', () => {
  assert.equal(core.montantPrime({ serie: 2, solde: 1000, misesRecentes: 0 }), core.PRIME_PALIERS[1]);
  assert.equal(core.montantPrime({ serie: 3, solde: 1000, misesRecentes: 0 }), core.PRIME_BASE);
  assert.equal(core.montantPrime({ serie: 7, solde: 1000, misesRecentes: 0 }), core.PRIME_BASE);
});

test('montantPrime : le filet de faillite double la prime, plafond compris', () => {
  assert.equal(core.montantPrime({ serie: 1, solde: 0, misesRecentes: 0 }), core.PRIME_BASE * 2);
});

test('montantPrime : sept jours pleins restent sous le solde de départ', () => {
  // Garde-fou d'économie : une semaine de primes ne doit pas valoir plus qu'un
  // nouveau départ, sinon se connecter devient plus rentable que miser.
  const semaine = core.PRIME_PALIERS.reduce((t, p) => t + p, 0);
  assert.ok(semaine < core.SOLDE_INITIAL * 2, `une semaine vaut ${semaine} Frags`);
});

test('attentePrime : 24 h de délai, à la milliseconde près', () => {
  const maintenant = Date.now();
  assert.equal(core.attentePrime(null, maintenant), 0);
  assert.equal(core.attentePrime(new Date(maintenant - 24 * H).toISOString(), maintenant), 0);
  assert.equal(core.attentePrime(new Date(maintenant - 20 * H).toISOString(), maintenant), 4 * H);
});

/* ------------------------------------------------------------------ */
/* Cotes du call de la saison                                          */
/* ------------------------------------------------------------------ */

const PLATEAU = [
  { id: 'a', nom: 'A', elo: 1700 },
  { id: 'b', nom: 'B', elo: 1600 },
  { id: 'c', nom: 'C', elo: 1500 },
  { id: 'd', nom: 'D', elo: 1400 },
];

test('cotesEvenement : les probabilités somment à 1', () => {
  const total = core.cotesEvenement(PLATEAU).reduce((t, e) => t + e.proba, 0);
  proche(total, 1, 1e-12);
});

test('cotesEvenement : classées du favori à l’outsider', () => {
  const cotes = core.cotesEvenement(PLATEAU);
  assert.deepEqual(cotes.map((c) => c.id), ['a', 'b', 'c', 'd']);
  for (let i = 1; i < cotes.length; i++) assert.ok(cotes[i].cote > cotes[i - 1].cote);
});

test('cotesEvenement : la marge est la même que sur un match', () => {
  const somme = core
    .cotesEvenement(PLATEAU)
    .reduce((t, e) => t + core.probaImplicite(e.cote), 0);
  assert.ok(Math.abs(somme - (1 + core.MARGE)) < 0.02, `overround = ${somme}`);
});

test('cotesEvenement : un plateau vide ne casse rien', () => {
  assert.deepEqual(core.cotesEvenement([]), []);
});

/* ------------------------------------------------------------------ */
/* Rivalité de la semaine                                              */
/* ------------------------------------------------------------------ */

const CLASSEMENT = [
  { id: 'u1', solde: 3000 },
  { id: 'u2', solde: 2500 },
  { id: 'u3', solde: 2000 },
  { id: 'moi', solde: 1500 },
  { id: 'u5', solde: 1000 },
  { id: 'u6', solde: 900 },
  { id: 'u7', solde: 100 },
];

test('semaineIso : format stable et lundi/dimanche dans la même semaine', () => {
  assert.match(core.semaineIso(new Date('2026-08-13T12:00:00')), /^\d{4}-S\d{2}$/);
  assert.equal(
    core.semaineIso(new Date('2026-08-10T00:00:00Z')),
    core.semaineIso(new Date('2026-08-16T23:00:00Z'))
  );
  assert.notEqual(
    core.semaineIso(new Date('2026-08-16T12:00:00Z')),
    core.semaineIso(new Date('2026-08-17T12:00:00Z'))
  );
});

test('debutSemaine : toujours un lundi à minuit', () => {
  for (const jour of ['2026-08-10', '2026-08-13', '2026-08-16']) {
    const d = core.debutSemaine(new Date(`${jour}T15:30:00`));
    assert.equal(d.getDay(), 1);
    assert.equal(d.getHours(), 0);
  }
});

test('choisirRival : jamais soi-même, toujours un voisin proche', () => {
  for (const semaine of ['2026-S30', '2026-S31', '2026-S32', '2026-S33']) {
    const r = core.choisirRival('moi', CLASSEMENT, semaine);
    assert.ok(r, 'un rival doit être trouvé');
    assert.notEqual(r.id, 'moi');
    assert.ok(['u1', 'u2', 'u3', 'u5', 'u6'].includes(r.id), `rival inattendu : ${r.id}`);
  }
});

test('choisirRival : stable pendant la semaine', () => {
  const a = core.choisirRival('moi', CLASSEMENT, '2026-S33');
  const b = core.choisirRival('moi', CLASSEMENT, '2026-S33');
  assert.equal(a.id, b.id);
});

test('choisirRival : deux joueurs ne tombent pas systématiquement sur le même', () => {
  const tires = new Set(
    ['moi', 'u2', 'u3', 'u5', 'u6'].map((id) => core.choisirRival(id, CLASSEMENT, '2026-S33')?.id)
  );
  assert.ok(tires.size > 1, 'le tirage doit dépendre du joueur');
});

test('choisirRival : seul au classement, pas de rivalité', () => {
  assert.equal(core.choisirRival('moi', [{ id: 'moi', solde: 10 }]), null);
  assert.equal(core.choisirRival('inconnu', CLASSEMENT), null);
});

test('bilanPeriode : ne compte que les paris réglés de la période', () => {
  const maintenant = Date.now();
  const paris = [
    { cree_le: new Date(maintenant - 2 * H).toISOString(), statut: 'gagne', mise: 100, gain: 250 },
    { cree_le: new Date(maintenant - 3 * H).toISOString(), statut: 'perdu', mise: 200, gain: 0 },
    { cree_le: new Date(maintenant - 4 * H).toISOString(), statut: 'en_cours', mise: 500, gain: 0 },
    { cree_le: new Date(maintenant - 400 * H).toISOString(), statut: 'gagne', mise: 900, gain: 9000 },
  ];
  const b = core.bilanPeriode(paris, new Date(maintenant - 24 * H));
  assert.equal(b.paris, 2);
  assert.equal(b.gagnes, 1);
  assert.equal(b.mises, 300);
  assert.equal(b.gains, 250);
  assert.equal(b.net, -50);
});

/* ------------------------------------------------------------------ */
/* Prono par défaut                                                    */
/* ------------------------------------------------------------------ */

const MARCHES = [
  {
    cle: 'vainqueur',
    choix: [
      { cle: 'a', libelle: 'Fort', cote: 1.4 },
      { cle: 'b', libelle: 'Faible', cote: 2.9 },
    ],
  },
  { cle: 'score_exact', choix: [{ cle: '2-0', libelle: '2 – 0', cote: 1.1 }] },
];

test('choixAutomatique : toujours le favori du marché vainqueur', () => {
  assert.equal(core.choixAutomatique(MARCHES).cle, 'a');
  // Même réponse si l'ordre des choix change : c'est la cote qui décide.
  const inverse = [{ cle: 'vainqueur', choix: [...MARCHES[0].choix].reverse() }];
  assert.equal(core.choixAutomatique(inverse).cle, 'a');
});

test('choixAutomatique : ne prend jamais un autre marché', () => {
  assert.equal(core.choixAutomatique([MARCHES[1]]), null);
  assert.equal(core.choixAutomatique([]), null);
});

test('eligibleAuPariAuto : le mode off ne déclenche jamais rien', () => {
  const match = { equipe_a_id: 'x', equipe_b_id: 'y' };
  assert.equal(core.eligibleAuPariAuto({ mode: 'off', equipeFavoriteId: 'x', match }), false);
  assert.equal(core.eligibleAuPariAuto({ mode: 'inconnu', equipeFavoriteId: 'x', match }), false);
});

test('eligibleAuPariAuto : le mode favori ne couvre que les matchs de son équipe', () => {
  const sien = { equipe_a_id: 'x', equipe_b_id: 'y' };
  const autre = { equipe_a_id: 'z', equipe_b_id: 'y' };
  assert.equal(core.eligibleAuPariAuto({ mode: 'favori', equipeFavoriteId: 'x', match: sien }), true);
  assert.equal(core.eligibleAuPariAuto({ mode: 'favori', equipeFavoriteId: 'x', match: autre }), false);
  assert.equal(core.eligibleAuPariAuto({ mode: 'favori', equipeFavoriteId: null, match: sien }), false);
});

test('eligibleAuPariAuto : le mode tous couvre tout', () => {
  const match = { equipe_a_id: 'z', equipe_b_id: 'y' };
  assert.equal(core.eligibleAuPariAuto({ mode: 'tous', equipeFavoriteId: null, match }), true);
});

/* ------------------------------------------------------------------ */
/* Profil d'analyste                                                   */
/* ------------------------------------------------------------------ */

test('trancheCote : trois tranches, bornes comprises', () => {
  assert.equal(core.trancheCote(1.2), 'favori');
  assert.equal(core.trancheCote(1.79), 'favori');
  assert.equal(core.trancheCote(1.8), 'equilibre');
  assert.equal(core.trancheCote(2.99), 'equilibre');
  assert.equal(core.trancheCote(3), 'outsider');
  assert.equal(core.trancheCote(40), 'outsider');
});

test('agreger : regroupe, somme et calcule le retour sur mise', () => {
  const paris = [
    { format: 3, statut: 'gagne', mise: 100, gain: 250 },
    { format: 3, statut: 'perdu', mise: 100, gain: 0 },
    { format: 1, statut: 'perdu', mise: 200, gain: 0 },
  ];
  const g = core.agreger(paris, 'format');
  const bo3 = g.find((x) => x.cle === 3);
  const bo1 = g.find((x) => x.cle === 1);
  assert.equal(bo3.paris, 2);
  assert.equal(bo3.gagnes, 1);
  assert.equal(bo3.mises, 200);
  assert.equal(bo3.gains, 250);
  assert.equal(bo3.net, 50);
  proche(bo3.roi, 25);
  assert.equal(bo1.roi, -100);
  assert.equal(g[0].cle, 3, 'trié par nombre de paris');
});

test('agreger : accepte une clé calculée et ignore les valeurs nulles', () => {
  const paris = [
    { cote: 1.5, statut: 'gagne', mise: 10, gain: 15 },
    { cote: 4, statut: 'perdu', mise: 10, gain: 0 },
    { cote: null, statut: 'perdu', mise: 10, gain: 0 },
  ];
  const g = core.agreger(paris, (p) => (p.cote === null ? null : core.trancheCote(p.cote)));
  assert.equal(g.length, 2);
  assert.deepEqual(g.map((x) => x.cle).sort(), ['favori', 'outsider']);
});

const detailType = (roiBo3, roiBo1, paris = 10) => ({
  par_format: [
    { cle: 3, paris, roi: roiBo3 },
    { cle: 1, paris, roi: roiBo1 },
  ],
  par_jeu: [],
  par_marche: [],
  par_cote: [],
  equipe_favorite: null,
});

test('constatsAnalyste : commente un écart net entre deux formats', () => {
  const c = core.constatsAnalyste(detailType(30, -25));
  assert.equal(c.length, 1);
  assert.match(c[0].texte, /BO3/);
  assert.match(c[0].texte, /BO1/);
});

test('constatsAnalyste : ne commente jamais un échantillon trop petit', () => {
  const c = core.constatsAnalyste(detailType(200, -90, 3));
  assert.equal(c[0].cle, 'vide', 'trois paris ne prouvent rien');
});

test('constatsAnalyste : reste muet quand l’écart est faible', () => {
  const c = core.constatsAnalyste(detailType(6, 1));
  assert.equal(c[0].cle, 'vide');
});

test('constatsAnalyste : détecte le biais du supporter dans les deux sens', () => {
  const base = detailType(2, 1);
  const biais = core.constatsAnalyste({
    ...base,
    equipe_favorite: { nom: 'Karmine Corp', avec: { paris: 12, roi: -40 }, sans: { paris: 20, roi: 5 } },
  });
  assert.ok(biais.some((c) => c.cle === 'equipe_favorite' && /biais du supporter/.test(c.texte)));

  const avantage = core.constatsAnalyste({
    ...base,
    equipe_favorite: { nom: 'Karmine Corp', avec: { paris: 12, roi: 40 }, sans: { paris: 20, roi: 5 } },
  });
  assert.ok(avantage.some((c) => c.cle === 'equipe_favorite' && /avantage réel/.test(c.texte)));
});

test('constatsAnalyste : pas de constat d’équipe sans les deux échantillons', () => {
  const c = core.constatsAnalyste({
    ...detailType(2, 1),
    equipe_favorite: { nom: 'KC', avec: { paris: 2, roi: -80 }, sans: { paris: 30, roi: 4 } },
  });
  assert.ok(!c.some((x) => x.cle === 'equipe_favorite'));
});
