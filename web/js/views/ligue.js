import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, nomJeu, toast, surClic } from '../ui.js';

export async function vueLigue(racine, id) {
  const ligue = await api.lireLigue(id);
  if (!ligue) {
    racine.innerHTML = `<div class="vide"><h3>Ligue introuvable</h3><p><a href="#/ligues">Retour</a></p></div>`;
    return;
  }

  const [classement, rivalite, defi] = await Promise.all([
    api.classementLigue(id),
    contexte.utilisateur ? api.rivaliteSemaine({ ligue: id }).catch(() => null) : null,
    api.defiLigue(id).catch(() => null),
  ]);
  const classementDefi = defi ? await api.classementDefi(id).catch(() => []) : [];
  const estCreateur = contexte.utilisateur?.id === ligue.createur_id;
  const moiIndex = classement.findIndex((l) => l.moi);
  const moi = moiIndex >= 0 ? classement[moiIndex] : null;
  const leader = classement[0] ?? null;
  const devant = moiIndex > 0 ? classement[moiIndex - 1] : null;
  const ecartLeader = moi && leader ? Math.max(0, Number(leader.solde ?? 0) - Number(moi.solde ?? 0)) : null;
  const ecartDevant = moi && devant ? Math.max(0, Number(devant.solde ?? 0) - Number(moi.solde ?? 0)) : null;

  racine.innerHTML = `
    <section class="ligue-v2">
      <a class="ligue-v2__back" href="#/ligues">← Toutes mes ligues</a>

      <header class="ligue-v2__hero">
        <div class="ligue-v2__hero-glow" aria-hidden="true"></div>
        <div class="ligue-v2__identity">
          <span class="ligue-v2__crest">${esc(initialesLigue(ligue.nom))}</span>
          <div>
            <span class="ligue-v2__kicker">LIGUE PRIVÉE · ${esc(contexte.saison?.nom ?? 'SAISON')}</span>
            <h1>${esc(ligue.nom)}</h1>
            <p>${classement.length} membre${classement.length > 1 ? 's' : ''} · un pronostic compte ici automatiquement.</p>
          </div>
        </div>

        <div class="ligue-v2__hero-meta">
          ${
            moi
              ? `<div class="ligue-v2__status">
                   <span>TA POSITION</span>
                   <strong>#${moiIndex + 1}</strong>
                   <small>${moiIndex === 0 ? 'Tu tiens la couronne' : `${esc(frags(ecartDevant ?? ecartLeader ?? 0))} pour passer #${moiIndex}`}</small>
                 </div>`
              : `<div class="ligue-v2__status"><span>TA POSITION</span><strong>—</strong><small>Pas encore classé</small></div>`
          }
          <div class="ligue-v2__invite">
            <span>CODE D'INVITATION</span>
            <button type="button" id="copier" class="ligue-v2__invite-code" title="Copier le code">${esc(ligue.code)}</button>
            <small>Cliquer pour copier</small>
          </div>
        </div>
      </header>

      ${podium(classement)}

      <div class="ligue-v2__duo-grid">
        ${carteProgression({ moi, moiIndex, leader, devant, ecartLeader, ecartDevant })}
        ${carteRivaliteV2(rivalite)}
      </div>

      <section class="ligue-v2__ranking-section">
        <div class="ligue-v2__section-head">
          <div>
            <span class="ligue-v2__kicker">CLASSEMENT COMPLET</span>
            <h2>Tout le monde voit qui chasse qui.</h2>
          </div>
          <span class="ligue-v2__season-chip">${esc(contexte.saison?.nom ?? 'Saison')}</span>
        </div>
        ${classementListe(classement)}
      </section>

      <section class="ligue-v2__event-section">
        <div class="ligue-v2__section-head ligue-v2__section-head--event">
          <div>
            <span class="ligue-v2__kicker">ÉVÉNEMENT PARALLÈLE</span>
            <h2>Le défi de la ligue</h2>
          </div>
        </div>
        ${carteDefiV2(defi, classementDefi, estCreateur)}
      </section>

      <section class="ligue-v2__rewards">
        <div>
          <span class="ligue-v2__kicker">ARSENAL DE LIGUE</span>
          <h2>Des rangs qui laissent une trace.</h2>
          <p>Premier cercle, Rival, Top 10, Podium et Roi de ligue peuvent alimenter ton profil et ta collection au fil de ta progression.</p>
        </div>
        <div class="ligue-v2__reward-track" aria-label="Récompenses de ligue">
          ${['Premier cercle', 'Rival', 'Top 10', 'Podium', 'Roi de ligue']
            .map((nom, i) => `<span class="ligue-v2__reward${i < 2 ? ' ligue-v2__reward--lit' : ''}"><i>${i + 1}</i>${esc(nom)}</span>`)
            .join('')}
        </div>
      </section>
    </section>`;

  surClic(racine, '#tirer-defi', async (bouton) => {
    bouton.disabled = true;
    try {
      const d = await api.tirerDefi(id);
      toast(`Le sort a désigné ${d.nom}.`, 'succes');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      bouton.disabled = false;
    }
  });

  racine.querySelector('#copier')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ligue.code);
      toast('Code copié.', 'succes');
    } catch {
      toast(`Code : ${ligue.code}`);
    }
  });
}

function podium(classement) {
  const top = classement.slice(0, 3);
  if (!top.length) {
    return `
      <section class="ligue-v2__podium ligue-v2__podium--empty">
        <span class="ligue-v2__kicker">PODIUM</span>
        <h2>La première place est encore vide.</h2>
        <p>Le premier pronostic réglé lancera la course.</p>
      </section>`;
  }

  const ordre = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
  return `
    <section class="ligue-v2__podium">
      <div class="ligue-v2__podium-heading">
        <span class="ligue-v2__kicker">LE PODIUM</span>
        <p>Les trois joueurs à faire tomber.</p>
      </div>
      <div class="ligue-v2__podium-stage ligue-v2__podium-stage--${top.length}">
        ${ordre
          .map((joueur) => {
            const rang = classement.indexOf(joueur) + 1;
            return `
              <div class="ligue-v2__podium-player ligue-v2__podium-player--${rang}${joueur.moi ? ' moi' : ''}">
                ${rang === 1 ? '<span class="ligue-v2__crown">♛</span>' : ''}
                <span class="ligue-v2__player-avatar">${esc(initiales(joueur.pseudo))}</span>
                <strong>${esc(joueur.pseudo)}</strong>
                <small>${joueur.tag_favori ? esc(joueur.tag_favori) + ' · ' : ''}${joueur.paris ?? 0} pronostic${(joueur.paris ?? 0) > 1 ? 's' : ''}</small>
                <span class="ligue-v2__score">${esc(frags(joueur.solde))}</span>
                <i>${rang}</i>
              </div>`;
          })
          .join('')}
      </div>
    </section>`;
}

function carteProgression({ moi, moiIndex, leader, devant, ecartLeader, ecartDevant }) {
  if (!moi) {
    return `
      <article class="ligue-v2__focus-card ligue-v2__focus-card--progress">
        <span class="ligue-v2__kicker">TA PROGRESSION</span>
        <h3>Entre dans la course.</h3>
        <p>Ton premier résultat réglé donnera une position à défendre.</p>
      </article>`;
  }

  if (moiIndex === 0) {
    return `
      <article class="ligue-v2__focus-card ligue-v2__focus-card--progress is-leading">
        <span class="ligue-v2__kicker">TA PROGRESSION</span>
        <div class="ligue-v2__progress-rank"><strong>#1</strong><span>COURONNE ACTIVE</span></div>
        <h3>Tout le monde te chasse.</h3>
        <p>La prochaine erreur peut rouvrir la course.</p>
      </article>`;
  }

  return `
    <article class="ligue-v2__focus-card ligue-v2__focus-card--progress">
      <span class="ligue-v2__kicker">TA PROGRESSION</span>
      <div class="ligue-v2__progress-rank"><strong>#${moiIndex + 1}</strong><span>TOI</span></div>
      <h3>${devant ? `${esc(frags(ecartDevant))} pour dépasser ${esc(devant.pseudo)}.` : `${esc(frags(ecartLeader))} jusqu'au sommet.`}</h3>
      <div class="ligue-v2__chase-line"><span></span><i></i><span></span></div>
      <p>${leader && leader !== devant ? `Le leader ${esc(leader.pseudo)} reste à ${esc(frags(ecartLeader))}.` : 'Une seule place te sépare de la tête.'}</p>
    </article>`;
}

function carteRivaliteV2(r) {
  if (!r?.rival) {
    return `
      <article class="ligue-v2__focus-card ligue-v2__focus-card--rival">
        <span class="ligue-v2__kicker">RIVALITÉ DE LA SEMAINE</span>
        <h3>Pas encore de rival.</h3>
        <p>Il faut un joueur assez proche de toi pour créer un duel crédible.</p>
      </article>`;
  }

  const devant = r.ecart >= 0;
  return `
    <article class="ligue-v2__focus-card ligue-v2__focus-card--rival">
      <div class="ligue-v2__focus-top">
        <span class="ligue-v2__kicker">RIVALITÉ DE LA SEMAINE</span>
        <span class="ligue-v2__week">${esc(r.semaine)}</span>
      </div>
      <div class="ligue-v2__versus">
        <div>
          <span class="ligue-v2__mini-avatar">${esc(initiales(r.moi.pseudo))}</span>
          <strong>${esc(r.moi.pseudo)}</strong>
          <small>#${r.moi.rang}</small>
        </div>
        <span class="ligue-v2__vs">VS</span>
        <div>
          <span class="ligue-v2__mini-avatar ligue-v2__mini-avatar--rival">${esc(initiales(r.rival.pseudo))}</span>
          <strong>${esc(r.rival.pseudo)}</strong>
          <small>#${r.rival.rang}</small>
        </div>
      </div>
      <div class="ligue-v2__rival-gap ${devant ? 'positif' : 'negatif'}">
        ${devant ? 'Tu mènes de' : 'Tu poursuis à'} <strong>${esc(frags(Math.abs(r.ecart)))}</strong>
      </div>
    </article>`;
}

function classementListe(lignes) {
  if (!lignes.length) {
    return '<div class="ligue-v2__ranking-empty">Aucun joueur classé pour le moment.</div>';
  }

  return `
    <div class="ligue-v2__ranking">
      ${lignes
        .map((l, i) => {
          const reussite = l.paris ? Math.round((l.gagnes / l.paris) * 100) : null;
          return `
            <div class="ligue-v2__ranking-row${l.moi ? ' moi' : ''}">
              <span class="ligue-v2__ranking-rank">${i + 1}</span>
              <span class="ligue-v2__ranking-avatar">${esc(initiales(l.pseudo))}</span>
              <span class="ligue-v2__ranking-player">
                <strong>${esc(l.pseudo)}${l.moi ? ' <em>TOI</em>' : ''}</strong>
                <small>${l.tag_favori ? esc(l.tag_favori) + ' · ' : ''}${l.paris ?? 0} pronostic${(l.paris ?? 0) > 1 ? 's' : ''}${reussite === null ? '' : ` · ${reussite}% réussite`}</small>
              </span>
              <span class="ligue-v2__ranking-score">${esc(frags(l.solde))}</span>
            </div>`;
        })
        .join('')}
    </div>`;
}

function carteDefiV2(defi, classement, estCreateur) {
  if (!defi) {
    return `
      <article class="ligue-v2__challenge ligue-v2__challenge--empty">
        <div>
          <span class="ligue-v2__challenge-mark">?</span>
          <div>
            <span class="ligue-v2__kicker">TIRAGE UNIQUE DE LA SAISON</span>
            <h3>Un tournoi. Un classement parallèle. Une seconde chance.</h3>
            <p>Seuls les pronostics posés sur le tournoi tiré compteront dans ce défi.</p>
          </div>
        </div>
        ${
          estCreateur
            ? '<button class="btn" id="tirer-defi">Tirer le tournoi du défi</button>'
            : '<span class="ligue-v2__challenge-owner">Le créateur de la ligue lancera le tirage.</span>'
        }
      </article>`;
  }

  const top = classement.slice(0, 3);
  return `
    <article class="ligue-v2__challenge">
      <div class="ligue-v2__challenge-main">
        <div class="ligue-v2__challenge-game" data-jeu="${esc(defi.jeu ?? '')}">${esc(nomJeu(defi.jeu))}</div>
        <div>
          <span class="ligue-v2__kicker">DÉFI ACTIF</span>
          <h3>${esc(defi.nom)}</h3>
          <p>Tiré le ${esc(new Date(defi.tire_le).toLocaleDateString('fr-FR'))} · classement au bénéfice net.</p>
        </div>
      </div>
      <div class="ligue-v2__challenge-top">
        ${
          top.length
            ? top.map((l, i) => `<span><i>${i + 1}</i><strong>${esc(l.pseudo)}</strong><em class="${l.net >= 0 ? 'positif' : 'negatif'}">${l.net >= 0 ? '+' : ''}${esc(frags(l.net))}</em></span>`).join('')
            : '<span class="ligue-v2__challenge-none">Aucun résultat réglé sur ce tournoi.</span>'
        }
      </div>
    </article>`;
}

function initiales(pseudo = '') {
  const mots = pseudo.trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return `${mots[0][0]}${mots[mots.length - 1][0]}`.toUpperCase();
}

function initialesLigue(nom = '') {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return 'CL';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return `${mots[0][0]}${mots[mots.length - 1][0]}`.toUpperCase();
}
