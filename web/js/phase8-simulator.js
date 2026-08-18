import { esc } from './ui.js';
import { CONVICTIONS } from './prediction.js';

const HOST = 'phase8-simulator-host';
const CONTROL = 'phase8-simulator-control';
let conviction = 'normal';

function disponible() {
  const h = location.hostname;
  return h.includes('agent-phase8-friend-challenges') || h === 'localhost' || h === '127.0.0.1';
}

function host() {
  let el = document.getElementById(HOST);
  if (!el) {
    el = document.createElement('div');
    el.id = HOST;
    document.body.append(el);
  }
  return el;
}

function joueur(pseudo, tag, equipe, conv, reponse = false, actif = false) {
  const c = CONVICTIONS[conv] || CONVICTIONS.normal;
  return `<article class="phase8-player${actif ? ' is-me' : ''}"><small>${reponse ? 'RÉPONSE' : 'CHALLENGER'}</small><strong class="phase8-player__pseudo">${esc(pseudo)}</strong><div class="phase8-player__team"><b>${esc(tag)}</b><span>${esc(equipe)}</span></div><div class="phase8-player__conviction">${esc(c.label)} · ${c.multiplicateur.toLocaleString('fr-FR')}×</div></article>`;
}

function convictions() {
  return Object.values(CONVICTIONS).map((c) => `<button class="phase8-conviction${conviction === c.id ? ' is-active' : ''}" type="button" data-phase8-sim-conviction="${c.id}"><span>${esc(c.symbole)}</span><strong>${esc(c.label)}</strong><small>${esc(c.description)}</small><i>${c.multiplicateur.toLocaleString('fr-FR')}×</i></button>`).join('');
}

function shell(contenu) {
  return `<section class="phase8-page phase8-page--simulation"><div class="phase8-shell"><header class="phase8-head"><a href="#/matchs">← Preview</a><span>CLUTCH // SIMULATION</span></header>${contenu}</div></section>`;
}

function invitation() {
  return shell(`<div class="phase8-hero phase8-hero--invite"><div class="phase8-eyebrow">INVITATION 1V1 · SIMULATION</div><h1>FABTHETAP TE DÉFIE.</h1><p>FabTheTap a pris <strong>VIT</strong> · Fort. Si tu acceptes, tu défends <strong>G2</strong>.</p><div class="phase8-matchline"><span>VIT</span><strong>VS</strong><span>G2</span><small>CS2 · IEM COLOGNE · 20:00</small></div><div class="phase8-versus phase8-versus--invite">${joueur('FabTheTap','VIT','Team Vitality','fort')}<div class="phase8-vs">VS</div>${joueur('TOI','G2','G2 Esports',conviction,true,true)}</div><div class="phase8-conviction-block"><div><small>TA CONVICTION</small><strong>À quel point tu assumes ce contre-call ?</strong></div><div class="phase8-convictions">${convictions()}</div></div><button class="phase8-btn phase8-btn--accept" type="button" data-phase8-sim-state="locked">Prendre G2 et verrouiller le duel</button><small class="phase8-auth-note">Simulation uniquement · aucun prono n’est créé.</small></div>`);
}

function locked() {
  return shell(`<div class="phase8-hero phase8-hero--locked"><div class="phase8-eyebrow">MATCH-UP CONFIRMÉ · SIMULATION</div><h1>DUEL VERROUILLÉ.</h1><p>CS2 · IEM Cologne · 20:00</p><div class="phase8-versus">${joueur('FabTheTap','VIT','Team Vitality','fort')}<div class="phase8-vs">VS</div>${joueur('TOI','G2','G2 Esports',conviction,true,true)}</div><div class="phase8-lock-note">Les deux pronostics sont verrouillés. Aucun Frag supplémentaire n’est mis en jeu par le duel.</div><div class="phase8-actions"><button class="phase8-btn" type="button" data-phase8-sim-state="win">Simuler ma victoire</button><button class="phase8-btn phase8-btn--ghost" type="button" data-phase8-sim-state="loss">Simuler ma défaite</button></div></div>`);
}

function resultat(gagne) {
  const pseudo = 'FabTheTap';
  return shell(`<div class="phase8-hero phase8-hero--locked is-finished"><div class="phase8-eyebrow">VERDICT FINAL · SIMULATION</div><h1>${gagne ? 'TU PRENDS LE DUEL.' : `${pseudo.toUpperCase()} PREND LE DUEL.`}</h1><p>CS2 · IEM Cologne</p><div class="phase8-final-score"><span>VIT</span><strong>${gagne ? '1 — 2' : '2 — 1'}</strong><span>G2</span></div><div class="phase8-versus">${joueur(pseudo,'VIT','Team Vitality','fort')}<div class="phase8-vs">VS</div>${joueur('TOI','G2','G2 Esports',conviction,true,true)}</div><div class="phase8-rivalry"><small>RIVALITÉ</small><strong>Toi ${gagne ? 3 : 2} — ${gagne ? 2 : 3} ${pseudo}</strong></div><div class="phase8-actions"><button class="phase8-btn" type="button" data-phase8-sim-state="invite">Rejouer</button><a class="phase8-btn phase8-btn--ghost" href="#/matchs">Fermer</a></div></div>`);
}

function rendre(etat = 'invite') {
  const racine = document.getElementById('contenu');
  if (!racine) return;
  racine.dataset.phase8Simulation = '1';
  if (etat === 'locked') racine.innerHTML = locked();
  else if (etat === 'win') racine.innerHTML = resultat(true);
  else if (etat === 'loss') racine.innerHTML = resultat(false);
  else racine.innerHTML = invitation();
}

function control() {
  if (document.getElementById(CONTROL)) return;
  const el = document.createElement('aside');
  el.id = CONTROL;
  el.className = 'phase8-sim-control';
  el.innerHTML = `<button type="button" data-phase8-sim-open><span>⚔</span><strong>Simuler un duel</strong></button>`;
  document.body.append(el);
}

if (disponible()) {
  control();
  document.addEventListener('click', (event) => {
    const open = event.target.closest?.('[data-phase8-sim-open]');
    if (open) { location.hash = '#/duel-simulation'; setTimeout(() => rendre('invite'), 0); return; }
    const c = event.target.closest?.('[data-phase8-sim-conviction]');
    if (c) { conviction = c.dataset.phase8SimConviction || 'normal'; rendre('invite'); return; }
    const state = event.target.closest?.('[data-phase8-sim-state]');
    if (state) { rendre(state.dataset.phase8SimState); return; }
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#/duel-simulation') setTimeout(() => rendre('invite'), 0);
  });

  new MutationObserver(() => {
    if (location.hash === '#/duel-simulation' && !document.querySelector('.phase8-page--simulation')) rendre('invite');
  }).observe(document.body, { childList: true, subtree: true });

  if (location.hash === '#/duel-simulation') setTimeout(() => rendre('invite'), 0);
}
