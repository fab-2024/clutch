import { esc, nomJeu } from './ui.js';
import { CONVICTIONS } from './prediction.js';
import { presentationResultat, equipeChoisie, tagChoisi } from './result-reveal.js';

const CONTROL_ID = 'phase6-simulator-control';
const HOST_ID = 'phase6-simulator-host';

function simulationDisponible() {
  const h = location.hostname;
  const p = new URLSearchParams(location.search);
  return h.includes('agent-phase6-result-reveal') || h === 'localhost' || h === '127.0.0.1' || p.get('phase6sim') === '1';
}

function resultatFictif(statut) {
  const gagne = statut === 'gagne';
  return {
    id: `simulation-${statut}`,
    match_id: 'simulation',
    saison_id: 'simulation',
    statut,
    choix: 'a',
    conviction: 'fort',
    multiplicateur_conviction: 1.5,
    proba_figee: 0.46,
    delta_frags: gagne ? 56 : -34,
    frags_avant: 1186,
    frags_apres: gagne ? 1242 : 1152,
    rang_avant: 7,
    rang_apres: gagne ? 4 : 9,
    equipe_a: 'Team Vitality',
    equipe_b: 'G2 Esports',
    tag_a: 'VIT',
    tag_b: 'G2',
    score_a: gagne ? 2 : 1,
    score_b: gagne ? 1 : 2,
    jeu: 'cs2',
    evenement: 'SIMULATION · IEM Cologne',
    format: 3,
    restants: 1,
  };
}

function formatRang(rang) {
  const n = Number(rang);
  return Number.isFinite(n) && n > 0 ? `#${Math.trunc(n)}` : '—';
}

function renduRang(presentation, resultat) {
  const rang = presentation.rang;
  let detail = 'Rang maintenu';
  if (rang.monte) detail = `+${Math.abs(rang.delta)} place${Math.abs(rang.delta) > 1 ? 's' : ''}`;
  if (rang.descend) detail = `−${Math.abs(rang.delta)} place${Math.abs(rang.delta) > 1 ? 's' : ''}`;
  return `<div class="phase6-stat phase6-stat--rank${rang.monte ? ' is-up' : rang.descend ? ' is-down' : ''}">
    <small>Classement</small>
    <strong>${formatRang(resultat.rang_avant)} <i>→</i> ${formatRang(resultat.rang_apres)}</strong>
    <span>${detail}</span>
  </div>`;
}

function renduReveal(resultat) {
  const p = presentationResultat(resultat);
  const conviction = CONVICTIONS[resultat.conviction] || CONVICTIONS.normal;
  const choisie = equipeChoisie(resultat);
  const tag = tagChoisi(resultat) || choisie;
  const delta = Number(resultat.delta_frags ?? 0);
  const score = `${Number(resultat.score_a)} — ${Number(resultat.score_b)}`;

  return `<section class="phase6-reveal phase6-reveal--${p.tone} phase6-reveal--simulation" role="dialog" aria-modal="true" aria-labelledby="phase6-sim-title">
    <div class="phase6-reveal__atmosphere" aria-hidden="true">
      <i class="phase6-reveal__halo phase6-reveal__halo--1"></i>
      <i class="phase6-reveal__halo phase6-reveal__halo--2"></i>
      <i class="phase6-reveal__beam"></i>
      <i class="phase6-reveal__grain"></i>
    </div>
    <div class="phase6-reveal__shell">
      <header class="phase6-reveal__topline">
        <span>CLUTCH // SIMULATION</span>
        <span>${esc(nomJeu(resultat.jeu))} · ${esc(resultat.evenement)}</span>
      </header>
      <main class="phase6-reveal__stage">
        <div class="phase6-reveal__kicker">${esc(p.kicker)} · SIMULATION</div>
        <h1 id="phase6-sim-title">${esc(p.headline)}</h1>
        <div class="phase6-reveal__duel">
          <div class="phase6-reveal__team is-picked${Number(resultat.score_a) > Number(resultat.score_b) ? ' is-winner' : ''}">
            <span>${esc(resultat.tag_a)}</span><strong>${esc(resultat.equipe_a)}</strong>
          </div>
          <div class="phase6-reveal__score"><small>FINAL</small><strong>${esc(score)}</strong></div>
          <div class="phase6-reveal__team phase6-reveal__team--right${Number(resultat.score_b) > Number(resultat.score_a) ? ' is-winner' : ''}">
            <span>${esc(resultat.tag_b)}</span><strong>${esc(resultat.equipe_b)}</strong>
          </div>
        </div>
        <div class="phase6-reveal__pick"><span>TON CHOIX</span><strong>${esc(tag)}</strong><i>${esc(conviction.label)} · ${conviction.multiplicateur.toLocaleString('fr-FR')}×</i></div>
        <div class="phase6-reveal__impact"><span>${delta >= 0 ? '+' : '−'}</span><strong>${Math.abs(delta)}</strong><em>FRAGS</em></div>
        <div class="phase6-reveal__stats">
          ${renduRang(p, resultat)}
          <div class="phase6-stat phase6-stat--xp"><small>Progression</small><strong>+${p.xp} XP</strong><span>XP de résultat${p.gagne ? ' · réussite incluse' : ''}</span></div>
        </div>
        ${p.perdu ? '<p class="phase6-reveal__loss-note">Le rating baisse, mais ta progression continue. Le prochain call est déjà une nouvelle occasion.</p>' : '<p class="phase6-reveal__win-note">Ton call est passé. Le classement a bougé avec toi.</p>'}
      </main>
      <footer class="phase6-reveal__actions phase6-simulator__actions">
        <button class="phase6-reveal__cta" type="button" data-phase6-sim-close>Fermer la simulation</button>
        <button class="phase6-reveal__secondary" type="button" data-phase6-sim-switch="${p.gagne ? 'perdu' : 'gagne'}">Voir la ${p.gagne ? 'défaite' : 'victoire'}</button>
        <small>Aucune donnée, aucun Frag et aucun classement ne sont modifiés.</small>
      </footer>
    </div>
  </section>`;
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

function ouvrir(statut) {
  document.body.classList.add('phase6-simulation-open');
  host().innerHTML = renduReveal(resultatFictif(statut));
  requestAnimationFrame(() => host().querySelector('[data-phase6-sim-close]')?.focus());
}

function fermer() {
  host().replaceChildren();
  document.body.classList.remove('phase6-simulation-open');
}

function control() {
  if (document.getElementById(CONTROL_ID)) return;
  const el = document.createElement('aside');
  el.id = CONTROL_ID;
  el.className = 'phase6-simulator';
  el.innerHTML = `<button class="phase6-simulator__trigger" type="button" data-phase6-sim-toggle><span>◈</span><strong>Simuler le reveal</strong></button>
    <div class="phase6-simulator__panel" hidden data-phase6-sim-panel>
      <div><small>PHASE 6 · PREVIEW</small><strong>Quel résultat tester ?</strong><span>100 % local · aucune donnée modifiée</span></div>
      <div class="phase6-simulator__choices">
        <button type="button" data-phase6-sim="gagne">Victoire</button>
        <button type="button" data-phase6-sim="perdu">Défaite</button>
      </div>
    </div>`;
  document.body.append(el);
}

if (simulationDisponible()) {
  control();
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest?.('[data-phase6-sim-toggle]');
    if (toggle) {
      const panel = document.querySelector('[data-phase6-sim-panel]');
      if (panel) panel.hidden = !panel.hidden;
      return;
    }
    const scenario = event.target.closest?.('[data-phase6-sim]');
    if (scenario) {
      ouvrir(scenario.dataset.phase6Sim);
      const panel = document.querySelector('[data-phase6-sim-panel]');
      if (panel) panel.hidden = true;
      return;
    }
    if (event.target.closest?.('[data-phase6-sim-close]')) {
      fermer();
      return;
    }
    const change = event.target.closest?.('[data-phase6-sim-switch]');
    if (change) ouvrir(change.dataset.phase6SimSwitch);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('phase6-simulation-open')) fermer();
  });
}
