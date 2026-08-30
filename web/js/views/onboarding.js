import * as api from '../api.js';
import { esc } from '../ui.js';

const CLE = 'clutch:onboarding:v1';

const GAME_LOGOS = {
  lol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74A9.738 9.738 0 0 1 12 3.2c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.875 3.066c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Z"/></svg>',
  rocket_league: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 7.5h6M.5 12h5.5M2 16.5h5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/><circle cx="15.2" cy="12" r="7.1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.2 7 3.15 2.3-1.2 3.7h-3.9l-1.2-3.7L15.2 7Zm-3.15 2.3-3.7.45m10-.45 3.7.45M13.25 13l-2.2 4.15M17.15 13l2.2 4.15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/></svg>',
  valorant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.792 2.152a.252.252 0 0 0-.098.083c-3.384 4.23-6.769 8.46-10.15 12.69-.107.093-.025.288.119.265 2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25c.774-.967 1.55-1.934 2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23.016-.11-.1-.206-.204-.167ZM.077 2.166c-.077.038-.074.132-.076.205.002 3.074.001 6.15.001 9.225a.679.679 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247 2.455 0 4.91.003 7.365 0 .142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184Z"/></svg>',
};

const JEUX = [
  { id: 'lol', nom: 'League of Legends', court: 'LOL', classe: 'lol', logo: GAME_LOGOS.lol },
  { id: 'rocket_league', nom: 'Rocket League', court: 'RL', classe: 'rocket-league', logo: GAME_LOGOS.rocket_league },
  { id: 'valorant', nom: 'VALORANT', court: 'VAL', classe: 'valorant', logo: GAME_LOGOS.valorant },
];

const JEU_COURT = { lol: 'LOL', rocket_league: 'RL', valorant: 'VAL' };

// Assets HD / vectoriels issus des brand kits officiels ou de fichiers haute résolution.
// Le favicon n'est plus la source principale : il ne sert qu'en dernier recours.
const TEAM_LOGOS_HQ = {
  'Fnatic': 'https://cdn.sanity.io/images/5gii1snx/production/22ded60518ddaf71975d334849039189cb106e87-1000x1000.png',
  'G2 Esports': 'https://commons.wikimedia.org/wiki/Special:FilePath/Esports%20organization%20G2%20Esports%20logo.svg',
  'GiantX': 'https://giantx.gg/cdn/shop/files/logo_0620238f-1e58-435d-bcd2-aa131bba7992_600x.png?v=1772036626',
  'Karmine Corp': 'https://commons.wikimedia.org/wiki/Special:FilePath/Karmine_Corp_logo.svg',
  'Movistar KOI': 'https://commons.wikimedia.org/wiki/Special:FilePath/Movistar_KOI_Logo.webp',
  'Rogue': 'https://commons.wikimedia.org/wiki/Special:FilePath/Rogue_logo.svg',
  'SK Gaming': 'https://commons.wikimedia.org/wiki/Special:FilePath/SK_Gaming_Logo_2022.svg',
  'Team BDS': 'https://gamepedia.cursecdn.com/lolesports_gamepedia_en/9/9e/Team_BDSlogo_square.png',
  'Team Heretics': 'https://teamheretics.com/en/modules/wim_esports/views/img/heretics-logo-png.webp',
  'Team Vitality': 'https://vitality.gg/wp-content/uploads/2024/04/vitality-logo-yellow.eps_-1.png',
  'Astralis': 'https://commons.wikimedia.org/wiki/Special:FilePath/Astralis_logo.svg',
  'FaZe Clan': 'https://commons.wikimedia.org/wiki/Special:FilePath/FaZe_Clan_2025_svg.svg',
  'Heroic': 'https://commons.wikimedia.org/wiki/Special:FilePath/Heroic_2023_logo.png',
  'MOUZ': 'https://commons.wikimedia.org/wiki/Special:FilePath/MOUZlogo2021.png',
  'NAVI': 'https://commons.wikimedia.org/wiki/Special:FilePath/Navilogo.jpg',
  'Natus Vincere': 'https://commons.wikimedia.org/wiki/Special:FilePath/Navilogo.jpg',
  'Team Spirit': 'https://commons.wikimedia.org/wiki/Special:FilePath/Team_Spirit_new_em.svg',
  'Paper Rex': 'https://commons.wikimedia.org/wiki/Special:FilePath/Paper_Rex_logo.svg',
  'Sentinels': 'https://commons.wikimedia.org/wiki/Special:FilePath/Sentinels_logo.svg',
  'T1': 'https://commons.wikimedia.org/wiki/Special:FilePath/T1_esports_logo.svg',
  'DRX': 'https://commons.wikimedia.org/wiki/Special:FilePath/DRX_logo_2023.png',
  'EDward Gaming': 'https://commons.wikimedia.org/wiki/Special:FilePath/Edward_Gaming_logo.png',
};

const TEAM_DOMAINS = {
  'G2 Esports': 'g2esports.com', 'Karmine Corp': 'karminecorp.fr', Fnatic: 'fnatic.com',
  'Movistar KOI': 'movistarkoi.com', 'Team Vitality': 'vitality.gg', 'Team BDS': 'team-bds.com',
  'Team Heretics': 'teamheretics.com', 'SK Gaming': 'sk-gaming.com', GiantX: 'giantx.gg', Rogue: 'rogue.gg',
  'Natus Vincere': 'navi.gg', NAVI: 'navi.gg', 'Team Spirit': 'teamspirit.gg', 'FaZe Clan': 'fazeclan.com',
  MOUZ: 'mouz.gg', 'Team Falcons': 'falcons.sa', Astralis: 'astralis.gg', 'Virtus.pro': 'virtus.pro',
  Heroic: 'heroic.gg', 'Team Liquid': 'teamliquid.com', 'Paper Rex': 'paper-rex.com', Sentinels: 'sentinels.gg',
  DRX: 'drx.gg', T1: 't1.gg', 'EDward Gaming': 'edgteam.cn',
};

const TEAM_ALIASES = {
  'natus vincere': 'navi',
  'navi': 'navi',
  'g2 esports': 'g2 esports',
  'g2': 'g2 esports',
  'team vitality': 'team vitality',
  'vitality': 'team vitality',
};

const TEAM_DISPLAY = {
  navi: 'NAVI',
  'g2 esports': 'G2 Esports',
  'team vitality': 'Team Vitality',
};

const TEAM_PALETTE = ['#8f5cff', '#31d7ff', '#ff5d6c', '#f4b545', '#42e69b', '#d7ff1f', '#ff7a45', '#b77cff'];

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

function cleOrganisation(nom = '') {
  const normalise = String(nom).trim().toLowerCase().replace(/\s+/g, ' ');
  return TEAM_ALIASES[normalise] || normalise;
}

function organisationsVisibles(equipes, jeux) {
  const selection = equipes.filter((e) => !jeux.length || jeux.includes(String(e.jeu || '').toLowerCase()));
  const groupes = new Map();
  for (const equipe of selection) {
    const cle = cleOrganisation(equipe.nom);
    if (!cle) continue;
    if (!groupes.has(cle)) {
      groupes.set(cle, {
        cle,
        nom: TEAM_DISPLAY[cle] || equipe.nom,
        tag: equipe.tag || String(equipe.nom || '').slice(0, 3).toUpperCase(),
        ids: [],
        jeux: [],
        membres: [],
      });
    }
    const groupe = groupes.get(cle);
    groupe.ids.push(String(equipe.id));
    groupe.membres.push(equipe);
    const jeu = String(equipe.jeu || '').toLowerCase();
    if (jeu && !groupe.jeux.includes(jeu)) groupe.jeux.push(jeu);
  }
  return [...groupes.values()]
    .sort((a, b) => b.jeux.length - a.jeux.length || a.nom.localeCompare(b.nom, 'fr'))
    .slice(0, 16);
}

function idEquipePourOrganisation(org, jeux) {
  for (const jeu of jeux) {
    const membre = org.membres.find((e) => String(e.jeu || '').toLowerCase() === jeu);
    if (membre) return String(membre.id);
  }
  return String(org.membres[0]?.id || org.ids[0] || '');
}

function logoOrganisation(org) {
  const direct = TEAM_LOGOS_HQ[org.nom] || org.membres.map((e) => TEAM_LOGOS_HQ[e.nom]).find(Boolean);
  if (direct) return direct;
  const domaine = org.membres.map((e) => TEAM_DOMAINS[e.nom]).find(Boolean) || TEAM_DOMAINS[org.nom];
  if (!domaine) return '';
  return `https://www.google.com/s2/favicons?sz=256&domain=${encodeURIComponent(domaine)}`;
}

function accentEquipe(equipe) {
  const cle = `${equipe.cle || equipe.id || ''}${equipe.tag || ''}`;
  let total = 0;
  for (const char of cle) total += char.charCodeAt(0);
  return TEAM_PALETTE[total % TEAM_PALETTE.length];
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
        <div class="onboarding-v5__impact" aria-hidden="true"><i></i><i></i><b>CLUTCH</b></div>
        <div class="onboarding-v5__top">
          <a class="onboarding-v5__brand" href="#/accueil" aria-label="Clutch">
            <img src="assets/logo.svg" alt="" aria-hidden="true">
            <strong>CLUTCH<span>.</span></strong>
          </a>
          <div class="onboarding-v5__progress" aria-label="Étape ${etat.etape + 1} sur 3"><i class="actif"></i><i class="${etat.etape === 1 ? 'actif' : ''}"></i><i></i></div>
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
  const visibles = organisationsVisibles(equipes, etat.jeux);
  return `
    <div class="onboarding-v5__body">
      <button class="onboarding-v5__back" type="button" data-back>← Retour</button>
      <div class="onboarding-v5__heading onboarding-v5__heading--teams">
        <span>02 // TA FACTION</span>
        <h1>Choisis<br>ton camp.</h1>
        <p>Une organisation favorite pour personnaliser ton univers. Aucun impact sur tes Frags.</p>
      </div>
      <div class="onboarding-v5__team-grid">
        ${visibles.map((org) => {
          const actif = org.ids.includes(String(etat.equipeId)) || String(etat.equipeNom) === String(org.nom);
          const logo = logoOrganisation(org);
          const tag = esc(org.tag || org.nom.slice(0, 3).toUpperCase());
          const teamId = idEquipePourOrganisation(org, etat.jeux);
          const jeux = org.jeux.map((jeu) => `<b>${esc(JEU_COURT[jeu] || jeu.toUpperCase())}</b>`).join('');
          return `<button type="button" class="onboarding-v5__team${actif ? ' actif' : ''}" style="--team:${accentEquipe(org)}" data-team="${esc(teamId)}" data-team-name="${esc(org.nom)}">
            <span class="onboarding-v5__team-watermark" aria-hidden="true">${tag}</span>
            <span class="onboarding-v5__team-logo${logo ? ' has-image' : ''}">
              <b>${tag}</b>
              ${logo ? `<img src="${esc(logo)}" alt="Logo ${esc(org.nom)}" loading="eager" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.classList.remove('has-image')">` : ''}
            </span>
            <strong>${esc(org.nom)}</strong>
            <span class="onboarding-v5__team-games">${jeux}</span>
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
