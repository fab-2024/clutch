import * as api from '../api.js';
import { esc } from '../ui.js';

const CLE = 'clutch:onboarding:v1';

const GAME_LOGOS = {
  lol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74A9.738 9.738 0 0 1 12 3.2c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.875 3.066c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Z"/></svg>',
  cs2: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.71 3.235h-6.97l-.12-.41.39.04.3-1.05-.27-.1c-.04-.17-.38-1.32-1.99-1.58-1.42-.23-2.02.93-2.02.93l.05.98.35.15-.2.32-.62.02c-.39.02-1.24.49-1.88 1.84l-.72 1.55-.58.01-.9 2.54.65.42-.35 1.03-.43.38-.6 1.53-.34.01-.2 2.29-.18 1.03-.56.43c-.26.24-.6.69-.77 1l-1.86 3.92-.08.32.13.24-.07.53-.98 2.01.12.26h1.98c.12.01.25-.14.25-.3l.1-1.3-.03-.2 3.61-4.23c.09-.11.22-.32.29-.45l1.72-3.79.21-.13c.15.18.5.78.68 1.03.14.21.85 1.23 1.16 1.57.09.09.35.2.47.27l-1.03 1.81-.45 2.14-.45 1.64-.15 1.08h2.55c.1 0 .19 0 .29-.01.12-.02.56-.08.75-.15.3-.11.43-.24.43-.53l-1.18-.36-.51-.6.62-.61 1.9-4.49c.09-.28.06-.6 0-.94-.04-.25-.69-1.33-.85-1.62l-1.29-2.25-.07-1.12.33-.03 1.15-2.15-.24-.29.35-.38.94.53c.26.13.69-.15.91-.29l.14-.15.46-1.07.13.6 1.35-.3-.32-1.35.14-.2.16-.73h3.73v-.73h1.46v-.38h-1.46Z"/></svg>',
  valorant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.792 2.152a.252.252 0 0 0-.098.083c-3.384 4.23-6.769 8.46-10.15 12.69-.107.093-.025.288.119.265 2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25c.774-.967 1.55-1.934 2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23.016-.11-.1-.206-.204-.167ZM.077 2.166c-.077.038-.074.132-.076.205.002 3.074.001 6.15.001 9.225a.679.679 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247 2.455 0 4.91.003 7.365 0 .142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184Z"/></svg>',
};

const JEUX = [
  { id: 'lol', nom: 'League of Legends', court: 'LOL', classe: 'lol', logo: GAME_LOGOS.lol },
  { id: 'cs2', nom: 'Counter-Strike 2', court: 'CS2', classe: 'cs2', logo: GAME_LOGOS.cs2 },
  { id: 'valorant', nom: 'VALORANT', court: 'VAL', classe: 'valorant', logo: GAME_LOGOS.valorant },
];

const TEAM_DOMAINS = {
  'G2 Esports': 'g2esports.com', 'Karmine Corp': 'karminecorp.fr', Fnatic: 'fnatic.com',
  'Movistar KOI': 'movistarkoi.com', 'Team Vitality': 'vitality.gg', 'Team BDS': 'team-bds.com',
  'Team Heretics': 'teamheretics.com', 'SK Gaming': 'sk-gaming.com', GiantX: 'giantx.gg', Rogue: 'rogue.gg',
  'Natus Vincere': 'navi.gg', NAVI: 'navi.gg', 'Team Spirit': 'teamspirit.gg', 'FaZe Clan': 'fazeclan.com',
  MOUZ: 'mouz.gg', 'Team Falcons': 'falcons.sa', Astralis: 'astralis.gg', 'Virtus.pro': 'virtus.pro',
  Heroic: 'heroic.gg', 'Team Liquid': 'teamliquid.com', 'Paper Rex': 'paper-rex.com', Sentinels: 'sentinels.gg',
  DRX: 'drx.gg', T1: 't1.gg', 'EDward Gaming': 'edgteam.cn',
};

export function lireOnboarding() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '{}');
    const jeux = Array.isArray(brut.jeux) ? brut.jeux : (brut.jeu ? [brut.jeu] : []);
    return { etape: 0, jeux, jeu: jeux[0] || '', equipeId: '', equipeNom: '', termine: false, ...brut, jeux };
  } catch {
    return { etape: 0, jeux: [], jeu: '', equipeId: '', equipeNom: '', termine: false };
  }
}

export function onboardingTermine() { return Boolean(lireOnboarding().termine); }
function sauver(etat) { localStorage.setItem(CLE, JSON.stringify(etat)); }
function choisirIntent(intent) { localStorage.setItem('clutch:auth-intent', intent); }

function logoEquipe(equipe) {
  const domaine = TEAM_DOMAINS[equipe.nom];
  if (!domaine) return '';
  return `https://www.google.com/s2/favicons?sz=128&domain_url=https://${encodeURIComponent(domaine)}`;
}

export async function vueOnboarding(racine) {
  if (await api.utilisateurCourant()) {
    location.hash = '#/accueil';
    return;
  }

  const equipes = await api.listerEquipes().catch(() => []);
  let etat = lireOnboarding();
  etat.etape = Number(etat.etape) === 1 ? 1 : 0;

  const dessiner = () => {
    etat.jeu = etat.jeux[0] || '';
    sauver(etat);
    racine.innerHTML = `
      <section class="onboarding-v5 onboarding-v5--${etat.etape === 0 ? 'games' : 'teams'}">
        <div class="onboarding-v5__top">
          <a class="onboarding-v5__brand" href="#/accueil" aria-label="Clutch">CLUTCH<span>.</span></a>
          <div class="onboarding-v5__progress" aria-label="Étape ${etat.etape + 1} sur 2"><i class="actif"></i><i class="${etat.etape === 1 ? 'actif' : ''}"></i></div>
          <button class="onboarding-v5__login" type="button" data-login>Se connecter</button>
        </div>
        ${etat.etape === 0 ? ecranJeux(etat) : ecranEquipes(etat, equipes)}
      </section>`;

    racine.querySelectorAll('[data-game]').forEach((bouton) => bouton.addEventListener('click', () => {
      const id = bouton.dataset.game;
      etat.jeux = etat.jeux.includes(id) ? etat.jeux.filter((j) => j !== id) : [...etat.jeux, id];
      if (etat.equipeId) { etat.equipeId = ''; etat.equipeNom = ''; }
      dessiner();
    }));

    racine.querySelector('[data-next]')?.addEventListener('click', () => {
      if (!etat.jeux.length) return;
      etat.etape = 1;
      dessiner();
    });
    racine.querySelector('[data-back]')?.addEventListener('click', () => { etat.etape = 0; dessiner(); });

    racine.querySelectorAll('[data-team]').forEach((bouton) => bouton.addEventListener('click', () => {
      etat.equipeId = bouton.dataset.team;
      etat.equipeNom = bouton.dataset.teamName || '';
      dessiner();
    }));

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
      location.hash = '#/connexion-login';
    });
  };

  dessiner();
}

function ecranJeux(etat) {
  return `
    <div class="onboarding-v5__body">
      <div class="onboarding-v5__heading">
        <span>01 // PERSONNALISE TON FEED</span>
        <h1>Choisis<br>tes jeux.</h1>
        <p>Sélectionne tout ce que tu suis. Clutch mettra leurs matchs en avant.</p>
      </div>
      <div class="onboarding-v5__game-list">
        ${JEUX.map((j) => {
          const actif = etat.jeux.includes(j.id);
          return `<button type="button" class="onboarding-v5__game onboarding-v5__game--${j.classe}${actif ? ' actif' : ''}" data-game="${j.id}">
            <span class="onboarding-v5__game-art" aria-hidden="true">${j.logo}</span>
            <span class="onboarding-v5__game-logo">${j.logo}</span>
            <span class="onboarding-v5__game-copy"><strong>${j.court}</strong><small>${j.nom}</small></span>
            <span class="onboarding-v5__check">${actif ? '✓' : ''}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="onboarding-v5__dock">
      <button class="onboarding-v5__cta" type="button" data-next ${etat.jeux.length ? '' : 'disabled'}><span>Continuer</span><b>→</b></button>
      <small>${etat.jeux.length ? `${etat.jeux.length} jeu${etat.jeux.length > 1 ? 'x' : ''} sélectionné${etat.jeux.length > 1 ? 's' : ''}` : 'Choisis au moins un jeu'}</small>
    </div>`;
}

function ecranEquipes(etat, equipes) {
  const filtrees = equipes.filter((e) => !etat.jeux.length || etat.jeux.includes(String(e.jeu).toLowerCase()));
  const visibles = (filtrees.length ? filtrees : equipes).slice(0, 16);
  return `
    <div class="onboarding-v5__body">
      <button class="onboarding-v5__back" type="button" data-back>← Retour</button>
      <div class="onboarding-v5__heading onboarding-v5__heading--teams">
        <span>02 // TA FACTION</span>
        <h1>Choisis<br>ton camp.</h1>
        <p>Une équipe favorite pour personnaliser ton univers. Aucun impact sur tes Frags.</p>
      </div>
      <div class="onboarding-v5__team-grid">
        ${visibles.map((e) => {
          const actif = String(etat.equipeId) === String(e.id);
          const logo = logoEquipe(e);
          return `<button type="button" class="onboarding-v5__team${actif ? ' actif' : ''}" data-team="${esc(String(e.id))}" data-team-name="${esc(e.nom)}">
            <span class="onboarding-v5__team-logo">
              <b>${esc(e.tag || String(e.nom).slice(0, 3).toUpperCase())}</b>
              ${logo ? `<img src="${esc(logo)}" alt="Logo ${esc(e.nom)}" loading="lazy" onerror="this.remove()">` : ''}
            </span>
            <strong>${esc(e.nom)}</strong>
            <small>${esc(String(e.jeu || '').toUpperCase())}</small>
            <i>${actif ? '✓' : ''}</i>
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="onboarding-v5__dock">
      <button class="onboarding-v5__cta" type="button" data-create><span>${etat.equipeId ? 'Continuer' : 'Continuer sans équipe'}</span><b>→</b></button>
      <button class="onboarding-v5__explore" type="button" data-explore>Explorer d’abord, sans compte</button>
    </div>`;
}
