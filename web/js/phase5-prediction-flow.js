/**
 * Phase 5 — mobile-first prediction flow.
 *
 * This layer is intentionally additive: Match Center V4 remains the fallback,
 * while prediction selection opens a dedicated conviction bottom sheet.
 */
import { contexte } from './app.js';
import * as economie from './economy-api.js';
import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';
import { esc, toast } from './ui.js';
import { CONVICTIONS, projectionsConviction } from './prediction.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';
const HOST_ID = 'phase5-prediction-host';
let state = null;
let lockedSyncToken = 0;

function sessionCourante() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

async function rpcV2(nom, args = {}) {
  if (MODE_DEMO) throw new Error('Le flow classé nécessite Supabase.');
  const jeton = sessionCourante()?.access_token || SUPABASE_ANON_KEY;
  const controleur = new AbortController();
  const timeout = setTimeout(() => controleur.abort(), 12000);
  let reponse;
  try {
    reponse = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: controleur.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Le moteur de classement ne répond pas.');
    throw new Error('Impossible de joindre le moteur de classement.');
  } finally {
    clearTimeout(timeout);
  }

  const texte = await reponse.text();
  let donnees = null;
  try {
    donnees = texte ? JSON.parse(texte) : null;
  } catch {
    donnees = { message: texte };
  }
  if (!reponse.ok) {
    const erreur = new Error(donnees?.message || donnees?.hint || `Erreur ${reponse.status}`);
    erreur.status = reponse.status;
    erreur.code = donnees?.code;
    throw erreur;
  }
  return donnees;
}

function matchIdCourant() {
  const match = String(location.hash || '').match(/^#\/matchs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function host() {
  let el = document.getElementById(HOST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = HOST_ID;
    document.body.append(el);
  }
  return el;
}

function fermerSheet({ refresh = false } = {}) {
  state = null;
  host().replaceChildren();
  document.body.classList.remove('phase5-sheet-open');
  if (refresh) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

async function projectionMatch(matchId) {
  try {
    return await rpcV2('clutch_projection_match_frags_v2', { p_match_id: matchId });
  } catch {
    // La migration reste additive : tant qu'elle n'est pas appliquée, le
    // Match Center peut encore prévisualiser le barème normal existant.
    return economie.projectionMatchFrags(matchId);
  }
}

function convictionsPourChoix(choix, projection) {
  if (choix?.convictions && typeof choix.convictions === 'object') {
    return Object.fromEntries(Object.keys(CONVICTIONS).map((cle) => {
      const p = choix.convictions[cle];
      return [cle, p ? {
        conviction: cle,
        multiplicateur: Number(p.multiplicateur ?? CONVICTIONS[cle].multiplicateur),
        gain: Number(p.gain),
        perte: Number(p.perte),
        k_effectif: Number(p.k_effectif ?? projection.k),
      } : null];
    }).filter(([, valeur]) => valeur));
  }
  return projectionsConviction(choix?.proba_scoring ?? choix?.proba, { k: projection.k });
}

async function ouvrirSheet(btn) {
  const matchId = matchIdCourant();
  if (!matchId) return;

  document.querySelectorAll('.match-center [data-prono-choice].is-selected')
    .forEach((el) => el.classList.remove('is-selected'));
  btn.classList.add('is-selected');

  const autres = [...document.querySelectorAll('.match-center [data-prono-choice]')];
  const autre = autres.find((el) => el !== btn)?.dataset.libelle || '';
  state = {
    matchId,
    choix: btn.dataset.choix,
    equipe: btn.dataset.libelle || '',
    autre,
    conviction: 'normal',
    loading: true,
    submitting: false,
    projection: null,
    projections: null,
    success: null,
  };
  document.body.classList.add('phase5-sheet-open');
  renderSheet();

  if (!contexte.utilisateur) {
    state.loading = false;
    state.login = true;
    renderSheet();
    return;
  }

  try {
    const projection = await projectionMatch(matchId);
    if (!state || state.matchId !== matchId) return;
    const choix = projection?.choix?.find((c) => c.cle === state.choix);
    if (!choix) throw new Error('Projection indisponible pour ce choix.');
    state.projection = projection;
    state.projections = convictionsPourChoix(choix, projection);
    state.loading = false;
    renderSheet();
  } catch (error) {
    if (!state || state.matchId !== matchId) return;
    state.loading = false;
    state.error = error.message;
    renderSheet();
  }
}

function renduConvictions() {
  return Object.values(CONVICTIONS).map((c) => {
    const actif = state.conviction === c.id;
    return `<button class="phase5-conviction${actif ? ' is-active' : ''}" type="button" data-phase5-conviction="${c.id}" aria-pressed="${actif}">
      <span class="phase5-conviction__symbol">${esc(c.symbole)}</span>
      <strong>${esc(c.label)}</strong>
      <small>${esc(c.description)}</small>
      <i>${c.multiplicateur.toLocaleString('fr-FR')}×</i>
    </button>`;
  }).join('');
}

function renduImpact() {
  const p = state.projections?.[state.conviction];
  if (!p) return '';
  return `<div class="phase5-impact" aria-live="polite">
    <span><small>Si correct</small><strong class="positif">+${Math.abs(p.gain)} Frags</strong></span>
    <span><small>Si faux</small><strong class="negatif">−${Math.abs(p.perte)} Frags</strong></span>
  </div>`;
}

function renduChargement() {
  return `<div class="phase5-sheet__loading"><span class="spinner"></span><strong>Calcul de l'impact…</strong><small>La probabilité du match reste figée pour tous.</small></div>`;
}

function renduLogin() {
  return `<div class="phase5-sheet__login">
    <span class="phase5-sheet__eyebrow">TON PRONO</span>
    <h2>${esc(state.equipe)}</h2>
    <p>Ton choix est prêt. Crée ton profil pour l'enregistrer dans ton classement de saison.</p>
    <button class="phase5-confirm" type="button" data-phase5-login>Créer mon profil</button>
    <small>Aucune mise · aucun Frag dépensé.</small>
  </div>`;
}

function renduErreur() {
  return `<div class="phase5-sheet__error">
    <span class="phase5-sheet__eyebrow">PRONO INDISPONIBLE</span>
    <h2>Impossible de préparer ce choix.</h2>
    <p>${esc(state.error || 'Une erreur est survenue.')}</p>
    <button class="phase5-confirm phase5-confirm--ghost" type="button" data-phase5-close>Fermer</button>
  </div>`;
}

function renduSucces() {
  const resultat = state.success || {};
  const conviction = CONVICTIONS[resultat.conviction || state.conviction] || CONVICTIONS.normal;
  const gain = Number(resultat.gain_si_correct ?? state.projections?.[state.conviction]?.gain ?? 0);
  const perte = Number(resultat.perte_si_faux ?? state.projections?.[state.conviction]?.perte ?? 0);
  return `<div class="phase5-success">
    <div class="phase5-success__check" aria-hidden="true">✓</div>
    <span class="phase5-sheet__eyebrow">PRONO VERROUILLÉ</span>
    <h2>TU AS PRIS<br><strong>${esc(state.equipe)}.</strong></h2>
    <div class="phase5-success__meta"><span>${esc(conviction.label)} · ${conviction.multiplicateur.toLocaleString('fr-FR')}×</span><span>${esc(state.equipe)} vs ${esc(state.autre)}</span></div>
    <div class="phase5-impact phase5-impact--success">
      <span><small>Si correct</small><strong class="positif">+${Math.abs(gain)} Frags</strong></span>
      <span><small>Si faux</small><strong class="negatif">−${Math.abs(perte)} Frags</strong></span>
    </div>
    <p>Les Frags mesurent ton classement. Ils ne sont jamais dépensés.</p>
    <button class="phase5-confirm" type="button" data-phase5-done>Terminé</button>
  </div>`;
}

function renderSheet() {
  const el = host();
  if (!state) {
    el.replaceChildren();
    return;
  }

  let contenu = '';
  if (state.success) contenu = renduSucces();
  else if (state.login) contenu = renduLogin();
  else if (state.error) contenu = renduErreur();
  else if (state.loading) contenu = renduChargement();
  else {
    const p = state.projections?.[state.conviction];
    contenu = `<div class="phase5-sheet__body">
      <span class="phase5-sheet__eyebrow">TON PRONO</span>
      <div class="phase5-sheet__match"><small>${esc(state.equipe)} vs ${esc(state.autre)}</small><h2>${esc(state.equipe)}</h2></div>
      <div class="phase5-sheet__question"><strong>À QUEL POINT TU Y CROIS ?</strong><small>La conviction change l'impact sur ton rating, jamais un solde à dépenser.</small></div>
      <div class="phase5-convictions">${renduConvictions()}</div>
      ${renduImpact()}
      <div class="phase5-sheet__rule"><span>◆</span><p><strong>Frags = classement.</strong> Aucun Frag n'est engagé, bloqué ou dépensé.</p></div>
      <button class="phase5-confirm" type="button" data-phase5-confirm${state.submitting ? ' disabled' : ''}>${state.submitting ? 'Validation…' : `Valider · ${esc(CONVICTIONS[state.conviction].label)}`}</button>
      ${p ? `<small class="phase5-sheet__placement">${state.projection?.placements_restants > 0 ? `${state.projection.placements_restants} placement(s) restant(s)` : 'Rating établi'} · K effectif ${p.k_effectif}</small>` : ''}
    </div>`;
  }

  el.innerHTML = `<div class="phase5-backdrop" data-phase5-close></div>
    <section class="phase5-sheet" role="dialog" aria-modal="true" aria-label="Valider mon pronostic">
      <div class="phase5-sheet__handle" aria-hidden="true"></div>
      <button class="phase5-sheet__close" type="button" data-phase5-close aria-label="Fermer">×</button>
      ${contenu}
    </section>`;
}

async function confirmer() {
  if (!state || state.submitting || !state.projections) return;
  state.submitting = true;
  renderSheet();
  try {
    let resultat;
    try {
      resultat = await rpcV2('placer_pronostic_classe_v2', {
        p_match_id: state.matchId,
        p_choix: state.choix,
        p_conviction: state.conviction,
      });
    } catch (error) {
      // Compatibilité de transition : le choix Normal peut encore passer par
      // l'ancien RPC. Faible/Fort ne sont jamais silencieusement rétrogradés.
      if (state.conviction === 'normal') {
        resultat = await economie.placerPronosticClasse({ matchId: state.matchId, choix: state.choix });
        resultat = { ...resultat, conviction: 'normal', multiplicateur_conviction: 1 };
      } else {
        throw error;
      }
    }
    if (!state) return;
    state.submitting = false;
    state.success = resultat || { conviction: state.conviction };
    renderSheet();
    toast(`Pronostic verrouillé : ${state.equipe}`, 'succes');
  } catch (error) {
    if (!state) return;
    state.submitting = false;
    state.error = error.message;
    renderSheet();
  }
}

async function synchroniserPronoVerrouille(racine) {
  if (!contexte.utilisateur || !racine.querySelector('.match-ticket--locked')) return;
  if (racine.dataset.phase5Locked === '1') return;
  racine.dataset.phase5Locked = '1';
  const matchId = matchIdCourant();
  if (!matchId) return;
  const token = ++lockedSyncToken;
  try {
    const p = await rpcV2('clutch_mon_pronostic_match_v2', { p_match_id: matchId });
    if (!p || token !== lockedSyncToken || !document.contains(racine)) return;
    const conviction = CONVICTIONS[p.conviction] || CONVICTIONS.normal;
    const ticket = racine.querySelector('.match-ticket--locked');
    ticket?.querySelector('.phase5-locked-conviction')?.remove();
    const badge = document.createElement('span');
    badge.className = 'phase5-locked-conviction';
    badge.textContent = `${conviction.label} · ${conviction.multiplicateur.toLocaleString('fr-FR')}×`;
    ticket?.querySelector('.sur-titre')?.after(badge);
    const risques = ticket?.querySelectorAll('.ranked-risk strong');
    if (risques?.[0]) risques[0].textContent = `+${Math.abs(Number(p.gain_si_correct || 0))} 💥`;
    if (risques?.[1]) risques[1].textContent = `−${Math.abs(Number(p.perte_si_faux || 0))} 💥`;
    const ligne = racine.querySelector('.match-my-pick');
    if (ligne && !ligne.querySelector('.phase5-pick-conviction')) {
      const chip = document.createElement('span');
      chip.className = 'phase5-pick-conviction';
      chip.textContent = conviction.label;
      ligne.firstElementChild?.append(chip);
    }
  } catch {
    // Migration pas encore appliquée : le rendu V4 existant reste le fallback.
  }
}

function synchroniserMatchCenter() {
  const racine = document.querySelector('.match-center');
  if (!racine || !matchIdCourant()) return;
  if (racine.dataset.phase5Ready !== '1') {
    racine.dataset.phase5Ready = '1';
    racine.querySelectorAll('[data-prono-choice]').forEach((btn) => {
      btn.setAttribute('aria-haspopup', 'dialog');
      const aide = btn.querySelector('small');
      if (aide) aide.innerHTML = '<span class="phase5-choice-hint">Choisir ce camp → conviction</span>';
    });
    const meta = racine.querySelector('.match-markets__heading > span');
    if (meta) meta.textContent = 'Aucune mise · choisis ta conviction ensuite';
  }
  void synchroniserPronoVerrouille(racine);
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest?.('.match-center [data-prono-choice]');
  if (!btn || !matchIdCourant()) return;
  // Capture avant le handler historique du Match Center : une seule mécanique
  // de validation est active quand Phase 5 est chargée.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void ouvrirSheet(btn);
}, true);

document.addEventListener('click', (event) => {
  if (!state) return;
  const cible = event.target.closest?.('[data-phase5-close],[data-phase5-conviction],[data-phase5-confirm],[data-phase5-done],[data-phase5-login]');
  if (!cible) return;
  if (cible.matches('[data-phase5-close]')) fermerSheet();
  else if (cible.matches('[data-phase5-conviction]')) {
    state.conviction = cible.dataset.phase5Conviction;
    renderSheet();
  } else if (cible.matches('[data-phase5-confirm]')) void confirmer();
  else if (cible.matches('[data-phase5-done]')) fermerSheet({ refresh: true });
  else if (cible.matches('[data-phase5-login]')) {
    fermerSheet();
    localStorage.setItem('clutch:auth-intent', 'inscription');
    location.hash = '#/connexion';
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state) fermerSheet();
});

window.addEventListener('hashchange', () => {
  if (state) fermerSheet();
  requestAnimationFrame(synchroniserMatchCenter);
});

new MutationObserver(() => requestAnimationFrame(synchroniserMatchCenter))
  .observe(document.body, { childList: true, subtree: true });

synchroniserMatchCenter();
