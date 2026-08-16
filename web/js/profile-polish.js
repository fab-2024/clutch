import * as api from './api.js';
import { contexte } from './app.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, MODE_DEMO } from './config.js';
import {
  evaluerBadgesV2,
  ordreRareteV2,
  rareteBadgeV2,
  libelleRareteV2,
  iconeFamilleBadge,
} from './badges-v2.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/auth\/v1$/, '');
const CLE_SESSION = 'clutch.session';
const ETAT = { route: null, timer: null, userId: null };

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function route() {
  return location.hash.replace(/^#/, '') || '/matchs';
}

function session() {
  try { return JSON.parse(localStorage.getItem(CLE_SESSION) || 'null'); } catch { return null; }
}

async function sauverTitre(userId, titre) {
  if (MODE_DEMO) {
    localStorage.setItem(`clutch.profile.title.${userId}`, titre || '');
    return;
  }
  const s = session();
  if (!s?.access_token) throw new Error('Ta session a expiré.');
  const r = await fetch(`${BASE}/rest/v1/profils?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${s.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ titre_profil: titre || null }),
  });
  if (!r.ok) throw new Error(`Impossible d'enregistrer le titre (${r.status}).`);
}

function titreActuel(u, titreNiveau) {
  if (MODE_DEMO) return localStorage.getItem(`clutch.profile.title.${u.id}`) || titreNiveau;
  return u.titre_profil || titreNiveau;
}

function medal(badge, extra = '') {
  const rarete = rareteBadgeV2(badge);
  const secret = badge.secret ? ' badge-medaille--secret' : '';
  return `<span class="badge-medaille badge-medaille--${esc(rarete)} badge-medaille--hero${secret}${extra}">
    <span class="badge-medaille__corps"><span class="badge-medaille__centre">${iconeFamilleBadge(badge.famille || 'Prestige', 34)}</span></span>
    <span class="badge-medaille__ruban badge-medaille__ruban--g" aria-hidden="true"></span>
    <span class="badge-medaille__ruban badge-medaille__ruban--d" aria-hidden="true"></span>
  </span>`;
}

const ORIGIN = {
  cle: 'clutch_origin',
  nom: 'CLUTCH ORIGIN',
  famille: 'Prestige',
  rarete: 'mythique',
  description: 'Présent avant que Clutch ait une histoire.',
};

function titreNiveauDepuisDom() {
  const sur = document.querySelector('.profil-identite__sur')?.textContent || '';
  return sur.split('·').slice(1).join('·').trim() || 'Recrue';
}

function optionsTitres(badges, u, niveauTitre) {
  const titres = [{ value: niveauTitre, label: niveauTitre, meta: 'Titre de niveau' }];
  if (u.est_fondateur) titres.push({ value: 'Fondateur', label: 'Fondateur', meta: 'Historique · Mythique' });
  badges
    .filter((b) => b.obtenu && (ordreRareteV2(b) <= 3 || b.secret))
    .sort((a, b) => ordreRareteV2(a) - ordreRareteV2(b) || a.nom.localeCompare(b.nom, 'fr'))
    .forEach((b) => titres.push({ value: b.nom, label: b.nom, meta: `${b.secret ? 'Secret · ' : ''}${libelleRareteV2(b)}` }));
  const vus = new Set();
  return titres.filter((t) => !vus.has(t.value) && vus.add(t.value));
}

function injecterIdentite(u, badges) {
  const pseudo = document.querySelector('.profil-identite__pseudo');
  if (!pseudo || document.querySelector('.profil-identite__ornements')) return;

  const niveauTitre = titreNiveauDepuisDom();
  let titre = titreActuel(u, niveauTitre);
  const options = optionsTitres(badges, u, niveauTitre);
  if (!options.some((o) => o.value === titre)) titre = niveauTitre;

  const bloc = document.createElement('div');
  bloc.className = 'profil-identite__ornements';
  bloc.innerHTML = `
    ${u.est_fondateur ? '<span class="profil-fondateur"><i></i>FONDATEUR</span>' : ''}
    <button class="profil-titre-equipe" type="button" aria-haspopup="dialog">
      <span class="profil-titre-equipe__sur">Titre équipé</span>
      <strong>${esc(titre)}</strong><span class="profil-titre-equipe__chevron">⌄</span>
    </button>`;
  pseudo.insertAdjacentElement('afterend', bloc);

  bloc.querySelector('.profil-titre-equipe')?.addEventListener('click', () => ouvrirTitres(u, options, titre));
}

function ouvrirTitres(u, options, actuel) {
  document.querySelector('.profil-titres-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'profil-titres-overlay';
  overlay.innerHTML = `
    <section class="profil-titres-modal" role="dialog" aria-modal="true" aria-label="Choisir un titre">
      <div class="profil-titres-modal__haut">
        <div><span>IDENTITÉ</span><h2>Choisis ton titre</h2><p>Il apparaît sous ton pseudo sur ta player card.</p></div>
        <button type="button" data-close aria-label="Fermer">×</button>
      </div>
      <div class="profil-titres-liste">
        ${options.map((o) => `<button type="button" class="profil-titre-option${o.value === actuel ? ' actif' : ''}" data-title="${esc(o.value)}">
          <span><strong>${esc(o.label)}</strong><small>${esc(o.meta)}</small></span><i>${o.value === actuel ? '✓' : ''}</i>
        </button>`).join('')}
      </div>
    </section>`;
  const fermer = () => overlay.remove();
  overlay.querySelector('[data-close]')?.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  overlay.querySelectorAll('[data-title]').forEach((b) => b.addEventListener('click', async () => {
    const titre = b.dataset.title;
    b.disabled = true;
    try {
      await sauverTitre(u.id, titre);
      u.titre_profil = titre;
      const cible = document.querySelector('.profil-titre-equipe strong');
      if (cible) cible.textContent = titre;
      fermer();
    } catch (err) {
      b.disabled = false;
      alert(err.message);
    }
  }));
  document.body.appendChild(overlay);
}

function injecterOrigin(u) {
  if (!u.est_fondateur) return;
  const corps = document.querySelector('.profil-section--arsenal .profil-section__corps');
  if (corps && !corps.querySelector('.profil-origin')) {
    const origin = document.createElement('div');
    origin.className = 'profil-origin';
    origin.innerHTML = `
      <div class="profil-origin__medaille">${medal(ORIGIN)}</div>
      <div class="profil-origin__texte"><span>ARTEFACT MYTHIQUE · #0001</span><strong>CLUTCH ORIGIN</strong><p>Présent avant que Clutch ait une histoire. Distinction non distribuée.</p></div>
      <div class="profil-origin__sceau">ORIGIN</div>`;
    corps.prepend(origin);
  }

  if (route() === '/badges' && !document.querySelector('.arsenal-origin')) {
    const ancre = document.querySelector('.arsenal-legende') || document.querySelector('.niveau');
    if (ancre) {
      const carte = document.createElement('section');
      carte.className = 'arsenal-origin';
      carte.innerHTML = `${medal(ORIGIN)}<div><span>DISTINCTION MYTHIQUE · FONDATEUR</span><h2>CLUTCH ORIGIN</h2><p>${esc(ORIGIN.description)} Cette pièce n'entre pas dans le compteur des 30 badges fondateurs.</p></div>`;
      ancre.insertAdjacentElement('beforebegin', carte);
    }
  }
}

function overlayBadge(badge, { origin = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = `badge-reveal badge-reveal--${esc(rareteBadgeV2(badge))}${badge.secret ? ' badge-reveal--secret' : ''}`;
  overlay.innerHTML = `
    <section class="badge-reveal__carte">
      <div class="badge-reveal__rayons" aria-hidden="true"></div>
      <span class="badge-reveal__eyebrow">${origin ? 'DISTINCTION FONDATEUR' : badge.secret ? 'ARCHIVE DÉCLASSIFIÉE' : 'NOUVEAU BADGE'}</span>
      <div class="badge-reveal__medaille">${medal(badge)}</div>
      <span class="badge-reveal__rarete">${esc(origin ? 'MYTHIQUE' : badge.secret ? 'LÉGENDAIRE SECRET' : libelleRareteV2(badge).toUpperCase())}</span>
      <h2>${esc(badge.nom)}</h2>
      <p>${esc(badge.description || '')}</p>
      <button class="btn" type="button">Ajouter à mon Arsenal</button>
    </section>`;
  const fermer = () => overlay.remove();
  overlay.querySelector('button')?.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  document.body.appendChild(overlay);
}

function verifierNouveauxBadges(u, badges) {
  const obtenus = badges.filter((b) => b.obtenu);
  const cle = `clutch.badges.seen.${u.id}`;
  let vus;
  try { vus = JSON.parse(localStorage.getItem(cle) || 'null'); } catch { vus = null; }

  if (!Array.isArray(vus)) {
    localStorage.setItem(cle, JSON.stringify(obtenus.map((b) => b.cle)));
  } else {
    const set = new Set(vus);
    const nouveaux = obtenus.filter((b) => !set.has(b.cle)).sort((a, b) => ordreRareteV2(a) - ordreRareteV2(b));
    if (nouveaux.length) {
      localStorage.setItem(cle, JSON.stringify([...set, ...nouveaux.map((b) => b.cle)]));
      overlayBadge(nouveaux[0]);
    }
  }

  if (u.est_fondateur) {
    const originCle = `clutch.origin.seen.${u.id}`;
    if (!localStorage.getItem(originCle)) {
      localStorage.setItem(originCle, '1');
      setTimeout(() => {
        if (!document.querySelector('.badge-reveal')) overlayBadge(ORIGIN, { origin: true });
      }, 500);
    }
  }
}

async function enrichir() {
  const courant = route();
  if (courant !== '/profil' && courant !== '/badges') return;
  const u = contexte.utilisateur || await api.utilisateurCourant().catch(() => null);
  if (!u) return;

  const donnees = await api.mesBadges().catch(() => null);
  if (!donnees) return;
  const badges = evaluerBadgesV2(donnees.recap ?? {});

  if (courant === '/profil') {
    injecterIdentite(u, badges);
    injecterOrigin(u);
    verifierNouveauxBadges(u, badges);
  } else {
    injecterOrigin(u);
  }
}

function programmer() {
  clearTimeout(ETAT.timer);
  ETAT.timer = setTimeout(async () => {
    for (let i = 0; i < 20; i++) {
      const ok = route() === '/profil' ? document.querySelector('.profil-hero') : document.querySelector('.arsenal-entete');
      if (ok) { await enrichir(); return; }
      await new Promise((r) => setTimeout(r, 80));
    }
  }, 40);
}

window.addEventListener('hashchange', programmer);
window.addEventListener('DOMContentLoaded', programmer);
programmer();
