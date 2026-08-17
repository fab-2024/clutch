/**
 * Ligues V2 — le QG compétitif de Clutch.
 *
 * La donnée reste celle du moteur actuel ; la hiérarchie change complètement :
 * rivalité, position, écart au leader et identité de chaque ligue passent avant
 * les formulaires et les tableaux.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, toast, surClic } from '../ui.js';
import { vueClassement } from './classement.js';
import { sectionAmis } from './amis.js';

const ONGLETS = [
  { cle: 'mes', libelle: 'Mes ligues' },
  { cle: 'amis', libelle: 'Amis' },
  { cle: 'global', libelle: 'Global' },
];

let ongletChoisi = null;

export async function vueLigues(racine, force = null) {
  if (force) ongletChoisi = force;
  const onglet = ongletChoisi ?? (contexte.utilisateur ? 'mes' : 'global');
  const saison = contexte.saison;

  racine.innerHTML = `
    <section class="ligues-v2">
      <header class="ligues-v2__hero">
        <div class="ligues-v2__hero-copy">
          <span class="ligues-v2__kicker">CLUTCH LEAGUES</span>
          <h1>Joue pour la place.<br><span>Reste pour la rivalité.</span></h1>
          <p>${esc(saison?.nom ?? 'Saison en cours')} · les mêmes pronostics, mais enfin quelque chose à prouver à tes potes.</p>
        </div>
        ${
          contexte.utilisateur
            ? `<div class="ligues-v2__hero-actions">
                 <button class="ligues-v2__action ligues-v2__action--primary" data-open-league="create">
                   <span class="ligues-v2__action-icon">＋</span>
                   <span><strong>Créer</strong><small>une nouvelle ligue</small></span>
                 </button>
                 <button class="ligues-v2__action" data-open-league="join">
                   <span class="ligues-v2__action-icon">⌁</span>
                   <span><strong>Rejoindre</strong><small>avec un code</small></span>
                 </button>
               </div>`
            : ''
        }
      </header>

      <div class="ligues-v2__tabs" id="league-tabs" role="tablist"></div>

      <div class="ligues-v2__composer" id="league-composer" hidden>
        <button class="ligues-v2__composer-close" type="button" data-close-league aria-label="Fermer">×</button>
        <div id="league-composer-content"></div>
      </div>

      <div class="ligues-v2__content" id="zone-onglet"></div>
    </section>`;

  const dessinerOnglets = (actif) => {
    racine.querySelector('#league-tabs').innerHTML = ONGLETS.map(
      (o) => `<button class="ligues-v2__tab${o.cle === actif ? ' actif' : ''}" data-onglet="${o.cle}" role="tab" aria-selected="${o.cle === actif}">${o.libelle}</button>`
    ).join('');
  };

  const afficher = async (cle) => {
    dessinerOnglets(cle);
    const ancienne = racine.querySelector('#zone-onglet');
    const zone = ancienne.cloneNode(false);
    ancienne.replaceWith(zone);
    zone.innerHTML = '<div class="ligues-v2__loading"><span class="spinner"></span></div>';

    if (cle === 'global') await vueClassement(zone, { entete: false });
    else if (cle === 'amis') await sectionAmis(zone);
    else await sectionMesLigues(zone);
  };

  const ouvrirComposer = (mode) => {
    const composer = racine.querySelector('#league-composer');
    const contenu = racine.querySelector('#league-composer-content');
    composer.hidden = false;
    contenu.innerHTML = mode === 'create' ? formulaireCreation() : formulaireRejoindre();
    requestAnimationFrame(() => composer.classList.add('ouvert'));
    contenu.querySelector('input')?.focus();
  };

  const fermerComposer = () => {
    const composer = racine.querySelector('#league-composer');
    composer.classList.remove('ouvert');
    setTimeout(() => {
      composer.hidden = true;
      racine.querySelector('#league-composer-content').innerHTML = '';
    }, 180);
  };

  await afficher(onglet);

  surClic(racine, '[data-onglet]', async (btn) => {
    ongletChoisi = btn.dataset.onglet;
    await afficher(ongletChoisi);
  });

  surClic(racine, '[data-open-league]', (btn) => ouvrirComposer(btn.dataset.openLeague));
  surClic(racine, '[data-close-league]', fermerComposer);

  surClic(racine, '#creer-ligue-v2', async (btn) => {
    btn.disabled = true;
    try {
      const l = await api.creerLigue(racine.querySelector('#nom-ligue-v2').value);
      toast(`Ligue créée ! Code : ${l.code}`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      btn.disabled = false;
    }
  });

  surClic(racine, '#rejoindre-ligue-v2', async (btn) => {
    btn.disabled = true;
    try {
      const l = await api.rejoindreLigue(racine.querySelector('#code-ligue-v2').value);
      toast(`Bienvenue dans ${l.nom} !`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      btn.disabled = false;
    }
  });
}

async function sectionMesLigues(zone) {
  if (!contexte.utilisateur) {
    zone.innerHTML = `
      <div class="ligues-v2__empty-state">
        <span class="ligues-v2__empty-mark">L</span>
        <div>
          <span class="ligues-v2__kicker">TON PREMIER CERCLE</span>
          <h2>Les ligues commencent avec les gens que tu connais.</h2>
          <p>Connecte-toi, crée une ligue et transforme chaque match en rivalité.</p>
          <a class="btn" href="#/connexion">Créer mon compte</a>
        </div>
      </div>`;
    return;
  }

  const ligues = await api.mesLigues();
  if (!ligues.length) {
    zone.innerHTML = `
      <div class="ligues-v2__empty-state">
        <span class="ligues-v2__empty-mark">＋</span>
        <div>
          <span class="ligues-v2__kicker">AUCUNE LIGUE</span>
          <h2>Ton prochain rival n'est pas encore ici.</h2>
          <p>Crée un cercle privé ou rejoins celui de tes potes avec un code d'invitation.</p>
          <div class="ligues-v2__empty-actions">
            <button class="btn" data-open-league="create">Créer une ligue</button>
            <button class="btn btn--fantome" data-open-league="join">Entrer un code</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const enrichies = await Promise.all(
    ligues.map(async (ligue) => {
      const classement = await api.classementLigue(ligue.id).catch(() => []);
      const moiIndex = classement.findIndex((l) => l.moi);
      const moi = moiIndex >= 0 ? classement[moiIndex] : null;
      const leader = classement[0] ?? null;
      const devant = moiIndex > 0 ? classement[moiIndex - 1] : null;
      return { ...ligue, classement, moiIndex, moi, leader, devant };
    })
  );

  zone.innerHTML = `
    <div class="ligues-v2__section-head">
      <div>
        <span class="ligues-v2__kicker">TES ARÈNES</span>
        <h2>${ligues.length} ligue${ligues.length > 1 ? 's' : ''}. ${ligues.length > 1 ? 'Autant de comptes à régler.' : 'Un seul classement qui compte vraiment.'}</h2>
      </div>
      <span class="ligues-v2__count">${ligues.length}</span>
    </div>
    <div class="ligues-v2__league-grid">
      ${enrichies.map(carteLigue).join('')}
    </div>`;
}

function carteLigue(ligue) {
  const rang = ligue.moiIndex >= 0 ? ligue.moiIndex + 1 : null;
  const estLeader = rang === 1;
  const ecartLeader = ligue.moi && ligue.leader ? Math.max(0, Number(ligue.leader.solde ?? 0) - Number(ligue.moi.solde ?? 0)) : null;
  const ecartDevant = ligue.moi && ligue.devant ? Math.max(0, Number(ligue.devant.solde ?? 0) - Number(ligue.moi.solde ?? 0)) : null;
  const initiales = initialesLigue(ligue.nom);

  return `
    <a class="ligues-v2__league-card" href="#/ligues/${encodeURIComponent(ligue.id)}">
      <div class="ligues-v2__league-orbit" aria-hidden="true"></div>
      <div class="ligues-v2__league-top">
        <span class="ligues-v2__crest">${esc(initiales)}</span>
        <span class="ligues-v2__members">${ligue.nb_membres ?? ligue.classement.length} membre${(ligue.nb_membres ?? ligue.classement.length) > 1 ? 's' : ''}</span>
      </div>
      <div class="ligues-v2__league-title">
        <span>${esc(ligue.nom)}</span>
        <small>${esc(ligue.code ?? '')}</small>
      </div>
      <div class="ligues-v2__league-rank">
        ${rang ? `<strong>#${rang}</strong><span>${estLeader ? 'Tu tiens la couronne' : `${esc(frags(ecartDevant ?? ecartLeader ?? 0))} jusqu'à la place suivante`}</span>` : '<strong>—</strong><span>Entre dans le classement</span>'}
      </div>
      <div class="ligues-v2__league-foot">
        <span>${ligue.leader ? `Leader · ${esc(ligue.leader.pseudo)}` : 'Classement à lancer'}</span>
        <span class="ligues-v2__league-arrow">↗</span>
      </div>
    </a>`;
}

function formulaireCreation() {
  return `
    <div class="ligues-v2__form-intro">
      <span class="ligues-v2__kicker">NOUVELLE LIGUE</span>
      <h2>Crée ton arène.</h2>
      <p>Choisis un nom. Clutch génère le code d'invitation, le reste se joue sur les matchs.</p>
    </div>
    <label class="champ ligues-v2__field">
      <span class="champ__libelle">Nom de la ligue</span>
      <input type="text" id="nom-ligue-v2" placeholder="Ex : Les démons du Discord" maxlength="40" />
    </label>
    <button class="btn btn--large" id="creer-ligue-v2">Créer ma ligue</button>`;
}

function formulaireRejoindre() {
  return `
    <div class="ligues-v2__form-intro">
      <span class="ligues-v2__kicker">REJOINDRE</span>
      <h2>Entre dans leur classement.</h2>
      <p>Le code d'invitation contient 6 caractères. Une fois dedans, tes pronostics comptent automatiquement.</p>
    </div>
    <label class="champ ligues-v2__field">
      <span class="champ__libelle">Code d'invitation</span>
      <input type="text" id="code-ligue-v2" placeholder="K7XPQ2" maxlength="6" autocomplete="off" />
    </label>
    <button class="btn btn--large" id="rejoindre-ligue-v2">Rejoindre la ligue</button>`;
}

function initialesLigue(nom = '') {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return 'CL';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return `${mots[0][0]}${mots[mots.length - 1][0]}`.toUpperCase();
}
