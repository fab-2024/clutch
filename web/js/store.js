/**
 * Backend de DÉMONSTRATION.
 *
 * Reproduit toute la logique serveur en mémoire, avec persistance dans le
 * localStorage du navigateur. Il permet de faire tourner Clutch sans aucun
 * compte ni configuration : on ouvre le site, on joue.
 *
 * En production, api.js bascule automatiquement sur Supabase dès que les
 * clés sont renseignées dans config.js, et ce fichier n'est plus utilisé.
 */

import * as core from './core.js';
import { EQUIPES, EVENEMENTS, RIVAUX, construireMatchs, construireSaisons } from './seed.js';

const CLE = 'clutch.demo.v4';

let db = null;

function etatInitial() {
  return {
    version: 4,
    cree_le: new Date().toISOString(),
    utilisateur: null,
    saisons: construireSaisons(),
    saison_choisie: null,
    equipes: structuredClone(EQUIPES),
    evenements: structuredClone(EVENEMENTS),
    matchs: construireMatchs(),
    paris: [],
    ligues: [],
    membres: [],
    participations: [],
    primes: [],
    calls: [],
    resultats_evenement: [],
    defis: [],
    rivaux: structuredClone(RIVAUX),
  };
}

function charger() {
  if (db) return db;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      db = JSON.parse(brut);
      // Les matchs à venir sont recalés dans le temps à chaque nouvelle session,
      // sinon la démo se retrouve avec un calendrier périmé au bout de 3 jours.
      recalerCalendrier();
      return db;
    }
  } catch {
    /* localStorage indisponible ou corrompu : on repart propre */
  }
  db = etatInitial();
  sauver();
  return db;
}

function recalerCalendrier() {
  const aVenir = db.matchs.filter((m) => m.statut === 'a_venir');
  if (!aVenir.length) return;
  const premier = Math.min(...aVenir.map((m) => new Date(m.debut).getTime()));
  const retard = Date.now() + 2 * 3600 * 1000 - premier;
  if (retard <= 0) return; // le calendrier est encore d'actualité
  aVenir.forEach((m) => {
    m.debut = new Date(new Date(m.debut).getTime() + retard).toISOString();
  });
  sauver();
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(db));
  } catch {
    /* mode navigation privée : on continue en mémoire seule */
  }
}

function uid(prefixe) {
  return `${prefixe}-${Math.random().toString(36).slice(2, 10)}`;
}

function equipe(id) {
  return charger().equipes.find((e) => e.id === id);
}

/** Enrichit un match brut avec les noms d'équipes, les Elo et l'événement. */
function enrichir(m) {
  if (!m) return null;
  const a = equipe(m.equipe_a_id);
  const b = equipe(m.equipe_b_id);
  const ev = charger().evenements.find((e) => e.id === m.event_id);
  return {
    ...m,
    equipe_a: a?.nom ?? '?',
    equipe_b: b?.nom ?? '?',
    tag_a: a?.tag ?? '?',
    tag_b: b?.tag ?? '?',
    elo_a: a?.elo ?? core.ELO_DEFAUT,
    elo_b: b?.elo ?? core.ELO_DEFAUT,
    evenement: ev?.nom ?? '',
  };
}

/* ------------------------------------------------------------------ */
/* Saisons                                                             */
/* ------------------------------------------------------------------ */

/** Statut d'une saison au regard de la date du jour. */
function statutSaison(s) {
  const maintenant = Date.now();
  if (maintenant < new Date(s.debut)) return 'a_venir';
  if (maintenant > new Date(s.fin)) return 'terminee';
  return 'en_cours';
}

export async function listerSaisons() {
  return charger()
    .saisons.map((s) => ({ ...s, statut: statutSaison(s) }))
    .sort((a, b) => new Date(a.debut) - new Date(b.debut));
}

/**
 * Saison active : celle choisie explicitement, sinon celle qui est en cours,
 * sinon la plus récente. Il y a toujours une saison courante.
 */
export async function saisonCourante() {
  const d = charger();
  const toutes = await listerSaisons();
  const choisie = toutes.find((s) => s.id === d.saison_choisie);
  if (choisie) return choisie;
  return toutes.find((s) => s.statut === 'en_cours') ?? toutes[toutes.length - 1];
}

export async function choisirSaison(id) {
  const d = charger();
  if (!d.saisons.some((s) => s.id === id)) throw new Error('Saison inconnue.');
  d.saison_choisie = id;
  sauver();
  return saisonCourante();
}

/**
 * Participation d'un joueur à une saison, créée à la volée au premier accès.
 * C'est ce qui donne à chacun un solde neuf à chaque nouvelle saison.
 */
function participation(userId, saisonId) {
  const d = charger();
  let p = d.participations.find((x) => x.user_id === userId && x.saison_id === saisonId);
  if (!p) {
    const saison = d.saisons.find((s) => s.id === saisonId);
    p = {
      saison_id: saisonId,
      user_id: userId,
      solde: saison?.solde_initial ?? core.SOLDE_INITIAL,
      derniere_prime: null,
      serie_prime: 0,
      rejoint_le: new Date().toISOString(),
    };
    d.participations.push(p);
    sauver();
  }
  return p;
}

/** Solde d'un rival pour une saison donnée (données de démo). */
function soldeRival(rival, saisonId) {
  const d = charger();
  const p = d.participations.find((x) => x.user_id === rival.id && x.saison_id === saisonId);
  if (p) return p.solde;
  return rival.soldes?.[saisonId] ?? d.saisons.find((s) => s.id === saisonId)?.solde_initial ?? core.SOLDE_INITIAL;
}

/* ------------------------------------------------------------------ */
/* Authentification simulée                                            */
/* ------------------------------------------------------------------ */

export async function utilisateurCourant() {
  const d = charger();
  if (!d.utilisateur) return null;
  const saison = await saisonCourante();
  const p = participation(d.utilisateur.id, saison.id);
  const fav = d.utilisateur.equipe_favorite_id ? equipe(d.utilisateur.equipe_favorite_id) : null;
  return {
    ...d.utilisateur,
    solde: p.solde,
    saison_id: saison.id,
    derniere_prime: p.derniere_prime,
    serie_prime: p.serie_prime ?? 0,
    equipe_favorite: fav ? { id: fav.id, nom: fav.nom, tag: fav.tag, jeu: fav.jeu } : null,
    pari_auto_mode: d.utilisateur.pari_auto_mode ?? 'off',
    pari_auto_mise: d.utilisateur.pari_auto_mise ?? core.PARI_AUTO_MISE_DEFAUT,
    note: d.utilisateur.note ?? core.NOTE_INITIALE,
    note_paris: d.utilisateur.note_paris ?? 0,
  };
}

export async function connexion(pseudo, { equipeFavoriteId = null } = {}) {
  const d = charger();
  d.utilisateur = {
    id: uid('u'),
    pseudo: pseudo.trim().slice(0, 20) || 'Joueur',
    equipe_favorite_id: equipeFavoriteId,
    pari_auto_mode: 'off',
    pari_auto_mise: core.PARI_AUTO_MISE_DEFAUT,
    note: core.NOTE_INITIALE,
    note_paris: 0,
    cree_le: new Date().toISOString(),
  };
  sauver();
  return utilisateurCourant();
}

export async function deconnexion() {
  const d = charger();
  d.utilisateur = null;
  sauver();
}

export async function reinitialiser() {
  db = etatInitial();
  sauver();
}

/* ------------------------------------------------------------------ */
/* Matchs                                                              */
/* ------------------------------------------------------------------ */

export async function listerMatchs({ jeu = null, statut = 'a_venir', saison = null, equipe: equipeId = null } = {}) {
  const saisonId = saison ?? (await saisonCourante()).id;
  return charger()
    .matchs.filter((m) => m.saison_id === saisonId)
    .filter((m) => (statut ? m.statut === statut : true))
    .filter((m) => (jeu ? m.jeu === jeu : true))
    .filter((m) => (equipeId ? m.equipe_a_id === equipeId || m.equipe_b_id === equipeId : true))
    .map(enrichir)
    // Trié par date, comme le fait la requête Supabase : un match créé après
    // coup doit se ranger à sa date, pas à la fin de la liste.
    .sort((x, y) => new Date(x.debut) - new Date(y.debut));
}

export async function lireMatch(id) {
  return enrichir(charger().matchs.find((x) => x.id === id));
}

export async function cotesDuMatch(id) {
  const m = await lireMatch(id);
  return m ? core.marchesDuMatch(m) : [];
}

/* ------------------------------------------------------------------ */
/* Paris                                                              */
/* ------------------------------------------------------------------ */

export async function placerPari({ matchId, marche, choix, mise }) {
  const d = charger();
  const u = d.utilisateur;
  if (!u) throw new Error('Connecte-toi pour miser.');

  const m = d.matchs.find((x) => x.id === matchId);
  if (!m) throw new Error('Match introuvable.');
  if (m.statut !== 'a_venir') throw new Error('Ce match a déjà commencé.');
  if (new Date(m.debut) <= new Date()) throw new Error('Les mises sont fermées sur ce match.');

  const p = participation(u.id, m.saison_id);

  mise = Math.round(Number(mise));
  if (!Number.isFinite(mise) || mise < core.MISE_MIN) {
    throw new Error(`Mise minimale : ${core.MISE_MIN} Frags.`);
  }
  if (mise > core.MISE_MAX) throw new Error(`Mise maximale : ${core.MISE_MAX} Frags.`);
  if (mise > p.solde) throw new Error('Solde insuffisant.');

  // La cote est recalculée ici, côté "serveur" : on ne fait jamais confiance
  // à la cote envoyée par l'interface.
  const trouve = core.trouverChoix(enrichir(m), marche, choix);
  if (!trouve) throw new Error('Pari invalide.');

  const dejaMise = d.paris.find(
    (x) => x.user_id === u.id && x.match_id === matchId && x.marche === marche && x.choix === choix
  );
  if (dejaMise) throw new Error('Tu as déjà un pari en cours sur ce choix.');

  p.solde -= mise;
  const pari = {
    id: uid('p'),
    user_id: u.id,
    match_id: matchId,
    saison_id: m.saison_id,
    marche,
    choix,
    libelle_marche: trouve.marche.libelle,
    libelle_choix: trouve.choix.libelle,
    mise,
    cote: trouve.choix.cote,
    statut: 'en_cours',
    gain: 0,
    cree_le: new Date().toISOString(),
  };
  d.paris.push(pari);
  sauver();
  return pari;
}

export async function mesParis({ saison = null } = {}) {
  const d = charger();
  if (!d.utilisateur) return [];
  const saisonId = saison ?? (await saisonCourante()).id;
  return d.paris
    .filter((p) => p.user_id === d.utilisateur.id && p.saison_id === saisonId)
    .map((p) => ({ ...p, match: enrichir(d.matchs.find((m) => m.id === p.match_id)) }))
    .sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
}

/* ------------------------------------------------------------------ */
/* Règlement (côté admin)                                              */
/* ------------------------------------------------------------------ */

export async function reglerMatch(matchId, scoreA, scoreB) {
  const d = charger();
  const m = d.matchs.find((x) => x.id === matchId);
  if (!m) throw new Error('Match introuvable.');
  if (m.statut === 'termine') throw new Error('Match déjà réglé.');

  const attendu = Math.ceil(m.format / 2);
  if (Math.max(scoreA, scoreB) !== attendu || scoreA === scoreB) {
    throw new Error(`Score impossible pour un BO${m.format} : le vainqueur doit avoir ${attendu} maps.`);
  }

  // Filet anti-décrochage : on pose les paris automatiques manquants AVANT de
  // toucher aux Elo, pour que la cote servie soit bien celle d'avant-match.
  poserParisAutoMatch(matchId);

  m.score_a = scoreA;
  m.score_b = scoreB;
  m.statut = 'termine';

  let regles = 0;
  for (const p of d.paris.filter((x) => x.match_id === matchId && x.statut === 'en_cours')) {
    const gagnant = core.pariGagnant(p.marche, p.choix, scoreA, scoreB);
    p.statut = gagnant ? 'gagne' : 'perdu';
    p.gain = core.gainPari(p.mise, p.cote, gagnant);
    if (p.gain) participation(p.user_id, p.saison_id).solde += p.gain;

    // La note à vie suit chaque pari réglé, quelle que soit la saison.
    if (d.utilisateur && p.user_id === d.utilisateur.id) {
      d.utilisateur.note = core.majNote(d.utilisateur.note, p.cote, gagnant);
      d.utilisateur.note_paris = (d.utilisateur.note_paris ?? 0) + 1;
    }
    regles++;
  }

  const a = equipe(m.equipe_a_id);
  const b = equipe(m.equipe_b_id);
  const nouveaux = core.majElo(a.elo, b.elo, scoreA, scoreB);
  a.elo = nouveaux.elo_a;
  b.elo = nouveaux.elo_b;

  sauver();
  return { regles, elo_a: a.elo, elo_b: b.elo };
}

/* ------------------------------------------------------------------ */
/* Prime de connexion en série                                         */
/* ------------------------------------------------------------------ */

/** Nombre de paris posés par un joueur dans la fenêtre qui ouvre la bonification. */
function misesRecentes(userId, saisonId, maintenant = Date.now()) {
  return charger().paris.filter(
    (p) =>
      p.user_id === userId &&
      p.saison_id === saisonId &&
      maintenant - new Date(p.cree_le).getTime() <= core.PRIME_FENETRE_MISE_MS
  ).length;
}

/**
 * Ce que le joueur verrait sur son écran : où en est sa série, combien vaut la
 * prochaine prime, et si elle est réclamable tout de suite.
 */
export async function etatPrime({ maintenant = Date.now() } = {}) {
  const d = charger();
  if (!d.utilisateur) return null;
  const saison = await saisonCourante();
  const p = participation(d.utilisateur.id, saison.id);
  const serie = core.serieApres(p.serie_prime, p.derniere_prime, maintenant);
  const attente = core.attentePrime(p.derniere_prime, maintenant);
  return {
    serie_actuelle: p.serie_prime ?? 0,
    serie_prochaine: serie,
    montant: core.montantPrime({
      serie,
      solde: p.solde,
      misesRecentes: misesRecentes(d.utilisateur.id, saison.id, maintenant),
    }),
    disponible: attente === 0 && saison.statut === 'en_cours',
    attente_ms: attente,
    paliers: core.PRIME_PALIERS,
    total_encaisse: d.primes
      .filter((x) => x.user_id === d.utilisateur.id && x.saison_id === saison.id)
      .reduce((t, x) => t + x.montant, 0),
  };
}

/**
 * `maintenant` n'existe que pour les tests : il permet de rejouer une semaine
 * de connexions sans attendre sept jours. En production, c'est Postgres qui
 * donne l'heure et ce paramètre n'existe pas.
 */
export async function reclamerPrime({ maintenant = Date.now() } = {}) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  const saison = await saisonCourante();
  if (saison.statut === 'terminee') throw new Error('Cette saison est terminée.');
  if (saison.statut === 'a_venir') throw new Error("Cette saison n'a pas encore commencé.");

  const p = participation(d.utilisateur.id, saison.id);
  const attente = core.attentePrime(p.derniere_prime, maintenant);
  if (attente > 0) {
    throw new Error(`Prime déjà réclamée. Reviens dans ${Math.ceil(attente / 3600000)} h.`);
  }

  const serie = core.serieApres(p.serie_prime, p.derniere_prime, maintenant);
  const montant = core.montantPrime({
    serie,
    solde: p.solde,
    misesRecentes: misesRecentes(d.utilisateur.id, saison.id, maintenant),
  });

  p.solde += montant;
  p.derniere_prime = new Date(maintenant).toISOString();
  p.serie_prime = serie;
  d.primes.push({
    id: uid('pr'),
    user_id: d.utilisateur.id,
    saison_id: saison.id,
    montant,
    serie,
    cree_le: p.derniere_prime,
  });
  sauver();
  return { montant, serie };
}

/* ------------------------------------------------------------------ */
/* Équipe préférée                                                     */
/* ------------------------------------------------------------------ */

export async function listerEquipes({ jeu = null } = {}) {
  return charger()
    .equipes.filter((e) => (jeu ? e.jeu === jeu : true))
    .map((e) => ({ id: e.id, jeu: e.jeu, nom: e.nom, tag: e.tag, elo: e.elo }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function definirEquipeFavorite(equipeId) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  if (equipeId && !equipe(equipeId)) throw new Error('Équipe inconnue.');
  d.utilisateur.equipe_favorite_id = equipeId || null;
  sauver();
  return utilisateurCourant();
}

/* ------------------------------------------------------------------ */
/* Le call de la saison                                                */
/* ------------------------------------------------------------------ */

/** Équipes engagées dans un événement, sur une saison donnée. */
function equipesEvenement(eventId, saisonId) {
  const d = charger();
  const ids = new Set();
  d.matchs
    .filter((m) => m.event_id === eventId && m.saison_id === saisonId)
    .forEach((m) => {
      ids.add(m.equipe_a_id);
      ids.add(m.equipe_b_id);
    });
  return [...ids].map((id) => equipe(id)).filter(Boolean);
}

/**
 * Événements jouables d'une saison, avec leur statut vis-à-vis du call.
 * Un call se pose tant que l'événement n'a pas commencé : une fois le premier
 * match lancé, le pronostic n'a plus de mérite.
 */
export async function listerEvenementsSaison({ saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  const parEvenement = new Map();
  for (const m of d.matchs.filter((x) => x.saison_id === saisonId)) {
    const liste = parEvenement.get(m.event_id) ?? [];
    liste.push(m);
    parEvenement.set(m.event_id, liste);
  }

  return [...parEvenement.entries()]
    .map(([id, matchs]) => {
      const ev = d.evenements.find((e) => e.id === id);
      const debut = Math.min(...matchs.map((m) => new Date(m.debut).getTime()));
      const resultat = d.resultats_evenement.find(
        (r) => r.event_id === id && r.saison_id === saisonId
      );
      const gagnant = resultat ? equipe(resultat.equipe_id) : null;
      return {
        id,
        nom: ev?.nom ?? id,
        jeu: ev?.jeu ?? matchs[0].jeu,
        tier: ev?.tier ?? 'A',
        saison_id: saisonId,
        debut: new Date(debut).toISOString(),
        nb_matchs: matchs.length,
        nb_equipes: equipesEvenement(id, saisonId).length,
        statut: resultat ? 'regle' : debut > Date.now() ? 'ouvert' : 'verrouille',
        vainqueur_id: resultat?.equipe_id ?? null,
        vainqueur: gagnant?.nom ?? null,
      };
    })
    .sort((a, b) => new Date(a.debut) - new Date(b.debut));
}

export async function cotesEvenement(eventId, { saison = null } = {}) {
  const saisonId = saison ?? (await saisonCourante()).id;
  const equipes = equipesEvenement(eventId, saisonId);
  if (!equipes.length) throw new Error('Aucune équipe engagée dans cet événement.');
  return core.cotesEvenement(
    equipes.map((e) => ({ id: e.id, nom: e.nom, tag: e.tag, jeu: e.jeu, elo: e.elo }))
  );
}

function enrichirCall(c) {
  if (!c) return null;
  const d = charger();
  const eq = equipe(c.equipe_id);
  const ev = d.evenements.find((e) => e.id === c.event_id);
  return {
    ...c,
    equipe: eq?.nom ?? '?',
    tag: eq?.tag ?? '?',
    jeu: eq?.jeu ?? null,
    evenement: ev?.nom ?? c.event_id,
    gain_potentiel: Math.round(c.mise * c.cote),
  };
}

export async function monCall({ saison = null } = {}) {
  const d = charger();
  if (!d.utilisateur) return null;
  const saisonId = saison ?? (await saisonCourante()).id;
  return enrichirCall(
    d.calls.find((c) => c.user_id === d.utilisateur.id && c.saison_id === saisonId)
  );
}

export async function placerCall({ eventId, equipeId, mise }) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi pour poser ton call.');
  const saison = await saisonCourante();
  if (saison.statut !== 'en_cours') throw new Error("Cette saison n'est pas ouverte.");

  if (d.calls.some((c) => c.user_id === d.utilisateur.id && c.saison_id === saison.id)) {
    throw new Error('Tu as déjà posé ton call pour cette saison.');
  }

  const evenements = await listerEvenementsSaison({ saison: saison.id });
  const ev = evenements.find((e) => e.id === eventId);
  if (!ev) throw new Error('Événement inconnu pour cette saison.');
  if (ev.statut !== 'ouvert') throw new Error('Cet événement a déjà commencé : le call est fermé.');

  mise = Math.round(Number(mise));
  if (!Number.isFinite(mise) || mise < core.CALL_MISE_MIN) {
    throw new Error(`Mise minimale du call : ${core.CALL_MISE_MIN} Frags.`);
  }
  if (mise > core.CALL_MISE_MAX) {
    throw new Error(`Mise maximale du call : ${core.CALL_MISE_MAX} Frags.`);
  }

  const cotes = await cotesEvenement(eventId, { saison: saison.id });
  const choisi = cotes.find((c) => c.id === equipeId);
  if (!choisi) throw new Error("Cette équipe ne participe pas à l'événement.");

  const p = participation(d.utilisateur.id, saison.id);
  if (mise > p.solde) throw new Error('Solde insuffisant.');
  p.solde -= mise;

  const call = {
    id: uid('c'),
    user_id: d.utilisateur.id,
    saison_id: saison.id,
    event_id: eventId,
    equipe_id: equipeId,
    mise,
    cote: choisi.cote,
    statut: 'en_cours',
    gain: 0,
    cree_le: new Date().toISOString(),
  };
  d.calls.push(call);
  sauver();
  return enrichirCall(call);
}

/** Côté admin : désigner le vainqueur d'un événement et régler les calls. */
export async function reglerEvenement(eventId, equipeId, { saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  if (d.resultats_evenement.some((r) => r.event_id === eventId && r.saison_id === saisonId)) {
    throw new Error('Événement déjà réglé.');
  }
  if (!equipesEvenement(eventId, saisonId).some((e) => e.id === equipeId)) {
    throw new Error("Cette équipe ne participe pas à l'événement.");
  }

  d.resultats_evenement.push({
    saison_id: saisonId,
    event_id: eventId,
    equipe_id: equipeId,
    regle_le: new Date().toISOString(),
  });

  let regles = 0;
  for (const c of d.calls.filter(
    (x) => x.event_id === eventId && x.saison_id === saisonId && x.statut === 'en_cours'
  )) {
    const gagnant = c.equipe_id === equipeId;
    c.statut = gagnant ? 'gagne' : 'perdu';
    c.gain = gagnant ? Math.round(c.mise * c.cote) : 0;
    if (c.gain) participation(c.user_id, c.saison_id).solde += c.gain;
    regles++;
  }
  sauver();
  return { regles };
}

/* ------------------------------------------------------------------ */
/* Rivalité de la semaine                                              */
/* ------------------------------------------------------------------ */

/**
 * En démo, les rivaux n'ont pas de paris réels : leur bilan hebdomadaire est
 * dérivé de leur identifiant et de la semaine, donc stable et crédible.
 * En production, ce chiffre vient des paris réellement réglés.
 */
function bilanSemaineJoueur(userId, saisonId, depuis) {
  const d = charger();
  if (d.utilisateur && userId === d.utilisateur.id) {
    return core.bilanPeriode(
      d.paris.filter((p) => p.user_id === userId && p.saison_id === saisonId),
      depuis
    );
  }
  const graine = core.empreinte(`${userId}|${core.semaineIso()}`);
  const paris = 2 + (graine % 6);
  return {
    paris,
    gagnes: graine % (paris + 1),
    mises: 100 * paris,
    gains: 0,
    net: ((graine >>> 3) % 1200) - 500,
    simule: true,
  };
}

export async function rivaliteSemaine({ saison = null, ligue = null } = {}) {
  const d = charger();
  if (!d.utilisateur) return null;
  const saisonId = saison ?? (await saisonCourante()).id;
  const classement = ligue
    ? await classementLigue(ligue, { saison: saisonId })
    : await classementGlobal({ saison: saisonId });

  const rival = core.choisirRival(d.utilisateur.id, classement);
  if (!rival) return null;

  const moi = classement.find((l) => l.id === d.utilisateur.id);
  const depuis = core.debutSemaine();
  return {
    semaine: core.semaineIso(),
    depuis: depuis.toISOString(),
    moi: { ...moi, rang: classement.indexOf(moi) + 1, bilan: bilanSemaineJoueur(moi.id, saisonId, depuis) },
    rival: {
      ...rival,
      rang: classement.indexOf(rival) + 1,
      bilan: bilanSemaineJoueur(rival.id, saisonId, depuis),
    },
    ecart: moi.solde - rival.solde,
  };
}

/* ------------------------------------------------------------------ */
/* Ligues                                                              */
/* ------------------------------------------------------------------ */

export async function creerLigue(nom) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  if (!nom.trim()) throw new Error('Donne un nom à ta ligue.');
  const ligue = {
    id: uid('l'),
    nom: nom.trim().slice(0, 40),
    code: core.genererCodeLigue(),
    createur_id: d.utilisateur.id,
    cree_le: new Date().toISOString(),
  };
  d.ligues.push(ligue);
  d.membres.push({ league_id: ligue.id, user_id: d.utilisateur.id });
  // En démo, on peuple la ligue de rivaux pour que le classement vive.
  d.rivaux.slice(0, 4).forEach((r) => d.membres.push({ league_id: ligue.id, user_id: r.id }));
  sauver();
  return ligue;
}

export async function rejoindreLigue(code) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  const ligue = d.ligues.find((l) => l.code === code.trim().toUpperCase());
  if (!ligue) throw new Error('Aucune ligue avec ce code.');
  if (d.membres.some((m) => m.league_id === ligue.id && m.user_id === d.utilisateur.id)) {
    throw new Error('Tu es déjà dans cette ligue.');
  }
  d.membres.push({ league_id: ligue.id, user_id: d.utilisateur.id });
  sauver();
  return ligue;
}

export async function mesLigues() {
  const d = charger();
  if (!d.utilisateur) return [];
  return d.ligues
    .filter((l) => d.membres.some((m) => m.league_id === l.id && m.user_id === d.utilisateur.id))
    .map((l) => ({ ...l, nb_membres: d.membres.filter((m) => m.league_id === l.id).length }));
}

export async function lireLigue(id) {
  return charger().ligues.find((l) => l.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Classements et statistiques                                         */
/* ------------------------------------------------------------------ */

function statsJoueur(userId, saisonId) {
  const d = charger();
  const paris = d.paris.filter(
    (p) => p.user_id === userId && p.saison_id === saisonId && p.statut !== 'en_cours'
  );
  const mises = paris.reduce((t, p) => t + p.mise, 0);
  const gains = paris.reduce((t, p) => t + p.gain, 0);
  return {
    paris: paris.length,
    gagnes: paris.filter((p) => p.statut === 'gagne').length,
    mises,
    gains,
    roi: core.roi(mises, gains),
  };
}

async function ligne(userId, saisonId) {
  const d = charger();
  if (d.utilisateur && userId === d.utilisateur.id) {
    const fav = d.utilisateur.equipe_favorite_id ? equipe(d.utilisateur.equipe_favorite_id) : null;
    return {
      id: userId,
      pseudo: d.utilisateur.pseudo,
      solde: participation(userId, saisonId).solde,
      moi: true,
      tag_favori: fav?.tag ?? null,
      equipe_favorite: fav?.nom ?? null,
      note: d.utilisateur.note ?? core.NOTE_INITIALE,
      note_paris: d.utilisateur.note_paris ?? 0,
      ...statsJoueur(userId, saisonId),
    };
  }
  const r = d.rivaux.find((x) => x.id === userId);
  const favRival = r?.equipe_favorite_id ? equipe(r.equipe_favorite_id) : null;
  return {
    id: userId,
    pseudo: r?.pseudo ?? 'Joueur',
    solde: soldeRival(r ?? { id: userId }, saisonId),
    moi: false,
    tag_favori: favRival?.tag ?? null,
    equipe_favorite: favRival?.nom ?? null,
    note: r?.note ?? core.NOTE_INITIALE,
    note_paris: r?.note_paris ?? 0,
    paris: r?.paris ?? 0,
    gagnes: r?.gagnes ?? 0,
    // Les rivaux de démonstration n'ont pas de paris réels : leur retour sur
    // mise est dérivé de leur taux de réussite, pour que le tableau vive.
    mises: (r?.paris ?? 0) * 100,
    gains: Math.round((r?.gagnes ?? 0) * 100 * 2.1),
    roi: r?.paris ? core.roi(r.paris * 100, r.gagnes * 100 * 2.1) : 0,
  };
}

export async function classementLigue(ligueId, { saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  const ids = d.membres.filter((m) => m.league_id === ligueId).map((m) => m.user_id);
  const lignes = await Promise.all(ids.map((id) => ligne(id, saisonId)));
  return lignes.sort((a, b) => b.solde - a.solde);
}

export async function classementGlobal({ saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  const ids = d.rivaux.map((r) => r.id);
  if (d.utilisateur) ids.push(d.utilisateur.id);
  const lignes = await Promise.all(ids.map((id) => ligne(id, saisonId)));
  return lignes.sort((a, b) => b.solde - a.solde);
}

export async function statistiques({ saison = null } = {}) {
  const d = charger();
  if (!d.utilisateur) return null;
  const saisonId = saison ?? (await saisonCourante()).id;
  return {
    ...statsJoueur(d.utilisateur.id, saisonId),
    solde: participation(d.utilisateur.id, saisonId).solde,
  };
}

/** Palmarès : le vainqueur de chaque saison déjà terminée. */
export async function palmares() {
  const saisons = (await listerSaisons()).filter((s) => statutSaison(s) === 'terminee');
  const resultat = [];
  for (const s of saisons) {
    const classement = await classementGlobal({ saison: s.id });
    resultat.push({ saison: s, vainqueur: classement[0] ?? null });
  }
  return resultat.reverse();
}

/* ------------------------------------------------------------------ */
/* Prono par défaut (anti-décrochage)                                  */
/* ------------------------------------------------------------------ */

export async function definirPariAuto({ mode, mise }) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  if (!core.PARI_AUTO_MODES.includes(mode)) throw new Error('Mode inconnu.');
  mise = Math.round(Number(mise));
  if (!Number.isFinite(mise) || mise < core.PARI_AUTO_MISE_MIN || mise > core.PARI_AUTO_MISE_MAX) {
    throw new Error(
      `Mise automatique entre ${core.PARI_AUTO_MISE_MIN} et ${core.PARI_AUTO_MISE_MAX} Frags.`
    );
  }
  d.utilisateur.pari_auto_mode = mode;
  d.utilisateur.pari_auto_mise = mise;
  sauver();
  return utilisateurCourant();
}

/**
 * Pose le pari automatique d'un joueur sur un match donné, si toutes les
 * conditions sont réunies. Retourne le pari créé, ou null.
 *
 * Volontairement silencieux : aucune de ces situations n'est une erreur, elles
 * signifient juste « pas de pari automatique ici ».
 */
function poserPariAutoJoueur(userId, m) {
  const d = charger();
  const profil = d.utilisateur && d.utilisateur.id === userId ? d.utilisateur : null;
  if (!profil) return null;

  const mode = profil.pari_auto_mode ?? 'off';
  if (!core.eligibleAuPariAuto({ mode, equipeFavoriteId: profil.equipe_favorite_id, match: m })) {
    return null;
  }
  if (d.paris.some((p) => p.user_id === userId && p.match_id === m.id)) return null;

  const saison = d.saisons.find((s) => s.id === m.saison_id);
  if (!saison || statutSaison(saison) !== 'en_cours') return null;

  const mise = Math.min(profil.pari_auto_mise ?? core.PARI_AUTO_MISE_DEFAUT, core.MISE_MAX);
  const p = participation(userId, m.saison_id);
  if (p.solde < mise) return null;

  const choix = core.choixAutomatique(core.marchesDuMatch(enrichir(m)));
  if (!choix) return null;

  p.solde -= mise;
  const pari = {
    id: uid('p'),
    user_id: userId,
    match_id: m.id,
    saison_id: m.saison_id,
    marche: 'vainqueur',
    choix: choix.cle,
    libelle_marche: 'Vainqueur du match',
    libelle_choix: choix.libelle,
    mise,
    cote: choix.cote,
    statut: 'en_cours',
    gain: 0,
    auto: true,
    cree_le: new Date().toISOString(),
  };
  d.paris.push(pari);
  sauver();
  return pari;
}

/** Tous les paris automatiques manquants sur un match. */
function poserParisAutoMatch(matchId) {
  const d = charger();
  const m = d.matchs.find((x) => x.id === matchId);
  if (!m || m.statut === 'termine') return 0;
  return d.utilisateur && poserPariAutoJoueur(d.utilisateur.id, m) ? 1 : 0;
}

/**
 * Rattrapage : appelé à l'ouverture de l'application, il pose les paris
 * automatiques des matchs qui ont commencé sans que le joueur ait misé.
 * C'est ce qui rend le pari par défaut visible avant le résultat, et pas
 * seulement dans l'historique.
 */
export async function rattraperParisAuto({ saison = null, maintenant = Date.now() } = {}) {
  const d = charger();
  if (!d.utilisateur) return { poses: 0 };
  if ((d.utilisateur.pari_auto_mode ?? 'off') === 'off') return { poses: 0 };

  const saisonId = saison ?? (await saisonCourante()).id;
  let poses = 0;
  for (const m of d.matchs.filter(
    (x) => x.saison_id === saisonId && x.statut === 'a_venir' && new Date(x.debut).getTime() <= maintenant
  )) {
    if (poserPariAutoJoueur(d.utilisateur.id, m)) poses++;
  }
  return { poses };
}

/* ------------------------------------------------------------------ */
/* Défi de ligue : la compétition tirée au hasard                       */
/* ------------------------------------------------------------------ */

export async function defiLigue(ligueId, { saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  const defi = (d.defis ?? []).find((x) => x.ligue_id === ligueId && x.saison_id === saisonId);
  if (!defi) return null;
  const ev = d.evenements.find((e) => e.id === defi.event_id);
  return { ...defi, nom: ev?.nom ?? defi.event_id, jeu: ev?.jeu ?? null };
}

/**
 * Tire un tournoi au sort pour une ligue. Un seul par saison, tiré par le
 * créateur, et uniquement parmi les tournois qui ont encore des matchs à
 * jouer — tirer un tournoi déjà fini n'aurait aucun intérêt.
 */
export async function tirerDefi(ligueId, { saison = null } = {}) {
  const d = charger();
  if (!d.utilisateur) throw new Error('Connecte-toi.');
  const ligue = d.ligues.find((l) => l.id === ligueId);
  if (!ligue) throw new Error('Ligue introuvable.');
  if (ligue.createur_id !== d.utilisateur.id) {
    throw new Error("Seul le créateur de la ligue peut tirer le défi.");
  }
  const saisonId = saison ?? (await saisonCourante()).id;
  d.defis = d.defis ?? [];
  if (d.defis.some((x) => x.ligue_id === ligueId && x.saison_id === saisonId)) {
    throw new Error('Le défi de cette saison est déjà tiré.');
  }

  const maintenant = Date.now();
  const candidats = [
    ...new Set(
      d.matchs
        .filter(
          (m) => m.saison_id === saisonId && m.statut === 'a_venir' && new Date(m.debut).getTime() > maintenant
        )
        .map((m) => m.event_id)
    ),
  ];
  if (!candidats.length) throw new Error('Aucun tournoi n’a encore de match à jouer.');

  const defi = {
    ligue_id: ligueId,
    saison_id: saisonId,
    event_id: candidats[Math.floor(Math.random() * candidats.length)],
    tire_par: d.utilisateur.id,
    tire_le: new Date().toISOString(),
  };
  d.defis.push(defi);
  sauver();
  return defiLigue(ligueId, { saison: saisonId });
}

/**
 * Classement du défi : seuls les paris posés sur les matchs du tournoi tiré
 * comptent, et on classe au bénéfice net — pas au solde, qui mélangerait tout
 * le reste de la saison.
 */
export async function classementDefi(ligueId, { saison = null } = {}) {
  const d = charger();
  const saisonId = saison ?? (await saisonCourante()).id;
  const defi = await defiLigue(ligueId, { saison: saisonId });
  if (!defi) return [];

  const matchs = new Set(
    d.matchs.filter((m) => m.event_id === defi.event_id && m.saison_id === saisonId).map((m) => m.id)
  );
  const ids = d.membres.filter((m) => m.league_id === ligueId).map((m) => m.user_id);

  return ids
    .map((id) => {
      const paris = d.paris.filter(
        (p) => p.user_id === id && matchs.has(p.match_id) && p.statut !== 'en_cours'
      );
      const mises = paris.reduce((t, p) => t + p.mise, 0);
      const gains = paris.reduce((t, p) => t + (p.gain || 0), 0);
      const r = d.rivaux.find((x) => x.id === id);
      return {
        id,
        pseudo: d.utilisateur?.id === id ? d.utilisateur.pseudo : (r?.pseudo ?? 'Joueur'),
        moi: d.utilisateur?.id === id,
        paris: paris.length,
        gagnes: paris.filter((p) => p.statut === 'gagne').length,
        mises,
        gains,
        net: gains - mises,
      };
    })
    .sort((a, b) => b.net - a.net || b.paris - a.paris);
}

/* ------------------------------------------------------------------ */
/* Profil d'analyste                                                   */
/* ------------------------------------------------------------------ */

export async function statistiquesDetaillees({ saison = null } = {}) {
  const d = charger();
  if (!d.utilisateur) return null;
  const saisonId = saison ?? (await saisonCourante()).id;

  const paris = d.paris
    .filter((p) => p.user_id === d.utilisateur.id && p.saison_id === saisonId && p.statut !== 'en_cours')
    .map((p) => {
      const m = d.matchs.find((x) => x.id === p.match_id);
      return { ...p, format: m?.format ?? null, jeu: m?.jeu ?? null, match: m };
    });

  const favId = d.utilisateur.equipe_favorite_id;
  const fav = favId ? equipe(favId) : null;
  const concerne = (p) =>
    fav && p.match && (p.match.equipe_a_id === fav.id || p.match.equipe_b_id === fav.id);

  const bloc = (liste) =>
    core.agreger(liste, () => 'tout')[0] ?? {
      cle: 'tout', paris: 0, gagnes: 0, mises: 0, gains: 0, net: 0, roi: 0,
    };

  return {
    total: bloc(paris),
    par_format: core.agreger(paris, 'format'),
    par_jeu: core.agreger(paris, 'jeu'),
    par_marche: core.agreger(paris, 'marche'),
    par_cote: core.agreger(paris, (p) => core.trancheCote(p.cote)),
    equipe_favorite: fav
      ? { nom: fav.nom, tag: fav.tag, avec: bloc(paris.filter(concerne)), sans: bloc(paris.filter((p) => !concerne(p))) }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

/**
 * Les badges se calculent sur TOUTE la carrière, pas sur la saison courante :
 * un badge qui disparaîtrait au changement de saison n'aurait aucun sens.
 */
export async function mesBadges() {
  const d = charger();
  if (!d.utilisateur) return null;
  const moi = d.utilisateur.id;

  const paris = d.paris
    .filter((p) => p.user_id === moi)
    .map((p) => ({ ...p, jeu: d.matchs.find((m) => m.id === p.match_id)?.jeu ?? null }));

  const ligues = d.ligues
    .filter((l) => d.membres.some((m) => m.league_id === l.id && m.user_id === moi))
    .map((l) => ({ ...l, nb_membres: d.membres.filter((m) => m.league_id === l.id).length }));

  const recap = core.recapPourBadges({
    paris,
    calls: d.calls.filter((c) => c.user_id === moi),
    serie_prime_max: d.primes
      .filter((x) => x.user_id === moi)
      .reduce((m, x) => Math.max(m, x.serie), 0),
    ligues,
    ligues_creees: d.ligues.filter((l) => l.createur_id === moi).length,
    a_equipe_favorite: Boolean(d.utilisateur.equipe_favorite_id),
  });

  return { recap, badges: core.evaluerBadges(recap) };
}

/* ------------------------------------------------------------------ */
/* Cartes « je l'avais dit »                                           */
/* ------------------------------------------------------------------ */

export async function mesCartes() {
  const d = charger();
  if (!d.utilisateur) return [];
  return d.paris
    .filter((p) => p.user_id === d.utilisateur.id)
    .map((p) => ({ ...p, match: enrichir(d.matchs.find((m) => m.id === p.match_id)) }))
    .filter(core.carteMeritee)
    .sort((a, b) => b.gain - a.gain);
}

/* ------------------------------------------------------------------ */
/* Création de compétition (console d'administration)                  */
/* ------------------------------------------------------------------ */

/**
 * Tous les tournois existants, y compris ceux qui n'ont encore aucun match.
 *
 * listerEvenementsSaison() les déduit des matchs : un tournoi neuf n'y figure
 * donc pas, et on ne pourrait jamais lui créer son premier match. C'est
 * exactement le genre de trou qu'un test de bout en bout révèle.
 */
export async function listerEvenements({ jeu = null } = {}) {
  return charger()
    .evenements.filter((e) => (jeu ? e.jeu === jeu : true))
    .map((e) => ({ ...e }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function creerEvenement({ nom, jeu, tier = 'A' }) {
  const d = charger();
  if (!String(nom || '').trim()) throw new Error('Donne un nom au tournoi.');
  if (!core.JEUX[jeu]) throw new Error('Jeu inconnu.');
  const ev = { id: core.identifiant('ev', nom), nom: nom.trim().slice(0, 60), jeu, tier };
  if (d.evenements.some((x) => x.id === ev.id)) throw new Error('Un tournoi porte déjà ce nom.');
  d.evenements.push(ev);
  sauver();
  return ev;
}

export async function creerEquipe({ nom, tag, jeu, elo = core.ELO_DEFAUT }) {
  const d = charger();
  const erreurs = core.validerEquipe({ nom, tag, jeu, elo });
  if (erreurs.length) throw new Error(erreurs.join(' '));
  const e = {
    id: core.identifiant('eq', nom),
    jeu,
    nom: nom.trim().slice(0, 40),
    tag: tag.trim().toUpperCase(),
    elo: Math.round(Number(elo)),
  };
  if (d.equipes.some((x) => x.id === e.id)) throw new Error('Une équipe porte déjà ce nom.');
  d.equipes.push(e);
  sauver();
  return e;
}

export async function creerMatch({ eventId, equipeAId, equipeBId, format, debut, saison = null }) {
  const d = charger();
  const erreurs = core.validerMatch({ eventId, equipeAId, equipeBId, format, debut });
  if (erreurs.length) throw new Error(erreurs.join(' '));

  const ev = d.evenements.find((x) => x.id === eventId);
  if (!ev) throw new Error('Tournoi inconnu.');
  const a = equipe(equipeAId);
  const b = equipe(equipeBId);
  if (!a || !b) throw new Error('Équipe inconnue.');
  if (a.jeu !== ev.jeu || b.jeu !== ev.jeu) {
    throw new Error(`Les deux équipes doivent jouer à ${core.JEUX[ev.jeu].nom}.`);
  }

  const saisonId = saison ?? (await saisonCourante()).id;
  const m = {
    id: uid('m'),
    event_id: eventId,
    jeu: ev.jeu,
    saison_id: saisonId,
    equipe_a_id: equipeAId,
    equipe_b_id: equipeBId,
    format: Number(format),
    debut: new Date(debut).toISOString(),
    statut: 'a_venir',
    score_a: null,
    score_b: null,
  };
  d.matchs.push(m);
  sauver();
  return enrichir(m);
}

/**
 * Annule un match et rembourse les paris.
 *
 * C'est le filet du cadrage : un match reporté ou forfait ne doit pas priver
 * les joueurs de leur mise. On rembourse à l'euro près, on ne touche PAS aux
 * notes ni aux Elo — un match qui n'a pas eu lieu n'apprend rien sur personne.
 */
export async function annulerMatch(matchId, { motif = '' } = {}) {
  const d = charger();
  const m = d.matchs.find((x) => x.id === matchId);
  if (!m) throw new Error('Match introuvable.');
  if (m.statut === 'termine') throw new Error('Un match déjà réglé ne peut plus être annulé.');
  if (m.statut === 'annule') throw new Error('Match déjà annulé.');

  let rembourses = 0;
  let total = 0;
  for (const p of d.paris.filter((x) => x.match_id === matchId && x.statut === 'en_cours')) {
    p.statut = 'rembourse';
    p.gain = p.mise;
    participation(p.user_id, p.saison_id).solde += p.mise;
    rembourses++;
    total += p.mise;
  }
  m.statut = 'annule';
  m.motif_annulation = String(motif).slice(0, 120) || null;
  sauver();
  return { rembourses, total };
}
