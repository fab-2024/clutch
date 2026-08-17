import * as api from './api.js';
import {
  formeCommunaute,
  palierFaction,
} from './community-progression.js';

function route() {
  return location.hash.replace(/^#/, '') || '/matchs';
}

function comparerCroissance(a, b) {
  return (
    (Number(b.croissance_24h) || 0) - (Number(a.croissance_24h) || 0) ||
    (Number(b.croissance_7j) || 0) - (Number(a.croissance_7j) || 0) ||
    (Number(b.membres) || 0) - (Number(a.membres) || 0) ||
    String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
  );
}

function pluriel(n, mot) {
  return `${mot}${Math.abs(Number(n) || 0) > 1 ? 's' : ''}`;
}

function rivalite(communautes, index) {
  const c = communautes[index];
  if (!c) return null;

  if (communautes.length === 1) {
    return { rang: 1, texte: 'Seule faction active pour le moment.', accent: '' };
  }

  if (index === 0) {
    const rival = communautes[1];
    const ecart24 = (Number(c.croissance_24h) || 0) - (Number(rival.croissance_24h) || 0);
    const ecart7 = (Number(c.croissance_7j) || 0) - (Number(rival.croissance_7j) || 0);

    if (ecart24 > 0) {
      return {
        rang: 1,
        texte: `${ecart24} ${pluriel(ecart24, 'supporter')} / 24 h d’avance sur `,
        accent: rival.tag,
      };
    }
    if (ecart7 > 0) {
      return {
        rang: 1,
        texte: `24 h à égalité · ${ecart7} ${pluriel(ecart7, 'supporter')} / 7 j d’avance sur `,
        accent: rival.tag,
      };
    }
    return { rang: 1, texte: 'Au coude-à-coude avec ', accent: rival.tag };
  }

  const rival = communautes[index - 1];
  const ecart24 = (Number(rival.croissance_24h) || 0) - (Number(c.croissance_24h) || 0);
  const ecart7 = (Number(rival.croissance_7j) || 0) - (Number(c.croissance_7j) || 0);

  if (ecart24 > 0) {
    return {
      rang: index + 1,
      texte: `${ecart24} ${pluriel(ecart24, 'supporter')} / 24 h pour rattraper `,
      accent: rival.tag,
    };
  }
  if (ecart7 > 0) {
    return {
      rang: index + 1,
      texte: `24 h à égalité · ${ecart7} ${pluriel(ecart7, 'supporter')} / 7 j pour rattraper `,
      accent: rival.tag,
    };
  }
  return { rang: index + 1, texte: 'Croissance à égalité avec ', accent: rival.tag };
}

function rendreResume(element, faction, info) {
  const p = palierFaction(faction.membres, faction.niveau_atteint);
  const forme = formeCommunaute(p.niveau);

  element.classList.add('commu-core__resume--vivant');
  element.replaceChildren();

  const signal = document.createElement('span');
  signal.className = 'commu-rivalite__signal';

  const rang = document.createElement('b');
  rang.textContent = `#${info.rang}`;
  signal.append(rang, document.createTextNode(` · ${info.texte}`));

  if (info.accent) {
    const accent = document.createElement('em');
    accent.textContent = info.accent;
    signal.append(accent);
  }

  const lore = document.createElement('span');
  lore.className = 'commu-rivalite__lore';
  lore.textContent = forme.phrase;

  element.append(signal, lore);
}

let generation = 0;

function programmer() {
  const maGeneration = ++generation;
  let tentative = 0;

  const essayer = async () => {
    if (maGeneration !== generation || route() !== '/communaute') return;
    tentative += 1;

    const resume = document.querySelector('.commu-core--v3 .commu-core__resume');
    if (!resume) {
      if (tentative < 40) setTimeout(essayer, 100);
      return;
    }

    try {
      const brut = await api.classementCommunautes();
      if (maGeneration !== generation || route() !== '/communaute') return;
      const communautes = [...brut].sort(comparerCroissance);
      const indexMoi = communautes.findIndex((c) => c.moi);
      const index = indexMoi >= 0 ? indexMoi : 0;
      const faction = communautes[index];
      const info = rivalite(communautes, index);
      if (faction && info) rendreResume(resume, faction, info);
    } catch (e) {
      console.warn('[Clutch] rivalité Communauté non enrichie', e);
    }
  };

  setTimeout(essayer, 40);
}

window.addEventListener('hashchange', programmer);
window.addEventListener('DOMContentLoaded', programmer);
programmer();
