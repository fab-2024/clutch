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
import { EQUIPES, EVENEMENTS, RIVAUX, construireMatchs } from './seed.js';

const CLE = 'clutch.demo.v1';

let db = null;

function etatInitial() {
  return {
    version: 1,
    cree_le: new Date().toISOString(),
    utilisateur: null,
    equipes: structuredClone(EQUIPES),
    evenements: structuredClone(EVENEMENTS),
    matchs: construireMatchs(),
    paris: [],
    ligues: [],
    membres: [],
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
/* Authentification simulée                                            */
/* ------------------------------------------------------------------ */

export async function utilisateurCourant() {
  return charger().utilisateur;
}

export async function connexion(pseudo) {
  const d = charger();
  d.utilisateur = {
    id: uid('u'),
    pseudo: pseudo.trim().slice(0, 20) || 'Joueur',
    solde: core.SOLDE_INITIAL,
    derniere_prime: null,
    cree_le: new Date().toISOString(),
  };
  sauver();
  return d.utilisateur;
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

export async function listerMatchs({ jeu = null, statut = 'a_venir' } = {}) {
  return charger()
    .matchs.filter((m) => (statut ? m.statut === statut : true))
    .filter((m) => (jeu ? m.jeu === jeu : true))
    .map(enrichir);
}

export async function lireMatch(id) {
  const m = charger().matchs.find((x) => x.id === id);
  return m ? enrichir(m) : null;
}

export async function cotesDuMatch(id) {
  const m = await lireMatch(id);
  return m ? core.marchesDuMatch(m) : [];
}

/* ------------------------------------------------------------------ */
/* Paris                                                               */
/* ------------------------------------------------------------------ */

export async function placerPari({ matchId, marche, choix, mise }) {
  const d = charger();
  const u = d.utilisateur;
  if (!u) throw new Error('Connecte-toi pour miser.');

  const m = d.matchs.find((x) => x.id === matchId);
  if (!m) throw new Error('Match introuvable.');
  if (m.statut !== 'a_venir') throw new Error('Ce match a déjà commencé.');
  if (new Date(m.debut) <= new Date()) throw new Error('Les mises sont fermées sur ce match.');

  mise = Math.round(Number(mise));
  if (!Number.isFinite(mise) || mise < core.MISE_MIN) {
    throw new Error(`Mise minimale : ${core.MISE_MIN} Frags.`);
  }
  if (mise > core.MISE_MAX) throw new Error(`Mise maximale : ${core.MISE_MAX} Frags.`);
  if (mise > u.solde) throw new Error('Solde insuffisant.');

  // La cote est recalculée ici, côté "serveur" : on ne fait jamais confiance
  // à la cote envoyée par l'interface.
  const trouve = core.trouverChoix(enrichir(m), marche, choix);
  if (!trouve) throw new Error('Pari invalide.');

  const dejaMise = d.paris.find(
    (p) => p.user_id === u.id && p.match_id === matchId && p.marche === marche && p.choix === choix
  );
  if (dejaMise) throw new Error('Tu as déjà un pari en cours sur ce choix.');

  u.solde -= mise;
  const pari = {
    id: uid('p'),
    user_id: u.id,
    match_id: matchId,
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

export async function mesParis() {
  const d = charger();
  if (!d.utilisateur) return [];
  return d.paris
    .filter((p) => p.user_id === d.utilisateur.id)
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
    if (p.gain && d.utilisateur && d.utilisateur.id === p.user_id) {
      d.utilisateur.solde += p.gain;
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
/* Prime quotidienne                                                   */
/* ------------------------------------------------------------------ */

export async function reclamerPrime() {
  const d = charger();
  const u = d.utilisateur;
  if (!u) throw new Error('Connecte-toi.');
  const derniere = u.derniere_prime ? new Date(u.derniere_prime) : null;
  if (derniere && Date.now() - derniere.getTime() < 24 * 3600 * 1000) {
    const reste = 24 * 3600 * 1000 - (Date.now() - derniere.getTime());
    throw new Error(`Prime déjà réclamée. Reviens dans ${Math.ceil(reste / 3600000)} h.`);
  }
  const montant = u.solde < core.SEUIL_FAILLITE ? core.BONUS_QUOTIDIEN * 2 : core.BONUS_QUOTIDIEN;
  u.solde += montant;
  u.derniere_prime = new Date().toISOString();
  sauver();
  return montant;
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
    .map((l) => ({
      ...l,
      nb_membres: d.membres.filter((m) => m.league_id === l.id).length,
    }));
}

function statsJoueur(userId) {
  const d = charger();
  const paris = d.paris.filter((p) => p.user_id === userId && p.statut !== 'en_cours');
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

export async function classementLigue(ligueId) {
  const d = charger();
  const ids = d.membres.filter((m) => m.league_id === ligueId).map((m) => m.user_id);
  const lignes = ids.map((id) => {
    if (d.utilisateur && id === d.utilisateur.id) {
      return { id, pseudo: d.utilisateur.pseudo, solde: d.utilisateur.solde, moi: true, ...statsJoueur(id) };
    }
    const r = d.rivaux.find((x) => x.id === id);
    return {
      id,
      pseudo: r?.pseudo ?? 'Joueur',
      solde: r?.solde ?? core.SOLDE_INITIAL,
      moi: false,
      paris: r?.paris ?? 0,
      gagnes: r?.gagnes ?? 0,
      mises: 0,
      gains: 0,
      roi: 0,
    };
  });
  return lignes.sort((a, b) => b.solde - a.solde);
}

export async function classementGlobal() {
  const d = charger();
  const lignes = d.rivaux.map((r) => ({
    id: r.id,
    pseudo: r.pseudo,
    solde: r.solde,
    paris: r.paris,
    gagnes: r.gagnes,
    moi: false,
  }));
  if (d.utilisateur) {
    lignes.push({
      id: d.utilisateur.id,
      pseudo: d.utilisateur.pseudo,
      solde: d.utilisateur.solde,
      moi: true,
      ...statsJoueur(d.utilisateur.id),
    });
  }
  return lignes.sort((a, b) => b.solde - a.solde);
}

export async function lireLigue(id) {
  return charger().ligues.find((l) => l.id === id) ?? null;
}

export async function statistiques() {
  const d = charger();
  if (!d.utilisateur) return null;
  return { ...statsJoueur(d.utilisateur.id), solde: d.utilisateur.solde };
}
