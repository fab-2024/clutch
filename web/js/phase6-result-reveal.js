/**
 * Phase 6 — cinematic result reveal.
 *
 * A newly settled ranked prediction is revealed once as a full-screen moment.
 * Completed Match Centers can replay the same reveal without changing state.
 */
import { contexte } from './app.js';
import * as economie from './economy-api.js';
import { esc, nomJeu } from './ui.js';
import { CONVICTIONS } from './prediction.js';
import { presentationResultat, equipeChoisie, tagChoisi } from './result-reveal.js';

const HOST_ID = 'phase6-result-host';
const ROUTES_SANS_REVEAL = /^#\/(onboarding|connexion(?:-login)?)(?:$|[/?#])/;
const INTERVALLE_RESULTAT_MS = 60000;
let state = null;
let verificationEnCours = false;
let verificationPlanifiee = false;
let derniereVerification = 0;
let focusAvant = null;

function host() {
  let el = document.getElementById(HOST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = HOST_ID;
    document.body.append(el);
  }
  return el;
}

function matchIdCourant() {
  const match = String(location.hash || '').match(/^#\/matchs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function convictionInfo(resultat) {
  return CONVICTIONS[resultat?.conviction] || CONVICTIONS.normal;
}

function formatRang(rang) {
  const n = Number(rang);
  return Number.isFinite(n) && n > 0 ? `#${Math.trunc(n)}` : '—';
}

function scoreFinal(resultat) {
  return `${Number(resultat?.score_a ?? 0)} — ${Number(resultat?.score_b ?? 0)}`;
}

function renduRang(presentation, resultat) {
  const rang = presentation.rang;
  if (!rang.disponible) {
    return `<div class="phase6-stat phase6-stat--rank"><small>Classement</small><strong>Rang actualisé</strong><span>Ton rating a été recalculé.</span></div>`;
  }

  let detail = 'Rang maintenu';
  if (rang.monte) detail = `+${Math.abs(rang.delta)} place${Math.abs(rang.delta) > 1 ? 's' : ''}`;
  if (rang.descend) detail = `−${Math.abs(rang.delta)} place${Math.abs(rang.delta) > 1 ? 's' : ''}`;
  return `<div class="phase6-stat phase6-stat--rank${rang.monte ? ' is-up' : rang.descend ? ' is-down' : ''}">
    <small>Classement</small>
    <strong>${formatRang(resultat.rang_avant)} <i>→</i> ${formatRang(resultat.rang_apres)}</strong>
    <span>${detail}</span>
  </div>`;
}

function renduOverlay() {
  if (!state?.resultat) return '';
  const resultat = state.resultat;
  const p = presentationResultat(resultat);
  const conviction = convictionInfo(resultat);
  const choisie = equipeChoisie(resultat);
  const tag = tagChoisi(resultat) || choisie;
  const delta = Number(resultat.delta_frags ?? 0);
  const restants = Math.max(1, Number(resultat.restants || 1));
  const cta = state.replay ? 'Fermer' : restants > 1 ? 'Résultat suivant' : 'Continuer';

  return `<section class="phase6-reveal phase6-reveal--${p.tone}" role="dialog" aria-modal="true" aria-labelledby="phase6-title">
    <div class="phase6-reveal__atmosphere" aria-hidden="true">
      <i class="phase6-reveal__halo phase6-reveal__halo--1"></i>
      <i class="phase6-reveal__halo phase6-reveal__halo--2"></i>
      <i class="phase6-reveal__beam"></i>
      <i class="phase6-reveal__grain"></i>
    </div>

    <div class="phase6-reveal__shell">
      <header class="phase6-reveal__topline">
        <span>CLUTCH // RESULT</span>
        <span>${esc(nomJeu(resultat.jeu))} · ${esc(resultat.evenement || 'Match')}</span>
      </header>

      <main class="phase6-reveal__stage">
        <div class="phase6-reveal__kicker">${esc(p.kicker)}</div>
        <h1 id="phase6-title">${esc(p.headline)}</h1>

        <div class="phase6-reveal__duel" aria-label="Score final ${esc(resultat.equipe_a)} ${Number(resultat.score_a ?? 0)}, ${esc(resultat.equipe_b)} ${Number(resultat.score_b ?? 0)}">
          <div class="phase6-reveal__team${resultat.choix === 'a' ? ' is-picked' : ''}${Number(resultat.score_a) > Number(resultat.score_b) ? ' is-winner' : ''}">
            <span>${esc(resultat.tag_a || resultat.equipe_a)}</span>
            <strong>${esc(resultat.equipe_a)}</strong>
          </div>
          <div class="phase6-reveal__score"><small>FINAL</small><strong>${esc(scoreFinal(resultat))}</strong></div>
          <div class="phase6-reveal__team phase6-reveal__team--right${resultat.choix === 'b' ? ' is-picked' : ''}${Number(resultat.score_b) > Number(resultat.score_a) ? ' is-winner' : ''}">
            <span>${esc(resultat.tag_b || resultat.equipe_b)}</span>
            <strong>${esc(resultat.equipe_b)}</strong>
          </div>
        </div>

        <div class="phase6-reveal__pick">
          <span>TON CHOIX</span>
          <strong>${esc(tag)}</strong>
          <i>${esc(conviction.label)} · ${conviction.multiplicateur.toLocaleString('fr-FR')}×</i>
        </div>

        <div class="phase6-reveal__impact">
          <span>${delta >= 0 ? '+' : '−'}</span><strong>${Math.abs(delta)}</strong><em>FRAGS</em>
        </div>

        <div class="phase6-reveal__stats">
          ${renduRang(p, resultat)}
          <div class="phase6-stat phase6-stat--xp"><small>Progression</small><strong>+${p.xp} XP</strong><span>XP de résultat${p.gagne ? ' · réussite incluse' : ''}</span></div>
        </div>

        ${p.perdu ? '<p class="phase6-reveal__loss-note">Le rating baisse, mais ta progression continue. Le prochain call est déjà une nouvelle occasion.</p>' : '<p class="phase6-reveal__win-note">Ton call est passé. Le classement a bougé avec toi.</p>'}
      </main>

      <footer class="phase6-reveal__actions">
        <button class="phase6-reveal__cta" type="button" data-phase6-continue>${esc(cta)}</button>
        ${state.replay ? '' : `<button class="phase6-reveal__secondary" type="button" data-phase6-match>Voir le match</button>`}
        ${!state.replay && restants > 1 ? `<small>${restants - 1} autre${restants - 1 > 1 ? 's' : ''} résultat${restants - 1 > 1 ? 's' : ''} à révéler</small>` : ''}
      </footer>
    </div>
  </section>`;
}

function ouvrir(resultat, { replay = false } = {}) {
  if (!resultat?.id) return;
  focusAvant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state = { resultat, replay, closing: false };
  document.body.classList.add('phase6-reveal-open');
  host().innerHTML = renduOverlay();
  requestAnimationFrame(() => host().querySelector('[data-phase6-continue]')?.focus());
}

async function fermer({ allerAuMatch = false } = {}) {
  if (!state || state.closing) return;
  const courant = state;
  courant.closing = true;
  const overlay = host().querySelector('.phase6-reveal');
  overlay?.classList.add('is-leaving');

  if (!courant.replay) {
    try {
      await economie.marquerResultatRevele(courant.resultat.id);
    } catch (error) {
      courant.closing = false;
      overlay?.classList.remove('is-leaving');
      console.error('[Clutch] résultat non marqué comme révélé', error);
      return;
    }
  }

  const matchId = courant.resultat.match_id;
  const restants = Math.max(1, Number(courant.resultat.restants || 1));
  state = null;
  host().replaceChildren();
  document.body.classList.remove('phase6-reveal-open');

  if (allerAuMatch && matchId) {
    location.hash = `#/matchs/${encodeURIComponent(matchId)}`;
    return;
  }

  if (!courant.replay && restants > 1) {
    await verifierResultat({ force: true });
    return;
  }

  focusAvant?.focus?.();
  focusAvant = null;
}

async function verifierResultat({ force = false } = {}) {
  if (verificationEnCours || state || !contexte.utilisateur) return;
  if (ROUTES_SANS_REVEAL.test(location.hash || '')) return;
  if (document.body.classList.contains('phase5-sheet-open')) return;
  const maintenant = Date.now();
  if (!force && maintenant - derniereVerification < 1800) return;

  verificationEnCours = true;
  derniereVerification = maintenant;
  try {
    const resultat = await economie.prochainResultatAReveler();
    if (resultat?.id && !state) ouvrir(resultat);
  } catch (error) {
    if (!String(error?.message || '').toLowerCase().includes('function')) {
      console.debug('[Clutch] reveal indisponible', error?.message || error);
    }
  } finally {
    verificationEnCours = false;
  }
}

function planifierVerification() {
  if (verificationPlanifiee) return;
  verificationPlanifiee = true;
  requestAnimationFrame(() => {
    verificationPlanifiee = false;
    synchroniserMatchCenter();
    void verifierResultat();
  });
}

function synchroniserMatchCenter() {
  const racine = document.querySelector('.match-center');
  const matchId = matchIdCourant();
  if (!racine || !matchId || !contexte.utilisateur) return;
  const statut = racine.querySelector('.match-pick-status--win,.match-pick-status--loss');
  if (!statut || racine.querySelector('[data-phase6-replay]')) return;

  const heading = racine.querySelector('.match-my-picks__heading');
  if (!heading) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'phase6-replay';
  btn.dataset.phase6Replay = '1';
  btn.textContent = 'Revoir mon résultat';
  heading.append(btn);
}

async function rejouerDepuisMatch() {
  const matchId = matchIdCourant();
  if (!matchId || state) return;
  try {
    const resultat = await economie.resultatMatch(matchId);
    if (resultat?.id) ouvrir(resultat, { replay: true });
  } catch (error) {
    console.error('[Clutch] impossible de rejouer le résultat', error);
  }
}

document.addEventListener('click', (event) => {
  const replay = event.target.closest?.('[data-phase6-replay]');
  if (replay) {
    event.preventDefault();
    void rejouerDepuisMatch();
    return;
  }
  if (!state) return;
  if (event.target.closest?.('[data-phase6-continue]')) void fermer();
  else if (event.target.closest?.('[data-phase6-match]')) void fermer({ allerAuMatch: true });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state) {
    event.preventDefault();
    void fermer();
  }
});

window.addEventListener('hashchange', planifierVerification);
window.addEventListener('focus', () => void verifierResultat({ force: true }));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void verifierResultat({ force: true });
});

new MutationObserver(planifierVerification)
  .observe(document.body, { childList: true, subtree: true });

setInterval(() => {
  if (!document.hidden) void verifierResultat({ force: true });
}, INTERVALLE_RESULTAT_MS);

planifierVerification();
