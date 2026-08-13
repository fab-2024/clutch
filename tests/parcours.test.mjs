/**
 * Test de parcours complet sur le backend de démonstration :
 * inscription -> pari -> règlement -> solde -> classement.
 *
 * Le localStorage du navigateur est simulé en mémoire.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const memoire = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
};

const store = await import('../web/js/store.js');
const core = await import('../web/js/core.js');

test('parcours complet : je gagne mon pari', async () => {
  await store.reinitialiser();
  const u = await store.connexion('Testeur');
  assert.equal(u.solde, core.SOLDE_INITIAL);

  const matchs = await store.listerMatchs({ statut: 'a_venir' });
  assert.ok(matchs.length > 5, 'le calendrier de démo doit être rempli');

  const m = matchs[0];
  const marches = await store.cotesDuMatch(m.id);
  const vainqueur = marches.find((x) => x.cle === 'vainqueur');
  const coteA = vainqueur.choix[0].cote;

  const pari = await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 200 });
  assert.equal(pari.mise, 200);
  assert.equal(pari.cote, coteA, 'la cote doit être figée à la valeur affichée');

  const apresMise = await store.utilisateurCourant();
  assert.equal(apresMise.solde, core.SOLDE_INITIAL - 200, 'la mise est débitée immédiatement');

  // L'équipe A gagne 2-0.
  const r = await store.reglerMatch(m.id, 2, 0);
  assert.equal(r.regles, 1);

  const apresGain = await store.utilisateurCourant();
  assert.equal(apresGain.solde, core.SOLDE_INITIAL - 200 + Math.round(200 * coteA));

  const paris = await store.mesParis();
  assert.equal(paris[0].statut, 'gagne');
});

test('parcours : je perds mon pari, le solde ne bouge plus', async () => {
  await store.reinitialiser();
  await store.connexion('Perdant');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 300 });
  await store.reglerMatch(m.id, 0, 2);
  const u = await store.utilisateurCourant();
  assert.equal(u.solde, core.SOLDE_INITIAL - 300);
  assert.equal((await store.mesParis())[0].statut, 'perdu');
});

test('on ne peut pas miser plus que son solde', async () => {
  await store.reinitialiser();
  await store.connexion('Flambeur');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await assert.rejects(
    () => store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 99999 }),
    /Mise maximale|Solde insuffisant/
  );
});

test('on ne peut pas miser en dessous du minimum', async () => {
  await store.reinitialiser();
  await store.connexion('Radin');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await assert.rejects(
    () => store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 1 }),
    /Mise minimale/
  );
});

test('on ne peut pas miser deux fois sur le même choix', async () => {
  await store.reinitialiser();
  await store.connexion('Doubleur');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 50 });
  await assert.rejects(
    () => store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 50 }),
    /déjà un pari/
  );
});

test('on ne peut pas miser sur un match déjà terminé', async () => {
  await store.reinitialiser();
  await store.connexion('Tricheur');
  const fini = (await store.listerMatchs({ statut: 'termine' }))[0];
  await assert.rejects(
    () => store.placerPari({ matchId: fini.id, marche: 'vainqueur', choix: 'a', mise: 50 }),
    /déjà commencé/
  );
});

test('un score incohérent avec le format est refusé', async () => {
  await store.reinitialiser();
  await store.connexion('Admin');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await assert.rejects(() => store.reglerMatch(m.id, 1, 0), /Score impossible/);
  await assert.rejects(() => store.reglerMatch(m.id, 2, 2), /Score impossible/);
  await assert.rejects(() => store.reglerMatch(m.id, 3, 1), /Score impossible/);
});

test('un match ne peut pas être réglé deux fois', async () => {
  await store.reinitialiser();
  await store.connexion('Admin');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.reglerMatch(m.id, 2, 1);
  await assert.rejects(() => store.reglerMatch(m.id, 2, 0), /déjà réglé/);
});

test('le règlement met à jour les Elo des deux équipes', async () => {
  await store.reinitialiser();
  await store.connexion('Admin');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  const avantA = m.elo_a;
  const avantB = m.elo_b;
  const r = await store.reglerMatch(m.id, 2, 0);
  assert.ok(r.elo_a > avantA, 'le vainqueur doit monter');
  assert.ok(r.elo_b < avantB, 'le perdant doit descendre');
});

test('la prime quotidienne ne peut pas être réclamée deux fois', async () => {
  await store.reinitialiser();
  await store.connexion('Assidu');
  const montant = await store.reclamerPrime();
  assert.equal(montant, core.BONUS_QUOTIDIEN);
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL + core.BONUS_QUOTIDIEN);
  await assert.rejects(() => store.reclamerPrime(), /déjà réclamée/);
});

test('ligues : création, code, adhésion, classement', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes du Discord');
  assert.match(ligue.code, /^[A-Z2-9]{6}$/);

  const mesLigues = await store.mesLigues();
  assert.equal(mesLigues.length, 1);
  assert.ok(mesLigues[0].nb_membres >= 1);

  await assert.rejects(() => store.rejoindreLigue(ligue.code), /déjà dans cette ligue/);
  await assert.rejects(() => store.rejoindreLigue('ZZZZZZ'), /Aucune ligue/);

  const classement = await store.classementLigue(ligue.id);
  assert.ok(classement.some((l) => l.moi), 'je dois figurer dans le classement');
  for (let i = 1; i < classement.length; i++) {
    assert.ok(classement[i - 1].solde >= classement[i].solde, 'classement trié par solde');
  }
});

test('le classement global place le joueur au bon rang', async () => {
  await store.reinitialiser();
  await store.connexion('Riche');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.placerPari({ matchId: m.id, marche: 'score_exact', choix: '2-0', mise: 1000 });
  await store.reglerMatch(m.id, 2, 0);
  const classement = await store.classementGlobal();
  assert.equal(classement[0].moi, true, 'avec un gros gain je dois être premier');
});

test('les statistiques reflètent les paris réglés', async () => {
  await store.reinitialiser();
  await store.connexion('Stats');
  const matchs = (await store.listerMatchs({ statut: 'a_venir' })).filter((x) => x.format === 3);
  await store.placerPari({ matchId: matchs[0].id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.placerPari({ matchId: matchs[1].id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.reglerMatch(matchs[0].id, 2, 0); // gagné
  await store.reglerMatch(matchs[1].id, 0, 2); // perdu

  const s = await store.statistiques();
  assert.equal(s.paris, 2);
  assert.equal(s.gagnes, 1);
  assert.equal(s.mises, 200);
  assert.ok(s.gains > 0);
});

/* ------------------------------------------------------------------ */
/* Saisons                                                             */
/* ------------------------------------------------------------------ */

test('saisons : il y en a une en cours et une à venir', async () => {
  await store.reinitialiser();
  const saisons = await store.listerSaisons();
  assert.equal(saisons.length, 2);
  assert.equal(saisons.filter((s) => s.statut === 'en_cours').length, 1);
  assert.equal(saisons.filter((s) => s.statut === 'a_venir').length, 1);

  const courante = await store.saisonCourante();
  assert.equal(courante.statut, 'en_cours', 'par défaut, on est dans la saison en cours');
});

test('saisons : changer de saison remet le solde à neuf', async () => {
  await store.reinitialiser();
  await store.connexion('Nomade');

  // Je perds 400 Frags dans la saison en cours.
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 400 });
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 400);

  // Je bascule sur la saison suivante : solde intact, c'est un nouveau départ.
  const saisons = await store.listerSaisons();
  const suivante = saisons.find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  assert.equal((await store.utilisateurCourant()).solde, suivante.solde_initial);

  // Et en revenant, je retrouve bien mon solde entamé.
  const encours = saisons.find((s) => s.statut === 'en_cours');
  await store.choisirSaison(encours.id);
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 400);
});

test('saisons : les paris et statistiques sont cloisonnés', async () => {
  await store.reinitialiser();
  await store.connexion('Cloison');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });

  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);

  assert.equal((await store.mesParis()).length, 0, 'aucun pari dans la nouvelle saison');
  assert.equal((await store.statistiques()).paris, 0);
  assert.equal((await store.listerMatchs({ statut: 'a_venir' })).length, 0,
    'le calendrier de démo appartient à la saison 1');
});

test('saisons : le classement de la saison 2 est remis à plat', async () => {
  await store.reinitialiser();
  await store.connexion('Retardataire');

  const saison1 = await store.classementGlobal();
  const ecart1 = saison1[0].solde - saison1[saison1.length - 1].solde;
  assert.ok(ecart1 > 0, 'la saison 1 a des écarts installés');

  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  const saison2 = await store.classementGlobal();
  const soldes = new Set(saison2.map((l) => l.solde));
  assert.equal(soldes.size, 1, 'en saison 2, tout le monde démarre au même solde');
  assert.equal([...soldes][0], suivante.solde_initial);
});

test('saisons : la prime est propre à chaque saison', async () => {
  await store.reinitialiser();
  await store.connexion('Primé');
  await store.reclamerPrime();
  await assert.rejects(() => store.reclamerPrime(), /déjà réclamée/);

  // Sur une saison qui n'a pas encore ouvert, la prime est refusée : sinon on
  // pourrait se constituer un magot avant même le premier match.
  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  await assert.rejects(() => store.reclamerPrime(), /pas encore commencé/);
});

test('saisons : une saison inconnue est refusée', async () => {
  await store.reinitialiser();
  await assert.rejects(() => store.choisirSaison('saison-fantome'), /Saison inconnue/);
});
