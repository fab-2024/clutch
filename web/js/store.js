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

const CLE = 'clutch.demo.v3';

let db = null;

function etatInitial() {
  return {
    version: 3,
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
  };
}

export async function connexion(pseudo, { equipeFavoriteId = null } = {}) {
  const d = charger();
  d.utilisateur = {
    id: uid('u'),
    pseudo: pseudo.trim().slice(0, 20) || 'Joueur',
    equipe_favorite_id: equipeFavoriteId,
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
    .map(enrichir);
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

  m.score_a = scoreA;
  m.score_b = scoreB;
  m.statut = 'termine';

  let regles = 0;
  for (const p of d.paris.filter((x) => x.match_id === matchId && x.statut === 'en_cours')) {
    const gagnant = core.pariGagnant(p.marche, p.choix, scoreA, scoreB);
    p.statut = gagnant ? 'gagne' : 'perdu';
    p.gain = core.gainPari(p.mise, p.cote, gagnant);
    if (p.gain) participation(p.user_id, p.saison_id).solde += p.gain;
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
    paris: r?.paris ?? 0,
    gagnes: r?.gagnes ?? 0,
    mises: 0,
    gains: 0,
    roi: 0,
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
