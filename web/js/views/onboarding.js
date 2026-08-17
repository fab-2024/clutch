import * as api from '../api.js';
import { esc } from '../ui.js';

const CLE = 'clutch:onboarding:v1';
const JEUX = [
  { id: 'lol', nom: 'League of Legends', sigle: 'LOL', note: 'Drafts, séries, rivalités.' },
  { id: 'cs2', nom: 'Counter-Strike 2', sigle: 'CS2', note: 'Maps, momentum, clutchs.' },
  { id: 'valorant', nom: 'VALORANT', sigle: 'VAL', note: 'Agents, maps, confiance.' },
];

export function lireOnboarding() {
  try {
    return { etape: 0, jeu: '', equipeId: '', equipeNom: '', termine: false, ...JSON.parse(localStorage.getItem(CLE) || '{}') };
  } catch {
    return { etape: 0, jeu: '', equipeId: '', equipeNom: '', termine: false };
  }
}

export function onboardingTermine() {
  return Boolean(lireOnboarding().termine);
}

function sauver(etat) {
  localStorage.setItem(CLE, JSON.stringify(etat));
}

function choisirIntent(intent) {
  localStorage.setItem('clutch:auth-intent', intent);
}

export async function vueOnboarding(racine) {
  if (await api.utilisateurCourant()) {
    location.hash = '#/accueil';
    return;
  }

  const equipes = await api.listerEquipes().catch(() => []);
  let etat = lireOnboarding();
  etat.etape = Math.max(0, Math.min(3, Number(etat.etape) || 0));

  const dessiner = () => {
    sauver(etat);
    racine.innerHTML = `
      <section class="onboarding-v4" data-step="${etat.etape}">
        <div class="onboarding-v4__progress" aria-label="Progression de l'onboarding">
          ${[0, 1, 2, 3].map((n) => `<i class="${n <= etat.etape ? 'actif' : ''}"></i>`).join('')}
        </div>
        <div class="onboarding-v4__stage">
          ${contenuEtape(etat, equipes)}
        </div>
        ${etat.etape > 0 ? '<button class="onboarding-v4__back" type="button" data-back>← Retour</button>' : ''}
      </section>`;

    racine.querySelector('[data-next]')?.addEventListener('click', () => {
      if (etat.etape === 1 && !etat.jeu) return;
      etat.etape = Math.min(3, etat.etape + 1);
      dessiner();
    });
    racine.querySelector('[data-back]')?.addEventListener('click', () => {
      etat.etape = Math.max(0, etat.etape - 1);
      dessiner();
    });
    racine.querySelectorAll('[data-game]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.jeu = bouton.dataset.game;
      etat.equipeId = '';
      etat.equipeNom = '';
      dessiner();
    }));
    racine.querySelectorAll('[data-team]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.equipeId = bouton.dataset.team;
      etat.equipeNom = bouton.dataset.teamName || '';
      dessiner();
    }));
    racine.querySelector('[data-skip-team]')?.addEventListener('click', () => {
      etat.equipeId = '';
      etat.equipeNom = '';
      etat.etape = 3;
      dessiner();
    });
    racine.querySelector('[data-create]')?.addEventListener('click', () => {
      etat.termine = true;
      sauver(etat);
      choisirIntent('inscription');
      location.hash = '#/connexion';
    });
    racine.querySelector('[data-explore]')?.addEventListener('click', () => {
      etat.termine = true;
      sauver(etat);
      location.hash = '#/accueil';
    });
    racine.querySelector('[data-login]')?.addEventListener('click', () => {
      etat.termine = true;
      sauver(etat);
      choisirIntent('connexion');
      location.hash = '#/connexion';
    });
  };

  dessiner();
}

function contenuEtape(etat, equipes) {
  if (etat.etape === 0) return intro();
  if (etat.etape === 1) return choixJeu(etat);
  if (etat.etape === 2) return choixEquipe(etat, equipes);
  return final(etat);
}

function intro() {
  return `
    <div class="onboarding-v4__copy onboarding-v4__copy--hero">
      <span class="onboarding-v4__eyebrow">CLUTCH // START</span>
      <h1>Tu ne mises rien.<br><em>Tu prends position.</em></h1>
      <p>Clutch transforme les matchs e-sport en jeu social : tu choisis ton camp, tu construis un rating et tu fais évoluer ton identité.</p>
      <div class="onboarding-v4__pillars">
        <article><span>01</span><strong>Pronostiquer</strong><small>Choisir un camp.</small></article>
        <article><span>02</span><strong>Appartenir</strong><small>Ligues, amis, faction.</small></article>
        <article><span>03</span><strong>Exposer</strong><small>Badges, objets, Room.</small></article>
      </div>
      <button class="onboarding-v4__primary" type="button" data-next><span>Entrer dans Clutch</span><b>→</b></button>
      <button class="onboarding-v4__login" type="button" data-login>Déjà membre ? Se connecter</button>
    </div>
    <div class="onboarding-v4__artifact" aria-hidden="true"><div class="onboarding-v4__ring"></div><div class="onboarding-v4__core">C</div><span>NO BETTING<br>JUST CALLS</span></div>`;
}

function choixJeu(etat) {
  return `
    <div class="onboarding-v4__copy">
      <span class="onboarding-v4__eyebrow">01 // TON TERRAIN</span>
      <h1>Quel jeu te fait<br><em>vibrer ?</em></h1>
      <p>Ce choix personnalise ton entrée dans Clutch. Tu pourras évidemment suivre les trois ensuite.</p>
      <div class="onboarding-v4__games">
        ${JEUX.map((j) => `<button type="button" class="onboarding-v4__game${etat.jeu === j.id ? ' actif' : ''}" data-game="${j.id}"><span>${j.sigle}</span><div><strong>${j.nom}</strong><small>${j.note}</small></div><i>${etat.jeu === j.id ? '✓' : '→'}</i></button>`).join('')}
      </div>
      <button class="onboarding-v4__primary${etat.jeu ? '' : ' disabled'}" type="button" data-next ${etat.jeu ? '' : 'disabled'}><span>Continuer</span><b>→</b></button>
    </div>
    <div class="onboarding-v4__signal" data-game="${esc(etat.jeu || 'all')}"><span>${esc((JEUX.find((j) => j.id === etat.jeu)?.sigle) || '///')}</span><i></i><b></b></div>`;
}

function choixEquipe(etat, equipes) {
  const jeu = etat.jeu;
  const filtrees = equipes.filter((e) => !jeu || !e.jeu || String(e.jeu).toLowerCase() === jeu).slice(0, 12);
  const visibles = filtrees.length ? filtrees : equipes.slice(0, 12);
  return `
    <div class="onboarding-v4__copy">
      <span class="onboarding-v4__eyebrow">02 // TA FACTION</span>
      <h1>Qui défends-tu<br><em>quand ça compte ?</em></h1>
      <p>Ton équipe favorite nourrit ta faction et personnalise ton univers. Le choix reste facultatif et n'influence jamais tes Frags.</p>
      ${visibles.length ? `<div class="onboarding-v4__teams">${visibles.map((e) => `<button type="button" class="onboarding-v4__team${etat.equipeId === String(e.id) ? ' actif' : ''}" data-team="${esc(String(e.id))}" data-team-name="${esc(e.nom)}"><span>${esc(e.tag || String(e.nom).slice(0, 3).toUpperCase())}</span><strong>${esc(e.nom)}</strong></button>`).join('')}</div>` : '<div class="onboarding-v4__empty">Les factions apparaîtront ici dès que les équipes seront disponibles.</div>'}
      <div class="onboarding-v4__actions">
        <button class="onboarding-v4__primary" type="button" data-next><span>${etat.equipeId ? 'Valider ma faction' : 'Continuer sans équipe'}</span><b>→</b></button>
        <button class="onboarding-v4__secondary" type="button" data-skip-team>Je choisirai plus tard</button>
      </div>
    </div>
    <div class="onboarding-v4__banner" aria-hidden="true"><span>${esc(etat.equipeNom || 'TA FACTION')}</span><i>${esc((JEUX.find((j) => j.id === etat.jeu)?.sigle) || 'CLT')}</i></div>`;
}

function final(etat) {
  const jeu = JEUX.find((j) => j.id === etat.jeu);
  return `
    <div class="onboarding-v4__copy onboarding-v4__copy--final">
      <span class="onboarding-v4__eyebrow">03 // LES RÈGLES</span>
      <h1>Ton call a<br><em>des conséquences.</em></h1>
      <p>Mais jamais sur ton argent. Toute la progression reste dans le jeu.</p>
      <div class="onboarding-v4__economy">
        <article><span class="onboarding-v4__token">F</span><div><strong>Frags</strong><small>Ton rating compétitif saisonnier. Ils ne se dépensent pas.</small></div></article>
        <article><span class="onboarding-v4__token onboarding-v4__token--volt">V</span><div><strong>Volts</strong><small>La monnaie cosmétique pour personnaliser ton identité et ta Room.</small></div></article>
        <article><span class="onboarding-v4__token onboarding-v4__token--xp">XP</span><div><strong>XP</strong><small>Ta progression permanente de compte, saison après saison.</small></div></article>
      </div>
      <div class="onboarding-v4__summary"><span>${esc(jeu?.nom || 'E-sport')}</span><i>×</i><span>${esc(etat.equipeNom || 'Faction à choisir')}</span></div>
      <div class="onboarding-v4__actions">
        <button class="onboarding-v4__primary" type="button" data-create><span>Créer mon profil</span><b>→</b></button>
        <button class="onboarding-v4__secondary" type="button" data-explore>Explorer d'abord, sans compte</button>
      </div>
      <button class="onboarding-v4__login" type="button" data-login>J'ai déjà un compte</button>
    </div>
    <div class="onboarding-v4__vault" aria-hidden="true"><div><span>F</span><span>V</span><span>XP</span></div><strong>RIEN À MISER.<br>TOUT À CONSTRUIRE.</strong></div>`;
}
