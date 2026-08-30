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
  const { montant, serie } = await store.reclamerPrime();
  assert.equal(montant, core.PRIME_PALIERS[0]);
  assert.equal(serie, 1);
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL + montant);
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

/* ------------------------------------------------------------------ */
/* Prime de connexion en série                                         */
/* ------------------------------------------------------------------ */

const JOUR = 24 * 3600 * 1000;

test('prime : sept jours d’affilée déroulent toute la série', async () => {
  await store.reinitialiser();
  await store.connexion('Régulier');

  // Une mise, pour débloquer la bonification à partir du jour 3.
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 10 });

  const encaisse = [];
  for (let jour = 0; jour < core.PRIME_SERIE_MAX; jour++) {
    const r = await store.reclamerPrime({ maintenant: Date.now() + jour * JOUR });
    encaisse.push(r.montant);
    assert.equal(r.serie, jour + 1);
  }
  assert.deepEqual(encaisse, core.PRIME_PALIERS);

  // Le huitième jour, la semaine est bouclée : on repart au jour 1.
  const huitieme = await store.reclamerPrime({ maintenant: Date.now() + 7 * JOUR });
  assert.equal(huitieme.serie, 1);
});

test('prime : manquer un jour remet la série à zéro', async () => {
  await store.reinitialiser();
  await store.connexion('Distrait');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 10 });

  await store.reclamerPrime({ maintenant: Date.now() });
  const j2 = await store.reclamerPrime({ maintenant: Date.now() + JOUR });
  assert.equal(j2.serie, 2);

  // Trois jours plus tard : la série est cassée.
  const retour = await store.reclamerPrime({ maintenant: Date.now() + 4 * JOUR });
  assert.equal(retour.serie, 1);
  assert.equal(retour.montant, core.PRIME_PALIERS[0]);
});

test('prime : sans mise, la bonification ne dépasse jamais le plancher', async () => {
  await store.reinitialiser();
  await store.connexion('Passif');
  for (let jour = 0; jour < 5; jour++) {
    const r = await store.reclamerPrime({ maintenant: Date.now() + jour * JOUR });
    if (r.serie >= core.PRIME_JOUR_MISE) assert.equal(r.montant, core.PRIME_BASE);
  }
});

test('prime : etatPrime décrit la série et le total encaissé', async () => {
  await store.reinitialiser();
  await store.connexion('Curieux');

  const avant = await store.etatPrime();
  assert.equal(avant.disponible, true);
  assert.equal(avant.serie_prochaine, 1);
  assert.equal(avant.total_encaisse, 0);

  const { montant } = await store.reclamerPrime();
  const apres = await store.etatPrime();
  assert.equal(apres.disponible, false);
  assert.equal(apres.serie_actuelle, 1);
  assert.equal(apres.total_encaisse, montant);
  assert.ok(apres.attente_ms > 0);
});

/* ------------------------------------------------------------------ */
/* Équipe préférée                                                     */
/* ------------------------------------------------------------------ */

test('équipe préférée : elle se pose, se change et se retire', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  assert.equal((await store.utilisateurCourant()).equipe_favorite, null);

  await store.definirEquipeFavorite('lol-kc');
  assert.equal((await store.utilisateurCourant()).equipe_favorite.tag, 'KC');

  await store.definirEquipeFavorite('rl-vit');
  assert.equal((await store.utilisateurCourant()).equipe_favorite.tag, 'VIT');

  await store.definirEquipeFavorite(null);
  assert.equal((await store.utilisateurCourant()).equipe_favorite, null);

  await assert.rejects(() => store.definirEquipeFavorite('equipe-fantome'), /Équipe inconnue/);
});

test('équipe préférée : elle filtre le calendrier', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  const tous = await store.listerMatchs({ statut: 'a_venir' });
  const siens = await store.listerMatchs({ statut: 'a_venir', equipe: 'lol-g2' });
  assert.ok(siens.length > 0, 'G2 doit avoir des matchs au calendrier');
  assert.ok(siens.length < tous.length);
  for (const m of siens) {
    assert.ok(m.equipe_a_id === 'lol-g2' || m.equipe_b_id === 'lol-g2');
  }
});

test('équipe préférée : elle apparaît au classement', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  await store.definirEquipeFavorite('val-fnc');
  const moi = (await store.classementGlobal()).find((l) => l.moi);
  assert.equal(moi.tag_favori, 'FNC');
});

test('équipe préférée : elle ne change aucune cote', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.equipe_a_id === 'lol-g2');
  const avant = await store.cotesDuMatch(m.id);
  await store.definirEquipeFavorite('lol-g2');
  const apres = await store.cotesDuMatch(m.id);
  assert.deepEqual(apres, avant);
});

/* ------------------------------------------------------------------ */
/* Le call de la saison                                                */
/* ------------------------------------------------------------------ */

/** Le premier tournoi encore ouvert de la saison en cours. */
async function tournoiOuvert() {
  return (await store.listerEvenementsSaison()).find((e) => e.statut === 'ouvert');
}

test('call : les tournois déjà commencés sont fermés', async () => {
  await store.reinitialiser();
  const evenements = await store.listerEvenementsSaison();
  assert.ok(evenements.length > 1);
  assert.ok(evenements.some((e) => e.statut === 'ouvert'), 'au moins un tournoi ouvert');
  assert.ok(evenements.some((e) => e.statut === 'verrouille'), 'au moins un tournoi commencé');
});

test('call : cotes du tournoi cohérentes avec les Elo', async () => {
  await store.reinitialiser();
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);
  assert.ok(cotes.length >= 2);
  for (let i = 1; i < cotes.length; i++) {
    assert.ok(cotes[i - 1].elo >= cotes[i].elo, 'le favori doit être le mieux classé');
    assert.ok(cotes[i - 1].cote <= cotes[i].cote);
  }
});

test('call : je le pose, il débite ma mise, et je n’en pose qu’un', async () => {
  await store.reinitialiser();
  await store.connexion('Devin');
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);

  const call = await store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 300 });
  assert.equal(call.mise, 300);
  assert.equal(call.cote, cotes[0].cote);
  assert.equal(call.gain_potentiel, Math.round(300 * cotes[0].cote));
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 300);

  await assert.rejects(
    () => store.placerCall({ eventId: ev.id, equipeId: cotes[1].id, mise: 100 }),
    /déjà posé ton call/
  );
});

test('call : les mises hors bornes et les équipes étrangères sont refusées', async () => {
  await store.reinitialiser();
  await store.connexion('Maladroit');
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);

  await assert.rejects(
    () => store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 10 }),
    /Mise minimale/
  );
  await assert.rejects(
    () => store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 99999 }),
    /Mise maximale/
  );
  await assert.rejects(
    () => store.placerCall({ eventId: ev.id, equipeId: 'cs-astralis', mise: 100 }),
    /ne participe pas/
  );
});

test('call : un tournoi déjà commencé refuse le call', async () => {
  await store.reinitialiser();
  await store.connexion('Retardataire');
  const ferme = (await store.listerEvenementsSaison()).find((e) => e.statut === 'verrouille');
  await assert.rejects(
    () => store.placerCall({ eventId: ferme.id, equipeId: 'lol-g2', mise: 100 }),
    /déjà commencé/
  );
});

test('call réussi : la mise revient multipliée par la cote', async () => {
  await store.reinitialiser();
  await store.connexion('Visionnaire');
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);
  const call = await store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 200 });

  const r = await store.reglerEvenement(ev.id, cotes[0].id);
  assert.equal(r.regles, 1);

  const apres = await store.monCall();
  assert.equal(apres.statut, 'gagne');
  assert.equal(apres.gain, Math.round(200 * call.cote));
  assert.equal(
    (await store.utilisateurCourant()).solde,
    core.SOLDE_INITIAL - 200 + Math.round(200 * call.cote)
  );
});

test('call manqué : la mise est perdue et le tournoi ne se règle qu’une fois', async () => {
  await store.reinitialiser();
  await store.connexion('Malchanceux');
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);
  await store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 250 });

  await store.reglerEvenement(ev.id, cotes[1].id);
  assert.equal((await store.monCall()).statut, 'perdu');
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 250);

  await assert.rejects(() => store.reglerEvenement(ev.id, cotes[0].id), /déjà réglé/);
});

test('call : il est propre à chaque saison', async () => {
  await store.reinitialiser();
  await store.connexion('Nomade');
  const ev = await tournoiOuvert();
  const cotes = await store.cotesEvenement(ev.id);
  await store.placerCall({ eventId: ev.id, equipeId: cotes[0].id, mise: 100 });

  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  assert.equal(await store.monCall(), null);
});

/* ------------------------------------------------------------------ */
/* Rivalité de la semaine                                              */
/* ------------------------------------------------------------------ */

test('rivalité : un rival proche au classement, jamais soi-même', async () => {
  await store.reinitialiser();
  await store.connexion('Compétiteur');
  const r = await store.rivaliteSemaine();
  assert.ok(r, 'une rivalité doit être proposée');
  assert.notEqual(r.rival.id, r.moi.id);
  assert.equal(r.ecart, r.moi.solde - r.rival.solde);
  assert.ok(Math.abs(r.moi.rang - r.rival.rang) <= 3, 'le rival doit être un voisin');
});

test('rivalité : mon bilan de la semaine suit mes paris réglés', async () => {
  await store.reinitialiser();
  await store.connexion('Actif');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.reglerMatch(m.id, 0, 2); // perdu

  const r = await store.rivaliteSemaine();
  assert.equal(r.moi.bilan.paris, 1);
  assert.equal(r.moi.bilan.gagnes, 0);
  assert.equal(r.moi.bilan.net, -100);
});

test('rivalité : elle fonctionne aussi au sein d’une ligue', async () => {
  await store.reinitialiser();
  await store.connexion('Chef de ligue');
  const ligue = await store.creerLigue('Le Discord');
  const membres = (await store.classementLigue(ligue.id)).map((l) => l.id);
  const r = await store.rivaliteSemaine({ ligue: ligue.id });
  assert.ok(membres.includes(r.rival.id), 'le rival doit être un membre de la ligue');
});

/* ------------------------------------------------------------------ */
/* Prono par défaut                                                    */
/* ------------------------------------------------------------------ */

/**
 * Se placer juste après le coup d'envoi d'un match, sans attendre.
 * `maintenant` n'existe que pour les tests, comme pour la prime.
 */
const apres = (match) => new Date(match.debut).getTime() + 60 * 1000;

test('pari auto : désactivé par défaut, rien ne se passe', async () => {
  await store.reinitialiser();
  await store.connexion('Prudent');
  assert.equal((await store.utilisateurCourant()).pari_auto_mode, 'off');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  assert.deepEqual(await store.rattraperParisAuto({ maintenant: apres(m) }), { poses: 0 });
  assert.equal((await store.mesParis()).length, 0);
});

test('pari auto : le rattrapage mise sur le favori au coup d’envoi', async () => {
  await store.reinitialiser();
  await store.connexion('Distrait');
  await store.definirPariAuto({ mode: 'tous', mise: 100 });

  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  const favori = core.choixAutomatique(await store.cotesDuMatch(m.id));

  assert.deepEqual(await store.rattraperParisAuto({ maintenant: apres(m) }), { poses: 1 });
  const [pari] = await store.mesParis();
  assert.equal(pari.auto, true);
  assert.equal(pari.marche, 'vainqueur');
  assert.equal(pari.choix, favori.cle);
  assert.equal(pari.cote, favori.cote);
  assert.equal(pari.mise, 100);
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 100);

  // Deuxième passage : rien de plus, on ne mise pas deux fois.
  assert.deepEqual(await store.rattraperParisAuto({ maintenant: apres(m) }), { poses: 0 });
});

test('pari auto : un pari déjà saisi n’est jamais écrasé', async () => {
  await store.reinitialiser();
  await store.connexion('Décidé');
  await store.definirPariAuto({ mode: 'tous', mise: 100 });
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'b', mise: 300 });

  assert.deepEqual(await store.rattraperParisAuto({ maintenant: apres(m) }), { poses: 0 });
  const paris = await store.mesParis();
  assert.equal(paris.length, 1);
  assert.equal(paris[0].choix, 'b');
});

test('pari auto : le mode favori ne touche que les matchs de mon équipe', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  await store.definirEquipeFavorite('lol-g2');
  await store.definirPariAuto({ mode: 'favori', mise: 50 });

  const tous = await store.listerMatchs({ statut: 'a_venir' });
  const finDuCalendrier = Math.max(...tous.map((m) => new Date(m.debut).getTime())) + 1000;

  const { poses } = await store.rattraperParisAuto({ maintenant: finDuCalendrier });
  const siens = tous.filter((m) => m.equipe_a_id === 'lol-g2' || m.equipe_b_id === 'lol-g2');
  assert.equal(poses, siens.length);
  for (const p of await store.mesParis()) {
    const m = tous.find((x) => x.id === p.match_id);
    assert.ok(m.equipe_a_id === 'lol-g2' || m.equipe_b_id === 'lol-g2');
  }
});

test('pari auto : le règlement pose le pari manquant avant de calculer', async () => {
  await store.reinitialiser();
  await store.connexion('Absent');
  await store.definirPariAuto({ mode: 'tous', mise: 100 });
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  const favori = core.choixAutomatique(await store.cotesDuMatch(m.id));

  // L'équipe A est favorite sur ce match : elle gagne, le pari auto est gagnant.
  const r = await store.reglerMatch(m.id, favori.cle === 'a' ? 2 : 0, favori.cle === 'a' ? 0 : 2);
  assert.equal(r.regles, 1, 'le pari automatique doit être réglé avec le match');

  const [pari] = await store.mesParis();
  assert.equal(pari.auto, true);
  assert.equal(pari.statut, 'gagne');
  assert.equal(pari.cote, favori.cote, 'la cote doit être celle d’avant-match');
});

test('pari auto : rien ne se pose sans solde suffisant', async () => {
  await store.reinitialiser();
  await store.connexion('Ruiné');
  await store.definirPariAuto({ mode: 'tous', mise: 500 });
  const matchs = await store.listerMatchs({ statut: 'a_venir' });
  await store.placerPari({ matchId: matchs[0].id, marche: 'vainqueur', choix: 'a', mise: 900 });

  assert.deepEqual(await store.rattraperParisAuto({ maintenant: apres(matchs[1]) }), { poses: 0 });
});

test('pari auto : mise hors bornes refusée', async () => {
  await store.reinitialiser();
  await store.connexion('Excessif');
  await assert.rejects(() => store.definirPariAuto({ mode: 'tous', mise: 5 }), /Mise automatique/);
  await assert.rejects(() => store.definirPariAuto({ mode: 'tous', mise: 9999 }), /Mise automatique/);
  await assert.rejects(() => store.definirPariAuto({ mode: 'nimporte', mise: 100 }), /Mode inconnu/);
});

/* ------------------------------------------------------------------ */
/* Défi de ligue                                                       */
/* ------------------------------------------------------------------ */

test('défi : le créateur tire un tournoi, une seule fois par saison', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes');
  assert.equal(await store.defiLigue(ligue.id), null);

  const defi = await store.tirerDefi(ligue.id);
  assert.ok(defi.event_id);
  assert.ok(defi.nom);
  assert.equal((await store.defiLigue(ligue.id)).event_id, defi.event_id);

  await assert.rejects(() => store.tirerDefi(ligue.id), /déjà tiré/);
});

test('défi : seul le créateur peut tirer', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes');
  await store.connexion('Intrus'); // nouveau joueur, même navigateur de démo
  await assert.rejects(() => store.tirerDefi(ligue.id), /créateur de la ligue/);
});

test('défi : le tournoi tiré a toujours des matchs à jouer', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes');
  const defi = await store.tirerDefi(ligue.id);
  const matchs = await store.listerMatchs({ statut: 'a_venir' });
  assert.ok(matchs.some((m) => m.event_id === defi.event_id));
});

test('défi : le classement ne compte que les paris du tournoi tiré', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes');
  const defi = await store.tirerDefi(ligue.id);

  const matchs = await store.listerMatchs({ statut: 'a_venir' });
  const dedans = matchs.find((m) => m.event_id === defi.event_id && m.format === 3);
  const dehors = matchs.find((m) => m.event_id !== defi.event_id && m.format === 3);

  await store.placerPari({ matchId: dedans.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.placerPari({ matchId: dehors.id, marche: 'vainqueur', choix: 'a', mise: 400 });
  await store.reglerMatch(dedans.id, 0, 2); // perdu
  await store.reglerMatch(dehors.id, 2, 0); // gagné, mais hors défi

  const moi = (await store.classementDefi(ligue.id)).find((l) => l.moi);
  assert.equal(moi.paris, 1, 'seul le pari du tournoi tiré compte');
  assert.equal(moi.mises, 100);
  assert.equal(moi.net, -100);
});

test('défi : pas de défi, pas de classement', async () => {
  await store.reinitialiser();
  await store.connexion('Chef');
  const ligue = await store.creerLigue('Les potes');
  assert.deepEqual(await store.classementDefi(ligue.id), []);
});

/* ------------------------------------------------------------------ */
/* Profil d'analyste                                                   */
/* ------------------------------------------------------------------ */

test('analyste : les agrégations recoupent les statistiques globales', async () => {
  await store.reinitialiser();
  await store.connexion('Analyste');
  const matchs = (await store.listerMatchs({ statut: 'a_venir' })).filter((x) => x.format === 3);
  await store.placerPari({ matchId: matchs[0].id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.placerPari({ matchId: matchs[1].id, marche: 'score_exact', choix: '2-0', mise: 200 });
  await store.reglerMatch(matchs[0].id, 2, 0); // gagné
  await store.reglerMatch(matchs[1].id, 0, 2); // perdu

  const d = await store.statistiquesDetaillees();
  const s = await store.statistiques();
  assert.equal(d.total.paris, s.paris);
  assert.equal(d.total.mises, s.mises);
  assert.equal(d.total.gains, s.gains);

  const parMarche = Object.fromEntries(d.par_marche.map((g) => [g.cle, g]));
  assert.equal(parMarche.vainqueur.paris, 1);
  assert.equal(parMarche.score_exact.paris, 1);
  assert.equal(parMarche.score_exact.roi, -100);

  // La somme des groupes doit toujours retomber sur le total.
  for (const liste of [d.par_format, d.par_jeu, d.par_marche, d.par_cote]) {
    assert.equal(liste.reduce((t, g) => t + g.paris, 0), d.total.paris);
    assert.equal(liste.reduce((t, g) => t + g.mises, 0), d.total.mises);
  }
});

test('analyste : les paris en cours sont exclus', async () => {
  await store.reinitialiser();
  await store.connexion('Analyste');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  const d = await store.statistiquesDetaillees();
  assert.equal(d.total.paris, 0);
  assert.deepEqual(d.par_format, []);
});

test('analyste : le biais du supporter sépare bien les deux périmètres', async () => {
  await store.reinitialiser();
  await store.connexion('Supporter');
  await store.definirEquipeFavorite('lol-g2');

  const matchs = (await store.listerMatchs({ statut: 'a_venir' })).filter((x) => x.format === 3);
  const sien = matchs.find((m) => m.equipe_a_id === 'lol-g2' || m.equipe_b_id === 'lol-g2');
  const autre = matchs.find((m) => m.equipe_a_id !== 'lol-g2' && m.equipe_b_id !== 'lol-g2');

  await store.placerPari({ matchId: sien.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.placerPari({ matchId: autre.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.reglerMatch(sien.id, 0, 2);
  await store.reglerMatch(autre.id, 2, 0);

  const d = await store.statistiquesDetaillees();
  assert.equal(d.equipe_favorite.nom, 'G2 Esports');
  assert.equal(d.equipe_favorite.avec.paris, 1);
  assert.equal(d.equipe_favorite.avec.roi, -100);
  assert.equal(d.equipe_favorite.sans.paris, 1);
  assert.ok(d.equipe_favorite.sans.roi > 0);
});

test('analyste : sans équipe préférée, pas de bloc de comparaison', async () => {
  await store.reinitialiser();
  await store.connexion('Neutre');
  assert.equal((await store.statistiquesDetaillees()).equipe_favorite, null);
});

/* ------------------------------------------------------------------ */
/* Note à vie, badges et cartes                                        */
/* ------------------------------------------------------------------ */

test('note : elle démarre à 1000 et bouge à chaque pari réglé', async () => {
  await store.reinitialiser();
  await store.connexion('Noté');
  assert.equal((await store.utilisateurCourant()).note, core.NOTE_INITIALE);
  assert.equal((await store.utilisateurCourant()).note_paris, 0);

  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  const pari = await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  assert.equal((await store.utilisateurCourant()).note, core.NOTE_INITIALE, 'un pari en cours ne note rien');

  await store.reglerMatch(m.id, 2, 0);
  const apres = await store.utilisateurCourant();
  assert.equal(apres.note, core.majNote(core.NOTE_INITIALE, pari.cote, true));
  assert.equal(apres.note_paris, 1);
});

test('note : elle traverse les saisons, contrairement au solde', async () => {
  await store.reinitialiser();
  await store.connexion('Durable');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  await store.reglerMatch(m.id, 2, 0);
  const note = (await store.utilisateurCourant()).note;

  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  const enSaison2 = await store.utilisateurCourant();
  assert.equal(enSaison2.solde, suivante.solde_initial, 'le solde repart à neuf');
  assert.equal(enSaison2.note, note, 'la note, elle, reste');
});

test('classement : les trois modes portent chacun leur mesure', async () => {
  await store.reinitialiser();
  await store.connexion('Compétiteur');
  const lignes = await store.classementGlobal();
  for (const l of lignes) {
    assert.equal(typeof l.solde, 'number');
    assert.equal(typeof l.roi, 'number');
    assert.equal(typeof l.note, 'number');
    assert.equal(typeof l.note_paris, 'number');
  }
  // Le tri par note doit changer l'ordre par rapport au solde.
  const parSolde = core.trierClassement(lignes, 'solde').map((l) => l.id);
  const parNote = core.trierClassement(lignes, 'note').map((l) => l.id);
  assert.notDeepEqual(parSolde, parNote);
});

test('badges : le parcours en décroche plusieurs, et jamais par le volume', async () => {
  await store.reinitialiser();
  await store.connexion('Chasseur');
  await store.definirEquipeFavorite('lol-g2');
  await store.creerLigue('Les potes');

  const { badges } = await store.mesBadges();
  const obtenus = badges.filter((b) => b.obtenu).map((b) => b.cle);
  assert.ok(obtenus.includes('selectionneur'));
  assert.ok(obtenus.includes('fondateur'));
  assert.ok(obtenus.includes('recruteur'), 'la ligue de démo compte 5 membres');
  assert.ok(!obtenus.includes('outsider'), 'aucun pari gagné pour le moment');
});

test('badges : gagner un gros outsider décroche les bons badges', async () => {
  await store.reinitialiser();
  await store.connexion('Audacieux');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  const marches = await store.cotesDuMatch(m.id);
  const scoreExact = marches.find((x) => x.cle === 'score_exact');
  const rare = scoreExact.choix.reduce((max, c) => (c.cote > max.cote ? c : max));

  await store.placerPari({ matchId: m.id, marche: 'score_exact', choix: rare.cle, mise: 100 });
  const [a, b] = rare.cle.split('-').map(Number);
  await store.reglerMatch(m.id, a, b);

  const { badges, recap } = await store.mesBadges();
  const obtenus = badges.filter((x) => x.obtenu).map((x) => x.cle);
  assert.equal(recap.scores_exacts, 1);
  assert.ok(obtenus.includes('horloger'), 'un score exact trouvé');
  assert.ok(obtenus.includes('outsider'), `cote de ${rare.cote}`);
});

test('badges : ils survivent au changement de saison', async () => {
  await store.reinitialiser();
  await store.connexion('Vétéran');
  await store.definirEquipeFavorite('lol-g2');
  const avant = (await store.mesBadges()).badges.filter((b) => b.obtenu).length;

  const suivante = (await store.listerSaisons()).find((s) => s.statut === 'a_venir');
  await store.choisirSaison(suivante.id);
  const apres = (await store.mesBadges()).badges.filter((b) => b.obtenu).length;
  assert.equal(apres, avant, 'un badge ne se perd pas en changeant de saison');
});

test('cartes : seuls les paris marquants y entrent', async () => {
  await store.reinitialiser();
  await store.connexion('Conteur');
  const matchs = (await store.listerMatchs({ statut: 'a_venir' })).filter((x) => x.format === 3);

  // Un favori gagné à petite cote : ne mérite pas de carte.
  const petit = matchs[0];
  await store.placerPari({ matchId: petit.id, marche: 'vainqueur', choix: 'a', mise: 50 });
  await store.reglerMatch(petit.id, 2, 0);

  // Un score exact rare : la mérite.
  const gros = matchs[1];
  const scoreExact = (await store.cotesDuMatch(gros.id)).find((x) => x.cle === 'score_exact');
  const rare = scoreExact.choix.reduce((max, c) => (c.cote > max.cote ? c : max));
  await store.placerPari({ matchId: gros.id, marche: 'score_exact', choix: rare.cle, mise: 100 });
  const [a, b] = rare.cle.split('-').map(Number);
  await store.reglerMatch(gros.id, a, b);

  const cartes = await store.mesCartes();
  assert.equal(cartes.length, 1, 'un seul pari mérite sa carte');
  assert.equal(cartes[0].match_id, gros.id);
  assert.ok(cartes[0].match, 'la carte doit connaître son affiche');
});

test('cartes : rien à raconter sans victoire', async () => {
  await store.reinitialiser();
  await store.connexion('Muet');
  const m = (await store.listerMatchs({ statut: 'a_venir' }))[0];
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 500 });
  await store.reglerMatch(m.id, 0, 2);
  assert.deepEqual(await store.mesCartes(), []);
});

/* ------------------------------------------------------------------ */
/* Création de compétition et annulation                               */
/* ------------------------------------------------------------------ */

const DEMAIN = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

test('admin : créer un tournoi, deux équipes, un match', async () => {
  await store.reinitialiser();
  await store.connexion('Organisateur');

  const ev = await store.creerEvenement({ nom: 'LFL Été 2027 — Spécial', jeu: 'lol' });
  assert.equal(ev.id, 'ev-lfl-ete-2027-special', 'identifiant lisible et sans accent');

  const a = await store.creerEquipe({ nom: 'Solary', tag: 'sly', jeu: 'lol', elo: 1520 });
  const b = await store.creerEquipe({ nom: 'Gentle Mates', tag: 'M8', jeu: 'lol', elo: 1480 });
  assert.equal(a.tag, 'SLY', 'le tag est normalisé en majuscules');

  const m = await store.creerMatch({
    eventId: ev.id, equipeAId: a.id, equipeBId: b.id, format: 3, debut: DEMAIN(),
  });
  assert.equal(m.statut, 'a_venir');
  assert.equal(m.equipe_a, 'Solary');
  assert.equal(m.elo_a, 1520, 'les cotes partiront du bon Elo');

  // Le match est immédiatement jouable.
  const marches = await store.cotesDuMatch(m.id);
  assert.equal(marches.length, 3);
  const pari = await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });
  assert.ok(pari.cote > 1);
});

test('admin : les créations invalides sont refusées', async () => {
  await store.reinitialiser();
  await store.connexion('Organisateur');
  const ev = await store.creerEvenement({ nom: 'Test Cup', jeu: 'lol' });
  const a = await store.creerEquipe({ nom: 'Alpha Team', tag: 'ALP', jeu: 'lol' });
  const rocketLeague = await store.creerEquipe({ nom: 'Bravo Squad', tag: 'BRV', jeu: 'rocket_league' });

  await assert.rejects(() => store.creerEvenement({ nom: 'Test Cup', jeu: 'lol' }), /porte déjà ce nom/);
  await assert.rejects(() => store.creerEvenement({ nom: '  ', jeu: 'lol' }), /Donne un nom/);
  await assert.rejects(() => store.creerEquipe({ nom: 'X', tag: 'BEAUCOUPTROPLONG', jeu: 'lol' }), /tag/);
  await assert.rejects(() => store.creerEquipe({ nom: 'X', tag: 'XX', jeu: 'lol', elo: 50 }), /Elo/);
  await assert.rejects(
    () => store.creerMatch({ eventId: ev.id, equipeAId: a.id, equipeBId: a.id, format: 3, debut: DEMAIN() }),
    /contre elle-même/
  );
  await assert.rejects(
    () => store.creerMatch({ eventId: ev.id, equipeAId: a.id, equipeBId: rocketLeague.id, format: 3, debut: DEMAIN() }),
    /même jeu|doivent jouer/
  );
  await assert.rejects(
    () => store.creerMatch({
      eventId: ev.id, equipeAId: a.id, equipeBId: rocketLeague.id, format: 3,
      debut: new Date(Date.now() - 3600 * 1000).toISOString(),
    }),
    /futur/
  );
});

test('annulation : les mises sont rendues à l’unité près', async () => {
  await store.reinitialiser();
  await store.connexion('Lésé');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 300 });
  await store.placerPari({ matchId: m.id, marche: 'score_exact', choix: '2-0', mise: 200 });
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL - 500);

  const r = await store.annulerMatch(m.id, { motif: 'Forfait' });
  assert.equal(r.rembourses, 2);
  assert.equal(r.total, 500);
  assert.equal((await store.utilisateurCourant()).solde, core.SOLDE_INITIAL, 'solde intégralement rendu');

  for (const p of await store.mesParis()) assert.equal(p.statut, 'rembourse');
});

test('annulation : elle ne touche ni à la note ni aux Elo', async () => {
  await store.reinitialiser();
  await store.connexion('Neutre');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  const eloAvant = m.elo_a;
  await store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 100 });

  await store.annulerMatch(m.id);
  const u = await store.utilisateurCourant();
  assert.equal(u.note, core.NOTE_INITIALE, 'un match qui n’a pas eu lieu n’apprend rien');
  assert.equal(u.note_paris, 0);

  const apres = await store.lireMatch(m.id);
  assert.equal(apres.statut, 'annule');
  assert.equal(apres.elo_a, eloAvant, 'les Elo ne bougent pas');
});

test('annulation : impossible sur un match réglé, et jamais deux fois', async () => {
  await store.reinitialiser();
  await store.connexion('Admin');
  const matchs = (await store.listerMatchs({ statut: 'a_venir' })).filter((x) => x.format === 3);
  await store.reglerMatch(matchs[0].id, 2, 0);
  await assert.rejects(() => store.annulerMatch(matchs[0].id), /déjà réglé/);

  await store.annulerMatch(matchs[1].id);
  await assert.rejects(() => store.annulerMatch(matchs[1].id), /déjà annulé/);
});

test('annulation : un match annulé sort du calendrier et n’accepte plus de mise', async () => {
  await store.reinitialiser();
  await store.connexion('Joueur');
  const m = (await store.listerMatchs({ statut: 'a_venir' })).find((x) => x.format === 3);
  await store.annulerMatch(m.id);

  const aVenir = await store.listerMatchs({ statut: 'a_venir' });
  assert.ok(!aVenir.some((x) => x.id === m.id), 'il ne doit plus apparaître aux matchs à venir');
  await assert.rejects(
    () => store.placerPari({ matchId: m.id, marche: 'vainqueur', choix: 'a', mise: 50 }),
    /déjà commencé|annulé/
  );
});

/* ------------------------------------------------------------------ */
/* Communautés                                                          */
/* ------------------------------------------------------------------ */

test('communautés : choisir une équipe préférée fait monter sa jauge', async () => {
  await store.reinitialiser();
  await store.connexion('Pierre');

  const avant = await store.classementCommunautes();
  const kcAvant = avant.find((c) => c.equipe_id === 'lol-kc');
  assert.ok(kcAvant, 'Karmine Corp doit déjà exister par ses rivaux');
  assert.equal(kcAvant.moi, false);

  await store.definirEquipeFavorite('lol-kc');
  const apres = await store.classementCommunautes();
  const kcApres = apres.find((c) => c.equipe_id === 'lol-kc');
  assert.equal(kcApres.membres, kcAvant.membres + 1);
  assert.equal(kcApres.moi, true);
});

test('communautés : on n’appartient qu’à une seule à la fois', async () => {
  await store.reinitialiser();
  await store.connexion('Pierre');
  await store.definirEquipeFavorite('lol-kc');
  await store.definirEquipeFavorite('lol-g2');

  const lignes = await store.classementCommunautes();
  assert.equal(lignes.filter((c) => c.moi).length, 1);
  assert.equal(lignes.find((c) => c.moi).equipe_id, 'lol-g2');
});

test('communautés : classées par taille, et une équipe sans membre n’apparaît pas', async () => {
  await store.reinitialiser();
  await store.connexion('Pierre');
  await store.definirEquipeFavorite('lol-kc');

  const lignes = await store.classementCommunautes();
  for (let i = 1; i < lignes.length; i++) {
    assert.ok(lignes[i - 1].membres >= lignes[i].membres, 'tri décroissant rompu');
  }
  assert.ok(lignes.every((c) => c.membres > 0));
  // « Heroic » n'est le favori de personne dans le jeu de départ.
  assert.equal(lignes.some((c) => c.equipe_id === 'cs-heroic'), false);
});
